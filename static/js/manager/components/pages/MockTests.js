/**
 * Mock Tests Component
 * Comprehensive view for managing IELTS mock tests
 * Adapted from BandBooster with enhanced features
 */

window.MockTests = {
  name: 'MockTests',
  mixins: [window.FeatherIconsMixin],
  data() {
    return {
      loading: true,
      error: null,
      tests: [],
      filters: {
        status: '',
        type: '',
        search: '',
      },
      showDeleteConfirm: false,
      testToDelete: null,
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
    stats() {
      return {
        total: this.tests.length,
        active: this.tests.filter(t => t.is_active).length,
        inactive: this.tests.filter(t => !t.is_active).length,
        totalAttempts: this.tests.reduce((sum, t) => sum + (t.attempt_count || 0), 0),
      };
    },

    filteredTests() {
      let filtered = [...this.tests];

      if (this.filters.status === 'active') {
        filtered = filtered.filter(t => t.is_active);
      } else if (this.filters.status === 'inactive') {
        filtered = filtered.filter(t => !t.is_active);
      }

      if (this.filters.type) {
        filtered = filtered.filter(t => t.exam_type === this.filters.type);
      }

      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        filtered = filtered.filter(t =>
          t.title?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
        );
      }

      return filtered;
    },

    hasFilters() {
      return this.filters.status || this.filters.type || this.filters.search;
    },
  },

  async mounted() {
    await this.loadTests();
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
    async loadTests() {
      try {
        this.loading = true;
        this.error = null;

        const data = await managerAPI.getMockTests(this.filters);

        if (data.success) {
          this.tests = data.tests || [];
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

    async toggleStatus(test) {
      try {
        const data = await managerAPI.toggleMockTestStatus(test.id);
        if (data.success) {
          if (this.Helpers && this.Helpers.showToast) {
            this.Helpers.showToast(data.message, 'success');
          }
          await this.loadTests();
        }
      } catch (err) {
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast(this.handleAPIError(err), 'error');
        }
      }
    },

    confirmDelete(test) {
      this.testToDelete = test;
      this.showDeleteConfirm = true;
    },

    async handleDelete() {
      if (!this.testToDelete) return;

      try {
        const data = await managerAPI.deleteMockTest(this.testToDelete.id);
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast('Mock test deleted successfully', 'success');
        }
        this.showDeleteConfirm = false;
        this.testToDelete = null;
        await this.loadTests();
      } catch (err) {
        if (this.Helpers && this.Helpers.showToast) {
          this.Helpers.showToast(this.handleAPIError(err), 'error');
        }
      }
    },

    cancelDelete() {
      this.showDeleteConfirm = false;
      this.testToDelete = null;
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

    clearFilters() {
      this.filters.status = '';
      this.filters.type = '';
      this.filters.search = '';
    },

    navigateToCreate() {
      this.$emit('navigate', 'create-mock-test');
    },

    navigateToDetails(testId) {
      this.$emit('navigate', 'mock-test-details', { testId });
    },

    navigateToEdit(testId) {
      this.$emit('navigate', 'edit-mock-test', { testId });
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
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Mock Tests</h2>
          <p class="text-sm text-gray-600 mt-1">Create and manage complete IELTS mock tests</p>
        </div>
        <button
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition shadow-md hover:shadow-lg"
        >
          <i data-feather="plus" class="w-4 h-4"></i>
          Create Mock Test
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <loading-spinner size="large" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {{ error }}
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Tests</p>
                <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.total }}</p>
              </div>
              <div class="p-3 bg-orange-100 rounded-lg">
                <i data-feather="file-text" class="w-6 h-6 text-orange-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Active</p>
                <p class="text-2xl font-bold text-green-600 mt-1">{{ stats.active }}</p>
              </div>
              <div class="p-3 bg-green-100 rounded-lg">
                <i data-feather="check-circle" class="w-6 h-6 text-green-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Inactive</p>
                <p class="text-2xl font-bold text-gray-600 mt-1">{{ stats.inactive }}</p>
              </div>
              <div class="p-3 bg-gray-100 rounded-lg">
                <i data-feather="x-circle" class="w-6 h-6 text-gray-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Attempts</p>
                <p class="text-2xl font-bold text-purple-600 mt-1">{{ stats.totalAttempts }}</p>
              </div>
              <div class="p-3 bg-purple-100 rounded-lg">
                <i data-feather="users" class="w-6 h-6 text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select v-model="filters.status" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
              <select v-model="filters.type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">All Types</option>
                <option value="FULL_TEST">Full Test</option>
                <option value="READING">Reading</option>
                <option value="LISTENING">Listening</option>
                <option value="WRITING">Writing</option>
                <option value="SPEAKING">Speaking</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div class="relative">
                <input
                  v-model="filters.search"
                  type="text"
                  placeholder="Search tests..."
                  class="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
              </div>
            </div>
          </div>

          <div v-if="hasFilters" class="mt-3 flex items-center justify-between">
            <p class="text-sm text-gray-600">
              Showing {{ filteredTests.length }} of {{ stats.total }} tests
            </p>
            <button @click="clearFilters" class="text-sm text-orange-600 hover:text-orange-800 font-medium">
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <empty-state
          v-if="filteredTests.length === 0"
          icon="inbox"
          :title="hasFilters ? 'No tests found' : 'No mock tests yet'"
          :description="hasFilters ? 'Try adjusting your filters' : 'Create your first mock test to get started'"
          :actionText="hasFilters ? '' : 'Create Mock Test'"
          @action="navigateToCreate"
        />

        <!-- Tests Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="test in filteredTests"
            :key="test.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group"
          >
            <div class="p-6">
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition cursor-pointer"
                      @click="navigateToDetails(test.id)">
                    {{ test.title }}
                  </h3>
                  <p class="text-sm text-gray-500 mt-1">
                    <span :class="getTypeBadge(test.exam_type)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                      {{ test.exam_type_display }}
                    </span>
                  </p>
                </div>
                <span
                  :class="getStatusBadge(test.is_active)"
                  class="px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ test.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>

              <div v-if="test.description" class="text-sm text-gray-600 mb-4 line-clamp-2">
                {{ test.description }}
              </div>

              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <i data-feather="users" class="w-4 h-4"></i>
                  <span>{{ test.attempt_count || 0 }} attempts</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <i data-feather="clock" class="w-4 h-4"></i>
                  <span>{{ test.duration_minutes }} min</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <i data-feather="calendar" class="w-4 h-4"></i>
                  <span>{{ Helpers.formatDate(test.created_at) }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <i data-feather="bar-chart" class="w-4 h-4"></i>
                  <span>{{ test.difficulty_display || 'N/A' }}</span>
                </div>
              </div>

              <div class="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  @click="navigateToDetails(test.id)"
                  class="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-md transition"
                >
                  <i data-feather="eye" class="w-3.5 h-3.5"></i>
                  View
                </button>
                <button
                  @click="navigateToEdit(test.id)"
                  class="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-md transition"
                >
                  <i data-feather="edit-2" class="w-3.5 h-3.5"></i>
                  Edit
                </button>
                <button
                  @click="toggleStatus(test)"
                  class="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition"
                  :class="test.is_active ? 'text-gray-600 hover:bg-gray-50' : 'text-green-600 hover:bg-green-50'"
                >
                  <i :data-feather="test.is_active ? 'x-circle' : 'check-circle'" class="w-3.5 h-3.5"></i>
                  {{ test.is_active ? 'Deactivate' : 'Activate' }}
                </button>
                <button
                  @click="confirmDelete(test)"
                  class="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition"
                >
                  <i data-feather="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Delete Mock Test</h3>
            <p class="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "{{ testToDelete?.title }}"? This action cannot be undone.
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
