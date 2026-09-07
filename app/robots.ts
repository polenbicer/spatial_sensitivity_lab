import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://cooling.polenbicer.dev/sitemap.xml',
    host: 'https://cooling.polenbicer.dev',
  };
}
