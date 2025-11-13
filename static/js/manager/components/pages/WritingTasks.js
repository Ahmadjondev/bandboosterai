/**
 * Writing Tasks Component
 * Comprehensive writing task management with enhanced UI
 */

window.WritingTasks = {
  name: 'WritingTasks',
  data() {
    return {
      tasks: [],
      loading: true,
      error: null,
      showModal: false,
      isEditMode: false,
      currentTask: null,
      formData: {
        task_type: 'TASK_1',
        prompt: '',
        min_words: 150,
        picture: null,
        data: null,
      },
      formErrors: {},
      uploadedImagePreview: null,
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
    filteredTasks() {
      let result = this.tasks;

      // Filter by type
      if (this.filterType !== 'all') {
        result = result.filter(task => task.task_type === this.filterType);
      }

      // Search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(task =>
          task.prompt.toLowerCase().includes(query)
        );
      }

      return result;
    },

    taskTypeDisplay() {
      return {
        'TASK_1': 'Task 1',
        'TASK_2': 'Task 2',
      };
    },
  },

  mounted() {
    this.loadTasks();
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

    async loadTasks(page = 1) {
      this.loading = true;
      this.error = null;

      try {
        const response = await window.managerAPI.get(`/tests/writing/?page=${page}`);
        this.tasks = response.tasks || [];

        if (response.pagination) {
          this.pagination = {
            currentPage: response.pagination.current_page,
            totalPages: response.pagination.total_pages,
            perPage: response.pagination.per_page,
            totalItems: response.pagination.total_items,
          };
        }
      } catch (error) {
        this.error = error.message || 'Failed to load writing tasks';
        console.error('Error loading writing tasks:', error);
      } finally {
        this.loading = false;
      }
    },

    openCreateModal() {
      this.isEditMode = false;
      this.currentTask = null;
      this.resetForm();
      this.showModal = true;
    },

    openEditModal(task) {
      this.isEditMode = true;
      this.currentTask = task;
      this.formData = {
        task_type: task.task_type,
        prompt: task.prompt,
        min_words: task.min_words || (task.task_type === 'TASK_1' ? 150 : 250),
        picture: null,
        data: task.data,
      };
      this.uploadedImagePreview = task.picture || null;
      this.formErrors = {};
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
      this.resetForm();
    },

    resetForm() {
      this.formData = {
        task_type: 'TASK_1',
        prompt: '',
        min_words: 150,
        picture: null,
        data: null,
      };
      this.formErrors = {};
      this.uploadedImagePreview = null;
    },

    handleTaskTypeChange() {
      // Update min_words based on task type
      if (this.formData.task_type === 'TASK_1') {
        this.formData.min_words = 150;
      } else {
        this.formData.min_words = 250;
      }
    },

    handleImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.formData.picture = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.uploadedImagePreview = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    },

    removeImage() {
      this.formData.picture = null;
      this.uploadedImagePreview = null;
      const fileInput = this.$refs.imageInput;
      if (fileInput) {
        fileInput.value = '';
      }
    },

    validateForm() {
      this.formErrors = {};

      if (!this.formData.task_type) {
        this.formErrors.task_type = 'Task type is required';
      }

      if (!this.formData.prompt || this.formData.prompt.trim() === '') {
        this.formErrors.prompt = 'Prompt is required';
      }

      if (!this.formData.min_words || this.formData.min_words < 1) {
        this.formErrors.min_words = 'Minimum words must be greater than 0';
      }

      return Object.keys(this.formErrors).length === 0;
    },

    async saveTask() {
      if (!this.validateForm()) {
        return;
      }

      this.saving = true;

      try {
        const formData = new FormData();
        formData.append('task_type', this.formData.task_type);
        formData.append('prompt', this.formData.prompt);
        formData.append('min_words', this.formData.min_words);

        if (this.formData.picture instanceof File) {
          formData.append('picture', this.formData.picture);
        }

        if (this.formData.data) {
          formData.append('data', JSON.stringify(this.formData.data));
        }

        let response;
        if (this.isEditMode && this.currentTask) {
          // For updates, use PUT with FormData
          response = await window.managerAPI.request(
            `/tests/writing/${this.currentTask.id}/update/`,
            {
              method: 'PUT',
              body: formData,
            }
          );
        } else {
          // For creates, use uploadFile method
          response = await window.managerAPI.uploadFile('/tests/writing/create/', formData);
        }

        await this.loadTasks(this.pagination.currentPage);
        this.closeModal();
        this.showNotification(
          this.isEditMode ? 'Task updated successfully' : 'Task created successfully',
          'success'
        );
      } catch (error) {
        console.error('Error saving task:', error);
        this.showNotification(error.message || 'Failed to save task', 'error');
      } finally {
        this.saving = false;
      }
    },

    confirmDelete(taskId) {
      this.deleteConfirmId = taskId;
    },

    cancelDelete() {
      this.deleteConfirmId = null;
    },

    async deleteTask(taskId) {
      try {
        await window.managerAPI.delete(`/tests/writing/${taskId}/delete/`);

        await this.loadTasks(this.pagination.currentPage);
        this.cancelDelete();
        this.showNotification('Task deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting task:', error);
        this.showNotification(error.message || 'Failed to delete task', 'error');
      }
    },

    goToPage(page) {
      if (page >= 1 && page <= this.pagination.totalPages) {
        this.loadTasks(page);
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

    getTaskTypeClass(taskType) {
      return taskType === 'TASK_1'
        ? 'bg-orange-100 text-orange-800'
        : 'bg-orange-100 text-orange-800';
    },

    truncateText(text, maxLength = 150) {
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
              <div class="p-3 rounded-xl shadow-lg" style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);">
                <i data-feather="file-text" class="h-8 w-8 text-white"></i>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">
                  Writing Tasks
                </h1>
                <p class="mt-1 text-sm text-gray-600">Manage IELTS writing task prompts for Task 1 & Task 2</p>
              </div>
            </div>
            <div class="mt-4 sm:mt-0">
              <button
                @click="openCreateModal"
                class="group relative inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200"
                style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);"
              >
                <i data-feather="plus" class="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-200"></i>
                Add Writing Task
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
                  placeholder="Search in prompts..."
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
                Filter by Type
              </label>
              <select
                id="filter-type"
                v-model="filterType"
                class="block w-full rounded-xl border-2 border-gray-200 shadow-sm focus:ring-2 sm:text-sm py-3 transition-all duration-200"
                style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                @focus="$event.target.style.borderColor='#E75225'"
                @blur="$event.target.style.borderColor=''"
              >
                <option value="all">📝 All Tasks</option>
                <option value="TASK_1">📊 Task 1 (Report Writing)</option>
                <option value="TASK_2">✍️ Task 2 (Essay Writing)</option>
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
          <p class="mt-4 text-sm text-gray-600 animate-pulse">Loading writing tasks...</p>
        </div>

        <!-- Error State with enhanced design -->
        <div v-else-if="error" class="bg-gradient-to-r from-red-50 to-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
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
                @click="loadTasks()"
                class="mt-4 inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <i data-feather="refresh-cw" class="h-4 w-4 mr-2"></i>
                Try Again
              </button>
            </div>
          </div>
        </div>

        <!-- Tasks List -->
        <div v-else>
                    <div v-if="filteredTasks.length === 0" class="bg-white rounded-2xl shadow-xl p-16 text-center">
            <div class="bg-gradient-to-br from-orange-100 to-red-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <i data-feather="file-text" class="h-12 w-12" style="color: #E75225;"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">No writing tasks found</h3>
            <p class="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first writing task and build your IELTS content library.</p>
            <button
              @click="openCreateModal"
              class="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white transform hover:scale-105 transition-all duration-200"
              style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);"
            >
              <i data-feather="plus" class="h-5 w-5 mr-2"></i>
              Add Writing Task
            </button>
          </div>

          <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="group bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100"
            @mouseenter="$event.currentTarget.style.borderColor='#E75225'"
            @mouseleave="$event.currentTarget.style.borderColor=''"
          >
            <!-- Image Preview with gradient overlay -->
            <div v-if="task.picture" class="relative h-52 bg-gray-200 overflow-hidden">
              <img :src="task.picture" :alt="'Task ' + task.task_type" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div class="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center space-x-2">
                <i data-feather="image" class="h-4 w-4" style="color: #E75225;"></i>
                <span class="text-xs font-medium text-gray-800">With Image</span>
              </div>
            </div>
            <div v-else class="relative h-52 flex items-center justify-center overflow-hidden" style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 50%, #c42d0f 100%);">
              <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <i data-feather="file-text" class="h-20 w-20 text-white/30"></i>
            </div>

            <!-- Content -->
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <span
                  class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg"
                  :class="task.task_type === 'TASK_1' ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-white' : 'bg-gradient-to-r from-orange-500 to-red-500 text-white'"
                >
                  {{ taskTypeDisplay[task.task_type] }}
                </span>
                <div class="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-1.5">
                  <i data-feather="type" class="h-3 w-3 text-gray-600"></i>
                  <span class="text-xs font-medium text-gray-700">{{ task.min_words }}+ words</span>
                </div>
              </div>

              <p class="text-sm text-gray-700 mb-5 leading-relaxed line-clamp-3 min-h-[3.75rem]">
                {{ truncateText(task.prompt, 120) }}
              </p>

              <div class="flex items-center text-xs text-gray-500 mb-5 bg-gray-50 rounded-lg px-3 py-2">
                <i data-feather="calendar" class="h-3 w-3 mr-2"></i>
                {{ formatDate(task.created_at) }}
              </div>

                            <!-- Actions with improved styling -->
              <div class="flex items-center gap-3">
                <button
                  @click="openEditModal(task)"
                  class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-semibold bg-orange-50 hover:bg-orange-100 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200"
                  style="color: #E75225; --tw-ring-color: rgba(231, 82, 37, 0.5);"
                >
                  <i data-feather="edit-2" class="h-4 w-4 mr-2"></i>
                  Edit
                </button>
                <button
                  v-if="deleteConfirmId === task.id"
                  @click="deleteTask(task.id)"
                  class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-300 rounded-xl text-sm font-semibold text-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-all duration-200"
                  style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);"
                >
                  <i data-feather="check" class="h-4 w-4 mr-2"></i>
                  Confirm
                </button>
                <button
                  v-else
                  @click="confirmDelete(task.id)"
                  class="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  <i data-feather="trash-2" class="h-4 w-4 mr-2"></i>
                  Delete
                </button>
              </div>
              <button
                v-if="deleteConfirmId === task.id"
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
                      <i data-feather="file-text" class="h-6 w-6 text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-white">
                      {{ isEditMode ? 'Edit Writing Task' : 'Create Writing Task' }}
                    </h3>
                  </div>
                  <button @click="closeModal" class="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200">
                    <i data-feather="x" class="h-6 w-6"></i>
                  </button>
                </div>
              </div>

              <!-- Modal Body -->
              <div class="bg-white px-6 py-6">

                <form @submit.prevent="saveTask" class="space-y-6">
                  <!-- Task Type -->
                  <div class="bg-gradient-to-br from-gray-50 to-orange-50 rounded-2xl p-5 border-2 border-gray-200">
                    <label for="task-type" class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="layers" class="h-4 w-4" style="color: #E75225;"></i>
                      </div>
                      Task Type <span class="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      id="task-type"
                      v-model="formData.task_type"
                      @change="handleTaskTypeChange"
                      class="block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:ring-2 sm:text-sm py-3 px-4 bg-white transition-all duration-200"
                      style="--tw-ring-color: rgba(231, 82, 37, 0.2);"
                      @focus="$event.target.style.borderColor='#E75225'"
                      @blur="$event.target.style.borderColor=''"
                      :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': formErrors.task_type }"
                    >
                      <option value="TASK_1">📊 Task 1 (Report Writing - 150+ words)</option>
                      <option value="TASK_2">✍️ Task 2 (Essay Writing - 250+ words)</option>
                    </select>
                    <p v-if="formErrors.task_type" class="mt-2 text-sm text-red-600 flex items-center">
                      <i data-feather="alert-circle" class="h-4 w-4 mr-1"></i>
                      {{ formErrors.task_type }}
                    </p>
                  </div>

                  <!-- Prompt -->
                  <div>
                    <label for="prompt" class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="edit-3" class="h-4 w-4 text-orange-600"></i>
                      </div>
                      Task Prompt <span class="text-red-500 ml-1">*</span>
                    </label>
                    <textarea
                      id="prompt"
                      v-model="formData.prompt"
                      rows="6"
                      placeholder="Enter the writing task prompt..."
                      class="block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:text-sm py-3 px-4 transition-all duration-200"
                      :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': formErrors.prompt }"
                    ></textarea>
                    <p v-if="formErrors.prompt" class="mt-2 text-sm text-red-600 flex items-center">
                      <i data-feather="alert-circle" class="h-4 w-4 mr-1"></i>
                      {{ formErrors.prompt }}
                    </p>
                  </div>

                  <!-- Minimum Words -->
                  <div>
                    <label for="min-words" class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="type" class="h-4 w-4 color: #E75225;"></i>
                      </div>
                      Minimum Words <span class="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      id="min-words"
                      v-model.number="formData.min_words"
                      min="1"
                      class="block w-full rounded-xl border-2 border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:text-sm py-3 px-4 transition-all duration-200"
                      :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': formErrors.min_words }"
                    />
                    <p v-if="formErrors.min_words" class="mt-2 text-sm text-red-600 flex items-center">
                      <i data-feather="alert-circle" class="h-4 w-4 mr-1"></i>
                      {{ formErrors.min_words }}
                    </p>
                    <p class="mt-2 text-xs text-gray-500 flex items-start">
                      <i data-feather="info" class="h-3 w-3 mr-2 mt-0.5 color: #E75225;"></i>
                      Recommended: Task 1 = 150 words, Task 2 = 250 words
                    </p>
                  </div>

                  <!-- Image Upload with enhanced design -->
                  <div class="rounded-2xl p-5 border-2" style="background: linear-gradient(135deg, rgba(231, 82, 37, 0.05) 0%, rgba(214, 61, 26, 0.05) 100%); border-color: #E75225;">
                    <label class="flex items-center text-sm font-semibold text-gray-800 mb-3">
                      <div class="bg-orange-100 rounded-lg p-1.5 mr-2">
                        <i data-feather="image" class="h-4 w-4" style="color: #E75225;"></i>
                      </div>
                      Task Image (Optional)
                    </label>
                    <p class="text-xs text-gray-600 mb-4 flex items-start">
                      <i data-feather="info" class="h-3 w-3 mr-2 mt-0.5" style="color: #E75225;"></i>
                      Upload charts, graphs, or diagrams for Task 1
                    </p>
                    <div class="mt-1 flex items-center space-x-4">
                      <div v-if="uploadedImagePreview" class="relative group">
                        <img :src="uploadedImagePreview" alt="Preview" class="h-40 w-40 object-cover rounded-2xl border-2 shadow-lg" style="border-color: #E75225;" />
                        <button
                          type="button"
                          @click="removeImage"
                          class="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full p-2 hover:from-red-600 hover:to-red-700 shadow-lg transform hover:scale-110 transition-all duration-200"
                        >
                          <i data-feather="x" class="h-4 w-4"></i>
                        </button>
                      </div>
                      <div v-else class="flex-1">
                        <label class="cursor-pointer group">
                          <div class="border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200" 
                               style="border-color: #E75225;"
                               @mouseenter="$event.currentTarget.style.borderColor='#d63d1a'; $event.currentTarget.style.backgroundColor='rgba(231, 82, 37, 0.05)';"
                               @mouseleave="$event.currentTarget.style.borderColor='#E75225'; $event.currentTarget.style.backgroundColor='transparent';">
                            <div class="rounded-full p-4 w-16 h-16 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" 
                                 style="background: linear-gradient(135deg, #E75225 0%, #d63d1a 100%);">
                              <i data-feather="upload" class="h-8 w-8 text-white"></i>
                            </div>
                            <p class="text-sm font-medium text-gray-700 mb-1">Click to upload image</p>
                            <p class="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                          </div>
                          <input
                            ref="imageInput"
                            type="file"
                            accept="image/*"
                            @change="handleImageUpload"
                            class="sr-only"
                          />
                        </label>
                      </div>
                    </div>
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
                      class="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
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
                        {{ isEditMode ? 'Update Task' : 'Create Task' }}
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
