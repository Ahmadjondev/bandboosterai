/**
 * Speaking Topics Component
 * Comprehensive speaking topic management with enhanced UI
 */

window.SpeakingTopics = {
  name: 'SpeakingTopics',
  data() {
    return {
      topics: [],
      loading: true,
      error: null,
      showModal: false,
      isEditMode: false,
      currentTopic: null,
      formData: {
        speaking_type: 'PART_1',
        topic: '',
        question: '',
        cue_card: null,
      },
      cueCardPoints: ['', '', '', ''],
      formErrors: {},
      saving: false,
      deleteConfirmId: null,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        perPage: 25,
        totalItems: 0,
      },
      searchQuery: '',
      filterType: 'all',
    };
  },

  computed: {
    filteredTopics() {
      let result = this.topics;

      // Filter by type
      if (this.filterType !== 'all') {
        result = result.filter(topic => topic.speaking_type === this.filterType);
      }

      // Search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(topic =>
          topic.topic.toLowerCase().includes(query) ||
          (topic.question && topic.question.toLowerCase().includes(query))
        );
      }

      return result;
    },

    speakingTypeDisplay() {
      return {
        'PART_1': 'Part 1: Introduction & Interview',
        'PART_2': 'Part 2: Individual Long Turn',
        'PART_3': 'Part 3: Two-way Discussion',
      };
    },

    showCueCardSection() {
      return this.formData.speaking_type === 'PART_2';
    },
  },

  mounted() {
    this.loadTopics();
    this.setupFeatherIcons();
  },

  updated() {
    this.setupFeatherIcons();
  },

  methods: {
    setupFeatherIcons() {
      if (typeof feather !== 'undefined') {
        this.$nextTick(() => {
          feather.replace();
        });
      }
    },

    async loadTopics(page = 1) {
      this.loading = true;
      this.error = null;

      try {
        const response = await window.managerAPI.get(`/tests/speaking/?page=${page}`);
        this.topics = response.topics || [];

        if (response.pagination) {
          this.pagination = {
            currentPage: response.pagination.current_page,
            totalPages: response.pagination.total_pages,
            perPage: response.pagination.per_page,
            totalItems: response.pagination.total_items,
          };
        }
      } catch (error) {
        this.error = error.message || 'Failed to load speaking topics';
        console.error('Error loading speaking topics:', error);
      } finally {
        this.loading = false;
      }
    },

    openCreateModal() {
      this.isEditMode = false;
      this.currentTopic = null;
      this.resetForm();
      this.showModal = true;
    },

    openEditModal(topic) {
      this.isEditMode = true;
      this.currentTopic = topic;
      this.formData = {
        speaking_type: topic.speaking_type,
        topic: topic.topic,
        question: topic.question || '',
        cue_card: topic.cue_card,
      };

      // Load cue card points if available
      if (topic.cue_card && Array.isArray(topic.cue_card)) {
        this.cueCardPoints = [...topic.cue_card];
        // Ensure we have at least 4 points
        while (this.cueCardPoints.length < 4) {
          this.cueCardPoints.push('');
        }
      } else {
        this.cueCardPoints = ['', '', '', ''];
      }

      this.formErrors = {};
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
      this.resetForm();
    },

    resetForm() {
      this.formData = {
        speaking_type: 'PART_1',
        topic: '',
        question: '',
        cue_card: null,
      };
      this.cueCardPoints = ['', '', '', ''];
      this.formErrors = {};
    },

    addCueCardPoint() {
      this.cueCardPoints.push('');
    },

    removeCueCardPoint(index) {
      if (this.cueCardPoints.length > 1) {
        this.cueCardPoints.splice(index, 1);
      }
    },

    validateForm() {
      this.formErrors = {};

      if (!this.formData.speaking_type) {
        this.formErrors.speaking_type = 'Speaking type is required';
      }

      if (!this.formData.topic || this.formData.topic.trim() === '') {
        this.formErrors.topic = 'Topic is required';
      }

      if (this.formData.speaking_type === 'PART_2') {
        const filledPoints = this.cueCardPoints.filter(p => p.trim() !== '');
        if (filledPoints.length === 0) {
          this.formErrors.cue_card = 'At least one cue card point is required for Part 2';
        }
      }

      return Object.keys(this.formErrors).length === 0;
    },

    async saveTopic() {
      if (!this.validateForm()) {
        return;
      }

      this.saving = true;

      try {
        const data = {
          speaking_type: this.formData.speaking_type,
          topic: this.formData.topic,
          question: this.formData.question,
        };

        // Add cue card points for Part 2
        if (this.formData.speaking_type === 'PART_2') {
          const filledPoints = this.cueCardPoints
            .filter(p => p.trim() !== '')
            .map(p => p.trim());
          data.cue_card = filledPoints;
        } else {
          data.cue_card = null;
        }

        let response;
        if (this.isEditMode && this.currentTopic) {
          response = await window.managerAPI.put(
            `/tests/speaking/${this.currentTopic.id}/update/`,
            data
          );
        } else {
          response = await window.managerAPI.post('/tests/speaking/create/', data);
        }

        await this.loadTopics(this.pagination.currentPage);
        this.closeModal();
        this.showNotification(
          this.isEditMode ? 'Topic updated successfully' : 'Topic created successfully',
          'success'
        );
      } catch (error) {
        console.error('Error saving topic:', error);
        this.showNotification(error.message || 'Failed to save topic', 'error');
      } finally {
        this.saving = false;
      }
    },

    confirmDelete(topicId) {
      this.deleteConfirmId = topicId;
    },

    cancelDelete() {
      this.deleteConfirmId = null;
    },

    async deleteTopic(topicId) {
      try {
        await window.managerAPI.delete(`/tests/speaking/${topicId}/delete/`);

        await this.loadTopics(this.pagination.currentPage);
        this.cancelDelete();
        this.showNotification('Topic deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting topic:', error);
        this.showNotification(error.message || 'Failed to delete topic', 'error');
      }
    },

    goToPage(page) {
      if (page >= 1 && page <= this.pagination.totalPages) {
        this.loadTopics(page);
      }
    },

    showNotification(message, type = 'info') {
      // Use toast notification system
      if (window.toast && window.toast[type]) {
        window.toast[type](message);
      } else if (window.showToast) {
        window.showToast({ message, type });
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    },

    getSpeakingTypeClass(speakingType) {
      const classes = {
        'PART_1': 'bg-green-100 text-green-800',
        'PART_2': 'bg-orange-100 text-orange-800',
        'PART_3': 'bg-orange-100 text-orange-800',
      };
      return classes[speakingType] || 'bg-gray-100 text-gray-800';
    },

    truncateText(text, maxLength = 100) {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
  },

  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50 px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header with enhanced design -->
      <div class="max-w-7xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <div class="sm:flex sm:items-center sm:justify-between">
            <div class="flex items-center space-x-4">
              <div class="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl shadow-lg" style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);">
                <i data-feather="mic" class="h-8 w-8 text-white"></i>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">
                  Speaking Topics
                </h1>
                <p class="mt-1 text-sm text-gray-600">Manage IELTS speaking topics for Parts 1, 2 & 3</p>
              </div>
            </div>
            <div class="mt-4 sm:mt-0">
              <button
                @click="openCreateModal"
                class="group relative inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200"
                style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);"
              >
                <i data-feather="plus" class="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200"></i>
                Add Speaking Topic
              </button>
            </div>
          </div>
        </div>

        <!-- Filters with enhanced design -->
        <div class="bg-white rounded-2xl shadow-lg mb-8 p-6 border border-gray-100">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Search -->
            <div>
              <label for="search" class="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <i data-feather="search" class="h-4 w-4 mr-2" style="color: #E75225;"></i>
                Search
              </label>
              <div class="relative group">
                <input
                  type="text"
                  id="search"
                  v-model="searchQuery"
                  placeholder="Search topics or questions..."
                  class="block w-full rounded-xl border-2 border-gray-200 shadow-sm focus:ring-2 sm:text-sm pl-11 py-3 transition-all duration-200"
                  style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                  @focus="$event.target.style.borderColor='#E75225'"
                  @blur="$event.target.style.borderColor=''"
                />
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i data-feather="search" class="h-5 w-5 text-gray-400 transition-colors"></i>
                </div>
              </div>
            </div>

            <!-- Filter by Type -->
            <div>
              <label for="filter-type" class="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <i data-feather="filter" class="h-4 w-4 mr-2" style="color: #E75225;"></i>
                Filter by Part
              </label>
              <select
                id="filter-type"
                v-model="filterType"
                class="block w-full rounded-xl border-2 border-gray-200 shadow-sm focus:ring-2 sm:text-sm py-3 transition-all duration-200"
                style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                @focus="$event.target.style.borderColor='#E75225'"
                @blur="$event.target.style.borderColor=''"
              >
                <option value="all">🌐 All Parts</option>
                <option value="PART_1">👋 Part 1: Introduction & Interview</option>
                <option value="PART_2">🎯 Part 2: Individual Long Turn</option>
                <option value="PART_3">💬 Part 3: Two-way Discussion</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Loading State with animation -->
        <div v-if="loading" class="flex flex-col justify-center items-center py-20">
          <div class="relative">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-orange-200"></div>
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-transparent absolute top-0" style="border-top-color: #E75225;"></div>
          </div>
          <p class="mt-4 text-sm text-gray-600 animate-pulse">Loading topics...</p>
        </div>

        <!-- Error State with enhanced design -->
        <div v-else-if="error" class="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <div class="bg-red-100 rounded-full p-2">
                <i data-feather="alert-circle" class="h-6 w-6 text-red-600"></i>
              </div>
            </div>
            <div class="ml-4">
              <h3 class="text-base font-semibold text-red-900">Oops! Something went wrong</h3>
              <p class="mt-2 text-sm text-red-700">{{ error }}</p>
              <button
                @click="loadTopics()"
                class="mt-4 inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <i data-feather="refresh-cw" class="h-4 w-4 mr-2"></i>
                Try Again
              </button>
            </div>
          </div>
        </div>

        <!-- Topics List -->
        <div v-else>
          <div v-if="filteredTopics.length === 0" class="bg-white rounded-2xl shadow-xl p-16 text-center">
            <div class="bg-gradient-to-br from-orange-100 to-red-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <i data-feather="mic" class="h-12 w-12" style="color: #E75225;"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">No speaking topics found</h3>
            <p class="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first speaking topic and build your IELTS content library.</p>
            <button
              @click="openCreateModal"
              class="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white transform hover:scale-105 transition-all duration-200"
              style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);"
            >
              <i data-feather="plus" class="h-5 w-5 mr-2"></i>
              Add Speaking Topic
            </button>
          </div>

          <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="topic in filteredTopics"
            :key="topic.id"
            class="group bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100"
            @mouseenter="$event.currentTarget.style.borderColor='#E75225'"
            @mouseleave="$event.currentTarget.style.borderColor=''"
          >
            <!-- Header with gradient -->
            <div class="relative px-6 py-5 overflow-hidden" style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 50%, #c42d0f 100%);">
              <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div class="relative z-10">
                <div class="flex items-center justify-between mb-3">
                  <span
                    class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-800 shadow-lg"
                  >
                    {{ speakingTypeDisplay[topic.speaking_type].split(':')[0] }}
                  </span>
                  <div class="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <i data-feather="mic" class="h-4 w-4 text-white"></i>
                  </div>
                </div>
                <h3 class="text-xl font-bold text-white drop-shadow-lg line-clamp-2">{{ topic.topic }}</h3>
              </div>
            </div>

            <!-- Content -->
            <div class="p-6">
              <div v-if="topic.question" class="mb-5">
                <div class="flex items-center mb-2">
                  <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                    <i data-feather="help-circle" class="h-4 w-4" style="color: #E75225;"></i>
                  </div>
                  <p class="text-sm font-semibold text-gray-700">Question</p>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed pl-9">{{ truncateText(topic.question, 120) }}</p>
              </div>

              <div v-if="topic.cue_card && topic.cue_card.length > 0" class="mb-5">
                <div class="flex items-center mb-3">
                  <div class="bg-red-100 rounded-lg p-1.5 mr-2">
                    <i data-feather="list" class="h-4 w-4" style="color: #E75225;"></i>
                  </div>
                  <p class="text-sm font-semibold text-gray-700">Cue Card Points</p>
                </div>
                <ul class="space-y-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-3">
                  <li v-for="(point, idx) in topic.cue_card.slice(0, 3)" :key="idx" class="flex items-start">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold mr-3 mt-0.5 flex-shrink-0" style="background-color: #E75225;">{{ idx + 1 }}</span>
                    <span class="text-sm text-gray-700">{{ truncateText(point, 50) }}</span>
                  </li>
                  <li v-if="topic.cue_card.length > 3" class="text-sm font-medium italic ml-8" style="color: #E75225;">
                    +{{ topic.cue_card.length - 3 }} more points...
                  </li>
                </ul>
              </div>

              <div class="flex items-center text-xs text-gray-500 mb-5 bg-gray-50 rounded-lg px-3 py-2">
                <i data-feather="calendar" class="h-3 w-3 mr-2"></i>
                {{ formatDate(topic.created_at) }}
              </div>

              <!-- Actions with improved styling -->
              <div class="flex items-center gap-3">
                <button
                  @click="openEditModal(topic)"
                  class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-semibold bg-orange-50 hover:bg-orange-100 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200"
                  style="color: #E75225; --tw-ring-color: rgba(231, 82, 37, 0.5);"
                >
                  <i data-feather="edit-2" class="h-4 w-4 mr-2"></i>
                  Edit
                </button>
                <button
                  v-if="deleteConfirmId === topic.id"
                  @click="deleteTopic(topic.id)"
                  class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-300 rounded-xl text-sm font-semibold text-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-all duration-200"
                  style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);"
                >
                  <i data-feather="check" class="h-4 w-4 mr-2"></i>
                  Confirm
                </button>
                <button
                  v-else
                  @click="confirmDelete(topic.id)"
                  class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  <i data-feather="trash-2" class="h-4 w-4 mr-2"></i>
                  Delete
                </button>
              </div>
              <button
                v-if="deleteConfirmId === topic.id"
                @click="cancelDelete"
                class="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
              >
                <i data-feather="x" class="h-4 w-4 mr-2"></i>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="mt-6 flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div class="flex flex-1 justify-between sm:hidden">
            <button
              @click="goToPage(pagination.currentPage - 1)"
              :disabled="pagination.currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              @click="goToPage(pagination.currentPage + 1)"
              :disabled="pagination.currentPage === pagination.totalPages"
              class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing page <span class="font-medium">{{ pagination.currentPage }}</span> of
                <span class="font-medium">{{ pagination.totalPages }}</span>
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="goToPage(pagination.currentPage - 1)"
                  :disabled="pagination.currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i data-feather="chevron-left" class="h-5 w-5"></i>
                </button>
                <button
                  @click="goToPage(pagination.currentPage + 1)"
                  :disabled="pagination.currentPage === pagination.totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i data-feather="chevron-right" class="h-5 w-5"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

        <!-- Create/Edit Modal with enhanced design -->
        <div v-if="showModal" class="fixed z-50 inset-0 overflow-y-auto">
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

            <div class="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <!-- Modal Header -->
              <div class="px-6 py-6" style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                      <i data-feather="mic" class="h-6 w-6 text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white">
                      {{ isEditMode ? 'Edit Speaking Topic' : 'Create Speaking Topic' }}
                    </h3>
                  </div>
                  <button @click="closeModal" class="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200">
                    <i data-feather="x" class="h-6 w-6"></i>
                  </button>
                </div>
              </div>

              <!-- Modal Body -->
              <div class="bg-white px-6 py-6">

                <form @submit.prevent="saveTopic" class="space-y-6">
                  <!-- Speaking Type -->
                  <div class="bg-gradient-to-br from-gray-50 to-orange-50 rounded-2xl p-5 border-2 border-gray-200">
                    <label for="speaking-type" class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="layers" class="h-4 w-4" style="color: #E75225;"></i>
                      </div>
                      Speaking Part <span class="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      id="speaking-type"
                      v-model="formData.speaking_type"
                      class="block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:ring-2 sm:text-sm py-3 px-4 bg-white transition-all duration-200"
                      style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                      @focus="$event.target.style.borderColor='#E75225'"
                      @blur="$event.target.style.borderColor=''"
                      :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': formErrors.speaking_type }"
                    >
                      <option value="PART_1">👋 Part 1: Introduction & Interview</option>
                      <option value="PART_2">🎯 Part 2: Individual Long Turn</option>
                      <option value="PART_3">💬 Part 3: Two-way Discussion</option>
                    </select>
                    <p v-if="formErrors.speaking_type" class="mt-2 text-sm text-red-600 flex items-center">
                      <i data-feather="alert-circle" class="h-4 w-4 mr-1"></i>
                      {{ formErrors.speaking_type }}
                    </p>
                  </div>

                  <!-- Topic -->
                  <div>
                    <label for="topic" class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="bookmark" class="h-4 w-4" style="color: #E75225;"></i>
                      </div>
                      Topic <span class="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      id="topic"
                      v-model="formData.topic"
                      placeholder="e.g., Travel, Family, Technology"
                      class="block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:ring-2 sm:text-sm py-3 px-4 transition-all duration-200"
                      style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                      @focus="$event.target.style.borderColor='#E75225'"
                      @blur="$event.target.style.borderColor=''"
                      :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': formErrors.topic }"
                    />
                    <p v-if="formErrors.topic" class="mt-2 text-sm text-red-600 flex items-center">
                      <i data-feather="alert-circle" class="h-4 w-4 mr-1"></i>
                      {{ formErrors.topic }}
                    </p>
                  </div>

                  <!-- Question -->
                  <div>
                    <label for="question" class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="help-circle" class="h-4 w-4 text-orange-600"></i>
                      </div>
                      Question / Prompt
                    </label>
                    <textarea
                      id="question"
                      v-model="formData.question"
                      rows="4"
                      placeholder="Enter the speaking question or prompt..."
                      class="block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:ring-2 sm:text-sm py-3 px-4 transition-all duration-200"
                      style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                      @focus="$event.target.style.borderColor='#E75225'"
                      @blur="$event.target.style.borderColor=''"
                    ></textarea>
                  </div>

                  <!-- Cue Card Points (Part 2 only) -->
                  <div v-if="showCueCardSection" class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 border-2" style="border-color: #E75225;">
                    <label class="flex items-center text-sm font-semibold text-gray-800 mb-2">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="list" class="h-4 w-4" style="color: #E75225;"></i>
                      </div>
                      Cue Card Points <span class="text-red-500 ml-1">*</span>
                    </label>
                    <p class="text-xs text-gray-600 mb-4 flex items-start">
                      <i data-feather="info" class="h-3 w-3 mr-2 mt-0.5" style="color: #E75225;"></i>
                      Points that the candidate should cover in their talk
                    </p>
                    
                    <div class="space-y-3">
                      <div
                        v-for="(point, index) in cueCardPoints"
                        :key="index"
                        class="flex items-center gap-3 group"
                      >
                        <div class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg" style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);">
                          {{ index + 1 }}
                        </div>
                        <input
                          type="text"
                          v-model="cueCardPoints[index]"
                          :placeholder="'Describe point ' + (index + 1) + '...'"
                          class="flex-1 block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:ring-2 sm:text-sm py-2.5 px-4 transition-all duration-200"
                          style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                          @focus="$event.target.style.borderColor='#E75225'"
                          @blur="$event.target.style.borderColor=''"
                        />
                        <button
                          v-if="cueCardPoints.length > 1"
                          type="button"
                          @click="removeCueCardPoint(index)"
                          class="flex-shrink-0 p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200"
                        >
                          <i data-feather="trash-2" class="h-4 w-4"></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      @click="addCueCardPoint"
                      class="mt-4 inline-flex items-center px-4 py-2.5 border-2 rounded-xl text-sm font-semibold bg-white hover:bg-orange-100 transition-all duration-200"
                      style="color: #E75225; border-color: #E75225;"
                    >
                      <i data-feather="plus" class="h-4 w-4 mr-2"></i>
                      Add Another Point
                    </button>

                    <p v-if="formErrors.cue_card" class="mt-3 text-sm text-red-600 flex items-center bg-red-50 rounded-lg p-3">
                      <i data-feather="alert-circle" class="h-4 w-4 mr-2"></i>
                      {{ formErrors.cue_card }}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex justify-end space-x-4 pt-6 border-t-2 border-gray-100">
                    <button
                      type="button"
                      @click="closeModal"
                      class="px-6 py-3 border-2 border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      <i data-feather="x" class="h-4 w-4 inline mr-2"></i>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      :disabled="saving"
                      class="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                      style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%); --tw-ring-color: rgba(231, 82, 37, 0.5);"
                    >
                      <span v-if="saving" class="inline-flex items-center">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                      <span v-else class="inline-flex items-center">
                        <i data-feather="check" class="h-4 w-4 mr-2"></i>
                        {{ isEditMode ? 'Update Topic' : 'Create Topic' }}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
