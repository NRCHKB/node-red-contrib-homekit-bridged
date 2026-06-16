import { createAutomaticHomebridgeCameraFfmpegPluginEntry } from '../../plugins/embedded'

export type NodeRedFlowNode = {
    id?: string
    type?: string
    serviceName?: string
    outputMode?: string
    useEventCallback?: boolean
    outputs?: number
    wires?: unknown
    [key: string]: unknown
}

export type NodeMigrationResult = {
    migrated: boolean
    cameraMigrated: boolean
    node: NodeRedFlowNode
}

export type FlowMigrationResult = {
    migrated: number
    cameraMigrated: number
    skipped: number
    nodes: NodeRedFlowNode[]
}

export const migrateNode = (node: NodeRedFlowNode): NodeMigrationResult => {
    const cameraMigrated =
        node.type === 'homekit-service' && node.serviceName === 'CameraControl'

    if (node.type !== 'homekit-service') {
        return {
            migrated: false,
            cameraMigrated: false,
            node,
        }
    }

    node.type = 'homekit-service2'
    if (cameraMigrated) {
        node.serviceName = 'Camera'
        node.plugins = [createAutomaticHomebridgeCameraFfmpegPluginEntry(node)]
    }
    node.outputMode = 'legacy'
    node.useEventCallback = false
    node.outputs = cameraMigrated ? 3 : 2

    return {
        migrated: true,
        cameraMigrated,
        node,
    }
}

export const migrateFlow = (nodes: NodeRedFlowNode[]): FlowMigrationResult => {
    let migrated = 0
    let cameraMigrated = 0
    let skipped = 0

    nodes.forEach((node) => {
        const result = migrateNode(node)
        if (result.migrated) {
            migrated += 1
            if (result.cameraMigrated) {
                cameraMigrated += 1
            }
        } else {
            skipped += 1
        }
    })

    return {
        migrated,
        cameraMigrated,
        skipped,
        nodes,
    }
}
