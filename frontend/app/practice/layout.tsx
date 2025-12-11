import { Metadata } from 'next';
import { PracticeClientLayout } from './ClientLayout';
import { WebPageJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'IELTS Practice Tests - Listening, Reading, Writing & Speaking',
  description: 'Practice all four IELTS sections with authentic mock tests. Improve your Listening, Reading, Writing, and Speaking skills with AI-powered feedback and detailed explanations.',
  keywords: [
    'IELTS practice tests',
    'IELTS listening practice',
    'IELTS reading practice',
    'IELTS writing practice',
    'IELTS speaking practice',
    'free IELTS mock test',
    'IELTS band score practice',
  ],
  alternates: {
    canonical: 'https://bandbooster.uz/practice',
  },
  openGraph: {
    title: 'Free IELTS Practice Tests - All Four Sections',
    description: 'Practice IELTS Listening, Reading, Writing, and Speaking with authentic tests and AI-powered feedback.',
    url: 'https://bandbooster.uz/practice',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const breadcrumbs = [
  { name: 'Home', url: 'https://bandbooster.uz' },
  { name: 'Practice', url: 'https://bandbooster.uz/practice' },
];

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <WebPageJsonLd 
        title="IELTS Practice Tests"
        description="Practice all four IELTS sections with authentic mock tests and AI-powered feedback."
        url="https://bandbooster.uz/practice"
      />
      <PracticeClientLayout>
        {children}
      </PracticeClientLayout>
    </>
  );
}
