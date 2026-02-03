/**
 * Email Templates Management Screen
 * Allows HR/Admins to create and manage email templates with rich-text editor
 */

import { useState, useEffect } from 'react';
import { Plus, Mail, Edit3, Trash2, Eye, Save, X, FileText } from '../../components/icons/BrowoKoIcons';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';
import RichTextEditor from '../../components/email-templates/RichTextEditor';
import TemplatePreview from '../../components/email-templates/TemplatePreview';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  organization_id: string;
}

const TEMPLATE_CATEGORIES = [
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'OFFBOARDING', label: 'Offboarding' },
  { value: 'BENEFITS', label: 'Benefits' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'GENERAL', label: 'Allgemein' },
  { value: 'REMINDER', label: 'Erinnerung' },
];

const AVAILABLE_VARIABLES = [
  { key: 'employeeName', label: 'Mitarbeiter Name', example: 'Max Mustermann' },
  { key: 'employeeEmail', label: 'Mitarbeiter Email', example: 'max@example.com' },
  { key: 'startDate', label: 'Startdatum', example: '2025-12-01' },
  { key: 'endDate', label: 'Enddatum', example: '2025-12-31' },
  { key: 'organizationName', label: 'Firmenname', example: 'Browo GmbH' },
  { key: 'position', label: 'Position', example: 'Software Engineer' },
  { key: 'department', label: 'Abteilung', example: 'Engineering' },
  { key: 'managerName', label: 'Manager Name', example: 'Anna Schmidt' },
];

export default function EmailTemplatesScreen() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    category: 'GENERAL',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-EmailTemplates/templates`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const { templates: data } = await response.json();
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Fehler beim Laden der Templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.subject) {
      toast.error('Name und Betreff sind erforderlich');
      return;
    }

    try {
      const templateData = {
        id: `tmpl_${Date.now()}`,
        name: formData.name,
        subject: formData.subject,
        body_html: formData.body_html,
        body_text: formData.body_text || extractTextFromHtml(formData.body_html),
        category: formData.category,
        variables: extractVariables(formData.subject + ' ' + formData.body_html),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-EmailTemplates/templates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(templateData),
        }
      );

      if (!response.ok) throw new Error('Failed to create template');

      toast.success('Template erfolgreich erstellt!');
      setShowCreateDialog(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;

    try {
      const templateData = {
        ...selectedTemplate,
        name: formData.name,
        subject: formData.subject,
        body_html: formData.body_html,
        body_text: formData.body_text || extractTextFromHtml(formData.body_html),
        category: formData.category,
        variables: extractVariables(formData.subject + ' ' + formData.body_html),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-EmailTemplates/templates/${selectedTemplate.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(templateData),
        }
      );

      if (!response.ok) throw new Error('Failed to update template');

      toast.success('Template erfolgreich aktualisiert!');
      setShowEditDialog(false);
      setSelectedTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Template "${template.name}" wirklich löschen?`)) return;

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-EmailTemplates/templates/${template.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete template');

      toast.success('Template gelöscht');
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const openEditDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text,
      category: template.category,
    });
    setShowEditDialog(true);
  };

  const openPreviewDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      category: 'GENERAL',
    });
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{\s*|\s*\}\}/g, '')))];
  };

  const extractTextFromHtml = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">E-Mail Templates</h1>
              <p className="text-gray-600 mt-1">Erstelle wiederverwendbare E-Mail-Vorlagen für Workflows</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Neues Template
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gesamt</p>
                    <p className="text-2xl font-semibold text-gray-900">{templates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {['ONBOARDING', 'OFFBOARDING', 'BENEFITS'].map((cat) => (
              <Card key={cat}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{cat}</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {templates.filter(t => t.category === cat).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Templates durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('ALL')}
                  size="sm"
                >
                  Alle
                </Button>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat.value)}
                    size="sm"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Keine Templates gefunden</p>
              <p className="text-sm text-gray-500">Erstelle dein erstes E-Mail-Template</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.subject}</CardDescription>
                    </div>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Variables */}
                    {template.variables.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Variablen:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((v) => (
                            <code key={v} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {`{{ ${v} }}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="text-xs text-gray-500">
                      Erstellt: {new Date(template.created_at).toLocaleDateString('de-DE')}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreviewDialog(template)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Vorschau
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="form-card max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neues E-Mail-Template erstellen</DialogTitle>
              <DialogDescription>
                Erstelle ein wiederverwendbares Template mit Variablen
              </DialogDescription>
            </DialogHeader>

            <div className="form-grid">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <Label htmlFor="name" className="form-label">Template Name *</Label>
                  <Input
                    id="name"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Willkommens-Email"
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="category" className="form-label">Kategorie</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                  >
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <Label htmlFor="subject" className="form-label">Betreff *</Label>
                <Input
                  id="subject"
                  className="form-input"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="z.B. Willkommen bei {{ organizationName }}, {{ employeeName }}!"
                />
              </div>

              <div className="form-field">
                <Label className="form-label">E-Mail Inhalt *</Label>
                <RichTextEditor
                  value={formData.body_html}
                  onChange={(html) => setFormData({ ...formData, body_html: html })}
                  variables={AVAILABLE_VARIABLES}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} className="bg-blue-600">
                <Save className="w-4 h-4 mr-2" />
                Template erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="form-card max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template bearbeiten</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="form-grid">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <Label htmlFor="edit-name" className="form-label">Template Name *</Label>
                  <Input
                    id="edit-name"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="edit-category" className="form-label">Kategorie</Label>
                  <select
                    id="edit-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                  >
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <Label htmlFor="edit-subject" className="form-label">Betreff *</Label>
                <Input
                  id="edit-subject"
                  className="form-input"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div className="form-field">
                <Label className="form-label">E-Mail Inhalt *</Label>
                <RichTextEditor
                  value={formData.body_html}
                  onChange={(html) => setFormData({ ...formData, body_html: html })}
                  variables={AVAILABLE_VARIABLES}
                />
              </div>
            </div>

            <div className="form-footer">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} className="bg-blue-600">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vorschau: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                So sieht die E-Mail für den Empfänger aus
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (
              <TemplatePreview
                subject={selectedTemplate.subject}
                bodyHtml={selectedTemplate.body_html}
                variables={AVAILABLE_VARIABLES}
              />
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}