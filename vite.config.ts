import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import inject from '@rollup/plugin-inject'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
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
    include: ['buffer', 'eventemitter3', '@wagmi/core'],
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
      // Force eventemitter3 to resolve correctly
      eventemitter3: 'eventemitter3',
    },
    dedupe: ['eventemitter3', '@wagmi/core'],
  },

  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
      defaultIsModuleExports: (id) => {
        // Force eventemitter3 to be treated as having default exports
        if (id.includes('eventemitter3')) {
          return 'auto'
        }
        return 'auto'
      },
    },
    rollupOptions: {
      output: {
        compact: true,
      },
    },
  },
})