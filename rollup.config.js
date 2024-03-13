import fs from 'node:fs'
import { builtinModules, createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize, relative, resolve } from 'pathe'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import c from 'picocolors'
import fg from 'fast-glob'
import { defineConfig } from 'rollup'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

const entries = {
  'index': 'src/index.ts',
  'vitest-cucumber-plugin': 'src/vitest-cucumber-plugin.ts',
  'vitest-cucumber-runner': 'src/vitest-cucumber-runner.ts',
  'cucumber-vitest-formatter': 'src/cucumber-vitest-formatter.ts',
  'cucumber-helpers': 'src/cucumber-helpers.ts',
}

const dtsEntries = entries;

const external = [
  ...builtinModules,
  ...Object.keys(pkg.dependencies),
  'worker_threads',
  'node:worker_threads',
  'node:fs',
  'node:vm',
  'inspector',
  'vite-node/source-map',
  'vite-node/client',
  'vite-node/server',
  'vite-node/constants',
  'vite-node/utils',
  '@cucumber/cucumber',
  '@cucumber/messages',
  'vitest'
]

const dir = dirname(fileURLToPath(import.meta.url))

const plugins = [
  nodeResolve({
    preferBuiltins: true,
  }),
  json(),
  commonjs(),
  esbuild({
    target: 'node14',
  }),
]

export default ({ watch }) => defineConfig([
  {
    input: entries,
    treeshake: true,
    output: {
      dir: 'dist',
      format: 'esm',
      chunkFileNames: (chunkInfo) => {
        let id = chunkInfo.facadeModuleId || Object.keys(chunkInfo.moduleIds).find(i => !i.includes('node_modules') && (i.includes('src/') || i.includes('src\\')))
        if (id) {
          id = normalize(id)
          const parts = Array.from(
            new Set(relative(process.cwd(), id).split(/\//g)
              .map(i => i.replace(/\..*$/, ''))
              .filter(i => !['src', 'index', 'dist', 'node_modules'].some(j => i.includes(j)) && i.match(/^[\w_-]+$/))),
          )
          if (parts.length)
            return `chunks/${parts.slice(-2).join('-')}.[hash].js`
        }
        return 'vendor/[name].[hash].js'
      },
    },
    external,
    plugins: [
      ...plugins,
    ],
    onwarn,
  },
  {
    input: 'src/vitest-cucumber-plugin.ts',
    output: [
      {
        file: 'dist/vitest-cucumber-plugin.cjs',
        format: 'cjs',
      },
      {
        file: 'dist/vitest-cucumber-plugin.js',
        format: 'esm',
      },
    ],
    external,
    plugins,
  },
  {
    input: dtsEntries,
    output: {
      dir: 'dist',
      entryFileNames: chunk => `${normalize(chunk.name).replace('src/', '')}.d.ts`,
      format: 'esm',
    },
    external,
    plugins: [
      dts({ respectExternal: true }),
    ],
  },
])


function onwarn(message) {
  if (['EMPTY_BUNDLE', 'CIRCULAR_DEPENDENCY'].includes(message.code))
    return
  console.error(message)
}
