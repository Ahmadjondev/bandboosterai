/**
 * Mock Test Form Component - Enhanced Version
 * Create and Edit Mock Tests with structured content selection
 * Features: No duplicates, position-based selection, Choose Randomly function
 */

window.MockTestForm = {
  name: 'MockTestForm',
  mixins: [window.FeatherIconsMixin],
  props: {
    mode: {
      type: String,
      default: 'create',
      validator: (value) => ['create', 'edit'].includes(value),
    },
    testId: {
      type: [Number, String],
      default: null,
    },
  },

  data() {
    return {
      loading: true,
      saving: false,
      error: null,

      // Form data - Structured by position/type
      form: {
        title: '',
        description: '',
        exam_type: 'FULL_TEST',
        difficulty: 'INTERMEDIATE',
        is_active: true,
        // Structured content by position/type
        reading_passages: {
          passage_1: null,
          passage_2: null,
          passage_3: null,
        },
        listening_parts: {
          part_1: null,
          part_2: null,
          part_3: null,
          part_4: null,
        },
        writing_tasks: {
          task_1: null,
          task_2: null,
        },
        speaking_topics: {
          part_1: null,
          part_2: null,
          part_3: null,
        },
      },

      // Available content grouped by number/type
      availablePassages: [],
      availableParts: [],
      availableTasks: [],
      availableTopics: [],

      // Selection dialogs
      showSelectionDialog: false,
      selectionType: null, // 'reading_1', 'listening_1', etc.
      selectionLabel: '',
      searchQuery: '',

      // Form validation
      errors: {},

      Helpers: window.Helpers || {
        formatDate: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
        showToast: (msg, type) => {
          if (window.toast && window.toast[type]) {
            window.toast[type](msg);
          } else {
            console.log(`[${type}] ${msg}`);
          }
        },
      },
    };
  },

  computed: {
    isEditMode() {
      return this.mode === 'edit' && this.testId;
    },

    pageTitle() {
      return this.isEditMode ? 'Edit Mock Test' : 'Create Mock Test';
    },

    examTypeOptions() {
      return [
        { value: 'FULL_TEST', label: 'Full Test' },
        { value: 'LISTENING_READING', label: 'Listening + Reading' },
        { value: 'LISTENING_READING_WRITING', label: 'Listening + Reading + Writing' },
        { value: 'READING', label: 'Reading Only' },
        { value: 'LISTENING', label: 'Listening Only' },
        { value: 'WRITING', label: 'Writing Only' },
        { value: 'SPEAKING', label: 'Speaking Only' },
      ];
    },

    difficultyOptions() {
      return [
        { value: 'EASY', label: 'Easy' },
        { value: 'INTERMEDIATE', label: 'Intermediate' },
        { value: 'HARD', label: 'Hard' },
      ];
    },

    selectedPassageObjects() {
      return Object.entries(this.form.reading_passages)
        .filter(([key, id]) => id !== null)
        .map(([key, id]) => ({
          ...this.availablePassages.find(p => p.id === id),
          slot: key,
        }))
        .filter(item => item.id);
    },

    selectedPartObjects() {
      return Object.entries(this.form.listening_parts)
        .filter(([key, id]) => id !== null)
        .map(([key, id]) => ({
          ...this.availableParts.find(p => p.id === id),
          slot: key,
        }))
        .filter(item => item.id);
    },

    selectedTaskObjects() {
      return Object.entries(this.form.writing_tasks)
        .filter(([key, id]) => id !== null)
        .map(([key, id]) => ({
          ...this.availableTasks.find(t => t.id === id),
          slot: key,
        }))
        .filter(item => item.id);
    },

    selectedTopicObjects() {
      return Object.entries(this.form.speaking_topics)
        .filter(([key, id]) => id !== null)
        .map(([key, id]) => ({
          ...this.availableTopics.find(t => t.id === id),
          slot: key,
        }))
        .filter(item => item.id);
    },

    // Get already selected IDs to prevent duplicates
    selectedReadingIds() {
      return Object.values(this.form.reading_passages).filter(id => id !== null);
    },

    selectedListeningIds() {
      return Object.values(this.form.listening_parts).filter(id => id !== null);
    },

    selectedWritingIds() {
      return Object.values(this.form.writing_tasks).filter(id => id !== null);
    },

    selectedSpeakingIds() {
      return Object.values(this.form.speaking_topics).filter(id => id !== null);
    },

    filteredSelectionItems() {
      let items = [];
      let excludeIds = [];

      // Get the appropriate items and filter by number/type
      if (this.selectionType?.startsWith('reading_')) {
        const passageNum = parseInt(this.selectionType.split('_')[1]);
        // STRICT: Only show passages with matching passage_number
        items = this.availablePassages.filter(p => p.passage_number === passageNum);
        excludeIds = this.selectedReadingIds;
      } else if (this.selectionType?.startsWith('listening_')) {
        const partNum = parseInt(this.selectionType.split('_')[1]);
        // STRICT: Only show parts with matching part_number
        items = this.availableParts.filter(p => p.part_number === partNum);
        excludeIds = this.selectedListeningIds;
      } else if (this.selectionType?.startsWith('writing_')) {
        const taskNum = parseInt(this.selectionType.split('_')[1]);
        // STRICT: Only show tasks with matching task_type
        const taskType = `TASK_${taskNum}`;
        items = this.availableTasks.filter(t => t.task_type === taskType);
        excludeIds = this.selectedWritingIds;
      } else if (this.selectionType?.startsWith('speaking_')) {
        const partNum = parseInt(this.selectionType.split('_')[1]);
        // STRICT: Only show topics with matching speaking_type
        const speakingType = `PART_${partNum}`;
        items = this.availableTopics.filter(t => t.speaking_type === speakingType);
        excludeIds = this.selectedSpeakingIds;
      }

      // Filter out already selected items
      items = items.filter(item => !excludeIds.includes(item.id));

      // Apply search filter
      if (!this.searchQuery.trim()) return items;

      const query = this.searchQuery.toLowerCase();
      return items.filter(item => {
        const searchText = (item.title || item.topic || item.prompt || '').toLowerCase();
        return searchText.includes(query);
      });
    },

    canSave() {
      return this.form.title.trim() && !this.saving;
    },
  },

  async mounted() {
    await this.loadAvailableContent();

    if (this.isEditMode) {
      await this.loadExistingTest();
    } else {
      this.loading = false;
    }
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
    async loadAvailableContent() {
      try {
        const [passages, parts, tasks, topics] = await Promise.all([
          managerAPI.getReadingPassages({ is_active: true }),
          managerAPI.getListeningParts({ is_active: true }),
          managerAPI.getWritingTasks({ is_active: true }),
          managerAPI.getSpeakingTopics({ is_active: true }),
        ]);

        this.availablePassages = passages.passages || [];
        this.availableParts = parts.parts || [];
        this.availableTasks = tasks.tasks || [];
        this.availableTopics = topics.topics || [];
      } catch (err) {
        this.error = 'Failed to load available content';
        if (this.Helpers.showToast) {
          this.Helpers.showToast(this.error, 'error');
        }
      }
    },

    async loadExistingTest() {
      try {
        const data = await managerAPI.getMockTest(this.testId);

        if (data.success && data.test) {
          const test = data.test;
          this.form = {
            title: test.title || '',
            description: test.description || '',
            exam_type: test.exam_type || 'FULL_TEST',
            difficulty: test.difficulty || 'INTERMEDIATE',
            is_active: test.is_active !== false,
            reading_passages: {
              passage_1: test.reading_passages?.[0]?.id || null,
              passage_2: test.reading_passages?.[1]?.id || null,
              passage_3: test.reading_passages?.[2]?.id || null,
            },
            listening_parts: {
              part_1: test.listening_parts?.[0]?.id || null,
              part_2: test.listening_parts?.[1]?.id || null,
              part_3: test.listening_parts?.[2]?.id || null,
              part_4: test.listening_parts?.[3]?.id || null,
            },
            writing_tasks: {
              task_1: test.writing_tasks?.find(t => t.task_type === 'TASK_1')?.id || null,
              task_2: test.writing_tasks?.find(t => t.task_type === 'TASK_2')?.id || null,
            },
            speaking_topics: {
              part_1: test.speaking_topics?.find(t => t.speaking_type === 'PART_1')?.id || null,
              part_2: test.speaking_topics?.find(t => t.speaking_type === 'PART_2')?.id || null,
              part_3: test.speaking_topics?.find(t => t.speaking_type === 'PART_3')?.id || null,
            },
          };
        }
      } catch (err) {
        this.error = this.handleAPIError(err);
        if (this.Helpers.showToast) {
          this.Helpers.showToast(this.error, 'error');
        }
      } finally {
        this.loading = false;
      }
    },

    openSelectionDialog(type, label) {
      this.selectionType = type;
      this.selectionLabel = label;
      this.searchQuery = '';
      this.showSelectionDialog = true;
    },

    closeSelectionDialog() {
      this.showSelectionDialog = false;
      this.selectionType = null;
      this.selectionLabel = '';
      this.searchQuery = '';
    },

    selectItem(itemId) {
      // Map selection type to form field
      if (this.selectionType?.startsWith('reading_')) {
        const passageNum = this.selectionType.split('_')[1];
        this.form.reading_passages[`passage_${passageNum}`] = itemId;
      } else if (this.selectionType?.startsWith('listening_')) {
        const partNum = this.selectionType.split('_')[1];
        this.form.listening_parts[`part_${partNum}`] = itemId;
      } else if (this.selectionType?.startsWith('writing_')) {
        const taskNum = this.selectionType.split('_')[1];
        this.form.writing_tasks[`task_${taskNum}`] = itemId;
      } else if (this.selectionType?.startsWith('speaking_')) {
        const partNum = this.selectionType.split('_')[1];
        this.form.speaking_topics[`part_${partNum}`] = itemId;
      }

      this.closeSelectionDialog();

      if (this.Helpers.showToast) {
        this.Helpers.showToast('Content selected successfully', 'success');
      }
    },

    removeItem(section, slot) {
      switch (section) {
        case 'reading':
          this.form.reading_passages[slot] = null;
          break;
        case 'listening':
          this.form.listening_parts[slot] = null;
          break;
        case 'writing':
          this.form.writing_tasks[slot] = null;
          break;
        case 'speaking':
          this.form.speaking_topics[slot] = null;
          break;
      }
    },

    getSlotLabel(slot) {
      const labels = {
        passage_1: 'Passage 1',
        passage_2: 'Passage 2',
        passage_3: 'Passage 3',
        part_1: 'Part 1',
        part_2: 'Part 2',
        part_3: 'Part 3',
        part_4: 'Part 4',
        task_1: 'Task 1',
        task_2: 'Task 2',
      };
      return labels[slot] || slot;
    },

    async chooseRandomly() {
      if (this.saving) return;

      try {
        this.saving = true;

        // Reset all selections
        this.form.reading_passages = { passage_1: null, passage_2: null, passage_3: null };
        this.form.listening_parts = { part_1: null, part_2: null, part_3: null, part_4: null };
        this.form.writing_tasks = { task_1: null, task_2: null };
        this.form.speaking_topics = { part_1: null, part_2: null, part_3: null };

        // Randomly select reading passages (ensure no duplicates)
        // Randomly select reading passages by passage_number (ensure matching numbers)
        const passage1Options = this.availablePassages.filter(p => p.passage_number === 1);
        const passage2Options = this.availablePassages.filter(p => p.passage_number === 2);
        const passage3Options = this.availablePassages.filter(p => p.passage_number === 3);
        
        if (passage1Options.length) {
          const randomPassage1 = passage1Options[Math.floor(Math.random() * passage1Options.length)];
          this.form.reading_passages.passage_1 = randomPassage1.id;
        }
        if (passage2Options.length) {
          const randomPassage2 = passage2Options[Math.floor(Math.random() * passage2Options.length)];
          this.form.reading_passages.passage_2 = randomPassage2.id;
        }
        if (passage3Options.length) {
          const randomPassage3 = passage3Options[Math.floor(Math.random() * passage3Options.length)];
          this.form.reading_passages.passage_3 = randomPassage3.id;
        }

        // Randomly select listening parts (ensure no duplicates)
        // Randomly select listening parts by part_number (ensure matching numbers)
        const part1Options = this.availableParts.filter(p => p.part_number === 1);
        const part2Options = this.availableParts.filter(p => p.part_number === 2);
        const part3Options = this.availableParts.filter(p => p.part_number === 3);
        const part4Options = this.availableParts.filter(p => p.part_number === 4);
        
        if (part1Options.length) {
          const randomPart1 = part1Options[Math.floor(Math.random() * part1Options.length)];
          this.form.listening_parts.part_1 = randomPart1.id;
        }
        if (part2Options.length) {
          const randomPart2 = part2Options[Math.floor(Math.random() * part2Options.length)];
          this.form.listening_parts.part_2 = randomPart2.id;
        }
        if (part3Options.length) {
          const randomPart3 = part3Options[Math.floor(Math.random() * part3Options.length)];
          this.form.listening_parts.part_3 = randomPart3.id;
        }
        if (part4Options.length) {
          const randomPart4 = part4Options[Math.floor(Math.random() * part4Options.length)];
          this.form.listening_parts.part_4 = randomPart4.id;
        }

        // Randomly select writing tasks by type (no duplicates possible within type)
        const task1Options = this.availableTasks.filter(t => t.task_type === 'TASK_1');
        const task2Options = this.availableTasks.filter(t => t.task_type === 'TASK_2');
        if (task1Options.length) {
          const randomTask1 = task1Options[Math.floor(Math.random() * task1Options.length)];
          this.form.writing_tasks.task_1 = randomTask1.id;
        }
        if (task2Options.length) {
          const randomTask2 = task2Options[Math.floor(Math.random() * task2Options.length)];
          this.form.writing_tasks.task_2 = randomTask2.id;
        }

        // Randomly select speaking topics by part (no duplicates possible within part)
        const part1Topics = this.availableTopics.filter(t => t.speaking_type === 'PART_1');
        const part2Topics = this.availableTopics.filter(t => t.speaking_type === 'PART_2');
        const part3Topics = this.availableTopics.filter(t => t.speaking_type === 'PART_3');

        if (part1Topics.length) {
          const randomPart1 = part1Topics[Math.floor(Math.random() * part1Topics.length)];
          this.form.speaking_topics.part_1 = randomPart1.id;
        }
        if (part2Topics.length) {
          const randomPart2 = part2Topics[Math.floor(Math.random() * part2Topics.length)];
          this.form.speaking_topics.part_2 = randomPart2.id;
        }
        if (part3Topics.length) {
          const randomPart3 = part3Topics[Math.floor(Math.random() * part3Topics.length)];
          this.form.speaking_topics.part_3 = randomPart3.id;
        }

        if (this.Helpers.showToast) {
          this.Helpers.showToast('All sections randomly populated!', 'success');
        }
      } catch (err) {
        if (this.Helpers.showToast) {
          this.Helpers.showToast('Failed to populate randomly', 'error');
        }
      } finally {
        this.saving = false;
      }
    },

    validateForm() {
      this.errors = {};

      if (!this.form.title.trim()) {
        this.errors.title = 'Title is required';
      }

      // Validate based on exam type
      // Reading validation
      if (['FULL_TEST', 'READING', 'LISTENING_READING', 'LISTENING_READING_WRITING'].includes(this.form.exam_type)) {
        const hasAllPassages = this.form.reading_passages.passage_1 &&
          this.form.reading_passages.passage_2 &&
          this.form.reading_passages.passage_3;

        if (['FULL_TEST', 'LISTENING_READING', 'LISTENING_READING_WRITING'].includes(this.form.exam_type) && !hasAllPassages) {
          this.errors.reading = 'All 3 reading passages are required for this test type';
        }
      }

      // Listening validation
      if (['FULL_TEST', 'LISTENING', 'LISTENING_READING', 'LISTENING_READING_WRITING'].includes(this.form.exam_type)) {
        const hasAllParts = this.form.listening_parts.part_1 &&
          this.form.listening_parts.part_2 &&
          this.form.listening_parts.part_3 &&
          this.form.listening_parts.part_4;

        if (['FULL_TEST', 'LISTENING_READING', 'LISTENING_READING_WRITING'].includes(this.form.exam_type) && !hasAllParts) {
          this.errors.listening = 'All 4 listening parts are required for this test type';
        }
      }

      // Writing validation
      if (['FULL_TEST', 'WRITING', 'LISTENING_READING_WRITING'].includes(this.form.exam_type)) {
        const hasAllTasks = this.form.writing_tasks.task_1 && this.form.writing_tasks.task_2;

        if (['FULL_TEST', 'LISTENING_READING_WRITING'].includes(this.form.exam_type) && !hasAllTasks) {
          this.errors.writing = 'Both writing tasks are required for this test type';
        }
      }

      // Speaking validation
      if (['FULL_TEST', 'SPEAKING'].includes(this.form.exam_type)) {
        const hasAllTopics = this.form.speaking_topics.part_1 &&
          this.form.speaking_topics.part_2 &&
          this.form.speaking_topics.part_3;

        if (this.form.exam_type === 'FULL_TEST' && !hasAllTopics) {
          this.errors.speaking = 'All 3 speaking parts are required for Full Test';
        }
      }

      return Object.keys(this.errors).length === 0;
    },

    async handleSave() {
      if (!this.validateForm()) {
        if (this.Helpers.showToast) {
          const errorMessages = Object.values(this.errors).join(', ');
          this.Helpers.showToast(errorMessages, 'error');
        }
        return;
      }

      try {
        this.saving = true;

        // Convert structured data to array format for API
        const payload = {
          title: this.form.title,
          description: this.form.description,
          exam_type: this.form.exam_type,
          difficulty: this.form.difficulty,
          is_active: this.form.is_active,
          reading_passages: Object.values(this.form.reading_passages).filter(id => id !== null),
          listening_parts: Object.values(this.form.listening_parts).filter(id => id !== null),
          writing_tasks: Object.values(this.form.writing_tasks).filter(id => id !== null),
          speaking_topics: Object.values(this.form.speaking_topics).filter(id => id !== null),
        };

        let data;
        if (this.isEditMode) {
          data = await managerAPI.updateMockTest(this.testId, payload);
        } else {
          data = await managerAPI.createMockTest(payload);
        }

        if (data.success) {
          if (this.Helpers.showToast) {
            this.Helpers.showToast(
              this.isEditMode ? 'Mock test updated successfully' : 'Mock test created successfully',
              'success'
            );
          }
          this.goBack();
        }
      } catch (err) {
        const errorMsg = this.handleAPIError(err);
        if (this.Helpers.showToast) {
          this.Helpers.showToast(errorMsg, 'error');
        }
      } finally {
        this.saving = false;
      }
    },

    goBack() {
      this.$emit('navigate', 'mock-tests');
    },

    handleAPIError(err) {
      if (err.response?.data?.error) {
        return err.response.data.error;
      }
      return err.message || 'An error occurred';
    },

    getSelectionDialogTitle() {
      return this.selectionLabel || 'Select Item';
    },

    getItemDisplayText(item) {
      if (this.selectionType?.startsWith('reading_') || this.selectionType?.startsWith('listening_')) {
        return item.title || 'Untitled';
      } else if (this.selectionType?.startsWith('writing_')) {
        return item.prompt ? (item.prompt.substring(0, 100) + '...') : 'No prompt';
      } else if (this.selectionType?.startsWith('speaking_')) {
        return item.topic || item.question || 'Untitled';
      }
      return 'Item';
    },

    getItemSubtext(item) {
      if (item.difficulty_display) return item.difficulty_display;
      if (item.task_type_display) return item.task_type_display;
      if (item.speaking_type_display) return item.speaking_type_display;
      return '';
    },
  },

  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 hover:bg-gray-100 rounded-lg transition">
            <i data-feather="arrow-left" class="w-5 h-5 text-gray-600"></i>
          </button>
          <div>
            <h2 class="text-2xl font-bold text-gray-900">{{ pageTitle }}</h2>
            <p class="text-sm text-gray-600 mt-1">{{ isEditMode ? 'Update' : 'Create' }} a complete IELTS mock test</p>
          </div>
        </div>
        <button
          v-if="!loading"
          @click="chooseRandomly"
          :disabled="saving"
          class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
        >
          <i data-feather="shuffle" class="w-4 h-4"></i>
          Choose Randomly
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <loading-spinner size="large" />
      </div>

      <!-- Form -->
      <div v-else class="space-y-6">
        <!-- Basic Information -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i data-feather="info" class="w-5 h-5 text-orange-600"></i>
            Basic Information
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                placeholder="e.g., IELTS Academic Practice Test 1"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                :class="errors.title ? 'border-red-500' : 'border-gray-300'"
              />
              <p v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</p>
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Optional description for this mock test..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
              <select
                v-model="form.exam_type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option v-for="option in examTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                v-model="form.difficulty"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option v-for="option in difficultyOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div class="flex items-center gap-2 mt-2">
                <input
                  v-model="form.is_active"
                  type="checkbox"
                  id="is_active"
                  class="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <label for="is_active" class="text-sm text-gray-700">Active (visible to students)</label>
              </div>
            </div>
          </div>
          <p v-if="Object.keys(errors).length > 0" class="text-red-500 text-sm mt-4">
            {{ Object.values(errors).join(', ') }}
          </p>
        </div>

        <!-- Reading Section -->
        <div v-if="['FULL_TEST', 'READING', 'LISTENING_READING', 'LISTENING_READING_WRITING'].includes(form.exam_type)" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i data-feather="book-open" class="w-5 h-5 text-orange-600"></i>
            Reading Passages
          </h3>

          <div class="space-y-3">
            <div v-for="(id, key) in form.reading_passages" :key="key" class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">{{ getSlotLabel(key) }}</span>
                <button
                  v-if="id"
                  @click="removeItem('reading', key)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  <i data-feather="x" class="w-4 h-4"></i>
                </button>
              </div>
              <div v-if="id" class="bg-orange-50 border border-orange-200 rounded p-3">
                <p class="font-medium text-gray-900">
                  {{ availablePassages.find(p => p.id === id)?.title || 'Unknown' }}
                </p>
               <div class="flex items-center space-x-4 text-gray-500 font-normal">
                  <p>Passage {{ availablePassages.find(p => p.id === id)?.passage_number || 'Unknown' }}</p>
                  <p>Word count {{ availablePassages.find(p => p.id === id)?.word_count || 'Unknown' }}</p>
                </div>
              </div>
              <button
                v-else
                @click="openSelectionDialog('reading_' + key.split('_')[1], getSlotLabel(key))"
                class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-500 hover:text-orange-600 transition"
              >
                <i data-feather="plus" class="w-4 h-4 inline"></i>
                Select {{ getSlotLabel(key) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Listening Section -->
        <div v-if="['FULL_TEST', 'LISTENING', 'LISTENING_READING', 'LISTENING_READING_WRITING'].includes(form.exam_type)" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i data-feather="headphones" class="w-5 h-5 text-green-600"></i>
            Listening Parts
          </h3>

          <div class="space-y-3">
            <div v-for="(id, key) in form.listening_parts" :key="key" class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">{{ getSlotLabel(key) }}</span>
                <button
                  v-if="id"
                  @click="removeItem('listening', key)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  <i data-feather="x" class="w-4 h-4"></i>
                </button>
              </div>
              <div v-if="id" class="bg-green-50 border border-green-200 rounded p-3">
                <p class="font-medium text-gray-900">
                  {{ availableParts.find(p => p.id === id)?.title || 'Unknown' }}
                </p>
              </div>
              <button
                v-else
                @click="openSelectionDialog('listening_' + key.split('_')[1], getSlotLabel(key))"
                class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 transition"
              >
                <i data-feather="plus" class="w-4 h-4 inline"></i>
                Select {{ getSlotLabel(key) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Writing Section -->
        <div v-if="['FULL_TEST', 'WRITING', 'LISTENING_READING_WRITING'].includes(form.exam_type)" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i data-feather="edit-3" class="w-5 h-5 text-amber-600"></i>
            Writing Tasks
          </h3>

          <div class="space-y-3">
            <div v-for="(id, key) in form.writing_tasks" :key="key" class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">{{ getSlotLabel(key) }}</span>
                <button
                  v-if="id"
                  @click="removeItem('writing', key)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  <i data-feather="x" class="w-4 h-4"></i>
                </button>
              </div>
              <div v-if="id" class="bg-amber-50 border border-amber-200 rounded p-3">
                <p class="font-medium text-gray-900">
                  {{ availableTasks.find(t => t.id === id)?.task_type_display || 'Unknown' }}
                </p>
              </div>
              <button
                v-else
                @click="openSelectionDialog('writing_' + key.split('_')[1], getSlotLabel(key))"
                class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-500 hover:text-amber-600 transition"
              >
                <i data-feather="plus" class="w-4 h-4 inline"></i>
                Select {{ getSlotLabel(key) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Speaking Section -->
        <div v-if="['FULL_TEST', 'SPEAKING'].includes(form.exam_type)" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i data-feather="mic" class="w-5 h-5 text-rose-600"></i>
            Speaking Topics
          </h3>

          <div class="space-y-3">
            <div v-for="(id, key) in form.speaking_topics" :key="key" class="border border-gray-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">{{ getSlotLabel(key) }}</span>
                <button
                  v-if="id"
                  @click="removeItem('speaking', key)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  <i data-feather="x" class="w-4 h-4"></i>
                </button>
              </div>
              <div v-if="id" class="bg-rose-50 border border-rose-200 rounded p-3">
                <p class="font-medium text-gray-900">
                  {{ availableTopics.find(t => t.id === id)?.topic || 'Unknown' }}
                </p>
              </div>
              <button
                v-else
                @click="openSelectionDialog('speaking_' + key.split('_')[1], getSlotLabel(key))"
                class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-rose-500 hover:text-rose-600 transition"
              >
                <i data-feather="plus" class="w-4 h-4 inline"></i>
                Select {{ getSlotLabel(key) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex gap-3 justify-end pt-4">
          <button
            @click="goBack"
            class="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="!canSave"
            class="px-6 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <loading-spinner v-if="saving" size="small" color="white" />
            <i v-else data-feather="save" class="w-4 h-4"></i>
            {{ saving ? 'Saving...' : (isEditMode ? 'Update Test' : 'Create Test') }}
          </button>
        </div>
      </div>

      <!-- Selection Dialog -->
      <div v-if="showSelectionDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">{{ getSelectionDialogTitle() }}</h3>
              <button @click="closeSelectionDialog" class="p-1 hover:bg-gray-100 rounded transition">
                <i data-feather="x" class="w-5 h-5 text-gray-600"></i>
              </button>
            </div>
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search..."
                class="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"></i>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="filteredSelectionItems.length === 0" class="text-center py-8 text-gray-500">
              <i data-feather="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-400"></i>
              <p>No items available</p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="item in filteredSelectionItems"
                :key="item.id"
                @click="selectItem(item.id)"
                class="p-4 border border-gray-200 hover:border-orange-500 hover:bg-orange-50 rounded-lg cursor-pointer transition"
              >
                <p class="font-medium text-gray-900">{{ getItemDisplayText(item) }}</p>
                <p v-if="getItemSubtext(item)" class="text-sm text-gray-600 mt-1">
                  {{ getItemSubtext(item) }}
                </p>
              </div>
            </div>
          </div>

          <div class="p-6 border-t border-gray-200">
            <button
              @click="closeSelectionDialog"
              class="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
