import { NodeStatus } from '@node-red/registry'

type StatusUtilType = {
    lastStatusId: number
    setStatus: (status: string | NodeStatus, timeout?: number) => number
    clearStatus: (statusId: number, delay?: number) => void
}

export default StatusUtilType
