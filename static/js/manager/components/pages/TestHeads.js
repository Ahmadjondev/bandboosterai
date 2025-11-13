/**
 * TestHeads (Question Groups) Component
 * Manage question groups for reading passages and listening parts
 */

window.TestHeads = {
  name: 'TestHeads',
  props: {
    passageId: {
      type: Number,
      default: null
    },
    listeningPartId: {
      type: Number,
      default: null
    },
    testType: {
      type: String,
      default: 'reading', // 'reading' or 'listening'
      validator: value => ['reading', 'listening'].includes(value)
    }
  },
  data() {
    return {
      passage: null,
      listeningPart: null,
      testHeads: [],
      loading: false,
      loadingTestHeads: false,

      // Statistics
      stats: {
        totalGroups: 0,
        totalQuestions: 0,
      },

      // Modal states
      showTestHeadModal: false,
      showQuestionBuilderModal: false,

      // Current editing
      editingTestHead: null,
      selectedTestHead: null,

      // Form data
      testHeadForm: {
        title: '',
        description: '',
        question_type: 'MCQ',
        question_data: null,
      },

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
    testHeadModalTitle() {
      return this.editingTestHead ? 'Edit Question Group' : 'New Question Group';
    },

    parentTitle() {
      if (this.testType === 'reading' && this.passage) {
        return this.passage.title || 'Untitled Passage';
      } else if (this.testType === 'listening' && this.listeningPart) {
        return this.listeningPart.title || `Part ${this.listeningPart.part_number}`;
      }
      return 'Unknown';
    },

    parentSubtitle() {
      if (this.testType === 'reading' && this.passage) {
        return `Passage ${this.passage.passage_number}`;
      } else if (this.testType === 'listening' && this.listeningPart) {
        return `Listening Part ${this.listeningPart.part_number}`;
      }
      return '';
    },
  },

  mounted() {
    this.loadData();
    this.$nextTick(() => {
      if (typeof FeatherUtils !== 'undefined') {
        FeatherUtils.replace();
      }
    });
  },

  methods: {
    async loadData() {
      this.loading = true;
      try {
        if (this.testType === 'reading' && this.passageId) {
          await this.fetchPassage();
          await this.fetchTestHeads();
        } else if (this.testType === 'listening' && this.listeningPartId) {
          await this.fetchListeningPart();
          await this.fetchTestHeads();
        }
      } catch (error) {
        toast.error('Error loading data:', 'Error');
        if (window.toast) {
          toast.error('Failed to load data', 'Error');
        }
      } finally {
        this.loading = false;
      }
    },

    async fetchPassage() {
      try {
        const response = await API.getReadingPassage(this.passageId);
        this.passage = response.passage || response;
      } catch (error) {
        toast.error('Error fetching passage:', 'Error');
        throw error;
      }
    },

    async fetchListeningPart() {
      try {
        const response = await API.getListeningPart(this.listeningPartId);
        this.listeningPart = response.listening_part || response;
      } catch (error) {
        toast.error('Error fetching listening part:', 'Error');
        throw error;
      }
    },

    async fetchTestHeads() {
      this.loadingTestHeads = true;
      try {
        const params = {};
        if (this.testType === 'reading') {
          params.passage_id = this.passageId;
        } else if (this.testType === 'listening') {
          params.part_id = this.listeningPartId;
        }

        const response = await API.getTestHeads(params);
        this.testHeads = (response.testheads || []).map(th => ({
          ...th,
          expanded: false,
        }));
        this.updateStats();
      } catch (error) {
        toast.error('Error fetching test heads:', 'Error');
        if (window.toast) {
          toast.error('Failed to load question groups', 'Error');
        }
      } finally {
        this.loadingTestHeads = false;
      }
    },

    updateStats() {
      this.stats.totalGroups = this.testHeads.length;
      this.stats.totalQuestions = this.testHeads.reduce((sum, th) => sum + (th.question_count || 0), 0);
    },

    // Navigation
    backToParent() {
      if (this.testType === 'reading') {
        this.$root.navigateTo('reading-tests');
      } else if (this.testType === 'listening') {
        this.$root.navigateTo('listening-tests');
      }
    },

    // TestHead Modal methods
    openTestHeadModal(testHead = null) {
      this.editingTestHead = testHead;
      if (testHead) {
        this.testHeadForm = {
          title: testHead.title,
          description: testHead.description,
          question_type: testHead.question_type,
          question_data: testHead.question_data ? JSON.stringify(testHead.question_data, null, 2) : null,
        };
      } else {
        this.testHeadForm = {
          title: '',
          description: '',
          question_type: 'MCQ',
          question_data: null,
        };
      }
      this.showTestHeadModal = true;
      this.$nextTick(() => {
        if (typeof FeatherUtils !== 'undefined') {
          FeatherUtils.replace();
        }
      });
    },

    closeTestHeadModal() {
      this.showTestHeadModal = false;
      this.editingTestHead = null;
    },

    async saveTestHead() {
      try {
        const data = {
          title: this.testHeadForm.title,
          description: this.testHeadForm.description,
          question_type: this.testHeadForm.question_type,
        };

        // Parse question_data if provided
        if (this.testHeadForm.question_data && this.testHeadForm.question_data.trim()) {
          try {
            data.question_data = JSON.parse(this.testHeadForm.question_data);
          } catch (e) {
            if (window.toast) {
              toast.error('Invalid JSON format in Question Data', 'Error');
            }
            return;
          }
        }

        if (this.testType === 'reading') {
          data.passage_id = this.passageId;
        } else if (this.testType === 'listening') {
          data.part_id = this.listeningPartId;
        }

        if (this.editingTestHead) {
          await API.updateTestHead(this.editingTestHead.id, data);
          if (window.toast) {
            toast.success('Question group updated successfully', 'Success');
          }
        } else {
          await API.createTestHead(data);
          if (window.toast) {
            toast.success('Question group created successfully', 'Success');
          }
        }

        await this.fetchTestHeads();
        this.closeTestHeadModal();
      } catch (error) {
        toast.error('Error saving test head:', 'Error');
        if (window.toast) {
          toast.error(error.message || 'Failed to save question group', 'Error');
        }
      }
    },

    async deleteTestHead(testHead) {
      if (!confirm(`Are you sure you want to delete "${testHead.title}"? This will also delete all questions in this group.`)) {
        return;
      }

      try {
        await API.deleteTestHead(testHead.id);
        if (window.toast) {
          toast.success('Question group deleted successfully', 'Success');
        }
        await this.fetchTestHeads();
      } catch (error) {
        toast.error('Error deleting test head:', 'Error');
        if (window.toast) {
          toast.error(error.message || 'Failed to delete question group', 'Error');
        }
      }
    },

    // Question Builder methods
    openQuestionBuilder(testHead) {
      // Navigate to Question Builder page with testHead context
      if (testHead && testHead.id) {
        // Store testHead info in sessionStorage for the QuestionBuilder to use
        sessionStorage.setItem('editingTestHeadId', testHead.id);
        sessionStorage.setItem('editingQuestionType', testHead.question_type);
        sessionStorage.setItem('filterPassageId', this.passageId || '');
        sessionStorage.setItem('filterListeningPartId', this.listeningPartId || '');
      }
      // Navigate to question-builder page
      this.$root.navigateTo('question-builder');
    },

    createNewQuestionGroup() {
      // Navigate to Question Builder page to create new group
      // Clear any existing editing context
      sessionStorage.removeItem('editingTestHeadId');
      sessionStorage.removeItem('editingQuestionType');
      // Set passage/listening part context
      if (this.testType === 'reading' && this.passageId) {
        sessionStorage.setItem('filterPassageId', this.passageId);
        sessionStorage.removeItem('filterListeningPartId');
      } else if (this.testType === 'listening' && this.listeningPartId) {
        sessionStorage.setItem('filterListeningPartId', this.listeningPartId);
        sessionStorage.removeItem('filterPassageId');
      }
      // Navigate to question-builder page
      this.$root.navigateTo('question-builder');
    },

    closeQuestionBuilder() {
      this.showQuestionBuilderModal = false;
      this.selectedTestHead = null;
      this.fetchTestHeads(); // Refresh to get updated question counts
    },

    getQuestionTypeLabel(type) {
      const option = this.questionTypeOptions.find(opt => opt.value === type);
      return option ? option.label : type;
    },

    getQuestionTypeIcon(type) {
      const option = this.questionTypeOptions.find(opt => opt.value === type);
      return option ? option.icon : 'help-circle';
    },

    formatQuestionRange(testHead) {
      if (!testHead.questions || testHead.questions.length === 0) {
        return 'No questions';
      }
      console.log(testHead.questions);
      const numbers = testHead.questions.map(q => q.order).sort((a, b) => a - b);
      if (numbers.length === 1) {
        return `Question ${numbers[0]}`;
      }
      return `Questions ${numbers[0]}-${numbers[numbers.length - 1]}`;
    },

    // Visual rendering helpers for question_data
    hasQuestionData(testHead) {
      if (!testHead || !testHead.question_data) return false;
      const data = testHead.question_data;

      // Check if question_data has any meaningful content
      if (typeof data !== 'object') return false;

      // Check for specific properties based on question type
      const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
      const hasOptions = data.options && Array.isArray(data.options) && data.options.length > 0;
      const hasText = data.text && typeof data.text === 'string' && data.text.length > 0;
      const hasTitle = data.title && typeof data.title === 'string';

      return hasItems || hasOptions || hasText || hasTitle;
    },

    renderQuestionDataTitle(questionData) {
      return questionData.title || null;
    },

    renderQuestionDataText(text) {
      if (!text) return '';
      // Replace <input> tags with visible placeholders
      let result = String(text);

      // Replace input tags with numbered placeholders
      let counter = 0;
      result = result.replace(/<input(?:\([^)]*\))?>/g, () => {
        counter++;
        return `<span class="inline-block min-w-[80px] h-6 border-b-2 border-orange-400 mx-1 align-bottom"></span>`;
      });

      return result;
    },

    renderQuestionDataItems(items) {
      if (!items || !Array.isArray(items)) return [];
      return items.map(item => {
        if (typeof item === 'string') {
          return this.renderQuestionDataText(item);
        } else if (item && typeof item === 'object') {
          // Handle object items (e.g., structured data)
          if (item.text) {
            return this.renderQuestionDataText(item.text);
          }
          return JSON.stringify(item);
        }
        return String(item || '');
      });
    },

    renderQuestionDataOptions(options) {
      if (!options || !Array.isArray(options)) return [];
      return options.map(option => {
        if (typeof option === 'string') {
          return { text: option, label: '' };
        }
        return option;
      });
    },

    renderTableData(items) {
      if (!items || !Array.isArray(items)) return [];
      return items.map(row => {
        if (Array.isArray(row)) {
          return row.map(cell => {
            if (Array.isArray(cell)) {
              return cell.map(c => this.renderQuestionDataText(String(c))).join('<br>');
            }
            return this.renderQuestionDataText(String(cell || ''));
          });
        }
        // Single value row
        return [this.renderQuestionDataText(String(row || ''))];
      });
    },

    getQuestionTypeNeedsData(type) {
      return ['NC', 'FC', 'TC', 'SUC', 'MF', 'MI', 'MH', 'MCMA', 'FCC'].includes(type);
    },

    shouldShowQuestionDataSection(testHead) {
      console.log(testHead);
      console.log(testHead.question_data);
      console.log(this.hasQuestionData(testHead) && this.getQuestionTypeNeedsData(testHead.question_type));
      return this.getQuestionTypeNeedsData(testHead.question_type);
    },

    getQuestionDataExample(questionType) {
      const examples = {
        'NC': {
          title: "Notes on...",
          items: [
            "Location: <input>",
            "Opening hours: <input>",
            "Cost: <input> per hour"
          ]
        },
        'FC': {
          title: "Application Form",
          items: [
            "Full Name: <input>",
            "Address: <input>",
            "Phone: <input>"
          ]
        },
        'TC': {
          title: "Table Title",
          items: [
            ["Header 1", "Header 2", "Header 3"],
            ["Row 1 Data", "<input>", "Data"],
            ["<input>", "Row 2 Data", "<input>"]
          ]
        },
        'SUC': {
          title: "Summary",
          text: "The process begins with <input> which leads to <input>.",
          blankCount: 2
        },
        'MF': {
          options: [
            { label: "A", text: "Option A description" },
            { label: "B", text: "Option B description" },
            { label: "C", text: "Option C description" }
          ]
        },
        'MI': {
          options: [
            { label: "A", text: "Information A" },
            { label: "B", text: "Information B" },
            { label: "C", text: "Information C" }
          ]
        },
        'MH': {
          options: [
            { label: "i", text: "Heading option i" },
            { label: "ii", text: "Heading option ii" },
            { label: "iii", text: "Heading option iii" }
          ]
        },
        'MCMA': {
          options: [
            { label: "A", text: "Choice A" },
            { label: "B", text: "Choice B" },
            { label: "C", text: "Choice C" },
            { label: "D", text: "Choice D" }
          ]
        },
        'FCC': {
          options: [
            { label: "A", text: "Step A" },
            { label: "B", text: "Step B" },
            { label: "C", text: "Step C" },
            { label: "D", text: "Step D" }
          ]
        }
      };
      return examples[questionType] || null;
    },

    insertExampleData() {
      const example = this.getQuestionDataExample(this.testHeadForm.question_type);
      if (example) {
        this.testHeadForm.question_data = JSON.stringify(example, null, 2);
      }
    },

    showsQuestionDataField() {
      return this.getQuestionTypeNeedsData(this.testHeadForm.question_type);
    },
  },

  template: `
    <div class="space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
        <p class="mt-4 text-sm text-gray-600">Loading...</p>
      </div>

      <!-- Main Content -->
      <template v-else>
        <!-- Header -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-6">
            <button
              @click="backToParent"
              class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <i data-feather="arrow-left" class="h-4 w-4 mr-2"></i>
              {{ testType === 'reading' ? 'Reading Tests' : 'Listening Tests' }}
            </button>
            
            <button
              @click="createNewQuestionGroup"
              class="inline-flex items-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <i data-feather="plus" class="h-4 w-4 mr-2"></i>
              Question Builder
            </button>
          </div>

          <!-- Passage/Part Info -->
          <div class="flex items-start gap-4">
            <div class="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 flex-shrink-0">
              <i :data-feather="testType === 'reading' ? 'book-open' : 'headphones'" class="h-6 w-6 text-orange-600"></i>
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-1">Question Groups</h1>
              <p class="text-sm text-gray-600">Manage question groups for {{ parentTitle }}</p>
              <div class="mt-2">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                  {{ parentSubtitle }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Question Groups -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Question Groups</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalGroups }}</p>
              </div>
              <div class="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100">
                <i data-feather="layers" class="h-6 w-6 text-orange-600"></i>
              </div>
            </div>
          </div>

          <!-- Total Questions -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Total Questions</p>
                <p class="text-3xl font-bold text-gray-900">{{ stats.totalQuestions }}</p>
              </div>
              <div class="flex items-center justify-center h-12 w-12 rounded-lg bg-emerald-100">
                <i data-feather="help-circle" class="h-6 w-6 text-emerald-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Question Groups List -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200">
          <!-- Loading State -->
          <div v-if="loadingTestHeads" class="flex flex-col items-center justify-center py-16">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent"></div>
            <p class="mt-4 text-sm text-gray-600">Loading question groups...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="testHeads.length === 0" class="py-16">
            <div class="text-center">
              <div class="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <i data-feather="layers" class="h-8 w-8 text-gray-400"></i>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">No question groups yet</h3>
              <p class="text-sm text-gray-600 mb-6">Create your first question group to get started</p>
              <button
                @click="openTestHeadModal()"
                class="inline-flex items-center px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <i data-feather="plus" class="h-4 w-4 mr-2"></i>
                Create Question Group
              </button>
            </div>
          </div>

          <!-- Groups List -->
          <div v-else class="divide-y divide-gray-200">
            <div
              v-for="(testHead, index) in testHeads"
              :key="testHead.id"
              class="p-6 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-start gap-4">
                <!-- Expand Icon -->
                <div class="flex-shrink-0 pt-1">
                  <button
                    @click="testHead.expanded = !testHead.expanded"
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i :data-feather="testHead.expanded ? 'chevron-down' : 'chevron-right'" class="h-5 w-5"></i>
                  </button>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <h3 class="text-lg font-semibold text-gray-900">{{ testHead.title }}</h3>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {{ getQuestionTypeLabel(testHead.question_type) }}
                        </span>
                      </div>
                      <p v-if="testHead.description" class="text-sm text-gray-600 mb-2">{{ testHead.description }}</p>
                      <div class="flex items-center gap-4 text-xs text-gray-500">
                        <span class="inline-flex items-center">
                          <i data-feather="file-text" class="h-3.5 w-3.5 mr-1"></i>
                          {{ testHead.question_count || 0 }} questions
                        </span>
                        <span v-if="testHead.questions && testHead.questions.length > 0" class="inline-flex items-center">
                          <i data-feather="hash" class="h-3.5 w-3.5 mr-1"></i>
                          {{ formatQuestionRange(testHead) }}
                        </span>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 ml-4">
                      <button
                        @click="openQuestionBuilder(testHead)"
                        class="inline-flex items-center px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium rounded-lg transition-colors"
                        title="Add Questions"
                      >
                        <i data-feather="plus" class="h-3.5 w-3.5 mr-1"></i>
                        Add
                      </button>
                      <button
                        @click="openTestHeadModal(testHead)"
                        class="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <i data-feather="edit-2" class="h-4 w-4"></i>
                      </button>
                      <button
                        @click="deleteTestHead(testHead)"
                        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <i data-feather="trash-2" class="h-4 w-4"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Questions Preview (when expanded) -->
                  <div v-if="testHead.expanded && testHead.questions && testHead.questions.length > 0" class="mt-4 pl-4 border-l-2 border-gray-200">
                    <!-- Question Data Visual Rendering -->
                    <div v-if="shouldShowQuestionDataSection(testHead)" class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Question Group Structure</div>
                      
                      <!-- Title (for NC, FC, SUC, TC) -->
                      <div v-if="testHead.question_data && testHead.question_data.title" class="mb-3">
                        <div class="font-semibold text-base text-gray-900 mb-2">{{ testHead.question_data.title }}</div>
                      </div>

                      <!-- Note Completion (NC) -->
                      <div v-if="testHead.question_type === 'NC' && testHead.question_data && testHead.question_data.items" class="space-y-2">
                        <div class="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                          <div class="text-xs font-medium text-orange-800 mb-2">📝 NOTE COMPLETION</div>
                          <div class="space-y-1.5">
                            <div
                              v-for="(item, idx) in renderQuestionDataItems(testHead.question_data.items)"
                              :key="idx"
                              class="text-sm text-gray-700 leading-relaxed pl-2"
                              v-html="item"
                            ></div>
                          </div>
                        </div>
                      </div>

                      <!-- Form Completion (FC) -->
                      <div v-if="testHead.question_type === 'FC' && testHead.question_data && testHead.question_data.items" class="space-y-2">
                        <div class="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
                          <div class="text-xs font-medium text-purple-800 mb-2">📋 FORM COMPLETION</div>
                          <div class="space-y-1.5">
                            <div
                              v-for="(item, idx) in renderQuestionDataItems(testHead.question_data.items)"
                              :key="idx"
                              class="text-sm text-gray-700 leading-relaxed pl-2"
                              v-html="item"
                            ></div>
                          </div>
                        </div>
                      </div>

                      <!-- Table Completion (TC) -->
                      <div v-if="testHead.question_type === 'TC' && testHead.question_data && testHead.question_data.items" class="overflow-x-auto">
                        <div class="text-xs font-medium text-green-800 mb-2">📊 TABLE COMPLETION</div>
                        <table class="min-w-full border-2 border-gray-300 text-sm bg-white shadow-sm">
                          <tbody>
                            <tr
                              v-for="(row, rIdx) in renderTableData(testHead.question_data.items)"
                              :key="rIdx"
                              :class="rIdx === 0 ? 'bg-green-100 font-semibold' : 'bg-white hover:bg-gray-50'"
                            >
                              <td
                                v-for="(cell, cIdx) in row"
                                :key="cIdx"
                                class="border border-gray-300 px-3 py-2"
                                v-html="cell"
                              ></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- Summary Completion (SUC) -->
                      <div v-if="testHead.question_type === 'SUC' && testHead.question_data && testHead.question_data.text" class="space-y-2">
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                          <div class="text-xs font-medium text-yellow-800 mb-2">📄 SUMMARY COMPLETION</div>
                          <div class="text-sm text-gray-700 leading-relaxed" v-html="renderQuestionDataText(testHead.question_data.text)"></div>
                          <div v-if="testHead.question_data.blankCount" class="mt-2 text-xs text-gray-600">
                            Total blanks: {{ testHead.question_data.blankCount }}
                          </div>
                        </div>
                      </div>

                      <!-- Matching Features (MF) -->
                      <div v-if="testHead.question_type === 'MF' && testHead.question_data && testHead.question_data.options" class="space-y-2">
                        <div class="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                          <div class="text-xs font-medium text-orange-800 mb-3">🔗 MATCHING FEATURES</div>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div
                              v-for="(option, idx) in renderQuestionDataOptions(testHead.question_data.options)"
                              :key="idx"
                              class="flex items-start gap-2 text-sm bg-white p-2 rounded shadow-sm"
                            >
                              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-200 text-xs font-bold text-orange-800 flex-shrink-0">
                                {{ option.label || option.key || String.fromCharCode(65 + idx) }}
                              </span>
                              <span class="text-gray-700">{{ option.text || option.value || option }}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Matching Information (MI) -->
                      <div v-if="testHead.question_type === 'MI' && testHead.question_data && testHead.question_data.options" class="space-y-2">
                        <div class="bg-cyan-50 border-l-4 border-cyan-400 p-3 rounded">
                          <div class="text-xs font-medium text-cyan-800 mb-3">ℹ️ MATCHING INFORMATION</div>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div
                              v-for="(option, idx) in renderQuestionDataOptions(testHead.question_data.options)"
                              :key="idx"
                              class="flex items-start gap-2 text-sm bg-white p-2 rounded shadow-sm"
                            >
                              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-cyan-200 text-xs font-bold text-cyan-800 flex-shrink-0">
                                {{ option.label || option.key || String.fromCharCode(65 + idx) }}
                              </span>
                              <span class="text-gray-700">{{ option.text || option.value || option }}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Matching Headings (MH) -->
                      <div v-if="testHead.question_type === 'MH' && testHead.question_data && testHead.question_data.options" class="space-y-2">
                        <div class="bg-pink-50 border-l-4 border-pink-400 p-3 rounded">
                          <div class="text-xs font-medium text-pink-800 mb-3">🏷️ MATCHING HEADINGS</div>
                          <div class="space-y-2">
                            <div
                              v-for="(option, idx) in renderQuestionDataOptions(testHead.question_data.options)"
                              :key="idx"
                              class="flex items-start gap-2 text-sm bg-white p-2 rounded shadow-sm"
                            >
                              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-200 text-xs font-bold text-pink-800 flex-shrink-0">
                                {{ option.label || String.fromCharCode(65 + idx) }}
                              </span>
                              <span class="text-gray-700">{{ option.text || option.value || option }}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Multiple Choice Multiple Answers (MCMA) -->
                      <div v-if="testHead.question_type === 'MCMA' && testHead.question_data && testHead.question_data.options" class="space-y-2">
                        <div class="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                          <div class="text-xs font-medium text-orange-800 mb-3">☑️ MULTIPLE CHOICE (MULTIPLE ANSWERS)</div>
                          <div class="space-y-1.5">
                            <div
                              v-for="(option, idx) in renderQuestionDataOptions(testHead.question_data.options)"
                              :key="idx"
                              class="flex items-start gap-2 text-sm bg-white p-2 rounded shadow-sm"
                            >
                              <span class="inline-flex items-center justify-center h-6 w-6 rounded bg-orange-200 text-xs font-bold text-orange-800 flex-shrink-0">
                                {{ option.label || String.fromCharCode(65 + idx) }}
                              </span>
                              <span class="text-gray-700">{{ option.text || option.value || option }}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Flow Chart Completion (FCC) -->
                      <div v-if="testHead.question_type === 'FCC' && testHead.question_data && testHead.question_data.options" class="space-y-2">
                        <div class="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
                          <div class="text-xs font-medium text-purple-800 mb-3">🔄 FLOW CHART OPTIONS</div>
                          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div
                              v-for="(option, idx) in renderQuestionDataOptions(testHead.question_data.options)"
                              :key="idx"
                              class="flex items-start gap-2 text-sm p-2 bg-white rounded border-2 border-purple-200 shadow-sm hover:border-purple-400 transition-colors"
                            >
                              <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-purple-200 text-xs font-bold text-purple-800 flex-shrink-0">
                                {{ option.label || String.fromCharCode(65 + idx) }}
                              </span>
                              <span class="text-gray-700 text-xs leading-tight">{{ option.text || option.value || option }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Individual Questions -->
                    <div class="space-y-2">
                      <div class="flex items-center gap-2 mb-3">
                        <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Questions</div>
                        <div class="flex-1 h-px bg-gray-200"></div>
                      </div>
                      <div
                        v-for="question in testHead.questions"
                        :key="question.id"
                        class="flex items-start gap-3 text-sm p-3 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                      >
                        <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-orange-600 text-xs font-bold text-white flex-shrink-0 shadow-sm">
                          {{ question.question_number }}
                        </span>
                        <div class="flex-1 min-w-0">
                          <p class="text-gray-900 font-medium mb-1">{{ question.question_text || question.text }}</p>
                          <div v-if="question.correct_answer" class="flex items-center gap-2 mt-2">
                            <span class="inline-flex items-center px-2 py-1 rounded bg-green-100 border border-green-300">
                              <span class="text-xs font-semibold text-green-800">Answer:</span>
                              <span class="ml-1.5 text-xs text-green-900">{{ question.correct_answer }}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Empty questions state when expanded -->
                  <div v-else-if="testHead.expanded && (!testHead.questions || testHead.questions.length === 0)" class="mt-4 pl-4 border-l-2 border-gray-200">
                    <div class="text-center py-8">
                      <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
                        <i data-feather="inbox" class="h-6 w-6 text-gray-400"></i>
                      </div>
                      <p class="text-sm text-gray-500 font-medium">No questions added yet</p>
                      <p class="text-xs text-gray-400 mt-1">Click "Add" button to create questions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- TestHead Modal -->
      <div
        v-if="showTestHeadModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeTestHeadModal"
      >
        <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 class="text-xl font-bold text-gray-900">{{ testHeadModalTitle }}</h2>
            <button
              @click="closeTestHeadModal"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i data-feather="x" class="h-6 w-6"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="testHeadForm.title"
                type="text"
                placeholder="e.g., Questions 1-8, Matching Headings"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <!-- Question Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Question Type <span class="text-red-500">*</span>
              </label>
              <select
                v-model="testHeadForm.question_type"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option v-for="option in questionTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p class="mt-1 text-xs text-gray-500">
                <span v-if="showsQuestionDataField()">⚠️ This type requires Question Data structure below</span>
                <span v-else>ℹ️ This type doesn't require additional structure data</span>
              </p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                v-model="testHeadForm.description"
                rows="3"
                placeholder="Instructions or additional information for this question group..."
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              ></textarea>
            </div>

            <!-- Question Data (for specific question types) -->
            <div v-if="showsQuestionDataField()" class="border-t border-gray-200 pt-4">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">
                  Question Data (JSON)
                  <span class="text-xs text-gray-500 font-normal ml-2">
                    Structure for {{ getQuestionTypeLabel(testHeadForm.question_type) }}
                  </span>
                </label>
                <button
                  @click="insertExampleData"
                  type="button"
                  class="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  Insert Example
                </button>
              </div>
              <textarea
                v-model="testHeadForm.question_data"
                rows="12"
                placeholder='{"title": "...", "items": [...]} or {"options": [...]}'
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
              ></textarea>
              <div class="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p class="text-xs text-orange-800 font-medium mb-1">💡 Quick Guide:</p>
                <ul class="text-xs text-orange-700 space-y-1 ml-4">
                  <li v-if="['NC', 'FC'].includes(testHeadForm.question_type)">• Use "items" array with text containing &lt;input&gt; for blanks</li>
                  <li v-if="testHeadForm.question_type === 'TC'">• "items" is 2D array: first row = headers, rest = data with &lt;input&gt;</li>
                  <li v-if="testHeadForm.question_type === 'SUC'">• Use "text" with &lt;input&gt; and "blankCount"</li>
                  <li v-if="['MF', 'MI', 'MH', 'MCMA', 'FCC'].includes(testHeadForm.question_type)">• Use "options" array with objects: {label: "A", text: "..."}  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              @click="closeTestHeadModal"
              class="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="saveTestHead"
              :disabled="!testHeadForm.title || !testHeadForm.question_type"
              class="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {{ editingTestHead ? 'Update' : 'Create' }} Group
            </button>
          </div>
        </div>
      </div>

      <!-- Question Builder Modal -->
      <div
        v-if="showQuestionBuilderModal && selectedTestHead"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeQuestionBuilder"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 class="text-xl font-bold text-gray-900">Question Builder</h2>
              <p class="text-sm text-gray-600 mt-1">{{ selectedTestHead.title }}</p>
            </div>
            <button
              @click="closeQuestionBuilder"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i data-feather="x" class="h-6 w-6"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto p-6">
            <question-builder-component
              :test-head-id="selectedTestHead.id"
              :question-type="selectedTestHead.question_type"
              @close="closeQuestionBuilder"
            ></question-builder-component>
          </div>
        </div>
      </div>
    </div>
  `,
};

window.TestHeadsComponent = window.TestHeads;
