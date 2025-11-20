'use client';

import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
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
  {
    question: 'Can I access the platform on mobile devices?',
    answer: 'Yes! BandBooster is fully responsive and works seamlessly on all devices including smartphones, tablets, and desktops. Study anytime, anywhere with our mobile-friendly interface.'
  },
  {
    question: 'What if I\'m not satisfied with the platform?',
    answer: 'We offer a 30-day money-back guarantee for premium subscriptions. If you\'re not completely satisfied with our platform, contact our support team for a full refund within the first 30 days.'
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-32 bg-white dark:bg-slate-900 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold">
            FAQ
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
            Frequently Asked
            <span className="block text-blue-600 dark:text-blue-400 mt-2">Questions</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
            Find answers to common questions about BandBooster and IELTS preparation.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-500"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-lg font-semibold text-slate-900 dark:text-white pr-8">
                  {faq.question}
                </span>
                <svg
                  className={`w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="p-6 pt-0 bg-white dark:bg-slate-800">
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center p-8 bg-linear-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl">
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:bandboosterai@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
