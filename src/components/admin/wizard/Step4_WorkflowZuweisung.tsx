/**
 * Step 4: Workflow-Zuweisung
 * Multi-Select für Onboarding/Offboarding Workflows
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { Network, Loader2 } from '../../icons/BrowoKoIcons';
import { toast } from 'sonner@2.0.3';
import { supabaseUrl, publicAnonKey } from '../../../utils/supabase/info';
import { getTriggerBadge } from '../../../utils/workflowHelpers';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
}

interface Step4Props {
  formData: any;
  onUpdate: (updates: any) => void;
}

export default function Step4_WorkflowZuweisung({ formData, onUpdate }: Step4Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter only active workflows
        const activeWorkflows = (data.workflows || []).filter((w: Workflow) => w.is_active);
        setWorkflows(activeWorkflows);
      } else {
        throw new Error('Failed to load workflows');
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Workflows konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkflow = (workflowId: string) => {
    const currentWorkflows = formData.assigned_workflows || [];
    const isSelected = currentWorkflows.includes(workflowId);

    const updatedWorkflows = isSelected
      ? currentWorkflows.filter((id: string) => id !== workflowId)
      : [...currentWorkflows, workflowId];

    onUpdate({ assigned_workflows: updatedWorkflows });
  };

  // Removed - now using getTriggerBadge from utils/workflowHelpers

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Lade Workflows...</p>
        </CardContent>
      </Card>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Workflow-Zuweisung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Keine aktiven Workflows vorhanden</p>
            <p className="text-sm text-gray-400">
              Erstelle zuerst Workflows im Workflow-Bereich
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedCount = (formData.assigned_workflows || []).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          Workflow-Zuweisung
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {selectedCount} ausgewählt
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Wähle einen oder mehrere Workflows aus, die für diesen Mitarbeiter ausgeführt werden sollen.
          Die Workflows werden nach dem Speichern automatisch gestartet.
        </p>

        <div className="space-y-3">
          {workflows.map((workflow) => {
            const isSelected = (formData.assigned_workflows || []).includes(workflow.id);

            return (
              <div
                key={workflow.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-blue-400 ${
                  isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white'
                }`}
                onClick={() => handleToggleWorkflow(workflow.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleWorkflow(workflow.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                      {getTriggerBadge(workflow.trigger_type)}
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedCount === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Hinweis: Du hast noch keinen Workflow ausgewählt. Der Mitarbeiter wird ohne automatische
              Workflows erstellt.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}