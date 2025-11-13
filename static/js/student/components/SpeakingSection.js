/**
 * Speaking Section Component
 */

window.vueApp.component('speaking-section', {
    template: `
        <div class="flex h-full flex-col">
            <!-- Progress Bar -->
            <div class="border-b bg-white px-6 py-3">
                <div class="flex items-center justify-between mb-2">
                    <div class="font-medium text-slate-700" style="font-size: inherit;">
                        Question {{ currentQuestionIndex + 1 }} of {{ speakingSequence.length }}
                    </div>
                    <div class="text-slate-600" style="font-size: inherit;">
                        Part {{ currentQuestion.part }}
                    </div>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2">
                    <div
                        class="bg-indigo-600 h-2 rounded-full transition-all"
                        :style="{ width: progressPercentage + '%' }"
                    ></div>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 py-8">
                <div class="max-w-3xl mx-auto space-y-6">
                    <!-- Current Question -->
                    <div class="rounded-lg border border-slate-200 bg-white p-8" :class="fontSize">
                        <div class="mb-4">
                            <span class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                Speaking Part {{ currentQuestion.part }}
                            </span>
                        </div>
                        
                        <h3 class="text-xl font-semibold text-slate-900 mb-4" style="font-size: inherit;">
                            {{ currentQuestion.text }}
                        </h3>
                        
                        <!-- Part 2 Preparation -->
                        <div v-if="currentQuestion.part === 2 && !isRecording && !hasRecording" class="mt-6 rounded-lg bg-amber-50 p-4">
                            <div class="flex gap-3">
                                <i data-feather="info" class="h-5 w-5 text-amber-600"></i>
                                <div class="text-amber-800" style="font-size: inherit;">
                                    <p class="font-semibold mb-1">Instructions for Part 2:</p>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>You have 1 minute to prepare</li>
                                        <li>You can make notes if you want</li>
                                        <li>Speak for 1-2 minutes on this topic</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recording Controls -->
                    <div class="rounded-lg border border-slate-200 bg-white p-6">
                        <!-- Not Recording State -->
                        <div v-if="!isRecording && !hasRecording" class="text-center">
                            <div class="mb-4">
                                <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                                    <i data-feather="mic" class="h-10 w-10 text-indigo-600"></i>
                                </div>
                            </div>
                            <h4 class="text-lg font-semibold text-slate-900 mb-2" style="font-size: inherit;">
                                Ready to Record
                            </h4>
                            <p class="text-slate-600 mb-6" style="font-size: inherit;">
                                Click the button below when you're ready to record your answer
                            </p>
                            <button
                                @click="startRecording"
                                class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition"
                            >
                                <i data-feather="circle" class="h-5 w-5 fill-current"></i>
                                Start Recording
                            </button>
                        </div>

                        <!-- Recording State -->
                        <div v-else-if="isRecording" class="text-center">
                            <div class="mb-4">
                                <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 animate-pulse">
                                    <i data-feather="mic" class="h-10 w-10 text-red-600"></i>
                                </div>
                            </div>
                            <h4 class="text-lg font-semibold text-slate-900 mb-2" style="font-size: inherit;">
                                Recording...
                            </h4>
                            <div class="text-3xl font-mono font-bold text-red-600 mb-6">
                                {{ formattedRecordingTime }}
                            </div>
                            <button
                                @click="stopRecording"
                                class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
                            >
                                <i data-feather="square" class="h-5 w-5 fill-current"></i>
                                Stop Recording
                            </button>
                        </div>

                        <!-- Recorded State -->
                        <div v-else-if="hasRecording" class="text-center">
                            <div class="mb-4">
                                <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                                    <i data-feather="check-circle" class="h-10 w-10 text-green-600"></i>
                                </div>
                            </div>
                            <h4 class="text-lg font-semibold text-slate-900 mb-2" style="font-size: inherit;">
                                Recording Complete
                            </h4>
                            <p class="text-slate-600 mb-4" style="font-size: inherit;">
                                Duration: {{ formattedRecordingTime }}
                            </p>
                            
                            <!-- Audio Playback -->
                            <div v-if="audioUrl" class="mb-4">
                                <audio :src="audioUrl" controls class="w-full"></audio>
                            </div>
                            
                            <div class="flex gap-3 justify-center">
                                <button
                                    @click="reRecord"
                                    class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                                >
                                    <i data-feather="rotate-ccw" class="h-4 w-4"></i>
                                    Re-record
                                </button>
                                <button
                                    @click="nextQuestion"
                                    :disabled="isUploading"
                                    class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                                >
                                    <span>{{ currentQuestionIndex === speakingSequence.length - 1 ? 'Finish' : 'Next Question' }}</span>
                                    <i data-feather="arrow-right" class="h-4 w-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation -->
                    <div class="flex justify-between items-center">
                        <button
                            v-if="currentQuestionIndex > 0"
                            @click="previousQuestion"
                            class="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                        >
                            <i data-feather="arrow-left" class="h-4 w-4"></i>
                            Previous Question
                        </button>
                        <div></div>
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
        fontSize: {
            type: String,
            default: 'text-base'
        }
    },

    emits: ['submit-speaking'],

    setup(props, { emit }) {
        const speakingSequence = ref([]);
        const currentQuestionIndex = ref(0);
        const isRecording = ref(false);
        const hasRecording = ref(false);
        const recordingTime = ref(0);
        const recordingInterval = ref(null);
        const mediaRecorder = ref(null);
        const audioChunks = ref([]);
        const audioBlob = ref(null);
        const audioUrl = ref(null);
        const isUploading = ref(false);

        const currentQuestion = computed(() => {
            return speakingSequence.value[currentQuestionIndex.value] || {};
        });

        const progressPercentage = computed(() => {
            return ((currentQuestionIndex.value + 1) / speakingSequence.value.length) * 100;
        });

        const formattedRecordingTime = computed(() => {
            const minutes = Math.floor(recordingTime.value / 60);
            const seconds = recordingTime.value % 60;
            return `${minutes}:${String(seconds).padStart(2, '0')}`;
        });

        onMounted(() => {
            speakingSequence.value = props.data.speaking_sequence || [];

            // Check for existing recordings
            const existingRecordings = props.data.existing_recordings || {};
            if (currentQuestion.value.key in existingRecordings) {
                hasRecording.value = true;
            }
        });

        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                mediaRecorder.value = new MediaRecorder(stream);
                audioChunks.value = [];

                mediaRecorder.value.ondataavailable = (event) => {
                    audioChunks.value.push(event.data);
                };

                mediaRecorder.value.onstop = () => {
                    audioBlob.value = new Blob(audioChunks.value, { type: 'audio/webm' });
                    audioUrl.value = URL.createObjectURL(audioBlob.value);
                    hasRecording.value = true;
                    uploadRecording();
                };

                mediaRecorder.value.start();
                isRecording.value = true;
                recordingTime.value = 0;

                // Start timer
                recordingInterval.value = setInterval(() => {
                    recordingTime.value++;
                }, 1000);

            } catch (err) {
                console.error('Failed to start recording:', err);
                alert('Failed to access microphone. Please check permissions.');
            }
        }

        function stopRecording() {
            if (mediaRecorder.value && isRecording.value) {
                mediaRecorder.value.stop();
                mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
                isRecording.value = false;

                if (recordingInterval.value) {
                    clearInterval(recordingInterval.value);
                }
            }
        }

        async function uploadRecording() {
            if (!audioBlob.value) return;

            isUploading.value = true;

            try {
                await emit('submit-speaking', currentQuestion.value.key, audioBlob.value);
            } catch (err) {
                console.error('Failed to upload recording:', err);
                alert('Failed to save recording. Please try again.');
            } finally {
                isUploading.value = false;
            }
        }

        function reRecord() {
            hasRecording.value = false;
            audioBlob.value = null;
            audioUrl.value = null;
            recordingTime.value = 0;
        }

        function nextQuestion() {
            if (currentQuestionIndex.value < speakingSequence.value.length - 1) {
                currentQuestionIndex.value++;
                hasRecording.value = false;
                audioBlob.value = null;
                audioUrl.value = null;
                recordingTime.value = 0;

                // Check for existing recording
                const existingRecordings = props.data.existing_recordings || {};
                if (currentQuestion.value.key in existingRecordings) {
                    hasRecording.value = true;
                }
            }
        }

        function previousQuestion() {
            if (currentQuestionIndex.value > 0) {
                currentQuestionIndex.value--;
                hasRecording.value = false;
                audioBlob.value = null;
                audioUrl.value = null;
                recordingTime.value = 0;

                // Check for existing recording
                const existingRecordings = props.data.existing_recordings || {};
                if (currentQuestion.value.key in existingRecordings) {
                    hasRecording.value = true;
                }
            }
        }

        onMounted(() => {
            // Initialize text highlighter
            const container = document.querySelector('.flex.h-full.flex-col');
            if (container && window.TextHighlighter) {
                const attemptId = window.attemptId || props.attemptId;
                window.TextHighlighter.init('speaking', container, attemptId);
            }
        });

        onUnmounted(() => {
            if (recordingInterval.value) {
                clearInterval(recordingInterval.value);
            }
            if (audioUrl.value) {
                URL.revokeObjectURL(audioUrl.value);
            }

            // Cleanup highlighter
            if (window.TextHighlighter) {
                window.TextHighlighter.cleanup();
            }
        });

        return {
            speakingSequence,
            currentQuestionIndex,
            currentQuestion,
            isRecording,
            hasRecording,
            recordingTime,
            formattedRecordingTime,
            progressPercentage,
            audioUrl,
            isUploading,
            fontSize: computed(() => props.fontSize),
            startRecording,
            stopRecording,
            reRecord,
            nextQuestion,
            previousQuestion
        };
    }
});
