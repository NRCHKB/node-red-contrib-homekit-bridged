import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        globals: false,
        include: ['src/**/*.test.ts'],
        hookTimeout: 30000,
        pool: 'forks',
        testTimeout: 30000,
    },
})
