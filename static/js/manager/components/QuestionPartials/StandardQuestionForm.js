/**
 * Standard Question Form Component
 * Form for non-T/F/NG question types
 */

window.StandardQuestionFormComponent = {
    props: {
        question: {
            type: Object,
            required: true
        },
        questionType: {
            type: Object,
            required: true
        },
        validationErrors: {
            type: Object,
            default: () => ({})
        },
        isEditing: {
            type: Boolean,
            default: false
        },
        editingIndex: {
            type: Number,
            default: null
        },
        showExplanation: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            localShowExplanation: this.showExplanation
        };
    },

    watch: {
        showExplanation(val) {
            this.localShowExplanation = val;
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

        toggleExplanation() {
            this.localShowExplanation = !this.localShowExplanation;
            this.$emit('update:showExplanation', this.localShowExplanation);
        },

        updateQuestion(field, value) {
            this.$emit('update:question', { ...this.question, [field]: value });
        },

        addQuestion() {
            this.$emit('add-question');
        },

        addAndNew() {
            this.$emit('add-and-new');
        },

        cancelEdit() {
            this.$emit('cancel-edit');
        },

        handleKeyPress(event) {
            this.$emit('keypress', event);
        }
    },

    template: `
        <div class="bg-white rounded-lg border border-slate-200 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-slate-900">
                    {{ isEditing ? 'Edit Question' : 'Add Question' }}
                </h3>
                <div v-if="isEditing" class="flex items-center gap-2">
                    <span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                        Editing Q{{ editingIndex + 1 }}
                    </span>
                    <button @click="cancelEdit" 
                            class="text-xs text-slate-500 hover:text-slate-700">
                        Cancel
                    </button>
                </div>
            </div>

            <!-- Validation Errors -->
            <div v-if="Object.keys(validationErrors).length > 0" class="mb-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <div class="flex items-start gap-2">
                    <i data-feather="alert-triangle" class="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5"></i>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-rose-800 mb-1">Please fix the following errors:</p>
                        <ul class="text-xs text-rose-700 space-y-1">
                            <li v-for="(error, key) in validationErrors" :key="key">• {{ error }}</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="space-y-4" @keydown="handleKeyPress">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">
                        Question Text
                        <span class="text-rose-600">*</span>
                    </label>
                    <textarea 
                        :value="question.question_text"
                        @input="updateQuestion('question_text', $event.target.value)"
                        rows="3"
                        :class="validationErrors.question_text ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-orange-500'"
                        class="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:border-orange-500"
                        placeholder="Enter the question..."
                    ></textarea>
                    <p class="mt-1 text-xs text-slate-500">{{ question.question_text.length }} characters</p>
                </div>

                <!-- MCQ Choices -->
                <mcq-builder 
                    v-if="questionType.hasChoices"
                    :question="question"
                    :question-type="questionType.code"
                    :validation-errors="validationErrors"
                    @update:question="$emit('update:question', $event)"
                ></mcq-builder>

                <!-- Non-MCQ Answer -->
                <div v-else>
                    <label class="block text-sm font-medium text-slate-700 mb-2">
                        Correct Answer
                        <span class="text-rose-600">*</span>
                    </label>
                    <input 
                        :value="question.correct_answer_text"
                        @input="updateQuestion('correct_answer_text', $event.target.value)"
                        type="text"
                        :class="validationErrors.correct_answer ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-orange-500'"
                        class="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:border-orange-500"
                        placeholder="Enter the correct answer"
                    >
                    <p v-if="validationErrors.correct_answer" class="mt-1 text-xs text-rose-600">
                        {{ validationErrors.correct_answer }}
                    </p>
                </div>

                <!-- Additional Options -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Points
                        </label>
                        <input 
                            :value="question.points"
                            @input="updateQuestion('points', parseInt($event.target.value) || 1)"
                            type="number"
                            min="1"
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Add Explanation
                        </label>
                        <button @click="toggleExplanation"
                                :class="localShowExplanation ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-white text-slate-700 border-slate-300'"
                                class="w-full px-4 py-2.5 border rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium">
                            {{ localShowExplanation ? 'Hide' : 'Show' }} Explanation
                        </button>
                    </div>
                </div>

                <!-- Explanation Field -->
                <div v-show="localShowExplanation">
                    <label class="block text-sm font-medium text-slate-700 mb-2">
                        Explanation / Feedback
                    </label>
                    <textarea 
                        :value="question.explanation"
                        @input="updateQuestion('explanation', $event.target.value)"
                        rows="2"
                        class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Optional: Explain the answer for students"
                    ></textarea>
                </div>
            </div>

            <div class="flex justify-between items-center gap-2 mt-6 pt-4 border-t border-slate-200">
                <div class="text-xs text-slate-500">
                    Press <kbd class="px-2 py-1 bg-slate-100 rounded border border-slate-300">Ctrl/Cmd + Enter</kbd> to add and continue
                    <span v-if="isEditing"> or <kbd class="px-2 py-1 bg-slate-100 rounded border border-slate-300">Esc</kbd> to cancel</span>
                </div>
                <div class="flex gap-2">
                    <button v-if="isEditing" @click="cancelEdit"
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel Edit
                    </button>
                    <button @click="addQuestion" 
                            class="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                        {{ isEditing ? 'Update Question' : 'Add Question' }}
                    </button>
                    <button v-if="!isEditing" @click="addAndNew" 
                            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors">
                        <span class="flex items-center gap-2">
                            Add & New
                            <i data-feather="arrow-right" class="w-4 h-4"></i>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    `
};
