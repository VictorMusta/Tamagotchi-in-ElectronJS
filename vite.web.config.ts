import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    root: resolve(__dirname, 'src/web'),
    base: './',
    build: {
        outDir: resolve(__dirname, 'dist-web'),
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'src/web/index.html')
        }
    },
    resolve: {
        alias: {
            '@renderer': resolve(__dirname, 'src/renderer'),
            '@shared': resolve(__dirname, 'src/shared'),
            '@web': resolve(__dirname, 'src/web')
        }
    },
    publicDir: resolve(__dirname, 'src/renderer/assets')
})
