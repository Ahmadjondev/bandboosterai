/**
 * Listening Tests Component
 * Comprehensive listening parts management with enhanced UI and features
 * Adapted from BandBooster for seamless integration
 */

window.ListeningTestsComponent = {
  name: 'ListeningTests',

  data() {
    return {
      // Loading states
      loading: true,
      error: null,

      // Data
      parts: [],
      stats: {
        total_parts: 0,
        total_questions: 0,
        part_1_count: 0,
        part_2_count: 0,
        part_3_count: 0,
        part_4_count: 0,
      },

      // Filters
      filters: {
        part: '',
        query: '',
      },

      // Modal states
      showPartModal: false,
      showConfirmModal: false,

      // Current items
      currentPart: null,

      // File upload
      audioFile: null,
      audioFileName: '',
      audioPreviewUrl: null,
      uploadProgress: 0,
      isDragging: false,
      uploading: false,
      removeExistingAudio: false,

      // Confirmation
      confirmTitle: '',
      confirmMessage: '',
      confirmAction: null,

      // Pagination
      currentPage: 1,
      itemsPerPage: 10,
    };
  },

  computed: {
    filteredParts() {
      let result = [...this.parts];

      // Filter by part number
      if (this.filters.part) {
        result = result.filter(p => p.part_number === parseInt(this.filters.part));
      }

      // Filter by search query
      if (this.filters.query) {
        const query = this.filters.query.toLowerCase();
        result = result.filter(p =>
          p.title.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      }

      return result;
    },

    paginatedParts() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredParts.slice(start, end);
    },

    totalPages() {
      return Math.ceil(this.filteredParts.length / this.itemsPerPage);
    },

    hasFilters() {
      return this.filters.part || this.filters.query;
    },

    fileSizeFormatted() {
      if (!this.audioFile) return '';
      const bytes = this.audioFile.size;
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    audioDurationFormatted() {
      if (!this.currentPart?.duration_seconds) return '';
      const seconds = parseInt(this.currentPart.duration_seconds);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
  },

  async mounted() {
    await this.loadData();
    this.initIcons();
  },

  updated() {
    this.$nextTick(() => {
      this.initIcons();
    });
  },

  methods: {
    initIcons() {
      this.$nextTick(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
    },

    async loadData() {
      try {
        this.loading = true;
        this.error = null;

        const response = await fetch('/manager/api/tests/listening/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCookie('csrftoken'),
          },
          credentials: 'same-origin',
        });

        const data = await response.json();

        if (response.ok) {
          this.parts = data.parts || [];
          this.calculateStats();
        } else {
          throw new Error(data.error || 'Failed to load listening parts');
        }

        this.initIcons();
      } catch (err) {
        console.error('Error loading data:', err);
        this.error = err.message || 'Failed to load listening parts';
        if (window.toast) {
          toast.error(this.error, 'Error');
        }
      } finally {
        this.loading = false;
      }
    },

    calculateStats() {
      this.stats.total_parts = this.parts.length;
      this.stats.total_questions = this.parts.reduce((sum, p) => sum + (p.num_questions || 0), 0);
      this.stats.part_1_count = this.parts.filter(p => p.part_number === 1).length;
      this.stats.part_2_count = this.parts.filter(p => p.part_number === 2).length;
      this.stats.part_3_count = this.parts.filter(p => p.part_number === 3).length;
      this.stats.part_4_count = this.parts.filter(p => p.part_number === 4).length;
    },

    applyFilters() {
      this.currentPage = 1;
    },

    clearFilters() {
      this.filters.part = '';
      this.filters.query = '';
      this.currentPage = 1;
    },

    openPartModal(part = null) {
      this.currentPart = part ? { ...part } : {
        title: '',
        part_number: 1,
        description: '',
        duration_seconds: '',
        audio_file: null,
      };
      // Reset file upload state
      this.audioFile = null;
      this.audioFileName = '';
      this.audioPreviewUrl = null;
      this.uploadProgress = 0;
      this.isDragging = false;
      this.uploading = false;
      this.removeExistingAudio = false;
      this.showPartModal = true;
      this.$nextTick(() => {
        this.initIcons();
      });
    },

    closePartModal() {
      if (this.audioPreviewUrl) {
        URL.revokeObjectURL(this.audioPreviewUrl);
      }
      this.showPartModal = false;
      this.currentPart = null;
      this.audioFile = null;
      this.audioFileName = '';
      this.audioPreviewUrl = null;
      this.uploadProgress = 0;
      this.initIcons();
    },

    async savePart() {
      try {
        this.uploading = true;
        const isEdit = !!this.currentPart.id;
        const endpoint = isEdit
          ? `/manager/api/tests/listening/${this.currentPart.id}/update/`
          : '/manager/api/tests/listening/create/';

        let response;

        // If there's a new audio file or removing existing audio, use FormData
        if (this.audioFile || this.removeExistingAudio) {
          const formData = new FormData();
          formData.append('title', this.currentPart.title);
          formData.append('part_number', this.currentPart.part_number);
          formData.append('description', this.currentPart.description || '');

          if (this.audioFile) {
            formData.append('audio_file', this.audioFile);
          } else if (this.removeExistingAudio) {
            formData.append('audio_file', '');
          }

          if (this.currentPart.duration_seconds) {
            formData.append('duration_seconds', this.currentPart.duration_seconds);
          }

          response = await this.uploadWithProgress(endpoint, formData, isEdit);
        } else {
          // No new file - JSON request
          const method = isEdit ? 'PUT' : 'POST';
          const partData = {
            title: this.currentPart.title,
            part_number: this.currentPart.part_number,
            description: this.currentPart.description || '',
          };

          if (this.currentPart.duration_seconds) {
            partData.duration_seconds = this.currentPart.duration_seconds;
          }

          response = await fetch(endpoint, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': this.getCookie('csrftoken'),
            },
            credentials: 'same-origin',
            body: JSON.stringify(partData),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to save part');
          }
        }

        // Show success notification
        if (window.showToast) {
          window.showToast(
            isEdit ? 'Listening part updated successfully!' : 'Listening part created successfully!',
            'success'
          );
        }
        this.closePartModal();
        await this.loadData();
      } catch (err) {
        console.error('Error saving part:', err);
        if (window.showToast) {
          window.showToast(err.message || 'Failed to save part', 'error');
        }
      } finally {
        this.uploading = false;
        this.uploadProgress = 0;
      }
    },

    async uploadWithProgress(endpoint, formData, isEdit) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            this.uploadProgress = Math.round((e.loaded / e.total) * 100);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open(isEdit ? 'PUT' : 'POST', endpoint);
        xhr.setRequestHeader('X-CSRFToken', this.getCookie('csrftoken'));
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },

    // File handling methods
    handleFileSelect(event) {
      const file = event.target.files[0];
      this.processFile(file);
    },

    handleDrop(event) {
      event.preventDefault();
      this.isDragging = false;
      const file = event.dataTransfer.files[0];
      this.processFile(file);
    },

    handleDragOver(event) {
      event.preventDefault();
      this.isDragging = true;
    },

    handleDragLeave() {
      this.isDragging = false;
    },

    processFile(file) {
      if (!file) return;

      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      const isValidType = validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|m4a)$/i);

      if (!isValidType) {
        if (window.toast) {
          toast.error('Invalid file type. Please select an audio file.', 'Error');
        }
        return;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        if (window.toast) {
          toast.error('File is too large. Maximum size is 50MB.', 'Error');
        }
        return;
      }

      this.audioFile = file;
      this.audioFileName = file.name;
      this.removeExistingAudio = false;
      this.audioPreviewUrl = URL.createObjectURL(file);
      this.getAudioDuration(file);
    },

    getAudioDuration(file) {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.floor(audio.duration);
        this.currentPart.duration_seconds = duration.toString();
      });

      audio.addEventListener('error', () => {
        console.warn('Could not load audio metadata');
      });
    },

    removeFile() {
      if (this.audioPreviewUrl) {
        URL.revokeObjectURL(this.audioPreviewUrl);
      }
      this.audioFile = null;
      this.audioFileName = '';
      this.audioPreviewUrl = null;
      this.uploadProgress = 0;
    },

    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    navigateToGroups(part) {
      // Navigate to TestHeads page with listening part context
      if (this.$root && this.$root.navigateTo) {
        this.$root.navigateTo('test-heads', {
          testType: 'listening',
          listeningPartId: part.id
        });
      }
    },

    confirmDelete(part) {
      this.confirmTitle = 'Delete Listening Part';
      this.confirmMessage = `Are you sure you want to delete "${part.title}"? This will also delete all associated question groups and questions. This action cannot be undone.`;
      this.confirmAction = async () => {
        try {
          const response = await fetch(`/manager/api/tests/listening/${part.id}/delete/`, {
            method: 'DELETE',
            headers: {
              'X-CSRFToken': this.getCookie('csrftoken'),
            },
            credentials: 'same-origin',
          });

          if (response.ok) {
            if (window.toast) {
              toast.success('Listening part deleted successfully', 'Success');
            }
            await this.loadData();
          } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete part');
          }
        } catch (err) {
          console.error('Error deleting part:', err);
          if (window.toast) {
            toast.error(err.message || 'Failed to delete part', 'Error');
          }
        }
      };
      this.showConfirmModal = true;
    },

    handleConfirm() {
      this.showConfirmModal = false;
      if (this.confirmAction) {
        this.confirmAction();
      }
    },

    getPartNumberBadge(number) {
      const badges = {
        1: 'bg-orange-100 text-orange-800',
        2: 'bg-purple-100 text-purple-800',
        3: 'bg-amber-100 text-amber-800',
        4: 'bg-emerald-100 text-emerald-800',
      };
      return badges[number] || badges[1];
    },

    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    changePage(page) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    getCookie(name) {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    },
  },

  template: `
        <div class="px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900">Listening Tests</h2>
                    <p class="text-sm text-slate-500 mt-1">Manage listening parts and question groups</p>
                </div>
                <button @click="openPartModal()" class="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm">
                    <i data-feather="plus" class="w-4 h-4"></i>
                    New Listening Part
                </button>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                <div class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <i data-feather="headphones" class="w-5 h-5 text-orange-700"></i>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Total Parts</p>
                            <p class="text-xl font-bold text-slate-900">{{ stats.total_parts }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <i data-feather="help-circle" class="w-5 h-5 text-slate-700"></i>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Questions</p>
                            <p class="text-xl font-bold text-slate-900">{{ stats.total_questions }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                            <span class="text-sm font-bold text-orange-700">1</span>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Part 1</p>
                            <p class="text-xl font-bold text-slate-900">{{ stats.part_1_count }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                            <span class="text-sm font-bold text-purple-700">2</span>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Part 2</p>
                            <p class="text-xl font-bold text-slate-900">{{ stats.part_2_count }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                            <span class="text-sm font-bold text-amber-700">3</span>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Part 3</p>
                            <p class="text-xl font-bold text-slate-900">{{ stats.part_3_count }}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <span class="text-sm font-bold text-emerald-700">4</span>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Part 4</p>
                            <p class="text-xl font-bold text-slate-900">{{ stats.part_4_count }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="bg-white rounded-lg border border-slate-200 p-4 mb-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Part Number</label>
                        <select v-model="filters.part" @change="applyFilters" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                            <option value="">All Parts</option>
                            <option value="1">Part 1</option>
                            <option value="2">Part 2</option>
                            <option value="3">Part 3</option>
                            <option value="4">Part 4</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-slate-600 mb-1.5">Search</label>
                        <input 
                            v-model="filters.query" 
                            @input="applyFilters"
                            type="text" 
                            placeholder="Search parts..."
                            class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                    </div>

                    <div class="flex items-end">
                        <button v-if="hasFilters" @click="clearFilters" class="w-full px-4 py-2 text-sm font-medium bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-20">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg">
                <div class="flex items-center gap-2">
                    <i data-feather="alert-circle" class="w-5 h-5"></i>
                    <span>{{ error }}</span>
                </div>
            </div>

            <!-- Parts List -->
            <div v-else>
                <div v-if="filteredParts.length === 0" class="text-center py-16 bg-white rounded-lg border border-slate-200">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-feather="headphones" class="w-8 h-8 text-slate-400"></i>
                    </div>
                    <p class="text-lg font-medium text-slate-900 mb-1">No listening parts found</p>
                    <p class="text-sm text-slate-500 mb-4">{{ hasFilters ? 'Try adjusting your filters' : 'Create your first listening part to get started' }}</p>
                    <button v-if="!hasFilters" @click="openPartModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                        <i data-feather="plus" class="w-4 h-4"></i>
                        Create Listening Part
                    </button>
                </div>

                <div v-else class="space-y-3">
                    <!-- Part Cards -->
                    <div v-for="part in paginatedParts" :key="part.id" 
                         class="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-all hover:shadow-sm">
                        <div class="p-5">
                            <div class="flex items-start justify-between gap-4 mb-3">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                                        <h3 class="text-base font-semibold text-slate-900">{{ part.title }}</h3>
                                        <span :class="getPartNumberBadge(part.part_number)" 
                                              class="px-2 py-0.5 text-xs font-medium rounded">
                                            Part {{ part.part_number }}
                                        </span>
                                    </div>
                                    <p v-if="part.description" class="text-sm text-slate-600 mb-2 line-clamp-2">{{ part.description }}</p>
                                    <div class="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                        <span class="flex items-center gap-1">
                                            <i data-feather="list" class="w-3.5 h-3.5"></i>
                                            {{ part.num_heads || 0 }} groups
                                        </span>
                                        <span class="flex items-center gap-1">
                                            <i data-feather="help-circle" class="w-3.5 h-3.5"></i>
                                            {{ part.num_questions || 0 }} questions
                                        </span>
                                        <span v-if="part.audio_file" class="flex items-center gap-1 text-orange-600">
                                            <i data-feather="volume-2" class="w-3.5 h-3.5"></i>
                                            Audio available
                                        </span>
                                        <span class="flex items-center gap-1">
                                            <i data-feather="calendar" class="w-3.5 h-3.5"></i>
                                            {{ formatDate(part.created_at) }}
                                        </span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 flex-shrink-0">
                                    <button @click="navigateToGroups(part)" 
                                            class="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="Manage Question Groups">
                                        <i data-feather="list" class="w-4 h-4"></i>
                                    </button>
                                    <button @click="openPartModal(part)" 
                                            class="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="Edit Part">
                                        <i data-feather="edit-2" class="w-4 h-4"></i>
                                    </button>
                                    <button @click="confirmDelete(part)" 
                                            class="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete Part">
                                        <i data-feather="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
                        <button 
                            @click="changePage(currentPage - 1)" 
                            :disabled="currentPage === 1"
                            class="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <i data-feather="chevron-left" class="w-4 h-4"></i>
                            Previous
                        </button>

                        <div class="flex items-center gap-1">
                            <button 
                                v-for="page in totalPages" 
                                :key="page"
                                v-if="page <= 5 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
                                @click="changePage(page)"
                                :class="page === currentPage ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 hover:bg-slate-50'"
                                class="w-9 h-9 flex items-center justify-center border border-slate-300 rounded-lg text-sm font-medium transition-colors"
                            >
                                {{ page }}
                            </button>
                        </div>

                        <button 
                            @click="changePage(currentPage + 1)" 
                            :disabled="currentPage === totalPages"
                            class="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <i data-feather="chevron-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Part Modal -->
            <div v-if="showPartModal" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closePartModal">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                    <div class="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" @click="closePartModal"></div>

                    <div class="relative inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-xl">
                        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                            <h3 class="text-lg font-semibold text-slate-900">
                                {{ currentPart.id ? 'Edit Listening Part' : 'New Listening Part' }}
                            </h3>
                            <button @click="closePartModal" class="text-slate-400 hover:text-slate-600 transition-colors">
                                <i data-feather="x" class="w-5 h-5"></i>
                            </button>
                        </div>

                        <div class="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Title <span class="text-rose-600">*</span></label>
                                <input 
                                    v-model="currentPart.title" 
                                    type="text" 
                                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="e.g., A Day at the Beach"
                                    required
                                >
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Part Number <span class="text-rose-600">*</span></label>
                                <select v-model.number="currentPart.part_number" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                                    <option :value="1">Part 1</option>
                                    <option :value="2">Part 2</option>
                                    <option :value="3">Part 3</option>
                                    <option :value="4">Part 4</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Description <span class="text-slate-500">(optional)</span></label>
                                <textarea 
                                    v-model="currentPart.description" 
                                    rows="3"
                                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Brief description or context..."
                                ></textarea>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">Duration (seconds) <span class="text-slate-500">(optional)</span></label>
                                <div class="flex items-center gap-2">
                                    <input 
                                        v-model.number="currentPart.duration_seconds" 
                                        type="number" 
                                        min="0"
                                        step="1"
                                        placeholder="e.g., 180"
                                        class="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                    <span v-if="audioDurationFormatted" class="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-mono text-sm">
                                        {{ audioDurationFormatted }}
                                    </span>
                                </div>
                            </div>

                            <!-- Audio File Upload -->
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-2">
                                    Audio File
                                    <span v-if="currentPart.id && currentPart.audio_file && !audioFile" class="text-slate-500">(keep existing or upload new)</span>
                                    <span v-else class="text-slate-500">(optional)</span>
                                </label>

                                <!-- Current Audio -->
                                <div v-if="currentPart.id && currentPart.audio_file && !audioFile && !removeExistingAudio" class="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div class="flex items-center gap-2">
                                        <i data-feather="music" class="w-4 h-4 text-orange-600"></i>
                                        <span class="text-sm text-orange-700 flex-1">Current audio file exists</span>
                                        <button 
                                            @click="removeExistingAudio = true"
                                            type="button"
                                            class="text-sm text-rose-600 hover:text-rose-700 font-medium"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                <!-- Removed Notice -->
                                <div v-if="removeExistingAudio && !audioFile" class="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                                    <div class="flex items-center gap-2">
                                        <i data-feather="alert-circle" class="w-4 h-4 text-rose-600"></i>
                                        <span class="text-sm text-rose-700 flex-1">Audio file will be removed</span>
                                        <button 
                                            @click="removeExistingAudio = false"
                                            type="button"
                                            class="text-sm text-rose-600 hover:text-rose-700 font-medium"
                                        >
                                            Undo
                                        </button>
                                    </div>
                                </div>

                                <!-- Upload Area -->
                                <div v-if="!audioFile && !removeExistingAudio" 
                                     @drop="handleDrop"
                                     @dragover="handleDragOver"
                                     @dragleave="handleDragLeave"
                                     :class="[
                                         isDragging ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50'
                                     ]"
                                     class="border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:border-orange-400"
                                     @click="triggerFileInput">
                                    <div class="flex flex-col items-center">
                                        <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                                            <i data-feather="upload-cloud" class="w-6 h-6 text-orange-600"></i>
                                        </div>
                                        <p class="text-sm font-medium text-slate-900 mb-1">
                                            {{ isDragging ? 'Drop audio file here' : 'Upload Audio File' }}
                                        </p>
                                        <p class="text-xs text-slate-500 mb-2">
                                            Drag and drop or click to browse
                                        </p>
                                        <div class="flex items-center gap-2 text-xs text-slate-400">
                                            <span>MP3, WAV, OGG, M4A</span>
                                            <span>•</span>
                                            <span>Max 50MB</span>
                                        </div>
                                    </div>
                                    <input 
                                        ref="fileInput"
                                        type="file" 
                                        accept="audio/*,.mp3,.wav,.ogg,.m4a"
                                        @change="handleFileSelect"
                                        class="hidden"
                                    >
                                </div>

                                <!-- File Preview -->
                                <div v-else-if="audioFile" class="border border-slate-300 rounded-lg p-4 bg-white">
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <i data-feather="music" class="w-5 h-5 text-orange-600"></i>
                                        </div>

                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-start justify-between gap-2 mb-2">
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-sm font-medium text-slate-900 truncate">{{ audioFileName }}</p>
                                                    <p class="text-xs text-slate-500">{{ fileSizeFormatted }}</p>
                                                </div>
                                                <button 
                                                    @click="removeFile"
                                                    type="button"
                                                    class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                    title="Remove file">
                                                    <i data-feather="x" class="w-4 h-4"></i>
                                                </button>
                                            </div>

                                            <!-- Audio Player -->
                                            <audio v-if="audioPreviewUrl" controls class="w-full">
                                                <source :src="audioPreviewUrl" type="audio/mpeg">
                                            </audio>

                                            <!-- Upload Progress -->
                                            <div v-if="uploading && uploadProgress > 0" class="mt-3">
                                                <div class="flex items-center justify-between text-xs text-slate-600 mb-1">
                                                    <span>Uploading...</span>
                                                    <span class="font-medium">{{ uploadProgress }}%</span>
                                                </div>
                                                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        class="bg-orange-600 h-2 rounded-full transition-all duration-300"
                                                        :style="{ width: uploadProgress + '%' }"
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <button 
                                @click="closePartModal" 
                                :disabled="uploading"
                                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                Cancel
                            </button>
                            <button 
                                @click="savePart" 
                                :disabled="uploading || !currentPart.title"
                                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                                <span v-if="uploading" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                <i v-else data-feather="check" class="w-4 h-4"></i>
                                {{ uploading ? 'Saving...' : (currentPart.id ? 'Update Part' : 'Create Part') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Confirmation Modal -->
            <div v-if="showConfirmModal" class="fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                    <div class="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" @click="showConfirmModal = false"></div>

                    <div class="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-xl">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                                <i data-feather="alert-triangle" class="w-5 h-5 text-rose-600"></i>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-slate-900 mb-2">{{ confirmTitle }}</h3>
                                <p class="text-sm text-slate-600">{{ confirmMessage }}</p>
                            </div>
                        </div>

                        <div class="flex justify-end gap-3 mt-6">
                            <button 
                                @click="showConfirmModal = false" 
                                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button 
                                @click="handleConfirm" 
                                class="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
};
