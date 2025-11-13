/**
 * Main Vue.js Application for IELTS Mock Test SPA
 * Using Vue 3 Composition API with CDN
 */

const { createApp, ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

// Create app instance first (will be used by components)
window.vueApp = createApp({
    setup() {
        // ============================================================
        // STATE
        // ============================================================

        const attemptId = ref(window.attemptId || '');
        const currentSection = ref((window.initialSection || 'listening').toLowerCase());
        const sectionData = ref(null);
        const userAnswers = ref({});
        const isLoading = ref(false);
        const error = ref(null);
        const showPermissionsPage = ref(true); // Show permissions page first
        const showInstructions = ref(false); // Show instructions before starting section (after permissions)
        const isFullscreen = ref(false); // Track fullscreen state
        const showFullscreenWarning = ref(false); // Show warning when fullscreen exits

        // Permissions state
        const permissions = ref({
            microphone: { granted: false, checked: false, error: null },
            camera: { granted: false, checked: false, error: null },
            fullscreen: { granted: false, checked: false, error: null }
        });
        const systemCheck = ref({
            browser: '',
            os: '',
            connection: 'checking'
        });

        // Audio preloading state
        const audioPreloading = ref({
            isPreloading: false,
            progress: 0,
            currentFile: '',
            totalFiles: 0,
            loadedFiles: 0,
            errors: [],
            preloadedAudios: [] // Store preloaded audio blobs
        });

        // Confirmation Dialog
        const showConfirmDialog = ref(false);
        const confirmDialogData = ref({
            title: '',
            message: '',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
            onConfirm: null,
            onCancel: null
        });

        // Font size control (7 levels with labels)
        const fontSizes = [
            { class: 'text-xs', label: 'Extra Small' },
            { class: 'text-sm', label: 'Small' },
            { class: 'text-base', label: 'Medium' },
            { class: 'text-lg', label: 'Large' },
            { class: 'text-xl', label: 'Extra Large' },
            { class: 'text-2xl', label: '2X Large' },
            { class: 'text-3xl', label: '3X Large' }
        ];
        const fontSizeIndex = ref(2); // Start with 'text-base' (Medium)
        const showFontSizeDropdown = ref(false);

        // Timer
        const timeRemaining = ref(0);
        const timerInterval = ref(null);

        // Audio State (for listening section)
        const audioState = ref(null);

        // Theme Management
        const isDarkTheme = ref(false);

        // ============================================================
        // COMPUTED PROPERTIES
        // ============================================================

        const formattedTime = computed(() => {
            const totalSeconds = timeRemaining.value;

            // Debug log
            if (totalSeconds === 0) {
                console.warn('[TIMER] Time remaining is 0!');
                return '0:00'; // Return a visible value instead of empty
            }

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (hours > 0) {
                return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        });

        const timeWarning = computed(() => {
            return timeRemaining.value > 0 && timeRemaining.value <= 300; // Last 5 minutes
        });

        const nextSectionLabel = computed(() => {
            // Use next_section_name from API response
            const nextSection = sectionData.value?.next_section_name;

            if (!nextSection) {
                return 'Finish Exam';
            }

            // Capitalize first letter
            const nextSectionName = nextSection.charAt(0).toUpperCase() + nextSection.slice(1);
            return `Move to ${nextSectionName}`;
        });

        const currentFontSize = computed(() => {
            return fontSizes[fontSizeIndex.value].class;
        });

        const currentFontSizeLabel = computed(() => {
            return fontSizes[fontSizeIndex.value].label;
        });

        const canDecreaseFontSize = computed(() => {
            return fontSizeIndex.value > 0;
        });

        const canIncreaseFontSize = computed(() => {
            return fontSizeIndex.value < fontSizes.length - 1;
        });

        const answeredCount = computed(() => {
            return Object.keys(userAnswers.value).length;
        });

        const totalQuestions = computed(() => {
            if (!sectionData.value) return 0;

            if (currentSection.value === 'listening' && sectionData.value.parts) {
                return sectionData.value.parts.reduce((total, part) => {
                    // API returns test_heads, not question_groups
                    if (!part.test_heads) return total;
                    return total + part.test_heads.reduce((sum, group) => {
                        return sum + (group.questions ? group.questions.length : 0);
                    }, 0);
                }, 0);
            }

            if (currentSection.value === 'reading' && sectionData.value.passages) {
                return sectionData.value.passages.reduce((total, passage) => {
                    // API returns test_heads, not question_groups
                    if (!passage.test_heads) return total;
                    return total + passage.test_heads.reduce((sum, group) => {
                        return sum + (group.questions ? group.questions.length : 0);
                    }, 0);
                }, 0);
            }

            return 0;
        });

        const getSectionInstructions = computed(() => {
            const instructions = {
                listening: {
                    title: 'IELTS Listening',
                    time: 'Approximately 30 minutes',
                    totalQuestions: 40,
                    parts: 4,
                    instructions: [
                        'Answer all the questions.',
                        'You can change your answers at any time during the test.'
                    ],
                    information: [
                        'There are 40 questions in this test.',
                        'Each question carries one mark.',
                        'There are four parts to the test.',
                        'Please note you will only hear each part once in your actual test.',
                        'For each part of the test there will be time for you to look through the questions and time for you to check your answers.'
                    ]
                },
                reading: {
                    title: 'IELTS Reading',
                    time: 'Approximately 60 minutes',
                    totalQuestions: 40,
                    parts: 3,
                    instructions: [
                        'Answer all the questions.',
                        'You can change your answers at any time during the test.'
                    ],
                    information: [
                        'There are 40 questions in this test.',
                        'Each question carries one mark.',
                        'There are three passages to read.',
                        'The passages increase in difficulty as you progress through the test.'
                    ]
                },
                writing: {
                    title: 'IELTS Writing',
                    time: 'Approximately 60 minutes',
                    totalQuestions: 2,
                    parts: 2,
                    instructions: [
                        'Complete both tasks.',
                        'You should spend about 20 minutes on Task 1 and 40 minutes on Task 2.'
                    ],
                    information: [
                        'There are 2 tasks in this test.',
                        'Task 1: Write at least 150 words.',
                        'Task 2: Write at least 250 words.',
                        'Task 2 contributes twice as much as Task 1 to the Writing score.'
                    ]
                },
                speaking: {
                    title: 'IELTS Speaking',
                    time: 'Approximately 11-14 minutes',
                    totalQuestions: 3,
                    parts: 3,
                    instructions: [
                        'Answer all the questions.',
                        'Speak clearly and naturally.'
                    ],
                    information: [
                        'There are 3 parts in this test.',
                        'Part 1: Introduction and interview (4-5 minutes).',
                        'Part 2: Individual long turn (3-4 minutes).',
                        'Part 3: Two-way discussion (4-5 minutes).'
                    ]
                }
            };
            return instructions[currentSection.value] || instructions.listening;
        });

        // ============================================================
        // API METHODS
        // ============================================================

        async function loadSectionData() {
            isLoading.value = true;
            error.value = null;
            showInstructions.value = true; // Show instructions when loading new section

            // Stop existing timer before loading new section
            stopTimer();

            console.log('=== APP.JS DEBUG: Loading Section Data ===');
            console.log('attemptUid:', attemptId.value);
            console.log('currentSection:', currentSection.value);

            try {
                const response = await axios.get(
                    `/exams/api/attempt/${attemptId.value}/section/${currentSection.value.toLowerCase()}/`
                );

                console.log('API Response:', response.data);

                // API returns data directly, not wrapped in success/data structure
                sectionData.value = response.data;

                console.log('sectionData set to:', sectionData.value);
                console.log('Has parts?', !!sectionData.value?.parts);
                console.log('Has passages?', !!sectionData.value?.passages);
                console.log('Has tasks?', !!sectionData.value?.tasks);
                console.log('Has topics?', !!sectionData.value?.topics);

                // Initialize timer from API response
                const duration = sectionData.value.time_remaining;
                console.log('Timer duration from API (time_remaining):', duration);

                if (duration !== undefined && duration !== null) {
                    timeRemaining.value = duration;
                    console.log('Timer initialized to:', duration, 'seconds');
                } else {
                    // Fallback: use default durations based on section
                    const defaultDurations = {
                        'listening': 40 * 60,  // 40 minutes
                        'reading': 60 * 60,    // 60 minutes
                        'writing': 60 * 60,    // 60 minutes
                        'speaking': 15 * 60    // 15 minutes
                    };
                    timeRemaining.value = defaultDurations[currentSection.value] || 60 * 60;
                    console.warn('No duration from API, using fallback:', timeRemaining.value, 'seconds');
                }

                // Ensure Feather icons are replaced after DOM update
                nextTick(() => {
                    if (window.feather) {
                        feather.replace();
                    }
                });

                // Load existing answers
                loadExistingAnswers();

            } catch (err) {
                console.error('Failed to load section:', err);
                error.value = err.response?.data?.error || 'Failed to load section data';
            } finally {
                isLoading.value = false;
                console.log('=== END APP.JS DEBUG ===');
            }
        }

        function loadExistingAnswers() {
            userAnswers.value = {};

            if (currentSection.value === 'listening' && sectionData.value.parts) {
                sectionData.value.parts.forEach(part => {
                    // API returns test_heads, not question_groups
                    if (part.test_heads) {
                        part.test_heads.forEach(group => {
                            if (group.questions) {
                                group.questions.forEach(question => {
                                    if (question.user_answer) {
                                        userAnswers.value[question.id] = question.user_answer;
                                    }
                                });
                            }
                        });
                    }
                });
            }

            if (currentSection.value === 'reading' && sectionData.value.passages) {
                sectionData.value.passages.forEach(passage => {
                    // API returns test_heads, not question_groups
                    if (passage.test_heads) {
                        passage.test_heads.forEach(group => {
                            if (group.questions) {
                                group.questions.forEach(question => {
                                    if (question.user_answer) {
                                        userAnswers.value[question.id] = question.user_answer;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }

        // Start section - hide instructions, start timer, and request fullscreen
        function startSection() {
            showInstructions.value = false;
            startTimer();
            // Request fullscreen
            requestFullscreen();

            // Ensure Feather icons are replaced after DOM update
            nextTick(() => {
                if (window.feather) {
                    feather.replace();
                }
            });
        }

        // Debounce timers for each question
        const debounceTimers = ref({});

        async function submitAnswer(questionId, answer, immediate = false) {
            // Clear existing timer for this question
            if (debounceTimers.value[questionId]) {
                clearTimeout(debounceTimers.value[questionId]);
            }

            // If immediate, submit right away (for MCQ, True/False, Dropdown)
            if (immediate) {
                // Optimistic update for immediate answers (MCQ, radio, checkbox)
                userAnswers.value[questionId] = answer;
                await saveAnswerToAPI(questionId, answer);
                return;
            }

            // For text inputs: debounced save
            debounceTimers.value[questionId] = setTimeout(async () => {
                const success = await saveAnswerToAPI(questionId, answer);
                if (success) {
                    // Update userAnswers for question palette, but this won't re-render
                    // the v-html because we use rendering cache in QuestionRenderer
                    userAnswers.value[questionId] = answer;
                }
            }, 800);
        }

        async function saveAnswerToAPI(questionId, answer) {
            try {
                await axios.post(
                    `/exams/api/attempt/${attemptId.value}/submit-answer/`,
                    {
                        question_id: questionId,
                        answer: answer
                    }
                );
                console.log(`✓ Answer saved for question ${questionId}:`, answer);
                return true;
            } catch (err) {
                console.error('✗ Failed to submit answer:', err);
                // Could show toast notification here
                return false;
            }
        }

        async function submitWriting(taskId, taskType, answerText) {
            try {
                const response = await axios.post(
                    `/exams/api/attempt/${attemptId.value}/submit-writing/`,
                    {
                        task_id: taskId,
                        task_type: taskType,
                        answer_text: answerText
                    }
                );

                return response.data;
            } catch (err) {
                console.error('Failed to submit writing:', err);
                throw err;
            }
        }

        async function submitSpeaking(questionKey, audioBlob) {
            try {
                const formData = new FormData();
                formData.append('question_key', questionKey);
                formData.append('audio_file', audioBlob, `${questionKey}.webm`);

                const response = await axios.post(
                    `/exams/api/attempt/${attemptId.value}/submit-speaking/`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                return response.data;
            } catch (err) {
                console.error('Failed to submit speaking:', err);
                throw err;
            }
        }

        async function handleNextSection(skipConfirmation = false) {
            if (isLoading.value) return;

            // Check if there's a next section from the API response
            const nextSection = sectionData.value?.next_section_name;

            // If no next section, this is the last section - submit test
            if (!nextSection) {
                if (!skipConfirmation) {
                    const confirmed = await showConfirm({
                        title: 'Finish Test',
                        message: 'Are you sure you want to finish the test? Speaking section will be conducted offline.',
                        confirmText: 'Finish Test',
                        confirmClass: 'bg-emerald-600 hover:bg-emerald-700'
                    });
                    if (!confirmed) return;
                }
                await submitTest();
                return;
            }

            // Move to next section
            if (!skipConfirmation) {
                const confirmed = await showConfirm({
                    title: 'Move to Next Section',
                    message: 'Are you sure you want to move to the next section? You cannot return to this section.',
                    confirmText: 'Move to Next',
                    confirmClass: 'bg-indigo-600 hover:bg-indigo-700'
                });
                if (!confirmed) return;
            }

            try {
                isLoading.value = true;

                // Clear listening cache if leaving listening section
                if (currentSection.value === 'listening') {
                    try {
                        const cacheKey = `listening-progress-${attemptId.value}`;
                        localStorage.removeItem(cacheKey);
                        console.log('[LISTENING CACHE] Cleared cache when moving to next section');
                    } catch (error) {
                        console.error('[LISTENING CACHE] Failed to clear cache:', error);
                    }
                }

                const response = await axios.post(
                    `/exams/api/attempt/${attemptId.value}/next-section/`
                );

                // API returns current_section (the new section we moved to)
                if (response.data.success && response.data.current_section) {
                    stopTimer();

                    // Check if completed
                    if (response.data.current_section === 'COMPLETED' || response.data.status === 'COMPLETED') {
                        // Test completed, redirect to results
                        await submitTest();
                    } else {
                        // Move to the new section
                        currentSection.value = response.data.current_section;
                        await loadSectionData();
                    }
                } else {
                    // Test completed
                    await submitTest();
                }
            } catch (err) {
                console.error('Failed to move to next section:', err);
                error.value = 'Failed to proceed to next section';
            } finally {
                isLoading.value = false;
            }
        }

        async function submitTest() {
            // Show loading state
            isLoading.value = true;
            error.value = null;

            try {
                // Clear all highlights for this attempt before submitting
                if (window.TextHighlighter) {
                    window.TextHighlighter.clearAttemptHighlights();
                }

                // Clear listening progress cache
                try {
                    const cacheKey = `listening-progress-${attemptId.value}`;
                    localStorage.removeItem(cacheKey);
                    console.log('[LISTENING CACHE] Cleared cache on test submission');
                } catch (error) {
                    console.error('[LISTENING CACHE] Failed to clear cache:', error);
                }

                // Submit test and calculate scores
                const response = await axios.post(
                    `/exams/api/attempt/${attemptId.value}/submit/`
                );

                if (response.data.success) {
                    // Show success message
                    console.log('Test submitted successfully!');

                    // Wait a moment for visual feedback
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Redirect to results page using correct URL pattern
                    window.location.href = `/exams/attempt/${attemptId.value}/results/`;
                } else {
                    throw new Error(response.data.message || 'Submission failed');
                }
            } catch (err) {
                console.error('Failed to submit test:', err);
                isLoading.value = false;

                // Show detailed error with retry option
                const errorMessage = err.response?.data?.error || err.message || 'Failed to submit test';
                const retry = await showConfirm({
                    title: 'Submission Failed',
                    message: `${errorMessage}\n\nWould you like to try again?`,
                    confirmText: 'Retry',
                    cancelText: 'Cancel',
                    confirmClass: 'bg-red-600 hover:bg-red-700'
                });

                if (retry) {
                    await submitTest(); // Retry
                }
            }
        }

        async function handleExit() {
            const confirmed = await showConfirm({
                title: 'Exit Test',
                message: 'Are you sure you want to exit? Your progress will be saved, but you should complete the test in one session.',
                confirmText: 'Exit',
                confirmClass: 'bg-red-600 hover:bg-red-700'
            });

            if (confirmed) {
                // Clear highlights for this attempt when exiting
                if (window.TextHighlighter) {
                    window.TextHighlighter.clearAttemptHighlights();
                }
                window.location.href = '/';
            }
        }

        // ============================================================
        // TIMER FUNCTIONS
        // ============================================================

        function startTimer() {
            stopTimer(); // Clear any existing timer

            timerInterval.value = setInterval(() => {
                if (timeRemaining.value > 0) {
                    timeRemaining.value--;
                } else {
                    stopTimer();
                    handleTimeUp();
                }
            }, 1000);
        }

        function stopTimer() {
            if (timerInterval.value) {
                clearInterval(timerInterval.value);
                timerInterval.value = null;
            }
        }

        function handleTimeUp() {
            // Automatically move to next section or finish test (no confirmation)
            handleNextSection(true);
        }

        // ============================================================
        // CONFIRMATION DIALOG FUNCTIONS
        // ============================================================

        function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'bg-indigo-600 hover:bg-indigo-700' }) {
            return new Promise((resolve) => {
                confirmDialogData.value = {
                    title,
                    message,
                    confirmText,
                    cancelText,
                    confirmClass,
                    onConfirm: () => {
                        showConfirmDialog.value = false;
                        resolve(true);
                    },
                    onCancel: () => {
                        showConfirmDialog.value = false;
                        resolve(false);
                    }
                };
                showConfirmDialog.value = true;
            });
        }

        // ============================================================
        // FONT SIZE FUNCTIONS
        // ============================================================

        function selectFontSize(index) {
            fontSizeIndex.value = index;
            showFontSizeDropdown.value = false;
        }

        function toggleFontSizeDropdown() {
            showFontSizeDropdown.value = !showFontSizeDropdown.value;
        }

        function increaseFontSize() {
            if (fontSizeIndex.value < fontSizes.length - 1) {
                fontSizeIndex.value++;
            }
        }

        function decreaseFontSize() {
            if (fontSizeIndex.value > 0) {
                fontSizeIndex.value--;
            }
        }

        function resetFontSize() {
            fontSizeIndex.value = 2; // Reset to 'text-base' (Medium)
        }

        // ============================================================
        // FULLSCREEN FUNCTIONS
        // ============================================================

        function requestFullscreen() {
            const elem = document.documentElement;

            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err);
                });
            } else if (elem.webkitRequestFullscreen) { // Safari
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { // IE11
                elem.msRequestFullscreen();
            }
        }

        function checkFullscreenState() {
            const isCurrentlyFullscreen = !!(document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement);

            isFullscreen.value = isCurrentlyFullscreen;

            // Show warning if user exits fullscreen during test
            if (!isCurrentlyFullscreen && !showInstructions.value) {
                showFullscreenWarning.value = true;
            }
        }

        function dismissFullscreenWarning() {
            showFullscreenWarning.value = false;
        }

        function enterFullscreenFromWarning() {
            showFullscreenWarning.value = false;
            requestFullscreen();
        }

        // ============================================================
        // AUDIO CONTROL FUNCTIONS (for listening section)
        // ============================================================

        function setAudioState(state) {
            audioState.value = state;
        }

        function toggleAudioPlayback() {
            if (audioState.value && audioState.value.togglePlayback) {
                audioState.value.togglePlayback();
            }
        }

        function seekAudioFromHeader(event) {
            if (audioState.value && audioState.value.seekAudio) {
                audioState.value.seekAudio(event);
            }
        }

        function formatAudioTime(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${String(secs).padStart(2, '0')}`;
        }

        // ============================================================
        // HIGHLIGHT CONTROL FUNCTIONS
        // ============================================================

        async function clearHighlights() {
            const confirmed = await showConfirm({
                title: 'Clear All Highlights',
                message: 'Are you sure you want to clear all highlights in this section? This action cannot be undone.',
                confirmText: 'Clear',
                cancelText: 'Cancel',
                confirmClass: 'bg-red-600 hover:bg-red-700'
            });

            if (confirmed && window.TextHighlighter) {
                window.TextHighlighter.clearSectionHighlights();
            }
        }

        // ============================================================
        // PAGE RELOAD RESTRICTION
        // ============================================================

        function handleBeforeUnload(event) {
            // Clear highlights when page is about to unload
            if (window.TextHighlighter) {
                window.TextHighlighter.clearAttemptHighlights();
            }

            // Show warning when user tries to reload or close the page during test
            if (!showInstructions.value) {
                event.preventDefault();
                event.returnValue = 'Are you sure you want to leave? Your test progress will be saved, but you should complete the test in one session.';
                return event.returnValue;
            }
        }

        function handleMediaKeys(event) {
            // Block system-level media control keys during exam
            // This prevents users from controlling audio via keyboard media keys or system controls
            if (event.key === 'MediaPlayPause' ||
                event.key === 'MediaPlay' ||
                event.key === 'MediaPause' ||
                event.key === 'MediaStop' ||
                event.key === 'MediaTrackNext' ||
                event.key === 'MediaTrackPrevious' ||
                event.key === 'MediaRewind' ||
                event.key === 'MediaFastForward') {
                event.preventDefault();
                event.stopPropagation();
                console.log('[SECURITY] Media control key blocked:', event.key);
                return false;
            }
        }

        function handleClickOutside(event) {
            // Close font size dropdown when clicking outside
            if (showFontSizeDropdown.value) {
                // Find the font size dropdown button and menu
                const clickedElement = event.target;
                const dropdownButton = clickedElement.closest('button');
                const dropdownMenu = clickedElement.closest('.absolute');

                // Check if we clicked on the font size button or its children
                const isFontSizeButton = dropdownButton && (
                    dropdownButton.title === 'Change font size' ||
                    dropdownButton.querySelector('[data-feather="type"]') ||
                    clickedElement.closest('button[title="Change font size"]')
                );

                // If clicked outside both the button and the dropdown menu, close it
                if (!isFontSizeButton && !dropdownMenu) {
                    showFontSizeDropdown.value = false;
                }
            }
        }

        // ============================================================
        // MEDIA SESSION BLOCKING
        // ============================================================

        function disableMediaSession() {
            // Disable Media Session API to prevent system media controls
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
                navigator.mediaSession.setActionHandler('play', () => {
                    console.log('[SECURITY] Media Session play blocked');
                });
                navigator.mediaSession.setActionHandler('pause', () => {
                    console.log('[SECURITY] Media Session pause blocked');
                });
                navigator.mediaSession.setActionHandler('seekbackward', () => {
                    console.log('[SECURITY] Media Session seekbackward blocked');
                });
                navigator.mediaSession.setActionHandler('seekforward', () => {
                    console.log('[SECURITY] Media Session seekforward blocked');
                });
                navigator.mediaSession.setActionHandler('previoustrack', () => {
                    console.log('[SECURITY] Media Session previoustrack blocked');
                });
                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    console.log('[SECURITY] Media Session nexttrack blocked');
                });
                console.log('[SECURITY] Media Session API disabled for exam');
            }
        }

        // ============================================================
        // PERMISSIONS & SYSTEM CHECK FUNCTIONS
        // ============================================================

        async function checkMicrophonePermission() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                permissions.value.microphone.granted = true;
                permissions.value.microphone.checked = true;
                permissions.value.microphone.error = null;
                console.log('[PERMISSIONS] Microphone access granted');
            } catch (err) {
                permissions.value.microphone.granted = false;
                permissions.value.microphone.checked = true;
                permissions.value.microphone.error = err.message;
                console.error('[PERMISSIONS] Microphone access denied:', err);
            }
        }

        async function checkCameraPermission() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                permissions.value.camera.granted = true;
                permissions.value.camera.checked = true;
                permissions.value.camera.error = null;
                console.log('[PERMISSIONS] Camera access granted');
            } catch (err) {
                permissions.value.camera.granted = false;
                permissions.value.camera.checked = true;
                permissions.value.camera.error = err.message;
                console.error('[PERMISSIONS] Camera access denied:', err);
            }
        }

        async function checkAllPermissions() {
            // Check microphone (required for speaking section)
            await checkMicrophonePermission();

            // Check camera (optional - for proctoring if enabled)
            // await checkCameraPermission();

            // Check fullscreen capability
            permissions.value.fullscreen.granted =
                document.fullscreenEnabled ||
                document.webkitFullscreenEnabled ||
                document.msFullscreenEnabled;
            permissions.value.fullscreen.checked = true;
        }

        function detectBrowser() {
            const userAgent = navigator.userAgent;
            let browser = 'Unknown';

            if (userAgent.indexOf('Firefox') > -1) {
                browser = 'Mozilla Firefox';
            } else if (userAgent.indexOf('Chrome') > -1) {
                browser = 'Google Chrome';
            } else if (userAgent.indexOf('Safari') > -1) {
                browser = 'Apple Safari';
            } else if (userAgent.indexOf('Edge') > -1) {
                browser = 'Microsoft Edge';
            }

            systemCheck.value.browser = browser;
        }

        function detectOS() {
            const userAgent = navigator.userAgent;
            let os = 'Unknown';

            if (userAgent.indexOf('Win') > -1) os = 'Windows';
            else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
            else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
            else if (userAgent.indexOf('Android') > -1) os = 'Android';
            else if (userAgent.indexOf('iOS') > -1) os = 'iOS';

            systemCheck.value.os = os;
        }

        async function checkInternetConnection() {
            systemCheck.value.connection = 'checking';
            try {
                const response = await fetch('/exams/api/ping/', { method: 'HEAD' });
                systemCheck.value.connection = response.ok ? 'good' : 'poor';
            } catch (err) {
                systemCheck.value.connection = 'offline';
            }
        }

        async function performSystemCheck() {
            detectBrowser();
            detectOS();
            await checkInternetConnection();
            await checkAllPermissions();

            // Preload listening audio files
            await preloadListeningAudio();
        }

        async function preloadListeningAudio() {
            console.log('[AUDIO PRELOAD] Starting audio preload...');
            audioPreloading.value.isPreloading = true;
            audioPreloading.value.progress = 0;
            audioPreloading.value.errors = [];

            try {
                // Fetch listening section data to get audio URLs
                const response = await axios.get(
                    `/exams/api/attempt/${attemptId.value}/section/listening/`
                );

                const listeningData = response.data;
                const audioUrls = [];

                // Extract audio URLs from all parts
                if (listeningData.parts) {
                    listeningData.parts.forEach(part => {
                        if (part.audio_url) {
                            audioUrls.push({
                                url: part.audio_url,
                                partNumber: part.part_number
                            });
                        }
                    });
                }

                audioPreloading.value.totalFiles = audioUrls.length;
                console.log(`[AUDIO PRELOAD] Found ${audioUrls.length} audio files to preload`);

                if (audioUrls.length === 0) {
                    console.log('[AUDIO PRELOAD] No audio files to preload');
                    audioPreloading.value.isPreloading = false;
                    return;
                }

                // Preload each audio file
                for (let i = 0; i < audioUrls.length; i++) {
                    const { url, partNumber } = audioUrls[i];
                    audioPreloading.value.currentFile = `Part ${partNumber}`;

                    try {
                        console.log(`[AUDIO PRELOAD] Loading Part ${partNumber}: ${url}`);

                        // Fetch audio as blob
                        const audioResponse = await fetch(url);
                        if (!audioResponse.ok) {
                            throw new Error(`HTTP ${audioResponse.status}`);
                        }

                        const blob = await audioResponse.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        // Store preloaded audio
                        audioPreloading.value.preloadedAudios.push({
                            partNumber,
                            originalUrl: url,
                            blobUrl,
                            blob
                        });

                        audioPreloading.value.loadedFiles++;
                        audioPreloading.value.progress = Math.round((audioPreloading.value.loadedFiles / audioPreloading.value.totalFiles) * 100);

                        console.log(`[AUDIO PRELOAD] Part ${partNumber} loaded successfully (${audioPreloading.value.progress}%)`);

                    } catch (error) {
                        console.error(`[AUDIO PRELOAD] Failed to load Part ${partNumber}:`, error);
                        audioPreloading.value.errors.push({
                            partNumber,
                            error: error.message
                        });
                    }
                }

                console.log(`[AUDIO PRELOAD] Completed: ${audioPreloading.value.loadedFiles}/${audioPreloading.value.totalFiles} files loaded`);

                if (audioPreloading.value.errors.length > 0) {
                    console.warn('[AUDIO PRELOAD] Some files failed to load:', audioPreloading.value.errors);
                }

            } catch (error) {
                console.error('[AUDIO PRELOAD] Failed to fetch listening data:', error);
                audioPreloading.value.errors.push({
                    partNumber: 'all',
                    error: 'Failed to fetch listening section data'
                });
            } finally {
                audioPreloading.value.isPreloading = false;
            }
        }

        function getPreloadedAudioUrl(originalUrl) {
            // Return preloaded blob URL if available, otherwise return original URL
            const preloaded = audioPreloading.value.preloadedAudios.find(
                audio => audio.originalUrl === originalUrl
            );
            return preloaded ? preloaded.blobUrl : originalUrl;
        }

        function proceedToInstructions() {
            // Check if microphone permission is granted (required for speaking)
            if (!permissions.value.microphone.granted) {
                alert('Microphone access is required for the Speaking section. Please grant permission and try again.');
                return;
            }

            showPermissionsPage.value = false;
            showInstructions.value = true;

            // Initialize Feather icons after DOM update
            nextTick(() => {
                if (window.feather) {
                    feather.replace();
                }
            });
        }

        // ============================================================
        // LIFECYCLE
        // ============================================================

        onMounted(async () => {
            // Initialize theme first (before loading data)
            initTheme();

            // Perform system check and permissions check
            await performSystemCheck();

            // Load section data in background
            await loadSectionData();

            // Setup fullscreen change listeners
            document.addEventListener('fullscreenchange', checkFullscreenState);
            document.addEventListener('webkitfullscreenchange', checkFullscreenState);
            document.addEventListener('msfullscreenchange', checkFullscreenState);

            // Add page reload/close warning
            window.addEventListener('beforeunload', handleBeforeUnload);

            // Block media control keys during exam
            document.addEventListener('keydown', handleMediaKeys, true);

            // Disable Media Session API for system media controls
            disableMediaSession();

            // Close dropdown when clicking outside
            document.addEventListener('click', handleClickOutside);

            // Initialize Feather icons after Vue renders
            setTimeout(() => {
                if (window.feather) {
                    feather.replace();
                }
            }, 100);
        });

        onUnmounted(() => {
            stopTimer();

            // Clear all debounce timers
            Object.values(debounceTimers.value).forEach(timer => {
                if (timer) clearTimeout(timer);
            });

            // Revoke preloaded audio blob URLs to free memory
            if (audioPreloading.value.preloadedAudios.length > 0) {
                console.log('[AUDIO PRELOAD] Cleaning up blob URLs...');
                audioPreloading.value.preloadedAudios.forEach(audio => {
                    if (audio.blobUrl) {
                        URL.revokeObjectURL(audio.blobUrl);
                    }
                });
                audioPreloading.value.preloadedAudios = [];
            }

            // Remove fullscreen event listeners
            document.removeEventListener('fullscreenchange', checkFullscreenState);
            document.removeEventListener('webkitfullscreenchange', checkFullscreenState);
            document.removeEventListener('msfullscreenchange', checkFullscreenState);

            // Remove beforeunload listener
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // Remove media key blocking listener
            document.removeEventListener('keydown', handleMediaKeys, true);

            // Remove click outside listener
            document.removeEventListener('click', handleClickOutside);
        });

        // Watch for feather icon updates
        watch([isLoading, error, nextSectionLabel, showFontSizeDropdown], () => {
            setTimeout(() => {
                if (window.feather) {
                    feather.replace();
                }
            }, 100);
        });

        // Debug: Watch timer to see if it's updating
        watch(timeRemaining, (newVal, oldVal) => {
            if (newVal !== oldVal) {
                // Replace Feather icons when timer updates (for first render)
                setTimeout(() => {
                    if (window.feather) {
                        feather.replace();
                    }
                }, 10);
            }
        });

        // ============================================================
        // THEME FUNCTIONS
        // ============================================================

        function initTheme() {
            // Load theme preference from localStorage
            const savedTheme = localStorage.getItem('exam-theme');
            if (savedTheme === 'dark') {
                isDarkTheme.value = true;
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                isDarkTheme.value = false;
                document.documentElement.setAttribute('data-theme', 'light');
            }
        }

        function toggleTheme() {
            isDarkTheme.value = !isDarkTheme.value;

            const theme = isDarkTheme.value ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);

            // Add rotation animation to toggle button
            const toggleBtn = document.querySelector('.theme-toggle');
            if (toggleBtn) {
                toggleBtn.classList.add('rotating');
                setTimeout(() => {
                    toggleBtn.classList.remove('rotating');
                }, 300);
            }

            // Save preference to localStorage
            localStorage.setItem('exam-theme', theme);

            console.log(`[THEME] Switched to ${theme} mode`);
        }

        // ============================================================
        // RETURN
        // ============================================================

        return {
            currentSection,
            sectionData,
            userAnswers,
            isLoading,
            error,
            showPermissionsPage,
            showInstructions,
            isFullscreen,
            showFullscreenWarning,
            showConfirmDialog,
            confirmDialogData,
            permissions,
            systemCheck,
            audioPreloading,
            currentFontSize,
            currentFontSizeLabel,
            fontSizes,
            fontSizeIndex,
            showFontSizeDropdown,
            canDecreaseFontSize,
            canIncreaseFontSize,
            timeRemaining,
            formattedTime,
            timeWarning,
            nextSectionLabel,
            answeredCount,
            totalQuestions,
            getSectionInstructions,
            audioState,
            isDarkTheme,
            loadSectionData,
            startSection,
            submitAnswer,
            submitWriting,
            submitSpeaking,
            handleNextSection,
            handleExit,
            showConfirm,
            checkMicrophonePermission,
            checkCameraPermission,
            checkAllPermissions,
            performSystemCheck,
            proceedToInstructions,
            selectFontSize,
            toggleFontSizeDropdown,
            increaseFontSize,
            decreaseFontSize,
            resetFontSize,
            requestFullscreen,
            dismissFullscreenWarning,
            enterFullscreenFromWarning,
            setAudioState,
            toggleAudioPlayback,
            seekAudioFromHeader,
            formatAudioTime,
            clearHighlights,
            toggleTheme,
            initTheme
        };
    }
});

// Note: App is mounted in the template after all components are loaded
