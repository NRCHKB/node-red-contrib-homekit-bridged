import { logger } from '@nrchkb/logger'

import HAPServiceNodeType from '../types/HAPServiceNodeType'
import HostType from '../types/HostType'

module.exports = function () {
    // Publish accessory after the service has been added
    // BUT ONLY after 5 seconds with no new service have passed
    // otherwise, our bridge would get published too early during startup and
    // services being added after that point would be seen as "new" in iOS,
    // removing all parameters set (Rooms, Groups, Scenes...)
    const delayedPublish = function (node: HAPServiceNodeType) {
        const log = logger('NRCHKB', 'BridgeUtils', node.config.name, node)

        if (!node.hostNode.published) {
            if (node.publishTimers[node.hostNode.id] !== undefined) {
                clearTimeout(node.publishTimers[node.hostNode.id])
            }

            const hostTypeName =
                node.hostNode.hostType == HostType.BRIDGE
                    ? 'Bridge'
                    : 'Standalone Accessory'

            node.publishTimers[node.hostNode.id] = setTimeout(function () {
                try {
                    if (!node.hostNode.published) {
                        const published = node.hostNode.publish()

                        if (published) {
                            log.debug(`${hostTypeName} published`)
                        } else {
                            log.error(`${hostTypeName} not published`)
                        }
                    }
                } catch (error) {
                    log.error(`${hostTypeName} publish failed due to ${error}`)

                    node.nodeStatusUtils.setStatus({
                        fill: 'red',
                        shape: 'ring',
                        text: 'Error while publishing ' + hostTypeName,
                    })
                }
            }, 5000)
        }
    }

    return {
        delayedPublish: delayedPublish,
    }
}
