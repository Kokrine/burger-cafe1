import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // GitHub Pages-ზე საიტი ქვესაქაღალდეშია (/burger-cafe1/) — მისამართს workflow გადასცემს BASE_PATH-ით
  base: process.env.BASE_PATH ?? '/',
  server: { port: 5173, host: true },
  // Windows-ის აპის ვირტუალიზებულ AppData-ში realpath სხვა საქაღალდეს აბრუნებს.
  resolve: { preserveSymlinks: true },
  build: {
    // Phaser (~1.3 MB) ცალკე ფაილად — თამაშის განახლებისას ბრაუზერის ქეშში რჩება
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'], supabase: ['@supabase/supabase-js'] } },
      input: {
        main: resolve(__dirname, 'index.html'),
        stylePreview: resolve(__dirname, 'style-preview.html'),
      },
    },
  },
});
