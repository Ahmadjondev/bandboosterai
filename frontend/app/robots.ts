import { MetadataRoute } from 'next';

const siteUrl = 'https://bandbooster.uz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/manager/',
          '/teacher/',
          '/practice-session/',
          '/verify-email/',
          '/*.json$',
          '/403',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/manager/',
          '/teacher/',
          '/practice-session/',
          '/verify-email/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
