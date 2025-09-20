import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ command }) => ({
  resolve: { alias: { '@': '/src' } },
  plugins: command === 'build' ? [react(), viteSingleFile()] : [react()],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    sourcemap: false,
    rollupOptions: { output: { manualChunks: undefined } }
  }
}))

