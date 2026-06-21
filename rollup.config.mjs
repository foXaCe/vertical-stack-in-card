import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

import pkg from './package.json' with { type: 'json' };

const dev = Boolean(process.env.ROLLUP_WATCH);

export default {
  input: 'src/index.ts',
  output: {
    file: `dist/${pkg.name}.js`,
    format: 'es',
    sourcemap: dev ? 'inline' : false,
  },
  plugins: [
    resolve(),
    commonjs(),
    json(),
    typescript({ tsconfig: './tsconfig.json' }),
    !dev &&
      terser({
        ecma: 2022,
        module: true,
        compress: { passes: 2 },
        format: { comments: false },
      }),
  ].filter(Boolean),
};
