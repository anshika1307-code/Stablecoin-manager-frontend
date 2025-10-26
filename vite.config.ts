import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import inject from '@rollup/plugin-inject'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
    inject({
      Buffer: ['buffer', 'Buffer'],
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],

  define: {
    'process.env': {},
    global: 'globalThis',
  },

  optimizeDeps: {
    include: [
      'buffer', 
      'eventemitter3', 
      '@wagmi/core',
      '@rainbow-me/rainbowkit',
      'wagmi'
    ],
    exclude: ['@coinbase/wallet-sdk'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },

  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util',
      path: 'path-browserify',
    },
  },

  build: {
    target: 'es2020',
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        compact: true,
        inlineDynamicImports: false,
      },
      onwarn(warning, warn) {
        // Ignore all warnings from dependencies
        if (warning.code === 'SOURCEMAP_ERROR') return
        if (warning.message.includes('PURE')) return
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        if (warning.code === 'CIRCULAR_DEPENDENCY') return
        if (warning.code === 'THIS_IS_UNDEFINED') return
        warn(warning)
      },
    },
  },
})