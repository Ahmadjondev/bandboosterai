/**
 * Question Renderer Component
 * Reusable question rendering logic for Listening and Reading sections
 * 
 * Supports all IELTS question types:
 * - MCQ (Multiple Choice - Single Answer)
 * - MCMA (Multiple Choice - Multiple Answers)
 * - FC (Form Completion) - Uses question_data.items structure with inline <input> (number) placeholders
 * - NC (Note Completion)
 * - SC (Sentence Completion)
 * - TFNG (True/False/Not Given)
 * - YNNG (Yes/No/Not Given)
 * - SA (Short Answer)
 * - MH (Matching Headings)
 * - MI (Matching Information)
 * - MF (Matching Features)
 * - SUC (Summary Completion)
 * - TC (Table Completion)
 * - FCC (Flow Chart Completion)
 * - DL (Diagram Labelling)
 * - ML (Map Labelling)
 */

window.QuestionRenderer = {
    /**
     * Render instruction/description header for question groups
     * Reusable for both listening and reading sections
     */
    renderInstruction(group) {
        const parts = [];

        // Question range (e.g., "Questions 1-5" or "Question 6" for single question)
        if (group.question_range) {
            // Check if it's a single question (e.g., "6-6") and format accordingly
            const range = group.question_range;
            const [start, end] = range.split('-').map(Number);
            console.log(group);
            let questionLabel;
            if (start === end) {
                // Single question: "Question 6"
                questionLabel = `Question ${start}`;
            } else {
                // Multiple questions: "Questions 6-8"
                questionLabel = `Questions ${range}`;
            }

            parts.push(`
                <div class="inline-flex items-center justify-center h-6 px-3 bg-slate-900 text-white text-xs font-bold rounded mb-3">
                    ${group.title}
                </div>
            `);
        }

        // // Title (if exists)
        // if (group.title) {
        //     parts.push(`
        //         <h3 class="text-base font-semibold text-slate-900 mb-2">
        //             ${group.title}
        //         </h3>
        //     `);
        // }

        // Description/Instruction
        if (group.description || group.instruction) {
            parts.push(`
                <p class="text-slate-700 leading-relaxed mb-2" style="font-size: inherit;">
                    ${group.description || group.instruction}
                </p>
            `);
        }

        // Answer format (for completion types)
        if (group.answer_format) {
            parts.push(`
                <p class="text-slate-700 leading-relaxed" style="font-size: inherit;">
                </p>
                `);
        }
        // <span class="font-medium">Write</span> <span class="font-bold italic">${group.answer_format}</span> for each answer.

        if (parts.length === 0) return '';

        return `<div class="mb-6">${parts.join('')}</div>`;
    },

    /**
     * Format question text with inline input fields
     * Handles {{number}} placeholders for form/sentence completion
     */
    formatQuestionText(question, group, userAnswers, renderedCache) {
        const questionId = question.id;

        // Cache check to prevent re-rendering and focus loss
        if (renderedCache[questionId]) {
            const existingInput = document.getElementById(`q-${questionId}`);
            if (existingInput) {
                return renderedCache[questionId];
            }
        }

        let text = question.question_text || '';
        const questionNumber = question.order;
        const currentAnswer = userAnswers[question.id] || '';

        // Form/Sentence/Note Completion with inline placeholders
        if ((group.question_type === 'FC' || group.question_type === 'SC' || group.question_type === 'NC') && text.includes('{{')) {
            text = text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
                const inputId = `q-${question.id}`;
                return `
                    <span class="relative inline-flex items-center mx-1">
                        <span class="qb-bubble">${questionNumber}</span>
                        <input 
                            type="text" 
                            id="${inputId}"
                            data-question-id="${question.id}"
                            value="${currentAnswer}"
                            placeholder="Answer"
                            autocomplete="off"
                            class="qb-input"
                            style="padding-left: 2rem;"
                        />
                    </span>
                `;
            });
        } else {
            // Standard question with input field below
            const inputId = `q-${question.id}`;
            text = `
                <div class="flex items-start gap-3 mb-2" data-question-id="${question.id}">
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0 mt-1">
                        ${questionNumber}
                    </span>
                    <div class="flex-1">
                        <p class="text-slate-700 mb-2" style="font-size: inherit;">${text}</p>
                        <input 
                            type="text" 
                            id="${inputId}"
                            data-question-id="${question.id}"
                            value="${currentAnswer}"
                            placeholder="Type your answer (auto-saves)"
                            autocomplete="off"
                            class="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none bg-white text-slate-900 font-medium transition-colors"
                        />
                    </div>
                </div>
            `;
        }

        renderedCache[questionId] = text;
        return text;
    },

    /**
     * Render MCQ (Multiple Choice - Single Answer)
     */
    renderMCQ(group, userAnswers, onAnswer) {
        return `
            <div class="space-y-6">
                ${group.questions.map(question => `
                    <div class="pb-6 border-b border-slate-100 last:border-b-0">
                        <div class="flex items-start gap-3 mb-3">
                            <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                ${question.order}
                            </span>
                            <div class="flex-1">
                                <p class="font-medium text-slate-900" style="font-size: inherit;">${question.question_text}</p>
                            </div>
                        </div>
                        <div class="ml-9 space-y-2">
                            ${(question.options || []).map(option => {
            const isSelected = userAnswers[question.id] === option.key;
            return `
                                    <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${isSelected
                    ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }">
                                        <input
                                            type="radio"
                                            name="q-${question.id}"
                                            value="${option.key}"
                                            ${isSelected ? 'checked' : ''}
                                            data-question-id="${question.id}"
                                            data-answer="${option.key}"
                                            data-immediate="true"
                                            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                                        />
                                        <span class="flex items-center gap-2 text-slate-700" style="font-size: inherit;">
                                            <strong class="font-semibold">${option.key}</strong>
                                            <span>${option.choice_text}</span>
                                        </span>
                                    </label>
                                `;
        }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render TFNG/YNNG (True/False/Not Given or Yes/No/Not Given)
     */
    renderTFNG(group, userAnswers) {
        const options = group.question_type === 'YNNG'
            ? ['YES', 'NO', 'NOT GIVEN']
            : ['TRUE', 'FALSE', 'NOT GIVEN'];

        return `
            <div class="space-y-4">
                ${group.questions.map(question => {
            const currentAnswer = userAnswers[question.id] || '';
            const selectId = `select-tfng-${question.id}`;

            return `
                        <div class="pb-4 border-b border-slate-100 last:border-b-0">
                            <div class="flex items-center gap-3">
                                <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                    ${question.order}
                                </span>
                                <p class="font-medium text-slate-900 flex-1" style="font-size: inherit;">${question.question_text}</p>
                                <select
                                    id="${selectId}"
                                    data-question-id="${question.id}"
                                    class="px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none transition-colors bg-white text-slate-900 font-medium"
                                    style="font-size: inherit;"
                                >
                                    <option value="">Select...</option>
                                    ${options.map(option => `
                                        <option value="${option}" ${currentAnswer === option ? 'selected' : ''}>
                                            ${option}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    /**
     * Render SA (Short Answer)
     */
    renderShortAnswer(group, userAnswers, renderedCache) {
        return `
            <div class="space-y-4">
                ${group.questions.map(question => {
            const questionId = question.id;
            const currentAnswer = userAnswers[questionId] || '';
            const inputId = `input-${questionId}`;

            // Cache check
            if (renderedCache[questionId]) {
                return renderedCache[questionId];
            }

            const html = `
                        <div class="flex items-start gap-3">
                            <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                ${question.order}
                            </span>
                            <div class="flex-1">
                                <p class="font-medium text-slate-900 mb-2" style="font-size: inherit;">${question.question_text}</p>
                                <input
                                    type="text"
                                    id="${inputId}"
                                    data-question-id="${questionId}"
                                    value="${currentAnswer}"
                                    placeholder="Type your answer here"
                                    autocomplete="off"
                                    class="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    `;
            renderedCache[questionId] = html;
            return html;
        }).join('')}
            </div>
        `;
    },

    /**
     * Render MCMA (Multiple Choice - Multiple Answers)
     */
    renderMCMA(group, userAnswers, onAnswer) {
        return `
            <div class="space-y-6">
                ${group.questions.map(question => {
            // Handle different answer formats (string, array, or empty)
            const rawAnswer = userAnswers[question.id];
            let currentAnswers = [];

            if (Array.isArray(rawAnswer)) {
                currentAnswers = rawAnswer.filter(a => a && a.trim());
            } else if (typeof rawAnswer === 'string' && rawAnswer) {
                // Split into individual characters (backend stores as "ACE" not "A,C,E")
                currentAnswers = rawAnswer.split('').filter(a => a.trim());
            }

            // Get max selections allowed for this question
            const maxSelections = question.max_selections || (question.options || []).length;

            return `
                        <div class="pb-6 border-b border-slate-100 last:border-b-0">
                            <div class="flex items-start gap-3 mb-3">
                                <div class="flex-1">
                                    ${question.stem ? `<p class="font-semibold text-slate-900 mb-1" style="font-size: inherit;">${question.stem}</p>` : ''}
                                    <p class="font-medium text-slate-900" style="font-size: inherit;">${question.question_text}</p>
                                    ${maxSelections ? `<p class="text-sm text-slate-600 mt-2" style="font-size: inherit;"><strong>Choose ${maxSelections} answer${maxSelections > 1 ? 's' : ''}.</strong></p>` : ''}
                                </div>
                            </div>
                            <div class="ml-9 space-y-2" data-question-id="${question.id}" data-max-selections="${maxSelections}">
                                ${(question.options || []).map(option => {
                const isSelected = currentAnswers.includes(option.key);
                const isDisabled = !isSelected && currentAnswers.length >= maxSelections;
                return `
                                        <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${isSelected
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                        : isDisabled
                            ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                    }">
                                            <input
                                                type="checkbox"
                                                value="${option.key}"
                                                ${isSelected ? 'checked' : ''}
                                                ${isDisabled ? 'disabled' : ''}
                                                data-question-id="${question.id}"
                                                data-answer="${option.key}"
                                                data-immediate="true"
                                                data-type="mcma"
                                                data-max-selections="${maxSelections}"
                                                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2 rounded ${isDisabled ? 'cursor-not-allowed' : ''}"
                                            />
                                            <span class="flex items-center gap-2 text-slate-700" style="font-size: inherit;">
                                                <strong class="font-semibold">${option.key}</strong>
                                                <span>${option.choice_text}</span>
                                            </span>
                                        </label>
                                    `;
            }).join('')}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    /**
     * Render NC (Note Completion)
     * Uses question_body JSON to build hierarchical structure
     * Uses Questions model for answer inputs
     */
    renderNoteCompletion(group, userAnswers, renderedCache) {
        // Get structure from question_body (already parsed as object by serializer)
        const noteData = group.question_data;

        // If no question_body or invalid structure, fall back to simple rendering
        if (!noteData || !noteData.items) {
            return this.renderNoteCompletionSimple(group, userAnswers, renderedCache);
        }

        // Create a map of questions by order for easy lookup
        const questionMap = {};
        let questionIndex = 0;
        group.questions.forEach(q => {
            questionMap[questionIndex] = q;
            questionIndex++;
        });

        let currentQuestionIndex = 0;

        // Recursive function to render items
        const renderItems = (items, level = 0) => {
            const htmlParts = [];

            for (const item of items) {
                if (typeof item === 'string') {
                    // Plain text or text with <input> placeholder
                    if (item.includes('<input>')) {
                        // Replace <input> with actual input field from Questions
                        const parts = item.split('<input>');
                        let lineHtml = '';

                        for (let idx = 0; idx < parts.length; idx++) {
                            lineHtml += parts[idx];

                            if (idx < parts.length - 1) {
                                const question = questionMap[currentQuestionIndex];
                                if (!question) {
                                    currentQuestionIndex++;
                                    lineHtml += '<span class="text-red-500">[Missing Question]</span>';
                                } else {
                                    const inputId = `q-${question.id}`;
                                    const currentAnswer = userAnswers[question.id] || '';
                                    // Minimalistic input with question number as placeholder hint
                                    lineHtml += `
                                        <input 
                                            type="text" 
                                            id="${inputId}"
                                            data-question-id="${question.id}"
                                            value="${currentAnswer}"
                                            placeholder="${question.order}"
                                            autocomplete="off"
                                            class="inline-block w-32 px-2 border-2 rounded-md border-slate-400 bg-slate-100 text-slate-900 font-medium text-center focus:border-slate-600 focus:outline-none transition-colors"
                                        />
                                    `;
                                    currentQuestionIndex++;
                                }
                            }
                        }

                        htmlParts.push(`<div class="text-slate-700 leading-relaxed ${level > 0 ? 'ml-4' : ''}" style="font-size: inherit;">${lineHtml}</div>`);
                    } else {
                        // Plain text item
                        htmlParts.push(`<div class="text-slate-700 leading-relaxed ${level > 0 ? 'ml-4' : ''}" style="font-size: inherit;">${item.trim()}</div>`);
                    }
                } else if (typeof item === 'object' && item.items) {
                    // Nested structure with optional prefix/title
                    const hasTitle = item.title;
                    const hasPrefix = item.prefix;

                    let html = '';

                    if (hasTitle) {
                        html += `<div class="font-bold text-slate-900 mt-3 mb-2 ${level > 0 ? 'ml-4' : ''}" style="font-size: inherit;">${item.title}</div>`;
                    }

                    if (hasPrefix) {
                        // Process prefix for <input> tags
                        let processedPrefix = item.prefix;
                        if (processedPrefix.includes('<input>')) {
                            processedPrefix = processedPrefix.replace(/<input>/g, () => {
                                const question = questionMap[currentQuestionIndex];
                                if (!question) {
                                    currentQuestionIndex++;
                                    return '<span class="text-red-500">[Missing Question]</span>';
                                }
                                const inputId = `q-${question.id}`;
                                const currentAnswer = userAnswers[question.id] || '';
                                const inputHtml = `
                                    <input 
                                        type="text" 
                                        id="${inputId}"
                                        data-question-id="${question.id}"
                                        value="${currentAnswer}"
                                        placeholder="${question.order}"
                                        autocomplete="off"
                                        class="inline-block w-32 px-2 border-2 rounded-md border-slate-400 bg-slate-100 text-slate-900 font-medium text-center focus:border-slate-600 focus:outline-none transition-colors"
                                    />
                                `;
                                currentQuestionIndex++;
                                return inputHtml;
                            });
                        }
                        html += `<div class="text-slate-700 font-medium ${level > 0 ? 'ml-4' : ''} mb-1" style="font-size: inherit;">${processedPrefix}</div>`;
                    }

                    // Recursively render nested items
                    const nestedHtml = renderItems(item.items, level + 1);
                    html += `<div class="${hasPrefix || hasTitle ? 'ml-4' : ''}">${nestedHtml}</div>`;

                    htmlParts.push(html);
                }
            }

            return htmlParts.join('');
        };

        return `
            <div class="bg-white rounded-lg">
                
                <!-- Notes Container with Title -->
                <div class="border border-slate-300 rounded p-6 space-y-2">
                    <!-- Title at top center -->
                    <h3 class="text-center text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-200" style="font-size: inherit;">
                        ${noteData.title || group.title || 'Complete the notes below'}
                    </h3>
                    
                    ${renderItems(noteData.items)}
                </div>
            </div>
        `;
    },

    /**
     * Render NC Simple (Fallback when no question_body)
     * For backward compatibility
     * 
     *  <!-- Answer Format Instruction -->
                <div class="mb-4 text-center">
                    <p class="text-slate-600" style="font-size: inherit;">
                        Write <strong class="font-semibold">${group.answer_format || 'NO MORE THAN TWO WORDS AND/OR A NUMBER'}</strong> for each answer.
                    </p>
                </div>
     */
    renderNoteCompletionSimple(group, userAnswers, renderedCache) {
        return `
            <div class="bg-white rounded-lg p-2">
               
                
                <!-- Notes Container with Title -->
                <div class="border border-slate-300 rounded p-6 space-y-3">
                    <!-- Title at top center -->
                    <h3 class="text-center text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-200">
                        ${group.title || 'Complete the notes below'}
                    </h3>
                    
                    ${group.questions.map(question => {
            const text = question.question_text || '';
            const questionNumber = question.order;
            const currentAnswer = userAnswers[question.id] || '';

            // If text has {{placeholder}}, render inline with minimalistic input
            if (text.includes('{{')) {
                const formattedText = text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
                    const inputId = `q-${question.id}`;
                    return `
                                    <input 
                                        type="text" 
                                        id="${inputId}"
                                        data-question-id="${question.id}"
                                        value="${currentAnswer}"
                                        placeholder="${questionNumber}"
                                        autocomplete="off"
                                        class="inline-block w-32 px-2 border-2 rounded-md border-slate-400 bg-slate-100 text-slate-900 font-medium text-center focus:border-slate-600 focus:outline-none transition-colors"
                                    />
                                `;
                });
                return `
                                <div class="text-slate-700 leading-relaxed" style="font-size: inherit;">
                                    ${formattedText}
                                </div>
                            `;
            } else {
                // Standard question-answer format with minimalistic input
                const inputId = `q-${question.id}`;
                return `
                                <div class="text-slate-700 leading-relaxed" style="font-size: inherit;" data-question-id="${question.id}">
                                    ${text}
                                    <input 
                                        type="text" 
                                        id="${inputId}"
                                        data-question-id="${question.id}"
                                        value="${currentAnswer}"
                                        placeholder="${questionNumber}"
                                        autocomplete="off"
                                        class="inline-block w-32 ml-2 px-2 py-0.5 rounded-md border-b-2 border-slate-400 bg-transparent text-slate-900 font-medium text-center focus:border-indigo-600 focus:outline-none transition-colors"
                                        style="border-top: none; border-left: none; border-right: none; border-radius: 0;"
                                    />
                                </div>
                            `;
            }
        }).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render Matching Questions (MH, MI, MF)
     * Uses dropdown selects for answer selection
     */
    renderMatching(group, userAnswers, renderedCache) {
        // Parse matching options from question_data
        let options = [];
        if (group.question_data) {
            try {
                const data = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
                options = data.options || [];
            } catch (e) {
                console.error('Error parsing matching options:', e);
            }
        }

        const typeLabels = {
            'MH': 'Matching Headings',
            'MI': 'Matching Information',
            'MF': 'Matching Features'
        };

        return `
            <div class="space-y-4">
                ${group.questions.map(question => {
            const questionId = question.id;
            const currentAnswer = userAnswers[questionId] || '';
            const inputId = `select-${questionId}`;

            // Cache check
            if (renderedCache[questionId]) {
                return renderedCache[questionId];
            }

            const html = `
                <div class="flex items-center gap-4 pb-4 border-b border-slate-100 last:border-b-0">
                    <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                        ${question.order}
                    </span>
                    <p class="font-medium text-slate-900 mb-0 flex-1" style="font-size: inherit;">${question.question_text}</p>
                    <select
                        id="${inputId}"
                        data-question-id="${questionId}"
                        class="w-full max-w-xs px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none transition-colors bg-white">
                        <option value="">Select an answer...</option>
                        ${options.map(opt => {
                const optKey = opt.key || opt.value;
                const optText = opt.text || opt.label;
                return `
                            <option value="${optKey}" ${currentAnswer === optKey ? 'selected' : ''}>
                                ${optKey} - ${optText}
                            </option>
                        `;
            }).join('')}
                    </select>
                </div>
            `;
            renderedCache[questionId] = html;
            return html;
        }).join('')}
            </div>
        `;
    },

    /**
     * Render Summary Completion (SUC)
     * Displays summary text with inline blanks
     */
    renderSummaryCompletion(group, userAnswers, renderedCache) {
        // Get summary data from question_data
        let summaryData = { title: '', text: '', prefix: '' };
        if (group.question_data) {
            try {
                summaryData = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
            } catch (e) {
                console.error('Error parsing summary data:', e);
            }
        }

        // Create a map of questions by sequential index (0-based)
        const questionMap = {};
        group.questions.forEach((q, index) => {
            questionMap[index] = q;
        });

        let blankIndex = 0; // Start at 0 to match array index

        // Helper function to replace <input> tags
        const replaceInputs = (text) => {
            return text.replace(/<input>/g, () => {
                const question = questionMap[blankIndex];
                if (!question) {
                    blankIndex++;
                    return '_____';
                }

                const questionId = question.id;
                const currentAnswer = userAnswers[questionId] || '';
                const inputId = `input-${questionId}`;
                blankIndex++;

                return `<input
                    type="text"
                    id="${inputId}"
                    data-question-id="${questionId}"
                    value="${currentAnswer}"
                    placeholder="${question.order}"
                    autocomplete="off"
                    class="inline-block w-32 mx-1 px-2 border-2 border-slate-400 bg-slate-100 rounded-md text-slate-900 font-medium text-center focus:border-slate-400 focus:outline-none transition-colors"
                />`;
            });
        };

        // Process prefix if exists
        let processedPrefix = '';
        if (summaryData.prefix) {
            processedPrefix = replaceInputs(summaryData.prefix);
        }

        // Process main text
        let summaryText = summaryData.text || '';
        summaryText = replaceInputs(summaryText);

        return `
            <div class="bg-white rounded-lg border border-slate-200 p-6">
                ${processedPrefix ? `
                    <div class="text-slate-700 font-medium mb-3" style="font-size: inherit;">
                        ${processedPrefix}
                    </div>
                ` : ''}
                <div class="text-slate-700 leading-relaxed" style="font-size: inherit;">
                    ${summaryText}
                </div>
            </div>
        `;
    },

    /**
     * Render Table Completion (TC)
     * Displays table with input fields in cells
     * Supports two formats:
     * 1. New format: question_data.items = [[headers], [row1], [row2], ...]
     *    - Cells can be strings, arrays (multi-line), or contain <input> tags
     * 2. Old format: question_data = { headers: [], rows: [] } with input type objects
     * Also supports prefix field with <input> tags
     */
    renderTableCompletion(group, userAnswers, renderedCache) {
        // Parse table data from question_data
        let tableData = null;
        if (group.question_data) {
            try {
                tableData = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
            } catch (e) {
                console.error('Error parsing table data:', e);
            }
        }

        // Create question map by sequential index (0-based) for easy lookup
        const questionMap = {};
        group.questions.forEach((q, index) => {
            questionMap[index] = q;
        });

        // Detect format and process accordingly
        let headers = [];
        let rows = [];
        let tableTitle = '';
        let tablePrefix = '';

        if (tableData && tableData.items && Array.isArray(tableData.items)) {
            // NEW FORMAT: items array - all rows are data (no header row)
            tableTitle = tableData.title || group.title || '';
            tablePrefix = tableData.prefix || '';
            rows = tableData.items;
        } else if (tableData && tableData.headers && tableData.rows) {
            // OLD FORMAT: separate headers and rows
            tableTitle = tableData.title || group.title || '';
            tablePrefix = tableData.prefix || '';
            headers = tableData.headers;
            rows = tableData.rows;
        }

        // Track current question index for input replacements (0-based)
        let currentQuestionIndex = 0;

        // Helper function to replace <input> with actual input fields
        const replaceInputs = (text) => {
            return text.replace(/<input>/g, () => {
                const question = questionMap[currentQuestionIndex];
                if (!question) {
                    currentQuestionIndex++;
                    return '<input>';
                }

                const questionId = question.id;
                const currentAnswer = userAnswers[questionId] || '';
                const inputId = `input-${questionId}`;
                const inputHtml = `<input
                    type="text"
                    id="${inputId}"
                    data-question-id="${questionId}"
                    value="${currentAnswer}"
                    placeholder="${question.order}"
                    autocomplete="off"
                    class="inline-block w-32 px-2 border-2 border-slate-300 rounded-md focus:border-indigo-600 focus:outline-none transition-colors text-center"
                    style="font-size: inherit;"
                />`;
                currentQuestionIndex++;
                return inputHtml;
            });
        };

        // Process prefix if exists
        let processedPrefix = '';
        if (tablePrefix) {
            processedPrefix = replaceInputs(tablePrefix);
        }

        // Process cell content - handles strings, arrays, and <input> tags
        const processCellContent = (cell) => {
            // Handle array cells (multi-line content)
            if (Array.isArray(cell)) {
                return cell.map(item => {
                    if (typeof item === 'string' && item.includes('<input>')) {
                        // Replace <input> with actual input fields
                        return item.replace(/<input>/g, () => {
                            const question = questionMap[currentQuestionIndex];
                            if (!question) {
                                currentQuestionIndex++;
                                return '<input>';
                            }

                            const questionId = question.id;
                            const currentAnswer = userAnswers[questionId] || '';
                            const inputId = `input-${questionId}`;
                            const inputHtml = `<input
                                type="text"
                                id="${inputId}"
                                data-question-id="${questionId}"
                                value="${currentAnswer}"
                                placeholder="${question.order}"
                                autocomplete="off"
                                class="inline-block w-32 px-2 border-2 border-slate-300 rounded-md focus:border-indigo-600 focus:outline-none transition-colors text-center"
                                style="font-size: inherit;"
                            />`;
                            currentQuestionIndex++;
                            return inputHtml;
                        });
                    }
                    return item;
                }).join('<br>');
            }

            // Handle old format with input type objects
            if (typeof cell === 'object' && cell.type === 'input' && cell.order) {
                const question = questionMap[currentQuestionIndex];
                if (question) {
                    const questionId = question.id;
                    const currentAnswer = userAnswers[questionId] || '';
                    const inputId = `input-${questionId}`;
                    currentQuestionIndex++;
                    return `<input
                        type="text"
                        id="${inputId}"
                        data-question-id="${questionId}"
                        value="${currentAnswer}"
                        placeholder="${question.order}"
                        autocomplete="off"
                        class="w-full px-2 py-1 border-2 border-slate-300 rounded focus:border-indigo-600 focus:outline-none transition-colors"
                        style="font-size: inherit;"
                    />`;
                }
                currentQuestionIndex++;
                return '<input>';
            }

            // Handle string cells with inline <input> tags
            if (typeof cell === 'string' && cell.includes('<input>')) {
                return cell.replace(/<input>/g, () => {
                    const question = questionMap[currentQuestionIndex];
                    if (!question) {
                        currentQuestionIndex++;
                        return '<input>';
                    }

                    const questionId = question.id;
                    const currentAnswer = userAnswers[questionId] || '';
                    const inputId = `input-${questionId}`;
                    const inputHtml = `<input
                        type="text"
                        id="${inputId}"
                        data-question-id="${questionId}"
                        value="${currentAnswer}"
                        placeholder="${question.order}"
                        autocomplete="off"
                        class="inline-block w-32 px-2 border-2 border-slate-300 rounded-md focus:border-indigo-600 focus:outline-none transition-colors text-center"
                        style="font-size: inherit;"
                    />`;
                    currentQuestionIndex++;
                    return inputHtml;
                });
            }

            // Plain text cell
            return cell;
        };

        return `
            <div class="overflow-x-auto">
                ${processedPrefix ? `
                    <div class="text-slate-700 font-medium mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200" style="font-size: inherit;">
                        ${processedPrefix}
                    </div>
                ` : ''}
                ${tableTitle ? `
                    <h3 class="text-center text-lg font-bold text-slate-900 p-3 border-2 border-slate-400" style="font-size: inherit;">
                        ${tableTitle}
                    </h3>
                ` : ''}
                <table class="w-full border-collapse border-2 border-slate-400">
                    ${headers && headers.length > 0 ? `
                        <thead>
                            <tr class="bg-slate-100">
                                ${headers.map(header => `
                                    <th class="border-2 border-slate-400 px-4 py-3 text-left font-semibold text-slate-900" style="font-size: inherit;">
                                        ${header}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                    ` : ''}
                    <tbody>
                        ${rows.map((row, rowIndex) => `
                            <tr class="${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                                ${row.map((cell, cellIndex) => `
                                    <td class="border-2 border-slate-400 px-4 py-3 text-slate-700 align-top" style="font-size: inherit;">
                                        ${processCellContent(cell)}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Render Flow Chart Completion (FCC)
     * Similar to form completion but with visual flow indicators
     * Also supports prefix field with <input> tags
     */
    renderFlowChartCompletion(group, userAnswers, renderedCache) {
        // Parse question_data for prefix
        let fccData = { prefix: '' };
        if (group.question_data) {
            try {
                fccData = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
            } catch (e) {
                console.error('Error parsing FCC data:', e);
            }
        }

        // Create a map of questions by sequential index (0-based)
        const questionMap = {};
        group.questions.forEach((q, index) => {
            questionMap[index] = q;
        });

        let currentQuestionIndex = 0;

        // Helper function to replace <input> tags in prefix
        const replaceInputs = (text) => {
            return text.replace(/<input>/g, () => {
                const question = questionMap[currentQuestionIndex];
                if (!question) {
                    currentQuestionIndex++;
                    return '<input>';
                }

                const questionId = question.id;
                const currentAnswer = userAnswers[questionId] || '';
                const inputId = `input-${questionId}`;
                const inputHtml = `<input
                    type="text"
                    id="${inputId}"
                    data-question-id="${questionId}"
                    value="${currentAnswer}"
                    placeholder="${question.order}"
                    autocomplete="off"
                    class="inline-block w-32 px-2 border-2 border-slate-300 rounded-md focus:border-indigo-600 focus:outline-none bg-slate-100 text-slate-900 font-medium text-center transition-colors"
                    style="font-size: inherit;"
                />`;
                currentQuestionIndex++;
                return inputHtml;
            });
        };

        // Process prefix if exists
        let processedPrefix = '';
        if (fccData.prefix) {
            processedPrefix = replaceInputs(fccData.prefix);
        }

        return `
            <div class="space-y-3">
                ${processedPrefix ? `
                    <div class="text-slate-700 font-medium mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200" style="font-size: inherit;">
                        ${processedPrefix}
                    </div>
                ` : ''}
                ${group.questions.map((question, index) => {
            const questionId = question.id;
            const currentAnswer = userAnswers[questionId] || '';
            const inputId = `input-${questionId}`;

            if (renderedCache[questionId]) {
                return renderedCache[questionId];
            }

            const html = `
                        <div class="relative">
                            ${index > 0 ? `
                                <div class="absolute left-4 -top-3 w-0.5 h-3 bg-indigo-300"></div>
                            ` : ''}
                            <div class="flex items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                                <span class="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 text-white text-sm font-bold rounded-full flex-shrink-0">
                                    ${question.order}
                                </span>
                                <div class="flex-1">
                                    <div class="flex items-baseline gap-2 flex-wrap">
                                        ${this.formatQuestionText(question, group, userAnswers, renderedCache)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
            renderedCache[questionId] = html;
            return html;
        }).join('')}
            </div>
        `;
    },

    /**
     * Render Diagram/Map Labelling (DL, ML)
     * Shows image with numbered labels in a structured list format
     */
    renderDiagramLabelling(group, userAnswers, renderedCache) {
        // Get diagram data from question_data
        let diagramData = { title: '', description: '', imageUrl: '', labels: [] };
        if (group.question_data) {
            try {
                diagramData = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
            } catch (e) {
                console.error('Error parsing diagram data:', e);
            }
        }

        // Use picture_url from group if available
        const imageUrl = group.picture_url || diagramData.imageUrl;

        // For Map Labeling, if questions array is empty but we have labels in question_data, show them
        const hasQuestionsInDB = group.questions && group.questions.length > 0;
        const hasLabelsInData = diagramData.labels && diagramData.labels.length > 0;

        return `
            <div class="space-y-4">
                <!-- Map/Diagram Title and Description -->
                ${diagramData.title || diagramData.description ? `
                    <div class="bg-slate-50 border-2 border-slate-300 rounded-lg p-4">
                        ${diagramData.title ? `
                            <h3 class="text-lg font-bold text-slate-900 mb-2" style="font-size: inherit;">
                                ${diagramData.title}
                            </h3>
                        ` : ''}
                        ${diagramData.description ? `
                            <p class="text-slate-600 text-sm" style="font-size: inherit;">
                                ${diagramData.description}
                            </p>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Diagram/Map Image -->
                ${imageUrl ? `
                    <div class="bg-white border-2 border-slate-300 rounded-lg p-4 flex justify-center">
                        <img src="${imageUrl}" alt="${diagramData.title || group.title || 'Map/Diagram'}" class="max-w-full h-auto rounded" style="max-height: 500px;" />
                    </div>
                ` : ''}

                <!-- Label Inputs - List Format -->
                <div class="bg-white border-2 border-slate-300 rounded-lg p-4">
                    <div class="space-y-3">
                        ${hasQuestionsInDB ?
                // Render from Questions model (standard approach)
                group.questions.map(question => {
                    const questionId = question.id;
                    const currentAnswer = userAnswers[questionId] || '';
                    const inputId = `input-${questionId}`;
                    const labelName = question.question_text || `Label ${question.order}`;

                    if (renderedCache[questionId]) {
                        return renderedCache[questionId];
                    }

                    const html = `
                                <div class="flex items-center gap-3 pb-3 border-b border-slate-200 last:border-b-0">
                                    <span class="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 text-white text-sm font-bold rounded-full flex-shrink-0">
                                        ${question.order}
                                    </span>
                                    <span class="font-medium text-slate-700 flex-shrink-0" style="font-size: inherit; min-width: 120px;">
                                        ${labelName}
                                    </span>
                                    <input
                                        type="text"
                                        id="${inputId}"
                                        data-question-id="${questionId}"
                                        value="${currentAnswer}"
                                        placeholder="Your answer"
                                        autocomplete="off"
                                        class="flex-1 px-3 py-2 border-2 border-slate-300 rounded focus:border-indigo-600 focus:outline-none transition-colors"
                                        style="font-size: inherit;"
                                    />
                                </div>
                            `;
                    renderedCache[questionId] = html;
                    return html;
                }).join('')
                :
                // Fallback: Render from question_data labels (for preview/incomplete setup)
                hasLabelsInData ?
                    diagramData.labels.map((label, index) => {
                        return `
                                    <div class="flex items-center gap-3 pb-3 border-b border-slate-200 last:border-b-0">
                                        <span class="inline-flex items-center justify-center w-8 h-8 bg-amber-500 text-white text-sm font-bold rounded-full flex-shrink-0">
                                            ${index + 1}
                                        </span>
                                        <span class="font-medium text-slate-700 flex-shrink-0" style="font-size: inherit; min-width: 120px;">
                                            ${label.name || `Label ${index + 1}`}
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Your answer"
                                            autocomplete="off"
                                            disabled
                                            class="flex-1 px-3 py-2 border-2 border-slate-300 rounded bg-slate-100 text-slate-500 cursor-not-allowed"
                                            style="font-size: inherit;"
                                        />
                                    </div>
                                    ${index === diagramData.labels.length - 1 ? `
                                        <div class="pt-2">
                                            <p class="text-xs text-amber-600 text-center">⚠️ Questions not yet saved by instructor</p>
                                        </div>
                                    ` : ''}
                                `;
                    }).join('')
                    :
                    '<p class="text-slate-500 text-center py-8">No labels available</p>'
            }
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render Sentence Completion (SC)
     * Handles inline <input> tags in question_text
     * Also supports prefix in question_data
     */
    renderSentenceCompletion(group, userAnswers, renderedCache) {
        // Parse question_data for prefix
        let scData = { prefix: '' };
        if (group.question_data) {
            try {
                scData = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
            } catch (e) {
                console.error('Error parsing SC data:', e);
            }
        }

        // Create a map of questions by sequential index (0-based)
        const questionMap = {};
        group.questions.forEach((q, index) => {
            questionMap[index] = q;
        });

        let currentQuestionIndex = 0;

        // Helper function to replace <input> tags
        const replaceInputs = (text, questionId = null) => {
            return text.replace(/<input>/gi, () => {
                let question;
                if (questionId !== null) {
                    // For question_text, use the specific question
                    question = group.questions.find(q => q.id === questionId);
                } else {
                    // For prefix, use sequential index
                    question = questionMap[currentQuestionIndex];
                    currentQuestionIndex++;
                }

                if (!question) {
                    return '<input>';
                }

                const inputId = `input-${question.id}`;
                const currentAnswer = userAnswers[question.id] || '';
                return `<input
                    type="text"
                    id="${inputId}"
                    data-question-id="${question.id}"
                    value="${currentAnswer}"
                    placeholder="${question.order}"
                    autocomplete="off"
                    class="inline-block w-40 mx-1 px-2 border-2 border-slate-300 rounded-md focus:border-slate-400 focus:outline-none bg-slate-100 text-slate-900 font-medium text-center transition-colors"
                    style="font-size: inherit;"
                />`;
            });
        };

        // Process prefix if exists
        let processedPrefix = '';
        if (scData.prefix) {
            processedPrefix = replaceInputs(scData.prefix);
        }

        return `
            <div class="space-y-4">
                ${processedPrefix ? `
                    <div class="text-slate-700 font-medium mb-3 pb-3 border-b border-slate-200" style="font-size: inherit;">
                        ${processedPrefix}
                    </div>
                ` : ''}
                ${group.questions.map(question => {
            const questionId = question.id;
            const currentAnswer = userAnswers[questionId] || '';
            let questionText = question.question_text || '';

            // Replace <input> tags with actual input fields
            questionText = replaceInputs(questionText, questionId);

            return `
                        <div class="flex items-start gap-3 pb-4 border-b border-slate-100 last:border-b-0">
                            <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                ${question.order}
                            </span>
                            <div class="flex-1">
                                <div class="text-slate-700 leading-relaxed" style="font-size: inherit;">
                                    ${questionText}
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    /**
     * Render Form Completion (FC)
     * Uses question_data.items to build form structure with inline inputs
     */
    renderFormCompletion(group, userAnswers, renderedCache) {
        // Parse form data from question_data (similar to Note Completion)
        let formData = null;

        if (group.question_data) {
            try {
                // Parse if it's a string, otherwise use as is
                formData = typeof group.question_data === 'string'
                    ? JSON.parse(group.question_data)
                    : group.question_data;
            } catch (e) {
                console.error('Error parsing form data:', e);
            }
        }

        console.log("Parsed Form Data for FC:", formData);

        // If no question_data or invalid structure, fall back to simple rendering
        if (!formData || !formData.items) {
            console.log("No formData.items, falling back to renderListView");
            return this.renderListView(group, userAnswers, renderedCache);
        }

        // Create a map of questions by sequential index (0-based) for easy lookup
        const questionMap = {};
        group.questions.forEach((q, index) => {
            questionMap[index] = q;
        });

        // Track current question index across all items
        let currentQuestionIndex = 0;

        // Process each item and replace <input> with actual input fields
        const processedItems = formData.items.map(item => {
            // Replace <input> tags with actual input fields (sequential matching)
            let processedItem = item.replace(/<input>/g, () => {
                const question = questionMap[currentQuestionIndex];
                if (!question) {
                    currentQuestionIndex++;
                    return '<input>'; // Keep original if no question found
                }

                const questionId = question.id;
                const currentAnswer = userAnswers[questionId] || '';
                const inputId = `q-${questionId}`;
                const questionNumber = question.order;

                // Check cache to prevent re-rendering
                if (renderedCache[questionId]) {
                    const existingInput = document.getElementById(inputId);
                    if (existingInput) {
                        currentQuestionIndex++;
                        return renderedCache[questionId];
                    }
                }

                const inputHtml = `
                    <span class="relative inline-flex items-center mx-1">
                        <input 
                            type="text" 
                            id="${inputId}"
                            data-question-id="${questionId}"
                            value="${currentAnswer}"
                            placeholder="${questionNumber}"
                            autocomplete="off"
                            class="inline-block px-1 border-2 rounded-md text-center border-slate-300 focus:border-slate-400 focus:outline-none bg-slate-100 text-slate-900 font-medium transition-colors min-w-[120px]"
                            style="font-size: inherit;"
                        />
                    </span>
                `;

                renderedCache[questionId] = inputHtml;
                currentQuestionIndex++;
                return inputHtml;
            });

            return processedItem;
        });

        return `
            <div class="bg-white rounded-lg border-2 border-slate-400 p-6">
                ${formData.title || group.title ? `
                    <h3 class="text-center text-base font-bold text-slate-900 mb-6 pb-3 border-b-2 border-slate-400" style="font-size: inherit;">
                        ${formData.title || group.title}
                    </h3>
                ` : ''}
                <div class="space-y-1.5">
                    ${processedItems.map(item => `
                        <div class="py-1 leading-relaxed">
                            <span class="text-slate-900" style="font-size: inherit;">${item}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render List/Structured View (Form Completion, Short Answer, etc.)
     */
    renderListView(group, userAnswers, renderedCache) {
        return `
            <div class="space-y-4">
                ${group.questions.map(question => `
                    <div class="flex items-start gap-3">
                        <span class="text-slate-600 font-medium" style="font-size: inherit;">•</span>
                        <div class="flex-1">
                            <div class="flex items-baseline gap-2 flex-wrap">
                                ${this.formatQuestionText(question, group, userAnswers, renderedCache)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render Table View
     */
    renderTableView(group, userAnswers, renderedCache) {
        return `
            <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                    <tbody>
                        ${group.questions.map(question => `
                            <tr class="border-b border-slate-200 last:border-b-0">
                                <td class="py-3 px-4 text-slate-700 leading-relaxed" style="font-size: inherit;">
                                    ${this.formatQuestionText(question, group, userAnswers, renderedCache)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Render Default View (generic fallback)
     */
    renderDefaultView(group, userAnswers, renderedCache) {
        return this.renderListView(group, userAnswers, renderedCache);
    },

    /**
     * Main render function - routes to appropriate renderer based on question type
     */
    render(group, userAnswers, renderedCache = {}, fontSize = 'text-base') {
        // Store fontSize for use in sub-renderers
        this.fontSize = fontSize;

        // MCQ - Multiple Choice (Single Answer)
        if (group.question_type === 'MCQ') {
            return this.renderMCQ(group, userAnswers);
        }

        // MCMA - Multiple Choice (Multiple Answers)
        if (group.question_type === 'MCMA') {
            return this.renderMCMA(group, userAnswers);
        }

        // TFNG - True/False/Not Given
        if (group.question_type === 'TFNG') {
            return this.renderTFNG(group, userAnswers);
        }

        // YNNG - Yes/No/Not Given
        if (group.question_type === 'YNNG') {
            return this.renderTFNG(group, userAnswers);
        }

        // SA - Short Answer
        if (group.question_type === 'SA') {
            return this.renderShortAnswer(group, userAnswers, renderedCache);
        }

        // NC - Note Completion
        if (group.question_type === 'NC') {
            return this.renderNoteCompletion(group, userAnswers, renderedCache);
        }

        // MH, MI, MF - Matching Questions
        if (group.question_type === 'MH' || group.question_type === 'MI' || group.question_type === 'MF') {
            return this.renderMatching(group, userAnswers, renderedCache);
        }

        // SUC - Summary Completion
        if (group.question_type === 'SUC') {
            return this.renderSummaryCompletion(group, userAnswers, renderedCache);
        }

        // TC - Table Completion
        if (group.question_type === 'TC') {
            return this.renderTableCompletion(group, userAnswers, renderedCache);
        }

        // FCC - Flow Chart Completion
        if (group.question_type === 'FCC') {
            return this.renderFlowChartCompletion(group, userAnswers, renderedCache);
        }

        // DL, ML - Diagram/Map Labelling
        if (group.question_type === 'DL' || group.question_type === 'ML') {
            return this.renderDiagramLabelling(group, userAnswers, renderedCache);
        }

        // FC - Form Completion (with question_data.items structure)
        console.log("Checking for FC:", group.question_type === 'FC');
        if (group.question_type === 'FC') {

            return this.renderFormCompletion(group, userAnswers, renderedCache);
        }

        // SC - Sentence Completion (with inline <input> tags)
        if (group.question_type === 'SC') {
            return this.renderSentenceCompletion(group, userAnswers, renderedCache);
        }

        // Legacy support: Table View
        if (group.view_type === 'table') {
            return this.renderTableView(group, userAnswers, renderedCache);
        }

        // Legacy support: List/Structured View
        if (group.view_type === 'list' || group.view_type === 'structured') {
            return this.renderListView(group, userAnswers, renderedCache);
        }

        // Default fallback
        return this.renderDefaultView(group, userAnswers, renderedCache);
    },

    /**
     * Setup event listeners for auto-save functionality
     * Handles text inputs, MCQ, MCMA, and focus tracking
     */
    setupEventListeners(containerElement, onAnswer, onFocus = null) {
        // Store reference to last focused input for focus restoration
        let lastFocusedInput = null;
        let lastFocusedQuestionId = null;

        // Text input auto-save (debounced)
        containerElement.addEventListener('input', (e) => {
            if (e.target.matches('input[type="text"][data-question-id]')) {
                const questionId = parseInt(e.target.dataset.questionId);
                const answer = e.target.value;
                const immediate = false; // Text inputs use debouncing

                // Store the focused input reference
                lastFocusedInput = e.target;
                lastFocusedQuestionId = questionId;

                onAnswer(questionId, answer, immediate);
            }
        });

        // Focus tracking for all inputs (text, radio, checkbox, select)
        if (onFocus) {
            containerElement.addEventListener('focusin', (e) => {
                if (e.target.matches('[data-question-id]')) {
                    const questionId = parseInt(e.target.dataset.questionId);

                    // Store focused input for text inputs and selects
                    if (e.target.matches('input[type="text"]') || e.target.matches('select')) {
                        lastFocusedInput = e.target;
                        lastFocusedQuestionId = questionId;
                    }

                    onFocus(questionId);
                }
            });

            // Also track clicks on radio/checkbox labels
            containerElement.addEventListener('click', (e) => {
                const input = e.target.closest('label')?.querySelector('[data-question-id]');
                if (input) {
                    const questionId = parseInt(input.dataset.questionId);
                    onFocus(questionId);
                }
            });
        }

        // MCQ/MCMA radio/checkbox and Matching dropdowns (immediate save)
        containerElement.addEventListener('change', (e) => {
            if (e.target.matches('input[type="radio"][data-question-id]')) {
                const questionId = parseInt(e.target.dataset.questionId);
                const answer = e.target.dataset.answer;
                const immediate = e.target.dataset.immediate === 'true';
                onAnswer(questionId, answer, immediate);
            }

            if (e.target.matches('input[type="checkbox"][data-question-id]')) {
                const questionId = parseInt(e.target.dataset.questionId);
                const optionKey = e.target.dataset.answer;
                const checked = e.target.checked;
                const immediate = e.target.dataset.immediate === 'true';

                // For MCMA, we need special handling
                if (e.target.dataset.type === 'mcma') {
                    const maxSelections = parseInt(e.target.dataset.maxSelections) || 999;

                    // Get all checked checkboxes for this question from DOM
                    const allCheckboxes = containerElement.querySelectorAll(
                        `input[type="checkbox"][data-question-id="${questionId}"]`
                    );

                    // Build answer array from currently checked checkboxes
                    const currentAnswers = [];
                    allCheckboxes.forEach(checkbox => {
                        if (checkbox.checked) {
                            currentAnswers.push(checkbox.dataset.answer);
                        }
                    });

                    // Check if selection limit exceeded
                    if (currentAnswers.length > maxSelections) {
                        // Uncheck the current checkbox
                        e.target.checked = false;

                        // Show a brief warning message
                        const label = e.target.closest('label');
                        if (label) {
                            const originalBg = label.style.backgroundColor;
                            label.style.backgroundColor = '#fee2e2'; // red-100
                            setTimeout(() => {
                                label.style.backgroundColor = originalBg;
                            }, 300);
                        }
                        return; // Don't save if limit exceeded
                    }

                    // Update disabled state for all checkboxes
                    allCheckboxes.forEach(checkbox => {
                        const isChecked = checkbox.checked;
                        const shouldDisable = !isChecked && currentAnswers.length >= maxSelections;

                        checkbox.disabled = shouldDisable;

                        // Update label styling
                        const label = checkbox.closest('label');
                        if (label) {
                            if (shouldDisable) {
                                label.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-100', 'border-slate-200');
                                label.classList.remove('hover:bg-slate-50', 'bg-white');
                            } else if (!isChecked) {
                                label.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-100');
                                label.classList.add('bg-white', 'hover:bg-slate-50', 'border-slate-200');
                            }
                        }
                    });

                    // Sort and join WITHOUT comma (backend expects "ACE" not "A,C,E")
                    const newAnswer = currentAnswers.sort().join('');
                    onAnswer(questionId, newAnswer, immediate);
                }
            }

            // Matching dropdowns (immediate save)
            if (e.target.matches('select[data-question-id]')) {
                const questionId = parseInt(e.target.dataset.questionId);
                const answer = e.target.value;
                const immediate = true; // Dropdowns save immediately
                onAnswer(questionId, answer, immediate);
            }
        });
    },

    /**
     * Scroll to a specific question
     */
    scrollToQuestion(questionId) {
        const input = document.querySelector(`[data-question-id="${questionId}"]`);
        if (input) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Focus input if it's a text input or select
            if (input.tagName === 'INPUT' && input.type === 'text') {
                setTimeout(() => input.focus(), 300);
            } else if (input.tagName === 'SELECT') {
                setTimeout(() => input.focus(), 300);
            }
        }
    }
};
