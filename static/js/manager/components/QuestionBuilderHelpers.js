/**
 * Question Builder Helper Functions
 * Extracted utility functions to reduce code duplication and improve maintainability
 */

window.QuestionBuilderHelpers = {
    /**
     * Map question data to API format
     * @param {Object} question - The question object
     * @returns {Object} - Formatted question data for API
     */
    mapQuestionToAPIFormat(question) {
        const baseData = {
            question_text: question.question_text || question.text,
            correct_answer_text: question.correct_answer_text || question.correct_answer || '',
            answer_two_text: question.answer_two_text || '',
            order: question.order || question.question_number,
        };

        // Include choices for MCQ questions
        if (question.choices && question.choices.length > 0) {
            baseData.choices = question.choices.map(c => ({
                choice_text: c.choice_text || c.text,
                is_correct: c.is_correct || false
            }));
        }

        return baseData;
    },

    /**
     * Parse structured data from JSON string
     * @param {String} dataString - JSON string to parse
     * @param {Object} defaultValue - Default value if parsing fails
     * @returns {Object} - Parsed data or default value
     */
    parseStructuredData(dataString, defaultValue = {}) {
        if (!dataString) return defaultValue;

        try {
            return typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
        } catch (e) {
            console.warn('Failed to parse structured data:', e);
            return defaultValue;
        }
    },

    /**
     * Build request body for bulk question creation based on question type
     * @param {Number} testheadId - The testhead ID
     * @param {Array} questions - Array of questions
     * @param {String} questionType - Type of questions
     * @param {String} questionData - Additional question data
     * @param {Function} parseMatchingOptions - Function to parse matching options
     * @returns {Object} - Request body for API
     */
    buildBulkCreateRequestBody(testheadId, questions, questionType, questionData, parseMatchingOptions) {
        const requestBody = { testhead: testheadId };

        // Determine question type category
        const isMatchingType = ['MF', 'MI', 'MH'].includes(questionType);
        const isSummaryType = questionType === 'SUC';
        const isStructuredType = ['NC', 'FC', 'TC'].includes(questionType);

        if (isMatchingType) {
            const options = parseMatchingOptions ? parseMatchingOptions(questionData) : [];
            requestBody.matching_data = {
                options: options,
                questions: questions.map(this.mapQuestionToAPIFormat)
            };
        } else if (isSummaryType) {
            const summaryData = this.parseStructuredData(questionData, {});
            requestBody.summary_data = {
                summary_text: summaryData.summary_text || '',
                questions: questions.map(this.mapQuestionToAPIFormat)
            };
        } else if (isStructuredType) {
            requestBody.structured_data = {
                structure: questionData,
                questions: questions.map(this.mapQuestionToAPIFormat)
            };
        } else {
            requestBody.questions = questions.map(this.mapQuestionToAPIFormat);
        }

        return requestBody;
    },

    /**
     * Update existing questions with progress tracking
     * @param {Array} questions - Array of questions to update
     * @param {Object} API - API instance
     * @returns {Object} - Update results
     */
    async updateExistingQuestions(questions, API) {
        const total = questions.length;
        let completed = 0;
        const errors = [];
        const updatedQuestions = [];

        // Use Promise.allSettled for better error handling and parallel execution
        const updatePromises = questions.map(async (question) => {
            try {
                const response = await API.updateQuestion(question.id,
                    this.mapQuestionToAPIFormat(question)
                );
                completed++;
                updatedQuestions.push(response);
                return { success: true, question: response };
            } catch (err) {
                errors.push({
                    questionId: question.id,
                    error: err.message || 'Update failed'
                });
                return { success: false, error: err };
            }
        });

        const results = await Promise.allSettled(updatePromises);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                // Success case handled in map
            } else {
                if (result.status === 'rejected') {
                    errors.push({
                        questionId: questions[index].id,
                        error: result.reason?.message || 'Update failed'
                    });
                }
            }
        });

        return { total, completed, errors, updatedQuestions };
    },

    /**
     * Format update result notification message
     * @param {Object} updateResults - Results from update operation
     * @param {Number} createCount - Number of questions created
     * @returns {Object} - Notification data
     */
    formatUpdateNotification(updateResults, createCount) {
        const messages = [];

        if (updateResults.completed > 0) {
            messages.push(`${updateResults.completed} question(s) updated`);
        }

        if (createCount > 0) {
            messages.push(`${createCount} question(s) created`);
        }

        const message = messages.length > 0
            ? `Question group updated successfully! ${messages.join(', ')}.`
            : 'Question group updated successfully!';

        const notificationType = updateResults.errors.length > 0 ? 'warning' : 'success';

        return { message, type: notificationType };
    },

    /**
     * Validate question data before submission
     * @param {Object} questionGroup - Question group data
     * @param {Array} questions - Questions array
     * @returns {Object} - Validation result
     */
    validateQuestionData(questionGroup, questions) {
        const errors = [];

        if (!questionGroup.title || !questionGroup.title.trim()) {
            errors.push('Question group title is required');
        }

        if (!questionGroup.question_type) {
            errors.push('Question type is required');
        }

        if (questions.length === 0) {
            errors.push('At least one question is required');
        }

        // Validate individual questions
        questions.forEach((q, index) => {
            if (!q.question_text && !q.text) {
                errors.push(`Question ${index + 1}: Question text is required`);
            }
            if (questionGroup.question_type === 'MCQ' && (!q.choices || q.choices.length < 2)) {
                errors.push(`Question ${index + 1}: At least 2 choices are required for MCQ`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Batch update questions with retry logic
     * @param {Array} questions - Questions to update
     * @param {Object} API - API instance
     * @param {Number} maxRetries - Maximum retry attempts
     * @returns {Object} - Update results
     */
    async batchUpdateQuestionsWithRetry(questions, API, maxRetries = 2) {
        let attempts = 0;
        let lastError = null;

        while (attempts <= maxRetries) {
            try {
                return await this.updateExistingQuestions(questions, API);
            } catch (err) {
                lastError = err;
                attempts++;
                if (attempts <= maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }
        }

        throw lastError;
    },

    /**
     * Parse matching options from question data
     * @param {String|Object} questionData - Question data string or object
     * @returns {Array} - Array of options
     */
    parseMatchingOptions(questionData) {
        const data = this.parseStructuredData(questionData, {});
        return data.options || [];
    },

    /**
     * Generate question number sequence
     * @param {Number} startNumber - Starting question number
     * @param {Number} count - Number of questions
     * @returns {Array} - Array of question numbers
     */
    generateQuestionNumbers(startNumber, count) {
        return Array.from({ length: count }, (_, i) => startNumber + i);
    },

    /**
     * Format question range display
     * @param {Array} questions - Array of questions
     * @returns {String} - Formatted range (e.g., "Questions 1-8")
     */
    formatQuestionRange(questions) {
        if (!questions || questions.length === 0) {
            return 'No questions';
        }

        const numbers = questions
            .map(q => q.question_number || q.order)
            .filter(n => n != null)
            .sort((a, b) => a - b);

        if (numbers.length === 0) return 'No questions';
        if (numbers.length === 1) return `Question ${numbers[0]}`;

        return `Questions ${numbers[0]}-${numbers[numbers.length - 1]}`;
    },

    /**
     * Delete multiple questions
     * @param {Array} questionIds - Array of question IDs to delete
     * @param {Object} API - API instance
     * @returns {Object} - Delete results
     */
    async deleteMultipleQuestions(questionIds, API) {
        const results = {
            deleted: 0,
            failed: 0,
            errors: []
        };

        for (const questionId of questionIds) {
            try {
                await API.request(`/tests/question/${questionId}/delete/`, {
                    method: 'DELETE',
                });
                results.deleted++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    questionId: questionId,
                    error: error.message
                });
                console.error(`Failed to delete question ${questionId}:`, error);
            }
        }

        return results;
    },

    /**
     * Prepare testhead data for API
     * @param {Object} questionGroup - Question group data
     * @returns {Object} - Formatted testhead data
     */
    prepareTestHeadData(questionGroup) {
        const data = {
            title: questionGroup.title,
            description: questionGroup.description || '',
            question_type: questionGroup.question_type,
            question_data: questionGroup.question_data || '',
        };

        if (questionGroup.reading) {
            data.reading = questionGroup.reading;
        }

        if (questionGroup.listening_part) {
            data.listening_part = questionGroup.listening_part;
        }

        return data;
    }
};
