/**
 * Results Section Component
 * Modern Vue.js-based IELTS test results display
 * Redesigned to match the old results page style
 */

window.vueApp.component('results-section', {
    template: `
        <div class="min-h-screen bg-gray-50">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style="border-color: #E75225"></div>
                    <p class="text-lg font-medium text-gray-700">Loading your results...</p>
                    <p class="text-sm text-gray-500 mt-2">Calculating scores and analyzing performance</p>
                </div>
            </div>
            
            <!-- Error State -->
            <div v-else-if="error" class="flex items-center justify-center min-h-screen px-4">
                <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-feather="alert-circle" class="w-8 h-8 text-red-600"></i>
                    </div>
                    <h2 class="text-xl font-bold text-gray-900 mb-2">Unable to Load Results</h2>
                    <p class="text-gray-600 mb-6">{{ error }}</p>
                    <div class="flex gap-3 justify-center">
                        <button
                            @click="loadResults"
                            class="text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                            style="background-color: #E75225; &:hover { background-color: #d14520; }"
                        >
                            <i data-feather="refresh-cw" class="w-4 h-4 inline mr-2"></i>
                            Retry
                        </button>
                        <a
                            href="/"
                            class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Results Content -->
            <div v-else class="min-h-screen bg-gray-50 text-gray-800">
            <!-- Header Banner with Overall Score - Full Width -->
            <div class="px-4 sm:px-6 lg:px-8 xl:px-12 py-8 md:py-12 text-white shadow-lg mb-0" style="background: linear-gradient(to bottom right, #E75225, #d14520)">
                <div class="w-full">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <!-- Overall Score Circle -->
                        <div class="md:col-span-4 flex justify-center">
                            <div class="relative w-48 h-48">
                                <svg viewBox="0 0 120 120" class="transform -rotate-90">
                                    <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,.25)" stroke-width="10" fill="none" />
                                    <circle 
                                        cx="60" cy="60" r="54" 
                                        stroke="url(#gradOverall)" 
                                        stroke-linecap="round" 
                                        stroke-width="10" 
                                        fill="none"
                                        :stroke-dasharray="overallDashArray"
                                        class="transition-all duration-1000 ease-out"
                                    />
                                    <defs>
                                        <linearGradient id="gradOverall" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stop-color="#ffffff" />
                                            <stop offset="100%" stop-color="#cfe9ff" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div class="absolute inset-0 flex flex-col items-center justify-center">
                                    <div class="text-6xl font-bold tracking-tighter">{{ formatBandScore(results.overall_band) }}</div>
                                    <div class="text-sm font-medium tracking-widest uppercase">Overall</div>
                                </div>
                            </div>
                        </div>

                        <!-- Test Info -->
                        <div class="md:col-span-5 text-center md:text-left">
                            <h1 class="text-3xl font-bold mb-2">IELTS Performance Report</h1>
                            <p class="text-sm opacity-90">
                                <strong>Test:</strong> {{ results.test_title }}
                            </p>
                            <p class="text-sm opacity-90">
                                <strong>Completed:</strong> {{ formatDate(results.completed_at) }}
                            </p>
                            <div class="mt-3 flex items-center gap-2 flex-wrap">
                                <!-- Evaluation Type Badge -->
                                <span v-if="results.evaluation && results.evaluation.type === 'AI'" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(231,82,37,0.1)] text-[#E75225] text-xs font-semibold">
                                    <i data-feather="cpu" class="w-3 h-3"></i> AI Evaluation
                                </span>
                                <span v-else-if="results.evaluation && results.evaluation.type === 'TEACHER'" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                    <i data-feather="user-check" class="w-3 h-3"></i> Teacher Evaluation
                                </span>
                                
                                <!-- Evaluation Status Badge -->
                                <span v-if="results.evaluation && results.evaluation.status === 'processing'" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse"
                                      style="background-color: rgba(231, 82, 37, 0.1); color: #E75225;">
                                    <i data-feather="loader" class="w-3 h-3"></i> Processing
                                </span>
                                <span v-else-if="results.evaluation && results.evaluation.status === 'pending'" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                                    <i data-feather="clock" class="w-3 h-3"></i> Awaiting Review
                                </span>
                                <span v-else-if="results.evaluation && results.evaluation.status === 'in_review'" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(231,82,37,0.1)] text-[#E75225] text-xs font-semibold">
                                    <i data-feather="eye" class="w-3 h-3"></i> In Review
                                </span>
                                <span v-else-if="results.evaluation && results.evaluation.status === 'completed'" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                    <i data-feather="check-circle" class="w-3 h-3"></i> Completed
                                </span>
                                
                                <!-- Teacher Name if applicable -->
                                <span v-if="results.evaluation && results.evaluation.teacher_name" 
                                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                    <i data-feather="user" class="w-3 h-3"></i> {{ results.evaluation.teacher_name }}
                                </span>
                            </div>

                            <!-- Section Band Scores Grid -->
                            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                                <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center">
                                    <h6 class="text-xs font-semibold uppercase opacity-80">Listening</h6>
                                    <div class="text-2xl font-bold">{{ formatBandScore(results.listening_band) }}</div>
                                    <p v-if="!results.listening_band" class="mt-1 text-[11px] text-slate-200 italic">Processing...</p>
                                </div>
                                <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center">
                                    <h6 class="text-xs font-semibold uppercase opacity-80">Reading</h6>
                                    <div class="text-2xl font-bold">{{ formatBandScore(results.reading_band) }}</div>
                                    <p v-if="!results.reading_band" class="mt-1 text-[11px] text-slate-200 italic">Processing...</p>
                                </div>
                                <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center">
                                    <h6 class="text-xs font-semibold uppercase opacity-80">Writing</h6>
                                    <div class="text-2xl font-bold">{{ formatBandScore(results.writing_band) }}</div>
                                    <p v-if="!results.writing_band && results.evaluation && results.evaluation.type === 'AI'" 
                                       class="mt-1 text-[11px] text-slate-200 italic">AI evaluating...</p>
                                    <p v-else-if="!results.writing_band && results.evaluation && results.evaluation.type === 'TEACHER'" 
                                       class="mt-1 text-[11px] text-slate-200 italic">Pending teacher review...</p>
                                </div>
                                <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center">
                                    <h6 class="text-xs font-semibold uppercase opacity-80">Speaking</h6>
                                    <div class="text-2xl font-bold">{{ formatBandScore(results.speaking_band) }}</div>
                                    <p v-if="!results.speaking_band && results.evaluation && results.evaluation.type === 'AI'" 
                                       class="mt-1 text-[11px] text-slate-200 italic">AI evaluating...</p>
                                    <p v-else-if="!results.speaking_band && results.evaluation && results.evaluation.type === 'TEACHER'" 
                                       class="mt-1 text-[11px] text-slate-200 italic">Pending teacher review...</p>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="md:col-span-3 flex justify-center md:justify-end">
                            <div class="flex flex-col gap-2 w-full max-w-xs">
                                <button
                                    @click="downloadReport"
                                    class="bg-white text-[#E75225] hover:[rgba(231,82,37,0.05)] font-semibold py-2 px-4 rounded-lg shadow flex items-center justify-center transition-colors"
                                >
                                    <i data-feather="file-text" class="w-4 h-4 mr-2"></i> Export PDF
                                </button>
                                <a
                                    href="/"
                                    class="bg-white/20 hover:bg-white/30 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <i data-feather="home" class="w-4 h-4 mr-2"></i> Back to Dashboard
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content - Full Width -->
            <div class="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 bg-gray-50">
                <!-- Answer Review Cards - Responsive Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                    <!-- Listening Card -->
                    <div v-if="hasSection('listening')" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="[rgba(231,82,37,0.1)] [#E75225] rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="headphones" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Listening Answers</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Review your answers and see correct responses for the listening section.
                        </p>
                        <button
                            @click="openAnswersDialog('listening')"
                            class="mt-4 text-sm font-semibold [#E75225] hover:[#E75225] transition-colors"
                        >
                            View Details <i data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>

                    <!-- Reading Card -->
                    <div v-if="hasSection('reading')" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-green-100 text-green-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="book-open" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Reading Answers</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Compare your answers against the correct ones for the reading passages.
                        </p>
                        <button
                            @click="openAnswersDialog('reading')"
                            class="mt-4 text-sm font-semibold [#E75225] hover:[#E75225] transition-colors"
                        >
                            View Details <i data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>

                    <!-- Writing Card -->
                    <div v-if="hasSection('writing')" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-yellow-100 text-yellow-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="edit-3" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Writing Submissions</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Read your submitted essays and the detailed AI-powered feedback.
                        </p>
                        <button
                            @click="openAnswersDialog('writing')"
                            :class="results.writing_feedback && results.writing_feedback.length > 0 ? '[#E75225] hover:[#E75225]' : 'text-gray-400 cursor-not-allowed'"
                            :disabled="!results.writing_feedback || results.writing_feedback.length === 0"
                            class="mt-4 text-sm font-semibold transition-colors"
                        >
                            {{ results.writing_feedback && results.writing_feedback.length > 0 ? 'View Details' : 'No submissions' }} 
                            <i v-if="results.writing_feedback && results.writing_feedback.length > 0" data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>

                    <!-- Speaking Card -->
                    <div v-if="hasSection('speaking')" class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div class="bg-red-100 text-red-600 rounded-full w-14 h-14 flex items-center justify-center mb-3">
                            <i data-feather="mic" class="w-6 h-6"></i>
                        </div>
                        <h5 class="font-semibold text-gray-800">Speaking Attempt</h5>
                        <p class="text-sm text-gray-500 mt-1 flex-grow">
                            Listen to your recording and review the AI evaluation and transcript.
                        </p>
                        <button
                            @click="openAnswersDialog('speaking')"
                            :class="results.speaking_feedback ? '[#E75225] hover:[#E75225]' : 'text-gray-400 cursor-not-allowed'"
                            :disabled="!results.speaking_feedback"
                            class="mt-4 text-sm font-semibold transition-colors"
                        >
                            {{ results.speaking_feedback ? 'View Details' : 'Processing...' }}
                            <i v-if="results.speaking_feedback" data-feather="arrow-right" class="w-3 h-3 inline ml-1"></i>
                        </button>
                    </div>
                </div>

                <!-- Enhanced Strengths & Weaknesses with Visual Performance - Full Width -->
                <div class="mb-8">
                    <!-- Performance Overview Header -->
                    <div class="text-center mb-8">
                        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Performance Analysis</h2>
                        <p class="text-gray-600 text-sm md:text-base">Visual breakdown of your strengths and areas for improvement</p>
                    </div>

                    <!-- Performance Score Radar/Dashboard -->
                    <div class="bg-gradient-to-br from-[rgba(231,82,37,0.05)] via-[rgba(231,82,37,0.08)] to-[rgba(231,82,37,0.1)] rounded-2xl p-6 sm:p-8 lg:p-10 mb-6 shadow-lg border border-[rgba(231,82,37,0.1)]">
                        <div class="grid md:grid-cols-2 xl:grid-cols-5 gap-6 lg:gap-8">
                            <!-- Left: Score Breakdown Visual -->
                            <div class="space-y-4 xl:col-span-3">
                                <h3 class="text-base md:text-lg font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                                    <div class="bg-gradient-to-br from-[#E75225] to-[#d14520] rounded-lg p-2">
                                        <i data-feather="activity" class="w-5 h-5 text-white"></i>
                                    </div>
                                    Skill Distribution
                                </h3>
                                
                                <!-- Listening Score Bar -->
                                <div class="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <i data-feather="headphones" class="w-4 h-4 [#E75225]"></i>
                                            <span class="font-semibold text-gray-900">Listening</span>
                                        </div>
                                        <span class="text-lg font-bold [#E75225]">{{ formatBandScore(results.listening_band) }}</span>
                                    </div>
                                    <div class="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            class="absolute inset-y-0 left-0 bg-gradient-to-r from-[#E75225] to-[#d14520] rounded-full transition-all duration-1000 ease-out"
                                            :style="{width: ((results.listening_band || 0) / 9 * 100) + '%'}"
                                        >
                                            <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Reading Score Bar -->
                                <div class="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <i data-feather="book-open" class="w-4 h-4 text-green-600"></i>
                                            <span class="font-semibold text-gray-900">Reading</span>
                                        </div>
                                        <span class="text-lg font-bold text-green-600">{{ formatBandScore(results.reading_band) }}</span>
                                    </div>
                                    <div class="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            class="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                                            :style="{width: ((results.reading_band || 0) / 9 * 100) + '%'}"
                                        >
                                            <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Writing Score Bar -->
                                <div class="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <i data-feather="edit-3" class="w-4 h-4 text-yellow-600"></i>
                                            <span class="font-semibold text-gray-900">Writing</span>
                                        </div>
                                        <span class="text-lg font-bold text-yellow-600">{{ formatBandScore(results.writing_band) }}</span>
                                    </div>
                                    <div class="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            class="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
                                            :style="{width: ((results.writing_band || 0) / 9 * 100) + '%'}"
                                        >
                                            <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Speaking Score Bar -->
                                <div class="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <i data-feather="mic" class="w-4 h-4 text-red-600"></i>
                                            <span class="font-semibold text-gray-900">Speaking</span>
                                        </div>
                                        <span class="text-lg font-bold text-red-600">{{ formatBandScore(results.speaking_band) }}</span>
                                    </div>
                                    <div class="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            class="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000 ease-out"
                                            :style="{width: ((results.speaking_band || 0) / 9 * 100) + '%'}"
                                        >
                                            <div class="absolute inset-0 bg-white/30 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Overall Performance Circle -->
                            <div class="flex flex-col items-center justify-center xl:col-span-2">
                                <div class="relative w-48 h-48 md:w-56 md:h-56 mb-4">
                                    <!-- Background circles -->
                                    <svg class="absolute inset-0 transform -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" stroke="#e5e7eb" stroke-width="8" fill="none" opacity="0.3"/>
                                        <circle cx="60" cy="60" r="40" stroke="#e5e7eb" stroke-width="6" fill="none" opacity="0.3"/>
                                        <circle cx="60" cy="60" r="30" stroke="#e5e7eb" stroke-width="4" fill="none" opacity="0.3"/>
                                        
                                        <!-- Progress circle -->
                                        <circle 
                                            cx="60" cy="60" r="50" 
                                            stroke="url(#gradientOverall)" 
                                            stroke-width="8" 
                                            fill="none"
                                            stroke-linecap="round"
                                            :stroke-dasharray="overallDashArray"
                                            class="transition-all duration-1000 ease-out"
                                        />
                                        <defs>
                                            <linearGradient id="gradientOverall" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stop-color="#8b5cf6" />
                                                <stop offset="50%" stop-color="#ec4899" />
                                                <stop offset="100%" stop-color="#f59e0b" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    
                                    <!-- Center content -->
                                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                                        <div class="text-5xl font-bold bg-gradient-to-br from-[#E75225] to-[#d14520] bg-clip-text text-transparent">
                                            {{ formatBandScore(results.overall_band) }}
                                        </div>
                                        <div class="text-sm font-semibold text-gray-600 mt-1">Overall Band</div>
                                        <div class="text-xs text-gray-500 mt-1">{{ getCEFRLevel(results.overall_band) }}</div>
                                    </div>
                                </div>
                                
                                <!-- Performance Indicators -->
                                <div class="grid grid-cols-3 gap-3 w-full max-w-xs">
                                    <div class="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
                                        <div class="text-2xl font-bold text-green-600">{{ getStrengthsCount() }}</div>
                                        <div class="text-xs text-gray-600 mt-1">Strengths</div>
                                    </div>
                                    <div class="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
                                        <div class="text-2xl font-bold [#E75225]">{{ getAccuracyPercentage('listening') }}%</div>
                                        <div class="text-xs text-gray-600 mt-1">Avg Score</div>
                                    </div>
                                    <div class="bg-white/80 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
                                        <div class="text-2xl font-bold text-orange-600">{{ getWeaknessesCount() }}</div>
                                        <div class="text-xs text-gray-600 mt-1">To Improve</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Strengths & Weaknesses Cards - Full Width Grid -->
                    <div class="grid md:grid-cols-2 gap-4 lg:gap-6">
                        <!-- Strengths -->
                        <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-green-100">
                            <!-- Header with gradient -->
                            <div class="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
                                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                                    <div class="bg-white/20 rounded-lg p-2">
                                        <i data-feather="award" class="w-5 h-5"></i>
                                    </div>
                                    Your Strengths
                                </h3>
                                <p class="text-green-50 text-sm mt-1">Areas where you excel</p>
                            </div>
                            
                            <!-- Content -->
                            <div class="p-6">
                                <div v-if="results.strengths && results.strengths.length > 0" class="space-y-3">
                                    <div
                                        v-for="(strength, index) in results.strengths"
                                        :key="index"
                                        class="group relative bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-r-lg p-4 transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                                    >
                                        <div class="flex items-start gap-3">
                                            <div class="flex-shrink-0 mt-0.5">
                                                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {{ index + 1 }}
                                                </div>
                                            </div>
                                            <div class="flex-1">
                                                <div class="mb-2">
                                                    <span class="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                                                        {{ strength.area }}
                                                    </span>
                                                    <span class="ml-2 text-green-600 font-bold text-sm">{{ strength.accuracy }}</span>
                                                </div>
                                                <p class="text-gray-700 text-sm">{{ strength.message }}</p>
                                            </div>
                                            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i data-feather="check-circle" class="w-5 h-5 text-green-500"></i>
                                            </div>
                                        </div>
                                        <!-- Decorative element -->
                                        <div class="absolute top-0 right-0 w-20 h-20 bg-green-200/20 rounded-full blur-2xl -z-10"></div>
                                    </div>
                                </div>
                                <div v-else class="text-center py-12">
                                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-feather="bar-chart-2" class="w-10 h-10 text-gray-400"></i>
                                    </div>
                                    <p class="text-gray-500 font-medium">Building your strength profile...</p>
                                    <p class="text-gray-400 text-sm mt-2">Complete more sections to identify your strengths</p>
                                </div>
                            </div>
                        </div>

                        <!-- Areas for Improvement -->
                        <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-orange-100">
                            <!-- Header with gradient -->
                            <div class="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                                    <div class="bg-white/20 rounded-lg p-2">
                                        <i data-feather="target" class="w-5 h-5"></i>
                                    </div>
                                    Areas for Improvement
                                </h3>
                                <p class="text-orange-50 text-sm mt-1">Focus areas to boost your score</p>
                            </div>
                            
                            <!-- Content -->
                            <div class="p-6">
                                <div v-if="results.weaknesses && results.weaknesses.length > 0" class="space-y-3">
                                    <div
                                        v-for="(weakness, index) in results.weaknesses"
                                        :key="index"
                                        class="group relative bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-r-lg p-4 transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                                    >
                                        <div class="flex items-start gap-3">
                                            <div class="flex-shrink-0 mt-0.5">
                                                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                    {{ index + 1 }}
                                                </div>
                                            </div>
                                            <div class="flex-1">
                                                <div class="mb-2">
                                                    <span class="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded">
                                                        {{ weakness.area }}
                                                    </span>
                                                    <span class="ml-2 text-orange-600 font-bold text-sm">{{ weakness.accuracy }}</span>
                                                </div>
                                                <p class="text-gray-700 text-sm">{{ weakness.tip }}</p>
                                            </div>
                                            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <i data-feather="alert-circle" class="w-5 h-5 text-orange-500"></i>
                                            </div>
                                        </div>
                                        <!-- Decorative element -->
                                        <div class="absolute top-0 right-0 w-20 h-20 bg-orange-200/20 rounded-full blur-2xl -z-10"></div>
                                    </div>
                                </div>
                                <div v-else class="text-center py-12">
                                    <div class="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-feather="check-circle" class="w-10 h-10 text-green-500"></i>
                                    </div>
                                    <p class="text-gray-700 font-medium">Excellent Performance!</p>
                                    <p class="text-gray-500 text-sm mt-2">No critical areas identified</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Answers Dialog Modal (Listening/Reading) -->
                <div v-if="showAnswersDialog && (dialogSection === 'listening' || dialogSection === 'reading')" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                            <!-- Modal Header -->
                            <div class="bg-gradient-to-r from-[#E75225] to-[#d14520] px-6 py-4 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="bg-white/20 rounded-full p-2">
                                        <i :data-feather="dialogSection === 'listening' ? 'headphones' : 'book-open'" class="w-5 h-5 text-white"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-white">
                                        {{ dialogSection === 'listening' ? 'Listening' : 'Reading' }} Answer Review
                                    </h3>
                                </div>
                                <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                    <i data-feather="x" class="w-5 h-5"></i>
                                </button>
                            </div>

                            <!-- Modal Body - Scrollable -->
                            <div class="flex-1 overflow-y-auto p-6">
                                <div v-if="dialogSection">
                                    <!-- Section Statistics -->
                                    <div class="bg-gradient-to-r from-[rgba(231,82,37,0.05)] to-[rgba(231,82,37,0.1)] rounded-lg p-6 mb-6">
                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div class="text-center">
                                                <div class="text-3xl font-bold [#E75225]">
                                                    {{ dialogSection === 'listening' ? results.listening_score : results.reading_score }}
                                                </div>
                                                <div class="text-sm text-gray-600">Correct Answers</div>
                                            </div>
                                            <div class="text-center">
                                                <div class="text-3xl font-bold text-gray-700">
                                                    {{ dialogSection === 'listening' ? results.listening_total : results.reading_total }}
                                                </div>
                                                <div class="text-sm text-gray-600">Total Questions</div>
                                            </div>
                                            <div class="text-center">
                                                <div class="text-3xl font-bold text-[#E75225]">
                                                    {{ getAccuracyPercentage(dialogSection) }}%
                                                </div>
                                                <div class="text-sm text-gray-600">Accuracy</div>
                                            </div>
                                            <div class="text-center">
                                                <div class="text-3xl font-bold text-green-600">
                                                    {{ dialogSection === 'listening' ? results.listening_band : results.reading_band }}
                                                </div>
                                                <div class="text-sm text-gray-600">Band Score</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Performance Analysis -->
                                    <div v-if="getSectionAnalysis(dialogSection)" class="mb-6">
                                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance by Question Type</h3>
                                        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div 
                                                v-for="(stats, type) in getSectionAnalysis(dialogSection).type_stats"
                                                :key="type"
                                                class="bg-white border border-gray-200 rounded-lg p-4"
                                            >
                                                <div class="flex items-center justify-between mb-2">
                                                    <h5 class="font-medium text-gray-800 text-sm">{{ type }}</h5>
                                                    <span class="text-xs font-semibold px-2 py-1 rounded-full"
                                                        :class="getAccuracyClass(getSectionAnalysis(dialogSection).accuracy_by_type?.[type] || 0)"
                                                    >
                                                        {{ Math.round((getSectionAnalysis(dialogSection).accuracy_by_type?.[type] || 0) * 100) }}%
                                                    </span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <div class="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            class="h-2 rounded-full transition-all duration-500"
                                                            :class="getAccuracyBarClass(getSectionAnalysis(dialogSection).accuracy_by_type?.[type] || 0)"
                                                            :style="{width: ((getSectionAnalysis(dialogSection).accuracy_by_type?.[type] || 0) * 100) + '%'}"
                                                        ></div>
                                                    </div>
                                                    <span class="text-sm font-medium text-gray-600">
                                                        {{ stats.correct }}/{{ stats.total }}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Listening Part Analysis -->
                                    <div v-if="dialogSection === 'listening' && results.listening_analysis?.part_stats" class="mb-6">
                                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance by Part</h3>
                                        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div 
                                                v-for="(stats, part) in results.listening_analysis.part_stats"
                                                :key="part"
                                                class="bg-white border border-gray-200 rounded-lg p-4 text-center"
                                            >
                                                <div class="text-2xl font-bold text-gray-800 mb-1">{{ part }}</div>
                                                <div class="text-sm text-gray-600 mb-3">
                                                    {{ stats.correct }}/{{ stats.total }} correct
                                                </div>
                                                <div class="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        class="h-2 rounded-full transition-all duration-500"
                                                        :class="getAccuracyBarClass(results.listening_analysis.accuracy_by_part?.[part] || 0)"
                                                        :style="{width: ((results.listening_analysis.accuracy_by_part?.[part] || 0) * 100) + '%'}"
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Answer Review -->
                                    <div class="mb-4">
                                        <h3 class="text-xl font-bold text-gray-800 mb-2">Detailed Answer Review</h3>
                                        <p class="text-gray-600">Review your answers and see the correct responses.</p>
                                    </div>

                                    <div class="space-y-6">
                                        <div 
                                            v-for="group in getAnswerGroups(dialogSection)"
                                            :key="group.id"
                                            class="border border-gray-200 rounded-lg overflow-hidden"
                                        >
                                            <!-- Group Header -->
                                            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                                <div class="flex items-center justify-between">
                                                    <h4 class="font-semibold text-gray-900">{{ group.title }}</h4>
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-sm font-medium text-gray-600">
                                                            {{ getGroupScore(group) }} correct
                                                        </span>
                                                        <span class="text-xs font-semibold px-2 py-1 rounded-full"
                                                            :class="getAccuracyClass(getGroupAccuracy(group))"
                                                        >
                                                            {{ Math.round(getGroupAccuracy(group) * 100) }}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Answers Table -->
                                            <div class="overflow-x-auto">
                                                <table class="min-w-full divide-y divide-gray-200 text-sm">
                                                    <thead class="bg-gray-100">
                                                        <tr>
                                                            <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Q#</th>
                                                            <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                            <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
                                                            <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                                                            <th class="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody class="bg-white divide-y divide-gray-100">
                                                        <tr
                                                            v-for="answer in group.answers"
                                                            :key="answer.question_number"
                                                            :class="{'bg-red-50': !answer.is_correct && answer.user_answer}"
                                                        >
                                                            <td class="px-4 py-3 font-semibold text-gray-800">{{ answer.question_number }}</td>
                                                            <td class="px-4 py-3 text-xs text-gray-600">{{ answer.test_head }}</td>
                                                            <td class="px-4 py-3">
                                                                <span v-if="answer.user_answer" class="font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                                                                    {{ answer.user_answer }}
                                                                </span>
                                                                <span v-else class="text-gray-400 italic">No answer</span>
                                                                
                                                                <!-- MCMA Breakdown -->
                                                                <div v-if="answer.is_mcma && answer.mcma_breakdown" class="mt-2 space-y-1">
                                                                    <div class="text-xs font-semibold text-gray-600 mb-1">
                                                                        Breakdown (Score: {{ answer.mcma_score }}):
                                                                    </div>
                                                                    <div v-for="(item, idx) in answer.mcma_breakdown" :key="idx" 
                                                                         class="text-xs font-mono"
                                                                         :class="item.startsWith('✓') ? 'text-green-700' : 'text-red-700'">
                                                                        {{ item }}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td class="px-4 py-3">
                                                                <span v-if="answer.correct_answer" class="font-mono font-semibold text-gray-900 bg-green-50 px-2 py-1 rounded">
                                                                    {{ answer.correct_answer }}
                                                                </span>
                                                                <span v-else class="text-gray-400 italic">Not available</span>
                                                            </td>
                                                            <td class="px-4 py-3 text-center">
                                                                <span 
                                                                    v-if="answer.is_correct"
                                                                    class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700"
                                                                >
                                                                    <i data-feather="check" class="w-4 h-4"></i>
                                                                </span>
                                                                <span 
                                                                    v-else
                                                                    class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700"
                                                                >
                                                                    <i data-feather="x" class="w-4 h-4"></i>
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Modal Footer -->
                            <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button
                                    @click="closeAnswersDialog"
                                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Writing Dialog Modal -->
                <div v-if="showAnswersDialog && dialogSection === 'writing'" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                            <!-- Modal Header -->
                            <div class="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-4 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="bg-white/20 rounded-full p-2">
                                        <i data-feather="edit-3" class="w-5 h-5 text-white"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-white">Writing Assessment & Feedback</h3>
                                </div>
                                <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                    <i data-feather="x" class="w-5 h-5"></i>
                                </button>
                            </div>

                            <!-- Modal Body - Scrollable -->
                            <div class="flex-1 overflow-y-auto p-6">
                                <div v-if="results.writing_feedback && results.writing_feedback.length > 0">
                                    <!-- Overall Writing Band -->
                                    <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
                                        <div class="flex items-center justify-center gap-6">
                                            <div class="text-center">
                                                <div class="text-sm text-gray-600 mb-1">Overall Writing Band</div>
                                                <div class="text-4xl font-bold text-yellow-600">{{ formatBandScore(results.writing_band) }}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tasks -->
                                    <div class="space-y-6">
                                        <div
                                            v-for="(task, index) in results.writing_feedback"
                                            :key="index"
                                            class="border border-gray-200 rounded-lg overflow-hidden"
                                        >
                                            <!-- Task Header -->
                                            <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                <div class="flex items-center justify-between">
                                                    <h4 class="text-lg font-semibold text-gray-900">{{ task.task_type }}</h4>
                                                    <div class="text-2xl font-bold text-yellow-600">Band {{ formatBandScore(task.band) }}</div>
                                                </div>
                                            </div>

                                            <!-- Task Content -->
                                            <div class="p-6">
                                                <!-- Criteria Scores -->
                                                <div class="mb-6">
                                                    <h5 class="font-semibold text-gray-900 mb-3">Assessment Criteria</h5>
                                                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div 
                                                            v-for="(score, criterion) in task.criteria"
                                                            :key="criterion"
                                                            class="bg-gray-50 rounded-lg p-4 text-center"
                                                        >
                                                            <div class="text-xs text-gray-600 mb-2">{{ formatCriterion(criterion) }}</div>
                                                            <div class="text-2xl font-bold text-gray-900">{{ formatBandScore(score) }}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Feedback -->
                                                <div v-if="task.feedback" class="mb-6">
                                                    <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                        <i data-feather="message-circle" class="w-4 h-4 [#E75225]"></i>
                                                        Detailed Feedback
                                                    </h5>
                                                    
                                                    <!-- Criteria Feedback -->
                                                    <div class="space-y-3 mb-4">
                                                        <div v-if="task.feedback.task_response_or_achievement" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-4">
                                                            <h6 class="font-semibold text-gray-900 text-sm mb-2">Task Response / Achievement</h6>
                                                            <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.task_response_or_achievement }}</p>
                                                        </div>
                                                        
                                                        <div v-if="task.feedback.coherence_and_cohesion" class="bg-green-50 rounded-lg p-4">
                                                            <h6 class="font-semibold text-gray-900 text-sm mb-2">Coherence and Cohesion</h6>
                                                            <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.coherence_and_cohesion }}</p>
                                                        </div>
                                                        
                                                        <div v-if="task.feedback.lexical_resource" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-4">
                                                            <h6 class="font-semibold text-gray-900 text-sm mb-2">Lexical Resource</h6>
                                                            <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.lexical_resource }}</p>
                                                        </div>
                                                        
                                                        <div v-if="task.feedback.grammatical_range_and_accuracy" class="bg-yellow-50 rounded-lg p-4">
                                                            <h6 class="font-semibold text-gray-900 text-sm mb-2">Grammatical Range and Accuracy</h6>
                                                            <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.grammatical_range_and_accuracy }}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <!-- Overall Feedback -->
                                                    <div v-if="task.feedback.overall && task.feedback.overall.length > 0" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-4">
                                                        <h6 class="font-semibold text-gray-900 text-sm mb-3">Overall Feedback</h6>
                                                        <ul class="space-y-2">
                                                            <li v-for="(point, idx) in task.feedback.overall" :key="idx" class="flex items-start gap-2">
                                                                <span class="text-[#E75225] mt-1">•</span>
                                                                <p class="text-sm text-gray-700 leading-relaxed flex-1">{{ point }}</p>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                <!-- User Answer -->
                                                <div>
                                                    <div class="bg-gray-50 rounded-lg p-4">
                                                        <h5 class="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                                                            <span>Your Submission</span>
                                                            <span class="text-sm font-normal text-gray-600">{{ task.word_count }} words</span>
                                                        </h5>
                                                        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ task.user_answer }}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-center py-12">
                                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-feather="edit-3" class="w-10 h-10 text-gray-400"></i>
                                    </div>
                                    <p class="text-gray-500 font-medium">No writing submissions found</p>
                                </div>
                            </div>

                            <!-- Modal Footer -->
                            <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button
                                    @click="closeAnswersDialog"
                                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Speaking Dialog Modal -->
                <div v-if="showAnswersDialog && dialogSection === 'speaking'" class="fixed inset-0 z-50 overflow-y-auto" @click.self="closeAnswersDialog">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <!-- Background overlay -->
                        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="closeAnswersDialog"></div>

                        <!-- Center modal -->
                        <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                        <!-- Modal panel -->
                        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh]">
                            <div class="flex flex-col max-h-[90vh]">
                            <!-- Modal Header -->
                            <div class="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="bg-white/20 rounded-full p-2">
                                        <i data-feather="mic" class="w-5 h-5 text-white"></i>
                                    </div>
                                    <h3 class="text-xl font-bold text-white">Speaking Assessment & Feedback</h3>
                                </div>
                                <button @click="closeAnswersDialog" class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                    <i data-feather="x" class="w-5 h-5"></i>
                                </button>
                            </div>

                            <!-- Modal Body - Scrollable -->
                            <div class="flex-1 overflow-y-auto p-6">
                                <div v-if="results.speaking_feedback">
                                    <!-- Overall Speaking Band -->
                                    <div class="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-6 mb-6">
                                        <div class="flex items-center justify-center gap-6">
                                            <div class="text-center">
                                                <div class="text-sm text-gray-600 mb-1">Speaking Band Score</div>
                                                <div class="text-4xl font-bold text-red-600">{{ formatBandScore(results.speaking_band) }}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Criteria Scores -->
                                    <div v-if="results.speaking_criteria" class="mb-6">
                                        <h5 class="font-semibold text-gray-900 mb-3">Assessment Criteria</h5>
                                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div 
                                                v-for="(score, criterion) in results.speaking_criteria"
                                                :key="criterion"
                                                class="bg-gray-50 rounded-lg p-4 text-center"
                                            >
                                                <div class="text-xs text-gray-600 mb-2">{{ formatCriterion(criterion) }}</div>
                                                <div class="text-2xl font-bold text-gray-900">{{ formatBandScore(score) }}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Overall Feedback -->
                                    <div class="mb-6">
                                        <div class="bg-[rgba(231,82,37,0.05)] rounded-lg p-4">
                                            <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <i data-feather="message-circle" class="w-4 h-4 [#E75225]"></i>
                                                Overall Feedback
                                            </h5>
                                            <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ results.speaking_feedback }}</p>
                                        </div>
                                    </div>

                                    <!-- Audio Recording (if available) -->
                                    <div v-if="results.speaking_audio_url" class="mb-6">
                                        <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <i data-feather="volume-2" class="w-4 h-4 text-gray-600"></i>
                                            Your Recording
                                        </h5>
                                        <div class="bg-gray-50 rounded-lg p-4">
                                            <audio controls class="w-full">
                                                <source :src="results.speaking_audio_url" type="audio/mpeg">
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                    </div>

                                    <!-- Transcript (if available) -->
                                    <div v-if="results.speaking_transcript">
                                        <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <i data-feather="file-text" class="w-4 h-4 text-gray-600"></i>
                                            Transcript
                                        </h5>
                                        <div class="bg-gray-50 rounded-lg p-4">
                                            <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ results.speaking_transcript }}</p>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="text-center py-12">
                                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-feather="mic" class="w-10 h-10 text-gray-400"></i>
                                    </div>
                                    <p class="text-gray-500 font-medium">Speaking feedback is being processed...</p>
                                </div>
                            </div>

                            <!-- Modal Footer -->
                            <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button
                                    @click="closeAnswersDialog"
                                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Section View - Full Width -->
                <div v-if="activeSection" class="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
                    <!-- Tabs -->
                    <div class="border-b border-gray-200">
                        <div class="flex overflow-x-auto">
                            <button
                                v-for="tab in tabs"
                                :key="tab.key"
                                @click="activeSection = tab.key"
                                :class="[
                                    'px-6 py-4 font-semibold text-sm whitespace-nowrap transition-colors flex items-center gap-2',
                                    activeSection === tab.key
                                        ? 'border-b-2 #E75225 [#E75225]'
                                        : 'text-gray-600 hover:text-gray-900'
                                ]"
                            >
                                <i :data-feather="tab.icon" class="w-4 h-4"></i>
                                {{ tab.name }}
                            </button>
                        </div>
                    </div>

                    <!-- Section Content -->
                    <div class="p-6">
                        <!-- Listening/Reading Answers -->
                        <div v-if="activeSection === 'listening' || activeSection === 'reading'">
                            <!-- Section Statistics -->
                            <div class="bg-gradient-to-r from-[rgba(231,82,37,0.05)] to-[rgba(231,82,37,0.1)] rounded-lg p-6 mb-6">
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div class="text-center">
                                        <div class="text-3xl font-bold [#E75225]">
                                            {{ activeSection === 'listening' ? results.listening_score : results.reading_score }}
                                        </div>
                                        <div class="text-sm text-gray-600">Correct Answers</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-gray-700">
                                            {{ activeSection === 'listening' ? results.listening_total : results.reading_total }}
                                        </div>
                                        <div class="text-sm text-gray-600">Total Questions</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-[#E75225]">
                                            {{ getAccuracyPercentage(activeSection) }}%
                                        </div>
                                        <div class="text-sm text-gray-600">Accuracy</div>
                                    </div>
                                    <div class="text-center">
                                        <div class="text-3xl font-bold text-green-600">
                                            {{ formatBandScore(activeSection === 'listening' ? results.listening_band : results.reading_band) }}
                                        </div>
                                        <div class="text-sm text-gray-600">Band Score</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Performance Analysis -->
                            <div v-if="getSectionAnalysis(activeSection)" class="mb-6">
                                <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance by Question Type</h3>
                                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div 
                                        v-for="(stats, type) in getSectionAnalysis(activeSection).type_stats"
                                        :key="type"
                                        class="bg-white border border-gray-200 rounded-lg p-4"
                                    >
                                        <div class="flex items-center justify-between mb-2">
                                            <h5 class="font-medium text-gray-800 text-sm">{{ type }}</h5>
                                            <span class="text-xs font-semibold px-2 py-1 rounded-full"
                                                :class="getAccuracyClass(getSectionAnalysis(activeSection).accuracy_by_type?.[type] || 0)"
                                            >
                                                {{ Math.round((getSectionAnalysis(activeSection).accuracy_by_type?.[type] || 0) * 100) }}%
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <div class="flex-1 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    class="h-2 rounded-full transition-all duration-500"
                                                    :class="getAccuracyBarClass(getSectionAnalysis(activeSection).accuracy_by_type?.[type] || 0)"
                                                    :style="{width: ((getSectionAnalysis(activeSection).accuracy_by_type?.[type] || 0) * 100) + '%'}"
                                                ></div>
                                            </div>
                                            <span class="text-sm font-medium text-gray-600">
                                                {{ stats.correct }}/{{ stats.total }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Listening Part Analysis -->
                            <div v-if="activeSection === 'listening' && results.listening_analysis?.part_stats" class="mb-6">
                                <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance by Part</h3>
                                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div 
                                        v-for="(stats, part) in results.listening_analysis.part_stats"
                                        :key="part"
                                        class="bg-white border border-gray-200 rounded-lg p-4 text-center"
                                    >
                                        <div class="text-2xl font-bold text-gray-800 mb-1">{{ part }}</div>
                                        <div class="text-sm text-gray-600 mb-3">
                                            {{ stats.correct }}/{{ stats.total }} correct
                                        </div>
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                class="h-2 rounded-full transition-all duration-500"
                                                :class="getAccuracyBarClass(results.listening_analysis.accuracy_by_part?.[part] || 0)"
                                                :style="{width: ((results.listening_analysis.accuracy_by_part?.[part] || 0) * 100) + '%'}"
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Answer Review -->
                            <div class="mb-4">
                                <h3 class="text-xl font-bold text-gray-800 mb-2">Detailed Answer Review</h3>
                                <p class="text-gray-600">Review your answers and see the correct responses.</p>
                            </div>

                            <div class="space-y-6">
                                <div 
                                    v-for="group in getAnswerGroups(activeSection)"
                                    :key="group.id"
                                    class="border border-gray-200 rounded-lg overflow-hidden"
                                >
                                    <!-- Group Header -->
                                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <div class="flex items-center justify-between">
                                            <h4 class="font-semibold text-gray-900">{{ group.title }}</h4>
                                            <div class="flex items-center gap-2">
                                                <span class="text-sm font-medium text-gray-600">
                                                    {{ getGroupScore(group) }} correct
                                                </span>
                                                <span class="text-xs font-semibold px-2 py-1 rounded-full"
                                                    :class="getAccuracyClass(getGroupAccuracy(group))"
                                                >
                                                    {{ Math.round(getGroupAccuracy(group) * 100) }}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Answers Table -->
                                    <div class="overflow-x-auto">
                                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead class="bg-gray-100">
                                                <tr>
                                                    <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Q#</th>
                                                    <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                    <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
                                                    <th class="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Correct Answer</th>
                                                    <th class="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody class="bg-white divide-y divide-gray-100">
                                                <tr
                                                    v-for="answer in group.answers"
                                                    :key="answer.question_number"
                                                    :class="{'bg-red-50': !answer.is_correct && answer.user_answer}"
                                                >
                                                    <td class="px-4 py-3 font-semibold text-gray-800">{{ answer.question_number }}</td>
                                                    <td class="px-4 py-3 text-xs text-gray-600">{{ answer.test_head }}</td>
                                                    <td class="px-4 py-3">
                                                        <span v-if="answer.user_answer" class="font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                                                            {{ answer.user_answer }}
                                                        </span>
                                                        <span v-else class="text-gray-400 italic">No answer</span>
                                                        
                                                        <!-- MCMA Breakdown -->
                                                        <div v-if="answer.is_mcma && answer.mcma_breakdown" class="mt-2 space-y-1">
                                                            <div class="text-xs font-semibold text-gray-600 mb-1">
                                                                Breakdown (Score: {{ answer.mcma_score }}):
                                                            </div>
                                                            <div v-for="(item, idx) in answer.mcma_breakdown" :key="idx" 
                                                                 class="text-xs font-mono"
                                                                 :class="item.startsWith('✓') ? 'text-green-700' : 'text-red-700'">
                                                                {{ item }}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-3">
                                                        <span v-if="answer.correct_answer" class="font-mono font-semibold text-gray-900 bg-green-50 px-2 py-1 rounded">
                                                            {{ answer.correct_answer }}
                                                        </span>
                                                        <span v-else class="text-gray-400 italic">Not available</span>
                                                    </td>
                                                    <td class="px-4 py-3 text-center">
                                                        <span 
                                                            v-if="answer.is_correct"
                                                            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700"
                                                        >
                                                            <i data-feather="check" class="w-4 h-4"></i>
                                                        </span>
                                                        <span 
                                                            v-else
                                                            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700"
                                                        >
                                                            <i data-feather="x" class="w-4 h-4"></i>
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Writing Feedback -->
                        <div v-else-if="activeSection === 'writing'">
                            <div class="space-y-6">
                                <div
                                    v-for="task in results.writing_feedback"
                                    :key="task.task_type"
                                    class="border border-gray-200 rounded-lg p-6"
                                >
                                    <div class="flex items-center justify-between mb-4">
                                        <h4 class="text-lg font-semibold text-gray-900">{{ task.task_type }}</h4>
                                        <div class="text-2xl font-bold [#E75225]">Band {{ formatBandScore(task.band) }}</div>
                                    </div>

                                    <!-- Criteria Scores -->
                                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                        <div 
                                            v-for="(score, criterion) in task.criteria"
                                            :key="criterion"
                                            class="bg-gray-50 rounded-lg p-3"
                                        >
                                            <div class="text-xs text-gray-600 mb-1">{{ formatCriterion(criterion) }}</div>
                                            <div class="text-xl font-bold text-gray-900">{{ formatBandScore(score) }}</div>
                                        </div>
                                    </div>

                                    <!-- Feedback -->
                                    <div v-if="task.feedback" class="mb-4">
                                        <h5 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <i data-feather="message-circle" class="w-4 h-4 [#E75225]"></i>
                                            Detailed Feedback
                                        </h5>
                                        
                                        <!-- Criteria Feedback -->
                                        <div class="space-y-3 mb-3">
                                            <div v-if="task.feedback.task_response_or_achievement" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-3">
                                                <h6 class="font-semibold text-gray-900 text-xs mb-2">Task Response / Achievement</h6>
                                                <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.task_response_or_achievement }}</p>
                                            </div>
                                            
                                            <div v-if="task.feedback.coherence_and_cohesion" class="bg-green-50 rounded-lg p-3">
                                                <h6 class="font-semibold text-gray-900 text-xs mb-2">Coherence and Cohesion</h6>
                                                <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.coherence_and_cohesion }}</p>
                                            </div>
                                            
                                            <div v-if="task.feedback.lexical_resource" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-3">
                                                <h6 class="font-semibold text-gray-900 text-xs mb-2">Lexical Resource</h6>
                                                <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.lexical_resource }}</p>
                                            </div>
                                            
                                            <div v-if="task.feedback.grammatical_range_and_accuracy" class="bg-yellow-50 rounded-lg p-3">
                                                <h6 class="font-semibold text-gray-900 text-xs mb-2">Grammatical Range and Accuracy</h6>
                                                <p class="text-sm text-gray-700 leading-relaxed">{{ task.feedback.grammatical_range_and_accuracy }}</p>
                                            </div>
                                        </div>
                                        
                                        <!-- Overall Feedback -->
                                        <div v-if="task.feedback.overall && task.feedback.overall.length > 0" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-3">
                                            <h6 class="font-semibold text-gray-900 text-xs mb-2">Overall Feedback</h6>
                                            <ul class="space-y-2">
                                                <li v-for="(point, idx) in task.feedback.overall" :key="idx" class="flex items-start gap-2">
                                                    <span class="text-[#E75225] mt-0.5">•</span>
                                                    <p class="text-sm text-gray-700 leading-relaxed flex-1">{{ point }}</p>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    <!-- User Answer -->
                                    <div class="bg-gray-50 rounded-lg p-4">
                                        <h5 class="font-semibold text-gray-900 mb-2">Your Answer ({{ task.word_count }} words)</h5>
                                        <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ task.user_answer }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Speaking Feedback -->
                        <div v-else-if="activeSection === 'speaking'">
                            <div class="border border-gray-200 rounded-lg p-6">
                                <div class="flex items-center justify-between mb-6">
                                    <h4 class="text-lg font-semibold text-gray-900">Speaking Assessment</h4>
                                    <div class="text-2xl font-bold [#E75225]">Band {{ formatBandScore(results.speaking_band) }}</div>
                                </div>

                                <!-- Criteria Scores -->
                                <div v-if="results.speaking_criteria" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div 
                                        v-for="(score, criterion) in results.speaking_criteria"
                                        :key="criterion"
                                        class="bg-gray-50 rounded-lg p-3"
                                    >
                                        <div class="text-xs text-gray-600 mb-1">{{ formatCriterion(criterion) }}</div>
                                        <div class="text-xl font-bold text-gray-900">{{ formatBandScore(score) }}</div>
                                    </div>
                                </div>

                                <!-- Feedback -->
                                <div v-if="results.speaking_feedback" class="bg-[rgba(231,82,37,0.05)] rounded-lg p-4">
                                    <h5 class="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <i data-feather="message-circle" class="w-4 h-4 [#E75225]"></i>
                                        Overall Feedback
                                    </h5>
                                    <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ results.speaking_feedback }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recommendations - Minimalist & Creative Design - Full Width -->
                <div v-if="results.recommendations && results.recommendations.length > 0" class="mb-8">
                    <!-- Header Section -->
                    <div class="text-center mb-8 md:mb-10">
                        <div class="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#E75225] to-[#d14520] rounded-2xl mb-4 shadow-lg">
                            <i data-feather="compass" class="w-6 h-6 md:w-8 md:h-8 text-white"></i>
                        </div>
                        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Your Roadmap to Success</h2>
                        <p class="text-sm md:text-base text-gray-600 max-w-3xl mx-auto px-4">
                            Personalized recommendations to help you achieve your target band score
                        </p>
                    </div>

                    <!-- Recommendations Timeline - Two Column Layout on Large Screens -->
                    <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-8">
                        <!-- Left Column -->
                        <div 
                            v-for="(recommendation, index) in results.recommendations"
                            :key="index"
                            class="relative group"
                        >
                            <!-- Card Content -->
                            <div class="relative">
                                <!-- Card -->
                                <div class="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-gray-200 h-full">
                                    <!-- Priority Badge & Number -->
                                    <div class="flex items-start justify-between mb-3 flex-wrap gap-2">
                                        <div class="flex items-center gap-2 sm:gap-3">
                                            <div class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-base sm:text-lg transition-all duration-300"
                                                 :class="getRecommendationBadgeClass(index)"
                                            >
                                                {{ index + 1 }}
                                            </div>
                                            <span class="text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full whitespace-nowrap"
                                                  :class="getRecommendationPriorityClass(index)"
                                            >
                                                {{ getRecommendationPriority(index) }}
                                            </span>
                                        </div>

                                        
                                        <!-- Action Icon -->
                                        <div class="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div class="w-8 h-8 rounded-lg bg-[rgba(231,82,37,0.05)] flex items-center justify-center">
                                                <i data-feather="arrow-right" class="w-4 h-4 [#E75225]"></i>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Recommendation Text -->
                                    <p class="text-sm sm:text-base text-gray-800 leading-relaxed">
                                        {{ recommendation }}
                                    </p>
                                    
                                    <!-- Progress Indicator (decorative) -->
                                    <div class="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                                        <div class="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 flex-wrap gap-2">
                                            <span class="flex items-center gap-1">
                                                <i data-feather="target" class="w-3 h-3"></i>
                                                Focus Area
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <i data-feather="trending-up" class="w-3 h-3"></i>
                                                Impact: {{ getImpactLevel(index) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Summary Stats - Full Width -->
                    <div class="mt-8 lg:mt-10 max-w-7xl mx-auto">
                        <div class="bg-gradient-to-r from-[rgba(231,82,37,0.05)] to-[rgba(231,82,37,0.1)] rounded-2xl p-4 sm:p-6 border border-[rgba(231,82,37,0.1)]">
                            <div class="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                                <div>
                                    <div class="text-2xl sm:text-3xl font-bold [#E75225] mb-1">{{ results.recommendations.length }}</div>
                                    <div class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-wide">Action Items</div>
                                </div>
                                <div>
                                    <div class="text-2xl sm:text-3xl font-bold text-[#E75225] mb-1">{{ getHighPriorityCount() }}</div>
                                    <div class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-wide">High Priority</div>
                                </div>
                                <div>
                                    <div class="text-2xl sm:text-3xl font-bold text-[#E75225] mb-1">{{ formatBandScore(results.overall_band) }}</div>
                                    <div class="text-[10px] sm:text-xs text-gray-600 uppercase tracking-wide">Current Band</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    `,

    props: {
        attemptId: {
            type: String,
            required: true
        }
    },

    setup(props) {
        const { ref, computed, onMounted, nextTick, watch } = Vue;

        const results = ref(null);
        const loading = ref(true);
        const error = ref(null);
        const activeSection = ref(null);
        const speakingChart = ref(null);
        const showAnswersDialog = ref(false);
        const dialogSection = ref(null);        // Calculate SVG circle progress
        const overallDashArray = computed(() => {
            if (!results.value || !results.value.overall_band) return '0 339';
            const progress = (results.value.overall_band / 9) * 339;
            return `${progress} 339`;
        });

        const tabs = computed(() => [
            { key: 'listening', name: 'Listening', icon: 'headphones' },
            { key: 'reading', name: 'Reading', icon: 'book-open' },
            { key: 'writing', name: 'Writing', icon: 'edit-3' },
            { key: 'speaking', name: 'Speaking', icon: 'mic' }
        ]);

        const sections = computed(() => {
            if (!results.value) return [];
            return [
                {
                    key: 'listening',
                    name: 'Listening',
                    icon: 'headphones',
                    band: results.value.listening_band,
                    score: results.value.listening_score,
                    total: results.value.listening_total,
                    colorBg: '[rgba(231,82,37,0.1)]',
                    colorText: '[#E75225]'
                },
                {
                    key: 'reading',
                    name: 'Reading',
                    icon: 'book-open',
                    band: results.value.reading_band,
                    score: results.value.reading_score,
                    total: results.value.reading_total,
                    colorBg: 'bg-green-100',
                    colorText: 'text-green-600'
                },
                {
                    key: 'writing',
                    name: 'Writing',
                    icon: 'edit-3',
                    band: results.value.writing_band,
                    score: '-',
                    total: '-',
                    colorBg: 'bg-[rgba(231,82,37,0.1)]',
                    colorText: 'text-[#E75225]'
                },
                {
                    key: 'speaking',
                    name: 'Speaking',
                    icon: 'mic',
                    band: results.value.speaking_band,
                    score: '-',
                    total: '-',
                    colorBg: 'bg-orange-100',
                    colorText: 'text-orange-600'
                }
            ];
        });

        function getAnswerGroups(sectionKey) {
            if (!results.value) return [];

            const answerGroups = sectionKey === 'listening'
                ? results.value.listening_answers
                : results.value.reading_answers;

            if (!answerGroups || answerGroups.length === 0) return [];

            // Return the groups as-is since they're already properly structured
            return answerGroups.map(group => ({
                id: group.id,
                title: group.title,
                test_head: group.test_head,
                answers: group.answers || []
            }));
        }

        function getGroupScore(group) {
            if (!group.answers) return '0/0';
            const correct = group.answers.filter(a => a.is_correct).length;
            const total = group.answers.length;
            return `${correct}/${total}`;
        }

        function getGroupAccuracy(group) {
            if (!group.answers || group.answers.length === 0) return 0;
            const correct = group.answers.filter(a => a.is_correct).length;
            return correct / group.answers.length;
        }

        function getAccuracyPercentage(sectionKey) {
            if (!results.value) return 0;
            const score = sectionKey === 'listening' ? results.value.listening_score : results.value.reading_score;
            const total = sectionKey === 'listening' ? results.value.listening_total : results.value.reading_total;
            if (!total) return 0;
            return Math.round((score / total) * 100);
        }

        function getSectionAnalysis(sectionKey) {
            if (!results.value) return null;
            return sectionKey === 'listening'
                ? results.value.listening_analysis
                : results.value.reading_analysis;
        }

        function getAccuracyClass(accuracy) {
            if (accuracy >= 0.8) return 'bg-green-100 text-green-700';
            if (accuracy >= 0.6) return 'bg-yellow-100 text-yellow-700';
            return 'bg-red-100 text-red-700';
        }

        function getAccuracyBarClass(accuracy) {
            if (accuracy >= 0.8) return 'bg-green-500';
            if (accuracy >= 0.6) return 'bg-yellow-500';
            return 'bg-red-500';
        }

        function formatCriterion(criterion) {
            return criterion
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        async function loadResults() {
            loading.value = true;
            error.value = null;
            try {
                const response = await axios.get(`/exams/api/attempt/${props.attemptId}/results/`);
                const data = response.data;

                // Transform new API structure to match component expectations
                const transformedData = {
                    test_title: data.exam_title,
                    exam_type: data.exam_type,
                    completed_at: data.completed_at,
                    duration: data.duration_minutes,

                    // Listening section
                    listening_band: data.sections?.listening?.band_score || 0,
                    listening_score: data.sections?.listening?.correct_answers || 0,
                    listening_total: data.sections?.listening?.total_questions || 0,
                    listening_analysis: {
                        accuracy_by_part: data.sections?.listening?.accuracy_by_part || {},
                        accuracy_by_type: data.sections?.listening?.accuracy_by_type || {},
                        part_stats: data.sections?.listening?.part_stats || {},
                        type_stats: data.sections?.listening?.type_stats || {}
                    },
                    listening_answers: data.sections?.listening?.answer_groups || [],

                    // Reading section
                    reading_band: data.sections?.reading?.band_score || 0,
                    reading_score: data.sections?.reading?.correct_answers || 0,
                    reading_total: data.sections?.reading?.total_questions || 0,
                    reading_analysis: {
                        accuracy_by_type: data.sections?.reading?.accuracy_by_type || {},
                        type_stats: data.sections?.reading?.type_stats || {}
                    },
                    reading_answers: data.sections?.reading?.answer_groups || [],

                    // Writing section
                    writing_band: data.sections?.writing?.overall_band_score || null,
                    writing_feedback: data.sections?.writing?.tasks || [],

                    // Speaking section
                    speaking_band: data.sections?.speaking?.overall_band_score || null,
                    speaking_feedback: data.sections?.speaking?.parts || [],
                    speaking_criteria: data.sections?.speaking?.feedback || null,

                    // Calculate overall band (average of available section scores)
                    overall_band: (() => {
                        const scores = [];
                        if (data.sections?.listening?.band_score) scores.push(data.sections.listening.band_score);
                        if (data.sections?.reading?.band_score) scores.push(data.sections.reading.band_score);
                        if (data.sections?.writing?.overall_band_score) scores.push(data.sections.writing.overall_band_score);
                        if (data.sections?.speaking?.overall_band_score) scores.push(data.sections.speaking.overall_band_score);

                        if (scores.length === 0) return 0;
                        const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                        // Round to nearest 0.5
                        return Math.round(avg * 2) / 2;
                    })(),

                    // Insights
                    strengths: data.insights?.strengths || [],
                    weaknesses: data.insights?.weaknesses || [],
                    recommendations: data.insights?.weaknesses?.map(w => w.tip) || []
                };

                results.value = transformedData;

                console.log('✅ Results loaded successfully:', {
                    test_title: transformedData.test_title,
                    overall_band: transformedData.overall_band,
                    listening: {
                        band: transformedData.listening_band,
                        score: `${transformedData.listening_score}/${transformedData.listening_total}`
                    },
                    reading: {
                        band: transformedData.reading_band,
                        score: `${transformedData.reading_score}/${transformedData.reading_total}`
                    },
                    writing: {
                        band: transformedData.writing_band
                    },
                    speaking: {
                        band: transformedData.speaking_band
                    },
                    strengths_count: transformedData.strengths?.length || 0,
                    weaknesses_count: transformedData.weaknesses?.length || 0,
                    recommendations_count: transformedData.recommendations?.length || 0
                });

                // Initialize icons after data loads
                nextTick(() => {
                    if (window.feather) {
                        window.feather.replace();
                        console.log('✓ Feather icons initialized after data load');
                    } else {
                        console.warn('⚠️  Feather icons library not found');
                    }
                });
            } catch (err) {
                console.error('❌ Failed to load results:', err);
                if (err.response?.status === 400) {
                    error.value = 'Test not yet completed or scores are still being calculated.';
                } else if (err.response?.status === 404) {
                    error.value = 'Test results not found. Please ensure you have submitted the test.';
                } else if (err.response?.status === 500) {
                    error.value = 'Server error while calculating results. Please try again or contact support.';
                } else {
                    error.value = err.response?.data?.error || err.message || 'Failed to load test results.';
                }

                // Initialize icons even in error state
                nextTick(() => {
                    if (window.feather) {
                        window.feather.replace();
                        console.log('✓ Feather icons initialized in error state');
                    }
                });
            } finally {
                loading.value = false;
            }
        }

        function initializeSpeakingChart() {
            if (!results.value?.speaking_criteria || !speakingChart.value) return;

            const ctx = speakingChart.value.getContext('2d');
            const criteria = results.value.speaking_criteria;

            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: Object.keys(criteria).map(k => formatCriterion(k)),
                    datasets: [{
                        label: 'Your Score',
                        data: Object.values(criteria),
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
                    }]
                },
                options: {
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 9,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function formatDuration(minutes) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }

        function getCEFRLevel(band) {
            if (!band) return 'N/A';
            if (band >= 8) return 'C2';
            if (band >= 7) return 'C1';
            if (band >= 5.5) return 'B2';
            if (band >= 4.5) return 'B1';
            if (band >= 3.5) return 'A2';
            return 'A1';
        }

        function getStrengthsCount() {
            return results.value?.strengths?.length || 0;
        }

        function getWeaknessesCount() {
            return results.value?.weaknesses?.length || 0;
        }

        function getRecommendationColor(index) {
            const colors = [
                'border-[#E75225]',
                'border-[#E75225]',
                'border-[#E75225]',
                'border-pink-500',
                'border-red-500',
                'border-orange-500'
            ];
            return colors[index % colors.length];
        }

        function getRecommendationBadgeClass(index) {
            const classes = [
                '[rgba(231,82,37,0.1)] [#E75225]',
                'bg-[rgba(231,82,37,0.1)] text-[#E75225]',
                'bg-[rgba(231,82,37,0.1)] text-[#E75225]',
                'bg-pink-100 text-pink-700',
                'bg-red-100 text-red-700',
                'bg-orange-100 text-orange-700'
            ];
            return classes[index % classes.length];
        }

        function getRecommendationPriority(index) {
            if (index < 2) return 'High Priority';
            if (index < 4) return 'Medium Priority';
            return 'Recommended';
        }

        function getRecommendationPriorityClass(index) {
            if (index < 2) return 'bg-red-100 text-red-700';
            if (index < 4) return 'bg-yellow-100 text-yellow-700';
            return 'bg-green-100 text-green-700';
        }

        function getImpactLevel(index) {
            if (index < 2) return 'High';
            if (index < 4) return 'Medium';
            return 'Low';
        }

        function getHighPriorityCount() {
            const total = results.value?.recommendations?.length || 0;
            return Math.min(2, total);
        }

        function formatBandScore(score) {
            if (!score || score === 0) return '0.0';
            // Ensure score is displayed with one decimal place
            return parseFloat(score).toFixed(1);
        }

        function exportPDF() {
            window.print();
        }

        function downloadReport() {
            window.print();
        }

        function openAnswersDialog(section) {
            // Validate section has data before opening
            if (section === 'writing' && (!results.value.writing_feedback || results.value.writing_feedback.length === 0)) {
                return;
            }
            if (section === 'speaking' && !results.value.speaking_feedback) {
                return;
            }

            dialogSection.value = section;
            showAnswersDialog.value = true;

            // Initialize icons after dialog opens
            nextTick(() => {
                if (window.feather) {
                    window.feather.replace();
                    console.log('✓ Feather icons initialized in dialog');
                }
            });
        }

        function closeAnswersDialog() {
            showAnswersDialog.value = false;
            dialogSection.value = null;
        }

        function hasSection(sectionName) {
            if (!results.value || !results.value.exam_type) return true; // Show all if exam_type not available

            const examType = results.value.exam_type;

            // Define which sections are available for each exam type
            const sectionMap = {
                'LISTENING': ['listening'],
                'READING': ['reading'],
                'WRITING': ['writing'],
                'SPEAKING': ['speaking'],
                'LISTENING_READING': ['listening', 'reading'],
                'LISTENING_READING_WRITING': ['listening', 'reading', 'writing'],
                'FULL_TEST': ['listening', 'reading', 'writing', 'speaking']
            };

            const availableSections = sectionMap[examType] || [];
            return availableSections.includes(sectionName);
        }

        onMounted(() => {
            loadResults();

            // Initialize Feather icons on mount
            nextTick(() => {
                if (window.feather) {
                    window.feather.replace();
                    console.log('✓ Feather icons initialized on mount');
                }
            });
        });

        // Watch for activeSection changes and re-initialize icons
        watch(activeSection, () => {
            nextTick(() => {
                if (window.feather) {
                    window.feather.replace();
                    console.log('✓ Feather icons re-initialized after section change');
                }
            });
        });

        // Watch for loading state changes to re-initialize icons
        watch(loading, (newVal) => {
            if (!newVal) {
                nextTick(() => {
                    if (window.feather) {
                        window.feather.replace();
                        console.log('✓ Feather icons re-initialized after loading');
                    }
                });
            }
        });

        return {
            results,
            loading,
            error,
            activeSection,
            showAnswersDialog,
            dialogSection,
            overallDashArray,
            tabs,
            sections,
            getAnswerGroups,
            getGroupScore,
            getGroupAccuracy,
            getAccuracyPercentage,
            getSectionAnalysis,
            getAccuracyClass,
            getAccuracyBarClass,
            formatCriterion,
            formatDate,
            formatDuration,
            getCEFRLevel,
            getStrengthsCount,
            getWeaknessesCount,
            getRecommendationColor,
            getRecommendationBadgeClass,
            getRecommendationPriority,
            getRecommendationPriorityClass,
            getImpactLevel,
            getHighPriorityCount,
            formatBandScore,
            exportPDF,
            downloadReport,
            openAnswersDialog,
            closeAnswersDialog,
            hasSection,
            loadResults
        };
    }
});
