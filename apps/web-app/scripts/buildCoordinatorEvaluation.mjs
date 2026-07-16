import { resolve } from 'node:path'
import { build } from 'vite'

const appRoot = resolve(import.meta.dirname, '..')

await build({
  build: {
    emptyOutDir: true,
    minify: false,
    outDir: resolve(appRoot, 'node_modules/.tmp/coordinator-evaluation'),
    rollupOptions: {
      input: resolve(import.meta.dirname, 'runCoordinatorEvaluation.ts'),
      output: {
        entryFileNames: 'runner.mjs',
      },
    },
    ssr: true,
    target: 'node20',
  },
  configFile: false,
  logLevel: 'error',
  root: appRoot,
})
