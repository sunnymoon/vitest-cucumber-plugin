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
    output: [
      {
        dir: 'dist',
        format: 'esm',
        sourcemap: true,
        entryFileNames: chunk => `${normalize(chunk.name).replace('src/', '')}.js`,
      },
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: chunk => `${normalize(chunk.name).replace('src/', '')}.cjs`,
      }
    ],
    external,
    plugins
  },
  // {
  //   input: 'src/vitest-cucumber-plugin.ts',
  //   output: [
  //     {
  //       file: 'dist/vitest-cucumber-plugin.cjs',
  //       format: 'cjs',
  //     },
  //     {
  //       file: 'dist/vitest-cucumber-plugin.js',
  //       format: 'esm',
  //     },
  //   ],
  //   external,
  //   plugins,
  // },
  {
    input: entries,
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


