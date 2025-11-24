// Based on https://github.com/homebridge/HAP-NodeJS/blob/latest/src/accessories/Camera_accessory.ts

import assert from 'node:assert'
import { type ChildProcess, spawn } from 'node:child_process'
import {
  type Accessory,
  AudioRecordingCodecType,
  AudioRecordingSamplerate,
  CameraController,
  type CameraRecordingConfiguration,
  type CameraRecordingDelegate,
  type CameraStreamingDelegate,
  Characteristic,
  H264Level,
  H264Profile,
  type HDSProtocolSpecificErrorReason,
  type PrepareStreamCallback,
  type PrepareStreamRequest,
  type PrepareStreamResponse,
  type RecordingPacket,
  Service,
  type SnapshotRequest,
  type SnapshotRequestCallback,
  SRTPCryptoSuites,
  type StreamingRequest,
  type StreamRequestCallback,
  StreamRequestTypes,
  type StreamSessionIdentifier,
  VideoCodecType,
  type VideoInfo
} from '@homebridge/hap-nodejs'
import { logger } from '@nrchkb/logger'
import type CameraConfigType from '../types/CameraConfigType'
import { MP4StreamingServer } from './MP4StreamingServer'

type SessionInfo = {
  address: string // address of the HAP controller

  videoPort: number // port of the controller
  localVideoPort: number
  videoCryptoSuite: SRTPCryptoSuites // should be saved if multiple suites are supported
  videoSRTP: Buffer // key and salt concatenated
  videoSSRC: number // rtp synchronisation source

  /* Won't be saved as audio is not supported by this example
    audioPort: number,
    audioCryptoSuite: SRTPCryptoSuites,
    audioSRTP: Buffer,
    audioSSRC: number,
     */
}

type OngoingSession = {
  localVideoPort: number
  process: ChildProcess
}

const FFMPEGH264ProfileNames = ['baseline', 'main', 'high']
const FFMPEGH264LevelNames = ['3.1', '3.2', '4.0']

const ports = new Set<number>()

function getPort(): number {
  for (let i = 5011; ; i++) {
    if (!ports.has(i)) {
      ports.add(i)
      return i
    }
  }
}

