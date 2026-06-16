import {
    type FlowMigrationResult,
    migrateFlow,
    migrateNode,
    type NodeRedFlowNode,
} from './NodeMigration'

export const migrateHomeKitServiceNode = (node: NodeRedFlowNode): boolean => {
    return migrateNode(node).migrated
}

export const migrateHomeKitServiceFlow = (
    nodes: NodeRedFlowNode[]
): HomeKitService2MigrationResult => migrateFlow(nodes)

export type HomeKitService2MigrationResult = FlowMigrationResult
