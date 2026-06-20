import { logger } from '@nrchkb/logger'

import type HAPServiceNodeType from '../types/HAPServiceNodeType'
import HostType from '../types/HostType'

const PUBLISH_CHECK_INTERVAL_MS = 250

const buildBridgeUtils = () => {
    const getConfiguredHostId = (
        node: HAPServiceNodeType,
        serviceNode: HAPServiceNodeType | undefined
    ): string | undefined => {
        if (!serviceNode) {
            return undefined
        }

        if (serviceNode.config.isParent) {
            return serviceNode.config.hostType == HostType.BRIDGE
                ? serviceNode.config.bridge
                : serviceNode.config.accessoryId
        }

        const parentNode = node.RED.nodes.getNode(
            serviceNode.config.parentService
        ) as HAPServiceNodeType | undefined

        return parentNode?.hostNode?.id ?? getConfiguredHostId(node, parentNode)
    }

    const getServiceHostId = (
        node: HAPServiceNodeType,
        serviceNode: HAPServiceNodeType
    ): string | undefined =>
        serviceNode.hostNode?.id ?? getConfiguredHostId(node, serviceNode)

    const canPublishHost = (node: HAPServiceNodeType): boolean => {
        let hasPendingService = false

        node.RED.nodes.eachNode((currentNode) => {
            if (hasPendingService) {
                return
            }

            if (
                currentNode.type !== 'homekit-service' &&
                currentNode.type !== 'homekit-service2'
            ) {
                return
            }

            const serviceNode = node.RED.nodes.getNode(currentNode.id) as
                | HAPServiceNodeType
                | undefined

            if (
                serviceNode &&
                getServiceHostId(node, serviceNode) === node.hostNode.id &&
                !serviceNode.configured
            ) {
                hasPendingService = true
            }
        })

        return !hasPendingService
    }

    // Publish accessory after the service has been added
    // BUT ONLY after the host's service nodes are fully configured.
    // This keeps startup responsive while still avoiding premature publish.
    const delayedPublish = (node: HAPServiceNodeType) => {
        const log = logger('NRCHKB', 'BridgeUtils', node.config.name, node)

        if (!node.hostNode.published) {
            if (node.publishTimers[node.hostNode.id] !== undefined) {
                clearTimeout(node.publishTimers[node.hostNode.id])
            }

            const hostTypeName =
                node.hostNode.hostType == HostType.BRIDGE
                    ? 'Bridge'
                    : 'Standalone Accessory'

            const tryPublish = () => {
                try {
                    if (!node.hostNode.published) {
                        if (!canPublishHost(node)) {
                            node.publishTimers[node.hostNode.id] = setTimeout(
                                tryPublish,
                                PUBLISH_CHECK_INTERVAL_MS
                            )
                            return
                        }

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
                        text: `Error while publishing ${hostTypeName}`,
                    })
                }
            }

            node.publishTimers[node.hostNode.id] = setTimeout(
                tryPublish,
                PUBLISH_CHECK_INTERVAL_MS
            )
        }
    }

    return {
        delayedPublish: delayedPublish,
    }
}

export = buildBridgeUtils