export class CameraDelegate
  implements CameraStreamingDelegate, CameraRecordingDelegate
{
  private ffmpegDebugOutput = false

  private log = logger('NRCHKB', 'CameraDelegate')

  controller?: CameraController

  // keep track of sessions
  pendingSessions: Record<string, SessionInfo> = {}
  ongoingSessions: Record<string, OngoingSession> = {}

  // minimal secure video properties.
  configuration?: CameraRecordingConfiguration
  handlingStreamingRequest = false
  server?: MP4StreamingServer

  constructor(
    private accessory: Accessory,
    private config?: CameraConfigType
  ) {
    // refine logger with accessory name if available
    try {
      const name =
        accessory?.displayName || accessory?.UUID || 'UnknownAccessory'
      this.log = logger('NRCHKB', 'CameraDelegate', name)
    } catch (_) {
      // keep default logger
    }
  }

  handleSnapshotRequest(
    request: SnapshotRequest,
    callback: SnapshotRequestCallback
  ): void {
    // Prefer configured still image source, else use main source; fallback to testsrc
    const ffmpegPath = this.config?.cameraConfigVideoProcessor || 'ffmpeg'
    const stillSource = this.config?.cameraConfigStillImageSource?.trim()
    const mainSource = this.config?.cameraConfigSource?.trim()
    let imageSource: string
    if (stillSource) {
      imageSource = stillSource
    } else if (mainSource) {
      imageSource = mainSource
    } else {
      imageSource = `-f lavfi -i testsrc=s=${request.width}x${request.height}`
    }

    const ffmpegCommand = `${imageSource} -t 1 -s ${request.width}x${request.height} -f image2 -`
    const ffmpeg = spawn(ffmpegPath, ffmpegCommand.split(' '), {
      env: process.env
    })

    const snapshotBuffers: Buffer[] = []

    ffmpeg.stdout.on('data', (data) => snapshotBuffers.push(data))
    ffmpeg.stderr.on('data', (data) => {
      if (this.ffmpegDebugOutput || this.config?.cameraConfigDebug) {
        this.log.debug(`SNAPSHOT: ${String(data)}`)
      }
    })

    ffmpeg.on('exit', (code, signal) => {
      if (signal) {
        this.log.error(`Snapshot process was killed with signal: ${signal}`)
        callback(new Error(`killed with signal ${signal}`))
      } else if (code === 0) {
        this.log.debug(
          `Successfully captured snapshot at ${request.width}x${request.height}`
        )
        callback(undefined, Buffer.concat(snapshotBuffers))
      } else {
        this.log.error(`Snapshot process exited with code ${code}`)
        callback(new Error(`Snapshot process exited with code ${code}`))
      }
    })
  }

  // called when iOS request rtp setup
  prepareStream(
    request: PrepareStreamRequest,
    callback: PrepareStreamCallback
  ): void {
    const sessionId: StreamSessionIdentifier = request.sessionID
    const targetAddress = request.targetAddress

    const video = request.video

    const videoCryptoSuite = video.srtpCryptoSuite // could be used to support multiple crypto suite (or support no suite for debugging)
    const videoSrtpKey = video.srtp_key
    const videoSrtpSalt = video.srtp_salt

    const videoSSRC = CameraController.generateSynchronisationSource()

    const localPort = getPort()

    const sessionInfo: SessionInfo = {
      address: targetAddress,

      videoPort: video.port,
      localVideoPort: localPort,
      videoCryptoSuite: videoCryptoSuite,
      videoSRTP: Buffer.concat([videoSrtpKey, videoSrtpSalt]),
      videoSSRC: videoSSRC
    }

    const response: PrepareStreamResponse = {
      video: {
        port: localPort,
        ssrc: videoSSRC,

        srtp_key: videoSrtpKey,
        srtp_salt: videoSrtpSalt
      }
      // audio is omitted as we do not support audio in this example
    }

    this.pendingSessions[sessionId] = sessionInfo
    callback(undefined, response)
  }

  // called when the iOS device asks stream to start/stop/reconfigure
  handleStreamRequest(
    request: StreamingRequest,
    callback: StreamRequestCallback
  ): void {
    const sessionId = request.sessionID

    switch (request.type) {
      case StreamRequestTypes.START: {
        const sessionInfo = this.pendingSessions[sessionId]

        const video: VideoInfo = request.video

        const profile = FFMPEGH264ProfileNames[video.profile]
        const level = FFMPEGH264LevelNames[video.level]
        const width = video.width
        const height = video.height
        let fps = video.fps

        const payloadType = video.pt
        let maxBitrate = video.max_bit_rate
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // const rtcpInterval = video.rtcp_interval // usually 0.5
        const mtu = video.mtu // maximum transmission unit

        const address = sessionInfo.address
        const videoPort = sessionInfo.videoPort
        const localVideoPort = sessionInfo.localVideoPort
        const ssrc = sessionInfo.videoSSRC
        const cryptoSuite = sessionInfo.videoCryptoSuite
        const videoSRTP = sessionInfo.videoSRTP.toString('base64')

        // Merge UI config for backward compatibility
        const cfg = this.config
        const ffmpegPath = cfg?.cameraConfigVideoProcessor || 'ffmpeg'
        const source =
          cfg?.cameraConfigSource ||
          `-f lavfi -i testsrc=s=${width}x${height}:r=${fps}`
        const vcodec = cfg?.cameraConfigVideoCodec || 'libx264'
        const additional = cfg?.cameraConfigAdditionalCommandLine?.trim()
        const mapvideo = cfg?.cameraConfigMapVideo || '0:0'
        const mapaudio = cfg?.cameraConfigMapAudio || '0:1'
        // const packetsize = cfg?.cameraConfigPacketSize || 1316
        const maxConfigBitrate = cfg?.cameraConfigMaxBitrate
        if (
          maxConfigBitrate &&
          maxConfigBitrate > 0 &&
          maxConfigBitrate < maxBitrate
        ) {
          maxBitrate = maxConfigBitrate
        }
        const maxConfigFps = cfg?.cameraConfigMaxFPS
        if (maxConfigFps && maxConfigFps > 0 && maxConfigFps < fps) {
          fps = maxConfigFps
        }

        const vf: string[] = []
        if (
          cfg?.cameraConfigVideoFilter !== null &&
          cfg?.cameraConfigVideoFilter !== undefined &&
          cfg?.cameraConfigVideoFilter !== ''
        ) {
          vf.push(cfg.cameraConfigVideoFilter)
          if (cfg.cameraConfigHorizontalFlip) vf.push('hflip')
          if (cfg.cameraConfigVerticalFlip) vf.push('vflip')
        }

        this.log.debug(
          `Starting video stream (${width}x${height}, ${fps} fps, ${maxBitrate} kbps, ${mtu} mtu)...`
        )

        let videoffmpegCommand =
          `${source} -map ${mapvideo} -vcodec ${vcodec} -pix_fmt yuv420p -r ${fps} -f rawvideo ` +
          `${additional ? `${additional} ` : ''}` +
          `${vf.length > 0 ? `-vf ${vf.join(',')} ` : ''}` +
          `-b:v ${maxBitrate}k -bufsize ${maxBitrate}k -maxrate ${maxBitrate}k ` +
          `-profile:v ${profile} -level:v ${level} ` +
          `-payload_type ${payloadType} -ssrc ${ssrc} -f rtp `

        if (cryptoSuite !== SRTPCryptoSuites.NONE) {
          let suite: string
          switch (cryptoSuite) {
            case SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80: // actually ffmpeg just supports AES_CM_128_HMAC_SHA1_80
              suite = 'AES_CM_128_HMAC_SHA1_80'
              break
            case SRTPCryptoSuites.AES_CM_256_HMAC_SHA1_80:
              suite = 'AES_CM_256_HMAC_SHA1_80'
              break
          }

          videoffmpegCommand += `-srtp_out_suite ${suite} -srtp_out_params ${videoSRTP} s`
        }

        videoffmpegCommand += `rtp://${address}:${videoPort}?rtcpport=${videoPort}&localrtcpport=${localVideoPort}&pkt_size=${cfg?.cameraConfigPacketSize || mtu}`

        // Optional Audio stream (legacy compatibility)
        const audioEnabled =
          (this.config?.cameraConfigAudio as any) === true ||
          this.config?.cameraConfigAudio === 'true'
        let audioffmpegCommand = ''
        if (audioEnabled) {
          const acodec = cfg?.cameraConfigAudioCodec || 'libfdk_aac'
          const abitrate = 32 // legacy default
          const asamplerate = 16 // kHz legacy default
          const apayloadType = 110
          // const audioSRTP = sessionInfo.videoSRTP.toString('base64') // placeholder, audio not negotiated separately in this simplified impl
          audioffmpegCommand =
            ` -map ${mapaudio} -acodec ${acodec} -profile:a aac_eld -flags +global_header -f null -ar ${asamplerate}k -b:a ${abitrate}k -bufsize ${abitrate}k -ac 1 ` +
            `-payload_type ${apayloadType} `
          // not appending RTP audio out url here due to missing audio session params in this example
        }

        if (this.ffmpegDebugOutput || this.config?.cameraConfigDebug) {
          this.log.debug(
            `FFMPEG command: ${ffmpegPath} ${videoffmpegCommand}${audioffmpegCommand}`
          )
        }

        const ffmpegVideo = spawn(
          ffmpegPath,
          (videoffmpegCommand + audioffmpegCommand).split(' '),
          {
            env: process.env
          }
        )

        let started = false
        ffmpegVideo.stderr.on('data', (data: Buffer) => {
          this.log.debug(data.toString('utf8'))
          if (!started) {
            started = true
            this.log.debug('FFMPEG: received first frame')

            callback() // remember to execute a callback once set up
          }

          if (this.ffmpegDebugOutput || this.config?.cameraConfigDebug) {
            this.log.debug(`VIDEO: ${String(data)}`)
          }
        })
        ffmpegVideo.on('error', (error) => {
          this.log.error(
            `[Video] Failed to start video stream: ${error.message}`
          )
          callback(new Error('ffmpeg process creation failed!'))
        })
        ffmpegVideo.on('exit', (code, signal) => {
          const message =
            '[Video] ffmpeg exited with code: ' +
            code +
            ' and signal: ' +
            signal

          if (code == null || code === 255) {
            this.log.debug(`${message} (Video stream stopped!)`)
          } else {
            this.log.error(`${message} (error)`)

            if (!started) {
              callback(new Error(message))
            } else {
              this.controller?.forceStopStreamingSession(sessionId)
            }
          }
        })

        this.ongoingSessions[sessionId] = {
          localVideoPort: localVideoPort,
          process: ffmpegVideo
        }
        delete this.pendingSessions[sessionId]

        break
      }
      case StreamRequestTypes.RECONFIGURE:
        // not supported by this example
        this.log.debug(
          'Received (unsupported) request to reconfigure to: ' +
            JSON.stringify(request.video)
        )
        callback()
        break
      case StreamRequestTypes.STOP: {
        const ongoingSession = this.ongoingSessions[sessionId]
        if (!ongoingSession) {
          callback()
          break
        }

        ports.delete(ongoingSession.localVideoPort)

        try {
          ongoingSession.process.kill('SIGKILL')
        } catch (e) {
          this.log.error('Error occurred terminating the video process!')
          this.log.error(String(e))
        }

        delete this.ongoingSessions[sessionId]

        this.log.debug('Stopped streaming session!')
        callback()
        break
      }
    }
  }

  updateRecordingActive(active: boolean): void {
    // we haven't implemented a prebuffer
    this.log.debug(`Recording active set to ${active}`)
  }

  updateRecordingConfiguration(
    configuration: CameraRecordingConfiguration | undefined
  ): void {
    this.configuration = configuration
    this.log.debug(JSON.stringify(configuration))
  }

  /**
   * This is a very minimal, very experimental example of how to implement fmp4 streaming with a
   * CameraController supporting HomeKit Secure Video.
   *
   * An ideal implementation would diverge from this in the following ways:
   * * It would implement a prebuffer and respect the recording `active` characteristic for that.
   * * It would start to immediately record after a trigger event occurred and not just
   *   when the HomeKit Controller requests it (see the documentation of `CameraRecordingDelegate`).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *handleRecordingStreamRequest(
    _streamId: number
  ): AsyncGenerator<RecordingPacket> {
    assert(!!this.configuration)

    /**
     * With this flag you can control how the generator reacts to a reset to the motion trigger.
     * If set to true, the generator will send a proper endOfStream if the motion stops.
     * If set to false, the generator will run till the HomeKit Controller closes the stream.
     *
     * Note: In a real implementation you would most likely introduce a bit of a delay.
     */
    const STOP_AFTER_MOTION_STOP = false

    this.handlingStreamingRequest = true

    assert(this.configuration.videoCodec.type === VideoCodecType.H264)

    const profile =
      this.configuration.videoCodec.parameters.profile === H264Profile.HIGH
        ? 'high'
        : this.configuration.videoCodec.parameters.profile === H264Profile.MAIN
          ? 'main'
          : 'baseline'

    const level =
      this.configuration.videoCodec.parameters.level === H264Level.LEVEL4_0
        ? '4.0'
        : this.configuration.videoCodec.parameters.level === H264Level.LEVEL3_2
          ? '3.2'
          : '3.1'

    const videoArgs: Array<string> = [
      '-an',
      '-sn',
      '-dn',
      '-codec:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',

      '-profile:v',
      profile,
      '-level:v',
      level,
      '-b:v',
      `${this.configuration.videoCodec.parameters.bitRate}k`,
      '-force_key_frames',
      `expr:eq(t,n_forced*${this.configuration.videoCodec.parameters.iFrameInterval / 1000})`,
      '-r',
      this.configuration.videoCodec.resolution[2].toString()
    ]

    let samplerate: string
    switch (this.configuration.audioCodec.samplerate) {
      case AudioRecordingSamplerate.KHZ_8:
        samplerate = '8'
        break
      case AudioRecordingSamplerate.KHZ_16:
        samplerate = '16'
        break
      case AudioRecordingSamplerate.KHZ_24:
        samplerate = '24'
        break
      case AudioRecordingSamplerate.KHZ_32:
        samplerate = '32'
        break
      case AudioRecordingSamplerate.KHZ_44_1:
        samplerate = '44.1'
        break
      case AudioRecordingSamplerate.KHZ_48:
        samplerate = '48'
        break
      default:
        throw new Error(
          'Unsupported audio samplerate: ' +
            this.configuration.audioCodec.samplerate
        )
    }

    const audioArgs: Array<string> =
      this.controller?.recordingManagement?.recordingManagementService.getCharacteristic(
        Characteristic.RecordingAudioActive
      )
        ? [
            '-acodec',
            'libfdk_aac',
            ...(this.configuration.audioCodec.type ===
            AudioRecordingCodecType.AAC_LC
              ? ['-profile:a', 'aac_low']
              : ['-profile:a', 'aac_eld']),
            '-ar',
            `${samplerate}k`,
            '-b:a',
            `${this.configuration.audioCodec.bitrate}k`,
            '-ac',
            `${this.configuration.audioCodec.audioChannels}`
          ]
        : []

    this.server = new MP4StreamingServer(
      'ffmpeg',
      `-f lavfi -i \
      testsrc=s=${this.configuration.videoCodec.resolution[0]}x${this.configuration.videoCodec.resolution[1]}:r=${this.configuration.videoCodec.resolution[2]}`.split(
        / /g
      ),
      audioArgs,
      videoArgs
    )

    await this.server.start()
    if (!this.server || this.server.destroyed) {
      return // early exit
    }

    const pending: Array<Buffer> = []

    try {
      for await (const box of this.server.generator()) {
        pending.push(box.header, box.data)

        const motionDetected = this.accessory
          .getService(Service.MotionSensor)
          ?.getCharacteristic(Characteristic.MotionDetected).value

        this.log.debug(`mp4 box type ${box.type} and length ${box.length}`)
        if (box.type === 'moov' || box.type === 'mdat') {
          const fragment = Buffer.concat(pending)
          pending.splice(0, pending.length)

          const isLast = STOP_AFTER_MOTION_STOP && !motionDetected

          yield {
            data: fragment,
            isLast: isLast
          }

          if (isLast) {
            this.log.debug('Ending session due to motion stopped!')
            break
          }
        }
      }
    } catch (error: any) {
      if (!error.message.startsWith('FFMPEG')) {
        // an inexpensive way of identifying our own emitted errors
        this.log.error(
          `Encountered unexpected error on generator ${error.stack}`
        )
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  closeRecordingStream(
    streamId: number,
    reason?: HDSProtocolSpecificErrorReason
  ): void {
    if (reason) {
      this.log.error(`Closing stream ${streamId} due to error: ${reason}`)
    }
    if (this.server) {
      this.server.destroy()
      this.server = undefined
    }
    this.handlingStreamingRequest = false
  }

  acknowledgeStream(streamId: number): void {
    this.closeRecordingStream(streamId)
  }
}
