import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  },
  build: {
    assetsDir: 'assets',
    emptyOutDir: true
  },
	server:{
		host: '0.0.0.0',
	}
})