'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  Star,
  Power,
  TestTube,
  Bot,
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Zap,
  Clock,
} from 'lucide-react';
import {
  getAIConfigurations,
  createAIConfiguration,
  updateAIConfiguration,
  deleteAIConfiguration,
  setPrimaryConfiguration,
  toggleConfigurationStatus,
  testAIConfiguration,
  getAIProviders,
  getAIModels,
  getAIUsageStats,
  type AIConfiguration,
  type AIProvider,
  type AIModel,
  type CreateAIConfigData,
  type AIUsageStats,
} from '@/lib/api/ai-config';

// Provider icons and colors
const providerConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
  gemini: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: '✦' },
  openai: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: '◯' },
  anthropic: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: '◈' },
};

export default function AIConfigPage() {
  const [configurations, setConfigurations] = useState<AIConfiguration[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [allModels, setAllModels] = useState<Record<string, AIModel[]>>({});
  const [stats, setStats] = useState<AIUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfiguration | null>(null);
  const [testingConfig, setTestingConfig] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateAIConfigData>({
    name: '',
    provider: 'gemini',
    api_key: '',
    model_name: 'gemini-2.5-pro',
    is_primary: false,
    is_active: true,
    temperature: 0.0,
    max_tokens: 8192,
    description: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configsData, providersData, modelsData, statsData] = await Promise.all([
        getAIConfigurations(),
        getAIProviders(),
        getAIModels(),
        getAIUsageStats(30).catch(() => null),
      ]);

      setConfigurations(configsData);
      setProviders(providersData);
      setAllModels(modelsData as Record<string, AIModel[]>);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.api_key || !formData.model_name) {
      return;
    }

    try {
      setFormLoading(true);
      await createAIConfiguration(formData);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create configuration');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    try {
      setFormLoading(true);
      await updateAIConfiguration(editingConfig.id, {
        name: formData.name,
        provider: formData.provider,
        api_key: formData.api_key || undefined, // Only send if changed
        model_name: formData.model_name,
        is_primary: formData.is_primary,
        is_active: formData.is_active,
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        description: formData.description,
      });
      setEditingConfig(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (config: AIConfiguration) => {
    if (!confirm(`Are you sure you want to delete "${config.name}"?`)) return;

    try {
      await deleteAIConfiguration(config.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const handleSetPrimary = async (config: AIConfiguration) => {
    try {
      await setPrimaryConfiguration(config.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary');
    }
  };

  const handleToggleStatus = async (config: AIConfiguration) => {
    try {
      await toggleConfigurationStatus(config.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleTest = async (config: AIConfiguration) => {
    setTestingConfig(config.id);
    setTestResult(null);

    try {
      const result = await testAIConfiguration(config.id);
      setTestResult({
        success: result.success,
        message: result.success ? result.response || 'Test successful!' : result.error || 'Test failed',
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingConfig(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'gemini',
      api_key: '',
      model_name: 'gemini-2.5-pro',
      is_primary: false,
      is_active: true,
      temperature: 0.0,
      max_tokens: 8192,
      description: '',
    });
  };

  const openEditModal = (config: AIConfiguration) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      provider: config.provider,
      api_key: '', // Don't pre-fill API key
      model_name: config.model_name,
      is_primary: config.is_primary,
      is_active: config.is_active,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      description: config.description,
    });
  };

  const availableModels = allModels[formData.provider] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" />
            AI Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage API keys, models, and AI provider settings
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Configuration
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.overview.active_configurations}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Configs</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.usage.total_requests.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(stats.usage.total_tokens / 1000).toFixed(1)}K
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tokens Used</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.usage.success_rate}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          } border rounded-lg p-4 flex items-center gap-3`}
        >
          {testResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <p className={testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
            {testResult.message}
          </p>
          <button onClick={() => setTestResult(null)} className="ml-auto">
            <XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}

      {/* Configurations List */}
      <div className="space-y-4">
        {configurations.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No AI Configurations
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add your first AI configuration to enable AI-powered features.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add Configuration
            </button>
          </div>
        ) : (
          configurations.map((config) => {
            const provider = providerConfig[config.provider] || providerConfig.gemini;
            return (
              <div
                key={config.id}
                className={`bg-white dark:bg-slate-800 rounded-xl p-6 border ${
                  config.is_primary
                    ? 'border-blue-300 dark:border-blue-700 ring-2 ring-blue-100 dark:ring-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700'
                } ${!config.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${provider.bgColor} rounded-xl flex items-center justify-center text-2xl`}>
                      {provider.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {config.name}
                        </h3>
                        {config.is_primary && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Primary
                          </span>
                        )}
                        {!config.is_active && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {config.provider_display} • {config.model_name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Key className="w-4 h-4" />
                          {config.api_key_masked}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {config.total_requests.toLocaleString()} requests
                        </span>
                        {config.last_used_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Last used: {new Date(config.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {config.last_error && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Last error: {config.last_error.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(config)}
                      disabled={testingConfig === config.id}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Test Configuration"
                    >
                      {testingConfig === config.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <TestTube className="w-5 h-5" />
                      )}
                    </button>
                    {!config.is_primary && config.is_active && (
                      <button
                        onClick={() => handleSetPrimary(config)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Set as Primary"
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(config)}
                      className={`p-2 rounded-lg transition-colors ${
                        config.is_active
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20'
                      }`}
                      title={config.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(config)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(config)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingConfig) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingConfig ? 'Edit AI Configuration' : 'Add AI Configuration'}
              </h2>
            </div>
            <form onSubmit={editingConfig ? handleUpdate : handleCreate} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Configuration Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Production Gemini"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI Provider *
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    const models = allModels[provider] || [];
                    setFormData({
                      ...formData,
                      provider,
                      model_name: models[0]?.id || '',
                    });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model *
                </label>
                <select
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} - {m.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key {editingConfig ? '(leave empty to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder={editingConfig ? '••••••••••••' : 'Enter your API key'}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  required={!editingConfig}
                />
              </div>

              {/* Temperature & Max Tokens */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temperature
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes about this configuration"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Set as Primary</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingConfig(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
