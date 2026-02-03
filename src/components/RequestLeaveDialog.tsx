/**
 * RequestLeaveDialog Component
 * 
 * Modal for creating leave/absence requests:
 * - Vacation (Urlaub) or Sick (Krankmeldung)
 * - Date range selection with business days calculation
 * - Half-day option
 * - Sick note upload (optional)
 * - Admin can create for other employees
 * - Validation: quota, overlaps, weekends/holidays
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Calendar, Upload, AlertCircle, Info, Umbrella, Heart } from './icons/BrowoKoIcons';
import { Alert, AlertDescription } from './ui/alert';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import { useAdminStore } from '../stores/BrowoKo_adminStore';
import { useLeaveManagement } from '../hooks/BrowoKo_useLeaveManagement';
import { useBusinessDays } from '../hooks/useBusinessDays';
import { FEDERAL_STATES } from '../hooks/useGermanHolidays';
import { LeaveType } from '../types/database';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';
import sanitize from '../utils/security/BrowoKo_sanitization';

interface RequestLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function RequestLeaveDialog({
  open,
  onOpenChange,
  onSuccess,
}: RequestLeaveDialogProps) {
  const { profile } = useAuthStore();
  const { users } = useAdminStore();
  
  // Check if user is admin
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN' || profile?.role === 'HR' || profile?.role === 'TEAMLEAD';
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string>(profile?.id || '');
  const [leaveType, setLeaveType] = useState<LeaveType>('VACATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [comment, setComment] = useState('');
  const [federalState, setFederalState] = useState<string>('');
  const [sickNoteFile, setSickNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);

  // Get federal state from user location
  useEffect(() => {
    if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      // TODO: Get federal state from location
      setFederalState('NW'); // Default to NRW for now
    }
  }, [selectedUserId, users]);

  const { quota, createLeaveRequest, loading: submitting } = useLeaveManagement(
    selectedUserId,
    federalState
  );

  const { businessDays, isWeekend, isHoliday } = useBusinessDays(
    startDate || null,
    endDate || null,
    { includeHolidays: true, federalState }
  );

  // Calculate actual days
  const calculatedDays = isHalfDay ? 0.5 : businessDays;

  // Check if dates include weekend or holiday
  const includesWeekend = startDate && endDate && (() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      if (isWeekend(current)) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  })();

  const includesHoliday = startDate && endDate && (() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      if (isHoliday(current)) return true;
      current.setDate(current.getDate() + 1);
    }
    return false;
  })();

  // Validation
  // UNPAID_LEAVE does NOT affect vacation quota - only check quota for VACATION
  const isQuotaExceeded = leaveType === 'VACATION' && quota && calculatedDays > quota.availableDays;
  const canSubmit = selectedUserId && startDate && endDate && !isQuotaExceeded;

  // Reset form
  const resetForm = () => {
    setSelectedUserId(profile?.id || '');
    setLeaveType('VACATION');
    setStartDate('');
    setEndDate('');
    setIsHalfDay(false);
    setComment('');
    setSickNoteFile(null);
  };

  // Upload sick note
  const uploadSickNote = async (): Promise<string | null> => {
    if (!sickNoteFile) return null;

    try {
      setUploading(true);
      const fileExt = sickNoteFile.name.split('.').pop();
      const fileName = `${selectedUserId}-${Date.now()}.${fileExt}`;
      const filePath = `sick-notes/${fileName}`;

      // Upload via BFF
      const formData = new FormData();
      formData.append('file', sickNoteFile);
      formData.append('path', filePath);
      formData.append('userId', selectedUserId);

      const uploadResponse = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { publicUrl } = await uploadResponse.json();

      return publicUrl;
    } catch (error) {
      console.error('Error uploading sick note:', error);
      toast.error('Fehler beim Hochladen der Krankschreibung');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      // ✅ SANITIZE DATES
      const sanitizedStartDate = sanitize.date(startDate);
      const sanitizedEndDate = sanitize.date(endDate);

      if (!sanitizedStartDate || !sanitizedEndDate) {
        toast.error('Ungültige Datumsangaben');
        return;
      }

      // ✅ SANITIZE COMMENT
      const sanitizedComment = sanitize.multiline(comment);

      // Upload sick note if provided
      let fileUrl: string | null = null;
      if (leaveType === 'SICK' && sickNoteFile) {
        fileUrl = await uploadSickNote();
      }

      const result = await createLeaveRequest({
        userId: selectedUserId,
        startDate: sanitizedStartDate,
        endDate: sanitizedEndDate,
        type: leaveType,
        comment: sanitizedComment || undefined,
        isHalfDay,
        fileUrl: fileUrl || undefined,
        federalState,
        createdBy: profile?.id,
      });

      if (result.success) {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Fehler beim Erstellen des Antrags');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Fehler beim Erstellen des Antrags');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="form-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isAdmin && selectedUserId !== profile?.id
              ? 'Urlaub/Abwesenheit für Mitarbeiter'
              : 'Urlaub/Abwesenheit'}
          </DialogTitle>
          <DialogDescription>
            {isAdmin && selectedUserId !== profile?.id
              ? 'Erstellen Sie einen Antrag für einen Mitarbeiter'
              : 'Beantragen Sie Urlaub oder melden Sie sich krank'}
          </DialogDescription>
        </DialogHeader>

        <div className="form-grid">
          {/* User Selector - Only for Admins */}
          {isAdmin && (
            <div className="form-field">
              <Label htmlFor="user-select" className="form-label">
                Mitarbeiter <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {/* Option for yourself */}
                  <SelectItem key={`req-leave-user-${profile?.id || 'self'}`} value={profile?.id || ''}>
                    {profile?.first_name} {profile?.last_name} (Sie selbst)
                  </SelectItem>
                  
                  {/* Other employees */}
                  {users
                    .filter(u => u.id !== profile?.id)
                    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
                    .map(user => (
                      <SelectItem key={`req-leave-user-${user.id}`} value={user.id}>
                        {user.last_name}, {user.first_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Als Admin/HR können Sie Anträge für sich selbst oder andere Mitarbeiter erstellen.
              </p>
            </div>
          )}

          {/* Leave Type */}
          <div className="form-field">
            <Label className="form-label">Art der Abwesenheit</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={leaveType === 'VACATION' ? 'default' : 'outline'}
                className="w-full min-h-[80px] px-3 py-3 flex flex-col gap-2 items-center justify-center whitespace-normal"
                onClick={() => setLeaveType('VACATION')}
              >
                <Umbrella className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm text-center leading-snug">Urlaub</span>
              </Button>
              <Button
                type="button"
                variant={leaveType === 'SICK' ? 'default' : 'outline'}
                className="w-full min-h-[80px] px-3 py-3 flex flex-col gap-2 items-center justify-center whitespace-normal"
                onClick={() => setLeaveType('SICK')}
              >
                <Heart className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm text-center leading-snug">Krankmeldung</span>
              </Button>
              <Button
                type="button"
                variant={leaveType === 'UNPAID_LEAVE' ? 'default' : 'outline'}
                className="w-full min-h-[80px] px-3 py-3 flex flex-col gap-2 items-center justify-center whitespace-normal"
                onClick={() => setLeaveType('UNPAID_LEAVE')}
              >
                <Calendar className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm text-center leading-snug">Unbezahlte Abwesenheit</span>
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-field">
              <Label className="form-label">Startdatum</Label>
              <Input
                type="date"
                className="form-input [&::-webkit-calendar-picker-indicator]:brightness-0"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-field">
              <Label className="form-label">Enddatum</Label>
              <Input
                type="date"
                className="form-input [&::-webkit-calendar-picker-indicator]:brightness-0"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Half Day Option */}
          {startDate === endDate && startDate && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <Label htmlFor="half-day" className="cursor-pointer">
                Halber Tag
              </Label>
              <Switch
                id="half-day"
                checked={isHalfDay}
                onCheckedChange={setIsHalfDay}
              />
            </div>
          )}

          {/* Calculated Days Info */}
          {startDate && endDate && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>Tage:</strong> {calculatedDays} Arbeitstag{calculatedDays !== 1 ? 'e' : ''}
                    {includesWeekend && ' (Wochenenden ausgeschlossen)'}
                    {includesHoliday && ' (Feiertage ausgeschlossen)'}
                  </p>
                  {leaveType === 'VACATION' && quota && (
                    <p>
                      <strong>Verfügbar:</strong> {quota.availableDays} von {quota.totalDays} Tagen
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quota Exceeded Warning */}
          {isQuotaExceeded && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Nicht genügend Urlaubstage verfügbar. Sie haben nur {quota?.availableDays} Tage zur Verfügung.
              </AlertDescription>
            </Alert>
          )}

          {/* Sick Note Upload (Only for SICK) */}
          {leaveType === 'SICK' && (
            <div className="space-y-2">
              <Label>Krankschreibung (optional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSickNoteFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {sickNoteFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSickNoteFile(null)}
                  >
                    Entfernen
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Wird bei Dokumente → Sonstiges gespeichert
              </p>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label>Kommentar (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="z.B. Grund, Vertretung, etc."
              rows={3}
            />
          </div>

          {/* Federal State (Hidden, auto-detected) */}
          <input type="hidden" value={federalState} />
        </div>

        <div className="form-footer">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || uploading}
          >
            {submitting || uploading ? 'Wird gespeichert...' : 'Antrag einreichen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}