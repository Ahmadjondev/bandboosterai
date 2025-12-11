import { Metadata } from 'next';
import { WebPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'BandBooster AI Terms of Service. Review the terms and conditions for using our IELTS preparation platform and services.',
  alternates: {
    canonical: 'https://bandbooster.uz/terms',
  },
  openGraph: {
    title: 'Terms of Service - BandBooster AI',
    description: 'Review the terms and conditions for using BandBooster AI services.',
    url: 'https://bandbooster.uz/terms',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WebPageJsonLd 
        title="Terms of Service"
        description="BandBooster AI Terms of Service - Terms and conditions for using our platform."
        url="https://bandbooster.uz/terms"
      />
      {children}
    </>
  );
}
