(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initManagerApp);
    } else {
        initManagerApp();
    }

    function initManagerApp() {
        const { createApp } = Vue;

        const app = createApp({
            data() {
                return {
                    currentRoute: 'dashboard',
                    routeParams: {},
                    isLoading: false,
                    sidebarOpen: false,
                };
            },

            computed: {
                currentComponent() {
                    const routes = {
                        'dashboard': 'dashboard-component',
                        'students': 'students-component',
                        'student-detail': 'student-detail-component',
                        'reading-tests': 'reading-tests-component',
                        'passage-form': 'passage-form-component',
                        'test-heads': 'test-heads-component',
                        'question-builder': 'question-builder-component',
                        'listening-tests': 'listening-tests-component',
                        'writing-tasks': 'writing-tasks-component',
                        'speaking-topics': 'speaking-topics-component',
                        'mock-tests': 'mock-tests-component',
                        'mock-test-details': 'mock-test-details-component',
                        'mock-test-form': 'mock-test-form-component',
                        'exams': 'exams-component',
                        'exam-details': 'exam-details-component',
                        'exam-form': 'exam-form-component',
                        'results': 'results-component',
                        'student-result-detail': 'student-result-detail-component',
                        'ai-generator': 'ai-content-generator-component',
                    };
                    return routes[this.currentRoute] || 'dashboard-component';
                },
            },

            mounted() {
                this.initRouter();
                this.setupFeatherObserver();
            },

            beforeUnmount() {
                window.removeEventListener('popstate', this.handlePopState);
                if (typeof FeatherUtils !== 'undefined') {
                    FeatherUtils.stopAutoReplace();
                }
            },

            methods: {
                initRouter() {
                    const path = window.location.pathname;
                    this.handleRoute(path, false);
                    window.addEventListener('popstate', this.handlePopState);
                },

                handlePopState(event) {
                    const path = event.state?.path || window.location.pathname;
                    this.handleRoute(path, false);
                },

                handleRoute(path, pushState = true) {
                    const basePath = '/manager/';
                    const routePath = path.replace(basePath, '').replace(/^\/+|\/+$/g, '') || 'dashboard';

                    const segments = routePath.split('/');
                    const route = segments[0];

                    if (route === 'students' && segments[1]) {
                        this.currentRoute = 'student-detail';
                        this.routeParams = { userId: segments[1] };
                    } else if (route === 'reading-tests' && segments[1] === 'passage') {
                        this.currentRoute = 'passage-form';
                        this.routeParams = segments[2] === 'new' ? { mode: 'create' } : { mode: 'edit', id: segments[2] };
                    } else if (route === 'reading-tests' && segments[1] === 'testheads' && segments[2]) {
                        this.currentRoute = 'test-heads';
                        this.routeParams = { passageId: parseInt(segments[2]), testType: 'reading' };
                    } else if (route === 'listening-tests' && segments[1] === 'testheads' && segments[2]) {
                        this.currentRoute = 'test-heads';
                        this.routeParams = { listeningPartId: parseInt(segments[2]), testType: 'listening' };
                    } else if (route === 'mock-tests' && segments[1] === 'new') {
                        this.currentRoute = 'mock-test-form';
                        this.routeParams = { mode: 'create' };
                    } else if (route === 'mock-tests' && segments[1] === 'edit' && segments[2]) {
                        this.currentRoute = 'mock-test-form';
                        this.routeParams = { mode: 'edit', testId: parseInt(segments[2]) };
                    } else if (route === 'mock-tests' && segments[1]) {
                        this.currentRoute = 'mock-test-details';
                        this.routeParams = { testId: parseInt(segments[1]) };
                    } else if (route === 'exams' && segments[1] === 'new') {
                        this.currentRoute = 'exam-form';
                        this.routeParams = { mode: 'create' };
                    } else if (route === 'exams' && segments[1] === 'edit' && segments[2]) {
                        this.currentRoute = 'exam-form';
                        this.routeParams = { mode: 'edit', examId: parseInt(segments[2]) };
                    } else if (route === 'exams' && segments[1] && segments[1] !== 'new' && segments[1] !== 'edit') {
                        this.currentRoute = 'exam-details';
                        this.routeParams = { examId: parseInt(segments[1]) };
                    } else if (route === 'results' && segments[1] === 'attempt' && segments[2]) {
                        this.currentRoute = 'student-result-detail';
                        this.routeParams = {
                            attemptId: parseInt(segments[2]),
                            examId: segments[3] ? parseInt(segments[3]) : null
                        };
                    } else {
                        this.currentRoute = route;
                        this.routeParams = {};
                    }

                    if (pushState) {
                        window.history.pushState({ path }, '', path);
                    }

                    this.updateActiveNav(this.currentRoute);
                    window.scrollTo(0, 0);
                },

                navigateTo(route, params = {}) {
                    let path = `/manager/${route}`;

                    // Handle special route patterns
                    if (route === 'student-detail' && params.userId) {
                        path = `/manager/students/${params.userId}`;
                    } else if (route === 'passage-form') {
                        path = params.mode === 'create'
                            ? '/manager/reading-tests/passage/new'
                            : `/manager/reading-tests/passage/${params.id}`;
                    } else if (route === 'test-heads') {
                        if (params.testType === 'reading' && params.passageId) {
                            path = `/manager/reading-tests/testheads/${params.passageId}`;
                        } else if (params.testType === 'listening' && params.listeningPartId) {
                            path = `/manager/listening-tests/testheads/${params.listeningPartId}`;
                        }
                    } else if (route === 'create-mock-test') {
                        path = '/manager/mock-tests/new';
                        params = { mode: 'create' };
                    } else if (route === 'edit-mock-test' && params.testId) {
                        path = `/manager/mock-tests/edit/${params.testId}`;
                        params = { mode: 'edit', testId: params.testId };
                    } else if (route === 'mock-test-details' && params.testId) {
                        path = `/manager/mock-tests/${params.testId}`;
                    } else if (route === 'exam-form') {
                        if (params.mode === 'create') {
                            path = '/manager/exams/new';
                        } else if (params.mode === 'edit' && params.examId) {
                            path = `/manager/exams/edit/${params.examId}`;
                        }
                    } else if (route === 'exam-details' && params.examId) {
                        path = `/manager/exams/${params.examId}`;
                    } else if (route === 'student-result-detail' && params.attemptId) {
                        path = `/manager/results/attempt/${params.attemptId}`;
                        if (params.examId) {
                            path += `/${params.examId}`;
                        }
                    } else if (route.includes('/')) {
                        // Handle nested routes like 'reading-tests/passage/new'
                        path = `/manager/${route}`;
                    }

                    this.routeParams = params;
                    this.handleRoute(path, true);
                },

                updateActiveNav(route) {
                    this.$nextTick(() => {
                        document.querySelectorAll('[data-nav-link]').forEach(link => {
                            const linkRoute = link.getAttribute('data-nav-link');
                            if (linkRoute === route) {
                                link.classList.add('bg-orange-50', 'text-orange-700');
                                link.classList.remove('text-gray-700');
                            } else {
                                link.classList.remove('bg-orange-50', 'text-orange-700');
                                link.classList.add('text-gray-700');
                            }
                        });
                    });
                },

                toggleSidebar() {
                    this.sidebarOpen = !this.sidebarOpen;
                },

                closeSidebar() {
                    this.sidebarOpen = false;
                },

                setupFeatherObserver() {
                    this.$nextTick(async () => {
                        if (typeof FeatherUtils !== 'undefined') {
                            const loaded = await FeatherUtils.waitForLoad(3000);
                            if (loaded) {
                                FeatherUtils.replace();
                                FeatherUtils.startAutoReplace();
                            }
                        }
                    });
                },
            },

            template: `
                <div class="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
                    <sidebar-component
                        :current-route="currentRoute"
                        :sidebar-open="sidebarOpen"
                        @navigate="navigateTo"
                        @close-sidebar="closeSidebar"
                    />

                    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <header-component
                            :sidebar-open="sidebarOpen"
                            @toggle-sidebar="toggleSidebar"
                        />

                        <main class="flex-1 overflow-y-auto p-6 lg:p-8">
                            <div class="mx-auto">
                                <component 
                                    :is="currentComponent" 
                                    v-bind="routeParams"
                                    @navigate="navigateTo"
                                />
                            </div>
                        </main>
                    </div>
                </div>
            `,
        });

        app.component('header-component', window.Header);
        app.component('sidebar-component', window.Sidebar);
        app.component('dashboard-component', window.Dashboard);
        app.component('students-component', window.Students);
        app.component('student-detail-component', window.StudentDetail);
        app.component('reading-tests-component', window.ReadingTests);
        app.component('passage-form-component', window.PassageForm);
        app.component('test-heads-component', window.TestHeadsComponent);
        app.component('listening-tests-component', window.ListeningTestsComponent);
        app.component('writing-tasks-component', window.WritingTasks);
        app.component('speaking-topics-component', window.SpeakingTopics);
        app.component('mock-tests-component', window.MockTests);
        app.component('mock-test-details-component', window.MockTestDetails);
        app.component('mock-test-form-component', window.MockTestForm);
        app.component('exams-component', window.Exams);
        app.component('exam-details-component', window.ExamDetails);
        app.component('exam-form-component', window.ExamForm);
        app.component('results-component', window.Results);
        app.component('student-result-detail-component', window.StudentResultDetail);
        app.component('ai-content-generator-component', window.AIContentGenerator);

        app.component('loading-spinner', window.LoadingSpinner);
        app.component('empty-state', window.EmptyState);
        app.component('modal-component', window.Modal);
        app.component('pagination', window.Pagination);
        app.component('badge-component', window.Badge);
        app.component('alert-component', window.Alert);

        app.component('mcq-builder', window.MCQBuilderComponent);
        app.component('tfng-builder', window.TFNGBuilderComponent);
        app.component('matching-builder', window.MatchingBuilderComponent);
        app.component('summary-completion-builder', window.SummaryCompletionBuilderComponent);
        app.component('note-completion-builder', window.NoteCompletionBuilderComponent);
        app.component('form-completion-builder', window.FormCompletionBuilderComponent);
        app.component('table-completion-builder', window.TableCompletionBuilderComponent);
        app.component('diagram-labeling-builder', window.DiagramLabelingBuilderComponent);
        app.component('map-labeling-builder', window.MapLabelingBuilderComponent);
        app.component('standard-question-form', window.StandardQuestionFormComponent);
        app.component('question-list', window.QuestionListComponent);
        app.component('bulk-add', window.BulkAddComponent);
        app.component('question-builder-component', window.QuestionBuilderComponent);

        app.mount('#manager-app');
    }
})();
