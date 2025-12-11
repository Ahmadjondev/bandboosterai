import { Metadata } from 'next';
import { 
  OrganizationJsonLd, 
  WebSiteJsonLd, 
  CourseJsonLd, 
  FAQJsonLd,
  SoftwareApplicationJsonLd 
} from '@/components/seo/JsonLd';
import { LandingPageContent } from '@/components/LandingPageContent';

export const metadata: Metadata = {
  title: 'BandBooster AI - Free IELTS Mock Tests & AI-Powered Preparation',
  description: 'Prepare for IELTS with AI-powered mock tests and instant feedback. Practice Listening, Reading, Writing, and Speaking sections. Free practice tests available. Achieve your target band score!',
  keywords: [
    'IELTS mock test',
    'IELTS practice test free',
    'IELTS preparation online',
    'IELTS speaking practice',
    'IELTS writing evaluation',
    'IELTS listening test',
    'IELTS reading practice',
    'AI IELTS preparation',
    'free IELTS test',
    'IELTS band score calculator',
    'IELTS exam preparation',
    'IELTS Uzbekistan',
  ],
  alternates: {
    canonical: 'https://bandbooster.uz',
  },
  openGraph: {
    title: 'BandBooster AI - Free IELTS Mock Tests & AI-Powered Preparation',
    description: 'Prepare for IELTS with AI-powered mock tests and instant feedback. Practice all four sections and achieve your target band score!',
    url: 'https://bandbooster.uz',
    type: 'website',
  },
};

// FAQ data for JSON-LD structured data
const homeFAQs = [
  {
    question: 'How is BandBooster different from other IELTS platforms?',
    answer: 'BandBooster combines AI-powered instant feedback with expert human evaluation, giving you the best of both worlds. Our platform offers authentic mock tests, personalized study plans, and 24/7 accessibility at an affordable price.'
  },
  {
    question: 'Can I really improve my IELTS score using this platform?',
    answer: 'Absolutely! Our students have an average improvement of 1.5 bands, with 95% achieving their target scores. Our proven methodology, expert feedback, and comprehensive practice materials are designed specifically to help you succeed.'
  },
  {
    question: 'How accurate is the AI scoring system?',
    answer: 'Our AI scoring system has been trained on thousands of IELTS responses and validated against official IELTS scoring criteria. It provides immediate, accurate feedback that closely matches human evaluator scores, with a margin of error of less than 0.5 bands.'
  },
  {
    question: 'Do you offer speaking practice with real evaluators?',
    answer: 'Yes! In addition to AI-powered speaking practice available 24/7, you can schedule sessions with certified IELTS instructors for personalized feedback and evaluation on your speaking performance.'
  },
  {
    question: 'What is included in the free plan?',
    answer: 'The free plan includes access to diagnostic tests, limited practice questions, basic AI feedback, and progress tracking. Upgrade to premium for unlimited mock tests, expert evaluations, and personalized study plans.'
  },
  {
    question: 'How long should I prepare for IELTS using your platform?',
    answer: 'Preparation time varies based on your current level and target score. Most students see significant improvement within 2-3 months of consistent practice. Our personalized study plans are tailored to your specific timeline and goals.'
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <CourseJsonLd />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd faqs={homeFAQs} />
      
      {/* Page Content */}
      <LandingPageContent />
    </>
  );
}
