module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html}'
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "monospace"]
      },
      colors: {
        neonPink: '#ff00ff',
        neonCyan: '#00ffff',
        cyberBg: '#111',
        inputBg: '#1a1a1a'
      },
      keyframes: {
        glassSweep: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glitchImage: {
          '0%': { transform: 'translateX(-50%) translate(2px, 0)' },
          '20%': { transform: 'translateX(-50%) translate(-2px, -1px)' },
          '40%': { transform: 'translateX(-50%) translate(1px, 2px)' },
          '60%': { transform: 'translateX(-50%) translate(-1px, 1px)' },
          '80%': { transform: 'translateX(-50%) translate(3px, -1px)' },
          '100%': { transform: 'translateX(-50%) translate(0, 0)' }
        },
        shake: {
          '0%': { transform: 'translate(1px,1px) rotate(0deg)' },
          '10%': { transform: 'translate(-1px,-2px) rotate(-1deg)' },
          '20%': { transform: 'translate(-3px,0) rotate(1deg)' },
          '30%': { transform: 'translate(3px,2px) rotate(0deg)' },
          '40%': { transform: 'translate(1px,-1px) rotate(1deg)' },
          '50%': { transform: 'translate(-1px,2px) rotate(-1deg)' },
          '60%': { transform: 'translate(-3px,1px) rotate(0deg)' },
          '70%': { transform: 'translate(3px,1px) rotate(-1deg)' },
          '80%': { transform: 'translate(-1px,-1px) rotate(1deg)' },
          '90%': { transform: 'translate(1px,2px) rotate(0deg)' },
          '100%': { transform: 'translate(1px,-2px) rotate(-1deg)' }
        }
      },
      animation: {
        glassSweep: 'glassSweep 10s linear infinite',
        glitchImage: 'glitchImage 1s infinite',
        shake: 'shake 0.2s infinite'
      }
    }
  },
  plugins: []
}
