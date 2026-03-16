import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    worker: 'src/worker.ts',
    'scripts/seed': 'src/scripts/seed.ts',
  },
  format: ['cjs'],
  clean: true,
  noExternal: [/^@uptimemonitor\//],
})
