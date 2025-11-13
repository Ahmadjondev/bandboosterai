/**
 * Question Builder Component
 * Advanced question creation interface with support for multiple question types
 * Refactored for clean code architecture with modular components
 */

window.QuestionBuilderComponent = {
    mixins: [window.QuestionFormMixin],

    props: {
        testHeadId: {
            type: Number,
            default: null
        },
        questionType: {
            type: String,
            default: null
        }
    },

    data() {
        return {
            // Step management
            currentStep: 1,
            totalSteps: 3,

            // Question data
            questionGroup: {
                id: null,
                title: '',
                description: '',
                question_type: 'MCQ',
                question_data: '',
                reading: null,
            },

            questions: [],

            // UI state
            loading: false,
            saving: false,
            error: null,
            previewMode: false,
            iconInitTimeout: null,
            isInitializingIcons: false,
            showTFNGBuilder: false,
            tfngBuilderKey: 0,
            showMatchingBuilder: false,
            matchingBuilderKey: 0,
            showSummaryBuilder: false,
            summaryBuilderKey: 0,
            showNoteBuilder: false,
            noteBuilderKey: 0,
            showFormBuilder: false,
            formBuilderKey: 0,
            showDiagramBuilder: false,
            diagramBuilderKey: 0,
            showTableBuilder: false,
            tableBuilderKey: 0,
            showMapBuilder: false,
            mapBuilderKey: 0,

            // Filter context from navigation
            filterPassageId: null,
            filterPassageTitle: null,
            passageInfo: null,

            // Available question types
            questionTypes: [
                { code: 'MCQ', label: 'Multiple Choice', icon: 'list', hasChoices: true },
                { code: 'MCMA', label: 'Multiple Choice (Multiple Answers)', icon: 'check-square', hasChoices: true },
                { code: 'TFNG', label: 'True/False/Not Given', icon: 'check-circle', hasChoices: false },
                { code: 'YNNG', label: 'Yes/No/Not Given', icon: 'help-circle', hasChoices: false },
                { code: 'MF', label: 'Matching Features', icon: 'link', hasChoices: false },
                { code: 'MI', label: 'Matching Information', icon: 'link-2', hasChoices: false },
                { code: 'MH', label: 'Matching Headings', icon: 'align-left', hasChoices: false },
                { code: 'SC', label: 'Sentence Completion', icon: 'edit-3', hasChoices: false },
                { code: 'SA', label: 'Short Answer', icon: 'message-square', hasChoices: false },
                { code: 'SUC', label: 'Summary Completion', icon: 'file-text', hasChoices: false },
                { code: 'NC', label: 'Note Completion', icon: 'book', hasChoices: false },
                { code: 'FC', label: 'Form Completion', icon: 'clipboard', hasChoices: false },
                { code: 'TC', label: 'Table Completion', icon: 'grid', hasChoices: false },
                { code: 'DL', label: 'Diagram Labeling', icon: 'image', hasChoices: false },
                { code: 'ML', label: 'Map Labeling', icon: 'map', hasChoices: false },
            ],
        };
    },

    computed: {
        selectedQuestionType() {
            return this.questionTypes.find(t => t.code === this.questionGroup.question_type);
        },

        canProceedToStep2() {
            return this.questionGroup.title.trim() && this.questionGroup.question_type;
        },

        canProceedToStep3() {
            return this.questions.length > 0;
        },

        progressPercentage() {
            return (this.currentStep / this.totalSteps) * 100;
        },

        isMCQType() {
            return this.questionGroup.question_type === 'MCQ' || this.questionGroup.question_type === 'MCMA';
        },

        isTFNGType() {
            return this.questionGroup.question_type === 'TFNG' || this.questionGroup.question_type === 'YNNG';
        },

        isMatchingType() {
            return this.questionGroup.question_type === 'MF' ||
                this.questionGroup.question_type === 'MI' ||
                this.questionGroup.question_type === 'MH';
        },
        isSummaryCompletionType() {
            return this.questionGroup.question_type === 'SUC';
        },
        isNoteCompletionType() {
            return this.questionGroup.question_type === 'NC';
        },
        isFormCompletionType() {
            return this.questionGroup.question_type === 'FC';
        },
        isDiagramLabelingType() {
            return this.questionGroup.question_type === 'DL';
        },
        isTableCompletionType() {
            return this.questionGroup.question_type === 'TC';
        },
        isMapLabelingType() {
            return this.questionGroup.question_type === 'ML';
        },
    },

    watch: {
        previewMode() {
            this.$nextTick(() => {
                this.initIcons();
            });
        },
        'questionGroup.question_type'() {
            this.$nextTick(() => {
                this.initIcons(200);
            });
        },
    },

    async mounted() {
        // Check if testHeadId prop is provided (highest priority)
        if (this.testHeadId) {
            await this.loadTestHead(this.testHeadId);
        }
        // Check if we have editingTestHeadId from TestHeads navigation
        else {
            const editingTestHeadId = sessionStorage.getItem('editingTestHeadId');
            const editingQuestionType = sessionStorage.getItem('editingQuestionType');

            if (editingTestHeadId) {
                // Load the testhead by ID
                await this.loadTestHead(parseInt(editingTestHeadId));
                // Clear the session storage items
                sessionStorage.removeItem('editingTestHeadId');
                sessionStorage.removeItem('editingQuestionType');
            }
            // Otherwise check if we're editing an existing group from session storage
            else {
                const editingGroupData = sessionStorage.getItem('editingGroup');
                if (editingGroupData) {
                    try {
                        const groupData = JSON.parse(editingGroupData);

                        // Check if this is a matching question type with JSON data
                        const isMatchingType = ['MF', 'MI', 'MH'].includes(groupData.question_type);
                        const isSummaryType = groupData.question_type === 'SUC';
                        const isNoteType = groupData.question_type === 'NC';
                        const isFormType = groupData.question_type === 'FC';
                        const isTableType = groupData.question_type === 'TC';
                        const isDiagramType = groupData.question_type === 'DL';
                        let questionData = groupData.question_data || '';

                        // Parse matching question data if needed
                        if (isMatchingType && questionData && typeof questionData === 'string') {
                            try {
                                const parsedData = JSON.parse(questionData);

                                // Convert options array to text format for MatchingBuilder
                                if (parsedData.options && Array.isArray(parsedData.options)) {
                                    questionData = parsedData.options.map(opt => opt.fullText || `${opt.value} - ${opt.label}`).join('\n');
                                }

                                // Load questions from JSON structure
                                if (parsedData.questions && Array.isArray(parsedData.questions)) {
                                    this.questions = parsedData.questions.map((q, index) => ({
                                        id: q.id || null,
                                        question_text: q.question_text,
                                        correct_answer_text: q.correct_answer_text || '',
                                        answer_two_text: q.answer_two_text || '',
                                        explanation: q.explanation || '',
                                        points: q.points || 1,
                                        order: q.order || (index + 1),
                                        choices: []
                                    }));
                                }
                            } catch (parseError) {
                                console.log('question_data is not JSON, using as-is:', parseError);
                            }
                        }

                        // Parse summary completion data if needed
                        if (isSummaryType && questionData && typeof questionData === 'string') {
                            try {
                                const parsedData = JSON.parse(questionData);

                                // Keep the JSON as-is for SummaryBuilder (it will parse it)
                                questionData = questionData;

                                // Load questions from JSON structure
                                if (parsedData.questions && Array.isArray(parsedData.questions)) {
                                    this.questions = parsedData.questions.map((q, index) => ({
                                        id: q.id || null,
                                        question_text: q.question_text,
                                        correct_answer_text: q.correct_answer_text || '',
                                        answer_two_text: q.answer_two_text || '',
                                        explanation: q.explanation || '',
                                        points: q.points || 1,
                                        order: q.order || (index + 1),
                                        choices: []
                                    }));
                                }
                            } catch (parseError) {
                                console.log('question_data is not JSON, using as-is:', parseError);
                            }
                        }

                        // Parse note completion data if needed
                        if ((isNoteType || isFormType || isDiagramType) && questionData && typeof questionData === 'string') {
                            try {
                                const parsedData = JSON.parse(questionData);

                                // Keep the JSON as-is for NoteBuilder/FormBuilder/DiagramBuilder (it will parse it)
                                questionData = questionData;

                                // Load questions from JSON structure
                                if (parsedData.questions && Array.isArray(parsedData.questions)) {
                                    this.questions = parsedData.questions.map((q, index) => ({
                                        id: q.id || null,
                                        question_text: q.question_text,
                                        correct_answer_text: q.correct_answer_text || '',
                                        answer_two_text: q.answer_two_text || '',
                                        explanation: q.explanation || '',
                                        points: q.points || 1,
                                        order: q.order || (index + 1),
                                        choices: []
                                    }));
                                }
                            } catch (parseError) {
                                console.log('question_data is not JSON, using as-is:', parseError);
                            }
                        }

                        // Load group details
                        this.questionGroup = {
                            id: groupData.id,
                            title: groupData.title || '',
                            description: groupData.description || '',
                            question_type: groupData.question_type || 'MCQ',
                            question_data: questionData,
                            reading: groupData.reading || null,
                        };

                        // Load questions if present and not already loaded from JSON
                        if (!isMatchingType && !isSummaryType && !isNoteType && !isFormType && !isDiagramType && !isMapType && groupData.questions && groupData.questions.length > 0) {
                            this.questions = groupData.questions.map((q, index) => ({
                                id: q.id,
                                question_text: q.question_text,
                                correct_answer_text: q.correct_answer_text || '',
                                answer_two_text: q.answer_two_text || '',
                                explanation: q.explanation || '',
                                points: q.points || 1,
                                order: q.order || (index + 1),
                                choices: q.choices ? q.choices.map(c => ({
                                    id: c.id,
                                    choice_text: c.choice_text,
                                    is_correct: c.is_correct
                                })) : []
                            }));
                        }

                        // For matching types, if questions weren't loaded from JSON, load from groupData.questions
                        if (isMatchingType && this.questions.length === 0 && groupData.questions && groupData.questions.length > 0) {
                            this.questions = groupData.questions.map((q, index) => ({
                                id: q.id,
                                question_text: q.question_text,
                                correct_answer_text: q.correct_answer_text || '',
                                answer_two_text: q.answer_two_text || '',
                                explanation: q.explanation || '',
                                points: q.points || 1,
                                order: q.order || (index + 1),
                                choices: []
                            }));
                        }

                        // Set passage filter if present
                        if (groupData.reading) {
                            this.filterPassageId = groupData.reading;
                            await this.loadPassageInfo();
                        }

                        // Move to step 2 if questions exist, otherwise stay on step 1
                        if (this.questions.length > 0) {
                            this.currentStep = 2;

                            // Auto-open builders for specialized question types
                            this.$nextTick(() => {
                                if (isMatchingType) {
                                    this.showMatchingBuilder = true;
                                    this.matchingBuilderKey++;
                                } else if (isSummaryType) {
                                    this.showSummaryBuilder = true;
                                    this.summaryBuilderKey++;
                                } else if (isNoteType) {
                                    this.showNoteBuilder = true;
                                    this.noteBuilderKey++;
                                } else if (isFormType) {
                                    this.showFormBuilder = true;
                                    this.formBuilderKey++;
                                } else if (isTableType) {
                                    this.showTableBuilder = true;
                                    this.tableBuilderKey++;
                                } else if (isDiagramType) {
                                    this.showDiagramBuilder = true;
                                    this.diagramBuilderKey++;
                                } else if (isMapType) {
                                    this.showMapBuilder = true;
                                    this.mapBuilderKey++;
                                }
                            });
                        }

                        // Clear the editing data
                        sessionStorage.removeItem('editingGroup');
                    } catch (err) {
                        toast.error('Failed to load group data for editing', 'Error');
                    }
                } else {
                    // Check if we're filtering by passage or listening part (for new groups)
                    const passageId = sessionStorage.getItem('filterPassageId');
                    const passageTitle = sessionStorage.getItem('filterPassageTitle');
                    const listeningPartId = sessionStorage.getItem('filterListeningPartId');

                    if (passageId) {
                        this.filterPassageId = passageId;
                        this.filterPassageTitle = passageTitle;
                        this.questionGroup.reading = passageId;
                        await this.loadPassageInfo();
                    } else if (listeningPartId) {
                        // Handle listening part context if needed
                        this.questionGroup.listening_part = listeningPartId;
                    }
                }
            }
        }

        this.initIcons();
    },

    beforeUnmount() {
        // Clean up any pending icon initialization timeout
        if (this.iconInitTimeout) {
            clearTimeout(this.iconInitTimeout);
        }
    },

    methods: {
        // ===== Data Loading =====

        /**
         * Load test head data by ID
         */
        async loadTestHead(testHeadId) {
            this.loading = true;
            try {
                const response = await API.getTestHead(testHeadId);
                const groupData = response.testhead || response;

                // Check question type
                const isMatchingType = ['MF', 'MI', 'MH'].includes(groupData.question_type);
                const isSummaryType = groupData.question_type === 'SUC';
                const isNoteType = groupData.question_type === 'NC';
                const isFormType = groupData.question_type === 'FC';
                const isTableType = groupData.question_type === 'TC';
                const isDiagramType = groupData.question_type === 'DL';
                const isMapType = groupData.question_type === 'ML';

                // Parse question_data
                let questionData = groupData.question_data || '';

                // Load question group details
                this.questionGroup = {
                    id: groupData.id,
                    title: groupData.title || '',
                    description: groupData.description || '',
                    question_type: groupData.question_type || 'MCQ',
                    question_data: questionData,
                    reading: groupData.reading || null,
                    listening: groupData.listening || null,
                };

                // Load questions if present
                if (groupData.questions && groupData.questions.length > 0) {
                    this.questions = groupData.questions.map((q, index) => ({
                        id: q.id,
                        question_text: q.question_text || q.text,
                        correct_answer_text: q.correct_answer_text || q.correct_answer || '',
                        answer_two_text: q.answer_two_text || '',
                        explanation: q.explanation || '',
                        points: q.points || 1,
                        order: q.order || q.question_number || (index + 1),
                        choices: q.choices ? q.choices.map(c => ({
                            id: c.id,
                            choice_text: c.choice_text || c.text,
                            is_correct: c.is_correct || false
                        })) : []
                    }));
                }

                // Set filter context if available
                if (groupData.reading) {
                    this.filterPassageId = groupData.reading;
                    await this.loadPassageInfo();
                }

                // Move to step 2 if questions exist
                if (this.questions.length > 0) {
                    this.currentStep = 2;

                    // Auto-open builders for specialized question types
                    this.$nextTick(() => {
                        if (isMatchingType) {
                            this.showMatchingBuilder = true;
                            this.matchingBuilderKey++;
                        } else if (isSummaryType) {
                            this.showSummaryBuilder = true;
                            this.summaryBuilderKey++;
                        } else if (isNoteType) {
                            this.showNoteBuilder = true;
                            this.noteBuilderKey++;
                        } else if (isFormType) {
                            this.showFormBuilder = true;
                            this.formBuilderKey++;
                        } else if (isTableType) {
                            this.showTableBuilder = true;
                            this.tableBuilderKey++;
                        } else if (isDiagramType) {
                            this.showDiagramBuilder = true;
                            this.diagramBuilderKey++;
                        } else if (isMapType) {
                            this.showMapBuilder = true;
                            this.mapBuilderKey++;
                        }
                    });
                }

                this.initIcons();
            } catch (error) {
                toast.error('Failed to load test head data', 'Error');
            } finally {
                this.loading = false;
            }
        },

        // ===== Icon Management =====
        initIcons(delay = 100) {
            if (this.iconInitTimeout) {
                clearTimeout(this.iconInitTimeout);
            }

            this.iconInitTimeout = setTimeout(() => {
                this.$nextTick(() => {
                    if (this.isInitializingIcons) return;

                    this.isInitializingIcons = true;

                    try {
                        if (typeof feather !== 'undefined') {
                            feather.replace();
                        } else if (typeof ManagerHelpers !== 'undefined' && ManagerHelpers.initFeatherIcons) {
                            ManagerHelpers.initFeatherIcons();
                        }
                    } catch (err) {
                        console.warn('Failed to initialize Feather icons:', err);
                    } finally {
                        setTimeout(() => {
                            this.isInitializingIcons = false;
                        }, 50);
                    }
                });
            }, delay);
        },

        // ===== Helper Methods =====

        /**
         * Map question data to API format
         */
        mapQuestionToAPIFormat(question) {
            const baseData = {
                question_text: question.question_text,
                correct_answer_text: question.correct_answer_text,
                answer_two_text: question.answer_two_text || '',
                order: question.order,
            };

            // Include choices for MCQ questions
            if (question.choices && question.choices.length > 0) {
                baseData.choices = question.choices.map(c => ({
                    choice_text: c.choice_text,
                    is_correct: c.is_correct
                }));
            }

            return baseData;
        },

        /**
         * Parse structured data from question_data field
         */
        parseStructuredData(dataString, defaultValue = {}) {
            try {
                return dataString ? JSON.parse(dataString) : defaultValue;
            } catch (e) {
                console.warn('Failed to parse structured data:', e);
                return defaultValue;
            }
        },

        /**
         * Build request body for bulk question creation based on question type
         */
        buildBulkCreateRequestBody(testheadId, questions) {
            const requestBody = { testhead: testheadId };

            if (this.isMatchingType) {
                const options = this.parseMatchingOptions(this.questionGroup.question_data);
                requestBody.matching_data = {
                    options: options,
                    questions: questions.map(this.mapQuestionToAPIFormat)
                };
            } else if (this.isSummaryCompletionType) {
                const summaryData = this.parseStructuredData(
                    this.questionGroup.question_data,
                    { title: '', text: '', blankCount: questions.length }
                );
                requestBody.matching_data = {
                    ...summaryData,
                    questions: questions.map(this.mapQuestionToAPIFormat)
                };
            } else if (this.isNoteCompletionType || this.isFormCompletionType || this.isTableCompletionType) {
                const structureData = this.parseStructuredData(
                    this.questionGroup.question_data,
                    { title: '', items: [] }
                );
                requestBody.matching_data = {
                    ...structureData,
                    questions: questions.map(this.mapQuestionToAPIFormat)
                };
            } else {
                // Standard question format (including MCQ and Diagram Labeling)
                requestBody.questions = questions.map(this.mapQuestionToAPIFormat);
            }

            return requestBody;
        },

        /**
         * Update existing questions with progress tracking
         */
        async updateExistingQuestions(questions) {
            const total = questions.length;
            let completed = 0;
            const errors = [];

            for (const question of questions) {
                try {
                    const questionData = this.mapQuestionToAPIFormat(question);

                    await API.request(`/tests/question/${question.id}/update/`, {
                        method: 'PUT',
                        body: JSON.stringify(questionData),
                    });

                    completed++;
                } catch (err) {
                    console.error(`Failed to update question ${question.id}:`, err);
                    errors.push({ question: question.question_text, error: err.message });
                }
            }

            return { total, completed, errors };
        },

        // ===== Step Management =====
        goToStep(step) {
            if (step === 2 && !this.canProceedToStep2) {
                if (window.toast) {
                    toast.warning('Please complete group details first', 'Warning');
                }
                return;
            }
            if (step === 3 && !this.canProceedToStep3) {
                if (window.toast) {
                    toast.warning('Please add at least one question', 'Warning');
                }
                return;
            }
            this.currentStep = step;

            if (step === 2 && this.isTFNGType && this.questions.length === 0) {
                this.$nextTick(() => {
                    this.openTFNGBuilder();
                });
            }

            if (step === 2 && this.isMatchingType) {
                // Always show matching builder on step 2 for matching types
                this.$nextTick(() => {
                    if (!this.showMatchingBuilder) {
                        this.openMatchingBuilder();
                    }
                });
            }

            if (step === 2 && this.isSummaryCompletionType && this.questions.length === 0) {
                this.$nextTick(() => {
                    this.openSummaryBuilder();
                });
            }

            if (step === 2 && (this.isNoteCompletionType || this.isFormCompletionType || this.isTableCompletionType || this.isDiagramLabelingType || this.isMapLabelingType) && this.questions.length === 0) {
                this.$nextTick(() => {
                    if (this.isNoteCompletionType) {
                        this.openNoteBuilder();
                    } else if (this.isFormCompletionType) {
                        this.openFormBuilder();
                    } else if (this.isTableCompletionType) {
                        this.openTableBuilder();
                    } else if (this.isDiagramLabelingType) {
                        this.openDiagramBuilder();
                    } else if (this.isMapLabelingType) {
                        this.openMapBuilder();
                    }
                });
            }

            this.initIcons();
        },

        nextStep() {
            if (this.currentStep < this.totalSteps) {
                this.goToStep(this.currentStep + 1);
            }
        },

        previousStep() {
            if (this.currentStep > 1) {
                this.currentStep--;
                this.initIcons();
            }
        },

        // ===== Question Management =====
        addQuestion() {
            if (!this.validateQuestion()) {
                if (window.toast) {
                    toast.warning('Please fix validation errors', 'Warning');
                }
                return;
            }

            const newQuestion = this.createQuestionObject();

            if (this.editingQuestionIndex !== null) {
                newQuestion.order = this.questions[this.editingQuestionIndex].order;
                this.questions[this.editingQuestionIndex] = newQuestion;
                this.editingQuestionIndex = null;
                if (window.toast) {
                    toast.success('Question updated successfully', 'Success');
                }
            } else {
                this.questions.push(newQuestion);
                if (window.toast) {
                    toast.success('Question added successfully', 'Success');
                }
            }

            this.resetQuestionForm();
        },

        addAndNew() {
            this.addQuestion();
            this.$nextTick(() => {
                const questionTextarea = document.querySelector('textarea[placeholder="Enter the question..."]');
                if (questionTextarea) questionTextarea.focus();
            });
            this.initIcons();
        },

        editQuestion(index) {
            if (this.isTFNGType) {
                this.editTFNGQuestion(index);
                return;
            }

            if (this.isMatchingType) {
                this.editMatchingQuestion(index);
                return;
            }

            if (this.isSummaryCompletionType) {
                this.editSummaryQuestion(index);
                return;
            }

            if (this.isNoteCompletionType) {
                this.editNoteQuestion(index);
                return;
            }

            if (this.isFormCompletionType) {
                this.editFormQuestion(index);
                return;
            }

            if (this.isDiagramLabelingType) {
                this.editDiagramQuestion(index);
                return;
            }

            if (this.isMapLabelingType) {
                this.editMapQuestion(index);
                return;
            }

            this.editingQuestionIndex = index;
            const question = this.questions[index];
            this.currentQuestion = {
                id: question.id,
                question_text: question.question_text,
                correct_answer_text: question.correct_answer_text,
                answer_two_text: question.answer_two_text,
                choices: question.choices ? [...question.choices] : [],
                order: question.order,
                explanation: question.explanation || '',
                points: question.points || 1,
            };
            this.validationErrors = {};

            this.$nextTick(() => {
                const formElement = document.querySelector('.bg-white.rounded-lg.border.border-slate-200');
                if (formElement) {
                    formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        },

        editTFNGQuestion(index) {
            this.editingQuestionIndex = index;
            this.showTFNGBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        removeQuestion(index) {
            if (confirm('Are you sure you want to delete this question?')) {
                this.questions.splice(index, 1);
                this.questions.forEach((q, i) => {
                    q.order = i + 1;
                });
                if (window.toast) {
                    toast.success('Question removed', 'Success');
                }
                this.initIcons();
            }
        },

        moveQuestionUp(index) {
            if (index > 0) {
                const temp = this.questions[index];
                this.questions[index] = this.questions[index - 1];
                this.questions[index - 1] = temp;
                this.questions[index].order = index + 1;
                this.questions[index - 1].order = index;
                this.initIcons();
            }
        },

        moveQuestionDown(index) {
            if (index < this.questions.length - 1) {
                const temp = this.questions[index];
                this.questions[index] = this.questions[index + 1];
                this.questions[index + 1] = temp;
                this.questions[index].order = index + 1;
                this.questions[index + 1].order = index + 2;
                this.initIcons();
            }
        },

        duplicateQuestion(index) {
            const original = this.questions[index];
            const duplicate = {
                id: null,
                question_text: original.question_text + ' (Copy)',
                correct_answer_text: original.correct_answer_text,
                answer_two_text: original.answer_two_text,
                choices: original.choices ? [...original.choices.map(c => ({ ...c }))] : [],
                order: this.questions.length + 1,
                explanation: original.explanation || '',
                points: original.points || 1,
            };
            this.questions.push(duplicate);
            if (window.toast) {
                toast.success('Question duplicated', 'Success');
            }
            this.initIcons();
        },

        reorderQuestions(event, questionIndex) {
            const newOrder = parseInt(event.target.value);

            if (isNaN(newOrder) || newOrder < 1) {
                event.target.value = this.questions[questionIndex].order;
                if (window.toast) {
                    toast.error('Order must be a positive number', 'Error');
                }
                return;
            }

            const oldOrder = this.questions[questionIndex].order;

            if (oldOrder === newOrder) {
                return;
            }

            this.questions[questionIndex].order = newOrder;

            this.$nextTick(() => {
                this.initIcons();
            });

            if (window.toast) {
                toast.success(`Question order changed from ${oldOrder} to ${newOrder}`, 'Success');
            }
        },

        clearAllQuestions() {
            if (confirm('Are you sure you want to remove all questions? This cannot be undone.')) {
                this.questions = [];
                this.resetQuestionForm();
                if (window.toast) {
                    toast.info('All questions cleared', 'Info');
                }
            }
        },

        togglePreview() {
            this.previewMode = !this.previewMode;
            this.initIcons();
        },

        // ===== Bulk Add Handling =====
        handleBulkAdd(parsedQuestions) {
            parsedQuestions.forEach((q) => {
                this.questions.push({
                    ...q,
                    id: null,
                    choices: [],
                    order: this.questions.length + 1,
                });
            });
            this.initIcons();
        },

        // ===== T/F/NG Builder Handling =====
        openTFNGBuilder() {
            this.showTFNGBuilder = true;
            this.initIcons();
        },

        closeTFNGBuilder() {
            this.showTFNGBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        handleTFNGQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = {
                        ...this.questions[this.editingQuestionIndex],
                        question_text: newQuestions[0].question_text,
                        correct_answer_text: newQuestions[0].correct_answer_text,
                        explanation: newQuestions[0].explanation || '',
                        points: newQuestions[0].points || 1,
                    };
                    this.questions.splice(this.editingQuestionIndex, 1, updatedQuestion);
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    newQuestions.forEach((q, index) => {
                        if (index === 0) {
                            const updatedQuestion = {
                                ...this.questions[this.editingQuestionIndex],
                                question_text: q.question_text,
                                correct_answer_text: q.correct_answer_text,
                                explanation: q.explanation || '',
                                points: q.points || 1,
                            };
                            this.questions.splice(this.editingQuestionIndex, 1, updatedQuestion);
                        } else {
                            this.questions.push({
                                ...q,
                                order: this.questions.length + 1,
                            });
                        }
                    });
                    if (window.toast) {
                        toast.success(`Question updated and ${newQuestions.length - 1} new question(s) added`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    this.questions.push({
                        ...q,
                        order: this.questions.length + 1,
                    });
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.tfngBuilderKey++;
            this.showTFNGBuilder = false;
            this.initIcons();
        },

        // ===== Matching Builder Handling =====
        openMatchingBuilder() {
            this.showMatchingBuilder = true;
            this.initIcons();
        },

        closeMatchingBuilder() {
            this.showMatchingBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editMatchingQuestion(index) {
            this.editingQuestionIndex = index;
            this.showMatchingBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleMatchingQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = {
                        ...this.questions[this.editingQuestionIndex],
                        question_text: newQuestions[0].question_text,
                        correct_answer_text: newQuestions[0].correct_answer_text,
                        explanation: newQuestions[0].explanation || '',
                        points: newQuestions[0].points || 1,
                    };
                    this.questions.splice(this.editingQuestionIndex, 1, updatedQuestion);
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    newQuestions.forEach((q, index) => {
                        if (index === 0) {
                            const updatedQuestion = {
                                ...this.questions[this.editingQuestionIndex],
                                question_text: q.question_text,
                                correct_answer_text: q.correct_answer_text,
                                explanation: q.explanation || '',
                                points: q.points || 1,
                            };
                            this.questions.splice(this.editingQuestionIndex, 1, updatedQuestion);
                        } else {
                            this.questions.push({
                                ...q,
                                order: this.questions.length + 1,
                            });
                        }
                    });
                    if (window.toast) {
                        toast.success(`Question updated and ${newQuestions.length - 1} new question(s) added`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    this.questions.push({
                        ...q,
                        order: this.questions.length + 1,
                    });
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.matchingBuilderKey++;
            this.showMatchingBuilder = false;
            this.initIcons();
        },

        updateMatchingOptions(optionsText) {
            this.questionGroup.question_data = optionsText;
        },

        // ===== Summary Completion Builder Handling =====
        openSummaryBuilder() {
            this.showSummaryBuilder = true;
            this.initIcons();
        },

        closeSummaryBuilder() {
            this.showSummaryBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editSummaryQuestion(index) {
            this.editingQuestionIndex = index;
            this.showSummaryBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleSummaryQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = newQuestions[0];
                    updatedQuestion.order = this.questions[this.editingQuestionIndex].order;
                    updatedQuestion.id = this.questions[this.editingQuestionIndex].id || null;
                    this.questions[this.editingQuestionIndex] = updatedQuestion;
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    const startOrder = this.questions[this.editingQuestionIndex].order;
                    const beforeQuestions = this.questions.slice(0, this.editingQuestionIndex);
                    const afterQuestions = this.questions.slice(this.editingQuestionIndex + 1);

                    newQuestions.forEach((q, idx) => {
                        q.order = startOrder + idx;
                        q.id = null;
                    });

                    afterQuestions.forEach((q, idx) => {
                        q.order = startOrder + newQuestions.length + idx;
                    });

                    this.questions = [...beforeQuestions, ...newQuestions, ...afterQuestions];
                    if (window.toast) {
                        toast.success(`Updated with ${newQuestions.length} questions`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    q.order = this.questions.length + 1;
                    q.id = null;
                    this.questions.push(q);
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.summaryBuilderKey++;
            this.showSummaryBuilder = false;
            this.initIcons();
        },

        updateSummaryData(summaryDataJSON) {
            this.questionGroup.question_data = summaryDataJSON;
        },

        // ============================================================================
        // NOTE COMPLETION BUILDER METHODS
        // ============================================================================

        openNoteBuilder() {
            this.showNoteBuilder = true;
            this.initIcons();
        },

        closeNoteBuilder() {
            this.showNoteBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editNoteQuestion(index) {
            this.editingQuestionIndex = index;
            this.showNoteBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleNoteQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = newQuestions[0];
                    updatedQuestion.order = this.questions[this.editingQuestionIndex].order;
                    updatedQuestion.id = this.questions[this.editingQuestionIndex].id || null;
                    this.questions[this.editingQuestionIndex] = updatedQuestion;
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    const startOrder = this.questions[this.editingQuestionIndex].order;
                    const beforeQuestions = this.questions.slice(0, this.editingQuestionIndex);
                    const afterQuestions = this.questions.slice(this.editingQuestionIndex + 1);

                    newQuestions.forEach((q, idx) => {
                        q.order = startOrder + idx;
                        q.id = null;
                    });

                    afterQuestions.forEach((q, idx) => {
                        q.order = startOrder + newQuestions.length + idx;
                    });

                    this.questions = [...beforeQuestions, ...newQuestions, ...afterQuestions];
                    if (window.toast) {
                        toast.success(`Updated with ${newQuestions.length} questions`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    q.order = this.questions.length + 1;
                    q.id = null;
                    this.questions.push(q);
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.noteBuilderKey++;
            this.showNoteBuilder = false;
            this.initIcons();
        },

        updateNoteData(noteDataJSON) {
            this.questionGroup.question_data = noteDataJSON;
        },

        // ============================================================================
        // FORM COMPLETION BUILDER METHODS
        // ============================================================================

        openFormBuilder() {
            this.showFormBuilder = true;
            this.initIcons();
        },

        closeFormBuilder() {
            this.showFormBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editFormQuestion(index) {
            this.editingQuestionIndex = index;
            this.showFormBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleFormQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = newQuestions[0];
                    updatedQuestion.order = this.questions[this.editingQuestionIndex].order;
                    updatedQuestion.id = this.questions[this.editingQuestionIndex].id || null;
                    this.questions[this.editingQuestionIndex] = updatedQuestion;
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    const startOrder = this.questions[this.editingQuestionIndex].order;
                    const beforeQuestions = this.questions.slice(0, this.editingQuestionIndex);
                    const afterQuestions = this.questions.slice(this.editingQuestionIndex + 1);

                    newQuestions.forEach((q, idx) => {
                        q.order = startOrder + idx;
                        q.id = null;
                    });

                    afterQuestions.forEach((q, idx) => {
                        q.order = startOrder + newQuestions.length + idx;
                    });

                    this.questions = [...beforeQuestions, ...newQuestions, ...afterQuestions];
                    if (window.toast) {
                        toast.success(`Updated with ${newQuestions.length} questions`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    q.order = this.questions.length + 1;
                    q.id = null;
                    this.questions.push(q);
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.formBuilderKey++;
            this.showFormBuilder = false;
            this.initIcons();
        },

        updateFormData(formDataJSON) {
            this.questionGroup.question_data = formDataJSON;
        },

        // ============================================================================
        // DIAGRAM LABELING BUILDER METHODS
        // ============================================================================

        openDiagramBuilder() {
            this.showDiagramBuilder = true;
            this.initIcons();
        },

        closeDiagramBuilder() {
            this.showDiagramBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editDiagramQuestion(index) {
            this.editingQuestionIndex = index;
            this.showDiagramBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleDiagramQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = newQuestions[0];
                    updatedQuestion.order = this.questions[this.editingQuestionIndex].order;
                    updatedQuestion.id = this.questions[this.editingQuestionIndex].id || null;
                    this.questions[this.editingQuestionIndex] = updatedQuestion;
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    const startOrder = this.questions[this.editingQuestionIndex].order;
                    const beforeQuestions = this.questions.slice(0, this.editingQuestionIndex);
                    const afterQuestions = this.questions.slice(this.editingQuestionIndex + 1);

                    newQuestions.forEach((q, idx) => {
                        q.order = startOrder + idx;
                        q.id = null;
                    });

                    afterQuestions.forEach((q, idx) => {
                        q.order = startOrder + newQuestions.length + idx;
                    });

                    this.questions = [...beforeQuestions, ...newQuestions, ...afterQuestions];
                    if (window.toast) {
                        toast.success(`Updated with ${newQuestions.length} questions`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    q.order = this.questions.length + 1;
                    q.id = null;
                    this.questions.push(q);
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.diagramBuilderKey++;
            this.showDiagramBuilder = false;
            this.initIcons();
        },

        updateDiagramData(diagramDataJSON) {
            this.questionGroup.question_data = diagramDataJSON;
        },

        updateDiagramImage(imageFile) {
            // Handle diagram image file upload
            // This will be processed during save
            this.questionGroup.diagramImageFile = imageFile;
        },

        // ============================================================================
        // MAP LABELING BUILDER METHODS
        // ============================================================================

        openMapBuilder() {
            this.showMapBuilder = true;
            this.initIcons();
        },

        closeMapBuilder() {
            this.showMapBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editMapQuestion(index) {
            this.editingQuestionIndex = index;
            this.showMapBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleMapQuestions(newQuestions) {
            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = newQuestions[0];
                    updatedQuestion.order = this.questions[this.editingQuestionIndex].order;
                    updatedQuestion.id = this.questions[this.editingQuestionIndex].id || null;
                    this.questions[this.editingQuestionIndex] = updatedQuestion;
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    const startOrder = this.questions[this.editingQuestionIndex].order;
                    const beforeQuestions = this.questions.slice(0, this.editingQuestionIndex);
                    const afterQuestions = this.questions.slice(this.editingQuestionIndex + 1);

                    newQuestions.forEach((q, idx) => {
                        q.order = startOrder + idx;
                        q.id = null;
                    });

                    afterQuestions.forEach((q, idx) => {
                        q.order = startOrder + newQuestions.length + idx;
                    });

                    this.questions = [...beforeQuestions, ...newQuestions, ...afterQuestions];
                    if (window.toast) {
                        toast.success(`Updated with ${newQuestions.length} questions`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    q.order = this.questions.length + 1;
                    q.id = null;
                    this.questions.push(q);
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.mapBuilderKey++;
            this.showMapBuilder = false;
            this.initIcons();
        },

        updateMapData(mapDataJSON) {
            this.questionGroup.question_data = mapDataJSON;
            console.log('Map data updated:', mapDataJSON);
        },

        updateMapImage(imageFile) {
            // Handle map image file upload
            // This will be processed during save
            this.questionGroup.mapImageFile = imageFile;
            console.log('Map image file stored:', imageFile ? imageFile.name : 'NULL');
        },

        // ============================================================================
        // TABLE COMPLETION BUILDER METHODS
        // ============================================================================

        openTableBuilder() {
            this.showTableBuilder = true;
            this.initIcons();
        },

        closeTableBuilder() {
            this.showTableBuilder = false;
            this.editingQuestionIndex = null;
            this.initIcons();
        },

        editTableQuestion(index) {
            this.editingQuestionIndex = index;
            this.showTableBuilder = true;
            this.$nextTick(() => {
                this.initIcons();
            });
        },

        handleTableQuestions(data) {
            const { questions: newQuestions, question_data, isModified } = data;

            // Update question_data
            this.questionGroup.question_data = question_data;

            if (this.editingQuestionIndex !== null) {
                if (newQuestions.length === 1) {
                    const updatedQuestion = newQuestions[0];
                    updatedQuestion.order = this.questions[this.editingQuestionIndex].order;
                    updatedQuestion.id = this.questions[this.editingQuestionIndex].id || null;
                    this.questions[this.editingQuestionIndex] = updatedQuestion;
                    if (window.toast) {
                        toast.success('Question updated successfully', 'Success');
                    }
                } else {
                    const startOrder = this.questions[this.editingQuestionIndex].order;
                    const beforeQuestions = this.questions.slice(0, this.editingQuestionIndex);
                    const afterQuestions = this.questions.slice(this.editingQuestionIndex + 1);

                    newQuestions.forEach((q, idx) => {
                        q.order = startOrder + idx;
                        q.id = null;
                    });

                    afterQuestions.forEach((q, idx) => {
                        q.order = startOrder + newQuestions.length + idx;
                    });

                    this.questions = [...beforeQuestions, ...newQuestions, ...afterQuestions];
                    if (window.toast) {
                        toast.success(`Updated with ${newQuestions.length} questions`, 'Success');
                    }
                }
                this.editingQuestionIndex = null;
            } else {
                newQuestions.forEach((q) => {
                    q.order = this.questions.length + 1;
                    q.id = null;
                    this.questions.push(q);
                });
                if (window.toast) {
                    toast.success(`Added ${newQuestions.length} question(s) successfully`, 'Success');
                }
            }

            this.tableBuilderKey++;
            this.showTableBuilder = false;
            this.initIcons();
        },

        updateTableData(tableDataJSON) {
            this.questionGroup.question_data = tableDataJSON;
        },

        parseMatchingOptions(text) {
            if (!text) return [];

            // Parse options in format: "A - Option 1\nB - Option 2" or "A) Option 1"
            const lines = text.split('\n').filter(line => line.trim());
            return lines.map(line => {
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

        openBuilder() {
            if (this.isTFNGType) {
                this.openTFNGBuilder();
            } else if (this.isMatchingType) {
                this.openMatchingBuilder();
            } else if (this.isSummaryCompletionType) {
                this.openSummaryBuilder();
            } else if (this.isNoteCompletionType) {
                this.openNoteBuilder();
            } else if (this.isFormCompletionType) {
                this.openFormBuilder();
            } else if (this.isTableCompletionType) {
                this.openTableBuilder();
            } else if (this.isDiagramLabelingType) {
                this.openDiagramBuilder();
            } else if (this.isMapLabelingType) {
                this.openMapBuilder();
            }
        },

        // ===== Data Loading =====
        async loadPassageInfo() {
            // Implementation for loading passage info if needed
        },

        // ===== Save Logic =====

        async saveAll() {
            // Validate data before saving
            const validation = window.QuestionBuilderHelpers.validateQuestionData(
                this.questionGroup,
                this.questions
            );

            if (!validation.isValid) {
                this.error = validation.errors.join('; ');
                if (window.toast) {
                    toast.error(validation.errors[0], 'Error');
                } else {
                    showNotification(validation.errors[0], 'error');
                }
                return;
            }

            this.saving = true;
            this.error = null;

            try {
                // Step 1: Create or Update the TestHead (Question Group)
                const testheadData = window.QuestionBuilderHelpers.prepareTestHeadData(this.questionGroup);
                let testheadId = this.questionGroup.id;
                let testheadResponse;

                // Check if we need to upload an image (for Diagram/Map Labeling)
                const hasImageFile = this.questionGroup.diagramImageFile || this.questionGroup.mapImageFile;

                console.log('=== TestHead Save Debug ===');
                console.log('TestHead ID:', testheadId);
                console.log('Has Image File:', !!hasImageFile);
                if (hasImageFile) {
                    console.log('Image File:', hasImageFile.name, 'Size:', hasImageFile.size);
                }
                console.log('Question Type:', this.questionGroup.question_type);

                if (this.questionGroup.id) {
                    // Update existing testhead
                    if (hasImageFile) {
                        console.log('Updating testhead WITH image file');
                        // Use FormData for file upload
                        const formData = new FormData();
                        formData.append('title', testheadData.title);
                        formData.append('description', testheadData.description);
                        formData.append('question_type', testheadData.question_type);
                        formData.append('question_data', testheadData.question_data);

                        if (testheadData.reading) {
                            formData.append('reading', testheadData.reading);
                        }
                        if (testheadData.listening_part) {
                            formData.append('listening_part', testheadData.listening_part);
                        }

                        // Append image file
                        const imageFile = this.questionGroup.diagramImageFile || this.questionGroup.mapImageFile;
                        formData.append('picture', imageFile);

                        // Log FormData contents
                        console.log('FormData contents:');
                        for (let pair of formData.entries()) {
                            console.log(pair[0], typeof pair[1] === 'object' ? pair[1] : pair[1]);
                        }

                        testheadResponse = await API.request(`/tests/testhead/${this.questionGroup.id}/update/`, {
                            method: 'PUT',
                            body: formData
                        });
                    } else {
                        console.log('Updating testhead WITHOUT image file');
                        testheadResponse = await API.updateTestHead(this.questionGroup.id, testheadData);
                    }
                    console.log('TestHead updated:', testheadResponse);
                } else {
                    // Create new testhead
                    if (hasImageFile) {
                        console.log('Creating testhead WITH image file');
                        // Use FormData for file upload
                        const formData = new FormData();
                        formData.append('title', testheadData.title);
                        formData.append('description', testheadData.description);
                        formData.append('question_type', testheadData.question_type);
                        formData.append('question_data', testheadData.question_data);

                        if (testheadData.reading) {
                            formData.append('reading', testheadData.reading);
                        }
                        if (testheadData.listening_part) {
                            formData.append('listening_part', testheadData.listening_part);
                        }

                        // Append image file
                        const imageFile = this.questionGroup.diagramImageFile || this.questionGroup.mapImageFile;
                        formData.append('picture', imageFile);

                        testheadResponse = await API.request('/tests/testhead/create/', {
                            method: 'POST',
                            body: formData
                        });
                    } else {
                        console.log('Creating testhead WITHOUT image file');
                        testheadResponse = await API.createTestHead(testheadData);
                    }
                    testheadId = testheadResponse.testhead?.id || testheadResponse.id;
                    this.questionGroup.id = testheadId;
                    console.log('TestHead created:', testheadResponse);
                }

                if (!testheadId) {
                    throw new Error('Failed to get testhead ID from response');
                }

                // Step 2: Handle Questions - separate existing and new
                const existingQuestions = this.questions.filter(q => q.id);
                const newQuestions = this.questions.filter(q => !q.id);

                let updateResults = { completed: 0, total: 0, errors: [], updatedQuestions: [] };
                let createResults = { created_count: 0, error_count: 0, errors: [] };

                // Update existing questions
                if (existingQuestions.length > 0) {
                    console.log(`Updating ${existingQuestions.length} existing questions...`);
                    updateResults = await window.QuestionBuilderHelpers.updateExistingQuestions(
                        existingQuestions,
                        API
                    );
                    console.log('Update results:', updateResults);
                }

                // Create new questions in bulk
                if (newQuestions.length > 0) {
                    console.log(`Creating ${newQuestions.length} new questions...`);

                    const requestBody = window.QuestionBuilderHelpers.buildBulkCreateRequestBody(
                        testheadId,
                        newQuestions,
                        this.questionGroup.question_type,
                        this.questionGroup.question_data,
                        this.parseMatchingOptions
                    );

                    console.log('Bulk create request:', requestBody);

                    const bulkResponse = await API.request('/tests/questions/bulk-create/', {
                        method: 'POST',
                        body: JSON.stringify(requestBody),
                    });

                    createResults = {
                        created_count: bulkResponse.created_count || 0,
                        error_count: bulkResponse.error_count || 0,
                        errors: bulkResponse.errors || []
                    };
                    console.log('Create results:', createResults);
                }

                // Prepare notification message
                const totalSuccess = updateResults.completed + createResults.created_count;
                const totalErrors = updateResults.errors.length + createResults.error_count;

                if (totalErrors > 0) {
                    const errorMessages = [
                        ...updateResults.errors.map(e => `Update failed for question ${e.questionId}: ${e.error}`),
                        ...createResults.errors.map(e => `Create failed: ${e}`)
                    ];
                    console.error('Save errors:', errorMessages);

                    const message = `Saved ${totalSuccess} question(s). ${totalErrors} error(s) occurred.`;
                    if (window.toast) {
                        toast.warning(message, 'Warning');
                    } else {
                        showNotification(message, 'warning');
                    }
                } else {
                    const message = this.questionGroup.id && existingQuestions.length > 0
                        ? `Question group updated! ${totalSuccess} question(s) saved successfully.`
                        : `Question group created! ${totalSuccess} question(s) added successfully.`;

                    if (window.toast) {
                        toast.success(message, 'Success');
                    } else {
                        showNotification(message, 'success');
                    }
                }

                // Clear session storage
                sessionStorage.removeItem('editingGroup');
                sessionStorage.removeItem('editingTestHeadId');
                sessionStorage.removeItem('editingQuestionType');

                // Navigate back or reload
                setTimeout(() => {
                    if (this.$root && this.$root.navigateTo) {
                        // Try to go back to test-heads page
                        const passageId = sessionStorage.getItem('filterPassageId');
                        const listeningPartId = sessionStorage.getItem('filterListeningPartId');

                        if (passageId) {
                            this.$root.navigateTo('test-heads', {
                                passageId: parseInt(passageId),
                                testType: 'reading'
                            });
                        } else if (listeningPartId) {
                            this.$root.navigateTo('test-heads', {
                                listeningPartId: parseInt(listeningPartId),
                                testType: 'listening'
                            });
                        } else {
                            this.$root.navigateTo('reading-tests');
                        }
                    }
                }, 1500);

            } catch (error) {
                console.error('Error saving question group:', error);
                this.error = error.message || 'Failed to save question group';

                if (window.toast) {
                    toast.error(this.error, 'Error');
                } else {
                    showNotification(this.error, 'error');
                }
            } finally {
                this.saving = false;
            }
        },

        cancel() {
            this.$root.navigateTo('test-heads');
        },

        getQuestionTypeIcon(type) {
            const typeObj = this.questionTypes.find(t => t.code === type);
            return typeObj ? typeObj.icon : 'help-circle';
        },
    },

    template: `
        <div class="max-w-5xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <button @click="cancel" class="hover:text-slate-900 transition-colors">
                        Question Groups
                    </button>
                    <i data-feather="chevron-right" class="w-4 h-4"></i>
                    <span class="text-slate-900 font-medium">{{ questionGroup.id ? 'Edit Question Group' : 'Question Builder' }}</span>
                </div>
                
                <h2 class="text-2xl font-bold text-slate-900 mb-2">
                    {{ questionGroup.id ? 'Edit Question Group' : 'Question Builder' }}
                </h2>
                <p class="text-sm text-slate-500">
                    {{ questionGroup.id ? 'Update question group and manage questions' : 'Create comprehensive question groups step by step' }}
                </p>
            </div>

            <!-- Progress Bar -->
            <div class="mb-8">
                <div class="flex items-center justify-between mb-2">
                    <div v-for="step in totalSteps" :key="step" class="flex items-center flex-1">
                        <div class="flex items-center gap-2">
                            <div 
                                :class="currentStep >= step ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-500'"
                                class="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors">
                                {{ step }}
                            </div>
                            <span 
                                :class="currentStep >= step ? 'text-slate-900 font-medium' : 'text-slate-500'"
                                class="text-sm">
                                {{ step === 1 ? 'Group Details' : step === 2 ? 'Add Questions' : 'Review & Save' }}
                            </span>
                        </div>
                        <div v-if="step < totalSteps" 
                             :class="currentStep > step ? 'bg-orange-600' : 'bg-slate-200'"
                             class="flex-1 h-0.5 mx-4 transition-colors"></div>
                    </div>
                </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <i data-feather="alert-circle" class="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"></i>
                    <p class="text-sm text-rose-800">{{ error }}</p>
                </div>
            </div>

            <!-- Step 1: Group Details -->
            <div v-show="currentStep === 1" class="bg-white rounded-lg border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">Group Details</h3>
                
                <!-- Passage Info -->
                <div v-if="passageInfo" class="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <i data-feather="file-text" class="w-5 h-5 text-orange-700"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-slate-900">{{ passageInfo.title }}</p>
                            <p class="text-xs text-slate-600">Passage {{ passageInfo.passage_number }}</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Group Title <span class="text-rose-600">*</span>
                        </label>
                        <input 
                            v-model="questionGroup.title" 
                            type="text" 
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="e.g., Questions 1-5"
                        >
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Question Type <span class="text-rose-600">*</span>
                        </label>
                        <div class="grid grid-cols-2 gap-3" :key="'question-types-' + questionGroup.question_type">
                            <label v-for="type in questionTypes" :key="type.code"
                                   class="relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all"
                                   :class="questionGroup.question_type === type.code ? 'border-orange-600 bg-orange-50' : 'border-slate-200 hover:border-slate-300'">
                                <input 
                                    type="radio" 
                                    :value="type.code" 
                                    v-model="questionGroup.question_type"
                                    class="sr-only"
                                >
                                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                                     :class="questionGroup.question_type === type.code ? 'bg-orange-100' : 'bg-slate-100'">
                                    <i :data-feather="type.icon" 
                                       :key="'icon-' + type.code + '-' + (questionGroup.question_type === type.code)"
                                       :class="questionGroup.question_type === type.code ? 'text-orange-700' : 'text-slate-600'"
                                       class="w-5 h-5"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-slate-900">{{ type.label }}</p>
                                </div>
                                <i v-if="questionGroup.question_type === type.code" 
                                   data-feather="check-circle" 
                                   :key="'check-' + type.code"
                                   class="w-5 h-5 text-orange-600"></i>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Instructions / Description
                        </label>
                        <textarea 
                            v-model="questionGroup.description" 
                            rows="3"
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Instructions for students..."
                        ></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">
                            Additional Data <span class="text-slate-400">(optional)</span>
                        </label>
                        <textarea 
                            v-model="questionGroup.question_data" 
                            rows="4"
                            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Additional context, matching lists, or reference text..."
                        ></textarea>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                    <button @click="cancel" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button @click="nextStep" :disabled="!canProceedToStep2" 
                            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                        Next: Add Questions
                    </button>
                </div>
            </div>

            <!-- Step 2: Add Questions -->
            <div v-show="currentStep === 2" class="space-y-6">
                <!-- T/F/NG Dedicated Interface -->
                <div v-if="isTFNGType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <tfng-builder 
                                :key="tfngBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : []"
                                @questions-ready="handleTFNGQuestions"
                                @cancel="closeTFNGBuilder"
                            ></tfng-builder>
                        </div>
                    </div>
                </div>

                <!-- Matching Dedicated Interface -->
                <div v-else-if="isMatchingType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <matching-builder 
                                :key="matchingBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : questions"
                                :matching-options="questionGroup.question_data"
                                @questions-ready="handleMatchingQuestions"
                                @update:matching-options="updateMatchingOptions"
                                @cancel="closeMatchingBuilder"
                            ></matching-builder>
                        </div>
                    </div>
                </div>

                <!-- Summary Completion Dedicated Interface -->
                <div v-else-if="isSummaryCompletionType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <summary-completion-builder 
                                :key="summaryBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : []"
                                :summary-data="questionGroup.question_data"
                                @questions-ready="handleSummaryQuestions"
                                @update:summary-data="updateSummaryData"
                                @cancel="closeSummaryBuilder"
                            ></summary-completion-builder>
                        </div>
                    </div>
                </div>

                <!-- Note Completion Dedicated Interface -->
                <div v-else-if="isNoteCompletionType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <note-completion-builder 
                                :key="noteBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : []"
                                :note-data="questionGroup.question_data"
                                @questions-ready="handleNoteQuestions"
                                @update:note-data="updateNoteData"
                                @cancel="closeNoteBuilder"
                            ></note-completion-builder>
                        </div>
                    </div>
                </div>

                <!-- Form Completion Dedicated Interface -->
                <div v-else-if="isFormCompletionType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <form-completion-builder 
                                :key="formBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : []"
                                :form-data="questionGroup.question_data"
                                @questions-ready="handleFormQuestions"
                                @update:form-data="updateFormData"
                                @cancel="closeFormBuilder"
                            ></form-completion-builder>
                        </div>
                    </div>
                </div>

                <!-- Table Completion Dedicated Interface -->
                <div v-else-if="isTableCompletionType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <table-completion-builder 
                                :key="tableBuilderKey"
                                :initial-data="{ question_data: questionGroup.question_data, questions: questions }"
                                :is-edit-mode="questionGroup.id !== null"
                                @questions-ready="handleTableQuestions"
                            ></table-completion-builder>
                        </div>
                    </div>
                </div>

                <!-- Diagram Labeling Dedicated Interface -->
                <div v-else-if="isDiagramLabelingType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <diagram-labeling-builder 
                                :key="diagramBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : []"
                                :diagram-data-prop="questionGroup.question_data"
                                :existing-image-url="questionGroup.picture || ''"
                                @questions-ready="handleDiagramQuestions"
                                @diagram-data-updated="updateDiagramData"
                                @diagram-image-updated="updateDiagramImage"
                                @cancel="closeDiagramBuilder"
                            ></diagram-labeling-builder>
                        </div>
                    </div>
                </div>

                <!-- Map Labeling Dedicated Interface -->
                <div v-else-if="isMapLabelingType">
                    <div class="bg-white rounded-xl border border-slate-200">
                        <div class="p-6">
                            <map-labeling-builder 
                                :key="mapBuilderKey"
                                :question-type="questionGroup.question_type"
                                :existing-questions="editingQuestionIndex !== null ? [questions[editingQuestionIndex]] : []"
                                :map-data-prop="questionGroup.question_data"
                                :existing-image-url="questionGroup.picture || ''"
                                @questions-ready="handleMapQuestions"
                                @map-data-updated="updateMapData"
                                @map-image-updated="updateMapImage"
                                @cancel="closeMapBuilder"
                            ></map-labeling-builder>
                        </div>
                    </div>
                </div>

                <!-- Standard Interface (for other types) -->
                <div v-else>
                    <!-- Bulk Add Component -->
                    <bulk-add @bulk-add="handleBulkAdd"></bulk-add>

                    <!-- Standard Question Form Component -->
                    <standard-question-form
                        :question="currentQuestion"
                        :question-type="selectedQuestionType"
                        :validation-errors="validationErrors"
                        :is-editing="editingQuestionIndex !== null"
                        :editing-index="editingQuestionIndex"
                        :show-explanation.sync="showExplanation"
                        @update:question="currentQuestion = $event"
                        @update:showExplanation="showExplanation = $event"
                        @add-question="addQuestion"
                        @add-and-new="addAndNew"
                        @cancel-edit="resetQuestionForm"
                        @keypress="handleKeyPress"
                    ></standard-question-form>
                </div>

                <!-- Question List Component (shown for all types) -->
                <question-list
                    :questions="questions"
                    :question-type="questionGroup.question_type"
                    :preview-mode="previewMode"
                    @edit-question="editQuestion"
                    @remove-question="removeQuestion"
                    @duplicate-question="duplicateQuestion"
                    @move-question-up="moveQuestionUp"
                    @move-question-down="moveQuestionDown"
                    @reorder-question="({ event, index }) => reorderQuestions(event, index)"
                    @toggle-preview="togglePreview"
                    @clear-all="clearAllQuestions"
                    @open-builder="openBuilder"
                ></question-list>

                <div class="flex justify-between gap-3">
                    <button @click="previousStep" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Previous
                    </button>
                    <button @click="nextStep" :disabled="!canProceedToStep3"
                            class="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                        Next: Review & Save
                    </button>
                </div>
            </div>

            <!-- Step 3: Review & Save -->
            <div v-show="currentStep === 3" class="bg-white rounded-lg border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">Review & Save</h3>

                <!-- Group Summary -->
                <div class="space-y-4 mb-6">
                    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h4 class="text-sm font-semibold text-slate-900 mb-3">Group Details</h4>
                        <dl class="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt class="text-slate-500 font-medium">Title</dt>
                                <dd class="text-slate-900">{{ questionGroup.title }}</dd>
                            </div>
                            <div>
                                <dt class="text-slate-500 font-medium">Type</dt>
                                <dd class="text-slate-900">{{ selectedQuestionType.label }}</dd>
                            </div>
                            <div v-if="questionGroup.description" class="col-span-2">
                                <dt class="text-slate-500 font-medium">Description</dt>
                                <dd class="text-slate-900">{{ questionGroup.description }}</dd>
                            </div>
                        </dl>
                    </div>

                    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h4 class="text-sm font-semibold text-slate-900 mb-3">Questions Summary</h4>
                        <p class="text-sm text-slate-600">
                            Total questions: <span class="font-semibold text-slate-900">{{ questions.length }}</span>
                        </p>
                    </div>
                </div>

                <div class="flex justify-between gap-3 pt-6 border-t border-slate-200">
                    <button @click="previousStep" class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        Previous
                    </button>
                    <button @click="saveAll" :disabled="saving"
                            class="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                        <span v-if="saving">{{ questionGroup.id ? 'Updating...' : 'Saving...' }}</span>
                        <span v-else>{{ questionGroup.id ? 'Update Question Group' : 'Save Question Group' }}</span>
                    </button>
                </div>
            </div>

        </div>
    `,
};
window.QuestionBuilder = window.QuestionBuilderComponent;
