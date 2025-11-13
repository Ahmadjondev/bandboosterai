/**
 * Multiple Choice Question Builder Component
 * Specialized builder for MCQ questions with choices
 * Supports both single answer (MCQ) and multiple answers (MCMA)
 */

window.MCQBuilderComponent = {
    props: {
        question: {
            type: Object,
            required: true
        },
        validationErrors: {
            type: Object,
            default: () => ({})
        },
        questionType: {
            type: String,
            default: 'MCQ'
        }
    },

    computed: {
        isMultipleAnswers() {
            return this.questionType === 'MCMA';
        },

        selectedCorrectCount() {
            return this.question.choices.filter(c => c.is_correct).length;
        },

        correctAnswersDisplay() {
            if (!this.isMultipleAnswers) return '';
            return this.selectedCorrectCount > 0
                ? `${this.selectedCorrectCount} correct answer${this.selectedCorrectCount !== 1 ? 's' : ''} selected`
                : 'Select multiple correct answers';
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

        addChoice() {
            this.question.choices.push({
                choice_text: '',
                is_correct: false,
            });
            this.$emit('update:question', this.question);
            this.initIcons();
        },

        removeChoice(index) {
            this.question.choices.splice(index, 1);
            this.$emit('update:question', this.question);
            this.initIcons();
        },

        setCorrectChoice(index) {
            if (this.isMultipleAnswers) {
                // MCMA: Toggle the selected choice
                this.question.choices[index].is_correct = !this.question.choices[index].is_correct;
            } else {
                // MCQ: Only one can be correct
                this.question.choices.forEach((choice, i) => {
                    choice.is_correct = i === index;
                });
            }
            this.$emit('update:question', this.question);
        },

        updateChoiceText(index, value) {
            this.question.choices[index].choice_text = value;
            this.$emit('update:question', this.question);
        }
    },

    template: `
        <div class="mcq-builder">
            <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-slate-700">Answer Choices</label>
                <div class="flex items-center gap-3">
                    <span v-if="isMultipleAnswers" class="text-xs font-medium px-2 py-1 rounded-full"
                          :class="selectedCorrectCount > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                        {{ correctAnswersDisplay }}
                    </span>
                    <span class="text-xs text-slate-500">{{ question.choices.length }} choices</span>
                </div>
            </div>
            
            <!-- Info banner for MCMA -->
            <div v-if="isMultipleAnswers" class="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div class="flex items-start gap-2">
                    <i data-feather="info" class="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0"></i>
                    <div class="text-xs text-orange-700">
                        <strong>Multiple Answers:</strong> Each correct answer counts as 1 question toward the 40-question total. 
                        For example, if you select 2 correct answers, this question counts as 2 questions.
                    </div>
                </div>
            </div>
            
            <div class="space-y-2">
                <div v-for="(choice, index) in question.choices" :key="index"
                     class="flex items-center gap-2">
                    <span class="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm font-medium text-slate-700 flex-shrink-0">
                        {{ String.fromCharCode(65 + index) }}
                    </span>
                    <input 
                        :value="choice.choice_text"
                        @input="updateChoiceText(index, $event.target.value)"
                        type="text"
                        class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        :placeholder="'Enter choice ' + String.fromCharCode(65 + index)"
                    >
                    <button @click="setCorrectChoice(index)"
                            :class="choice.is_correct ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300'"
                            class="px-3 py-2 border rounded-lg transition-colors flex-shrink-0 hover:shadow-md"
                            :title="isMultipleAnswers ? 'Toggle correct answer' : 'Mark as correct'">
                        <i data-feather="check" class="w-4 h-4"></i>
                    </button>
                    <button @click="removeChoice(index)"
                            class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
                        <i data-feather="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <button @click="addChoice"
                    class="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors">
                <i data-feather="plus" class="w-4 h-4"></i>
                Add Choice
            </button>
            <p v-if="validationErrors.choices || validationErrors.correct" class="mt-1 text-xs text-rose-600">
                {{ validationErrors.choices || validationErrors.correct }}
            </p>
        </div>
    `
};
