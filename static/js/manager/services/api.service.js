class ManagerAPI {
    constructor() {
        this.baseURL = '/manager/api';
        // Set to true if frontend is on a different domain than backend
        this.crossDomain = false;
        // Flag to prevent multiple redirects
        this.redirecting = false;
    }

    /**
     * Get JWT access token from localStorage
     * @returns {string|null} JWT access token
     */
    getAccessToken() {
        return localStorage.getItem('access_token');
    }

    /**
     * Get JWT refresh token from localStorage
     * @returns {string|null} JWT refresh token
     */
    getRefreshToken() {
        return localStorage.getItem('refresh_token');
    }

    /**
     * Set JWT tokens in localStorage
     * @param {string} accessToken - JWT access token
     * @param {string} refreshToken - JWT refresh token
     */
    setTokens(accessToken, refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }

    /**
     * Clear JWT tokens from localStorage
     */
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    /**
     * Get CSRF token from cookie or meta tag (fallback for non-JWT endpoints)
     * @returns {string|null} CSRF token value
     */
    getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 10) === 'csrftoken=') {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        // Fallback to meta tag if cookie not found
        if (!cookieValue) {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                cookieValue = metaTag.getAttribute('content');
            }
        }
        return cookieValue;
    }

    /**
     * Make an authenticated API request
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Fetch options
     * @returns {Promise} Response data
     */
    async request(endpoint, options = {}) {
        // Prevent API calls if we're redirecting to login
        if (this.redirecting) {
            throw new Error('Redirecting to login');
        }

        const url = `${this.baseURL}${endpoint}`;
        const accessToken = this.getAccessToken();
        const csrfToken = this.getCSRFToken();

        const defaultOptions = {
            // Use 'include' for cross-domain, 'same-origin' for same domain
            credentials: this.crossDomain ? 'include' : 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Add JWT Authorization header if token exists
        if (accessToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // Add CSRF token header if available (for backward compatibility)
        if (csrfToken) {
            defaultOptions.headers['X-CSRFToken'] = csrfToken;
        }

        const config = { ...defaultOptions, ...options };

        // Merge headers properly
        if (options.headers) {
            config.headers = { ...defaultOptions.headers, ...options.headers };
        }

        // Remove Content-Type for FormData (browser will set it with boundary)
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(url, config);

            // Handle authentication errors
            if (response.status === 401 || response.status === 403) {
                // Try to refresh token if we have a refresh token
                const refreshToken = this.getRefreshToken();
                if (refreshToken && !endpoint.includes('/auth/')) {
                    try {
                        const refreshed = await this.refreshAccessToken();
                        if (refreshed) {
                            // Retry the original request with new token
                            config.headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
                            const retryResponse = await fetch(url, config);

                            if (retryResponse.ok) {
                                if (retryResponse.status === 204) {
                                    return null;
                                }
                                return await retryResponse.json();
                            }
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                    }
                }

                // Set flag to prevent further API calls
                if (!this.redirecting) {
                    this.redirecting = true;
                    console.error('Authentication error, redirecting to login...');

                    // Clear tokens before redirect
                    this.clearTokens();

                    // Redirect after a short delay to allow cleanup
                    setTimeout(() => {
                        window.location.href = '/login/';
                    }, 100);
                }
                throw new Error('Authentication required');
            }

            // Handle other error responses
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));

                // For bulk operations (like Excel upload), we might have partial success
                // Return the data even on 400 if it contains created/failed counts
                if (response.status === 400 && error.created !== undefined) {
                    return error;
                }

                throw new Error(error.error || error.detail || `Request failed with status ${response.status}`);
            }

            // Handle no-content responses
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.log(error.message);
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Refresh the access token using the refresh token
     * @returns {Promise<boolean>} True if refresh was successful
     */
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        try {
            const response = await fetch('/accounts/api/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);

                // If a new refresh token is provided, update it
                if (data.refresh) {
                    localStorage.setItem('refresh_token', data.refresh);
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url);
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async uploadFile(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
        });
    }

    async getDashboardStats() {
        return this.get('/dashboard/stats/');
    }

    async getStudents(params = {}) {
        return this.get('/users/students/', params);
    }

    async getStudentDetail(userId) {
        return this.get(`/users/students/${userId}/`);
    }

    async createStudent(data) {
        return this.post('/users/students/create/', data);
    }

    async updateStudent(userId, data) {
        return this.put(`/users/students/${userId}/update/`, data);
    }

    async deleteStudent(userId) {
        return this.delete(`/users/students/${userId}/delete/`);
    }

    async toggleStudentActive(userId) {
        return this.post(`/users/students/${userId}/toggle-active/`);
    }

    async bulkCreateStudents(data) {
        return this.post('/users/students/bulk-create/', data);
    }

    async uploadStudentsExcel(formData) {
        return this.uploadFile('/users/students/upload-excel/', formData);
    }

    async downloadExcelTemplate() {
        const response = await fetch(`${this.baseURL}/users/students/download-template/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': this.getCSRFToken(),
            },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to download template');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    async getReadingPassages(params = {}) {
        return this.get('/tests/reading/', params);
    }

    async getReadingPassage(passageId) {
        return this.get(`/tests/reading/${passageId}/`);
    }

    async createReadingPassage(data) {
        return this.post('/tests/reading/create/', data);
    }

    async updateReadingPassage(passageId, data) {
        return this.put(`/tests/reading/${passageId}/update/`, data);
    }

    async deleteReadingPassage(passageId) {
        return this.delete(`/tests/reading/${passageId}/delete/`);
    }

    async getTestHeads(params = {}) {
        return this.get('/tests/testheads/', params);
    }

    async getTestHead(testheadId) {
        return this.get(`/tests/testhead/${testheadId}/`);
    }

    async createTestHead(data) {
        return this.post('/tests/testhead/create/', data);
    }

    async updateTestHead(testheadId, data) {
        return this.put(`/tests/testhead/${testheadId}/update/`, data);
    }

    async deleteTestHead(testheadId) {
        return this.delete(`/tests/testhead/${testheadId}/delete/`);
    }

    async createQuestion(data) {
        return this.post('/tests/question/create/', data);
    }

    async createQuestionsBulk(data) {
        return this.post('/tests/questions/bulk-create/', data);
    }

    async updateQuestion(questionId, data) {
        return this.put(`/tests/question/${questionId}/update/`, data);
    }

    async deleteQuestion(questionId) {
        return this.delete(`/tests/question/${questionId}/delete/`);
    }

    async getListeningParts(params = {}) {
        return this.get('/tests/listening/', params);
    }

    async getListeningPart(partId) {
        return this.get(`/tests/listening/${partId}/`);
    }

    async createListeningPart(data) {
        if (data instanceof FormData) {
            return this.uploadFile('/tests/listening/create/', data);
        }
        return this.post('/tests/listening/create/', data);
    }

    async updateListeningPart(partId, data) {
        if (data instanceof FormData) {
            return this.request(`/tests/listening/${partId}/`, {
                method: 'PUT',
                body: data,
            });
        }
        return this.put(`/tests/listening/${partId}/`, data);
    }

    async deleteListeningPart(partId) {
        return this.delete(`/tests/listening/${partId}/delete/`);
    }

    async getWritingTasks(params = {}) {
        return this.get('/tests/writing/', params);
    }

    async createWritingTask(data) {
        if (data instanceof FormData) {
            return this.uploadFile('/tests/writing/create/', data);
        }
        return this.post('/tests/writing/create/', data);
    }

    async updateWritingTask(taskId, data) {
        if (data instanceof FormData) {
            return this.request(`/tests/writing/${taskId}/update/`, {
                method: 'PUT',
                body: data,
            });
        }
        return this.put(`/tests/writing/${taskId}/update/`, data);
    }

    async deleteWritingTask(taskId) {
        return this.delete(`/tests/writing/${taskId}/delete/`);
    }

    async getSpeakingTopics(params = {}) {
        return this.get('/tests/speaking/', params);
    }

    async createSpeakingTopic(data) {
        return this.post('/tests/speaking/create/', data);
    }

    async updateSpeakingTopic(topicId, data) {
        return this.put(`/tests/speaking/${topicId}/update/`, data);
    }

    async deleteSpeakingTopic(topicId) {
        return this.delete(`/tests/speaking/${topicId}/delete/`);
    }

    async getMockTests(params = {}) {
        return this.get('/mock-tests/', params);
    }

    async getMockTest(testId) {
        return this.get(`/mock-tests/${testId}/`);
    }

    async createMockTest(data) {
        return this.post('/mock-tests/create/', data);
    }

    async updateMockTest(testId, data) {
        return this.put(`/mock-tests/${testId}/update/`, data);
    }

    async toggleMockTestStatus(testId) {
        return this.post(`/mock-tests/${testId}/toggle/`);
    }

    async deleteMockTest(testId) {
        return this.delete(`/mock-tests/${testId}/delete/`);
    }

    async getStudentResults(params = {}) {
        return this.get('/results/students/', params);
    }

    // Exam (Scheduled Exams) Methods
    async getExams(params = {}) {
        return this.get('/exams/', params);
    }

    async getExam(examId) {
        return this.get(`/exams/${examId}/`);
    }

    async createExam(data) {
        return this.post('/exams/create/', data);
    }

    async updateExam(examId, data) {
        return this.put(`/exams/${examId}/update/`, data);
    }

    async deleteExam(examId) {
        return this.delete(`/exams/${examId}/delete/`);
    }

    async toggleExamStatus(examId, status) {
        return this.post(`/exams/${examId}/toggle-status/`, { status });
    }

    async removeStudentFromExam(examId, studentId) {
        return this.post(`/exams/${examId}/remove-student/${studentId}/`);
    }

    async getExamStatistics() {
        return this.get('/exams/statistics/');
    }

    async getExamResults(examId) {
        return this.get(`/exams/${examId}/results/`);
    }

    async getStudentResultDetail(attemptId) {
        return this.get(`/results/attempt/${attemptId}/`);
    }

    async evaluateWritingSubmission(attemptId, taskId, evaluationData) {
        return this.post(`/results/attempt/${attemptId}/writing/${taskId}/evaluate/`, evaluationData);
    }

    getExamExportUrl(examId) {
        return `/manager/api/exams/${examId}/export/`;
    }
}

const managerAPI = new ManagerAPI();

if (typeof window !== 'undefined') {
    window.managerAPI = managerAPI;
    window.API = managerAPI;
    window.ApiService = managerAPI; // Add ApiService alias
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = managerAPI;
}
