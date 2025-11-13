/**
 * Question List Manager Component
 * Handles displaying, editing, reordering, and managing questions
 */

window.QuestionListComponent = {
    props: {
        questions: {
            type: Array,
            required: true
        },
        questionType: {
            type: String,
            required: true
        },
        previewMode: {
            type: Boolean,
            default: false
        }
    },

    computed: {
        isTFNGType() {
            return this.questionType === 'TFNG' || this.questionType === 'YNNG';
        },

        isMatchingType() {
            return this.questionType === 'MF' || this.questionType === 'MI' || this.questionType === 'MH';
        },

        hasDedicatedBuilder() {
            return this.isTFNGType || this.isMatchingType;
        },

        questionStats() {
            return {
                total: this.questions.length,
                withExplanation: this.questions.filter(q => q.explanation).length,
                totalPoints: this.questions.reduce((sum, q) => sum + (q.points || 1), 0),
            };
        }
    },

    mounted() {
        this.initIcons();
    },

    watch: {
        'questions.length'() {
            this.$nextTick(() => {
                this.initIcons();
            });
        },
        previewMode() {
            this.$nextTick(() => {
                this.initIcons();
            });
        }
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

        editQuestion(index) {
            this.$emit('edit-question', index);
        },

        removeQuestion(index) {
            this.$emit('remove-question', index);
        },

        duplicateQuestion(index) {
            this.$emit('duplicate-question', index);
        },

        moveQuestionUp(index) {
            this.$emit('move-question-up', index);
        },

        moveQuestionDown(index) {
            this.$emit('move-question-down', index);
        },

        reorderQuestions(event, index) {
            this.$emit('reorder-question', { event, index });
        },

        togglePreview() {
            this.$emit('toggle-preview');
        },

        clearAll() {
            this.$emit('clear-all');
        },

        openBuilder() {
            this.$emit('open-builder');
        }
    },

    template: `
        <div class="question-list bg-white rounded-lg border border-slate-200 p-6">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-slate-900">Questions ({{ questions.length }})</h3>
                    <p v-if="questionStats.total > 0" class="text-xs text-slate-500 mt-1">
                        Total Points: {{ questionStats.totalPoints }} • With Explanations: {{ questionStats.withExplanation }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <button v-if="hasDedicatedBuilder && questions.length > 0" @click="openBuilder"
                            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 transition-colors">
                        <i data-feather="plus" class="w-3.5 h-3.5"></i>
                        Add More
                    </button>
                    <button v-if="questions.length > 0" @click="togglePreview"
                            :class="previewMode ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-white text-slate-700 border-slate-300'"
                            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 transition-colors">
                        <i data-feather="eye" class="w-3.5 h-3.5"></i>
                        {{ previewMode ? 'Edit Mode' : 'Preview Mode' }}
                    </button>
                    <button v-if="questions.length > 0" @click="clearAll"
                            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors">
                        <i data-feather="trash-2" class="w-3.5 h-3.5"></i>
                        Clear All
                    </button>
                </div>
            </div>
            
            <div v-if="questions.length === 0" class="text-center py-12">
                <i data-feather="help-circle" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i>
                <p class="text-sm text-slate-500 mb-2">No questions added yet</p>
                <p class="text-xs text-slate-400">Add questions individually or use bulk add</p>
            </div>

            <!-- Preview Mode -->
            <div v-else-if="previewMode" class="space-y-4">
                <div v-for="(question, index) in questions" :key="index"
                     class="bg-slate-50 rounded-lg p-5 border border-slate-200">
                    <div class="flex items-start gap-3">
                        <span class="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {{ index + 1 }}
                        </span>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-slate-900 mb-3">{{ question.question_text }}</p>
                            
                            <!-- MCQ Choices -->
                            <div v-if="question.choices && question.choices.length > 0" class="space-y-2 mb-3">
                                <div v-for="(choice, cIndex) in question.choices" :key="cIndex"
                                     :class="choice.is_correct ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200'"
                                     class="flex items-center gap-2 px-3 py-2 border rounded">
                                    <span class="text-xs font-medium text-slate-700">{{ String.fromCharCode(65 + cIndex) }}.</span>
                                    <span class="text-xs text-slate-800">{{ choice.choice_text }}</span>
                                    <i v-if="choice.is_correct" data-feather="check-circle" class="w-3.5 h-3.5 text-green-600 ml-auto"></i>
                                </div>
                            </div>
                            
                            <!-- Answer -->
                            <div v-else class="mb-3">
                                <div class="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-300 rounded text-xs">
                                    <i data-feather="check" class="w-3 h-3 text-green-700"></i>
                                    <span class="font-medium text-green-900">Answer: {{ question.correct_answer_text }}</span>
                                </div>
                            </div>
                            
                            <!-- Explanation -->
                            <div v-if="question.explanation" class="bg-orange-50 border border-orange-200 rounded p-2 text-xs text-orange-900">
                                <div class="flex items-start gap-2">
                                    <i data-feather="info" class="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5"></i>
                                    <span>{{ question.explanation }}</span>
                                </div>
                            </div>
                            
                            <!-- Meta -->
                            <div class="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                <span class="flex items-center gap-1">
                                    <i data-feather="award" class="w-3 h-3"></i>
                                    {{ question.points || 1 }} point{{ question.points !== 1 ? 's' : '' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Edit Mode -->
            <div v-else class="space-y-3">
                <div v-for="(question, index) in questions" :key="index"
                     class="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="flex items-center gap-1 flex-shrink-0">
                                    <span class="text-xs text-slate-500 font-medium">#</span>
                                    <input
                                        type="number"
                                        v-model.number="question.order"
                                        :min="1"
                                        @change="reorderQuestions($event, index)"
                                        @wheel.prevent
                                        inputmode="numeric"
                                        class="w-12 px-2 py-1 text-xs font-bold text-center bg-orange-50 text-orange-700 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        title="Question number in passage/part"
                                    >
                                </div>
                                <p class="text-sm font-medium text-slate-900 truncate">{{ question.question_text }}</p>
                                <span v-if="question.explanation" class="flex-shrink-0">
                                    <i data-feather="info" class="w-3.5 h-3.5 text-orange-500" title="Has explanation"></i>
                                </span>
                            </div>
                            <div class="ml-16 flex flex-wrap items-center gap-2">
                                <span class="text-xs text-slate-500">Answer:</span>
                                <span class="text-xs text-green-700 font-medium">{{ question.correct_answer_text }}</span>
                                <span class="text-xs text-slate-400">•</span>
                                <span class="text-xs text-slate-500">{{ question.points || 1 }} pt{{ question.points !== 1 ? 's' : '' }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button @click="moveQuestionUp(index)" :disabled="index === 0"
                                    class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors disabled:opacity-30"
                                    title="Move up">
                                <i data-feather="arrow-up" class="w-3.5 h-3.5"></i>
                            </button>
                            <button @click="moveQuestionDown(index)" :disabled="index === questions.length - 1"
                                    class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors disabled:opacity-30"
                                    title="Move down">
                                <i data-feather="arrow-down" class="w-3.5 h-3.5"></i>
                            </button>
                            <button v-if="!isTFNGType" @click="duplicateQuestion(index)"
                                    class="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                                    title="Duplicate">
                                <i data-feather="copy" class="w-3.5 h-3.5"></i>
                            </button>
                            <button @click="editQuestion(index)"
                                    class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                                    :title="isTFNGType ? 'Edit in Builder' : 'Edit'">
                                <i :data-feather="isTFNGType ? 'edit' : 'edit-2'" class="w-3.5 h-3.5"></i>
                            </button>
                            <button @click="removeQuestion(index)"
                                    class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded transition-colors"
                                    title="Delete">
                                <i data-feather="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
