/**
 * Matching Features Builder Component
 * Specialized builder for Matching questions (MF/MI)
 * Allows rapid bulk entry with dropdown answers
 */

window.MatchingBuilderComponent = {
    props: {
        questionType: {
            type: String,
            default: 'MF' // 'MF', 'MI', or 'MH'
        },
        existingQuestions: {
            type: Array,
            default: () => []
        },
        matchingOptions: {
            type: String,
            default: '' // Options from question_data (A, B, C, D, etc.)
        }
    },

    data() {
        return {
            bulkText: '',
            previewQuestions: [],
            showPreview: false,
            options: [], // Parsed from matchingOptions
            showOptionsEditor: false,
            optionsText: '',
            isDragging: false,
        };
    },

    computed: {
        hasValidQuestions() {
            return this.previewQuestions.length > 0 &&
                this.previewQuestions.every(q => q.correct_answer_text);
        },

        questionsWithoutAnswers() {
            return this.previewQuestions.filter(q => !q.correct_answer_text).length;
        },

        hasOptions() {
            return this.options.length > 0;
        }
    },

    watch: {
        existingQuestions: {
            immediate: true,
            handler(questions) {
                if (questions && questions.length > 0) {
                    this.previewQuestions = questions.map((q, idx) => ({
                        ...q,
                        tempId: q.tempId || `existing-${q.id || idx}`
                    }));
                    this.showPreview = true;

                    // If only one question, we're in edit mode for that question
                    // If multiple questions, we're viewing all existing questions
                    if (questions.length === 1) {
                        console.log('Edit mode: Single question loaded for editing');
                    } else {
                        console.log(`View mode: ${questions.length} existing questions loaded`);
                    }
                }
            }
        },
        matchingOptions: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.parseOptions(value);
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

        parseOptions(text) {
            if (!text) {
                this.options = [];
                return;
            }

            // Parse options in format: "A - Option 1\nB - Option 2" or "A) Option 1"
            const lines = text.split('\n').filter(line => line.trim());
            this.options = lines.map(line => {
                const match = line.match(/^([A-Z])\s*[-:).]\s*(.+)$/i);
                if (match) {
                    return {
                        value: match[1].toUpperCase(),
                        label: match[2].trim(),
                        fullText: line.trim()
                    };
                }
                // Fallback: use first char as value
                return {
                    value: line.charAt(0).toUpperCase(),
                    label: line.trim(),
                    fullText: line.trim()
                };
            });
        },

        toggleOptionsEditor() {
            this.showOptionsEditor = !this.showOptionsEditor;
            if (this.showOptionsEditor) {
                // Populate with existing options
                this.optionsText = this.options.map(o => o.fullText).join('\n');
            }
            this.initIcons();
        },

        saveOptions() {
            if (!this.optionsText.trim()) {
                this.$root.showNotification('Please enter matching options', 'warning');
                return;
            }

            this.parseOptions(this.optionsText);
            this.showOptionsEditor = false;
            this.$emit('update:matching-options', this.optionsText);
            this.$root.showNotification(`${this.options.length} option(s) loaded`, 'success');
            this.initIcons();
        },

        processQuestions() {
            if (!this.bulkText.trim()) {
                this.$root.showNotification('Please enter questions', 'warning');
                return;
            }

            if (this.options.length === 0) {
                this.$root.showNotification('Please set up matching options first', 'warning');
                return;
            }

            const lines = this.bulkText.split('\n').filter(line => line.trim());

            if (lines.length === 0) {
                this.$root.showNotification('No valid questions found', 'warning');
                return;
            }

            // Create preview questions
            this.previewQuestions = lines.map((line, index) => ({
                tempId: `question-${Date.now()}-${index}`,
                question_text: line.trim(),
                correct_answer_text: '',
                answer_two_text: '',
                choices: [],
                order: index + 1,
                explanation: '',
                points: 1,
            }));

            this.showPreview = true;
            this.bulkText = '';
            this.$root.showNotification(`${lines.length} question(s) ready for answers`, 'success');
            this.initIcons();
        },

        setAnswer(questionIndex, answer) {
            const question = this.previewQuestions[questionIndex];
            const updatedQuestion = { ...question, correct_answer_text: answer };
            this.previewQuestions.splice(questionIndex, 1, updatedQuestion);
            this.$nextTick(() => {
                this.initIcons();
            });
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
                this.previewQuestions.splice(index, 1);
                // Reorder
                this.previewQuestions.forEach((q, i) => {
                    q.order = i + 1;
                });
                this.initIcons();
            }
        },

        editQuestion(index) {
            const question = this.previewQuestions[index];
            const newText = prompt('Edit question:', question.question_text);
            if (newText && newText.trim()) {
                question.question_text = newText.trim();
                this.$forceUpdate();
            }
        },

        addSingleQuestion() {
            if (this.options.length === 0) {
                this.$root.showNotification('Please set up matching options first', 'warning');
                return;
            }

            const text = prompt('Enter question text:');
            if (text && text.trim()) {
                this.previewQuestions.push({
                    tempId: `question-${Date.now()}`,
                    question_text: text.trim(),
                    correct_answer_text: '',
                    answer_two_text: '',
                    choices: [],
                    order: this.previewQuestions.length + 1,
                    explanation: '',
                    points: 1,
                });
                this.showPreview = true;
                this.$root.showNotification('Question added', 'success');
                this.initIcons();
            }
        },

        async clearAll() {
            const confirmed = await this.$root.showConfirmDialog({
                title: 'Clear All Questions',
                message: 'This will remove all questions. This action cannot be undone.',
                confirmText: 'Clear All',
                cancelText: 'Cancel',
                dangerMode: true
            });

            if (confirmed) {
                this.previewQuestions = [];
                this.bulkText = '';
                this.showPreview = false;
            }
        },

        saveQuestions() {
            if (!this.hasValidQuestions) {
                this.$root.showNotification('Please set answers for all questions', 'warning');
                return;
            }

            if (this.options.length === 0) {
                this.$root.showNotification('Please set up matching options first', 'warning');
                return;
            }

            // Emit questions and options to parent
            this.$emit('questions-ready', this.previewQuestions);
        },

        cancel() {
            this.$emit('cancel');
        },

        getAnswerColor(answer) {
            // Cycle through colors for visual distinction
            const colors = ['indigo', 'blue', 'green', 'amber', 'rose', 'purple', 'pink', 'cyan'];
            const index = answer.charCodeAt(0) - 65; // A=0, B=1, etc.
            return colors[index % colors.length];
        },

        moveQuestionUp(index) {
            if (index > 0) {
                const temp = this.previewQuestions[index];
                this.previewQuestions[index] = this.previewQuestions[index - 1];
                this.previewQuestions[index - 1] = temp;
                // Update orders
                this.previewQuestions[index].order = index + 1;
                this.previewQuestions[index - 1].order = index;
                this.initIcons();
            }
        },

        moveQuestionDown(index) {
            if (index < this.previewQuestions.length - 1) {
                const temp = this.previewQuestions[index];
                this.previewQuestions[index] = this.previewQuestions[index + 1];
                this.previewQuestions[index + 1] = temp;
                // Update orders
                this.previewQuestions[index].order = index + 1;
                this.previewQuestions[index + 1].order = index + 2;
                this.initIcons();
            }
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
            // Only set to false if we're leaving the drop zone entirely
            if (event.target.classList.contains('drop-zone')) {
                this.isDragging = false;
            }
        },

        async handleDrop(event) {
            event.preventDefault();
            this.isDragging = false;

            if (this.options.length === 0) {
                this.$root.showNotification('Please set up matching options first', 'warning');
                return;
            }

            const items = event.dataTransfer.items;
            const files = event.dataTransfer.files;

            // Handle dropped files
            if (files.length > 0) {
                for (let file of files) {
                    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                        const text = await this.readFileAsText(file);
                        this.bulkText = text;
                        this.processQuestions();
                        return;
                    }
                }
                this.$root.showNotification('Please drop a text file (.txt)', 'warning');
                return;
            }

            // Handle dropped text
            const text = event.dataTransfer.getData('text/plain');
            if (text) {
                this.bulkText = text;
                this.processQuestions();
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
            // Allow default paste behavior in textarea
            this.$nextTick(() => {
                if (this.bulkText.trim()) {
                    this.$root.showNotification('Text pasted! Click "Process Questions" when ready', 'info');
                }
            });
        }
    },

    template: `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-slate-900">Matching Features Builder</h3>
                    <p class="text-sm text-slate-600 mt-1">Quickly add matching questions with answers</p>
                </div>
                <button @click="cancel" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                    <i data-feather="x" class="w-4 h-4 inline-block mr-1"></i>
                    Close
                </button>
            </div>

            <!-- Options Setup -->
            <div class="bg-white rounded-lg border border-slate-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <i data-feather="list" class="w-5 h-5 text-orange-600"></i>
                        <h4 class="font-semibold text-slate-900">Matching Options</h4>
                        <span v-if="hasOptions" class="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                            {{ options.length }} options
                        </span>
                    </div>
                    <button @click="toggleOptionsEditor" 
                            class="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                        <i :data-feather="showOptionsEditor ? 'x' : 'edit-2'" class="w-4 h-4 inline-block mr-1"></i>
                        {{ showOptionsEditor ? 'Cancel' : (hasOptions ? 'Edit Options' : 'Set Options') }}
                    </button>
                </div>

                <!-- Options Editor -->
                <div v-if="showOptionsEditor" class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Enter matching options (one per line)
                        </label>
                        <textarea 
                            v-model="optionsText"
                            rows="6"
                            class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                            placeholder="A - First option&#10;B - Second option&#10;C - Third option&#10;D - Fourth option"
                        ></textarea>
                        <p class="text-xs text-slate-500 mt-2">
                            Format: <code class="bg-slate-100 px-1 py-0.5 rounded">A - Option text</code> or 
                            <code class="bg-slate-100 px-1 py-0.5 rounded">A) Option text</code>
                        </p>
                    </div>
                    <div class="flex justify-end gap-2">
                        <button @click="showOptionsEditor = false" 
                                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button @click="saveOptions" 
                                class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">
                            Save Options
                        </button>
                    </div>
                </div>

                <!-- Options Display -->
                <div v-else-if="hasOptions" class="grid grid-cols-2 gap-3">
                    <div v-for="option in options" :key="option.value" 
                         class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div :class="'w-8 h-8 bg-' + getAnswerColor(option.value) + '-100 rounded-lg flex items-center justify-center'">
                            <span :class="'font-bold text-' + getAnswerColor(option.value) + '-700'">{{ option.value }}</span>
                        </div>
                        <span class="text-sm text-slate-900">{{ option.label }}</span>
                    </div>
                </div>

                <!-- No Options State -->
                <div v-else class="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                    <i data-feather="alert-circle" class="w-8 h-8 text-slate-400 mx-auto mb-2"></i>
                    <p class="text-sm text-slate-600 mb-3">No matching options set</p>
                    <button @click="toggleOptionsEditor" 
                            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">
                        Set Up Options
                    </button>
                </div>
            </div>

            <!-- Bulk Entry Section -->
            <div v-if="hasOptions" class="bg-white rounded-lg border border-slate-200 p-6">
                <div class="flex items-center gap-2 mb-4">
                    <i data-feather="edit-3" class="w-5 h-5 text-orange-600"></i>
                    <h4 class="font-semibold text-slate-900">Add Questions</h4>
                    <span class="text-xs text-slate-500 ml-2">• Drag & drop text files or paste directly</span>
                </div>

                <div class="space-y-3">
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
                                <p class="text-sm font-medium text-orange-900">Drop your text file here</p>
                                <p class="text-xs text-orange-600 mt-1">or drop copied text</p>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">
                                Enter questions (one per line)
                            </label>
                            <textarea 
                                v-model="bulkText"
                                @paste="handlePaste"
                                rows="8"
                                class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                :class="isDragging ? 'border-orange-400 bg-orange-50' : ''"
                                placeholder="Question 1 text here&#10;Question 2 text here&#10;Question 3 text here&#10;&#10;Or drag & drop a text file here..."
                            ></textarea>
                            <div class="flex items-start gap-2 mt-2">
                                <i data-feather="info" class="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0"></i>
                                <p class="text-xs text-slate-500">
                                    Each line will become a separate question. You'll assign answers in the next step.
                                    <strong class="text-orange-600">Try dragging a .txt file here!</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3">
                        <button @click="addSingleQuestion" 
                                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            <i data-feather="plus" class="w-4 h-4 inline-block mr-1"></i>
                            Add Single
                        </button>
                        <button @click="processQuestions" 
                                :disabled="!bulkText.trim()"
                                class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                            <i data-feather="arrow-right" class="w-4 h-4 inline-block mr-1"></i>
                            Process Questions
                        </button>
                    </div>
                </div>
            </div>

            <!-- Questions Preview & Answer Assignment -->
            <div v-if="showPreview && previewQuestions.length > 0" class="bg-white rounded-lg border border-slate-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <i data-feather="list" class="w-5 h-5 text-orange-600"></i>
                        <h4 class="font-semibold text-slate-900">Assign Answers</h4>
                        <span class="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                            {{ previewQuestions.length }} questions
                        </span>
                        <span v-if="questionsWithoutAnswers > 0" class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                            {{ questionsWithoutAnswers }} without answers
                        </span>
                    </div>
                    <button @click="clearAll" 
                            class="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                        <i data-feather="trash-2" class="w-4 h-4 inline-block mr-1"></i>
                        Clear All
                    </button>
                </div>

                <div class="space-y-3">
                    <div v-for="(question, index) in previewQuestions" :key="question.tempId"
                         class="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                        
                        <!-- Question Number -->
                        <div class="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span class="text-sm font-bold text-orange-700">{{ question.order }}</span>
                        </div>

                        <!-- Question Text -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-slate-900 leading-relaxed">{{ question.question_text }}</p>
                            
                            <!-- Answer Dropdown -->
                            <div class="mt-2 flex items-center gap-2">
                                <label class="text-xs font-medium text-slate-600">Answer:</label>
                                <select 
                                    :value="question.correct_answer_text"
                                    @change="setAnswer(index, $event.target.value)"
                                    class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    :class="question.correct_answer_text ? 'bg-white' : 'bg-amber-50 border-amber-300'">
                                    <option value="">Select answer...</option>
                                    <option v-for="option in options" :key="option.value" :value="option.value">
                                        {{ option.value }} - {{ option.label }}
                                    </option>
                                </select>
                                
                                <!-- Answer Badge -->
                                <span v-if="question.correct_answer_text" 
                                      :class="'px-2 py-1 text-xs font-semibold rounded-lg bg-' + getAnswerColor(question.correct_answer_text) + '-100 text-' + getAnswerColor(question.correct_answer_text) + '-700'">
                                    {{ question.correct_answer_text }}
                                </span>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1">
                            <button @click="moveQuestionUp(index)" 
                                    :disabled="index === 0"
                                    class="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move up">
                                <i data-feather="chevron-up" class="w-4 h-4"></i>
                            </button>
                            <button @click="moveQuestionDown(index)" 
                                    :disabled="index === previewQuestions.length - 1"
                                    class="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move down">
                                <i data-feather="chevron-down" class="w-4 h-4"></i>
                            </button>
                            <button @click="editQuestion(index)" 
                                    class="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                    title="Edit">
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

                <!-- Action Buttons -->
                <div class="flex justify-between items-center gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button @click="addSingleQuestion" 
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        <i data-feather="plus" class="w-4 h-4 inline-block mr-1"></i>
                        Add Another
                    </button>
                    
                    <div class="flex gap-3">
                        <button @click="cancel" 
                                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button @click="saveQuestions" 
                                :disabled="!hasValidQuestions"
                                class="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                            <i data-feather="check" class="w-4 h-4 inline-block mr-1"></i>
                            Save {{ previewQuestions.length }} Question{{ previewQuestions.length !== 1 ? 's' : '' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="hasOptions" class="bg-slate-50 rounded-lg border border-slate-200 border-dashed p-12 text-center">
                <i data-feather="file-text" class="w-12 h-12 text-slate-400 mx-auto mb-3"></i>
                <h4 class="text-sm font-medium text-slate-900 mb-1">No questions yet</h4>
                <p class="text-sm text-slate-600 mb-4">Enter questions above to get started</p>
            </div>
        </div>
    `
};
