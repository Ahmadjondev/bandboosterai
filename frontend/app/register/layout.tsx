import { Metadata } from 'next';
import { WebPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Register - Start Your IELTS Preparation Journey',
  description: 'Create your free BandBooster AI account and start preparing for IELTS. Access mock tests, get AI-powered feedback, and track your progress toward your target band score.',
  keywords: ['IELTS registration', 'create IELTS account', 'free IELTS practice', 'BandBooster signup'],
  alternates: {
    canonical: 'https://bandbooster.uz/register',
  },
  openGraph: {
    title: 'Register for Free - BandBooster AI IELTS Preparation',
    description: 'Create your free account and start your IELTS preparation with AI-powered mock tests and feedback.',
    url: 'https://bandbooster.uz/register',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WebPageJsonLd 
        title="Register - BandBooster AI"
        description="Create your free BandBooster AI account and start preparing for IELTS with mock tests and AI feedback."
        url="https://bandbooster.uz/register"
      />
      {children}
    </>
  );
}
