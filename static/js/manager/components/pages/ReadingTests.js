/**
 * Reading Tests Component
 * Comprehensive reading passage management with enhanced UI and features
 * Includes integrated TestHead (Question Group) management
 */

window.ReadingTests = {
  name: 'ReadingTests',
  data() {
    return {
      passages: [],
      loading: false,
      searchQuery: '',
      currentPage: 1,
      totalPages: 1,
      perPage: 25,
      totalItems: 0,

      // Statistics
      stats: {
        totalPassages: 0,
        totalQuestions: 0,
        passage1Count: 0,
        passage2Count: 0,
        passage3Count: 0,
      },

      // Modal states
      showPassageModal: false,
      showTestHeadModal: false,
      showQuestionBuilderModal: false,

      // Current editing
      editingPassage: null,
      selectedPassage: null,
      selectedTestHead: null,

      // TestHeads for selected passage
      testHeads: [],
      loadingTestHeads: false,

      // Form data
      passageForm: {
        passage_number: 1,
        title: '',
        summary: '',
        content: '',
      },

      testHeadForm: {
        title: '',
        description: '',
        question_type: 'MCQ',
      },

      // Filters
      selectedPassageFilter: null,
      selectedMockTest: null,

      // Passage number options
      passageNumberOptions: [
        { value: 1, label: 'Passage 1' },
        { value: 2, label: 'Passage 2' },
        { value: 3, label: 'Passage 3' },
      ],

      // Question type options
      questionTypeOptions: [
        { value: 'MCQ', label: 'Multiple Choice', icon: 'check-circle' },
        { value: 'MCMA', label: 'Multiple Choice (Multiple Answers)', icon: 'check-square' },
        { value: 'TFNG', label: 'True/False/Not Given', icon: 'list' },
        { value: 'YNNG', label: 'Yes/No/Not Given', icon: 'list' },
        { value: 'MH', label: 'Matching Headings', icon: 'align-left' },
        { value: 'MI', label: 'Matching Information', icon: 'link' },
        { value: 'MF', label: 'Matching Features', icon: 'link-2' },
        { value: 'SUC', label: 'Summary Completion', icon: 'file-text' },
        { value: 'NC', label: 'Note Completion', icon: 'edit-3' },
        { value: 'FC', label: 'Form Completion', icon: 'clipboard' },
        { value: 'TC', label: 'Table Completion', icon: 'grid' },
        { value: 'FCC', label: 'Flow Chart Completion', icon: 'git-merge' },
        { value: 'DL', label: 'Diagram Labeling', icon: 'image' },
        { value: 'SA', label: 'Short Answer', icon: 'edit' },
        { value: 'SC', label: 'Sentence Completion', icon: 'type' },
      ],
    };
  },

  computed: {
    filteredPassages() {
      let filtered = this.passages;

      // Filter by search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(passage =>
          passage.title?.toLowerCase().includes(query) ||
          passage.summary?.toLowerCase().includes(query) ||
          passage.content?.toLowerCase().includes(query)
        );
      }

      // Filter by passage number
      if (this.selectedPassageFilter) {
        filtered = filtered.filter(p => p.passage_number === this.selectedPassageFilter);
      }

      return filtered;
    },

    modalTitle() {
      return this.editingPassage ? 'Edit Reading Passage' : 'New Reading Passage';
    },

    testHeadModalTitle() {
      return this.selectedTestHead ? 'Edit Question Group' : 'New Question Group';
    },

    hasFilters() {
      return this.searchQuery || this.selectedPassageFilter;
    },
  },

  methods: {
    async fetchPassages() {
      this.loading = true;
      try {
        const response = await API.getReadingPassages({
          page: this.currentPage,
          per_page: this.perPage,
        });

        this.passages = response.passages || [];

        if (response.pagination) {
          this.totalPages = response.pagination.total_pages;
          this.currentPage = response.pagination.current_page;
          this.totalItems = response.pagination.total_items;
        }

        // Calculate statistics
        this.calculateStats();
      } catch (error) {
        console.error('Error fetching passages:', error);
        toast.error('Failed to load reading passages', 'Error');
      } finally {
        this.loading = false;
      }
    },

    calculateStats() {
      this.stats.totalPassages = this.passages.length;
      this.stats.passage1Count = this.passages.filter(p => p.passage_number === 1).length;
      this.stats.passage2Count = this.passages.filter(p => p.passage_number === 2).length;
      this.stats.passage3Count = this.passages.filter(p => p.passage_number === 3).length;

      // Calculate total questions
      this.stats.totalQuestions = this.passages.reduce((sum, passage) => {
        const testHeadQuestions = passage.test_heads?.reduce((thSum, th) => {
          return thSum + (th.question_count || 0);
        }, 0) || 0;
        return sum + testHeadQuestions;
      }, 0);
    },

    clearFilters() {
      this.searchQuery = '';
      this.selectedPassageFilter = null;
    },

    async fetchTestHeads(passageId) {
      this.loadingTestHeads = true;
      try {
        const response = await API.getTestHeads({ passage_id: passageId });
        this.testHeads = response.testheads || [];
      } catch (error) {
        console.error('Error fetching test heads:', error);
        toast.error('Failed to load question groups', 'Error');
      } finally {
        this.loadingTestHeads = false;
      }
    },

    openPassageModal(passage = null) {
      // Navigate to the PassageForm page
      if (passage) {
        this.$emit('navigate', `reading-tests/passage/${passage.id}`);
      } else {
        this.$emit('navigate', 'reading-tests/passage/new');
      }
    },

    closePassageModal() {
      // Kept for compatibility - navigate to list view
      this.$emit('navigate', 'reading-tests');
    },

    resetPassageForm() {
      this.passageForm = {
        passage_number: 1,
        title: '',
        summary: '',
        content: '',
      };
    },

    async savePassage() {
      if (!this.passageForm.title || !this.passageForm.content) {
        toast.error('Please fill in all required fields', 'Error');
        return;
      }

      this.loading = true;
      try {
        if (this.editingPassage) {
          await API.updateReadingPassage(this.editingPassage.id, this.passageForm);
          toast.success('Reading passage updated successfully', 'Success');
        } else {
          await API.createReadingPassage(this.passageForm);
          toast.success('Reading passage created successfully', 'Success');
        }

        this.closePassageModal();
        await this.fetchPassages();
      } catch (error) {
        console.error('Error saving passage:', error);
        toast.error('Failed to save reading passage', 'Error');
      } finally {
        this.loading = false;
      }
    },

    async deletePassage(passage) {
      if (!confirm(`Are you sure you want to delete "${passage.title}"?`)) {
        return;
      }

      this.loading = true;
      try {
        await API.deleteReadingPassage(passage.id);
        toast.success('Reading passage deleted successfully', 'Success');
        await this.fetchPassages();
      } catch (error) {
        console.error('Error deleting passage:', error);
        toast.error('Failed to delete reading passage', 'Error');
      } finally {
        this.loading = false;
      }
    },

    async viewPassage(passage) {
      // Navigate to TestHeads page for this passage
      this.$emit('navigate', 'test-heads', {
        passageId: passage.id,
        testType: 'reading'
      });
    },

    backToList() {
      this.selectedPassage = null;
      this.testHeads = [];
    },

    // TestHead methods
    openTestHeadModal(testHead = null) {
      this.selectedTestHead = testHead;

      if (testHead) {
        this.testHeadForm = {
          title: testHead.title || '',
          description: testHead.description || '',
          question_type: testHead.question_type,
        };
      } else {
        this.resetTestHeadForm();
      }

      this.showTestHeadModal = true;
    }, closeTestHeadModal() {
      this.showTestHeadModal = false;
      this.selectedTestHead = null;
      this.resetTestHeadForm();
    },

    resetTestHeadForm() {
      this.testHeadForm = {
        title: '',
        description: '',
        question_type: 'MCQ',
      };
    },

    async saveTestHead() {
      if (!this.testHeadForm.title) {
        toast.error('Please provide a title', 'Error');
        return;
      }

      this.loadingTestHeads = true;
      try {
        const data = {
          ...this.testHeadForm,
          reading: this.selectedPassage.id,
        };

        if (this.selectedTestHead) {
          await API.updateTestHead(this.selectedTestHead.id, data);
          toast.success('Question group updated successfully', 'Success');
        } else {
          await API.createTestHead(data);
          toast.success('Question group created successfully', 'Success');
        }

        this.closeTestHeadModal();
        await this.fetchTestHeads(this.selectedPassage.id);
      } catch (error) {
        console.error('Error saving test head:', error);
        toast.error('Failed to save question group', 'Error');
      } finally {
        this.loadingTestHeads = false;
      }
    }, async deleteTestHead(testHead) {
      if (!confirm(`Are you sure you want to delete "${testHead.title}"?`)) {
        return;
      }

      this.loadingTestHeads = true;
      try {
        await API.deleteTestHead(testHead.id);
        toast.success('Question group deleted successfully', 'Success');
        await this.fetchTestHeads(this.selectedPassage.id);
      } catch (error) {
        console.error('Error deleting test head:', error);
        toast.error('Failed to delete question group', 'Error');
      } finally {
        this.loadingTestHeads = false;
      }
    },

    openQuestionBuilder(testHead) {
      this.selectedTestHead = testHead;
      this.showQuestionBuilderModal = true;
    },

    closeQuestionBuilder() {
      this.showQuestionBuilderModal = false;
      this.selectedTestHead = null;
    },

    handleQuestionsSaved() {
      toast.success('Questions saved successfully', 'Success');
      this.fetchTestHeads(this.selectedPassage.id);
    },

    getPassageLabel(passageNumber) {
      return `Passage ${passageNumber}`;
    }, getQuestionTypeLabel(type) {
      const option = this.questionTypeOptions.find(opt => opt.value === type);
      return option ? option.label : type;
    },

    getQuestionTypeIcon(type) {
      const option = this.questionTypeOptions.find(opt => opt.value === type);
      return option ? option.icon : 'help-circle';
    },

    changePage(page) {
      this.currentPage = page;
      this.fetchPassages();
    },
  },

  mounted() {
    this.fetchPassages();

    // Initialize feather icons
    this.$nextTick(() => {
      if (window.feather) {
        feather.replace();
      }
    });
  },

  template: `
    <div class="">
      <!-- Main Container -->
      <div class="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <!-- Page Header with Stats -->
        <div v-if="!selectedPassage" class="mb-6">
          <!-- Title and Action -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Reading Tests</h1>
              <p class="mt-1 text-sm text-gray-600">Manage reading passages and question groups</p>
            </div>
            <button
              @click="openPassageModal()"
              class="inline-flex items-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <i data-feather="plus" class="h-4 w-4 mr-2"></i>
              New Passage
            </button>
          </div>
          
          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Total Passages -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Passages</p>
                  <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalPassages }}</p>
                </div>
                <div class="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-50">
                  <i data-feather="file-text" class="h-6 w-6 text-orange-600"></i>
                </div>
              </div>
            </div>
            
            <!-- Total Questions -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Questions</p>
                  <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalQuestions }}</p>
                </div>
                <div class="flex items-center justify-center h-12 w-12 rounded-lg bg-green-50">
                  <i data-feather="help-circle" class="h-6 w-6 text-green-600"></i>
                </div>
              </div>
            </div>
            
            <!-- Passage 1 -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" @click="selectedPassageFilter = selectedPassageFilter === 1 ? null : 1">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Passage 1</p>
                  <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.passage1Count }}</p>
                </div>
                <div class="flex items-center justify-center h-12 w-12 rounded-lg" :class="selectedPassageFilter === 1 ? 'bg-purple-100' : 'bg-purple-50'">
                  <span class="text-lg font-bold" :class="selectedPassageFilter === 1 ? 'text-purple-700' : 'text-purple-600'">1</span>
                </div>
              </div>
            </div>
            
            <!-- Passage 2 -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" @click="selectedPassageFilter = selectedPassageFilter === 2 ? null : 2">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Passage 2</p>
                  <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.passage2Count }}</p>
                </div>
                <div class="flex items-center justify-center h-12 w-12 rounded-lg" :class="selectedPassageFilter === 2 ? 'bg-orange-100' : 'bg-orange-50'">
                  <span class="text-lg font-bold" :class="selectedPassageFilter === 2 ? 'text-orange-700' : 'text-orange-600'">2</span>
                </div>
              </div>
            </div>
            
            <!-- Passage 3 -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer" @click="selectedPassageFilter = selectedPassageFilter === 3 ? null : 3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-600">Passage 3</p>
                  <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.passage3Count }}</p>
                </div>
                <div class="flex items-center justify-center h-12 w-12 rounded-lg" :class="selectedPassageFilter === 3 ? 'bg-pink-100' : 'bg-pink-50'">
                  <span class="text-lg font-bold" :class="selectedPassageFilter === 3 ? 'text-pink-700' : 'text-pink-600'">3</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Filters Bar -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div class="flex flex-col sm:flex-row gap-4">
              <!-- Search -->
              <div class="flex-1">
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i data-feather="search" class="h-5 w-5 text-gray-400"></i>
                  </div>
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search passages..."
                    class="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              
              <!-- Passage Number Filter -->
              <div class="sm:w-48">
                <select
                  v-model="selectedPassageFilter"
                  class="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                >
                  <option :value="null">All Passages</option>
                  <option :value="1">Passage 1</option>
                  <option :value="2">Passage 2</option>
                  <option :value="3">Passage 3</option>
                </select>
              </div>
              
              <!-- Apply Button -->
              <button
                v-if="hasFilters"
                @click="clearFilters"
                class="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <i data-feather="x" class="h-4 w-4 mr-2"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
        
        <!-- Passage List View -->
        <div v-if="!selectedPassage">
          <!-- Loading State -->
          <div v-if="loading" class="flex flex-col items-center justify-center py-20">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
            <p class="mt-4 text-sm text-gray-600">Loading passages...</p>
          </div>
          
          <!-- Passages Grid -->
          <div v-else-if="filteredPassages.length > 0" class="grid grid-cols-1 gap-4">
            <div
              v-for="passage in filteredPassages"
              :key="passage.id"
              class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              <div class="p-6">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0 pr-4">
                    <div class="flex items-center gap-3 mb-3">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold" :class="{
                        'bg-orange-100 text-orange-700': passage.passage_number === 1,
                        'bg-green-100 text-green-700': passage.passage_number === 2,
                        'bg-purple-100 text-purple-700': passage.passage_number === 3
                      }">
                        <i data-feather="bookmark" class="h-4 w-4 mr-1.5"></i>
                        Passage {{ passage.passage_number }}
                      </span>
                      <span v-if="passage.word_count" class="inline-flex items-center text-sm text-gray-500">
                        <i data-feather="file-text" class="h-4 w-4 mr-1"></i>
                        {{ passage.word_count }} words
                      </span>
                    </div>
                    
                    <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {{ passage.title || 'Untitled Passage' }}
                    </h3>
                    
                    <p v-if="passage.summary" class="text-sm text-gray-600 line-clamp-2 mb-4">
                      {{ passage.summary }}
                    </p>
                    <p v-else class="text-sm text-gray-600 line-clamp-2 mb-4">
                      {{ passage.content.substring(0, 200) }}...
                    </p>
                    
                    <!-- Test Heads Preview -->
                    <div v-if="passage.test_heads && passage.test_heads.length > 0" class="flex items-center gap-4 text-xs text-gray-500">
                      <span class="inline-flex items-center">
                        <i data-feather="layers" class="h-3.5 w-3.5 mr-1"></i>
                        {{ passage.test_heads.length }} group{{ passage.test_heads.length !== 1 ? 's' : '' }}
                      </span>
                      <span class="inline-flex items-center">
                        <i data-feather="help-circle" class="h-3.5 w-3.5 mr-1"></i>
                        {{ passage.test_heads.reduce((sum, th) => sum + (th.question_count || 0), 0) }} questions
                      </span>
                    </div>
                  </div>
                  
                  <!-- Actions -->
                  <div class="flex items-start gap-2">
                    <button
                      @click="viewPassage(passage)"
                      class="inline-flex items-center px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium rounded-lg transition-colors"
                      title="View Details"
                    >
                      <i data-feather="eye" class="h-4 w-4 mr-1.5"></i>
                      View
                    </button>
                    <button
                      @click="openPassageModal(passage)"
                      class="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <i data-feather="edit-2" class="h-5 w-5"></i>
                    </button>
                    <button
                      @click="deletePassage(passage)"
                      class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <i data-feather="trash-2" class="h-5 w-5"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 py-16">
            <div class="text-center">
              <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <i data-feather="book-open" class="h-8 w-8 text-gray-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">No passages found</h3>
              <p class="text-sm text-gray-600 mb-6">
                {{ hasFilters ? 'Try adjusting your filters' : 'Get started by creating your first reading passage' }}
              </p>
              <button
                v-if="!hasFilters"
                @click="openPassageModal()"
                class="inline-flex items-center px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <i data-feather="plus" class="h-4 w-4 mr-2"></i>
                Create Passage
              </button>
              <button
                v-else
                @click="clearFilters"
                class="inline-flex items-center px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <i data-feather="x" class="h-4 w-4 mr-2"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        
          <!-- Passage Detail View -->
        <div v-else class="space-y-6">
          <!-- Back Button & Header -->
          <div class="flex items-center justify-between">
            <button
              @click="backToList"
              class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <i data-feather="arrow-left" class="h-4 w-4 mr-2"></i>
              Back to Passages
            </button>
            
            <button
              @click="openTestHeadModal()"
              class="inline-flex items-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <i data-feather="plus" class="h-4 w-4 mr-2"></i>
              Add Question Group
            </button>
          </div>
          
          <!-- Passage Info Card -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200">
            <div class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-3">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold" :class="{
                      'bg-orange-100 text-orange-700': selectedPassage.passage_number === 1,
                      'bg-green-100 text-green-700': selectedPassage.passage_number === 2,
                      'bg-purple-100 text-purple-700': selectedPassage.passage_number === 3
                    }">
                      <i data-feather="bookmark" class="h-4 w-4 mr-1.5"></i>
                      Passage {{ selectedPassage.passage_number }}
                    </span>
                    <span v-if="selectedPassage.word_count" class="inline-flex items-center text-sm text-gray-500">
                      <i data-feather="file-text" class="h-4 w-4 mr-1"></i>
                      {{ selectedPassage.word_count }} words
                    </span>
                  </div>
                  <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ selectedPassage.title || 'Untitled Passage' }}</h2>
                  <p v-if="selectedPassage.summary" class="text-sm text-gray-600">
                    {{ selectedPassage.summary }}
                  </p>
                </div>
                <button
                  @click="openPassageModal(selectedPassage)"
                  class="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Edit Passage"
                >
                  <i data-feather="edit-2" class="h-5 w-5"></i>
                </button>
              </div>
              
              <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ selectedPassage.content }}</p>
              </div>
            </div>
          </div>
          
          <!-- Question Groups Section -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Question Groups</h3>
            
            <!-- Loading State -->
            <div v-if="loadingTestHeads" class="bg-white rounded-xl shadow-sm border border-gray-200 py-12">
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-600 border-t-transparent"></div>
                <p class="mt-2 text-sm text-gray-600">Loading question groups...</p>
              </div>
            </div>
            
            <!-- TestHeads List -->
            <div v-else-if="testHeads.length > 0" class="space-y-3">
              <div
                v-for="testHead in testHeads"
                :key="testHead.id"
                class="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
              >
                <div class="p-5">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-3">
                        <div class="flex items-center justify-center h-10 w-10 rounded-lg" :class="{
                          'bg-orange-100': testHead.question_type === 'MCQ' || testHead.question_type === 'MCMA',
                          'bg-green-100': testHead.question_type === 'TFNG' || testHead.question_type === 'YNNG',
                          'bg-purple-100': testHead.question_type?.startsWith('M'),
                          'bg-orange-100': testHead.question_type?.includes('C')
                        }">
                          <i :data-feather="getQuestionTypeIcon(testHead.question_type)" class="h-5 w-5" :class="{
                            'text-orange-600': testHead.question_type === 'MCQ' || testHead.question_type === 'MCMA',
                            'text-green-600': testHead.question_type === 'TFNG' || testHead.question_type === 'YNNG',
                            'text-purple-600': testHead.question_type?.startsWith('M'),
                            'text-orange-600': testHead.question_type?.includes('C')
                          }"></i>
                        </div>
                        <div>
                          <h4 class="text-base font-semibold text-gray-900">{{ testHead.title }}</h4>
                          <p class="text-sm text-gray-500">{{ getQuestionTypeLabel(testHead.question_type) }}</p>
                        </div>
                      </div>
                      
                      <p v-if="testHead.description" class="text-sm text-gray-600 mb-3">
                        {{ testHead.description }}
                      </p>
                      
                      <div class="flex items-center gap-4 text-sm text-gray-500">
                        <span class="inline-flex items-center">
                          <i data-feather="help-circle" class="h-4 w-4 mr-1"></i>
                          {{ testHead.question_count || 0 }} questions
                        </span>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2 ml-4">
                      <button
                        @click="openQuestionBuilder(testHead)"
                        class="inline-flex items-center px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        <i data-feather="edit-3" class="h-4 w-4 mr-1.5"></i>
                        Manage
                      </button>
                      <button
                        @click="openTestHeadModal(testHead)"
                        class="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit Group"
                      >
                        <i data-feather="settings" class="h-4 w-4"></i>
                      </button>
                      <button
                        @click="deleteTestHead(testHead)"
                        class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <i data-feather="trash-2" class="h-4 w-4"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Empty State -->
            <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 py-12">
              <div class="text-center">
                <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                  <i data-feather="list" class="h-8 w-8 text-gray-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No question groups yet</h3>
                <p class="text-sm text-gray-600 mb-6">Create question groups to organize your questions by type.</p>
                <button
                  @click="openTestHeadModal()"
                  class="inline-flex items-center px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  <i data-feather="plus" class="h-4 w-4 mr-2"></i>
                  Add Question Group
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Passage Modal -->
      <div v-if="showPassageModal" class="fixed inset-0 z-50 overflow-y-auto" style="backdrop-filter: blur(2px);">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
          <div class="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50" @click="closePassageModal"></div>
          
          <div class="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-2xl z-10">
            <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-indigo-50">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-gray-900">{{ modalTitle }}</h3>
                <button @click="closePassageModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                  <i data-feather="x" class="h-5 w-5"></i>
                </button>
              </div>
            </div>
            
            <div class="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <!-- Passage Number -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Passage Number <span class="text-red-500">*</span>
                </label>
                <select
                  v-model.number="passageForm.passage_number"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm"
                >
                  <option v-for="opt in passageNumberOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              
              <!-- Title -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="passageForm.title"
                  type="text"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm"
                  placeholder="e.g., The Evolution of Human Language"
                />
              </div>
              
              <!-- Summary -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Summary <span class="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  v-model="passageForm.summary"
                  rows="3"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm"
                  placeholder="A brief overview of the passage topic..."
                ></textarea>
              </div>
              
              <!-- Content -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Passage Content <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="passageForm.content"
                  rows="14"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm font-mono text-xs leading-relaxed"
                  placeholder="Paste the full reading passage text here..."
                ></textarea>
                <p class="mt-2 text-xs text-gray-500">
                  Word count: {{ passageForm.content ? passageForm.content.split(/\s+/).length : 0 }} words
                </p>
              </div>
            </div>
            
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                @click="closePassageModal"
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                @click="savePassage"
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 shadow-sm hover:shadow transition-all"
              >
                <i data-feather="save" class="h-4 w-4 inline mr-1.5"></i>
                {{ editingPassage ? 'Update Passage' : 'Create Passage' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- TestHead Modal -->
      <div v-if="showTestHeadModal" class="fixed inset-0 z-50 overflow-y-auto" style="backdrop-filter: blur(2px);">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
          <div class="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50" @click="closeTestHeadModal"></div>
          
          <div class="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-2xl z-10">
            <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-indigo-50">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-gray-900">{{ testHeadModalTitle }}</h3>
                <button @click="closeTestHeadModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                  <i data-feather="x" class="h-5 w-5"></i>
                </button>
              </div>
            </div>
            
            <div class="px-6 py-6 space-y-5">
              <!-- Title -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="testHeadForm.title"
                  type="text"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm"
                  placeholder="e.g., Questions 1-5"
                />
              </div>
              
              <!-- Description -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span class="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  v-model="testHeadForm.description"
                  rows="3"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm"
                  placeholder="Add instructions or context for this question group..."
                ></textarea>
              </div>
              
              <!-- Question Type -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Question Type <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="testHeadForm.question_type"
                  class="block w-full px-4 py-2.5 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-colors sm:text-sm"
                >
                  <option v-for="opt in questionTypeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p class="mt-2 text-xs text-gray-500">
                  Select the type of questions for this group
                </p>
              </div>
            </div>
            
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                @click="closeTestHeadModal"
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                @click="saveTestHead"
                type="button"
                class="px-5 py-2.5 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 shadow-sm hover:shadow transition-all"
              >
                <i data-feather="save" class="h-4 w-4 inline mr-1.5"></i>
                {{ selectedTestHead ? 'Update Group' : 'Create Group' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Question Builder Modal -->
      <question-builder-component
        v-if="showQuestionBuilderModal && selectedTestHead"
        :testhead-id="selectedTestHead.id"
        :question-type="selectedTestHead.question_type"
        @close="closeQuestionBuilder"
        @saved="handleQuestionsSaved"
      />
    </div>
  `,
};
