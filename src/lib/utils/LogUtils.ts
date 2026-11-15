import { logger } from '@nrchkb/logger'
import type { Node } from 'node-red'

export type NRCHKBLogLevel =
    | 'inherit'
    | 'error'
    | 'debug'
    | 'trace'
    | 'disabled'
    | 'INHERIT'
    | 'ERROR'
    | 'DEBUG'
    | 'TRACE'
    | 'DISABLED'

type LogScopedNode = Node & {
    config?: {
        logLevel?: NRCHKBLogLevel
    }
    hostNode?: LogScopedNode
    parentNode?: LogScopedNode
}

type ScopedLoggerFactory = (
    namespacePrefix: string,
    namespace?: string,
    messagePrefix?: string,
    node?: Node,
    options?: { level?: NRCHKBLogLevel }
) => ReturnType<typeof logger>

export const normalizeLogLevel = (level?: string | null): NRCHKBLogLevel => {
    const normalizedLevel = level?.toLowerCase()

    return normalizedLevel === 'error' ||
        normalizedLevel === 'debug' ||
        normalizedLevel === 'trace' ||
        normalizedLevel === 'disabled'
        ? normalizedLevel
        : 'inherit'
}

let defaultLogLevel: NRCHKBLogLevel = 'inherit'

export const setDefaultLogLevel = (level?: string | null) => {
    defaultLogLevel = normalizeLogLevel(level)
}

const inheritedLevel = (level?: string | null): NRCHKBLogLevel => {
    const normalized = normalizeLogLevel(level)
    return normalized === 'inherit' ? defaultLogLevel : normalized
}

const explicitLevel = (node?: LogScopedNode): NRCHKBLogLevel | undefined => {
    const level = normalizeLogLevel(node?.config?.logLevel)

    return level === 'inherit' ? undefined : level
}

export const resolveLogLevel = (node?: LogScopedNode): NRCHKBLogLevel => {
    return (
        explicitLevel(node?.parentNode) ??
        explicitLevel(node) ??
        explicitLevel(node?.hostNode) ??
        defaultLogLevel
    )
}

// Resolve on use: hosts and services can outlive a deployment of the NRCHKB node.
// Cache the underlying logger until its effective level changes.
const dynamicLogger = (
    namespacePrefix: string,
    namespace: string | undefined,
    messagePrefix: string | undefined,
    node: Node | undefined,
    resolveLevel: () => NRCHKBLogLevel
): ReturnType<typeof logger> => {
    let currentLevel: NRCHKBLogLevel | undefined
    let currentLogger: ReturnType<typeof logger>
    const getLogger = () => {
        const level = resolveLevel()
        if (!currentLogger || currentLevel !== level) {
            currentLevel = level
            currentLogger = (logger as ScopedLoggerFactory)(
                namespacePrefix,
                namespace,
                messagePrefix,
                node,
                { level }
            )
        }
        return currentLogger
    }
    return {
        debug: (...args) => getLogger().debug(...args),
        error: (message: string, nodeError?: boolean, injectedNode?: Node) =>
            getLogger().error(message, nodeError, injectedNode),
        trace: (...args) => getLogger().trace(...args),
        level: (...args) => getLogger().level(...args),
    }
}

export const scopedLogger = (
    namespacePrefix: string,
    namespace?: string,
    messagePrefix?: string,
    node?: LogScopedNode
) =>
    dynamicLogger(namespacePrefix, namespace, messagePrefix, node, () =>
        resolveLogLevel(node)
    )

export const scopedLoggerForLevel = (
    namespacePrefix: string,
    namespace?: string,
    messagePrefix?: string,
    node?: Node,
    level?: string | null
) =>
    dynamicLogger(namespacePrefix, namespace, messagePrefix, node, () =>
        inheritedLevel(level)
    )
