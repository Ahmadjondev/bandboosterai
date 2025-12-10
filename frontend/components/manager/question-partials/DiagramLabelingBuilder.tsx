/**
 * Diagram/Map Labeling Builder Component
 * 
 * Advanced builder for creating Diagram/Map Labeling questions:
 * - Upload diagram/map image
 * - Place clickable label markers on the image
 * - Auto-generate questions from labels
 * - Visual interactive editor
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Trash2,
  X,
  Save,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  MapPin,
  Move,
  ZoomIn,
  ZoomOut,
  Edit3,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';

interface LabelMarker {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
  answer: string;
}

interface LabelingData {
  title: string;
  imageUrl: string;
  markers: LabelMarker[];
}

interface GeneratedQuestion {
  tempId: string;
  question_text: string;
  correct_answer_text: string;
  answer_two_text: string;
  choices: any[];
  order: number;
  explanation: string;
  points: number;
}

interface DiagramLabelingBuilderProps {
  questionType?: 'DL' | 'ML';
  existingQuestions?: any[];
  labelingData?: string;
  onQuestionsReady: (questions: GeneratedQuestion[]) => void;
  onUpdateLabelingData: (data: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onCancel: () => void;
}

export function DiagramLabelingBuilder({
  questionType = 'DL',
  existingQuestions = [],
  labelingData = '',
  onQuestionsReady,
  onUpdateLabelingData,
  onImageUpload,
  onCancel,
}: DiagramLabelingBuilderProps) {
  const [data, setData] = useState<LabelingData>({
    title: '',
    imageUrl: '',
    markers: [],
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [uploading, setUploading] = useState(false);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMapLabeling = questionType === 'ML';
  const typeLabel = isMapLabeling ? 'Map' : 'Diagram';

  // Load existing data
  useEffect(() => {
    if (labelingData) {
      try {
        const parsed = JSON.parse(labelingData);
        setData(parsed);
        
        if (existingQuestions && existingQuestions.length > 0) {
          setGeneratedQuestions(existingQuestions.map((q, idx) => ({
            ...q,
            tempId: `existing-${idx}`,
          })));
          setCurrentStep(2);
        }
      } catch {
        console.log('labelingData is not valid JSON, starting fresh');
      }
    }
  }, [labelingData, existingQuestions]);

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (onImageUpload) {
      setUploading(true);
      try {
        const url = await onImageUpload(file);
        setData(prev => ({ ...prev, imageUrl: url }));
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload image');
      } finally {
        setUploading(false);
      }
    } else {
      // Local preview using FileReader
      const reader = new FileReader();
      reader.onload = (event) => {
        setData(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle click on image to place marker
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingMarker || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: LabelMarker = {
      id: `marker-${Date.now()}`,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      label: `${data.markers.length + 1}`,
      answer: '',
    };

    setData(prev => ({
      ...prev,
      markers: [...prev.markers, newMarker],
    }));
    setIsPlacingMarker(false);
  };

  // Handle marker drag
  const handleMarkerMouseDown = (e: React.MouseEvent, markerId: string) => {
    e.stopPropagation();
    if (isPlacingMarker) return;
    setIsDragging(true);
    setDraggedMarkerId(markerId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedMarkerId || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setData(prev => ({
      ...prev,
      markers: prev.markers.map(marker =>
        marker.id === draggedMarkerId
          ? { ...marker, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
          : marker
      ),
    }));
  }, [isDragging, draggedMarkerId]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedMarkerId(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Update marker label
  const updateMarkerLabel = (markerId: string, label: string) => {
    setData(prev => ({
      ...prev,
      markers: prev.markers.map(marker =>
        marker.id === markerId ? { ...marker, label } : marker
      ),
    }));
  };

  // Update marker answer
  const updateMarkerAnswer = (markerId: string, answer: string) => {
    setData(prev => ({
      ...prev,
      markers: prev.markers.map(marker =>
        marker.id === markerId ? { ...marker, answer } : marker
      ),
    }));
  };

  // Remove marker
  const removeMarker = (markerId: string) => {
    setData(prev => ({
      ...prev,
      markers: prev.markers.filter(m => m.id !== markerId),
    }));
  };

  // Generate questions
  const generateQuestions = () => {
    if (data.markers.length === 0) {
      alert('Please add at least one label marker');
      return;
    }

    const questions: GeneratedQuestion[] = data.markers.map((marker, index) => ({
      tempId: `q-${Date.now()}-${index}`,
      question_text: `Label ${marker.label}: Identify the item at this location`,
      correct_answer_text: marker.answer,
      answer_two_text: '',
      choices: [],
      order: index + 1,
      explanation: '',
      points: 1,
    }));

    setGeneratedQuestions(questions);
    setCurrentStep(2);
  };

  // Update answer in step 2
  const updateAnswer = (index: number, value: string) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], correct_answer_text: value };
      return updated;
    });

    // Also update in markers
    const marker = data.markers[index];
    if (marker) {
      updateMarkerAnswer(marker.id, value);
    }
  };

  // Edit question text
  const editQuestion = (index: number) => {
    const question = generatedQuestions[index];
    const newText = prompt('Edit question text:', question.question_text);
    if (newText && newText.trim()) {
      setGeneratedQuestions(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], question_text: newText.trim() };
        return updated;
      });
    }
  };

  // Delete question
  const deleteQuestion = (index: number) => {
    if (!confirm('Delete this question?')) return;
    setGeneratedQuestions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
    // Also remove the corresponding marker
    const marker = data.markers[index];
    if (marker) {
      removeMarker(marker.id);
    }
  };

  // Duplicate question
  const duplicateQuestion = (index: number) => {
    setGeneratedQuestions(prev => {
      const questionToDuplicate = prev[index];
      const duplicate: GeneratedQuestion = {
        ...questionToDuplicate,
        tempId: `duplicate-${Date.now()}-${index}`,
        correct_answer_text: '', // Clear answer for duplicate
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicate);
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  // Move question up
  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
    // Also swap markers
    setData(prev => {
      const updatedMarkers = [...prev.markers];
      if (updatedMarkers[index - 1] && updatedMarkers[index]) {
        [updatedMarkers[index - 1], updatedMarkers[index]] = [updatedMarkers[index], updatedMarkers[index - 1]];
      }
      return { ...prev, markers: updatedMarkers };
    });
  };

  // Move question down
  const moveQuestionDown = (index: number) => {
    if (index >= generatedQuestions.length - 1) return;
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
    // Also swap markers
    setData(prev => {
      const updatedMarkers = [...prev.markers];
      if (updatedMarkers[index] && updatedMarkers[index + 1]) {
        [updatedMarkers[index], updatedMarkers[index + 1]] = [updatedMarkers[index + 1], updatedMarkers[index]];
      }
      return { ...prev, markers: updatedMarkers };
    });
  };

  // Save
  const saveQuestions = () => {
    if (generatedQuestions.some(q => !q.correct_answer_text?.trim())) {
      alert('Please fill in all answers');
      return;
    }

    onQuestionsReady(generatedQuestions);
    onUpdateLabelingData(JSON.stringify(data, null, 2));
  };

  const canGenerate = data?.title?.trim() && data?.imageUrl && Array.isArray(data?.markers) && data.markers.length > 0;
  const canSave = generatedQuestions.length > 0 &&
    generatedQuestions.every(q => q.correct_answer_text?.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isMapLabeling ? '🗺️ Map' : '📐 Diagram'} Labeling Builder
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Upload an image and place labels to create questions
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* Step 1: Image & Labels Editor */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {typeLabel} Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
              placeholder={`e.g., ${isMapLabeling ? 'University Campus Map' : 'Parts of a Plant Cell'}`}
            />
          </div>

          {/* Image Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {typeLabel} Image <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {data.imageUrl && (
                  <>
                    <button
                      onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-500">{zoom}%</span>
                    <button
                      onClick={() => setZoom(prev => Math.min(150, prev + 10))}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {!data.imageUrl ? (
              <div
                className="border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="animate-pulse">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-900 rounded-lg">
                  <button
                    onClick={() => setIsPlacingMarker(!isPlacingMarker)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 ${
                      isPlacingMarker
                        ? 'bg-orange-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {isPlacingMarker ? 'Click on image to place' : 'Add Label'}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Change Image
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                    {data.markers.length} label{data.markers.length !== 1 ? 's' : ''} placed
                  </span>
                </div>

                {/* Image with markers */}
                <div
                  ref={imageContainerRef}
                  className={`relative overflow-auto border border-slate-200 dark:border-gray-700 rounded-lg ${
                    isPlacingMarker ? 'cursor-crosshair' : ''
                  }`}
                  style={{ maxHeight: '500px' }}
                  onClick={handleImageClick}
                >
                  <img
                    src={data.imageUrl}
                    alt={typeLabel}
                    className="block"
                    style={{ width: `${zoom}%`, minWidth: '100%' }}
                    draggable={false}
                  />

                  {/* Markers */}
                  {data.markers.map(marker => (
                    <div
                      key={marker.id}
                      className={`absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-lg cursor-move transition-transform ${
                        draggedMarkerId === marker.id ? 'scale-125' : 'hover:scale-110'
                      } ${isMapLabeling ? 'bg-blue-600' : 'bg-orange-600'}`}
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                      onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
                      title={`Label ${marker.label}${marker.answer ? `: ${marker.answer}` : ''}`}
                    >
                      {marker.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Markers List */}
          {data.markers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Labels ({data.markers.length})
              </h4>
              <div className="space-y-3">
                {data.markers.map((marker, index) => (
                  <div
                    key={marker.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold ${
                      isMapLabeling ? 'bg-blue-600' : 'bg-orange-600'
                    }`}>
                      {marker.label}
                    </div>
                    <input
                      type="text"
                      value={marker.label}
                      onChange={(e) => updateMarkerLabel(marker.id, e.target.value)}
                      className="w-16 px-2 py-1 text-sm border border-slate-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white text-center"
                      placeholder="#"
                    />
                    <input
                      type="text"
                      value={marker.answer}
                      onChange={(e) => updateMarkerAnswer(marker.id, e.target.value)}
                      className="flex-1 px-3 py-1 text-sm border border-slate-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Answer for this label"
                    />
                    <button
                      onClick={() => removeMarker(marker.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-5 border-t border-slate-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={generateQuestions}
              disabled={!canGenerate}
              className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              Generate Questions
              <span className="px-2 py-0.5 bg-orange-500 rounded text-xs">{data.markers.length}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Questions */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <button
            onClick={() => setCurrentStep(1)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
          >
            ← Back to {typeLabel} Editor
          </button>

          {/* Preview Image */}
          {data.imageUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4">
              <div className="relative inline-block">
                <img
                  src={data.imageUrl}
                  alt={typeLabel}
                  className="max-h-[300px] rounded"
                />
                {data.markers.map(marker => (
                  <div
                    key={marker.id}
                    className={`absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center rounded-full text-white text-xs font-bold ${
                      isMapLabeling ? 'bg-blue-600' : 'bg-orange-600'
                    }`}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  >
                    {marker.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Review Answers ({generatedQuestions.length})
            </h4>

            <div className="space-y-4">
              {generatedQuestions.map((q, index) => (
                <div
                  key={q.tempId}
                  className="p-4 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                      isMapLabeling ? 'bg-blue-600' : 'bg-orange-600'
                    }`}>
                      {data.markers[index]?.label || q.order}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 flex-1 pt-1">{q.question_text}</p>
                    
                    {/* CRUD Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => editQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit question text"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        title="Duplicate question"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestionUp(index)}
                        disabled={index === 0}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestionDown(index)}
                        disabled={index === generatedQuestions.length - 1}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-10">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Answer:</label>
                    <input
                      type="text"
                      value={q.correct_answer_text}
                      onChange={(e) => updateAnswer(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter the correct answer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-5 border-t border-slate-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={saveQuestions}
              disabled={!canSave}
              className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiagramLabelingBuilder;
