/**
 * JSON-LD Structured Data Components for SEO
 * 
 * These components add structured data that helps search engines
 * understand the content better and can enable rich snippets.
 */

const siteUrl = 'https://bandbooster.uz';
const siteName = 'BandBooster AI';

export interface JsonLdProps {
  type: 'Organization' | 'WebSite' | 'FAQPage' | 'Course' | 'WebPage' | 'BreadcrumbList';
}

/**
 * Organization Schema
 * Helps establish brand identity in search results
 */
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    alternateName: 'BandBooster',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: 'AI-powered IELTS preparation platform offering mock tests, practice exercises, and personalized feedback.',
    foundingDate: '2024',
    sameAs: [
      'https://t.me/bandbooster',
      // Add social media links here
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['English', 'Uzbek', 'Russian'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'UZ',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebSite Schema with SearchAction
 * Enables sitelinks searchbox in Google
 */
export function WebSiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    description: 'Comprehensive IELTS preparation platform with AI-powered mock tests and practice exercises.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Course Schema for IELTS Preparation
 * Shows course information in search results
 */
export function CourseJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: 'IELTS Preparation Course',
    description: 'Complete IELTS preparation with practice tests for Listening, Reading, Writing, and Speaking sections. Get AI-powered feedback and track your progress.',
    provider: {
      '@type': 'Organization',
      name: siteName,
      url: siteUrl,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Free',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT40H', // 40 hours estimated
      inLanguage: 'en',
    },
    educationalLevel: 'Intermediate',
    teaches: [
      'IELTS Listening skills',
      'IELTS Reading comprehension',
      'IELTS Academic Writing',
      'IELTS Speaking fluency',
      'Time management for IELTS',
    ],
    about: {
      '@type': 'Thing',
      name: 'IELTS',
      description: 'International English Language Testing System',
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      audienceType: 'IELTS test takers',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * FAQ Schema
 * Creates rich FAQ snippets in search results
 */
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Breadcrumb Schema
 * Shows breadcrumb navigation in search results
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebPage Schema
 * General page information
 */
interface WebPageProps {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}

export function WebPageJsonLd({ title, description, url, datePublished, dateModified }: WebPageProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    inLanguage: 'en-US',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Software Application Schema
 * For highlighting the app features
 */
export function SoftwareApplicationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteName,
    operatingSystem: 'Web Browser',
    applicationCategory: 'EducationalApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI-powered IELTS mock tests',
      'Instant feedback on all sections',
      'Progress tracking',
      'Listening practice with audio',
      'Reading comprehension exercises',
      'Writing task evaluation',
      'Speaking practice with AI',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Default IELTS FAQ data
 */
export const defaultIELTSFAQs: FAQItem[] = [
  {
    question: 'What is IELTS?',
    answer: 'IELTS (International English Language Testing System) is an internationally recognized English language proficiency test for non-native English speakers. It assesses listening, reading, writing, and speaking skills.',
  },
  {
    question: 'How can BandBooster help me prepare for IELTS?',
    answer: 'BandBooster AI offers comprehensive IELTS preparation with authentic mock tests, AI-powered feedback on your writing and speaking, progress tracking, and practice exercises for all four sections: Listening, Reading, Writing, and Speaking.',
  },
  {
    question: 'Is BandBooster free to use?',
    answer: 'Yes, BandBooster offers free practice tests and exercises. We also have premium features for more intensive preparation with additional mock tests and detailed feedback.',
  },
  {
    question: 'How accurate is the AI scoring?',
    answer: 'Our AI scoring system is trained on official IELTS scoring criteria and provides feedback aligned with IELTS band descriptors. While it provides excellent practice, we recommend also getting feedback from certified IELTS instructors for final preparation.',
  },
  {
    question: 'Can I practice all IELTS sections on BandBooster?',
    answer: 'Yes, BandBooster provides practice materials and mock tests for all four IELTS sections: Listening, Reading, Writing, and Speaking. Each section includes authentic test-style questions.',
  },
  {
    question: 'How long does it take to prepare for IELTS?',
    answer: 'The preparation time varies based on your current English level and target band score. Typically, students need 4-12 weeks of consistent practice. BandBooster helps you track your progress and identifies areas that need more focus.',
  },
];
