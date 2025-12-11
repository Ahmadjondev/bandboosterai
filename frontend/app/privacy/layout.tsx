import { Metadata } from 'next';
import { WebPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'BandBooster AI Privacy Policy. Learn how we collect, use, and protect your personal information when you use our IELTS preparation platform.',
  alternates: {
    canonical: 'https://bandbooster.uz/privacy',
  },
  openGraph: {
    title: 'Privacy Policy - BandBooster AI',
    description: 'Learn how BandBooster AI handles your personal data.',
    url: 'https://bandbooster.uz/privacy',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WebPageJsonLd 
        title="Privacy Policy"
        description="BandBooster AI Privacy Policy - How we collect, use, and protect your personal information."
        url="https://bandbooster.uz/privacy"
      />
      {children}
    </>
  );
}
