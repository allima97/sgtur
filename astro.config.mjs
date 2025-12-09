import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  adapter: cloudflare({
    // Sharp não roda no runtime do Cloudflare; servir imagens sem processamento.
    imageService: "passthrough",
  }),
  // Middleware + Supabase SSR precisam de modo server/híbrido para evitar redirecionos durante o build.
  output: 'server',
  vite: {
    // Evita falhas de "Outdated Optimize Dep" no dev ao carregar gráficos
    optimizeDeps: {
      include: ["recharts"],
    },
  },
});
