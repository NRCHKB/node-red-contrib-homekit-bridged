import type { NodeStatus } from '@node-red/registry'

import type NodeType from '../types/NodeType'

/**
 * NO_RESPONSE for NO_RESPONSE
 * MSG for all other status
 */
type StatusType = 'NO_RESPONSE' | 'MSG'
const DEFAULT_STATUS_TYPE: StatusType = 'MSG'
let nextStatusId = 0

type NodeStatusWithType = NodeStatus & {
    type?: StatusType
}
type Status = string | NodeStatusWithType

/**
 * Utils for setting and clearing status of a node in Node-RED flow Editor
 */
export class NodeStatusUtils {
    protected lastStatusId?: number
    protected lastStatusType?: StatusType
    protected pendingTimeouts = new Set<NodeJS.Timeout>()

    constructor(private node: Pick<NodeType, 'status'>) {}

    /**
     * Set the status
     * @param status - status to be displayed
     * @param timeout - if provided will clear the status after the timeout
     */
    setStatus(status: Status, timeout?: number): number {
        this.node.status(status)

        nextStatusId += 1
        const newStatusId = nextStatusId
        this.lastStatusId = newStatusId

        if (typeof status !== 'string') {
            this.lastStatusType = status.type ?? DEFAULT_STATUS_TYPE
        } else {
            this.lastStatusType = DEFAULT_STATUS_TYPE
        }

        if (timeout) {
            this.clearStatus(newStatusId, timeout)
        }

        return newStatusId
    }

    /**
     * Clear the status by type, only if last status type is the same as the type provided
     * @param type - type of status to be cleared
     */
    clearStatusByType(type: StatusType): void {
        if (this.lastStatusType === type) {
            this.clearStatus()
        }
    }

    /**
     * Clear the status
     * @param statusId - if provided will clear the status only if the statusId is the same as the last statusId
     * @param timeout - if provided will clear the status after the timeout
     */
    clearStatus(statusId?: number, timeout?: number): void {
        if (statusId !== undefined) {
            if (statusId === this.lastStatusId) {
                if (timeout) {
                    const timeoutHandle = setTimeout(
                        (nodeStatusUtil: NodeStatusUtils) => {
                            nodeStatusUtil.pendingTimeouts.delete(timeoutHandle)
                            nodeStatusUtil.clearStatus(statusId)
                        },
                        timeout,
                        this
                    )
                    // Track timeout for cleanup on node close
                    this.pendingTimeouts.add(timeoutHandle)
                } else {
                    this.setStatus('')
                }
            }
        } else {
            this.setStatus('')
        }
    }

    /**
     * Clean up all pending timeouts (call on node close)
     */
    cleanup(): void {
        this.pendingTimeouts.forEach((timeout) => clearTimeout(timeout))
        this.pendingTimeouts.clear()
    }
}
