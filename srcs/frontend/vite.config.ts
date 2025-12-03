import { defineConfig, searchForWorkspaceRoot } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig({
  plugins: [
    basicSsl(),
  ],
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
  server: {
    host: '0.0.0.0',
    https: true,
    proxy: {
      '/api': { //For every request to /api, meaning every call of /api on the frontend/src files
        target: 'http://10.17.28.98:8080', //Forward it to backend server with the right ip, dont need to change every /api call to the right ip
        changeOrigin: true, //Needed for our type of sites (virtual hosted)
        secure: false, //Allows proxying to HTTP een though the server is HTTPS
      },
      //Needed for socket.io to correctly proxy websocker requests
      //to wws instad of ws. Otherwise gets blocked and gives mixed content error.
      '/socket.io': {
        target: 'http://10.17.28.98:8081',
        changeOrigin: true,
        ws: true, //Enable websockets proxying
        secure: false, //Allows proxying to HTTP een though the serve is HTTPS
      },
    },
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        '@babylonjs/havok',
      ],
    },
  },
})
