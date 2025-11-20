'use client';

interface Step {
  number: string;
  title: string;
  description: string;
  icon: string;
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Sign Up & Get Started',
    description: 'Create your free account in seconds and get immediate access to our comprehensive IELTS preparation platform.',
    icon: '🚀'
  },
  {
    number: '02',
    title: 'Take Diagnostic Test',
    description: 'Complete our AI-powered diagnostic assessment to identify your current level and areas for improvement.',
    icon: '📊'
  },
  {
    number: '03',
    title: 'Follow Personalized Plan',
    description: 'Get a customized study plan tailored to your target score, timeline, and learning style preferences.',
    icon: '🎯'
  },
  {
    number: '04',
    title: 'Practice & Improve',
    description: 'Access thousands of practice questions, mock tests, and receive instant AI feedback on your performance.',
    icon: '💪'
  },
  {
    number: '05',
    title: 'Get Expert Review',
    description: 'Submit your writing and speaking tasks for detailed evaluation by certified IELTS instructors.',
    icon: '👨‍🏫'
  },
  {
    number: '06',
    title: 'Achieve Your Goal',
    description: 'Track your progress, master all sections, and confidently achieve your target IELTS band score.',
    icon: '🏆'
  }
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-32 bg-white dark:bg-slate-900 relative overflow-hidden scroll-mt-20">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center space-y-6 mb-20">
          <div className="inline-block px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold">
            How It Works
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
            Your Journey to
            <span className="block bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
              IELTS Success
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Follow our proven 6-step process designed by IELTS experts to help you achieve your target score efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative"
            >
              {/* Connection line (hidden on mobile, shown on larger screens) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-linear-to-r from-blue-200 via-purple-200 to-transparent dark:from-blue-800 dark:via-purple-800 -z-10"></div>
              )}
              
              <div className="relative p-8 rounded-3xl bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 h-full">
                {/* Step number badge */}
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {step.number}
                </div>

                <div className="space-y-4">
                  <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA at the bottom */}
        <div className="mt-16 text-center">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
            Ready to start your journey?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="px-8 py-4 rounded-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Get Started Free
            </a>
            <a
              href="#features"
              className="px-8 py-4 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 text-slate-700 dark:text-slate-300 font-semibold transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
