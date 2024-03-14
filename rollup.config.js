import { fileURLToPath } from 'node:url'
import { dirname, normalize } from 'pathe'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import { defineConfig } from 'rollup'
import  glob  from 'fast-glob'

const entries = (await glob('./src/*.ts'));

const external=(id)=> {
  const isOthers=!id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0') && !id.startsWith('node:');
  return isOthers;
}

const nodeDynamicImportPlugin = () => ({
  name: 'node-dynamic-import',
  renderDynamicImport() {
    return {
      left: 'import(',
      right: ')',
    }
  }
});


const dir = dirname(fileURLToPath(import.meta.url))

const plugins = [
  nodeResolve({
    preferBuiltins: true,
  }),
  json(),
  commonjs(),
  esbuild({
    target: 'node18',
  }),
  nodeDynamicImportPlugin()
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
    plugins,
  },
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