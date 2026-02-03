/**
 * Environment Variables Screen
 * Sichere Verwaltung von API Keys, Tokens und anderen Secrets
 * Organization-scoped mit Encryption
 */

import React, { useState, useEffect } from 'react';
import { Plus, Key, Edit2, Trash2, Eye, EyeOff, Save, X, AlertCircle } from '../../components/icons/BrowoKoIcons';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';

// Local types matching backend
interface EnvironmentVariable {
  id: string;
  organizationId: string;
  key: string;
  value: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EnvironmentVariableInput {
  key: string;
  value: string;
  description?: string | null;
}

export default function EnvironmentVariablesScreen() {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedValues, setRevealedValues] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState<EnvironmentVariableInput>({
    key: '',
    value: '',
    description: ''
  });

  // Load variables
  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/env-vars`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load variables: ${response.statusText}`);
      }

      const data = await response.json();
      setVariables(data.variables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load variables');
      console.error('Error loading env vars:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      setError('Key and Value are required');
      return;
    }

    // Validate key format (uppercase, underscores, numbers)
    if (!/^[A-Z0-9_]+$/.test(formData.key)) {
      setError('Key must contain only uppercase letters, numbers, and underscores');
      return;
    }

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/env-vars`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create variable');
      }

      await loadVariables();
      setShowNewForm(false);
      setFormData({ key: '', value: '', description: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create variable');
      console.error('Error creating env var:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/env-vars/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update variable');
      }

      await loadVariables();
      setEditingId(null);
      setFormData({ key: '', value: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update variable');
      console.error('Error updating env var:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variable? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/env-vars/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete variable');
      }

      await loadVariables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete variable');
      console.error('Error deleting env var:', err);
    }
  };

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedValues);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedValues(newRevealed);
  };

  const startEdit = (variable: EnvironmentVariable) => {
    setEditingId(variable.id);
    setFormData({
      key: variable.key,
      value: variable.value,
      description: variable.description || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowNewForm(false);
    setFormData({ key: '', value: '', description: '' });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-gray-900 mb-2">Environment Variables</h1>
              <p className="text-gray-600">
                Verwalte API Keys, Tokens und andere Secrets sicher für deine Workflows
              </p>
            </div>
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus size={20} />
                Neue Variable
              </button>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-blue-900">
              <p className="mb-2">
                <strong>Verwendung in Workflows:</strong> Nutze {`{{ env.VARIABLE_NAME }}`} um auf Variablen zuzugreifen
              </p>
              <p className="text-blue-800">
                Beispiel: URL: {`{{ env.API_BASE_URL }}`}/users | Header: {`{ "Authorization": "{{ env.API_KEY }}" }`}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <p className="text-red-900">{error}</p>
            </div>
          </div>
        )}

        {/* New Variable Form */}
        {showNewForm && (
          <div className="bg-white rounded-lg border-2 border-purple-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Neue Variable erstellen</h3>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                  placeholder="API_KEY, GITHUB_TOKEN, SLACK_WEBHOOK_URL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
                <p className="text-gray-500 mt-1">Nur Großbuchstaben, Zahlen und Unterstriche</p>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Dein Secret Value"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Beschreibung</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="z.B. GitHub Personal Access Token für API Calls"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Save size={18} />
                  Erstellen
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Variables List */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading variables...</p>
          </div>
        ) : variables.length === 0 && !showNewForm ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <Key className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-gray-900 mb-2">Noch keine Variables</h3>
            <p className="text-gray-600 mb-4">
              Erstelle deine erste Environment Variable um API Keys sicher zu speichern
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus size={20} />
              Erste Variable erstellen
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">Key</th>
                  <th className="px-6 py-3 text-left text-gray-700">Value</th>
                  <th className="px-6 py-3 text-left text-gray-700">Beschreibung</th>
                  <th className="px-6 py-3 text-left text-gray-700">Erstellt</th>
                  <th className="px-6 py-3 text-right text-gray-700">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {variables.map((variable) => (
                  <tr key={variable.id} className="hover:bg-gray-50">
                    {editingId === variable.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.key}
                            onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono text-purple-600"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="password"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded font-mono"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(variable.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUpdate(variable.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Speichern"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Abbrechen"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <code className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-mono">
                            {variable.key}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono">
                              {revealedValues.has(variable.id)
                                ? variable.value
                                : '••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => toggleReveal(variable.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                              title={revealedValues.has(variable.id) ? 'Verstecken' : 'Anzeigen'}
                            >
                              {revealedValues.has(variable.id) ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {variable.description || <span className="text-gray-400 italic">–</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(variable.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(variable)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Bearbeiten"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(variable.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Löschen"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Usage Examples */}
        {variables.length > 0 && (
          <div className="mt-8 bg-gray-900 rounded-lg p-6 text-gray-100">
            <h3 className="mb-4">💡 Verwendungsbeispiele</h3>
            <div className="space-y-3 font-mono text-green-400">
              <div>
                <span className="text-gray-400">// In HTTP Request URL:</span>
                <br />
                {variables.length > 0 && `{{ env.${variables[0].key} }}`}/api/users
              </div>
              <div>
                <span className="text-gray-400">// In HTTP Request Headers:</span>
                <br />
                {`{ "Authorization": "Bearer {{ env.${variables[0]?.key || 'API_TOKEN'} }}" }`}
              </div>
              <div>
                <span className="text-gray-400">// In HTTP Request Body:</span>
                <br />
                {`{ "api_key": "{{ env.${variables[0]?.key || 'API_KEY'} }}", "data": "..." }`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}