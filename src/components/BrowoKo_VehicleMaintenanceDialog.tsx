/**
 * @file BrowoKo_VehicleMaintenanceDialog.tsx
 * @version 1.0.0
 * @description Dialog for adding/editing vehicle maintenance records
 */

import { useState, useEffect } from 'react';
import { Wrench, Calendar as CalendarIcon } from './icons/BrowoKoIcons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface VehicleMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  maintenance?: Maintenance | null;
  onSuccess: () => void;
}

export interface Maintenance {
  id?: string;
  vehicle_id?: string;
  title: string;
  description?: string;
  maintenance_date: string;
  cost?: number;
  status: 'planned' | 'completed' | 'overdue';
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Geplant', color: 'blue' },
  { value: 'completed', label: 'Abgeschlossen', color: 'green' },
  { value: 'overdue', label: 'Überfällig', color: 'red' },
];

export function VehicleMaintenanceDialog({ 
  open, 
  onOpenChange, 
  vehicleId,
  maintenance,
  onSuccess 
}: VehicleMaintenanceDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState<Date | undefined>(new Date());
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<'planned' | 'completed' | 'overdue'>('planned');
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Initialize form when maintenance prop changes
  useEffect(() => {
    if (maintenance) {
      setTitle(maintenance.title);
      setDescription(maintenance.description || '');
      setMaintenanceDate(new Date(maintenance.maintenance_date));
      setCost(maintenance.cost?.toString() || '');
      setStatus(maintenance.status);
    } else {
      // Reset form for new maintenance
      setTitle('');
      setDescription('');
      setMaintenanceDate(new Date());
      setCost('');
      setStatus('planned');
    }
  }, [maintenance, open]);

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }

    if (!maintenanceDate) {
      toast.error('Bitte wählen Sie ein Datum');
      return;
    }

    setSaving(true);

    try {
      const { supabaseUrl, publicAnonKey } = await import('../utils/supabase/info');
      
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        maintenance_date: format(maintenanceDate, 'yyyy-MM-dd'),
        cost: cost ? parseFloat(cost) : null,
        status,
      };

      const isEdit = !!maintenance?.id;
      const url = isEdit
        ? `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/maintenances/${maintenance.id}`
        : `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/maintenances`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save maintenance');
      }

      toast.success(isEdit ? 'Wartung aktualisiert' : 'Wartung hinzugefügt');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save maintenance error:', error);
      toast.error('Fehler beim Speichern: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {maintenance ? 'Wartung bearbeiten' : 'Wartung hinzufügen'}
          </DialogTitle>
          <DialogDescription>
            Erfassen Sie Wartungsarbeiten für dieses Fahrzeug
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Ölwechsel, Inspektion, Reifenwechsel"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details zur Wartung..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Maintenance Date */}
            <div className="space-y-2">
              <Label>Wartungsdatum *</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {maintenanceDate ? (
                      format(maintenanceDate, 'PPP', { locale: de })
                    ) : (
                      <span>Datum wählen</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={maintenanceDate}
                    onSelect={(date) => {
                      setMaintenanceDate(date);
                      setDatePickerOpen(false);
                    }}
                    locale={de}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <Label htmlFor="cost">Kosten (€)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full bg-${option.color}-500`}
                      />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !maintenanceDate}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Speichern...
              </>
            ) : (
              maintenance ? 'Aktualisieren' : 'Hinzufügen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
