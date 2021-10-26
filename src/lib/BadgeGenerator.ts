import { logger } from '@nrchkb/logger'
import { Request, Response } from 'express-serve-static-core'
import { URL } from 'url'
import HAPServiceNodeType from './types/HAPServiceNodeType'
import HAPService2NodeType from './types/HAPService2NodeType'
import { AccessoryInfo } from 'hap-nodejs/dist/lib/model/AccessoryInfo'
import QRCode from 'qrcode'
import { NodeAPI } from 'node-red'
import NRCHKBError from './NRCHKBError'

export class BadgeGenerator {
    // Store qrcode data in cache, key is = hostNode.id + '_' + hostNode.config.pinCode
    private static memoryStorage: { [key: string]: any } = {}

    private static log = logger('NRCHKB', 'BadgeGenerator')
    private static RED: NodeAPI

    static rawPincodeRegex = /^\d{3}-\d{2}-\d{3}$/

    public static init(RED: NodeAPI) {
        BadgeGenerator.RED = RED
        BadgeGenerator.log.trace('Initializing')

        // Register '/qrcode' endpoint
        RED.httpAdmin.get(
            '/qrcode',
            RED.auth.needsPermission('homekit.read'),
            BadgeGenerator.get
        )
    }

    /**
     * @return
     * if succeeded then json containing qrcode
     * else empty payload
     *
     * 400 - bad request
     * 500 - server error
     * 202 - ok but try again later
     * 204 - already paired, do not show qrcode
     * 200 - ok, returned qrcode
     * 304 - ok, returned cached qrcode
     */
    static async get(req: Request, res: Response) {
        try {
            BadgeGenerator.log.trace(`Received request ${req.url}`)
            const url = new URL(req.url, 'https://localhost')
            const nodeId = url.searchParams.get('nodeId')

            //nodeId is empty
            if (typeof nodeId === 'undefined' || !nodeId) {
                BadgeGenerator.log.error('Provided nodeId is empty')
                res.sendStatus(400)
                return
            }

            const nodeLogger = logger('NRCHKB', 'BadgeGenerator', nodeId)
            const node = BadgeGenerator.RED.nodes.getNode(nodeId)

            if (!node) {
                nodeLogger.error('Could not find node for given id')
                res.sendStatus(400)
                return
            }

            let serviceNode: HAPServiceNodeType | HAPService2NodeType

            if (node.type === 'homekit-service') {
                serviceNode = node as HAPServiceNodeType
            } else if (node.type === 'homekit-service2') {
                serviceNode = node as HAPService2NodeType
            } else {
                nodeLogger.error('Provided node is not homekit-service')
                res.sendStatus(400)
                return
            }

            const hostNode = serviceNode.hostNode
            const server = hostNode.host._server

            if (!server) {
                // There is a high chance that it is caused by host node not yet published
                nodeLogger.debug('Undefined server, try again later')
                res.sendStatus(202)
                return
            }

            const accessoryInfo: AccessoryInfo | undefined =
                server?.['accessoryInfo']

            if (!accessoryInfo) {
                // There is a high chance that it is caused by host node not yet published
                nodeLogger.debug('Undefined accessoryInfo, try again later')
                res.sendStatus(202)
                return
            }

            if (accessoryInfo.paired()) {
                nodeLogger.trace(
                    'Bridge already paired so no need to display qrcode'
                )
                res.sendStatus(204)
                return
            }

            const cacheKey = hostNode.id + '_' + hostNode.config.pinCode

            const pincode = BadgeGenerator.preparePincodeForQrcode(
                hostNode.config.pinCode
            )

            //We have qrcode cached already
            if (BadgeGenerator.memoryStorage.hasOwnProperty(cacheKey)) {
                nodeLogger.debug(
                    `Return cached badge for Bridge ${hostNode.id}`
                )
                res.json({
                    qrcode: BadgeGenerator.memoryStorage[cacheKey],
                    pincode,
                }).status(304)
                return
            }

            if (!hostNode.published) {
                nodeLogger.debug(`Bridge not yet published ${hostNode.id}`)
                res.sendStatus(202)
                return
            }

            const setupURI = hostNode.host.setupURI()

            await QRCode.toDataURL(setupURI, {
                errorCorrectionLevel: 'H',
                margin: 0,
            })
                .then((url) => {
                    nodeLogger.debug(
                        `Generated new badge for Bridge ${hostNode.id}`
                    )

                    BadgeGenerator.memoryStorage[cacheKey] = url

                    res.json({
                        qrcode: BadgeGenerator.memoryStorage[cacheKey],
                        pincode,
                    })
                    return
                })
                .catch((err) => {
                    nodeLogger.error(
                        `There was an error while generating qrcode for Bridge ${hostNode.id}, ${err}`
                    )
                    res.sendStatus(501)
                    return
                })
        } catch (err) {
            BadgeGenerator.log.error(`There was an error, ${err}`)
            res.sendStatus(500)
            return
        }

        BadgeGenerator.log.error('You should not be here!')
        return
    }

    /**
     * Format host pincode to be displayed next to the qrcode
     * @param pincode in form '123-45-678'
     * @return pincode as { top: '1234', bottom: '5678' }
     */
    static preparePincodeForQrcode(pincode: string): {
        top: string
        bottom: string
    } {
        if (!pincode) {
            throw new NRCHKBError(
                `Incorrect pincode provided ${pincode} - cannot be empty`
            )
        }

        if (!this.rawPincodeRegex.test(pincode)) {
            throw new NRCHKBError(
                `Incorrect pincode provided ${pincode} - incorrect format`
            )
        }

        const cleanPincode = pincode.replace(/\D/g, '')

        return {
            top: cleanPincode.substr(0, 4),
            bottom: cleanPincode.substr(4),
        }
    }
}
