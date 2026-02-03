/**
 * @file MeineDaten.tsx
 * @domain HRTHIS - User Personal Data
 * @description Complete user data screen with CARD-LEVEL EDITING v4.8.0 and DYNAMIC TAB ROUTING v4.10.16
 * @version v4.10.16 - Renamed from PersonalSettings + Dynamic tab routing
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase/client';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { 
  Upload, User, Calendar, Timer, FileText, Shield, ArrowLeft, Plus, CheckCircle2, XCircle, Clock, MessageSquare
} from './icons/BrowoKoIcons';
import { toast } from 'sonner@2.0.3';
import PermissionsView from './PermissionsView';
import { DocumentsTabContent } from './BrowoKo_DocumentsTabContent';
import { PerformanceReviewsTabContent } from './BrowoKo_PerformanceReviewsTabContent';
import { ImageCropDialog } from './ImageCropDialog';
import { EditWarningDialog } from './BrowoKo_EditWarningDialog';
import { AuditLogsView } from './BrowoKo_AuditLogsView';
import MyRequestsOverview from './BrowoKo_MyRequestsOverview';
import RequestLeaveDialog from './RequestLeaveDialog';
import MyRequestsCalendar from './BrowoKo_MyRequestsCalendar';
import { useCardEditing } from '../hooks/BrowoKo_useCardEditing';
import { useFieldPermissions } from '../hooks/BrowoKo_useFieldPermissions';
import { useDateFilter } from '../hooks/useDateFilter';
import { useLeaveRequestsList } from '../hooks/BrowoKo_useLeaveRequestsList';
import { useTabRouting, type TabConfig } from '../hooks/BrowoKo_useTabRouting';
import type { UserRole } from '../types/database';

// Import Card Components
import { PersonalDataCard } from './user/BrowoKo_PersonalDataCard';
import { AddressCard } from './user/BrowoKo_AddressCard';
import { BankInfoCard } from './user/BrowoKo_BankInfoCard';
import { ClothingSizesCard } from './user/BrowoKo_ClothingSizesCard';
import { EmergencyContactCard } from './user/BrowoKo_EmergencyContactCard';
import { LanguageSkillsCard } from './user/BrowoKo_LanguageSkillsCard';

// Tab configuration - Add new tabs here and routing will be automatic!
const TABS: TabConfig[] = [
  { 
    value: 'personal', 
    label: 'Meine Personalakte',
    mobileLabel: 'Profil',
    icon: User
  },
  { 
    value: 'logs', 
    label: 'Meine Logs',
    mobileLabel: 'Logs',
    icon: Timer
  },
  { 
    value: 'permissions', 
    label: 'Meine Berechtigungen',
    mobileLabel: 'Rechte',
    icon: Shield
  },
  { 
    value: 'requests', 
    label: 'Meine Anträge',
    mobileLabel: 'Anträge',
    icon: FileText
  },
  { 
    value: 'documents', 
    label: 'Meine Dokumente',
    mobileLabel: 'Docs',
    icon: FileText
  },
  { 
    value: 'performance', 
    label: 'Mitarbeitergespräche',
    mobileLabel: 'Gespräche',
    icon: MessageSquare
  },
];

export default function MeineDaten() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [timeRecords, setTimeRecords] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  // Tab routing - automatically handles URL synchronization
  const { activeTab, changeTab, getTabSlug } = useTabRouting(TABS, 'personal');

  // Image Upload & Crop
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | undefined>(undefined);

  // Card editing state management
  const cardEditing = useCardEditing();
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Request Leave Dialog
  const [requestLeaveDialogOpen, setRequestLeaveDialogOpen] = useState(false);

  // Work Information State (Read Only)
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [vacationDays, setVacationDays] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [salary, setSalary] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [contractStatus, setContractStatus] = useState<string | null>(null);
  const [contractEndDate, setContractEndDate] = useState<string | null>(null);
  const [reEntryDates, setReEntryDates] = useState<string[]>([]);
  const [probationPeriodMonths, setProbationPeriodMonths] = useState<number | null>(null);
  const [workPhone, setWorkPhone] = useState('');

  // Break Settings State (readonly)
  const [breakAuto, setBreakAuto] = useState(false);
  const [breakManual, setBreakManual] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(30);

  // Work Time Model State (readonly)
  const [workTimeModel, setWorkTimeModel] = useState<string | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [flextimeStartEarliest, setFlextimeStartEarliest] = useState('');
  const [flextimeStartLatest, setFlextimeStartLatest] = useState('');
  const [flextimeEndEarliest, setFlextimeEndEarliest] = useState('');
  const [flextimeEndLatest, setFlextimeEndLatest] = useState('');
  const [onCall, setOnCall] = useState(false);

  // Special Regulations
  const [specialRegulations, setSpecialRegulations] = useState<any[]>([]);

  // Permissions hook
  const permissions = useFieldPermissions();

  // Date filters for logs
  const timeFilterHook = useDateFilter();
  const leaveFilterHook = useDateFilter();

  // Leave requests hook (for "Meine Anträge" tab)
  // Force to show only OWN requests (always pass 'USER' role regardless of actual role)
  const leaveRequestsListHook = useLeaveRequestsList(profile?.id || '', 'USER');

  // Load profile on mount
  useEffect(() => {
    loadProfile();
    loadLocations();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      
      // Work Info
      setPosition(data.position || '');
      setDepartment(data.department || '');
      setWeeklyHours(data.weekly_hours || '');
      setVacationDays(data.vacation_days || '');
      setEmploymentType(data.employment_type || '');
      setSalary(data.salary || null);
      setStartDate(data.start_date || '');
      setContractStatus(data.contract_status || null);
      setContractEndDate(data.contract_end_date || null);
      setReEntryDates(data.re_entry_dates || []);
      setProbationPeriodMonths(data.probation_period_months || null);
      setWorkPhone(data.work_phone || '');
      setSpecialRegulations(data.special_regulations || []);

      // Break Settings
      setBreakAuto(data.break_auto || false);
      setBreakManual(data.break_manual || false);
      setBreakMinutes(data.break_minutes || 30);

      // Work Time Model
      setWorkTimeModel(data.work_time_model || null);
      setShiftStartTime(data.shift_start_time || '');
      setShiftEndTime(data.shift_end_time || '');
      setFlextimeStartEarliest(data.flextime_start_earliest || '');
      setFlextimeStartLatest(data.flextime_start_latest || '');
      setFlextimeEndEarliest(data.flextime_end_earliest || '');
      setFlextimeEndLatest(data.flextime_end_latest || '');
      setOnCall(data.on_call || false);

    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Fehler beim Laden des Profils');
    }
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageForCrop(reader.result as string);
      setShowImageCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      // Upload to storage via BFF
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', croppedBlob, fileName);
      formData.append('path', `profile-pictures/${fileName}`);
      formData.append('userId', user.id);

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

      // Update user profile (DB call - will be migrated in Phase 2)
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Profilbild erfolgreich aktualisiert');
      loadProfile();

    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast.error(`Fehler beim Hochladen: ${error.message}`);
    } finally {
      setShowImageCropDialog(false);
      setTempImageForCrop(undefined);
    }
  };

  const handleCardEditStart = (cardId: string) => {
    const allowed = cardEditing.startEditing(cardId);
    if (!allowed) {
      setShowWarningDialog(true);
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-4 md:pt-6">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zum Dashboard
            </Button>
            
            <h1 className="text-2xl font-semibold text-gray-900">
              Meine Daten
            </h1>

            {/* Spacer for symmetry */}
            <div className="w-[180px]" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
          {/* Desktop: Auto layout with wrap */}
          <TabsList className="hidden md:flex md:flex-wrap md:h-auto md:gap-2 md:p-2 w-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex-shrink-0"
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Mobile: 3 columns grid */}
          <TabsList className="md:hidden grid grid-cols-3 gap-2 h-auto p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="flex flex-col items-center gap-1 py-3 text-xs"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{tab.mobileLabel || tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* PERSONAL TAB */}
          <TabsContent value="personal" className="space-y-6">
            {/* Profile Picture */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage 
                      src={profile?.profile_picture || undefined} 
                      alt={`${profile?.first_name} ${profile?.last_name}`} 
                    />
                    <AvatarFallback className="text-2xl">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Profilbild</h3>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="profile-picture-upload"
                    />
                    <label htmlFor="profile-picture-upload">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Bild hochladen
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Empfohlen: Quadratisches Bild, mindestens 400x400px
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 1: PERSÖNLICHE INFORMATIONEN */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Persönliche Informationen</h2>

              {/* Personal Data Card */}
              <PersonalDataCard
                user={profile}
                canEdit={cardEditing.canEdit('personal_info')}
                onEditStart={() => handleCardEditStart('personal_info')}
                onEditEnd={cardEditing.stopEditing}
                onDataUpdated={loadProfile}
                permissions={permissions}
              />

              {/* Address Card */}
              <AddressCard
                user={profile}
                canEdit={cardEditing.canEdit('address')}
                onEditStart={() => handleCardEditStart('address')}
                onEditEnd={cardEditing.stopEditing}
                onDataUpdated={loadProfile}
                permissions={permissions}
              />

              {/* Bank Info Card */}
              <BankInfoCard
                user={profile}
                canEdit={cardEditing.canEdit('bank_info')}
                onEditStart={() => handleCardEditStart('bank_info')}
                onEditEnd={cardEditing.stopEditing}
                onDataUpdated={loadProfile}
                permissions={permissions}
              />

              {/* Clothing Sizes Card */}
              <ClothingSizesCard
                user={profile}
                canEdit={cardEditing.canEdit('clothing_sizes')}
                onEditStart={() => handleCardEditStart('clothing_sizes')}
                onEditEnd={cardEditing.stopEditing}
                onDataUpdated={loadProfile}
                permissions={permissions}
              />

              {/* Emergency Contacts Card */}
              <EmergencyContactCard
                user={profile}
                canEdit={cardEditing.canEdit('emergency_contact')}
                onEditStart={() => handleCardEditStart('emergency_contact')}
                onEditEnd={cardEditing.stopEditing}
                onDataUpdated={loadProfile}
                permissions={permissions}
              />

              {/* Language Skills Card */}
              <LanguageSkillsCard
                user={profile}
                canEdit={cardEditing.canEdit('language_skills')}
                onEditStart={() => handleCardEditStart('language_skills')}
                onEditEnd={cardEditing.stopEditing}
                onDataUpdated={loadProfile}
                permissions={permissions}
              />
            </div>

            {/* SECTION 2: ARBEITSINFORMATIONEN */}
            <div className="space-y-6 mt-12">
              <h2 className="text-2xl font-semibold text-gray-900">Arbeitsinformationen</h2>

              {/* Work Information - Simplified (v4.10.15) */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Beschäftigungsinformationen</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Position</p>
                      <p className="text-base font-medium">{position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Abteilung</p>
                      <p className="text-base font-medium">{department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Beschäftigungsart</p>
                      <p className="text-base font-medium">{employmentType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Wochenstunden</p>
                      <p className="text-base font-medium">{weeklyHours ? `${weeklyHours}h` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Urlaubstage</p>
                      <p className="text-base font-medium">{vacationDays ? `${vacationDays} Tage` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Eintrittsdatum</p>
                      <p className="text-base font-medium">
                        {startDate ? new Date(startDate).toLocaleDateString('de-DE') : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LOGS TAB - AUDIT PROTOCOL */}
          <TabsContent value="logs" className="space-y-6">
            {profile?.id ? (
              <AuditLogsView 
                userId={profile.id} 
                userName={`${profile.first_name} ${profile.last_name}`}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Lade Profil...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PERMISSIONS TAB */}
          <TabsContent value="permissions">
            <PermissionsView role={profile?.role as UserRole} />
          </TabsContent>

          {/* REQUESTS TAB */}
          <TabsContent value="requests" className="space-y-6">
            {/* Button to create new leave request */}
            <div className="flex justify-end">
              <Button onClick={() => setRequestLeaveDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Urlaub/Abwesenheit beantragen
              </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Total Requests */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Gesamt</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {leaveRequestsListHook.requests.length}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Pending Requests */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Ausstehend</p>
                      <p className="text-2xl font-semibold text-[#d08700]">
                        {leaveRequestsListHook.requests.filter(r => r.status === 'PENDING').length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-[#d08700]" />
                  </div>
                </CardContent>
              </Card>

              {/* Approved Requests */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Genehmigt</p>
                      <p className="text-2xl font-semibold text-[#00a63e]">
                        {leaveRequestsListHook.requests.filter(r => r.status === 'APPROVED').length}
                      </p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-[#00a63e]" />
                  </div>
                </CardContent>
              </Card>

              {/* Rejected Requests */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Abgelehnt</p>
                      <p className="text-2xl font-semibold text-[#e7000b]">
                        {leaveRequestsListHook.requests.filter(r => r.status === 'REJECTED').length}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-[#e7000b]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personal Calendar Widget - Collapsible */}
            <MyRequestsCalendar 
              userId={profile?.id} 
              defaultCollapsed={true}
              onRefresh={() => leaveRequestsListHook.reload()}
            />

            {/* Leave Requests List */}
            <MyRequestsOverview
              requests={leaveRequestsListHook.requests}
              loading={leaveRequestsListHook.loading}
              canApprove={false}
              onApprove={leaveRequestsListHook.approveRequest}
              onReject={leaveRequestsListHook.rejectRequest}
            />
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents">
            <DocumentsTabContent userId={profile?.id} userName={`${profile?.first_name} ${profile?.last_name}`} />
          </TabsContent>

          {/* PERFORMANCE REVIEWS TAB */}
          <TabsContent value="performance">
            <PerformanceReviewsTabContent />
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={showImageCropDialog}
        onOpenChange={setShowImageCropDialog}
        imageSrc={tempImageForCrop}
        onCropComplete={handleCroppedImage}
      />

      {/* Warning Dialog */}
      <EditWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        currentCardName={cardEditing.currentCardName}
      />

      {/* Request Leave Dialog */}
      <RequestLeaveDialog
        open={requestLeaveDialogOpen}
        onOpenChange={setRequestLeaveDialogOpen}
        onSuccess={() => leaveRequestsListHook.reload()}
      />
    </div>
  );
}