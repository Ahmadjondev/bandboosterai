'use client';

interface Stat {
  value: string;
  label: string;
  icon: string;
  color: string;
}

const stats: Stat[] = [
  {
    value: '10,000+',
    label: 'Active Students Worldwide',
    icon: '👥',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: '50,000+',
    label: 'Mock Tests Completed',
    icon: '📝',
    color: 'from-purple-500 to-pink-500'
  },
  {
    value: '95%',
    label: 'Student Success Rate',
    icon: '🎯',
    color: 'from-green-500 to-emerald-500'
  },
  {
    value: '4.9/5',
    label: 'Average Student Rating',
    icon: '⭐',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    value: '150+',
    label: 'Countries Represented',
    icon: '🌍',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    value: '24/7',
    label: 'Available Support',
    icon: '⏰',
    color: 'from-red-500 to-pink-500'
  },
  {
    value: '1000+',
    label: 'Practice Questions',
    icon: '📚',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    value: '100+',
    label: 'Expert Instructors',
    icon: '👨‍🏫',
    color: 'from-violet-500 to-purple-500'
  }
];

export function StatsSection() {
  return (
    <section className="py-24 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold">
            Our Impact
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Trusted by Students
            <span className="block bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mt-2">
              Around the Globe
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2"
            >
              <div className={`absolute inset-0 bg-linear-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
              
              <div className="relative text-center space-y-3">
                <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className={`text-4xl md:text-5xl font-bold bg-linear-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-slate-300">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
