import { defineConfig } from 'vite';

// Put the large Three.js renderer in an independently cacheable vendor chunk.
// The Cloudflare self-contained worker packager automatically serves all assets.
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three-vendor';
        }
      }
    }
  }
});
