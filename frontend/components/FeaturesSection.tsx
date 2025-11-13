interface Feature {
  title: string;
  description: string;
  icon: string;
}

const features: Feature[] = [
  {
    title: 'Authentic Mock Tests',
    description: 'Practice with tests that mirror the actual IELTS exam format, timing, and difficulty level for optimal preparation.',
    icon: '📝',
  },
  {
    title: 'Instant AI Feedback',
    description: 'Receive immediate, detailed AI-powered analysis and explanations for every question you answer.',
    icon: '⚡',
  },
  {
    title: 'Progress Analytics',
    description: 'Track your performance over time with comprehensive analytics, insights, and personalized recommendations.',
    icon: '📊',
  },
  {
    title: 'All Four Sections',
    description: 'Master Listening, Reading, Writing, and Speaking with dedicated practice modules and resources.',
    icon: '🎯',
  },
  {
    title: 'Expert Evaluation',
    description: 'Get professional feedback from certified IELTS instructors on your writing and speaking performances.',
    icon: '👨‍🏫',
  },
  {
    title: '24/7 Accessibility',
    description: 'Study anytime, anywhere with our cloud-based platform. Learn at your own pace and schedule.',
    icon: '⏰',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10"></div>
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center space-y-6 mb-20">
          <div className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
            Features
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
            Everything You Need
            <span className="block text-blue-600 dark:text-blue-400 mt-2">to Succeed</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Our comprehensive platform provides all the tools and resources you need to achieve your target IELTS score.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
