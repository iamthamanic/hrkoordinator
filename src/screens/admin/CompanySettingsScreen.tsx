import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../stores/BrowoKo_authStore';
import { useAdminStore } from '../../stores/BrowoKo_adminStore';
import { Organization } from '../../types/database';
import { supabase } from '../../utils/supabase/client';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';
import StorageDiagnostics from '../../components/StorageDiagnostics';
import { ChevronDown, ChevronUp } from '../../components/icons/BrowoKoIcons';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner@2.0.3';
import CompanyBasicSettings from '../../components/admin/BrowoKo_CompanyBasicSettings';
import CompanyLogoUpload from '../../components/admin/BrowoKo_CompanyLogoUpload';
import LocationManager from '../../components/admin/BrowoKo_LocationManager';
import DepartmentManager from '../../components/admin/BrowoKo_DepartmentManager';
import SpecializationManager from '../../components/admin/BrowoKo_SpecializationManager';

export default function CompanySettingsScreen() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { 
    locations, 
    loadLocations, 
    createLocation, 
    updateLocation, 
    deleteLocation,
    departments,
    loadDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    specializations,
    loadSpecializations,
    createSpecialization,
    updateSpecialization,
    deleteSpecialization
  } = useAdminStore();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPERADMIN') {
      toast.error('Nur Admins können Firmeneinstellungen ändern');
      navigate('/admin/team-und-mitarbeiterverwaltung');
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]); // Only re-run when role changes, not when functions change

  const loadData = async () => {
    try {
      setLoading(true);

      // Load organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_default', true)
        .single();

      if (orgError) {
        console.error('Error loading organization:', orgError);
        toast.error('Fehler beim Laden der Firmeneinstellungen');
        return;
      }

      if (orgData) {
        setOrganization(orgData);
        setName(orgData.name || '');
        setDomain(orgData.domain || '');

        // Load logo if exists
        if (orgData.logo_url) {
          setLogoPreview(orgData.logo_url);
        }
      }

      // Load locations, departments and specializations
      await Promise.all([
        loadLocations(),
        loadDepartments(),
        loadSpecializations()
      ]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!organization?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: name.trim() || null,
          domain: domain.trim() || null,
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Einstellungen gespeichert! ✅');
      await loadData();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!organization?.id) return;

    try {
      setUploadingLogo(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}-logo.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      if (!urlData) throw new Error('Could not get public URL');

      // Update organization with logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setLogoPreview(urlData.publicUrl);
      toast.success('Logo erfolgreich hochgeladen! ✅');
      await loadData();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Fehler beim Hochladen');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Einstellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-6 px-4 md:px-6">
      {/* ✅ MAX-WIDTH CONTAINER */}
      <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Firmeneinstellungen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verwalte Unternehmens-Informationen, Logo, Standorte, Abteilungen und Spezialisierungen
        </p>
      </div>

      {/* Tier Badge */}
      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
        🚀 ENTERPRISE - Unlimited Users & Features
      </Badge>

      {/* Basic Settings */}
      <CompanyBasicSettings
        name={name}
        domain={domain}
        onNameChange={setName}
        onDomainChange={setDomain}
        onSave={handleSaveBasicInfo}
        saving={saving}
      />

      {/* Logo Upload */}
      <CompanyLogoUpload
        logoUrl={logoPreview}
        onUpload={handleLogoUpload}
        uploading={uploadingLogo}
      />

      {/* Locations Manager */}
      <LocationManager
        locations={locations}
        onCreateLocation={createLocation}
        onUpdateLocation={updateLocation}
        onDeleteLocation={deleteLocation}
      />

      {/* Departments Manager */}
      <DepartmentManager
        departments={departments}
        onCreateDepartment={createDepartment}
        onUpdateDepartment={updateDepartment}
        onDeleteDepartment={deleteDepartment}
      />

      {/* Specializations Manager */}
      <SpecializationManager
        specializations={specializations}
        onCreateSpecialization={createSpecialization}
        onUpdateSpecialization={updateSpecialization}
        onDeleteSpecialization={deleteSpecialization}
      />

      {/* Storage Diagnostics */}
      <div className="border-t pt-6 mt-8">
        <Button
          variant="outline"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="mb-4"
        >
          {showDiagnostics ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Storage-Diagnose ausblenden
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Storage-Diagnose anzeigen
            </>
          )}
        </Button>
        {showDiagnostics && <StorageDiagnostics />}
      </div>
      </div> {/* ✅ Close max-width container */}
    </div>
  );
}
