/**
 * Summary Completion Builder Component
 * Specialized builder for Summary Completion (SUC) question type
 * Allows rapid bulk entry with drag & drop, stores data as JSON in question_data
 */

window.SummaryCompletionBuilderComponent = {
    props: {
        questionType: {
            type: String,
            default: 'SUC'
        },
        existingQuestions: {
            type: Array,
            default: () => []
        },
        summaryData: {
            type: String,
            default: '' // JSON string from question_data
        }
    },

    data() {
        return {
            summaryTitle: '',
            summaryText: '',
            parsedSummary: null, // Parsed from summaryData
            showPreview: false,
            isDragging: false,
            generatedQuestions: [],
            currentStep: 1, // 1: Enter Summary, 2: Review & Edit
        };
    },

    computed: {
        blankCount() {
            if (!this.summaryText) return 0;
            return (this.summaryText.match(/___+/g) || []).length;
        },

        hasValidSummary() {
            return this.summaryTitle.trim() && this.summaryText.trim() && this.blankCount > 0;
        },

        canGenerate() {
            return this.hasValidSummary && this.generatedQuestions.length === 0;
        },

        canSave() {
            return this.generatedQuestions.length > 0 &&
                this.generatedQuestions.every(q => q.correct_answer_text.trim());
        }
    },

    watch: {
        summaryData: {
            immediate: true,
            handler(value) {
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        this.parsedSummary = parsed;
                        this.summaryTitle = parsed.title || '';
                        this.summaryText = parsed.text || '';

                        // Load existing questions if editing
                        if (this.existingQuestions && this.existingQuestions.length > 0) {
                            this.generatedQuestions = this.existingQuestions.map((q, idx) => ({
                                ...q,
                                tempId: `existing-${idx}`,
                                blankNumber: q.order
                            }));
                            this.currentStep = 2;
                            this.showPreview = true;
                        }
                    } catch (e) {
                        console.log('summaryData is not JSON, starting fresh');
                    }
                }
            }
        }
    },

    mounted() {
        this.initIcons();
    },

    methods: {
        initIcons() {
            this.$nextTick(() => {
                setTimeout(() => {
                    if (typeof feather !== 'undefined') {
                        feather.replace();
                    }
                }, 100);
            });
        },

        // ===== Drag & Drop Handlers =====
        handleDragEnter(event) {
            event.preventDefault();
            this.isDragging = true;
        },

        handleDragOver(event) {
            event.preventDefault();
            this.isDragging = true;
        },

        handleDragLeave(event) {
            event.preventDefault();
            if (event.target.classList.contains('drop-zone')) {
                this.isDragging = false;
            }
        },

        async handleDrop(event) {
            event.preventDefault();
            this.isDragging = false;

            const files = event.dataTransfer.files;

            // Handle dropped files
            if (files.length > 0) {
                for (let file of files) {
                    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                        const text = await this.readFileAsText(file);
                        this.summaryText = text;
                        this.$root.showNotification('Text file loaded successfully', 'success');
                        return;
                    }
                }
                this.$root.showNotification('Please drop a text file (.txt)', 'warning');
                return;
            }

            // Handle dropped text
            const text = event.dataTransfer.getData('text/plain');
            if (text) {
                this.summaryText = text;
                this.$root.showNotification('Text pasted successfully', 'success');
            }
        },

        readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        },

        handlePaste(event) {
            this.$nextTick(() => {
                if (this.summaryText.trim()) {
                    this.$root.showNotification('Text pasted! Use ___ for blanks', 'info');
                }
            });
        },

        // ===== Summary Processing =====
        generateQuestions() {
            if (!this.hasValidSummary) {
                this.$root.showNotification('Please enter a title and summary with blanks (___)', 'warning');
                return;
            }

            // Split summary by blanks and create questions
            const parts = this.summaryText.split(/___+/);
            const blankCount = parts.length - 1;

            if (blankCount === 0) {
                this.$root.showNotification('No blanks found. Use ___ to mark answer positions', 'warning');
                return;
            }

            // Generate questions for each blank
            this.generatedQuestions = [];
            for (let i = 0; i < blankCount; i++) {
                const contextBefore = parts[i].slice(-50).trim();
                const contextAfter = parts[i + 1].slice(0, 50).trim();

                this.generatedQuestions.push({
                    tempId: `blank-${Date.now()}-${i}`,
                    blankNumber: i + 1,
                    question_text: `...${contextBefore} _____ ${contextAfter}...`,
                    correct_answer_text: '',
                    answer_two_text: '',
                    choices: [],
                    order: i + 1,
                    explanation: '',
                    points: 1,
                    contextBefore,
                    contextAfter
                });
            }

            this.currentStep = 2;
            this.showPreview = true;
            this.$root.showNotification(`Generated ${blankCount} questions from blanks`, 'success');
            this.initIcons();
        },

        updateAnswer(index, value) {
            this.generatedQuestions[index].correct_answer_text = value;
            this.$forceUpdate();
        },

        editQuestionText(index) {
            const question = this.generatedQuestions[index];
            const newText = prompt('Edit question text:', question.question_text);
            if (newText && newText.trim()) {
                question.question_text = newText.trim();
                this.$forceUpdate();
            }
        },

        async removeQuestion(index) {
            const confirmed = await this.$root.showConfirmDialog({
                title: 'Remove Question',
                message: 'Are you sure you want to remove this question?',
                confirmText: 'Remove',
                cancelText: 'Cancel',
                dangerMode: true
            });

            if (confirmed) {
                this.generatedQuestions.splice(index, 1);
                // Reorder
                this.generatedQuestions.forEach((q, i) => {
                    q.order = i + 1;
                    q.blankNumber = i + 1;
                });
                this.initIcons();
            }
        },

        async clearAll() {
            const confirmed = await this.$root.showConfirmDialog({
                title: 'Clear All',
                message: 'This will clear the summary and all questions. This action cannot be undone.',
                confirmText: 'Clear All',
                cancelText: 'Cancel',
                dangerMode: true
            });

            if (confirmed) {
                this.summaryTitle = '';
                this.summaryText = '';
                this.generatedQuestions = [];
                this.currentStep = 1;
                this.showPreview = false;
            }
        },

        goBack() {
            this.currentStep = 1;
        },

        saveQuestions() {
            if (!this.canSave) {
                this.$root.showNotification('Please set answers for all questions', 'warning');
                return;
            }

            // Create the JSON structure for question_data
            const summaryDataJSON = {
                title: this.summaryTitle,
                text: this.summaryText,
                blankCount: this.generatedQuestions.length
            };

            // Emit both the questions and the summary data
            this.$emit('questions-ready', this.generatedQuestions);
            this.$emit('update:summary-data', JSON.stringify(summaryDataJSON, null, 2));
        },

        cancel() {
            this.$emit('cancel');
        },

        insertBlank() {
            const textarea = this.$refs.summaryTextarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = this.summaryText;

            this.summaryText = text.substring(0, start) + '___' + text.substring(end);

            this.$nextTick(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 3, start + 3);
            });
        }
    },

    template: `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-slate-900">Summary Completion Builder</h3>
                    <p class="text-sm text-slate-600 mt-1">Create summary with blanks - questions auto-generate from ___ markers</p>
                </div>
                <button @click="cancel" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                    <i data-feather="x" class="w-4 h-4 inline-block mr-1"></i>
                    Close
                </button>
            </div>

            <!-- Step 1: Enter Summary -->
            <div v-if="currentStep === 1" class="space-y-6">
                <!-- Title Input -->
                <div class="bg-white rounded-lg border border-slate-200 p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <i data-feather="type" class="w-5 h-5 text-orange-600"></i>
                        <h4 class="font-semibold text-slate-900">Summary Title</h4>
                    </div>
                    <input 
                        v-model="summaryTitle"
                        type="text"
                        class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., The History of Aviation"
                    >
                </div>

                <!-- Summary Text Input with Drag & Drop -->
                <div class="bg-white rounded-lg border border-slate-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <i data-feather="file-text" class="w-5 h-5 text-orange-600"></i>
                            <h4 class="font-semibold text-slate-900">Summary Text</h4>
                            <span v-if="blankCount > 0" class="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                                {{ blankCount }} blank{{ blankCount !== 1 ? 's' : '' }}
                            </span>
                        </div>
                        <button @click="insertBlank" 
                                class="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                            <i data-feather="plus" class="w-4 h-4 inline-block mr-1"></i>
                            Insert Blank
                        </button>
                    </div>

                    <!-- Drag & Drop Zone -->
                    <div 
                        class="drop-zone relative"
                        @dragenter="handleDragEnter"
                        @dragover="handleDragOver"
                        @dragleave="handleDragLeave"
                        @drop="handleDrop">
                        
                        <!-- Drag Overlay -->
                        <div v-if="isDragging" 
                             class="absolute inset-0 z-10 bg-orange-50 border-2 border-dashed border-orange-400 rounded-lg flex items-center justify-center">
                            <div class="text-center">
                                <i data-feather="upload-cloud" class="w-12 h-12 text-orange-600 mx-auto mb-2"></i>
                                <p class="text-sm font-medium text-orange-900">Drop your summary text here</p>
                            </div>
                        </div>

                        <textarea 
                            ref="summaryTextarea"
                            v-model="summaryText"
                            @paste="handlePaste"
                            rows="12"
                            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm transition-colors"
                            :class="isDragging ? 'border-orange-400 bg-orange-50' : ''"
                            placeholder="Enter your summary text here. Use ___ (three underscores) to mark where answers should go.&#10;&#10;Example:&#10;The first airplane was invented by the ___ brothers in ___. This historic flight took place at ___ Beach."
                        ></textarea>
                    </div>

                    <div class="mt-3 space-y-2">
                        <div class="flex items-start gap-2">
                            <i data-feather="info" class="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0"></i>
                            <p class="text-xs text-slate-600">
                                Use <code class="bg-slate-100 px-1 py-0.5 rounded font-mono">___</code> (three underscores) to mark blank positions. 
                                <strong class="text-orange-600">Drag & drop a .txt file</strong> or paste text directly.
                            </p>
                        </div>
                        <div class="flex items-start gap-2">
                            <i data-feather="zap" class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"></i>
                            <p class="text-xs text-slate-600">
                                Questions will be automatically generated for each blank with surrounding context.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Generate Button -->
                <div class="flex justify-end gap-3">
                    <button @click="cancel" 
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button @click="generateQuestions" 
                            :disabled="!hasValidSummary"
                            class="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                        <i data-feather="arrow-right" class="w-4 h-4 inline-block mr-1"></i>
                        Generate Questions ({{ blankCount }})
                    </button>
                </div>
            </div>

            <!-- Step 2: Review & Edit Questions -->
            <div v-if="currentStep === 2" class="space-y-6">
                <!-- Summary Preview -->
                <div class="bg-white rounded-lg border border-slate-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <i data-feather="eye" class="w-5 h-5 text-orange-600"></i>
                            <h4 class="font-semibold text-slate-900">{{ summaryTitle }}</h4>
                        </div>
                        <button @click="goBack" 
                                class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            <i data-feather="edit-2" class="w-4 h-4 inline-block mr-1"></i>
                            Edit Summary
                        </button>
                    </div>
                    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{{ summaryText }}</p>
                    </div>
                </div>

                <!-- Questions List -->
                <div class="bg-white rounded-lg border border-slate-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <i data-feather="list" class="w-5 h-5 text-orange-600"></i>
                            <h4 class="font-semibold text-slate-900">Set Correct Answers</h4>
                            <span class="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                                {{ generatedQuestions.length }} question{{ generatedQuestions.length !== 1 ? 's' : '' }}
                            </span>
                        </div>
                        <button @click="clearAll" 
                                class="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                            <i data-feather="trash-2" class="w-4 h-4 inline-block mr-1"></i>
                            Clear All
                        </button>
                    </div>

                    <div class="space-y-3">
                        <div v-for="(question, index) in generatedQuestions" :key="question.tempId"
                             class="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                            
                            <!-- Question Number -->
                            <div class="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span class="text-sm font-bold text-orange-700">{{ question.blankNumber }}</span>
                            </div>

                            <!-- Question Content -->
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-slate-700 leading-relaxed mb-2 font-mono">{{ question.question_text }}</p>
                                
                                <!-- Answer Input -->
                                <div class="flex items-center gap-2">
                                    <label class="text-xs font-medium text-slate-600">Correct Answer:</label>
                                    <input 
                                        :value="question.correct_answer_text"
                                        @input="updateAnswer(index, $event.target.value)"
                                        type="text"
                                        class="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        :class="!question.correct_answer_text.trim() ? 'bg-amber-50 border-amber-300' : 'bg-white'"
                                        placeholder="Enter the correct answer..."
                                    >
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex items-center gap-1">
                                <button @click="editQuestionText(index)" 
                                        class="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                        title="Edit question text">
                                    <i data-feather="edit-2" class="w-4 h-4"></i>
                                </button>
                                <button @click="removeQuestion(index)" 
                                        class="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                        title="Remove">
                                    <i data-feather="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="flex justify-between items-center gap-3 mt-6 pt-6 border-t border-slate-200">
                        <button @click="goBack" 
                                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            <i data-feather="arrow-left" class="w-4 h-4 inline-block mr-1"></i>
                            Back to Summary
                        </button>
                        
                        <div class="flex gap-3">
                            <button @click="cancel" 
                                    class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button @click="saveQuestions" 
                                    :disabled="!canSave"
                                    class="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                                <i data-feather="check" class="w-4 h-4 inline-block mr-1"></i>
                                Save {{ generatedQuestions.length }} Question{{ generatedQuestions.length !== 1 ? 's' : '' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="currentStep === 1 && !summaryText" class="bg-slate-50 rounded-lg border border-slate-200 border-dashed p-12 text-center">
                <i data-feather="file-text" class="w-12 h-12 text-slate-400 mx-auto mb-3"></i>
                <h4 class="text-sm font-medium text-slate-900 mb-1">Ready to create summary completion</h4>
                <p class="text-sm text-slate-600 mb-4">Enter a title and summary text with blanks (___) to get started</p>
                <div class="flex items-center justify-center gap-4 text-xs text-slate-500">
                    <div class="flex items-center gap-1">
                        <i data-feather="upload" class="w-3 h-3"></i>
                        <span>Drag & drop .txt file</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i data-feather="type" class="w-3 h-3"></i>
                        <span>Type directly</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i data-feather="clipboard" class="w-3 h-3"></i>
                        <span>Paste text</span>
                    </div>
                </div>
            </div>
        </div>
    `
};
