import { defineConfig, searchForWorkspaceRoot } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

const origins = process.env.CORS_ORIGIN?.split(',') || []
const ip = origins[0]?.match(/https?:\/\/([^:]+)/)?.[1] || 'localhost'

const port_1 = 8080
const port_2 = 8081

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
        target: `http://${ip}:${port_1}`, //Forward it to backend server with the right ip, dont need to change every /api call to the right ip
        changeOrigin: true, //Needed for our type of sites (virtual hosted)
        secure: false, //Allows proxying to HTTP een though the server is HTTPS
      },
      //Needed for socket.io to correctly proxy websocker requests
      //to wws instad of ws. Otherwise gets blocked and gives mixed content error.
      '/socket.io': {
        target: `http://${ip}:${port_2}`,
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
