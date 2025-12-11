import { Metadata } from 'next';
import { WebPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Login - Access Your IELTS Practice Account',
  description: 'Log in to your BandBooster AI account to continue your IELTS preparation journey. Access mock tests, track progress, and improve your band score.',
  keywords: ['IELTS login', 'BandBooster login', 'IELTS practice account'],
  alternates: {
    canonical: 'https://bandbooster.uz/login',
  },
  openGraph: {
    title: 'Login to BandBooster AI - IELTS Preparation',
    description: 'Access your IELTS practice account and continue your preparation journey.',
    url: 'https://bandbooster.uz/login',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WebPageJsonLd 
        title="Login - BandBooster AI"
        description="Log in to your BandBooster AI account to continue your IELTS preparation."
        url="https://bandbooster.uz/login"
      />
      {children}
    </>
  );
}
