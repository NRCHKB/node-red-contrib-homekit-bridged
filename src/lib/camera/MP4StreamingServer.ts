// Based on https://github.com/homebridge/HAP-NodeJS/blob/latest/src/accessories/Camera_accessory.ts

import { type ChildProcess, spawn } from 'node:child_process'
import { once } from 'node:events'
import {
    type AddressInfo,
    createServer,
    type Server,
    type Socket,
} from 'node:net'
import { logger } from '@nrchkb/logger'

const log = logger('NRCHKB', 'MP4StreamingServer')

interface MP4Atom {
    header: Buffer
    length: number
    type: string
    data: Buffer
}

export class MP4StreamingServer {
    readonly server: Server

    /**
     * This can be configured to output ffmpeg debug output!
     */
    readonly debugMode: boolean = false

    readonly ffmpegPath: string
    readonly args: string[]

    socket?: Socket
    childProcess?: ChildProcess
    destroyed = false

    connectPromise: Promise<void>
    connectResolve?: () => void

    constructor(
        ffmpegPath: string,
        ffmpegInput: Array<string>,
        audioOutputArgs: Array<string>,
        videoOutputArgs: Array<string>
    ) {
        this.connectPromise = new Promise((resolve) => {
            this.connectResolve = resolve
        })

        this.server = createServer(this.handleConnection.bind(this))
        this.ffmpegPath = ffmpegPath
        this.args = []

        this.args.push(...ffmpegInput)

        this.args.push(...audioOutputArgs)

        this.args.push('-f', 'mp4')
        this.args.push(...videoOutputArgs)
        this.args.push('-fflags', '+genpts', '-reset_timestamps', '1')
        this.args.push(
            '-movflags',
            'frag_keyframe+empty_moov+default_base_moof'
        )
    }

    async start() {
        const promise = once(this.server, 'listening')
        this.server.listen() // listen on random port
        await promise

        if (this.destroyed) {
            return
        }

        const port = (this.server.address() as AddressInfo).port
        this.args.push(`tcp://127.0.0.1:${port}`)

        log.debug(`${this.ffmpegPath} ${this.args.join(' ')}`)

        this.childProcess = spawn(this.ffmpegPath, this.args, {
            env: process.env,
            stdio: this.debugMode ? 'pipe' : 'ignore',
        })
        if (!this.childProcess) {
            log.error('ChildProcess is undefined directly after the init!')
        }
        if (this.debugMode) {
            this.childProcess.stdout?.on('data', (data) =>
                log.debug(data.toString())
            )
            this.childProcess.stderr?.on('data', (data) =>
                log.debug(data.toString())
            )
        }
    }

    destroy() {
        this.socket?.destroy()
        this.childProcess?.kill()

        this.socket = undefined
        this.childProcess = undefined
        this.destroyed = true
    }

    handleConnection(socket: Socket): void {
        this.server.close() // don't accept any further clients
        this.socket = socket
        this.connectResolve?.()
    }

    /**
     * Generator for `MP4Atom`s.
     * Throws error to signal EOF when socket is closed.
     */
    async *generator(): AsyncGenerator<MP4Atom> {
        await this.connectPromise

        if (!this.socket || !this.childProcess) {
            log.error(
                'Socket undefined ' +
                    !!this.socket +
                    ' childProcess undefined ' +
                    !!this.childProcess
            )
            throw new Error('Unexpected state!')
        }

        while (true) {
            const header = await this.read(8)
            const length = header.readInt32BE(0) - 8
            const type = header.subarray(4).toString()
            const data = await this.read(length)

            yield {
                header: header,
                length: length,
                type: type,
                data: data,
            }
        }
    }

    async read(length: number): Promise<Buffer> {
        if (!this.socket) {
            throw Error('FFMPEG tried reading from closed socket!')
        }

        if (!length) {
            return Buffer.alloc(0)
        }

        const value = this.socket.read(length)
        if (value) {
            return value
        }

        return new Promise((resolve, reject) => {
            const readHandler = () => {
                const value = this.socket?.read(length)
                if (value) {
                    cleanup()
                    resolve(value)
                }
            }

            const endHandler = () => {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                cleanup()
                reject(
                    new Error(
                        `FFMPEG socket closed during read for ${length} bytes!`
                    )
                )
            }

            const cleanup = () => {
                this.socket?.removeListener('readable', readHandler)
                this.socket?.removeListener('close', endHandler)
            }

            if (!this.socket) {
                throw new Error('FFMPEG socket is closed now!')
            }

            this.socket.on('readable', readHandler)
            this.socket.on('close', endHandler)
        })
    }
}
