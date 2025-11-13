/**
 * Reading Section Component
 */

window.vueApp.component('reading-section', {
    template: `
        <div id="reading-section-container" class="flex h-full flex-col">
            <!-- Resizable Splitter Container -->
            <resizable-splitter class="flex-1" :initial-left-width="50" :min-left-width="30" :max-left-width="70">
                <!-- Left Panel: Passage -->
                <template #left>
                    <div class="h-full overflow-y-auto custom-scrollbar border-r border-slate-200 bg-white p-6">
                        <!-- Only show active passage -->
                        <div v-for="passage in data.passages" :key="passage.id" v-show="passage.passage_number === activePassage">
                            <div class="mb-12">
                                <div class="mb-6">
                                    <div class="font-semibold text-indigo-600 mb-2" style="font-size: inherit;">
                                        Passage {{ passage.passage_number }}
                                    </div>
                                    <h2 v-if="passage.title" class="text-2xl font-bold text-slate-900 mb-3">
                                        {{ passage.title }}
                                    </h2>
                                    <p v-if="passage.summary" class="text-slate-600 italic mb-4" style="font-size: inherit;">
                                        {{ passage.summary }}
                                    </p>
                                </div>
                                
                                <div 
                                    class="prose prose-slate max-w-none text-slate-700 leading-relaxed"
                                    :class="fontSize"
                                    v-html="formatPassageContent(passage.content)"
                                ></div>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- Right Panel: Questions -->
                <template #right>
                    <div class="h-full overflow-y-auto custom-scrollbar bg-slate-50 p-6 pb-20">
                        <!-- Only show active passage questions -->
                        <div v-for="passage in data.passages" :key="passage.id" v-show="passage.passage_number === activePassage">
                            <div class="space-y-6">
                                <!-- Question Groups -->
                                <div
                                    v-for="group in passage.test_heads"
                                    :key="group.id"
                                    class="rounded-lg border border-slate-200 bg-white p-6"
                                    :class="fontSize"
                                >
                                    <!-- Instruction header -->
                                    <div v-html="renderInstruction(group)"></div>

                                    <!-- Matching Options (if applicable) -->
                                    <div v-if="group.matching_options && group.matching_options.length > 0" class="mb-4 rounded-lg bg-slate-50 p-4">
                                        <div class="font-semibold text-slate-600 mb-2" style="font-size: inherit;">Available Options:</div>
                                        <div class="grid grid-cols-1 gap-2" style="font-size: inherit;">
                                            <div v-for="opt in group.matching_options" :key="opt.key || opt.value" class="flex gap-2" style="font-size: inherit;">
                                                <span class="font-semibold text-indigo-600">{{ opt.key || opt.value }}.</span>
                                                <span class="text-slate-700">{{ opt.text || opt.label }}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Questions rendered by QuestionRenderer -->
                                    <div v-html="renderQuestionGroup(group)"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </resizable-splitter>
            
            <!-- Question Palette - Fixed Bottom -->
            <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
                <div class="px-4 py-3 max-w-7xl mx-auto">
                    <!-- Single Line Layout -->
                    <div class="flex items-center gap-4 overflow-x-auto">
                        <!-- Passage Buttons with Separators -->
                        <template v-for="(passage, index) in data.passages" :key="passage.id">
                            <!-- Passage Button -->
                            <button
                                @click="activePassage = passage.passage_number"
                                :class="[
                                    'px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0',
                                    activePassage === passage.passage_number
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                ]"
                            >
                                Passage {{ passage.passage_number }}
                                <template v-if="activePassage !== passage.passage_number">
                                    <span class="ml-2 text-xs opacity-75">
                                        {{ getPassageAnsweredCount(passage.passage_number) }}/{{ getPassageTotalQuestions(passage.passage_number) }}
                                    </span>
                                </template>
                            </button>
                            
                            <!-- Separator (except after last passage) -->
                            <span v-if="index < data.passages.length - 1" class="text-slate-300 flex-shrink-0">|</span>
                        </template>
                        
                        <!-- Arrow Separator -->
                        <span class="text-slate-400 text-lg flex-shrink-0 mx-2">→</span>
                        
                        <!-- Active Passage Questions -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <template v-for="passage in data.passages" :key="passage.id">
                                <template v-if="passage.passage_number === activePassage">
                                    <template v-for="group in passage.test_heads" :key="group.id">
                                                                                <button
                                            v-for="question in group.questions"
                                            :key="question.id"
                                            @click="scrollToQuestion(question.id)"
                                            :class="[
                                                'w-10 h-10 flex-shrink-0 rounded-lg text-sm font-semibold transition-all border-2',
                                                focusedQuestionId === question.id
                                                    ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-300'
                                                    : userAnswers[question.id] && userAnswers[question.id].toString().trim() !== ''
                                                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                            ]"
                                            :title="'Question ' + question.order + (userAnswers[question.id] ? ' - Answered' : ' - Not answered')"
                                        >
                                            {{ question.order }}
                                        </button>
                                    </template>
                                </template>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    props: {
        data: {
            type: Object,
            required: true
        },
        userAnswers: {
            type: Object,
            required: true
        },
        fontSize: {
            type: String,
            default: 'text-base'
        }
    },

    emits: ['submit-answer'],

    setup(props, { emit }) {
        const activePassage = ref(1);
        const focusedQuestionId = ref(null); // Track currently focused question

        // Computed property to get answered count per passage
        const getPassageAnsweredCount = computed(() => (passageNumber) => {
            if (!props.data?.passages) return 0;
            const passage = props.data.passages.find(p => p.passage_number === passageNumber);
            if (!passage) return 0;

            let count = 0;
            passage.test_heads.forEach(group => {
                group.questions.forEach(question => {
                    if (props.userAnswers[question.id] &&
                        props.userAnswers[question.id].toString().trim() !== '') {
                        count++;
                    }
                });
            });
            return count;
        });

        // Computed property to get total questions per passage
        const getPassageTotalQuestions = computed(() => (passageNumber) => {
            if (!props.data?.passages) return 0;
            const passage = props.data.passages.find(p => p.passage_number === passageNumber);
            if (!passage) return 0;

            let total = 0;
            passage.test_heads.forEach(group => {
                total += group.questions.length;
            });
            return total;
        });

        function formatPassageContent(content) {
            // Add paragraph breaks and formatting
            return content.replace(/\n\n/g, '</p><p class="mb-4">').replace(/\n/g, '<br>');
        }

        // Render instruction using QuestionRenderer
        function renderInstruction(group) {
            if (!window.QuestionRenderer) {
                console.error('QuestionRenderer not loaded');
                return '';
            }
            return window.QuestionRenderer.renderInstruction(group);
        }

        function handleAnswer(questionId, answer, immediate = false) {
            emit('submit-answer', questionId, answer, immediate);
        }

        function handleMultipleAnswer(questionId, optionKey, checked, immediate = false) {
            let currentAnswer = props.userAnswers[questionId] || '';
            let answerArray = currentAnswer ? currentAnswer.split('') : [];

            if (checked) {
                if (!answerArray.includes(optionKey)) {
                    answerArray.push(optionKey);
                }
            } else {
                answerArray = answerArray.filter(k => k !== optionKey);
            }

            const newAnswer = answerArray.sort().join('');
            emit('submit-answer', questionId, newAnswer, immediate);
        }

        function scrollToQuestion(questionId) {
            if (window.QuestionRenderer) {
                window.QuestionRenderer.scrollToQuestion(questionId);
            } else {
                // Fallback
                const questionEl = document.querySelector(`[data-question-id="${questionId}"]`);
                if (questionEl) {
                    questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    questionEl.focus();
                }
            }
        }

        // Cache for rendered questions to prevent focus loss
        const renderedQuestionsCache = ref({});
        const renderedGroupsCache = ref({}); // Cache entire groups to prevent re-render

        /**
         * Render question group using QuestionRenderer
         * Delegates all question type rendering to the centralized renderer
         * Uses caching to prevent re-rendering when userAnswers changes
         */
        function renderQuestionGroup(group) {
            if (!window.QuestionRenderer) {
                console.error('QuestionRenderer not loaded!');
                return '<div class="text-red-600">Error: QuestionRenderer not available</div>';
            }

            // Cache check: if group is already rendered and inputs exist, return cached HTML
            if (renderedGroupsCache.value[group.id]) {
                // Check if at least one input from this group still exists in DOM
                const firstQuestion = group.questions[0];
                if (firstQuestion) {
                    const input = document.querySelector(`input[data-question-id="${firstQuestion.id}"]`);
                    if (input) {
                        // DOM elements still exist, return cached HTML to prevent re-render
                        return renderedGroupsCache.value[group.id];
                    }
                }
            }

            // Render and cache
            const html = window.QuestionRenderer.render(
                group,
                props.userAnswers,
                renderedQuestionsCache.value,
                props.fontSize
            );

            renderedGroupsCache.value[group.id] = html;
            return html;
        }

        // Initialize input values after mount
        onMounted(() => {
            // Set initial values for text inputs from userAnswers
            Object.keys(props.userAnswers).forEach(questionId => {
                const input = document.querySelector(`input[data-question-id="${questionId}"]`);
                if (input && input.type === 'text') {
                    input.value = props.userAnswers[questionId];
                }
            });

            // Setup QuestionRenderer event listeners
            const container = document.querySelector('.bg-slate-50.p-6.pb-20');
            if (container && window.QuestionRenderer) {
                window.QuestionRenderer.setupEventListeners(
                    container,
                    (questionId, answer, immediate) => {
                        emit('submit-answer', questionId, answer, immediate);
                    },
                    (questionId) => {
                        focusedQuestionId.value = questionId;
                    }
                );
            }

            // Initialize text highlighter
            // Use the entire component as container, but delay to ensure DOM is ready
            nextTick(() => {
                setTimeout(() => {
                    const highlightContainer = document.querySelector('#reading-section-container') ||
                        document.querySelector('.reading-section') ||
                        document.body;

                    if (highlightContainer && window.TextHighlighter) {
                        const attemptId = window.attemptId || props.attemptId;
                        console.log('[ReadingSection] Initializing TextHighlighter with container:', highlightContainer);
                        window.TextHighlighter.init('reading', highlightContainer, attemptId);
                    } else {
                        console.warn('[ReadingSection] TextHighlighter not available or container not found');
                    }
                }, 200);
            });
        });

        // Cleanup highlighter
        onUnmounted(() => {
            if (window.TextHighlighter) {
                window.TextHighlighter.cleanup();
            }
        });

        return {
            activePassage,
            focusedQuestionId,
            fontSize: computed(() => props.fontSize),
            formatPassageContent,
            renderInstruction,
            handleAnswer,
            handleMultipleAnswer,
            scrollToQuestion,
            getPassageAnsweredCount,
            getPassageTotalQuestions,
            renderQuestionGroup
        };
    }
});
