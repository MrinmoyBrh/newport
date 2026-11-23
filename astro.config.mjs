process.env.ASTRO_TELEMETRY_DISABLED = '1';

import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

// https://astro.build/config
export default defineConfig({
  site: 'https://mrinmoybrh.github.io',
  output: 'server',
  devToolbar: {
    enabled: false,
  },
  adapter: isVercel
    ? vercel()
    : node({
        mode: 'standalone',
      }),
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
