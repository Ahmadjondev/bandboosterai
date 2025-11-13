/**
 * Enhanced Dashboard Component with Advanced Analytics
 */

window.Dashboard = {
  name: 'Dashboard',
  data() {
    return {
      loading: true,
      stats: null,
      error: null,
      selectedTimeframe: '30d', // 7d, 30d, all
      refreshing: false,
    };
  },
  computed: {
    studentGrowthPercentage() {
      if (!this.stats || this.stats.total_students === 0) return 0;
      return ((this.stats.new_students_this_month / this.stats.total_students) * 100).toFixed(1);
    },
    completionTrend() {
      if (!this.stats) return 'stable';
      const rate = this.stats.completion_rate;
      if (rate >= 80) return 'excellent';
      if (rate >= 60) return 'good';
      if (rate >= 40) return 'average';
      return 'needs-improvement';
    }
  },
  template: `
    <div class="px-4 sm:px-6 lg:px-8 py-6">
      <!-- Header with Refresh -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p class="mt-1 text-sm text-gray-600">
            Real-time overview of your IELTS management system
          </p>
        </div>
        <button 
          @click="refreshDashboard"
          :disabled="refreshing"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <i :data-feather="refreshing ? 'loader' : 'refresh-cw'" :class="{'animate-spin': refreshing}" class="h-4 w-4 mr-2"></i>
          {{ refreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <loading-spinner v-if="loading" size="large" />

      <alert-component v-else-if="error" type="error" :message="error" />

      <div v-else>
        <!-- Key Metrics Grid -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <!-- Total Students -->
          <div class="bg-gradient-to-br from-orange-500 to-orange-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
            <div class="p-6">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0">
                  <div class="p-3 bg-orange-400 bg-opacity-40 rounded-lg">
                    <i data-feather="users" class="h-8 w-8 text-white"></i>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-orange-100">Total Students</p>
                  <p class="mt-1 text-4xl font-bold text-white">{{ stats.total_students }}</p>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between text-sm">
                <span class="text-orange-100">
                  <i data-feather="check-circle" class="h-4 w-4 inline mr-1"></i>
                  {{ stats.active_students }} active
                </span>
                <span v-if="stats.new_students_this_week > 0" class="text-orange-100 font-medium">
                  +{{ stats.new_students_this_week }} this week
                </span>
              </div>
            </div>
          </div>

          <!-- Mock Exams -->
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
            <div class="p-6">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0">
                  <div class="p-3 bg-purple-400 bg-opacity-40 rounded-lg">
                    <i data-feather="clipboard" class="h-8 w-8 text-white"></i>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-purple-100">Mock Exams</p>
                  <p class="mt-1 text-4xl font-bold text-white">{{ stats.total_mock_exams }}</p>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between text-sm">
                <span class="text-purple-100">
                  <i data-feather="zap" class="h-4 w-4 inline mr-1"></i>
                  {{ stats.active_mock_exams }} active
                </span>
                <span v-if="stats.upcoming_exams > 0" class="text-purple-100 font-medium">
                  {{ stats.upcoming_exams }} upcoming
                </span>
              </div>
            </div>
          </div>

          <!-- Completed Tests -->
          <div class="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
            <div class="p-6">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0">
                  <div class="p-3 bg-green-400 bg-opacity-40 rounded-lg">
                    <i data-feather="check-square" class="h-8 w-8 text-white"></i>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-green-100">Completed Tests</p>
                  <p class="mt-1 text-4xl font-bold text-white">{{ stats.total_results }}</p>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between text-sm">
                <span class="text-green-100">
                  <i data-feather="trending-up" class="h-4 w-4 inline mr-1"></i>
                  {{ stats.results_this_month }} this month
                </span>
                <span class="text-green-100 font-medium">
                  {{ stats.completion_rate.toFixed(1) }}% rate
                </span>
              </div>
            </div>
          </div>

          <!-- Average Band Score -->
          <div class="bg-gradient-to-br from-orange-500 to-orange-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-transform duration-200">
            <div class="p-6">
              <div class="flex items-center justify-between">
                <div class="flex-shrink-0">
                  <div class="p-3 bg-orange-400 bg-opacity-40 rounded-lg">
                    <i data-feather="award" class="h-8 w-8 text-white"></i>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-orange-100">Average Band</p>
                  <p class="mt-1 text-4xl font-bold text-white">{{ stats.average_score }}</p>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between text-sm">
                <span class="text-orange-100">
                  <i data-feather="target" class="h-4 w-4 inline mr-1"></i>
                  Overall average
                </span>
                <span class="text-orange-100 font-medium">
                  {{ stats.engagement_rate.toFixed(0) }}% engaged
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts & Analytics Section -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- Performance Trend Chart -->
          <div class="lg:col-span-2 bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="trending-up" class="h-5 w-5 mr-2 text-orange-500"></i>
                Performance Trend (Last 5 Weeks)
              </h3>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                <div v-for="week in stats.performance_trend" :key="week.week" class="relative">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">{{ week.week }} ({{ week.date }})</span>
                    <div class="flex items-center space-x-3">
                      <span class="text-xs text-gray-500">{{ week.count }} tests</span>
                      <span class="text-sm font-bold text-gray-900">Band {{ week.average_score }}</span>
                    </div>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      :style="{width: (week.average_score / 9 * 100) + '%'}"
                      :class="getScoreBarColor(week.average_score)"
                      class="h-3 rounded-full transition-all duration-500 ease-out"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Score Distribution -->
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="pie-chart" class="h-5 w-5 mr-2 text-purple-500"></i>
                Score Distribution
              </h3>
            </div>
            <div class="p-6">
              <div class="space-y-3">
                <div v-for="(count, band) in stats.score_distribution" :key="band" class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <div :class="getDistributionColor(band)" class="w-3 h-3 rounded-full"></div>
                    <span class="text-sm font-medium text-gray-700">Band {{ band }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-500">{{ count }}</span>
                    <div class="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        :style="{width: getPercentage(count, stats.total_results) + '%'}"
                        :class="getDistributionColor(band)"
                        class="h-2 rounded-full"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Performance Grid -->
        <div class="mb-8">
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="bar-chart-2" class="h-5 w-5 mr-2 text-green-500"></i>
                Section-wise Performance
              </h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="section in stats.section_performance" :key="section.section" 
                     class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-semibold text-gray-700">{{ section.section }}</h4>
                    <i :data-feather="getSectionIcon(section.section)" :class="'text-' + section.color + '-500'" class="h-5 w-5"></i>
                  </div>
                  <p class="text-3xl font-bold text-gray-900 mb-1">{{ section.average }}</p>
                  <p class="text-xs text-gray-500">{{ section.total_tests }} tests completed</p>
                  <div class="mt-3 w-full bg-gray-300 rounded-full h-2">
                    <div 
                      :style="{width: (section.average / 9 * 100) + '%'}"
                      :class="'bg-' + section.color + '-500'"
                      class="h-2 rounded-full"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Library Overview -->
        <div class="mb-8">
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="folder" class="h-5 w-5 mr-2 text-orange-500"></i>
                Content Library
              </h3>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <i data-feather="book-open" class="h-8 w-8 mx-auto text-orange-500 mb-2"></i>
                  <p class="text-2xl font-bold text-gray-900">{{ stats.total_reading_passages }}</p>
                  <p class="text-xs text-gray-600">Reading Passages</p>
                </div>
                <div class="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <i data-feather="headphones" class="h-8 w-8 mx-auto text-green-500 mb-2"></i>
                  <p class="text-2xl font-bold text-gray-900">{{ stats.total_listening_parts }}</p>
                  <p class="text-xs text-gray-600">Listening Parts</p>
                </div>
                <div class="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <i data-feather="edit-3" class="h-8 w-8 mx-auto text-purple-500 mb-2"></i>
                  <p class="text-2xl font-bold text-gray-900">{{ stats.total_writing_tasks }}</p>
                  <p class="text-xs text-gray-600">Writing Tasks</p>
                </div>
                <div class="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <i data-feather="mic" class="h-8 w-8 mx-auto text-orange-500 mb-2"></i>
                  <p class="text-2xl font-bold text-gray-900">{{ stats.total_speaking_topics }}</p>
                  <p class="text-xs text-gray-600">Speaking Topics</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity & Top Performers -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Top Performers -->
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="trophy" class="h-5 w-5 mr-2 text-yellow-500"></i>
                Top Performers (30 Days)
              </h3>
            </div>
            <ul class="divide-y divide-gray-200">
              <li v-for="(performer, index) in stats.top_performers" :key="performer.id" 
                  class="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div class="flex items-center space-x-3">
                  <div :class="getRankBadgeColor(index)" class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    {{ index + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ performer.name }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ performer.email }}</p>
                  </div>
                  <div class="text-right">
                    <p :class="getBandScoreColor(performer.score)" class="text-lg font-bold">
                      {{ performer.score }}
                    </p>
                    <p class="text-xs text-gray-400">{{ formatDate(performer.date) }}</p>
                  </div>
                </div>
              </li>
              <li v-if="!stats.top_performers || stats.top_performers.length === 0" 
                  class="px-6 py-8 text-center text-gray-500">
                <i data-feather="award" class="h-8 w-8 mx-auto text-gray-300 mb-2"></i>
                <p class="text-sm">No results yet</p>
              </li>
            </ul>
          </div>

          <!-- Recent Students -->
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="user-plus" class="h-5 w-5 mr-2 text-orange-500"></i>
                Recent Students
              </h3>
            </div>
            <ul class="divide-y divide-gray-200">
              <li v-for="student in stats.recent_students" :key="student.id" 
                  class="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  @click="$emit('navigate', 'student-detail', {userId: student.id})">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span class="text-sm font-medium text-white">
                        {{ getInitials(student.first_name, student.last_name) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ student.first_name }} {{ student.last_name }}
                    </p>
                    <p class="text-xs text-gray-500 truncate">{{ student.email }}</p>
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ formatDate(student.date_joined) }}
                  </div>
                </div>
              </li>
              <li v-if="!stats.recent_students || stats.recent_students.length === 0" 
                  class="px-6 py-8 text-center text-gray-500">
                <p class="text-sm">No recent students</p>
              </li>
            </ul>
          </div>

          <!-- Recent Results -->
          <div class="bg-white shadow-lg rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                <i data-feather="activity" class="h-5 w-5 mr-2 text-green-500"></i>
                Recent Results
              </h3>
            </div>
            <ul class="divide-y divide-gray-200">
              <li v-for="result in stats.recent_results" :key="result.id" 
                  class="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0 mr-3">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ result.student_name }}
                    </p>
                    <p class="text-xs text-gray-500 truncate">{{ result.exam_title || 'Mock Exam' }}</p>
                  </div>
                  <div class="text-right">
                    <p :class="getBandScoreColor(result.overall_band_score)" class="text-base font-bold">
                      {{ result.overall_band_score }}
                    </p>
                    <p class="text-xs text-gray-400">{{ formatDate(result.completed_at) }}</p>
                  </div>
                </div>
              </li>
              <li v-if="!stats.recent_results || stats.recent_results.length === 0" 
                  class="px-6 py-8 text-center text-gray-500">
                <p class="text-sm">No recent results</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    async loadDashboardStats() {
      try {
        this.loading = true;
        this.error = null;
        this.stats = await API.getDashboardStats();
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Check if error is authentication related - don't show error in this case
        if (error.message === 'Authentication required' || error.message === 'Redirecting to login') {
          // Don't set error state or show toast, redirect is happening
          return;
        }
        this.error = error.message || 'Failed to load dashboard statistics';
        // Only show toast for non-auth errors
        if (typeof toast !== 'undefined') {
          toast.error('Failed to load dashboard data', 'Error');
        }
      } finally {
        this.loading = false;
      }
    },

    async refreshDashboard() {
      this.refreshing = true;
      await this.loadDashboardStats();
      this.refreshing = false;
    },

    getInitials(firstName, lastName) {
      const first = firstName ? firstName.charAt(0).toUpperCase() : '';
      const last = lastName ? lastName.charAt(0).toUpperCase() : '';
      return first + last || 'U';
    },

    formatDate(dateString) {
      return Helpers.formatRelativeTime(dateString);
    },

    getBandScoreColor(score) {
      return Helpers.getBandScoreColor(score);
    },

    getScoreBarColor(score) {
      if (score >= 8) return 'bg-gradient-to-r from-green-500 to-green-600';
      if (score >= 7) return 'bg-gradient-to-r from-orange-500 to-orange-600';
      if (score >= 6) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      if (score >= 5) return 'bg-gradient-to-r from-orange-500 to-orange-600';
      return 'bg-gradient-to-r from-red-500 to-red-600';
    },

    getDistributionColor(band) {
      if (band === '9.0') return 'bg-emerald-500';
      if (band === '8.0-8.5') return 'bg-green-500';
      if (band === '7.0-7.5') return 'bg-orange-500';
      if (band === '6.0-6.5') return 'bg-yellow-500';
      if (band === '5.0-5.5') return 'bg-orange-500';
      return 'bg-red-500';
    },

    getRankBadgeColor(index) {
      if (index === 0) return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white';
      if (index === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700';
      if (index === 2) return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white';
      return 'bg-gray-200 text-gray-600';
    },

    getPercentage(count, total) {
      if (total === 0) return 0;
      return Math.round((count / total) * 100);
    },

    getSectionIcon(section) {
      const icons = {
        'Listening': 'headphones',
        'Reading': 'book-open',
        'Writing': 'edit-3',
        'Speaking': 'mic'
      };
      return icons[section] || 'activity';
    }
  },
  mounted() {
    this.loadDashboardStats();
    this.$nextTick(() => {
      if (window.feather) {
        feather.replace();
      }
    });
  },
  updated() {
    this.$nextTick(() => {
      if (window.feather) {
        feather.replace();
      }
    });
  },
};
