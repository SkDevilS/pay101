import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync } from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon.png', 'pay101.png'],
      manifest: {
        name: 'Pay101 Admin Dashboard',
        short_name: 'Pay101 Admin',
        description: 'Pay101 Admin and Merchant Dashboard',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ]
      }
    }),
    {
      name: 'copy-assets',
      closeBundle() {
        // Copy logo files to dist folder after build
        try {
          copyFileSync('pay101.png', 'dist/pay101.png')
          copyFileSync('icon.png', 'dist/icon.png')
          copyFileSync('favicon.png', 'dist/favicon.png')
          console.log('✓ Logo files copied to dist/')
        } catch (err) {
          console.error('Error copying logo files:', err)
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
