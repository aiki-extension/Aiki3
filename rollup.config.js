import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';

const production = !process.env.ROLLUP_WATCH;
// Live reload is not compatible with extension pages (CSP + file scheme)
const enableLiveReload = false;
// Merge .env with runtime environment variables; runtime vars (e.g. CI) win.
const env = {
  ...(dotenv.config().parsed || {}),
  ...process.env,
};

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn(
        'npm',
        ['run', 'start', '--', '--dev'],
        {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        },
      );

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    },
  };
}

export default [
  {
    input: 'src/main.js',
    output: {
      sourcemap: true,
      format: 'iife',
      name: 'app',
      file: 'public/build/bundle.js',
    },
    plugins: [
      svelte({
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
        },
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ['svelte'],
      }),
      commonjs(),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      // For browser apps we could enable serve/livereload, but extension pages
      // disallow it; keep disabled to avoid broken popup due to missing livereload.js
      !production && enableLiveReload && serve(),
      !production && enableLiveReload && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  },
  {
    input: 'src/background.js',
    output: {
      sourcemap: true,
      format: 'iife',
      file: 'public/build/background.js',
    },
    plugins: [
      resolve(),
      commonjs(),
      replace({
        preventAssignment: true,
        values: {
          __API_BASE_URL__: JSON.stringify(
            env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api/',
          ), //Fallback value if .env is undefined
        },
      }),
    ],
    watch: {
      clearScreen: false,
    },
  },
  {
    input: 'src/injection.js',
    output: {
      sourcemap: true,
      format: 'iife',
      file: 'public/build/injection.js',
    },
    plugins: [resolve(), commonjs()],
    watch: {
      clearScreen: false,
    },
  },
];
