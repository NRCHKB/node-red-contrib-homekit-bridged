import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        globals: false,
        include: ['src/**/*.test.ts'],
        hookTimeout: 30000,
        pool: 'forks',
        testTimeout: 5000,
        coverage: {
            provider: 'v8',
            include: [
                'build/lib/**/*.js',
                'build/nodes/**/*.js',
                'build/plugins/**/*.js',
            ],
            reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
            thresholds: {
                statements: 61.8,
                branches: 49.48,
                functions: 59.53,
                lines: 62.03,
            },
        },
    },
})
