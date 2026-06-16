const esbuild = require('esbuild')
const { globSync } = require('glob')

const isWatch = process.argv.includes('--watch')

const entryPoints = globSync('src/**/*.ts', {
    ignore: ['src/test/**', 'src/test**'],
})

async function run() {
    if (entryPoints.length === 0) {
        console.error('❌ No entry point files found to compile!')
        process.exit(1)
    }

    const ctx = await esbuild.context({
        outbase: 'src',
        entryPoints: entryPoints,
        format: 'cjs',
        outdir: 'build',
        platform: 'node',
    })

    if (isWatch) {
        await ctx.watch()
        console.log(`⚡ esbuild is watching ${entryPoints.length} files...`)
    } else {
        await ctx.rebuild()
        await ctx.dispose()
        console.log('📦 Production build complete.')
    }
}

run().catch((err) => {
    console.error(err)
    process.exit(1)
})
