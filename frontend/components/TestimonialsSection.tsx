'use client';

interface Testimonial {
  name: string;
  role: string;
  country: string;
  score: string;
  improvement: string;
  comment: string;
  avatar: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah Johnson',
    role: 'Medical Student',
    country: '🇺🇸',
    score: 'Band 8.5',
    improvement: '+2.0 improvement',
    comment: 'BandBooster transformed my IELTS preparation! The AI feedback was incredibly detailed and helped me improve my writing score from 6.5 to 8.5 in just 3 months.',
    avatar: '👩‍⚕️',
    rating: 5
  },
  {
    name: 'Ahmed Hassan',
    role: 'Engineer',
    country: '🇪🇬',
    score: 'Band 8.0',
    improvement: '+1.5 improvement',
    comment: 'The mock tests are exactly like the real exam. I practiced speaking with the AI evaluator every day and got my desired score on the first attempt!',
    avatar: '👨‍💼',
    rating: 5
  },
  {
    name: 'Maria Garcia',
    role: 'MBA Applicant',
    country: '🇪🇸',
    score: 'Band 7.5',
    improvement: '+1.0 improvement',
    comment: 'The personalized study plan and progress tracking kept me motivated throughout my preparation. Highly recommend to anyone serious about IELTS!',
    avatar: '👩‍🎓',
    rating: 5
  },
  {
    name: 'Li Wei',
    role: 'Software Developer',
    country: '🇨🇳',
    score: 'Band 8.0',
    improvement: '+2.5 improvement',
    comment: 'As a working professional, I needed flexible study hours. BandBooster\'s 24/7 access and instant feedback made it perfect for my schedule.',
    avatar: '👨‍💻',
    rating: 5
  },
  {
    name: 'Priya Patel',
    role: 'Nurse',
    country: '🇮🇳',
    score: 'Band 7.5',
    improvement: '+1.5 improvement',
    comment: 'The reading and listening materials are authentic and challenging. The explanations helped me understand my mistakes and avoid them in the actual test.',
    avatar: '👩‍⚕️',
    rating: 5
  },
  {
    name: 'João Silva',
    role: 'Business Analyst',
    country: '🇧🇷',
    score: 'Band 8.5',
    improvement: '+2.0 improvement',
    comment: 'Expert evaluations on my writing tasks were game-changing. The detailed feedback from certified instructors helped me master complex essay structures.',
    avatar: '👨‍💼',
    rating: 5
  }
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-32 bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 relative overflow-hidden scroll-mt-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center space-y-6 mb-20">
          <div className="inline-block px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold">
            Success Stories
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
            What Our Students
            <span className="block text-blue-600 dark:text-blue-400 mt-2">Are Saying</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Join thousands of successful students who achieved their target IELTS scores with BandBooster.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
            >
              {/* Rating stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>

              {/* Comment */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 italic">
                "{testimonial.comment}"
              </p>

              {/* Author info */}
              <div className="flex items-center gap-4">
                <div className="text-4xl">{testimonial.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{testimonial.name}</h4>
                    <span className="text-lg">{testimonial.country}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{testimonial.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                      {testimonial.score}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {testimonial.improvement}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified badge */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2">1K+</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Happy Students</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2">4.9/5</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2">95%</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2">5K+</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Tests Completed</div>
          </div>
        </div>
      </div>
    </section>
  );
}
