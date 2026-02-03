/**
 * @file BrowoKo_TaskModal.tsx
 * @domain HR - Task Management
 * @description Modal for creating/editing tasks
 * @created v4.10.16
 */

import { useState, useEffect } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string;
  team_id?: string;
}

interface TaskModalProps {
  task?: Task | null;
  boardId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function BrowoKo_TaskModal({ task, boardId, onClose, onSave }: TaskModalProps) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditMode = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    }
  }, [task]);

  const getAuthToken = async () => {
    try {
      if (user && typeof user.getIdToken === 'function') {
        return await user.getIdToken();
      }
      return publicAnonKey;
    } catch {
      return publicAnonKey;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);

    try {
      const token = await getAuthToken();
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
        team_id: task?.team_id || boardId,
        status: task?.status || 'TODO',
      };

      const url = isEditMode
        ? `${supabaseUrl}/functions/v1/BrowoKoordinator-Tasks/tasks/${task.id}`
        : `${supabaseUrl}/functions/v1/BrowoKoordinator-Tasks/tasks`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        console.error('Save task error:', error);
        alert('Fehler beim Speichern der Task');
      }
    } catch (error) {
      console.error('Save task error:', error);
      alert('Fehler beim Speichern der Task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Task wirklich löschen?')) return;

    setDeleting(true);

    try {
      const token = await getAuthToken();
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Tasks/tasks/${task.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        console.error('Delete task error:', error);
        alert('Fehler beim Löschen der Task');
      }
    } catch (error) {
      console.error('Delete task error:', error);
      alert('Fehler beim Löschen der Task');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Task bearbeiten' : 'Neue Task erstellen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Titel *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task-Titel eingeben..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Beschreibung
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung der Task..."
              rows={4}
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Priorität
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="LOW">Niedrig</option>
                <option value="MEDIUM">Mittel</option>
                <option value="HIGH">Hoch</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Fälligkeitsdatum
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <div>
            {isEditMode && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || saving || deleting}
            >
              {saving ? 'Speichern...' : isEditMode ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
