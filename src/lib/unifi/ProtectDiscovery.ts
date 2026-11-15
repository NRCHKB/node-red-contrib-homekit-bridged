import { logger } from '@nrchkb/logger'
import type UniFiControllerConfigType from '../types/UniFiControllerConfigType'
import type { UniFiControllerCredentials } from '../types/UniFiControllerConfigType'

type ProtectApiLike = {
    bootstrap?: {
        cameras?: ProtectCameraSummary[]
    }
    getBootstrap: () => Promise<boolean>
    login: (
        address: string,
        username: string,
        password: string
    ) => Promise<boolean>
    logout: () => void
}

type ProtectApiModule = {
    ProtectApi: new (log: unknown) => ProtectApiLike
}

export type ProtectCameraSummary = {
    id: string
    mac: string
    name?: string
    marketName?: string
    modelKey?: string
    state?: string
}

const importEsm = (specifier: string): Promise<unknown> => {
    const importer = new Function('specifier', 'return import(specifier)')
    return importer(specifier) as Promise<unknown>
}

const createDiscoveryLogger = () => {
    const log = logger('NRCHKB', 'UniFiProtectDiscovery')

    return {
        debug: (message: string) => log.debug(message),
        error: (message: string) => log.error(message),
        info: (message: string) => log.debug(message),
        warn: (message: string) => log.debug(message),
    }
}

export const assertProtectControllerConfig = (
    config: UniFiControllerConfigType,
    credentials: UniFiControllerCredentials
): void => {
    if ((config.application ?? 'protect') !== 'protect') {
        throw new Error('Only UniFi Protect controllers are supported.')
    }

    if (!config.address?.trim()) {
        throw new Error('UniFi controller address is required.')
    }

    if (!credentials.username?.trim() || !credentials.password) {
        throw new Error('UniFi controller username and password are required.')
    }
}

export const discoverProtectCameras = async (
    config: UniFiControllerConfigType,
    credentials: UniFiControllerCredentials
): Promise<ProtectCameraSummary[]> => {
    assertProtectControllerConfig(config, credentials)

    const module = (await importEsm('unifi-protect')) as ProtectApiModule
    const client = new module.ProtectApi(createDiscoveryLogger())

    try {
        const loggedIn = await client.login(
            config.address as string,
            credentials.username as string,
            credentials.password as string
        )

        if (!loggedIn) {
            throw new Error('Unable to log in to UniFi Protect.')
        }

        const bootstrapped = await client.getBootstrap()

        if (!bootstrapped) {
            throw new Error('Unable to retrieve UniFi Protect bootstrap data.')
        }

        return (client.bootstrap?.cameras ?? [])
            .filter((camera) => camera.id && camera.mac)
            .sort((a, b) =>
                (a.name ?? a.marketName ?? a.mac).localeCompare(
                    b.name ?? b.marketName ?? b.mac
                )
            )
    } finally {
        client.logout()
    }
}
