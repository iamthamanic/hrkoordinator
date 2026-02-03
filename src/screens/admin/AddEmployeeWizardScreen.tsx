/**
 * @file AddEmployeeWizardScreen.tsx
 * @description Multi-Step Wizard zum Anlegen neuer Mitarbeiter
 * Alle Felder aus "Meine Personalakte" + Workflow-Zuweisung
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../stores/BrowoKo_adminStore';
import { useAuthStore } from '../../stores/BrowoKo_authStore';
import { ArrowLeft, ArrowRight, Check } from '../../components/icons/BrowoKoIcons';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { toast } from 'sonner@2.0.3';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';
import sanitize from '../../utils/security/BrowoKo_sanitization';

// Import Step Components
import Step1_BaseDaten from '../../components/admin/wizard/Step1_BaseDaten';
import Step2_Arbeitsinformationen from '../../components/admin/wizard/Step2_Arbeitsinformationen';
import Step3_PersoenlicheDaten from '../../components/admin/wizard/Step3_PersoenlicheDaten';
import Step4_WorkflowZuweisung from '../../components/admin/wizard/Step4_WorkflowZuweisung';

const STEPS = [
  { id: 1, title: 'Basis-Daten', subtitle: 'Login, Name, Geburtsdatum' },
  { id: 2, title: 'Arbeitsinformationen', subtitle: 'Position, Vertrag, Arbeitszeit' },
  { id: 3, title: 'Persönliche Daten', subtitle: 'Adresse, Bank, Notfallkontakt' },
  { id: 4, title: 'Workflow-Zuweisung', subtitle: 'Onboarding & Offboarding' },
];

export default function AddEmployeeWizardScreen() {
  const navigate = useNavigate();
  const { createUser, locations, loadLocations, departments, loadDepartments } = useAdminStore();
  const { profile } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load data
  useEffect(() => {
    loadLocations().catch(err => console.warn('Failed to load locations:', err));
    loadDepartments().catch(err => console.warn('Failed to load departments:', err));
  }, [loadLocations, loadDepartments]);

  // Deduplicate
  const uniqueDepartments = departments.filter((dept, index, self) =>
    index === self.findIndex((d) => d.id === dept.id)
  );
  
  const uniqueLocations = locations.filter((loc, index, self) =>
    index === self.findIndex((l) => l.id === loc.id)
  );

  // Permissions
  const allowedRoles = profile?.role === 'SUPERADMIN' 
    ? ['USER', 'ADMIN', 'HR', 'SUPERADMIN', 'EXTERN'] as const
    : profile?.role === 'HR'
    ? ['USER', 'ADMIN', 'EXTERN'] as const
    : ['USER', 'EXTERN'] as const;

  // Form State - ALL FIELDS
  const [formData, setFormData] = useState({
    // Step 1: Basis
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '',
    phone: '',
    role: 'USER' as 'USER' | 'ADMIN' | 'HR' | 'SUPERADMIN' | 'EXTERN',

    // Step 2: Arbeit
    position: '',
    department: '',
    employment_type: 'Vollzeit',
    location_id: null as string | null,
    start_date: new Date().toISOString().split('T')[0],
    work_phone: '',
    contract_status: null as string | null,
    contract_end_date: null as string | null,
    probation_period_months: '',
    weekly_hours: '40',
    vacation_days: '30',
    salary: '0',
    work_time_model: null as string | null,
    shift_start_time: '',
    shift_end_time: '',
    flextime_start_earliest: '',
    flextime_start_latest: '',
    flextime_end_earliest: '',
    flextime_end_latest: '',
    break_auto: false,
    break_manual: false,
    break_minutes: '30',
    on_call: false,

    // Step 3: Persönlich
    street: '',
    postal_code: '',
    city: '',
    country: '',
    state: '',
    iban: '',
    bic: '',
    bank_name: '',
    account_holder: '',
    shirt_size: '',
    pants_size: '',
    shoe_size: '',
    jacket_size: '',
    emergency_contacts: [] as Array<{ name: string; relationship: string; phone: string }>,
    language_skills: [] as Array<{ language: string; proficiency: string }>,

    // Step 4: Workflows
    assigned_workflows: [] as string[],
  });

  const handleUpdate = (updates: any) => {
    setFormData({ ...formData, ...updates });
  };

  // Validation per step
  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 1:
        if (!formData.email || !formData.password) {
          setError('E-Mail und Passwort sind erforderlich');
          return false;
        }
        if (!formData.first_name || !formData.last_name) {
          setError('Vor- und Nachname sind erforderlich');
          return false;
        }
        if (!formData.birth_date || !formData.gender || !formData.phone) {
          setError('Geburtsdatum, Geschlecht und Telefonnummer sind erforderlich');
          return false;
        }
        break;

      case 2:
        if (!formData.position || !formData.department || !formData.location_id) {
          setError('Position, Abteilung und Standort sind erforderlich');
          return false;
        }
        if (!formData.work_phone || !formData.contract_status || !formData.probation_period_months) {
          setError('Arbeitstelefon, Vertragsstatus und Probezeit sind erforderlich');
          return false;
        }
        if (!formData.work_time_model) {
          setError('Arbeitszeitmodell ist erforderlich');
          return false;
        }
        // Validate conditional fields
        if (formData.work_time_model === 'SHIFT' && (!formData.shift_start_time || !formData.shift_end_time)) {
          setError('Schichtzeiten sind bei Schichtarbeit erforderlich');
          return false;
        }
        if (formData.work_time_model === 'FLEXTIME') {
          if (!formData.flextime_start_earliest || !formData.flextime_start_latest || 
              !formData.flextime_end_earliest || !formData.flextime_end_latest) {
            setError('Alle Gleitzeit-Korridore müssen ausgefüllt sein');
            return false;
          }
        }
        if (formData.contract_status === 'BEFRISTET' && !formData.contract_end_date) {
          setError('Vertragsende ist bei befristeten Verträgen erforderlich');
          return false;
        }
        break;

      case 3:
        if (!formData.street || !formData.postal_code || !formData.city || !formData.country || !formData.state) {
          setError('Vollständige Adresse ist erforderlich');
          return false;
        }
        if (!formData.iban || !formData.bic || !formData.bank_name || !formData.account_holder) {
          setError('Vollständige Bankverbindung ist erforderlich');
          return false;
        }
        if (!formData.shirt_size || !formData.pants_size || !formData.shoe_size || !formData.jacket_size) {
          setError('Alle Konfektionsgrößen sind erforderlich');
          return false;
        }
        if (!formData.emergency_contacts || formData.emergency_contacts.length === 0) {
          setError('Mindestens ein Notfallkontakt ist erforderlich');
          return false;
        }
        // Validate all emergency contacts are complete
        const invalidContact = formData.emergency_contacts.find(
          c => !c.name || !c.relationship || !c.phone
        );
        if (invalidContact) {
          setError('Alle Notfallkontakte müssen vollständig ausgefüllt sein');
          return false;
        }
        if (!formData.language_skills || formData.language_skills.length === 0) {
          setError('Mindestens eine Sprache ist erforderlich');
          return false;
        }
        // Validate all language skills are complete
        const invalidSkill = formData.language_skills.find(
          s => !s.language || !s.proficiency
        );
        if (invalidSkill) {
          setError('Alle Sprachkenntnisse müssen vollständig ausgefüllt sein');
          return false;
        }
        break;

      case 4:
        // Workflow assignment is optional, but show warning if none selected
        if (!formData.assigned_workflows || formData.assigned_workflows.length === 0) {
          console.warn('No workflows assigned - continuing anyway');
        }
        break;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError('');

    try {
      // Sanitize inputs
      const sanitizedData = {
        email: sanitize.email(formData.email),
        first_name: sanitize.text(formData.first_name),
        last_name: sanitize.text(formData.last_name),
        position: sanitize.text(formData.position),
        department: sanitize.text(formData.department),
        birth_date: formData.birth_date,
        gender: formData.gender,
        phone: formData.phone,
        role: formData.role,
        employment_type: formData.employment_type,
        weekly_hours: parseInt(formData.weekly_hours),
        vacation_days: parseInt(formData.vacation_days),
        salary: parseFloat(formData.salary) || null,
        start_date: sanitize.date(formData.start_date),
        location_id: formData.location_id,
        work_phone: formData.work_phone,
        contract_status: formData.contract_status,
        contract_end_date: formData.contract_end_date || null,
        probation_period_months: parseInt(formData.probation_period_months),
        work_time_model: formData.work_time_model,
        shift_start_time: formData.shift_start_time || null,
        shift_end_time: formData.shift_end_time || null,
        flextime_start_earliest: formData.flextime_start_earliest || null,
        flextime_start_latest: formData.flextime_start_latest || null,
        flextime_end_earliest: formData.flextime_end_earliest || null,
        flextime_end_latest: formData.flextime_end_latest || null,
        break_auto: formData.break_auto,
        break_manual: formData.break_manual,
        break_minutes: parseInt(formData.break_minutes),
        on_call: formData.on_call,
        street: formData.street,
        postal_code: formData.postal_code,
        city: formData.city,
        country: formData.country,
        state: formData.state,
        iban: formData.iban,
        bic: formData.bic,
        bank_name: formData.bank_name,
        account_holder: formData.account_holder,
        shirt_size: formData.shirt_size,
        pants_size: formData.pants_size,
        shoe_size: formData.shoe_size,
        jacket_size: formData.jacket_size,
        emergency_contacts: formData.emergency_contacts,
        language_skills: formData.language_skills,
      };

      // Create user
      const newUser = await createUser(sanitizedData, formData.password);

      // Assign workflows if any selected
      if (formData.assigned_workflows.length > 0) {
        console.log('🔄 Assigning workflows:', formData.assigned_workflows);
        
        // Execute each workflow for the new user
        for (const workflowId of formData.assigned_workflows) {
          try {
            const response = await fetch(
              `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows/${workflowId}/execute`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`,
                },
                body: JSON.stringify({
                  context: {
                    userId: newUser.id,
                    employeeId: newUser.id,
                    email: newUser.email,
                    name: `${newUser.first_name} ${newUser.last_name}`,
                  },
                }),
              }
            );

            if (response.ok) {
              console.log(`✅ Workflow ${workflowId} executed successfully`);
            } else {
              console.error(`❌ Failed to execute workflow ${workflowId}`);
            }
          } catch (err) {
            console.error(`Error executing workflow ${workflowId}:`, err);
          }
        }

        toast.success(`Mitarbeiter erfolgreich erstellt und ${formData.assigned_workflows.length} Workflow(s) gestartet! ✅`);
      } else {
        toast.success('Mitarbeiter erfolgreich erstellt! ✅');
      }

      setTimeout(() => {
        navigate('/admin/team-und-mitarbeiterverwaltung');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating employee:', err);
      setError(err.message || 'Fehler beim Erstellen des Mitarbeiters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-20 md:pt-6 pb-20 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/team-und-mitarbeiterverwaltung')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Neuer Mitarbeiter</h1>
          <p className="text-sm text-gray-500 mt-1">
            Erfasse alle relevanten Daten und weise Workflows zu
          </p>
        </div>

        {/* Step Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                        currentStep > step.id
                          ? 'bg-green-600 text-white'
                          : currentStep === step.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                    </div>
                    <div className="text-center mt-2 hidden md:block">
                      <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.subtitle}</p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-colors ${
                        currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="mb-6">
          {currentStep === 1 && (
            <Step1_BaseDaten
              formData={formData}
              onUpdate={handleUpdate}
              allowedRoles={allowedRoles}
              currentUserRole={profile?.role}
            />
          )}
          {currentStep === 2 && (
            <Step2_Arbeitsinformationen
              formData={formData}
              onUpdate={handleUpdate}
              departments={uniqueDepartments}
              locations={uniqueLocations}
            />
          )}
          {currentStep === 3 && (
            <Step3_PersoenlicheDaten
              formData={formData}
              onUpdate={handleUpdate}
            />
          )}
          {currentStep === 4 && (
            <Step4_WorkflowZuweisung
              formData={formData}
              onUpdate={handleUpdate}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext}>
                  Weiter
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Erstelle...' : 'Mitarbeiter erstellen'}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}