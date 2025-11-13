/**
 * Student Detail Component
 */

window.StudentDetail = {
  name: 'StudentDetail',
  mixins: [window.FeatherIconsMixin],
  props: {
    userId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      student: null,
      results: [],
      error: null,
    };
  },
  template: `
    <div class="px-4 sm:px-6 lg:px-8 py-8">
      <button @click="$emit('navigate', 'students')" class="mb-4 text-orange-600 hover:text-orange-800">
        <i data-feather="arrow-left" class="inline h-4 w-4"></i> Back to Students
      </button>

      <loading-spinner v-if="loading" size="large" />

      <div v-else-if="error" class="text-center text-red-600">
        <p>{{ error }}</p>
      </div>

      <div v-else>
        <!-- Student Info -->
        <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Student Information</h3>
          </div>
          <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl class="sm:divide-y sm:divide-gray-200">
              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Full name</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {{ student.first_name }} {{ student.last_name }}
                </dd>
              </div>
              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Email</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ student.email }}</dd>
              </div>
              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Phone</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{{ student.phone || 'N/A' }}</dd>
              </div>
              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Status</dt>
                <dd class="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  <span :class="student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="inline-flex rounded-full px-2 py-1 text-xs font-semibold">
                    {{ student.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Results -->
        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Exam Results</h3>
          </div>
          <div class="border-t border-gray-200">
            <ul class="divide-y divide-gray-200">
              <li v-for="result in results" :key="result.id" class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ result.exam_title }}</p>
                    <p class="text-sm text-gray-500">Completed: {{ formatDate(result.completed_at) }}</p>
                  </div>
                  <div class="text-right">
                    <p :class="getBandScoreColor(result.overall_band_score)" class="text-xl font-bold">
                      Band {{ formatScore(result.overall_band_score) }}
                    </p>
                  </div>
                </div>
              </li>
              <li v-if="results.length === 0" class="px-4 py-8 text-center text-gray-500">
                No exam results yet
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    async loadStudentDetail() {
      try {
        this.loading = true;
        this.error = null;
        console.log('Loading student detail for userId:', this.userId);
        const data = await API.getStudentDetail(this.userId);
        this.student = data.student;
        this.results = data.results;
      } catch (error) {
        toast.error('Error loading student detail:', 'Error');
        this.error = error.message || 'Failed to load student details';
      } finally {
        this.loading = false;
      }
    },
    formatDate(date) {
      return Helpers.formatDate(date);
    },
    formatScore(score) {
      // Format IELTS band scores to always show one decimal place (e.g., 3.0, 7.5)
      if (score === null || score === undefined || score === '-') return '-';
      return Number(score).toFixed(1);
    },
    getBandScoreColor(score) {
      return Helpers.getBandScoreColor(score);
    },
  },
  mounted() {
    this.loadStudentDetail();
  },
};
