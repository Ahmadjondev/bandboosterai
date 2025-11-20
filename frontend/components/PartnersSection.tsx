'use client';

interface Partner {
  name: string;
  logo: string;
  description: string;
}

const partners: Partner[] = [
  {
    name: 'British Council',
    logo: '🇬🇧',
    description: 'Official IELTS partner'
  },
  {
    name: 'Cambridge Assessment',
    logo: '🎓',
    description: 'Exam authority partner'
  },
  {
    name: 'IDP Education',
    logo: '🌏',
    description: 'Global education partner'
  },
  {
    name: 'University Partners',
    logo: '🏛️',
    description: '50+ universities worldwide'
  },
  {
    name: 'Language Schools',
    logo: '📚',
    description: '100+ certified schools'
  },
  {
    name: 'Education Consultants',
    logo: '💼',
    description: 'Trusted by 200+ consultants'
  }
];

export function PartnersSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
            Our Partners
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            Trusted by Leading
            <span className="block text-blue-600 dark:text-blue-400 mt-2">Education Institutions</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            We collaborate with world-renowned organizations to provide you with the best IELTS preparation experience.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {partners.map((partner, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {partner.logo}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white text-center mb-1">
                {partner.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                {partner.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">ISO Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Verified by Students</span>
          </div>
        </div>
      </div>
    </section>
  );
}
