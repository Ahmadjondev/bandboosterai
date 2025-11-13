/**
 * Mock Test Details Component
 * Comprehensive details view for a single mock test
 * Adapted from BandBooster
 */

window.MockTestDetails = {
  name: 'MockTestDetails',
  mixins: [window.FeatherIconsMixin],
  props: {
    testId: {
      type: [Number, String],
      required: true,
    },
  },

  data() {
    return {
      loading: true,
      error: null,
      test: null,
      statistics: null,
      recentAttempts: [],
      showDeleteConfirm: false,
      Helpers: window.Helpers || {
        formatDate: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
        formatDateTime: (date) => date ? new Date(date).toLocaleString() : 'N/A',
        showToast: (msg, type) => {
          if (window.toast && window.toast[type]) {
            window.toast[type](msg);
          } else {
            console.log(`[${type}] ${msg}`);
          }
        }
      },
    };
  },

  computed: {
    totalQuestions() {
      if (!this.test) return 0;
      // This would need to be calculated based on actual question counts
      // For now, return 0 as placeholder
      return 0;
    },

    avgBandColor() {
      if (!this.statistics?.avg_overall_band) return 'text-gray-400';
      const band = this.statistics.avg_overall_band;
      if (band >= 7.0) return 'text-green-600';
      if (band >= 6.0) return 'text-orange-600';
      if (band >= 5.0) return 'text-amber-600';
      return 'text-red-600';
    },
  },

  async mounted() {
    await this.loadTest();
  },

  updated() {
    this.$nextTick(() => {
      if (this.initFeatherIcons) {
        this.initFeatherIcons();
      } else if (window.feather) {
        window.feather.replace();
      }
    });
  },

  methods: {
    async loadTest() {
      try {
        this.loading = true;
        this.error = null;

        const data = await managerAPI.getMockTest(this.testId);

        if (data.success) {
          this.test = data.test;
          this.statistics = data.statistics;
          this.recentAttempts = data.recent_attempts || [];
        }
      } catch (err) {
        this.error = this.handleAPIError(err);
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast(this.error, 'error');
        }
      } finally {
        this.loading = false;
      }
    },

    async toggleStatus() {
      try {
        const data = await managerAPI.toggleMockTestStatus(this.testId);
        if (data.success) {
          if (this.Helpers && this.Helpers.showToast) {
            this.Helpers.showToast(data.message, 'success');
          }
          await this.loadTest();
        }
      } catch (err) {
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast(this.handleAPIError(err), 'error');
        }
      }
    },

    confirmDelete() {
      this.showDeleteConfirm = true;
    },

    async handleDelete() {
      try {
        await managerAPI.deleteMockTest(this.testId);
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast('Mock test deleted successfully', 'success');
        }
        this.goBack();
      } catch (err) {
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast(this.handleAPIError(err), 'error');
        }
      }
    },

    cancelDelete() {
      this.showDeleteConfirm = false;
    },

    goBack() {
      this.$emit('navigate', 'mock-tests');
    },

    navigateToEdit() {
      this.$emit('navigate', 'edit-mock-test', { testId: this.testId });
    },

    getStatusBadge(isActive) {
      return isActive
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-800';
    },

    getTypeBadge(type) {
      const badges = {
        FULL_TEST: 'bg-purple-100 text-purple-800',
        READING: 'bg-orange-100 text-orange-800',
        LISTENING: 'bg-green-100 text-green-800',
        WRITING: 'bg-amber-100 text-amber-800',
        SPEAKING: 'bg-rose-100 text-rose-800',
      };
      return badges[type] || 'bg-gray-100 text-gray-800';
    },

    getBandScoreColor(band) {
      if (!band) return 'text-gray-400';
      if (band >= 7.0) return 'text-green-600';
      if (band >= 6.0) return 'text-orange-600';
      if (band >= 5.0) return 'text-amber-600';
      return 'text-red-600';
    },

    handleAPIError(err) {
      if (err.response?.data?.error) {
        return err.response.data.error;
      }
      return err.message || 'An error occurred';
    },
  },

  template: `
    <div class="space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <loading-spinner size="large" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {{ error }}
      </div>

      <!-- Test Details -->
      <div v-else-if="test">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center gap-3 mb-4">
            <button @click="goBack" class="p-2 hover:bg-gray-100 rounded-lg transition">
              <i data-feather="arrow-left" class="w-5 h-5 text-gray-600"></i>
            </button>
            <div class="flex-1">
              <div class="flex items-center gap-3 flex-wrap">
                <h2 class="text-2xl font-bold text-gray-900">{{ test.title }}</h2>
                <span
                  :class="getStatusBadge(test.is_active)"
                  class="px-3 py-1 text-xs font-semibold rounded-full"
                >
                  {{ test.is_active ? 'Active' : 'Inactive' }}
                </span>
                <span
                  :class="getTypeBadge(test.exam_type)"
                  class="px-3 py-1 text-xs font-semibold rounded-full"
                >
                  {{ test.exam_type_display }}
                </span>
              </div>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  <i data-feather="calendar" class="w-4 h-4"></i>
                  Created {{ Helpers.formatDateTime(test.created_at) }}
                </span>
                <span v-if="test.updated_at !== test.created_at" class="flex items-center gap-1">
                  <i data-feather="edit-3" class="w-4 h-4"></i>
                  Updated {{ Helpers.formatDateTime(test.updated_at) }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="navigateToEdit"
                class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                <i data-feather="edit-2" class="w-4 h-4"></i>
                Edit Test
              </button>
              <button
                @click="toggleStatus"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition"
                :class="test.is_active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'"
              >
                <i :data-feather="test.is_active ? 'x-circle' : 'check-circle'" class="w-4 h-4"></i>
                {{ test.is_active ? 'Deactivate' : 'Activate' }}
              </button>
              <button
                @click="confirmDelete"
                class="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition"
              >
                <i data-feather="trash-2" class="w-4 h-4"></i>
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="test.description" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <i data-feather="file-text" class="w-5 h-5 text-orange-600"></i>
            Description
          </h3>
          <p class="text-gray-700">{{ test.description }}</p>
        </div>

        <!-- Overview Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Duration</p>
                <p class="text-2xl font-bold text-gray-900 mt-1">{{ test.duration_minutes }}</p>
                <p class="text-xs text-gray-500 mt-0.5">minutes</p>
              </div>
              <div class="p-3 bg-orange-100 rounded-lg">
                <i data-feather="clock" class="w-6 h-6 text-orange-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Difficulty</p>
                <p class="text-lg font-bold text-gray-900 mt-1">{{ test.difficulty_display || 'N/A' }}</p>
              </div>
              <div class="p-3 bg-orange-100 rounded-lg">
                <i data-feather="bar-chart" class="w-6 h-6 text-orange-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Attempts</p>
                <p class="text-2xl font-bold text-gray-900 mt-1">{{ statistics?.total_attempts || 0 }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ statistics?.completed_attempts || 0 }} completed</p>
              </div>
              <div class="p-3 bg-green-100 rounded-lg">
                <i data-feather="users" class="w-6 h-6 text-green-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Avg Overall Score</p>
                <p class="text-2xl font-bold mt-1" :class="avgBandColor">
                  {{ statistics?.avg_overall_band || 'N/A' }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">from completed</p>
              </div>
              <div class="p-3 bg-purple-100 rounded-lg">
                <i data-feather="award" class="w-6 h-6 text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Section Scores -->
        <div v-if="statistics && statistics.avg_overall_band" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i data-feather="bar-chart-2" class="w-5 h-5 text-orange-600"></i>
            Average Scores by Section
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <i data-feather="book-open" class="w-5 h-5 mx-auto mb-2 text-orange-600"></i>
              <p class="text-sm font-medium text-gray-600 mb-1">Reading</p>
              <p class="text-2xl font-bold text-orange-600">{{ statistics.avg_reading_band || 'N/A' }}</p>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <i data-feather="headphones" class="w-5 h-5 mx-auto mb-2 text-green-600"></i>
              <p class="text-sm font-medium text-gray-600 mb-1">Listening</p>
              <p class="text-2xl font-bold text-green-600">{{ statistics.avg_listening_band || 'N/A' }}</p>
            </div>
            <div class="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <i data-feather="edit-3" class="w-5 h-5 mx-auto mb-2 text-amber-600"></i>
              <p class="text-sm font-medium text-gray-600 mb-1">Writing</p>
              <p class="text-2xl font-bold text-amber-600">{{ statistics.avg_writing_band || 'N/A' }}</p>
            </div>
            <div class="text-center p-4 bg-rose-50 rounded-lg border border-rose-200">
              <i data-feather="mic" class="w-5 h-5 mx-auto mb-2 text-rose-600"></i>
              <p class="text-sm font-medium text-gray-600 mb-1">Speaking</p>
              <p class="text-2xl font-bold text-rose-600">{{ statistics.avg_speaking_band || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Test Content Sections -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Reading Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-orange-100 rounded-lg">
                <i data-feather="book-open" class="w-5 h-5 text-orange-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Reading Section</h3>
                <p class="text-sm text-gray-600">{{ test.reading_passages?.length || 0 }} passages</p>
              </div>
            </div>
            <div v-if="test.reading_passages && test.reading_passages.length > 0" class="space-y-3">
              <div
                v-for="(passage, index) in test.reading_passages"
                :key="passage.id"
                class="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800">
                      Passage {{ index + 1 }}
                    </span>
                    <h4 class="font-medium text-gray-900 mt-2">{{ passage.title || 'Untitled' }}</h4>
                  </div>
                </div>
              </div>
            </div>
            <empty-state
              v-else
              icon="inbox"
              title="No reading passages"
              description=""
            />
          </div>

          <!-- Listening Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-green-100 rounded-lg">
                <i data-feather="headphones" class="w-5 h-5 text-green-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Listening Section</h3>
                <p class="text-sm text-gray-600">{{ test.listening_parts?.length || 0 }} parts</p>
              </div>
            </div>
            <div v-if="test.listening_parts && test.listening_parts.length > 0" class="space-y-3">
              <div
                v-for="(part, index) in test.listening_parts"
                :key="part.id"
                class="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800">
                      Part {{ index + 1 }}
                    </span>
                    <h4 class="font-medium text-gray-900 mt-2">{{ part.title || 'Untitled' }}</h4>
                  </div>
                </div>
              </div>
            </div>
            <empty-state
              v-else
              icon="inbox"
              title="No listening parts"
              description=""
            />
          </div>

          <!-- Writing Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-amber-100 rounded-lg">
                <i data-feather="edit-3" class="w-5 h-5 text-amber-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Writing Section</h3>
                <p class="text-sm text-gray-600">{{ test.writing_tasks?.length || 0 }} tasks</p>
              </div>
            </div>
            <div v-if="test.writing_tasks && test.writing_tasks.length > 0" class="space-y-3">
              <div
                v-for="task in test.writing_tasks"
                :key="task.id"
                class="border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                      {{ task.task_type_display }}
                    </span>
                    <p class="text-sm text-gray-600 mt-2">{{ task.min_words || 150 }} words minimum</p>
                  </div>
                </div>
              </div>
            </div>
            <empty-state
              v-else
              icon="inbox"
              title="No writing tasks"
              description=""
            />
          </div>

          <!-- Speaking Section -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="p-2 bg-rose-100 rounded-lg">
                <i data-feather="mic" class="w-5 h-5 text-rose-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Speaking Section</h3>
                <p class="text-sm text-gray-600">{{ test.speaking_topics?.length || 0 }} topics</p>
              </div>
            </div>
            <div v-if="test.speaking_topics && test.speaking_topics.length > 0" class="space-y-3">
              <div
                v-for="topic in test.speaking_topics"
                :key="topic.id"
                class="border border-gray-200 rounded-lg p-4 hover:border-rose-300 transition"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <span class="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800">
                      {{ topic.speaking_type_display }}
                    </span>
                    <h4 class="font-medium text-gray-900 mt-2">{{ topic.topic || 'Untitled' }}</h4>
                  </div>
                </div>
              </div>
            </div>
            <empty-state
              v-else
              icon="inbox"
              title="No speaking topics"
              description=""
            />
          </div>
        </div>

        <!-- Recent Attempts -->
        <div v-if="recentAttempts && recentAttempts.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i data-feather="activity" class="w-5 h-5 text-orange-600"></i>
              Recent Attempts
            </h3>
            <span class="text-sm text-gray-500">Last 10 attempts</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                  <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Overall Score</th>
                  <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Started</th>
                  <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Completed</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="attempt in recentAttempts" :key="attempt.id" class="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td class="py-3 px-4 text-sm text-gray-900">{{ attempt.student_name }}</td>
                  <td class="py-3 px-4 text-sm">
                    <span v-if="attempt.completed_at" class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      <i data-feather="check-circle" class="w-3 h-3"></i>
                      Completed
                    </span>
                    <span v-else class="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                      <i data-feather="clock" class="w-3 h-3"></i>
                      In Progress
                    </span>
                  </td>
                  <td class="py-3 px-4 text-sm">
                    <span v-if="attempt.overall_score" :class="getBandScoreColor(attempt.overall_score)" class="font-semibold">
                      {{ attempt.overall_score }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="py-3 px-4 text-sm text-gray-600">{{ Helpers.formatDateTime(attempt.started_at) }}</td>
                  <td class="py-3 px-4 text-sm text-gray-600">
                    {{ attempt.completed_at ? Helpers.formatDateTime(attempt.completed_at) : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Mock Test</h3>
            <p class="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{{ test?.title }}"? This action cannot be undone.
            </p>
            <div class="flex gap-3 justify-end">
              <button
                @click="cancelDelete"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Cancel
              </button>
              <button
                @click="handleDelete"
                class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
