/**
 * Question Form Mixin
 * Shared validation and form management logic
 */

window.QuestionFormMixin = {
    data() {
        return {
            validationErrors: {},
            currentQuestion: {
                id: null,
                question_text: '',
                correct_answer_text: '',
                answer_two_text: '',
                choices: [],
                order: null,
                explanation: '',
                points: 1,
            },
            showExplanation: false,
            editingQuestionIndex: null,
        };
    },

    computed: {
        isQuestionValid() {
            if (!this.currentQuestion.question_text.trim()) return false;

            if (this.selectedQuestionType?.hasChoices) {
                return this.currentQuestion.choices.length >= 2 &&
                    this.currentQuestion.choices.some(c => c.is_correct);
            }

            return this.currentQuestion.correct_answer_text.trim();
        },
    },

    methods: {
        validateQuestion() {
            this.validationErrors = {};

            if (!this.currentQuestion.question_text.trim()) {
                this.validationErrors.question_text = 'Question text is required';
            }

            if (this.selectedQuestionType?.hasChoices) {
                if (this.currentQuestion.choices.length < 2) {
                    this.validationErrors.choices = 'At least 2 choices are required';
                }
                if (!this.currentQuestion.choices.some(c => c.is_correct)) {
                    this.validationErrors.correct = 'Please mark at least one correct answer';
                }
                if (this.currentQuestion.choices.some(c => !c.choice_text.trim())) {
                    this.validationErrors.choices = 'All choices must have text';
                }
            } else {
                if (!this.currentQuestion.correct_answer_text.trim()) {
                    this.validationErrors.correct_answer = 'Correct answer is required';
                }
            }

            return Object.keys(this.validationErrors).length === 0;
        },

        resetQuestionForm() {
            this.currentQuestion = {
                id: null,
                question_text: '',
                correct_answer_text: '',
                answer_two_text: '',
                choices: [],
                order: null,
                explanation: '',
                points: 1,
            };
            this.editingQuestionIndex = null;
            this.validationErrors = {};
            this.showExplanation = false;
        },

        createQuestionObject() {
            return {
                id: this.currentQuestion.id || null,
                question_text: this.currentQuestion.question_text,
                correct_answer_text: this.currentQuestion.correct_answer_text,
                answer_two_text: this.currentQuestion.answer_two_text,
                choices: this.selectedQuestionType?.hasChoices ? [...this.currentQuestion.choices] : [],
                order: this.currentQuestion.order || this.questions.length + 1,
                explanation: this.currentQuestion.explanation || '',
                points: this.currentQuestion.points || 1,
            };
        },

        handleKeyPress(event) {
            // Ctrl/Cmd + Enter to add question and continue
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                if (this.isQuestionValid) {
                    this.addAndNew();
                }
            }
            // Escape to cancel edit
            if (event.key === 'Escape' && this.editingQuestionIndex !== null) {
                this.resetQuestionForm();
                this.$root.showNotification('Edit cancelled', 'info');
            }
        },
    }
};
