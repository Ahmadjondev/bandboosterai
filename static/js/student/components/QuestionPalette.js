/**
 * Question Palette Component
 * Reusable bottom palette for navigating questions/parts/passages
 * 
 * Features:
 * - Part/Passage navigation
 * - Question status indicators (answered/unanswered)
 * - Click to scroll to question
 * - Responsive design
 * - Answer count display
 */

window.QuestionPalette = {
    /**
     * Template for Listening Section (Parts)
     */
    listeningTemplate: `
        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
            <div class="px-4 py-3 max-w-7xl mx-auto">
                <div class="flex items-center gap-4 overflow-x-auto">
                    <!-- Part Buttons -->
                    <template v-for="(part, index) in data.parts" :key="part.id">
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
                        
                        <!-- Separator -->
                        <span v-if="index < data.parts.length - 1" class="text-slate-300 flex-shrink-0">|</span>
                    </template>
                    
                    <!-- Arrow -->
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
                                            userAnswers[question.id] && userAnswers[question.id].toString().trim() !== ''
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
    `,

    /**
     * Template for Reading Section (Passages)
     */
    readingTemplate: `
        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
            <div class="px-4 py-3 max-w-7xl mx-auto">
                <div class="flex items-center gap-4 overflow-x-auto">
                    <!-- Passage Buttons -->
                    <template v-for="(passage, index) in data.passages" :key="passage.id">
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
                        
                        <!-- Separator -->
                        <span v-if="index < data.passages.length - 1" class="text-slate-300 flex-shrink-0">|</span>
                    </template>
                    
                    <!-- Arrow -->
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
                                            userAnswers[question.id] && userAnswers[question.id].toString().trim() !== ''
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
    `,

    /**
     * Helper: Count answered questions in a part
     */
    getPartAnsweredCount(data, userAnswers, partNumber) {
        if (!data?.parts) return 0;
        const part = data.parts.find(p => p.part_number === partNumber);
        if (!part) return 0;

        let count = 0;
        part.test_heads.forEach(group => {
            group.questions.forEach(question => {
                if (userAnswers[question.id] && userAnswers[question.id].toString().trim() !== '') {
                    count++;
                }
            });
        });
        return count;
    },

    /**
     * Helper: Count total questions in a part
     */
    getPartTotalQuestions(data, partNumber) {
        if (!data?.parts) return 0;
        const part = data.parts.find(p => p.part_number === partNumber);
        if (!part) return 0;

        let total = 0;
        part.test_heads.forEach(group => {
            total += group.questions.length;
        });
        return total;
    },

    /**
     * Helper: Count answered questions in a passage
     */
    getPassageAnsweredCount(data, userAnswers, passageNumber) {
        if (!data?.passages) return 0;
        const passage = data.passages.find(p => p.passage_number === passageNumber);
        if (!passage) return 0;

        let count = 0;
        passage.test_heads.forEach(group => {
            group.questions.forEach(question => {
                if (userAnswers[question.id] && userAnswers[question.id].toString().trim() !== '') {
                    count++;
                }
            });
        });
        return count;
    },

    /**
     * Helper: Count total questions in a passage
     */
    getPassageTotalQuestions(data, passageNumber) {
        if (!data?.passages) return 0;
        const passage = data.passages.find(p => p.passage_number === passageNumber);
        if (!passage) return 0;

        let total = 0;
        passage.test_heads.forEach(group => {
            total += group.questions.length;
        });
        return total;
    }
};
