import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import inject from '@rollup/plugin-inject'  

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
  ],

  define: {
    'process.env': {},
    global: 'window',
  },

  optimizeDeps: {
    include: ['buffer'], 
  },
})
