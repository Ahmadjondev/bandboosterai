'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ArrowRight,
  Save, 
  BookOpen, 
  Calendar, 
  Clock, 
  Key, 
  Settings, 
  Sparkles, 
  CheckCircle2,
  Users,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Lightbulb,
  Check,
  X,
  AlertCircle,
  GraduationCap,
  Timer,
  Shield,
  Zap,
} from 'lucide-react';
import { teacherExamApi } from '@/lib/teacher-api';
import type { CreateExamData, MockExamBasic } from '@/types/teacher';

type Step = 'template' | 'details' | 'schedule' | 'access' | 'settings' | 'review';

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: 'template', label: 'Template', icon: BookOpen },
  { id: 'details', label: 'Details', icon: Settings },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'access', label: 'Access', icon: Key },
  { id: 'settings', label: 'Grading', icon: CheckCircle2 },
  { id: 'review', label: 'Review', icon: Eye },
];

export default function CreateExamPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [loading, setLoading] = useState(false);
  const [loadingMockExams, setLoadingMockExams] = useState(true);
  const [mockExams, setMockExams] = useState<MockExamBasic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<CreateExamData>({
    title: '',
    description: '',
    mock_exam_id: undefined,
    is_public: false,
    auto_grade_reading: true,
    auto_grade_listening: true,
  });
  const [generatedCode, setGeneratedCode] = useState('');

  useEffect(() => {
    loadMockExams();
    generateAccessCode();
  }, []);

  const loadMockExams = async () => {
    try {
      setLoadingMockExams(true);
      const data = await teacherExamApi.getAvailableMockExams();
      setMockExams(data);
    } catch (error) {
      console.error('Failed to load mock exams:', error);
    } finally {
      setLoadingMockExams(false);
    }
  };

  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCode(code);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const dataToSubmit = { ...formData };
      if (formData.access_code === '') {
        dataToSubmit.access_code = undefined;
      }
      await teacherExamApi.createExam(dataToSubmit);
      router.push('/teacher/exams');
    } catch (error: any) {
      console.error('Failed to create exam:', error);
      alert(error.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateExamData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedMockExam = mockExams.find(exam => exam.id === formData.mock_exam_id);
  
  const filteredMockExams = mockExams.filter(exam =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  
  const canProceed = () => {
    switch (currentStep) {
      case 'template':
        return !!formData.mock_exam_id; // Mock exam selection is required
      case 'details':
        return formData.title.trim().length > 0;
      case 'schedule':
        return true; // Schedule is optional
      case 'access':
        return true; // Access settings always valid
      case 'settings':
        return true; // Settings always valid
      case 'review':
        return formData.title.trim().length > 0 && !!formData.mock_exam_id;
      default:
        return true;
    }
  };

  const goToStep = (step: Step) => {
    const targetIndex = STEPS.findIndex(s => s.id === step);
    if (targetIndex <= currentStepIndex || canProceed()) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < STEPS.length - 1 && canProceed()) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/teacher/exams"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Create Exam</h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {STEPS.length}
              </span>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between pb-4 overflow-x-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const isClickable = index <= currentStepIndex || canProceed();
              
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : isCompleted
                      ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : isClickable
                      ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step: Template Selection */}
        {currentStep === 'template' && (
          <StepContainer
            title="Choose a Mock Exam"
            description="Select a mock exam template to base your exam on"
            icon={<BookOpen className="h-6 w-6" />}
          >
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search mock exams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {!formData.mock_exam_id && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">Please select a mock exam to continue</p>
              </div>
            )}

            {loadingMockExams ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading templates...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mock Exam Options */}
                {filteredMockExams.map((exam) => (
                  <TemplateOption
                    key={exam.id}
                    selected={formData.mock_exam_id === exam.id}
                    onClick={() => handleChange('mock_exam_id', exam.id)}
                    title={exam.title}
                    description={exam.description || `${exam.exam_type_display} • ${exam.duration_minutes} min`}
                    badges={[
                      { label: exam.exam_type_display, color: 'purple' },
                      { label: `${exam.duration_minutes} min`, color: 'blue' },
                      { label: exam.difficulty_level, color: 'gray' },
                    ]}
                  />
                ))}
                
                {filteredMockExams.length === 0 && !searchQuery && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Mock Exams Available</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">You need to create a mock exam first before creating a teacher exam.</p>
                    <Link
                      href="/teacher/mock-exams/create"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Sparkles className="h-4 w-4" />
                      Create Mock Exam
                    </Link>
                  </div>
                )}
                
                {filteredMockExams.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No mock exams found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </StepContainer>
        )}

        {/* Step: Details */}
        {currentStep === 'details' && (
          <StepContainer
            title="Exam Details"
            description="Give your exam a name and description"
            icon={<Settings className="h-6 w-6" />}
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exam Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={selectedMockExam ? selectedMockExam.title : "e.g., IELTS Practice Test 1"}
                />
                {!formData.title.trim() && (
                  <p className="mt-1 text-sm text-red-500">Title is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Add a description to help students understand what this exam covers..."
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formData.description?.length || 0} characters
                </p>
              </div>

              {selectedMockExam && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Lightbulb className="h-5 w-5" />
                    <span className="font-medium">Based on template</span>
                  </div>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    {selectedMockExam.title} • {selectedMockExam.exam_type_display} • {selectedMockExam.duration_minutes} min
                  </p>
                </div>
              )}
            </div>
          </StepContainer>
        )}

        {/* Step: Schedule */}
        {currentStep === 'schedule' && (
          <StepContainer
            title="Schedule & Duration"
            description="Set when students can take this exam and time limits"
            icon={<Calendar className="h-6 w-6" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date || ''}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Leave empty for immediate access
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date || ''}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Leave empty for no deadline
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Timer className="inline h-4 w-4 mr-1" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => handleChange('duration_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={selectedMockExam ? `${selectedMockExam.duration_minutes} (from template)` : "e.g., 120"}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Time limit for completing the exam. {selectedMockExam && `Template default: ${selectedMockExam.duration_minutes} min`}
                </p>
              </div>

              {/* Quick Duration Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quick Set Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {[30, 60, 90, 120, 150, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleChange('duration_minutes', mins)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.duration_minutes === mins
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepContainer>
        )}

        {/* Step: Access */}
        {currentStep === 'access' && (
          <StepContainer
            title="Access Control"
            description="Choose who can access this exam"
            icon={<Key className="h-6 w-6" />}
          >
            <div className="space-y-6">
              {/* Public/Private Toggle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleChange('is_public', true)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    formData.is_public
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.is_public ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Globe className={`h-5 w-5 ${formData.is_public ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Public Exam</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">All students can access</p>
                    </div>
                  </div>
                  {formData.is_public && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Selected
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('is_public', false)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    !formData.is_public
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      !formData.is_public ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Lock className={`h-5 w-5 ${!formData.is_public ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Private Exam</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Only assigned students</p>
                    </div>
                  </div>
                  {!formData.is_public && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Selected
                    </div>
                  )}
                </button>
              </div>

              {/* Access Code */}
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                      Access Code
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Optional code students need to join
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      generateAccessCode();
                      handleChange('access_code', generatedCode);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={formData.access_code || ''}
                    onChange={(e) => handleChange('access_code', e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-lg tracking-wider"
                    placeholder="e.g., EXAM2024"
                    maxLength={12}
                  />
                  {formData.access_code && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(formData.access_code || '')}
                      className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </StepContainer>
        )}

        {/* Step: Settings */}
        {currentStep === 'settings' && (
          <StepContainer
            title="Grading Settings"
            description="Configure automatic grading options"
            icon={<CheckCircle2 className="h-6 w-6" />}
          >
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Auto-Grading</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Automatically score objective sections
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎧</span>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Listening Section</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Multiple choice & fill-in answers</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.auto_grade_listening}
                        onChange={(e) => handleChange('auto_grade_listening', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📖</span>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Reading Section</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Multiple choice & fill-in answers</p>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.auto_grade_reading}
                        onChange={(e) => handleChange('auto_grade_reading', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300">Manual Grading Required</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Writing and Speaking sections require manual grading by the teacher.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </StepContainer>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <StepContainer
            title="Review & Create"
            description="Review your exam settings before creating"
            icon={<Eye className="h-6 w-6" />}
          >
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReviewCard
                  title="Basic Info"
                  icon={<Settings className="h-5 w-5" />}
                  items={[
                    { label: 'Title', value: formData.title || 'Not set' },
                    { label: 'Description', value: formData.description || 'None' },
                    { label: 'Mock Exam', value: selectedMockExam?.title || 'Not selected' },
                  ]}
                />
                
                <ReviewCard
                  title="Schedule"
                  icon={<Calendar className="h-5 w-5" />}
                  items={[
                    { label: 'Start', value: formData.start_date ? new Date(formData.start_date).toLocaleString() : 'Immediate' },
                    { label: 'End', value: formData.end_date ? new Date(formData.end_date).toLocaleString() : 'No deadline' },
                    { label: 'Duration', value: formData.duration_minutes ? `${formData.duration_minutes} minutes` : (selectedMockExam ? `${selectedMockExam.duration_minutes} min (default)` : 'Not set') },
                  ]}
                />
                
                <ReviewCard
                  title="Access"
                  icon={<Key className="h-5 w-5" />}
                  items={[
                    { label: 'Visibility', value: formData.is_public ? 'Public' : 'Private' },
                    { label: 'Access Code', value: formData.access_code || 'None' },
                  ]}
                />
                
                <ReviewCard
                  title="Grading"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  items={[
                    { label: 'Listening', value: formData.auto_grade_listening ? 'Auto-grade' : 'Manual' },
                    { label: 'Reading', value: formData.auto_grade_reading ? 'Auto-grade' : 'Manual' },
                    { label: 'Writing/Speaking', value: 'Manual grading' },
                  ]}
                />
              </div>

              {/* Create Button */}
              <div className="pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.title.trim()}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Creating Exam...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Create Exam
                    </>
                  )}
                </button>
              </div>
            </div>
          </StepContainer>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Previous
          </button>
          
          {currentStep !== 'review' ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Step Container Component
interface StepContainerProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function StepContainer({ title, description, icon, children }: StepContainerProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <div className="text-indigo-600 dark:text-indigo-400">
              {icon}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// Template Option Component
interface TemplateOptionProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
  badges?: Array<{ label: string; color: string }>;
  highlight?: boolean;
}

function TemplateOption({ selected, onClick, title, description, icon, badges, highlight }: TemplateOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : highlight
          ? 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Selection Circle */}
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          selected 
            ? 'border-indigo-500 bg-indigo-500' 
            : 'border-gray-300 dark:border-gray-600'
        }`}>
          {selected && <Check className="h-4 w-4 text-white" />}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>
          
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    badge.color === 'purple' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    badge.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// Review Card Component
interface ReviewCardProps {
  title: string;
  icon: React.ReactNode;
  items: Array<{ label: string; value: string }>;
}

function ReviewCard({ title, icon, items }: ReviewCardProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
      <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
            <span className="font-medium text-gray-900 dark:text-white truncate ml-2 max-w-[60%] text-right">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
