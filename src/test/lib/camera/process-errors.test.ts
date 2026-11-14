import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('camera process failure isolation', () => {
    it.each(['snapshot', 'recording'])(
        '%s reports missing FFmpeg without terminating Node-RED',
        (mode) => {
            const script =
                mode === 'snapshot'
                    ? `const { CameraDelegate } = require('./build/lib/camera/CameraDelegate');
               const camera = new CameraDelegate({displayName: 'Camera', UUID: 'camera'}, {cameraConfigVideoProcessor: 'nrchkb-nonexistent-ffmpeg'});
               camera.handleSnapshotRequest({width: 16, height: 16}, error => {
                   require('node:assert').ok(error);
                   console.log('handled');
               });`
                    : `const { MP4StreamingServer } = require('./build/lib/camera/MP4StreamingServer');
               (async () => {
                   const server = new MP4StreamingServer('nrchkb-nonexistent-ffmpeg', [], [], []);
                   try { await server.start(); throw Error('Expected spawn failure'); }
                   catch (error) { require('node:assert').equal(error.code, 'ENOENT'); console.log('handled'); }
                   finally { server.destroy(); }
               })().catch(error => { console.error(error); process.exitCode = 1; });`
            const child = spawnSync(process.execPath, ['-e', script], {
                encoding: 'utf8',
                timeout: 5000,
            })
            expect(child.error).toBeUndefined()
            expect(child.status, child.stderr).toBe(0)
            expect(child.stdout).toContain('handled')
        }
    )
})
