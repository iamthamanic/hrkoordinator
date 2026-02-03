/**
 * Node Configuration Panel (n8n-style Sidebar)
 * Slides in from right when a node is selected
 */

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { X, AlertCircle, CheckCircle2, Globe, ChevronDown, Key } from '../../components/icons/BrowoKoIcons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../utils/supabase/client';
import { TriggerConfigForm } from './TriggerConfigForm';

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, config: any) => void;
}

interface Employee {
  id: string;
  email: string;
  full_name: string;
  position?: string;
}

interface Benefit {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface Document {
  id: string;
  name: string;
  category?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  category: string;
}

export default function NodeConfigPanel({ node, onClose, onUpdateNode }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<any>(node?.data?.config || {});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load data when node changes
  useEffect(() => {
    if (!node) return;
    
    setConfig(node.data?.config || {});
    setHasChanges(false);
    
    // Load data based on node type
    const actionType = node.data?.actionType || node.data?.type;
    
    if (['SEND_EMAIL', 'CREATE_TASK', 'ASSIGN_BENEFITS', 'ASSIGN_DOCUMENT', 'DISTRIBUTE_COINS', 'ASSIGN_EQUIPMENT', 'ASSIGN_TRAINING', 'CREATE_NOTIFICATION', 'ADD_TO_TEAM'].includes(actionType)) {
      loadEmployees();
    }
    
    if (actionType === 'ASSIGN_BENEFITS') {
      loadBenefits();
    }
    
    if (actionType === 'ASSIGN_DOCUMENT') {
      loadDocuments();
    }
    
    if (actionType === 'SEND_EMAIL') {
      loadEmailTemplates();
    }
  }, [node?.id]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Get authenticated user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[NodeConfigPanel] No active session:', sessionError);
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Personalakte/employees`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const { employees: data } = await response.json();
        console.log('[NodeConfigPanel] ✅ Loaded employees:', data?.length || 0);
        setEmployees(data || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[NodeConfigPanel] ❌ Failed to load employees:', response.status, errorData);
        setEmployees([]);
      }
    } catch (error) {
      console.error('[NodeConfigPanel] ❌ Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBenefits = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[NodeConfigPanel] No session for benefits');
        setBenefits([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Benefits/browse`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const { benefits: data } = await response.json();
        console.log('[NodeConfigPanel] ✅ Loaded benefits:', data?.length || 0);
        setBenefits(data || []);
      } else {
        console.error('[NodeConfigPanel] ❌ Failed to load benefits:', response.status);
        setBenefits([]);
      }
    } catch (error) {
      console.error('[NodeConfigPanel] ❌ Error loading benefits:', error);
      setBenefits([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[NodeConfigPanel] No session for documents');
        setDocuments([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Dokumente/documents`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const { documents: data } = await response.json();
        console.log('[NodeConfigPanel] ✅ Loaded documents:', data?.length || 0);
        setDocuments(data || []);
      } else {
        console.error('[NodeConfigPanel] ❌ Failed to load documents:', response.status);
        setDocuments([]);
      }
    } catch (error) {
      console.error('[NodeConfigPanel] ❌ Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[NodeConfigPanel] No session for email templates');
        setEmailTemplates([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-EmailTemplates/templates`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const { templates: data } = await response.json();
        console.log('[NodeConfigPanel] ✅ Loaded email templates:', data?.length || 0);
        setEmailTemplates(data || []);
      } else {
        console.error('[NodeConfigPanel] ❌ Failed to load email templates:', response.status);
        setEmailTemplates([]);
      }
    } catch (error) {
      console.error('[NodeConfigPanel] ❌ Error loading email templates:', error);
      setEmailTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!node) return;
    onUpdateNode(node.id, config);
    setHasChanges(false);
  };

  if (!node) return null;

  const actionType = node.data?.actionType || node.data?.type;
  const isConfigured = node.data?.config && Object.keys(node.data.config).length > 0;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l z-50 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b px-6 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900">{node.data?.label}</h3>
            <p className="text-xs text-gray-500">{actionType}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Status Banner */}
        {!isConfigured && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">Konfiguration erforderlich</p>
                <p className="text-xs text-orange-700 mt-1">
                  Diese Node ist noch nicht konfiguriert. Bitte fülle die erforderlichen Felder aus.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isConfigured && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Konfiguration vollständig</p>
                <p className="text-xs text-green-700 mt-1">
                  Diese Node ist bereit zur Ausführung.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Configuration Forms based on node type */}
        
        {/* TRIGGER NODE CONFIGURATION */}
        {node.type === 'trigger' && (
          <TriggerConfigForm 
            node={node}
            config={config} 
            updateConfig={updateConfig} 
          />
        )}
        
        {actionType === 'SEND_EMAIL' && (
          <SendEmailConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            emailTemplates={emailTemplates}
            loading={loading}
          />
        )}

        {actionType === 'ASSIGN_BENEFITS' && (
          <AssignBenefitsConfig 
            config={config} 
            updateConfig={updateConfig} 
            benefits={benefits}
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'CREATE_TASK' && (
          <CreateTaskConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'ASSIGN_DOCUMENT' && (
          <AssignDocumentConfig 
            config={config} 
            updateConfig={updateConfig} 
            documents={documents}
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'DISTRIBUTE_COINS' && (
          <DistributeCoinsConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'DELAY' && (
          <DelayConfig 
            config={config} 
            updateConfig={updateConfig} 
          />
        )}

        {actionType === 'HTTP_REQUEST' && (
          <HttpRequestConfig 
            config={config} 
            updateConfig={updateConfig} 
          />
        )}

        {actionType === 'ASSIGN_EQUIPMENT' && (
          <AssignEquipmentConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'ASSIGN_TRAINING' && (
          <AssignTrainingConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'CREATE_NOTIFICATION' && (
          <CreateNotificationConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'ADD_TO_TEAM' && (
          <AddToTeamConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'ASSIGN_TEST' && (
          <AssignTestConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'ASSIGN_VIDEO' && (
          <AssignVideoConfig 
            config={config} 
            updateConfig={updateConfig} 
            employees={employees}
            loading={loading}
          />
        )}

        {actionType === 'APPROVE_REQUEST' && (
          <ApproveRequestConfig 
            config={config} 
            updateConfig={updateConfig} 
          />
        )}
      </div>

      {/* Footer */}
      <div className="h-20 border-t px-6 flex items-center justify-between bg-gray-50">
        <div className="text-xs text-gray-500">
          {hasChanges ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert'}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges}
          className="bg-blue-600"
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}

// ==================== CONFIG COMPONENTS ====================

function SendEmailConfig({ config, updateConfig, employees, loading, emailTemplates }: any) {
  const [useTemplate, setUseTemplate] = useState(config.useTemplate !== false);
  
  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find((t: EmailTemplate) => t.id === templateId);
    if (template) {
      updateConfig('templateId', templateId);
      updateConfig('subject', template.subject);
      updateConfig('body', template.body_html);
      updateConfig('bodyText', template.body_text);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="recipient">Empfänger *</Label>
        <Select value={config.recipientType || 'triggered_employee'} onValueChange={(v) => updateConfig('recipientType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wähle Empfänger..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.recipientType === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Template Toggle */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="useTemplate"
            checked={useTemplate}
            onChange={(e) => {
              setUseTemplate(e.target.checked);
              updateConfig('useTemplate', e.target.checked);
            }}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <Label htmlFor="useTemplate" className="cursor-pointer text-blue-900">
            📄 E-Mail-Template verwenden (empfohlen)
          </Label>
        </div>
      </Card>

      {useTemplate && (
        <div>
          <Label htmlFor="templateId">Template auswählen *</Label>
          <Select 
            value={config.templateId || ''} 
            onValueChange={handleTemplateSelect} 
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wähle Template..." />
            </SelectTrigger>
            <SelectContent>
              {emailTemplates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Keine Templates gefunden. Erstelle ein Template unter Admin → E-Mail Templates.
                </div>
              ) : (
                emailTemplates.map((tmpl: EmailTemplate) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    <div className="flex items-center gap-2">
                      <span>{tmpl.name}</span>
                      <Badge className="text-xs">{tmpl.category}</Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="subject">Betreff *</Label>
        <Input 
          id="subject"
          value={config.subject || ''} 
          onChange={(e) => updateConfig('subject', e.target.value)}
          placeholder="z.B. Willkommen im Team, {{ employeeName }}!"
          disabled={useTemplate && config.templateId}
        />
        <Card className="mt-2 p-2 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-900 font-medium mb-1">💡 Verfügbare Variablen:</p>
          <div className="flex flex-wrap gap-1">
            {['employeeName', 'employeeEmail', 'startDate', 'endDate', 'organizationId'].map((v) => (
              <code key={v} className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{`{{ ${v} }}`}</code>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <Label htmlFor="body">Nachricht *</Label>
        <Textarea 
          id="body"
          value={config.body || ''} 
          onChange={(e) => updateConfig('body', e.target.value)}
          placeholder="Hallo {{ employeeName }},&#10;&#10;willkommen im Team!"
          rows={8}
          disabled={useTemplate && config.templateId}
        />
        <p className="text-xs text-gray-500 mt-1">💡 Tipp: Nutze Variablen wie {'{{'} employeeName {'}}'}  für dynamische Inhalte</p>
      </div>
    </div>
  );
}

function AssignBenefitsConfig({ config, updateConfig, benefits, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="benefitId">Benefit *</Label>
        <Select value={config.benefitId || ''} onValueChange={(v) => {
          const benefit = benefits.find((b: Benefit) => b.id === v);
          updateConfig('benefitId', v);
          updateConfig('benefitName', benefit?.name || '');
        }} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Wähle Benefit..." />
          </SelectTrigger>
          <SelectContent>
            {benefits.map((benefit: Benefit) => (
              <SelectItem key={benefit.id} value={benefit.id}>
                {benefit.name}
                {benefit.category && <Badge className="ml-2 text-xs">{benefit.category}</Badge>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="assignTo">Zuweisen zu *</Label>
        <Select value={config.assignTo || 'triggered_employee'} onValueChange={(v) => updateConfig('assignTo', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assignTo === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.position || 'Kein Titel'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="startDate">Start-Datum</Label>
        <Select value={config.startDate || 'immediate'} onValueChange={(v) => updateConfig('startDate', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wann starten..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Sofort</SelectItem>
            <SelectItem value="custom">Benutzerdefiniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.startDate === 'custom' && (
        <div>
          <Label htmlFor="customDate">Datum *</Label>
          <Input 
            type="date"
            id="customDate"
            value={config.customDate || ''} 
            onChange={(e) => updateConfig('customDate', e.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor="notes">Notizen (Optional)</Label>
        <Textarea 
          id="notes"
          value={config.notes || ''} 
          onChange={(e) => updateConfig('notes', e.target.value)}
          placeholder="Zusätzliche Informationen..."
          rows={3}
        />
      </div>
    </div>
  );
}

function CreateTaskConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Aufgaben-Titel *</Label>
        <Input 
          id="title"
          value={config.title || ''} 
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="z.B. Laptop für {{ employeeName }} vorbereiten"
        />
        <p className="text-xs text-gray-500 mt-1">💡 Variablen: {'{{'} employeeName {'}}'}, {'{{'} employeeEmail {'}}'}</p>
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea 
          id="description"
          value={config.description || ''} 
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Bitte Laptop für {{ employeeName }} vorbereiten"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">💡 Unterstützt Variablen</p>
      </div>

      <div>
        <Label htmlFor="assigneeType">Zuweisen zu *</Label>
        <Select value={config.assigneeType || 'triggered_employee'} onValueChange={(v) => updateConfig('assigneeType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="hr_admin">HR/Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assigneeType === 'specific_user' && (
        <div>
          <Label htmlFor="assigneeId">Benutzer *</Label>
          <Select value={config.assigneeId || ''} onValueChange={(v) => updateConfig('assigneeId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.position || 'Kein Titel'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select value={config.priority || 'MEDIUM'} onValueChange={(v) => updateConfig('priority', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Priorität wählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Niedrig</SelectItem>
            <SelectItem value="MEDIUM">Mittel</SelectItem>
            <SelectItem value="HIGH">Hoch</SelectItem>
            <SelectItem value="URGENT">Dringend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dueDate">Fälligkeitsdatum (Optional)</Label>
        <Input 
          type="date"
          id="dueDate"
          value={config.dueDate || ''} 
          onChange={(e) => updateConfig('dueDate', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="boardId">Kanban Board (Optional)</Label>
        <Input 
          id="boardId"
          value={config.boardId || ''} 
          onChange={(e) => updateConfig('boardId', e.target.value)}
          placeholder="Board ID"
        />
      </div>
    </div>
  );
}

function AssignDocumentConfig({ config, updateConfig, documents, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="documentId">Dokument *</Label>
        <Select value={config.documentId || ''} onValueChange={(v) => {
          const doc = documents.find((d: Document) => d.id === v);
          updateConfig('documentId', v);
          updateConfig('documentName', doc?.name || '');
        }} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Wähle Dokument..." />
          </SelectTrigger>
          <SelectContent>
            {documents.map((doc: Document) => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.name}
                {doc.category && <Badge className="ml-2 text-xs">{doc.category}</Badge>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="assignTo">Zuweisen zu *</Label>
        <Select value={config.assignTo || 'triggered_employee'} onValueChange={(v) => updateConfig('assignTo', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assignTo === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="requireSignature">Unterschrift erforderlich?</Label>
        <Select value={config.requireSignature || 'false'} onValueChange={(v) => updateConfig('requireSignature', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Nein</SelectItem>
            <SelectItem value="true">Ja</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DistributeCoinsConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="amount">Anzahl Coins *</Label>
        <Input 
          type="number"
          id="amount"
          value={config.amount || ''} 
          onChange={(e) => updateConfig('amount', e.target.value)}
          placeholder="z.B. 100"
          min="1"
        />
      </div>

      <div>
        <Label htmlFor="reason">Grund *</Label>
        <Input 
          id="reason"
          value={config.reason || ''} 
          onChange={(e) => updateConfig('reason', e.target.value)}
          placeholder="z.B. Willkommensbonus für {{ employeeName }}"
        />
        <p className="text-xs text-gray-500 mt-1">💡 Unterstützt Variablen</p>
      </div>

      <div>
        <Label htmlFor="recipientType">Empfänger *</Label>
        <Select value={config.recipientType || 'triggered_employee'} onValueChange={(v) => updateConfig('recipientType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.recipientType === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function DelayConfig({ config, updateConfig }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="duration">Dauer *</Label>
        <Input 
          type="number"
          id="duration"
          value={config.duration || ''} 
          onChange={(e) => updateConfig('duration', e.target.value)}
          placeholder="z.B. 5"
          min="1"
        />
      </div>

      <div>
        <Label htmlFor="unit">Einheit *</Label>
        <Select value={config.unit || 'days'} onValueChange={(v) => updateConfig('unit', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Einheit wählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minuten</SelectItem>
            <SelectItem value="hours">Stunden</SelectItem>
            <SelectItem value="days">Tage</SelectItem>
            <SelectItem value="weeks">Wochen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          Der Workflow wird für {config.duration || '...'} {config.unit === 'minutes' ? 'Minuten' : config.unit === 'hours' ? 'Stunden' : config.unit === 'weeks' ? 'Wochen' : 'Tage'} pausieren.
        </p>
      </Card>
    </div>
  );
}

function HttpRequestConfig({ config, updateConfig }: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-500 rounded">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900">HTTP Request Node</p>
            <p className="text-xs text-purple-700 mt-1">
              Rufe externe APIs auf wie in n8n. Unterstützt Authentication, Headers und mehr.
            </p>
            <div className="mt-2 pt-2 border-t border-purple-200">
              <p className="text-xs text-purple-800">
                🔐 <strong>Environment Variables:</strong> Nutze {'{{'} env.VAR_NAME {'}}'} für API Keys und Secrets
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <Label htmlFor="method">HTTP-Methode *</Label>
        <Select value={config.method || 'GET'} onValueChange={(v) => updateConfig('method', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET - Daten abrufen</SelectItem>
            <SelectItem value="POST">POST - Daten erstellen</SelectItem>
            <SelectItem value="PUT">PUT - Daten aktualisieren</SelectItem>
            <SelectItem value="PATCH">PATCH - Teilweise aktualisieren</SelectItem>
            <SelectItem value="DELETE">DELETE - Daten löschen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="url">URL *</Label>
        <Input 
          id="url"
          value={config.url || ''} 
          onChange={(e) => updateConfig('url', e.target.value)}
          placeholder="https://api.example.com/users"
        />
        <p className="text-xs text-gray-500 mt-1">
          💡 Variablen: {'{{'} employeeId {'}}'}, {'{{'} organizationId {'}}'}, {'{{'} env.API_BASE_URL {'}}'}
        </p>
      </div>

      <div>
        <Label htmlFor="authType">Authentication</Label>
        <Select value={config.authType || 'NONE'} onValueChange={(v) => updateConfig('authType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Keine Authentication</SelectItem>
            <SelectItem value="API_KEY">API Key</SelectItem>
            <SelectItem value="BEARER_TOKEN">Bearer Token</SelectItem>
            <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
            <SelectItem value="OAUTH2">OAuth2 (Client Credentials / Refresh Token)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.authType === 'API_KEY' && (
        <>
          <div>
            <Label htmlFor="apiKeyLocation">API Key Location</Label>
            <Select value={config.apiKeyLocation || 'HEADER'} onValueChange={(v) => updateConfig('apiKeyLocation', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HEADER">Header</SelectItem>
                <SelectItem value="QUERY">Query Parameter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="apiKeyName">API Key Name *</Label>
            <Input 
              id="apiKeyName"
              value={config.apiKeyName || ''} 
              onChange={(e) => updateConfig('apiKeyName', e.target.value)}
              placeholder={config.apiKeyLocation === 'QUERY' ? 'z.B. api_key' : 'z.B. X-API-Key'}
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Env Vars: {'{{'} env.API_KEY_NAME {'}}'}
            </p>
          </div>
          <div>
            <Label htmlFor="apiKeyValue">API Key Value *</Label>
            <Input 
              id="apiKeyValue"
              type="password"
              value={config.apiKeyValue || ''} 
              onChange={(e) => updateConfig('apiKeyValue', e.target.value)}
              placeholder="Dein API Key oder {{ env.MY_API_KEY }}"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Env Vars: {'{{'} env.MY_API_KEY {'}}'}
            </p>
          </div>
        </>
      )}

      {config.authType === 'BEARER_TOKEN' && (
        <div>
          <Label htmlFor="bearerToken">Bearer Token *</Label>
          <Input 
            id="bearerToken"
            type="password"
            value={config.bearerToken || ''} 
            onChange={(e) => updateConfig('bearerToken', e.target.value)}
            placeholder="Dein Bearer Token oder {{ env.BEARER_TOKEN }}"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 Env Vars: {'{{'} env.BEARER_TOKEN {'}}'}
          </p>
        </div>
      )}

      {config.authType === 'BASIC_AUTH' && (
        <>
          <div>
            <Label htmlFor="basicAuthUsername">Username *</Label>
            <Input 
              id="basicAuthUsername"
              value={config.basicAuthUsername || ''} 
              onChange={(e) => updateConfig('basicAuthUsername', e.target.value)}
              placeholder="Username oder {{ env.USERNAME }}"
            />
          </div>
          <div>
            <Label htmlFor="basicAuthPassword">Password *</Label>
            <Input 
              id="basicAuthPassword"
              type="password"
              value={config.basicAuthPassword || ''} 
              onChange={(e) => updateConfig('basicAuthPassword', e.target.value)}
              placeholder="Password oder {{ env.PASSWORD }}"
            />
          </div>
        </>
      )}

      {config.authType === 'OAUTH2' && (
        <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-purple-900">
            <Key className="w-4 h-4" />
            <span className="font-medium text-sm">OAuth2 Konfiguration</span>
          </div>
          
          <div>
            <Label htmlFor="oauth2GrantType">Grant Type *</Label>
            <Select value={config.oauth2GrantType || 'client_credentials'} onValueChange={(v) => updateConfig('oauth2GrantType', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_credentials">Client Credentials (Machine-to-Machine)</SelectItem>
                <SelectItem value="refresh_token">Refresh Token (User Token)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Client Credentials für Server-to-Server, Refresh Token für User-spezifische APIs
            </p>
          </div>

          <div>
            <Label htmlFor="oauth2ClientId">Client ID *</Label>
            <Input 
              id="oauth2ClientId"
              value={config.oauth2ClientId || ''} 
              onChange={(e) => updateConfig('oauth2ClientId', e.target.value)}
              placeholder="Deine OAuth2 Client ID oder {{ env.OAUTH_CLIENT_ID }}"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Env Vars: {'{{'} env.OAUTH_CLIENT_ID {'}}'}
            </p>
          </div>

          <div>
            <Label htmlFor="oauth2ClientSecret">Client Secret *</Label>
            <Input 
              id="oauth2ClientSecret"
              type="password"
              value={config.oauth2ClientSecret || ''} 
              onChange={(e) => updateConfig('oauth2ClientSecret', e.target.value)}
              placeholder="Dein OAuth2 Client Secret oder {{ env.OAUTH_CLIENT_SECRET }}"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Env Vars: {'{{'} env.OAUTH_CLIENT_SECRET {'}}'}
            </p>
          </div>

          <div>
            <Label htmlFor="oauth2TokenUrl">Token URL *</Label>
            <Input 
              id="oauth2TokenUrl"
              value={config.oauth2TokenUrl || ''} 
              onChange={(e) => updateConfig('oauth2TokenUrl', e.target.value)}
              placeholder="https://oauth.example.com/token oder {{ env.OAUTH_TOKEN_URL }}"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              OAuth2 Token Endpoint (z.B. https://accounts.spotify.com/api/token)
            </p>
          </div>

          {config.oauth2GrantType === 'client_credentials' && (
            <div>
              <Label htmlFor="oauth2Scopes">Scopes (Optional)</Label>
              <Input 
                id="oauth2Scopes"
                value={config.oauth2Scopes || ''} 
                onChange={(e) => updateConfig('oauth2Scopes', e.target.value)}
                placeholder="user-read-private user-read-email"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Space-separated scopes (z.B. "read:user write:repos")
              </p>
            </div>
          )}

          {config.oauth2GrantType === 'refresh_token' && (
            <div>
              <Label htmlFor="oauth2RefreshToken">Refresh Token *</Label>
              <Input 
                id="oauth2RefreshToken"
                type="password"
                value={config.oauth2RefreshToken || ''} 
                onChange={(e) => updateConfig('oauth2RefreshToken', e.target.value)}
                placeholder="Dein Refresh Token oder {{ env.OAUTH_REFRESH_TOKEN }}"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Env Vars: {'{{'} env.OAUTH_REFRESH_TOKEN {'}}'}
              </p>
            </div>
          )}

          <Card className="p-3 bg-blue-50 border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>ℹ️ OAuth2 Info:</strong> Tokens werden automatisch gecacht und bei Bedarf refreshed. 
              Nutze Environment Variables für sensible Daten!
            </p>
          </Card>
        </div>
      )}

      <div>
        <Label htmlFor="headers">Custom Headers (Optional)</Label>
        <Textarea 
          id="headers"
          value={config.headers || ''} 
          onChange={(e) => updateConfig('headers', e.target.value)}
          placeholder={'{\n  "Content-Type": "application/json",\n  "X-Custom-Header": "{{ variableName }}"\n}'}
          rows={3}
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">JSON-Format. Unterstützt Variablen.</p>
      </div>

      {['POST', 'PUT', 'PATCH'].includes(config.method) && (
        <div>
          <Label htmlFor="body">Request Body *</Label>
          <Textarea 
            id="body"
            value={config.body || ''} 
            onChange={(e) => updateConfig('body', e.target.value)}
            placeholder={'{\n  "name": "{{ employeeName }}",\n  "email": "{{ employeeEmail }}"\n}'}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">JSON-Format. Nutze Variablen für dynamische Daten.</p>
        </div>
      )}

      <div>
        <Button 
          type="button"
          variant="ghost" 
          size="sm" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-between"
        >
          Erweiterte Optionen
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </Button>
        
        {showAdvanced && (
          <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="timeout">Timeout (Sekunden)</Label>
              <Input 
                type="number"
                id="timeout"
                value={config.timeout || 30} 
                onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                min="1"
                max="300"
              />
            </div>
            
            <div>
              <Label htmlFor="retries">Wiederholungen bei Fehler</Label>
              <Input 
                type="number"
                id="retries"
                value={config.retries || 0} 
                onChange={(e) => updateConfig('retries', parseInt(e.target.value))}
                min="0"
                max="5"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="continueOnError"
                checked={config.continueOnError || false}
                onChange={(e) => updateConfig('continueOnError', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <Label htmlFor="continueOnError" className="cursor-pointer">
                Bei Fehler Workflow fortsetzen
              </Label>
            </div>
            
            <div>
              <Label htmlFor="responseVariable">Response in Variable speichern</Label>
              <Input 
                id="responseVariable"
                value={config.responseVariable || ''} 
                onChange={(e) => updateConfig('responseVariable', e.target.value)}
                placeholder="z.B. apiResponse"
              />
              <p className="text-xs text-gray-500 mt-1">
                Speichere die API-Antwort für spätere Nodes
              </p>
            </div>
          </div>
        )}
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-xs font-medium text-blue-900 mb-2">📘 Beispiele</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-blue-800">Slack Webhook:</p>
            <pre className="text-xs text-blue-700 overflow-x-auto whitespace-pre-wrap mt-1">
{`URL: {{ env.SLACK_WEBHOOK_URL }}
Methode: POST
Body: { "text": "Neuer Mitarbeiter: {{ employeeName }}" }`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-800">OAuth2 API Call (Spotify):</p>
            <pre className="text-xs text-blue-700 overflow-x-auto whitespace-pre-wrap mt-1">
{`URL: https://api.spotify.com/v1/me
Auth: OAuth2
Client ID: {{ env.SPOTIFY_CLIENT_ID }}
Client Secret: {{ env.SPOTIFY_CLIENT_SECRET }}
Token URL: https://accounts.spotify.com/api/token`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AssignEquipmentConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="equipmentName">Equipment Name *</Label>
        <Input 
          id="equipmentName"
          value={config.equipmentName || ''} 
          onChange={(e) => updateConfig('equipmentName', e.target.value)}
          placeholder="z.B. MacBook Pro 16"
        />
      </div>

      <div>
        <Label htmlFor="equipmentType">Typ</Label>
        <Select value={config.equipmentType || 'LAPTOP'} onValueChange={(v) => updateConfig('equipmentType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LAPTOP">Laptop</SelectItem>
            <SelectItem value="MONITOR">Monitor</SelectItem>
            <SelectItem value="PHONE">Telefon</SelectItem>
            <SelectItem value="TABLET">Tablet</SelectItem>
            <SelectItem value="OTHER">Sonstiges</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea 
          id="description"
          value={config.description || ''} 
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Details zum Equipment..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="serialNumber">Seriennummer (Optional)</Label>
        <Input 
          id="serialNumber"
          value={config.serialNumber || ''} 
          onChange={(e) => updateConfig('serialNumber', e.target.value)}
          placeholder="z.B. SN123456"
        />
      </div>

      <div>
        <Label htmlFor="assignTo">Zuweisen zu *</Label>
        <Select value={config.assignTo || 'triggered_employee'} onValueChange={(v) => updateConfig('assignTo', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assignTo === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function AssignTrainingConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trainingName">Schulung *</Label>
        <Input 
          id="trainingName"
          value={config.trainingName || ''} 
          onChange={(e) => updateConfig('trainingName', e.target.value)}
          placeholder="z.B. Sicherheitsschulung"
        />
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea 
          id="description"
          value={config.description || ''} 
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder="Details zur Schulung..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="assignTo">Zuweisen zu *</Label>
        <Select value={config.assignTo || 'triggered_employee'} onValueChange={(v) => updateConfig('assignTo', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assignTo === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="dueDate">Fälligkeitsdatum (Optional)</Label>
        <Input 
          type="date"
          id="dueDate"
          value={config.dueDate || ''} 
          onChange={(e) => updateConfig('dueDate', e.target.value)}
        />
      </div>
    </div>
  );
}

function CreateNotificationConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input 
          id="title"
          value={config.title || ''} 
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="z.B. Neue Nachricht"
        />
      </div>

      <div>
        <Label htmlFor="message">Nachricht *</Label>
        <Textarea 
          id="message"
          value={config.message || ''} 
          onChange={(e) => updateConfig('message', e.target.value)}
          placeholder="Benachrichtigungstext..."
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="recipientType">Empfänger *</Label>
        <Select value={config.recipientType || 'triggered_employee'} onValueChange={(v) => updateConfig('recipientType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem senden..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.recipientType === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="priority">Priorität</Label>
        <Select value={config.priority || 'NORMAL'} onValueChange={(v) => updateConfig('priority', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Niedrig</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="HIGH">Hoch</SelectItem>
            <SelectItem value="URGENT">Dringend</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AddToTeamConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="teamName">Team Name *</Label>
        <Input 
          id="teamName"
          value={config.teamName || ''} 
          onChange={(e) => updateConfig('teamName', e.target.value)}
          placeholder="z.B. Engineering Team"
        />
      </div>

      <div>
        <Label htmlFor="role">Rolle im Team</Label>
        <Select value={config.role || 'MEMBER'} onValueChange={(v) => updateConfig('role', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEMBER">Mitglied</SelectItem>
            <SelectItem value="LEAD">Team Lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="userType">Benutzer *</Label>
        <Select value={config.userType || 'triggered_employee'} onValueChange={(v) => updateConfig('userType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.userType === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function AssignTestConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="testName">Test Name *</Label>
        <Input 
          id="testName"
          value={config.testName || ''} 
          onChange={(e) => updateConfig('testName', e.target.value)}
          placeholder="z.B. Sicherheitstest"
        />
      </div>

      <div>
        <Label htmlFor="assignTo">Zuweisen zu *</Label>
        <Select value={config.assignTo || 'triggered_employee'} onValueChange={(v) => updateConfig('assignTo', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assignTo === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="dueDate">Fälligkeitsdatum (Optional)</Label>
        <Input 
          type="date"
          id="dueDate"
          value={config.dueDate || ''} 
          onChange={(e) => updateConfig('dueDate', e.target.value)}
        />
      </div>
    </div>
  );
}

function AssignVideoConfig({ config, updateConfig, employees, loading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="videoName">Video Name *</Label>
        <Input 
          id="videoName"
          value={config.videoName || ''} 
          onChange={(e) => updateConfig('videoName', e.target.value)}
          placeholder="z.B. Willkommensvideo"
        />
      </div>

      <div>
        <Label htmlFor="videoUrl">Video URL</Label>
        <Input 
          id="videoUrl"
          value={config.videoUrl || ''} 
          onChange={(e) => updateConfig('videoUrl', e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label htmlFor="assignTo">Zuweisen zu *</Label>
        <Select value={config.assignTo || 'triggered_employee'} onValueChange={(v) => updateConfig('assignTo', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wem zuweisen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="triggered_employee">Getriggerter Mitarbeiter</SelectItem>
            <SelectItem value="specific_user">Spezifischer Benutzer</SelectItem>
            <SelectItem value="all_employees">Alle Mitarbeiter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.assignTo === 'specific_user' && (
        <div>
          <Label htmlFor="userId">Benutzer *</Label>
          <Select value={config.userId || ''} onValueChange={(v) => updateConfig('userId', v)} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Wähle Benutzer..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: Employee) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function ApproveRequestConfig({ config, updateConfig }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="requestType">Antragstyp *</Label>
        <Select value={config.requestType || 'BENEFIT'} onValueChange={(v) => updateConfig('requestType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BENEFIT">Benefit Antrag</SelectItem>
            <SelectItem value="LEAVE">Urlaubsantrag</SelectItem>
            <SelectItem value="EXPENSE">Spesenantrag</SelectItem>
            <SelectItem value="OTHER">Sonstiges</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="autoApprove">Automatisch genehmigen?</Label>
        <Select value={config.autoApprove || 'false'} onValueChange={(v) => updateConfig('autoApprove', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Nein (manuelle Genehmigung)</SelectItem>
            <SelectItem value="true">Ja (automatisch)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notizen (Optional)</Label>
        <Textarea 
          id="notes"
          value={config.notes || ''} 
          onChange={(e) => updateConfig('notes', e.target.value)}
          placeholder="Zusätzliche Informationen..."
          rows={3}
        />
      </div>
    </div>
  );
}