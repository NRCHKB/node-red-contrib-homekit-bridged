import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const supportedLocales = ['en-US', 'de', 'fr', 'es']
const catalogNames = [
    'bridge',
    'nrchkb',
    'plugin-instance',
    'service',
    'service2',
    'standalone',
    'status',
    'unifi-controller',
]
const nodesRoot = join(process.cwd(), 'build', 'nodes')
const localeRoot = join(nodesRoot, 'locales')

const flattenKeys = (value: unknown, prefix = ''): string[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [prefix]
    }

    return Object.entries(value).flatMap(([key, nestedValue]) =>
        flattenKeys(nestedValue, prefix ? `${prefix}.${key}` : key)
    )
}

const readCatalog = (locale: string, catalogName: string): unknown =>
    JSON.parse(
        readFileSync(join(localeRoot, locale, `${catalogName}.json`), 'utf8')
    )

const readNodeHtmlFiles = (): string[] =>
    readdirSync(nodesRoot)
        .filter((fileName) => fileName.endsWith('.html'))
        .map((fileName) => readFileSync(join(nodesRoot, fileName), 'utf8'))

const getEditorI18nKeys = (): string[] => {
    const keys = new Set<string>()

    readNodeHtmlFiles().forEach((content) => {
        for (const match of content.matchAll(/data-i18n="([^"]+)"/g)) {
            match[1]
                .split(';')
                .map((key) => key.trim().replace(/^\[[^\]]+]/, ''))
                .forEach((key) => keys.add(key))
        }
    })

    return [...keys].sort()
}

const getDynamicEditorKeys = (): string[] => {
    const keys = new Set<string>()

    readNodeHtmlFiles().forEach((content) => {
        for (const match of content.matchAll(/nrchkbText\('([^']+)'\s*,/g)) {
            keys.add(match[1])
        }
    })

    return [...keys].sort()
}

const getEnglishKeys = (): string[] =>
    catalogNames.flatMap((catalogName) =>
        flattenKeys(readCatalog('en-US', catalogName))
    )

const getEnglishNrchkbKeys = (): string[] =>
    flattenKeys(readCatalog('en-US', 'nrchkb'))

describe('node editor locales', () => {
    it('ships the supported Node-RED locale directories', () => {
        expect(readdirSync(localeRoot).sort()).toEqual(supportedLocales.sort())
    })

    it('uses one catalog file per packaged node', () => {
        supportedLocales.forEach((locale) => {
            expect(readdirSync(join(localeRoot, locale)).sort()).toEqual(
                catalogNames.map((catalogName) => `${catalogName}.json`).sort()
            )
        })
    })

    it('keeps translated catalogs aligned with en-US keys', () => {
        catalogNames.forEach((catalogName) => {
            const englishKeys = flattenKeys(
                readCatalog('en-US', catalogName)
            ).sort()

            supportedLocales
                .filter((locale) => locale !== 'en-US')
                .forEach((locale) => {
                    expect(
                        flattenKeys(readCatalog(locale, catalogName)).sort()
                    ).toEqual(englishKeys)
                })
        })
    })

    it('defines every static editor message key used by node HTML', () => {
        expect(getEnglishKeys()).toEqual(
            expect.arrayContaining(getEditorI18nKeys())
        )
    })

    it('defines every dynamic editor message key in a node catalog', () => {
        const dynamicKeys = getDynamicEditorKeys()
        const englishKeys = getEnglishKeys()

        expect(
            dynamicKeys.every((key) =>
                catalogNames.some((catalogName) =>
                    englishKeys.includes(`${catalogName}.${key}`)
                )
            )
        ).toBe(true)
    })

    it('localizes the NRCHKB sidebar tab label', () => {
        const nrchkbHtml = readFileSync(join(nodesRoot, 'nrchkb.html'), 'utf8')

        expect(nrchkbHtml).toContain("text('qr.sidebarName'")
    })

    it('defines advertiser recommendation editor messages', () => {
        expect(getEnglishNrchkbKeys()).toEqual(
            expect.arrayContaining([
                'nrchkb.advertiser.caveat.containerNoAvahi',
                'nrchkb.advertiser.caveat.containerWithAvahi',
                'nrchkb.advertiser.caveat.installAvahi',
                'nrchkb.advertiser.caveat.resolvedAdvanced',
                'nrchkb.advertiser.caveat.uncommonPlatform',
                'nrchkb.advertiser.reason.linuxAvahiAvailable',
                'nrchkb.advertiser.reason.linuxContainerNoAvahi',
                'nrchkb.advertiser.reason.linuxNoAvahi',
                'nrchkb.advertiser.reason.macosHost',
                'nrchkb.advertiser.reason.unsupportedPlatform',
                'nrchkb.advertiser.reason.windowsHost',
                'nrchkb.advertiser.recommendedSuffix',
                'nrchkb.advertiser.title.avahi',
                'nrchkb.advertiser.title.ciao',
                'nrchkb.advertiser.title.resolved',
                'nrchkb.advertiser.title.bonjour-hap',
            ])
        )
    })
})
