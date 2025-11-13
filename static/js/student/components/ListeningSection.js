/**
 * Listening Section Component
 * Matches the IELTS official test interface design
 */

window.vueApp.component('listening-section', {
    template: `
        <div class="flex h-full flex-col bg-slate-50">
            <!-- Content -->
            <div class="flex-1 overflow-y-auto custom-scrollbar pb-20">
                <!-- Only show active part -->
                <div v-for="part in data.parts" :key="part.id" v-show="part.part_number === activePart">
                    <div class="p-4 sm:p-6 lg:p-8">
                        <div class="max-w-5xl mx-auto">
                      
                            <!-- Hidden Audio Element -->
                            <audio
                                v-if="part.audio_url"
                                :ref="el => audioRefs[part.part_number] = el"
                                :src="getAudioUrl(part.audio_url)"
                                @timeupdate="updateAudioTime(part.part_number, $event)"
                                @ended="audioFinished(part.part_number)"
                                @loadedmetadata="audioLoaded(part.part_number, $event)"
                                controlslist="nodownload noplaybackrate"
                                disablepictureinpicture
                                style="display: none;"
                            ></audio>

                            <!-- Question Groups -->
                            <div
                                v-for="group in part.test_heads"
                                :key="group.id"
                                class="mb-8"
                            >
                                <!-- Group Header with Instruction -->
                                <div v-html="renderInstruction(group)"></div>

                            
                                <!-- Question Body Container -->
                                <div class="bg-white rounded-lg border border-slate-200 p-6 sm:p-8" :class="fontSize">
                                    <!-- Use QuestionRenderer for all question types -->
                                    <div v-html="renderQuestionGroup(group)"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Question Palette - Fixed Bottom -->
            <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
                <div class="px-4 py-3 max-w-7xl mx-auto">
                    <!-- Single Line Layout -->
                    <div class="flex items-center gap-4 overflow-x-auto">
                        <!-- Part Buttons with Separators -->
                        <template v-for="(part, index) in data.parts" :key="part.id">
                            <!-- Part Button -->
                            <button
                                @click="activePart = part.part_number"
                                :class="[
                                    'px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0',
                                    activePart === part.part_number
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                ]"
                            >
                                Part {{ part.part_number }}
                                <template v-if="activePart !== part.part_number">
                                    <span class="ml-2 text-xs opacity-75">
                                        {{ getPartAnsweredCount(part.part_number) }}/{{ getPartTotalQuestions(part.part_number) }}
                                    </span>
                                </template>
                            </button>
                            
                            <!-- Separator (except after last part) -->
                            <span v-if="index < data.parts.length - 1" class="text-slate-300 flex-shrink-0">|</span>
                        </template>
                        
                        <!-- Arrow Separator -->
                        <span class="text-slate-400 text-lg flex-shrink-0 mx-2">→</span>
                        
                        <!-- Active Part Questions -->
                        <div class="flex items-center gap-2 flex-wrap">
                            <template v-for="part in data.parts" :key="part.id">
                                <template v-if="part.part_number === activePart">
                                    <template v-for="group in part.test_heads" :key="group.id">
                                        <button
                                            v-for="question in group.questions"
                                            :key="question.id"
                                            @click="scrollToQuestion(question.id)"
                                            :class="[
                                                'w-10 h-10 flex-shrink-0 rounded-lg text-sm font-semibold transition-all border-2',
                                                focusedQuestionId === question.id
                                                    ? 'bg-slate-200 border-indigo-300'
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
        const audioStates = ref({});
        const audioRefs = ref({});
        const activePart = ref(1);
        const playingPart = ref(1); // Track which part audio is playing (separate from active part)
        const renderedQuestionsCache = ref({}); // Cache to prevent re-rendering inputs
        const renderedGroupsCache = ref({}); // Cache entire groups to prevent re-render
        const focusedQuestionId = ref(null); // Track currently focused question

        // Cache key for localStorage
        const getCacheKey = () => {
            const attemptId = window.attemptId || 'default';
            return `listening-progress-${attemptId}`;
        };

        // Load cached progress from localStorage
        function loadCachedProgress() {
            try {
                const cacheKey = getCacheKey();
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const progress = JSON.parse(cached);
                    console.log('[LISTENING CACHE] Loaded cached progress:', progress);

                    // Restore active part
                    if (progress.activePart && progress.activePart >= 1 && progress.activePart <= 4) {
                        activePart.value = progress.activePart;
                        console.log(`[LISTENING CACHE] Restored active part: ${progress.activePart}`);
                    }

                    // Restore audio times for each part
                    if (progress.audioTimes) {
                        Object.entries(progress.audioTimes).forEach(([partNumber, time]) => {
                            const part = parseInt(partNumber);
                            if (audioStates.value[part]) {
                                // We'll set the actual audio currentTime after audio is loaded
                                audioStates.value[part].cachedTime = time;
                                console.log(`[LISTENING CACHE] Will restore Part ${part} to ${time.toFixed(1)}s`);
                            }
                        });
                    }

                    return progress;
                }
            } catch (error) {
                console.error('[LISTENING CACHE] Failed to load cached progress:', error);
            }
            return null;
        }

        // Save current progress to localStorage
        function saveCachedProgress() {
            try {
                const cacheKey = getCacheKey();
                const audioTimes = {};

                // Save current time for each part
                Object.entries(audioStates.value).forEach(([partNumber, state]) => {
                    if (state.currentTime > 0) {
                        audioTimes[partNumber] = state.currentTime;
                    }
                });

                const progress = {
                    activePart: activePart.value,
                    audioTimes,
                    timestamp: Date.now()
                };

                localStorage.setItem(cacheKey, JSON.stringify(progress));
                console.log('[LISTENING CACHE] Saved progress:', progress);
            } catch (error) {
                console.error('[LISTENING CACHE] Failed to save progress:', error);
            }
        }

        // Clear cached progress (call when section is completed)
        function clearCachedProgress() {
            try {
                const cacheKey = getCacheKey();
                localStorage.removeItem(cacheKey);
                console.log('[LISTENING CACHE] Cleared cached progress');
            } catch (error) {
                console.error('[LISTENING CACHE] Failed to clear cache:', error);
            }
        }

        // Get audio URL (use preloaded blob URL if available)
        function getAudioUrl(originalUrl) {
            // Check if parent app has preloaded audio URLs
            if (window.vueApp?._instance?.proxy?.audioPreloading) {
                const audioPreloading = window.vueApp._instance.proxy.audioPreloading;
                const preloaded = audioPreloading.preloadedAudios.find(
                    audio => audio.originalUrl === originalUrl
                );
                if (preloaded) {
                    return preloaded.blobUrl;
                }
            }
            // Fallback to original URL if not preloaded
            console.log('[LISTENING] Using original audio URL:', originalUrl);
            return originalUrl;
        }

        // Computed property to get answered count per part
        const getPartAnsweredCount = computed(() => (partNumber) => {
            if (!props.data?.parts) return 0;
            const part = props.data.parts.find(p => p.part_number === partNumber);
            if (!part) return 0;

            let count = 0;
            part.test_heads.forEach(group => {
                group.questions.forEach(question => {
                    if (props.userAnswers[question.id] &&
                        props.userAnswers[question.id].toString().trim() !== '') {
                        count++;
                    }
                });
            });
            return count;
        });

        // Computed property to get total questions per part
        const getPartTotalQuestions = computed(() => (partNumber) => {
            if (!props.data?.parts) return 0;
            const part = props.data.parts.find(p => p.part_number === partNumber);
            if (!part) return 0;

            let total = 0;
            part.test_heads.forEach(group => {
                total += group.questions.length;
            });
            return total;
        });

        onMounted(() => {
            // Initialize audio states
            if (props.data?.parts) {
                props.data.parts.forEach(part => {
                    audioStates.value[part.part_number] = {
                        currentTime: 0,
                        duration: 0,
                        isPlaying: false,
                        volume: 100,
                        cachedTime: 0 // Will be set if we have cached progress
                    };
                });

                // Load cached progress (must be done after initializing audioStates)
                const cachedProgress = loadCachedProgress();

                // Disable media session for audio elements
                setTimeout(() => {
                    Object.values(audioRefs.value).forEach(audio => {
                        if (audio) {
                            // Prevent context menu on audio element
                            audio.addEventListener('contextmenu', (e) => {
                                e.preventDefault();
                                console.log('[SECURITY] Context menu blocked on audio element');
                                return false;
                            });

                            // Remove any media session metadata
                            if ('mediaSession' in navigator) {
                                audio.addEventListener('play', () => {
                                    navigator.mediaSession.metadata = null;
                                });
                            }
                        }
                    });
                }, 100);

                // Expose audio control to parent app
                updateParentAudioState();

                // Auto-play Part 1 audio after a short delay
                // Or resume from cached progress
                setTimeout(() => {
                    if (audioRefs.value[1] && props.data.parts[0]?.audio_url) {
                        playAudio(1);
                    }
                }, 500);
            }

            // Setup event listeners for QuestionRenderer
            const container = document.querySelector('.flex.h-full.flex-col.bg-slate-50');
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

            // Re-initialize Feather icons after component renders
            setTimeout(() => {
                if (window.feather) {
                    feather.replace();
                }
            }, 100);
        });

        /**
         * Render instruction/description header for question group
         */
        function renderInstruction(group) {
            if (!window.QuestionRenderer) {
                return '';
            }
            return window.QuestionRenderer.renderInstruction(group);
        }

        /**
         * Render question group using QuestionRenderer
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

        /**
         * DEPRECATED: Old formatQuestionText - kept for compatibility
         * Now handled by QuestionRenderer.formatQuestionText
         */
        function formatQuestionText(question, group) {
            /**
             * Format question text with inline input fields.
             * Auto-saves with debouncing (800ms after typing stops).
             * Uses cache to prevent re-rendering existing inputs (prevents focus loss).
             */
            const questionId = question.id;

            // If this question was already rendered and the input exists in DOM, return cached HTML
            // This prevents Vue from re-creating the input and losing focus
            if (renderedQuestionsCache.value[questionId]) {
                const existingInput = document.getElementById(`q-${questionId}`);
                if (existingInput) {
                    // Input still exists in DOM, return cached HTML to prevent re-render
                    return renderedQuestionsCache.value[questionId];
                }
            }

            let text = question.question_text || '';
            const questionNumber = question.order;
            const currentAnswer = props.userAnswers[question.id] || '';

            // Check if this is a form completion type question with inline placeholders
            if (group.question_type === 'FC' || group.question_type === 'SC' || text.includes('{{')) {
                // Replace {{number}} placeholders with input fields
                text = text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
                    const inputId = `q-${question.id}`;
                    return `<input 
                        type="text" 
                        id="${inputId}"
                        data-question-id="${question.id}"
                        value="${currentAnswer}"
                        placeholder="Your answer"
                        class="inline-input mx-1 px-2 py-1 border-b-2 border-slate-300 focus:border-indigo-600 focus:outline-none bg-transparent text-slate-900 font-medium min-w-[120px] transition-colors"
                    />`;
                });
            } else {
                // For other question types, add input field after the question text
                const inputId = `q-${question.id}`;
                text = `
                    <div class="flex items-start gap-3 mb-2" data-question-id="${question.id}">
                        <span class="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0 mt-1">
                            ${questionNumber}
                        </span>
                        <div class="flex-1">
                            <p class="text-sm text-slate-700 mb-2">${text}</p>
                            <input 
                                type="text" 
                                id="${inputId}"
                                data-question-id="${question.id}"
                                value="${currentAnswer}"
                                placeholder="Type your answer (auto-saves)"
                                class="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:outline-none bg-white text-slate-900 font-medium transition-colors"
                            />
                        </div>
                    </div>
                `;
            }

            // Cache the rendered HTML for this question
            renderedQuestionsCache.value[questionId] = text;

            return text;
        }

        function handleAnswer(questionId, answer, immediate = false) {
            emit('submit-answer', questionId, answer, immediate);
        }

        function handleMultipleAnswer(questionId, optionKey, checked, immediate = false) {
            let currentAnswer = props.userAnswers[questionId] || '';
            let answers = currentAnswer.split(',').filter(a => a.trim() !== '');

            if (checked) {
                if (!answers.includes(optionKey)) {
                    answers.push(optionKey);
                }
            } else {
                answers = answers.filter(k => k !== optionKey);
            }

            const newAnswer = answers.sort().join(',');
            emit('submit-answer', questionId, newAnswer, immediate);
        }

        // ============================================================
        // AUDIO CONTROL FUNCTIONS
        // ============================================================

        function updateParentAudioState() {
            // Update parent app with current audio state and controls
            if (window.vueApp?._instance?.proxy?.setAudioState) {
                const currentState = audioStates.value[playingPart.value];
                window.vueApp._instance.proxy.setAudioState({
                    ...currentState,
                    togglePlayback: () => toggleAudio(playingPart.value),
                    seekAudio: (event) => seekAudioGlobal(event)
                });
            }
        }

        function seekAudioGlobal(event) {
            const audio = audioRefs.value[playingPart.value];
            if (audio && audioStates.value[playingPart.value]) {
                // Calculate percentage from click position
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newTime = percentage * audioStates.value[playingPart.value].duration;
                audio.currentTime = newTime;
            }
        }

        function playAudio(partNumber) {
            const audio = audioRefs.value[partNumber];
            if (audio) {
                audio.play().then(() => {
                    audioStates.value[partNumber].isPlaying = true;
                    playingPart.value = partNumber; // Update which part is playing
                    console.log(`[AUDIO] Playing Part ${partNumber}`);
                    updateParentAudioState();

                    // Re-initialize Feather icons after play button state changes
                    setTimeout(() => {
                        if (window.feather) {
                            feather.replace();
                        }
                    }, 50);
                }).catch(error => {
                    console.error(`[AUDIO] Failed to play Part ${partNumber}:`, error);
                });
            }
        }

        function pauseAudio(partNumber) {
            const audio = audioRefs.value[partNumber];
            if (audio) {
                audio.pause();
                audioStates.value[partNumber].isPlaying = false;
                console.log(`[AUDIO] Paused Part ${partNumber}`);
                updateParentAudioState();

                // Re-initialize Feather icons after pause button state changes
                setTimeout(() => {
                    if (window.feather) {
                        feather.replace();
                    }
                }, 50);
            }
        }

        function toggleAudio(partNumber) {
            if (audioStates.value[partNumber]?.isPlaying) {
                pauseAudio(partNumber);
            } else {
                playAudio(partNumber);
            }
        }

        function audioLoaded(partNumber, event) {
            if (audioStates.value[partNumber]) {
                audioStates.value[partNumber].duration = event.target.duration;

                // Restore cached audio time if available
                const cachedTime = audioStates.value[partNumber].cachedTime;
                if (cachedTime && cachedTime > 0 && cachedTime < event.target.duration) {
                    const audio = audioRefs.value[partNumber];
                    if (audio) {
                        audio.currentTime = cachedTime;
                        audioStates.value[partNumber].currentTime = cachedTime;
                        console.log(`[LISTENING CACHE] Restored Part ${partNumber} audio to ${cachedTime.toFixed(1)}s`);
                    }
                }

                if (partNumber === playingPart.value) {
                    updateParentAudioState();
                }
            }
        }

        function seekAudio(partNumber, event) {
            const audio = audioRefs.value[partNumber];
            if (audio && audioStates.value[partNumber]) {
                const rect = event.currentTarget.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const percentage = clickX / rect.width;
                const newTime = percentage * audioStates.value[partNumber].duration;
                audio.currentTime = newTime;
            }
        }

        function setVolume(partNumber, event) {
            const audio = audioRefs.value[partNumber];
            const volume = parseInt(event.target.value);
            if (audio) {
                audio.volume = volume / 100;
                audioStates.value[partNumber].volume = volume;
            }
        }

        function formatTime(seconds) {
            if (isNaN(seconds) || seconds === 0) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${String(secs).padStart(2, '0')}`;
        }

        function updateAudioTime(partNumber, event) {
            if (audioStates.value[partNumber]) {
                audioStates.value[partNumber].currentTime = event.target.currentTime;
                if (partNumber === playingPart.value) {
                    updateParentAudioState();
                }

                // Save progress every 2 seconds to avoid excessive localStorage writes
                const currentTime = event.target.currentTime;
                if (Math.floor(currentTime) % 2 === 0) {
                    saveCachedProgress();
                }
            }
        }

        function audioFinished(partNumber) {
            if (audioStates.value[partNumber]) {
                audioStates.value[partNumber].isPlaying = false;
                console.log(`[AUDIO] Part ${partNumber} finished`);

                // Auto-play next part in sequence
                const nextPartNumber = partNumber + 1;
                if (nextPartNumber <= 4 && props.data?.parts?.find(p => p.part_number === nextPartNumber)?.audio_url) {
                    console.log(`[AUDIO] Auto-playing Part ${nextPartNumber}`);
                    setTimeout(() => {
                        playAudio(nextPartNumber);
                    }, 500); // Small delay between parts
                } else {
                    console.log('[AUDIO] All parts finished');
                    updateParentAudioState();
                }
            }
        }

        function scrollToQuestion(questionId) {
            // Use QuestionRenderer's scroll function
            if (window.QuestionRenderer) {
                window.QuestionRenderer.scrollToQuestion(questionId);
            } else {
                // Fallback
                const input = document.querySelector(`[data-question-id="${questionId}"]`);
                if (input) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    input.focus();
                }
            }
        }

        // Handle input events for dynamically created inputs (DEPRECATED - now handled by QuestionRenderer)
        // Kept for backward compatibility
        onMounted(() => {
            // Real-time auto-save on input (debounced in parent - 800ms)
            document.addEventListener('input', (e) => {
                if (e.target.matches('input[data-question-id]')) {
                    const questionId = parseInt(e.target.dataset.questionId);
                    const answer = e.target.value;

                    // Submit WITHOUT immediate flag for debouncing (800ms delay)
                    handleAnswer(questionId, answer, false);

                    // Subtle visual feedback during typing
                    e.target.classList.add('border-indigo-400');
                    setTimeout(() => {
                        e.target.classList.remove('border-indigo-400');
                    }, 200);
                }
            });
        });

        // Watch for active part changes - but DON'T change audio playback
        // Audio plays continuously through all parts in sequence
        watch(activePart, (newPart, oldPart) => {
            console.log(`[UI] User switched from Part ${oldPart} to Part ${newPart}`);
            console.log(`[AUDIO] Still playing Part ${playingPart.value}`);
            // Audio continues playing regardless of which part user is viewing

            // Save progress when user switches parts
            saveCachedProgress();
        });

        // Initialize text highlighter
        onMounted(() => {
            const container = document.querySelector('.bg-slate-50');
            if (container && window.TextHighlighter) {
                const attemptId = window.attemptId || props.attemptId;
                window.TextHighlighter.init('listening', container, attemptId);
            }
        });

        // Cleanup highlighter
        onUnmounted(() => {
            // Save progress one final time before unmounting
            saveCachedProgress();

            if (window.TextHighlighter) {
                window.TextHighlighter.cleanup();
            }

            // Clear audio state from parent when component unmounts
            if (window.vueApp?._instance?.proxy?.setAudioState) {
                window.vueApp._instance.proxy.setAudioState(null);
            }
        });

        return {
            activePart,
            audioStates,
            audioRefs,
            focusedQuestionId,
            fontSize: computed(() => props.fontSize),
            getAudioUrl,
            renderInstruction,
            renderQuestionGroup,
            formatQuestionText,
            handleAnswer,
            handleMultipleAnswer,
            playAudio,
            pauseAudio,
            toggleAudio,
            audioLoaded,
            seekAudio,
            setVolume,
            formatTime,
            updateAudioTime,
            audioFinished,
            scrollToQuestion,
            getPartAnsweredCount,
            getPartTotalQuestions,
            clearCachedProgress // Expose for parent to call when section completed
        };
    }
});
