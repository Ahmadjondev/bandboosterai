/**
 * T/F/NG Question Builder Component
 * Specialized builder for True/False/Not Given questions
 * Allows rapid bulk entry with instant preview
 */

window.TFNGBuilderComponent = {
    props: {
        questionType: {
            type: String,
            default: 'TFNG' // 'TFNG' or 'YNNG'
        },
        existingQuestions: {
            type: Array,
            default: () => []
        }
    },

    data() {
        return {
            bulkText: '',
            previewQuestions: [],
            showPreview: false,
        };
    },

    computed: {
        answerOptions() {
            if (this.questionType === 'YNNG') {
                return [
                    { value: 'YES', label: 'Yes', color: 'green' },
                    { value: 'NO', label: 'No', color: 'rose' },
                    { value: 'NOT GIVEN', label: 'Not Given', color: 'amber' }
                ];
            }
            return [
                { value: 'TRUE', label: 'True', color: 'green' },
                { value: 'FALSE', label: 'False', color: 'rose' },
                { value: 'NOT GIVEN', label: 'Not Given', color: 'amber' }
            ];
        },

        typeLabel() {
            return this.questionType === 'YNNG' ? 'Yes/No/Not Given' : 'True/False/Not Given';
        },

        hasValidQuestions() {
            return this.previewQuestions.length > 0 &&
                this.previewQuestions.every(q => q.correct_answer_text);
        },

        questionsWithoutAnswers() {
            return this.previewQuestions.filter(q => !q.correct_answer_text).length;
        }
    },

    watch: {
        existingQuestions: {
            immediate: true,
            handler(questions) {
                if (questions && questions.length > 0) {
                    this.previewQuestions = questions.map((q, idx) => ({
                        ...q,
                        tempId: `existing-${idx}`
                    }));
                    this.showPreview = true;
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

        processQuestions() {
            if (!this.bulkText.trim()) {
                this.$root.showNotification('Please enter questions', 'warning');
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
            // Use proper Vue reactivity by replacing the object
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

            // Emit questions to parent
            console.log(this.previewQuestions);
            this.$emit('questions-ready', this.previewQuestions);
        },

        async cancel() {
            if (this.previewQuestions.length > 0) {
                const confirmed = await this.$root.showConfirmDialog({
                    title: 'Discard Questions',
                    message: 'You have unsaved questions. Are you sure you want to discard them?',
                    confirmText: 'Discard',
                    cancelText: 'Keep Editing',
                    dangerMode: true
                });

                if (confirmed) {
                    this.previewQuestions = [];
                    this.bulkText = '';
                    this.showPreview = false;
                    this.$emit('cancel');
                }
            } else {
                this.$emit('cancel');
            }
        },

        getAnswerColorClass(answer) {
            const option = this.answerOptions.find(opt => opt.value === answer);
            if (!option) return 'bg-slate-100 text-slate-700 border-slate-300';

            const colors = {
                green: 'bg-green-100 text-green-700 border-green-300',
                rose: 'bg-rose-100 text-rose-700 border-rose-300',
                amber: 'bg-amber-100 text-amber-700 border-amber-300'
            };
            return colors[option.color];
        },

        async setAllAnswers(answer) {
            const confirmed = await this.$root.showConfirmDialog({
                title: 'Set All Answers',
                message: `Set all unanswered questions to "${answer}"?`,
                confirmText: 'Set All',
                cancelText: 'Cancel',
                dangerMode: false
            });

            if (confirmed) {
                this.previewQuestions.forEach(q => {
                    if (!q.correct_answer_text) {
                        q.correct_answer_text = answer;
                    }
                });
                this.$forceUpdate();
                this.$root.showNotification(`Set ${this.questionsWithoutAnswers} answer(s) to ${answer}`, 'success');
            }
        },

        updateOrder(event, questionIndex) {
            const newOrder = parseInt(event.target.value);

            // Validate the new order - must be a positive integer
            if (isNaN(newOrder) || newOrder < 1) {
                // Reset to current value if invalid
                event.target.value = this.previewQuestions[questionIndex].order;
                this.$root.showNotification('Order must be a positive number', 'error');
                return;
            }

            const oldOrder = this.previewQuestions[questionIndex].order;

            if (oldOrder === newOrder) {
                return; // No change needed
            }

            // Update the order number (represents position in passage/part, not array index)
            this.previewQuestions[questionIndex].order = newOrder;

            this.$nextTick(() => {
                this.initIcons();
            });

            this.$root.showNotification(`Question order changed from ${oldOrder} to ${newOrder}`, 'success');
        }
    },

    template: `
        <div class="tfng-builder">
            <!-- Header -->
            <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <i data-feather="zap" class="w-5 h-5 text-orange-600"></i>
                            {{ typeLabel }} Quick Builder
                        </h3>
                        <p class="text-sm text-slate-500 mt-1">Add multiple questions at once and assign answers</p>
                    </div>
                    <button @click="cancel" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i data-feather="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <!-- Input Section -->
            <div v-if="!showPreview" class="space-y-4">
                <div class="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-orange-200 rounded-lg p-6">
                    <div class="flex items-start gap-3 mb-4">
                        <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i data-feather="edit-3" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-sm font-semibold text-slate-900 mb-1">Step 1: Enter Questions</h4>
                            <p class="text-xs text-slate-600">Type or paste one question per line. Press Enter for new question.</p>
                        </div>
                    </div>

                    <textarea 
                        v-model="bulkText"
                        rows="12"
                        class="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-sans text-sm"
                        placeholder="Example:&#10;The author was born in London.&#10;The study was conducted over five years.&#10;The results were published in 2020."
                        autofocus
                    ></textarea>

                    <div class="flex items-center justify-between mt-3">
                        <p class="text-xs text-slate-500">
                            <span class="font-medium">{{ bulkText.split('\\n').filter(l => l.trim()).length }}</span> question(s) entered
                        </p>
                        <button @click="bulkText = ''" 
                                v-if="bulkText"
                                class="text-xs text-slate-500 hover:text-slate-700">
                            Clear
                        </button>
                    </div>
                </div>

                <div class="flex justify-end gap-3">
                    <button @click="cancel" 
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button @click="processQuestions" 
                            :disabled="!bulkText.trim()"
                            class="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2">
                        <i data-feather="arrow-right" class="w-4 h-4"></i>
                        Continue to Answers
                    </button>
                </div>
            </div>

            <!-- Preview Section -->
            <div v-else class="space-y-4">
                <!-- Quick Actions Bar -->
                <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                    <div class="flex items-start gap-3 mb-3">
                        <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i data-feather="check-square" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-sm font-semibold text-slate-900 mb-1">Step 2: Assign Answers</h4>
                            <p class="text-xs text-slate-600 mb-2">Click the buttons below each question to set the correct answer. You can also edit the order numbers.</p>
                            
                            <!-- Quick Answer Actions -->
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-xs font-medium text-slate-700">Quick actions:</span>
                                <button v-for="option in answerOptions" :key="option.value"
                                        @click="setAllAnswers(option.value)"
                                        :class="'bg-' + option.color + '-100 text-' + option.color + '-700 border-' + option.color + '-300'"
                                        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded hover:opacity-80 transition-opacity">
                                     <i data-feather="zap" class="w-3 h-3"></i>
                                    Set All {{ option.label }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Progress -->
                    <div class="bg-white rounded-lg p-3 border border-green-200">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-medium text-slate-700">Progress</span>
                            <span class="text-xs text-slate-600">
                                {{ previewQuestions.length - questionsWithoutAnswers }} / {{ previewQuestions.length }} answered
                            </span>
                        </div>
                        <div class="w-full bg-slate-200 rounded-full h-2">
                            <div 
                                :style="{ width: ((previewQuestions.length - questionsWithoutAnswers) / previewQuestions.length * 100) + '%' }"
                                class="bg-green-600 h-2 rounded-full transition-all duration-300"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- Questions List -->
                <div class="space-y-3 max-h-96 overflow-y-auto pr-2">
                    <div v-for="(question, index) in previewQuestions" :key="question.tempId"
                         class="bg-white rounded-lg border-2 p-4 transition-all"
                         :class="question.correct_answer_text ? 'border-green-200' : 'border-amber-200'">
                        
                        <div class="flex items-start gap-3 mb-3">
                            <div class="flex-shrink-0">
                                <div class="flex items-center gap-1">
                                    <span class="text-xs text-slate-500 font-medium">#</span>
                                    <input
                                        type="number"
                                        v-model.number="question.order"
                                        :min="1"
                                        @change="updateOrder($event, index)"
                                        @wheel.prevent
                                        inputmode="numeric"
                                        class="w-12 px-2 py-1 text-xs font-bold text-center rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 border-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        :class="question.correct_answer_text ? 'bg-green-50 text-green-700 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-300'"
                                        title="Question number in passage/part"
                                    >
                                </div>
                            </div>
                            
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-slate-900 mb-3">{{ question.question_text }}</p>
                                
                                <!-- Answer Options -->
                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                    <button v-for="option in answerOptions" :key="option.value"
                                            @click="setAnswer(index, option.value)"
                                            :class="[
                                                question.correct_answer_text === option.value 
                                                    ? getAnswerColorClass(option.value) + ' ring-2 ring-offset-1 ring-' + option.color + '-500'
                                                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                            ]"
                                            class="px-3 py-1.5 text-xs font-medium border rounded-lg transition-all">
                                        <span class="flex items-center gap-1.5">

                                            {{ option.label }}
                                        </span>
                                    </button>
                                </div>

                                <!-- Status Badge -->
                                <div v-if="!question.correct_answer_text" class="flex items-center gap-1 text-xs text-amber-600">
                                    <i data-feather="alert-circle" class="w-3 h-3"></i>
                                    <span>Answer not set</span>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <button @click="editQuestion(index)"
                                        class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                        title="Edit question">
                                    <i data-feather="edit-2" class="w-3.5 h-3.5"></i>
                                </button>
                                <button @click="removeQuestion(index)"
                                        class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                        title="Remove">
                                    <i data-feather="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Actions Footer -->
                <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <div class="flex items-center gap-2">
                        <button @click="showPreview = false" 
                                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                            <i data-feather="arrow-left" class="w-4 h-4"></i>
                            Back to Edit
                        </button>
                        <button @click="addSingleQuestion" 
                                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors">
                            <i data-feather="plus" class="w-4 h-4"></i>
                            Add One More
                        </button>
                        <button @click="clearAll" 
                                v-if="previewQuestions.length > 0"
                                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors">
                            <i data-feather="trash-2" class="w-4 h-4"></i>
                            Clear All
                        </button>
                    </div>
                    
                    <button @click="saveQuestions" 
                            :disabled="!hasValidQuestions"
                            class="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2">
                        <i data-feather="check" class="w-4 h-4"></i>
                        Add {{ previewQuestions.length }} Question(s)
                    </button>
                </div>
            </div>
        </div>
    `,
};
