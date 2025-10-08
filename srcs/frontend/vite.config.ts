import { defineConfig , searchForWorkspaceRoot } from 'vite'
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
		fs: {
      allow: [
        // search up for workspace root
        searchForWorkspaceRoot(process.cwd()),
        // your custom rules
        '@babylonjs/havok',
      ],
    },
	},
	
})