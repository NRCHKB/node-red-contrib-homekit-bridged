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

const explicitLevel = (node?: LogScopedNode): NRCHKBLogLevel | undefined => {
    const level = normalizeLogLevel(node?.config?.logLevel)

    return level === 'inherit' ? undefined : level
}

export const resolveLogLevel = (node?: LogScopedNode): NRCHKBLogLevel => {
    return (
        explicitLevel(node?.parentNode) ??
        explicitLevel(node) ??
        explicitLevel(node?.hostNode) ??
        'inherit'
    )
}

export const scopedLogger = (
    namespacePrefix: string,
    namespace?: string,
    messagePrefix?: string,
    node?: LogScopedNode
) =>
    (logger as ScopedLoggerFactory)(
        namespacePrefix,
        namespace,
        messagePrefix,
        node,
        {
            level: resolveLogLevel(node),
        }
    )

export const scopedLoggerForLevel = (
    namespacePrefix: string,
    namespace?: string,
    messagePrefix?: string,
    node?: Node,
    level?: string | null
) =>
    (logger as ScopedLoggerFactory)(
        namespacePrefix,
        namespace,
        messagePrefix,
        node,
        {
            level: normalizeLogLevel(level),
        }
    )
