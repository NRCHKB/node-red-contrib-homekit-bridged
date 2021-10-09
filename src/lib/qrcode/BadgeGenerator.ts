import { NodeAPI } from 'node-red'
import { logger } from '@nrchkb/logger'
import QRCode from 'qrcode'
import HAPServiceNodeType from '../types/HAPServiceNodeType'
import HAPService2NodeType from '../types/HAPService2NodeType'
import { URL } from 'url'
import { AccessoryInfo } from 'hap-nodejs/dist/lib/model/AccessoryInfo'

const log = logger('NRCHKB', 'BadgeGenerator')

export default (RED: NodeAPI) => {
    let qrcodeCache: { [key: string]: any } = {}
    let pincodeCache: { [key: string]: any } = {}

    const splitPincode = function (pincode: string) {
        return {
            top: pincode.substr(0, 4),
            bottom: pincode.substr(4),
        }
    }

    const cleanPincode = function (pincode: string) {
        return pincode.replace(/[^\d]/, '').replace(/[^\d]/, '')
    }

    const start = function () {
        log.debug('QRCode Badge Generator started. Usage /qrcode?nodeId=<id>')

        RED.httpAdmin.get(
            '/qrcode',
            RED.auth.needsPermission('homekit.read'),
            (req, res) => {
                try {
                    log.trace(`Received request ${req.url}`)
                    const url = new URL(req.url, 'https://localhost')
                    const nodeId = url.searchParams.get('nodeId')

                    //nodeId is empty
                    if (typeof nodeId === 'undefined' || !nodeId) {
                        log.error('Provided nodeId is empty')
                        res.sendStatus(404)
                        return
                    }
                    log.trace(`Found nodeId=${nodeId}`)

                    const node = RED.nodes.getNode(nodeId)

                    if (!node) {
                        log.error(
                            `[${nodeId}] Could not find node for given id`
                        )
                        res.sendStatus(404)
                        return
                    }

                    let serviceNode: HAPServiceNodeType | HAPService2NodeType

                    if (node.type === 'homekit-service') {
                        serviceNode = node as HAPServiceNodeType
                    } else if (node.type === 'homekit-service2') {
                        serviceNode = node as HAPService2NodeType
                    } else {
                        log.error(
                            `[${nodeId}] Provided node is not homekit-service`
                        )
                        res.sendStatus(404)
                        return
                    }

                    const hostNode = serviceNode.hostNode
                    const server = hostNode.host._server

                    if (!server) {
                        log.error(`[${nodeId}] Undefined server`)
                        res.sendStatus(500)
                        return
                    }

                    const accessoryInfo: AccessoryInfo | undefined =
                        server?.['accessoryInfo']

                    if (!accessoryInfo) {
                        log.error(`[${nodeId}] Undefined accessoryInfo`)
                        res.sendStatus(500)
                        return
                    }

                    if (accessoryInfo.paired()) {
                        log.trace(
                            `[${nodeId}] Bridge already paired so no need to display qrcode`
                        )
                        res.sendStatus(204)
                        return
                    }

                    const cacheKey = hostNode.id + '_' + hostNode.config.pinCode

                    //We have qrcode cached already
                    if (qrcodeCache.hasOwnProperty(cacheKey)) {
                        log.debug(
                            `Return cached badge for Bridge ${hostNode.id}`
                        )
                        res.status(304).json({
                            qrcode: qrcodeCache[cacheKey],
                            pincode: pincodeCache[cacheKey],
                        })
                        return
                    }

                    if (!hostNode.published) {
                        log.debug(
                            `[${nodeId}]Bridge not yet published ${hostNode.id}`
                        )
                        res.sendStatus(307)
                        return
                    }

                    const setupURI = hostNode.host.setupURI()

                    return QRCode.toDataURL(setupURI, {
                        errorCorrectionLevel: 'H',
                        margin: 0,
                    })
                        .then((url) => {
                            log.debug(
                                `[${nodeId}] Generated new badge for Bridge ${hostNode.id}`
                            )

                            qrcodeCache[cacheKey] = url
                            pincodeCache[cacheKey] = splitPincode(
                                cleanPincode(hostNode.config.pinCode)
                            )

                            res.json({
                                qrcode: qrcodeCache[cacheKey],
                                pincode: pincodeCache[cacheKey],
                            })
                            return
                        })
                        .catch((err) => {
                            log.error(
                                `[${nodeId}] There was an error while generating qrcode for Bridge ${hostNode.id}, ${err}`
                            )
                            res.sendStatus(501)
                            return
                        })
                } catch (err) {
                    log.error(
                        `There was an error in QRCode Badge Generator, ${err}`
                    )
                    res.sendStatus(500)
                }

                return
            }
        )
    }

    return {
        splitPincode: splitPincode,
        start: start,
    }
}
