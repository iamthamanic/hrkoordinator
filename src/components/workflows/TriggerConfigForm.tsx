/**
 * @file TriggerConfigForm.tsx
 * @domain Workflows - Trigger Configuration
 * @description Config form for trigger nodes (used in NodeConfigPanel)
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Building2, MapPin, UserCog, RefreshCw, Database } from 'lucide-react';
import { supabaseUrl } from '../../utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHelpers';

interface TriggerConfigFormProps {
  node: any;
  config: any;
  updateConfig: (key: string, value: any) => void;
}

interface Department {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
}

export function TriggerConfigForm({ node, config, updateConfig }: TriggerConfigFormProps) {
  const triggerType = node.data?.triggerType || 'MANUAL';
  
  // State for loading entities from backend
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load data from backend
  useEffect(() => {
    loadEntities();
    
    // Auto-refresh every 5 seconds to catch new entries
    const interval = setInterval(loadEntities, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const loadEntities = async () => {
    try {
      setError(null);
      console.log('📥 Loading entities from backend...');
      
      // Get auth headers
      const headers = await getAuthHeaders();
      
      // HEALTH CHECK FIRST (public endpoint - no auth needed)
      console.log('🏥 Checking if server is alive...');
      try {
        const healthResponse = await fetch(
          `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/health`
        );
        console.log('🏥 Health check status:', healthResponse.status);
        if (!healthResponse.ok) {
          throw new Error(`Server nicht erreichbar! Health check failed with status ${healthResponse.status}`);
        }
        const healthData = await healthResponse.json();
        console.log('✅ Server is alive:', healthData);
      } catch (healthError: any) {
        console.error('💀 Server is DOWN:', healthError);
        throw new Error(`BrowoKoordinator-Server ist nicht erreichbar. Bitte prüfe die Edge Function Logs in Supabase! Error: ${healthError.message}`);
      }
      
      // Load Departments
      const deptResponse = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/departments`,
        { headers }
      );
      
      console.log('📦 Departments response status:', deptResponse.status);
      
      if (!deptResponse.ok) {
        const errorText = await deptResponse.text();
        console.error('❌ Departments fetch failed:', errorText);
        throw new Error(`Departments API error: ${deptResponse.status} - ${errorText}`);
      }
      
      const deptData = await deptResponse.json();
      console.log('✅ Departments loaded:', deptData);
      const depts = deptData.departments || [];
      setDepartments(depts);
      
      // Auto-seed if empty (FIXED: removed !loading check)
      if (depts.length === 0) {
        console.log('⚠️ No departments found, triggering auto-seed...');
        await seedEntitiesIfEmpty();
        return; // Will reload after seeding
      }
      
      // Load Locations
      const locResponse = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/locations`,
        { headers }
      );
      
      console.log('📍 Locations response status:', locResponse.status);
      
      if (locResponse.ok) {
        const locData = await locResponse.json();
        console.log('✅ Locations loaded:', locData);
        setLocations(locData.locations || []);
      }
      
      // Load Roles
      const roleResponse = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/roles`,
        { headers }
      );
      
      console.log('👔 Roles response status:', roleResponse.status);
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        console.log('✅ Roles loaded:', roleData);
        setRoles(roleData.roles || []);
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Error loading entities:', error);
      setError(error.message || 'Failed to load data');
      setLoading(false);
    }
  };
  
  // Auto-seed entities if database is empty
  const seedEntitiesIfEmpty = async () => {
    if (seeding) return; // Prevent duplicate seeding
    
    try {
      setSeeding(true);
      console.log('🌱 Auto-seeding entities...');
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/seed-entities`,
        {
          method: 'POST',
          headers
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Auto-seed completed:', result);
        
        // Wait 1 second and reload
        setTimeout(() => {
          loadEntities();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ Auto-seed failed:', errorText);
        setError(`Seed failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error('❌ Error seeding entities:', error);
      setError(error.message || 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };
  
  // Toggle functions for multi-select
  const toggleDepartment = (deptId: string) => {
    const current = config.department_ids || [];
    const updated = current.includes(deptId)
      ? current.filter((id: string) => id !== deptId)
      : [...current, deptId];
    updateConfig('department_ids', updated.length > 0 ? updated : undefined);
  };
  
  const toggleLocation = (locId: string) => {
    const current = config.location_ids || [];
    const updated = current.includes(locId)
      ? current.filter((id: string) => id !== locId)
      : [...current, locId];
    updateConfig('location_ids', updated.length > 0 ? updated : undefined);
  };
  
  const toggleRole = (roleId: string) => {
    const current = config.role_ids || [];
    const updated = current.includes(roleId)
      ? current.filter((id: string) => id !== roleId)
      : [...current, roleId];
    updateConfig('role_ids', updated.length > 0 ? updated : undefined);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Trigger-Typ</Label>
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{node.data?.triggerLabel || triggerType}</p>
          <p className="text-xs text-gray-500 mt-1">Kategorie: {node.data?.category || 'Manual'}</p>
        </div>
      </div>
      
      {/* Trigger-spezifische Konfiguration */}
      {renderTriggerSpecificConfig(triggerType, config, updateConfig)}
      
      {/* Common Filters - Multi-Select */}
      <div className="border-t pt-4 mt-6">
        <h4 className="font-medium text-sm mb-3 text-gray-700">Optionale Filter</h4>
        <div className="space-y-4">
          {/* Departments Multi-Select */}
          <Collapsible defaultOpen={false}>
            <div className="space-y-2">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <Label className="cursor-pointer">Abteilungen (optional)</Label>
                    {config.department_ids && config.department_ids.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {config.department_ids.length} ausgewählt
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border rounded-lg p-3 space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-gray-500">Lade Abteilungen...</p>
                  ) : departments.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Abteilungen vorhanden</p>
                  ) : (
                    departments.map((dept) => (
                      <div key={dept.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          id={`dept-${dept.id}`}
                          checked={config.department_ids?.includes(dept.id) || false}
                          onCheckedChange={() => toggleDepartment(dept.id)}
                        />
                        <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer flex-1">
                          {dept.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Nur für ausgewählte Abteilungen auslösen (leer = alle)</p>
              </CollapsibleContent>
            </div>
          </Collapsible>
          
          {/* Locations Multi-Select */}
          <Collapsible defaultOpen={false}>
            <div className="space-y-2">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <Label className="cursor-pointer">Standorte (optional)</Label>
                    {config.location_ids && config.location_ids.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {config.location_ids.length} ausgewählt
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border rounded-lg p-3 space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-gray-500">Lade Standorte...</p>
                  ) : locations.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Standorte vorhanden</p>
                  ) : (
                    locations.map((loc) => (
                      <div key={loc.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          id={`loc-${loc.id}`}
                          checked={config.location_ids?.includes(loc.id) || false}
                          onCheckedChange={() => toggleLocation(loc.id)}
                        />
                        <label htmlFor={`loc-${loc.id}`} className="text-sm cursor-pointer flex-1">
                          {loc.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Nur für ausgewählte Standorte auslösen (leer = alle)</p>
              </CollapsibleContent>
            </div>
          </Collapsible>
          
          {/* Roles Multi-Select */}
          <Collapsible defaultOpen={false}>
            <div className="space-y-2">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-green-600" />
                    <Label className="cursor-pointer">Rollen (optional)</Label>
                    {config.role_ids && config.role_ids.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {config.role_ids.length} ausgewählt
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200" />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border rounded-lg p-3 space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {loading ? (
                    <p className="text-sm text-gray-500">Lade Rollen...</p>
                  ) : roles.length === 0 ? (
                    <p className="text-sm text-gray-500">Keine Rollen vorhanden</p>
                  ) : (
                    roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={config.role_ids?.includes(role.id) || false}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer flex-1">
                          {role.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Nur für ausgewählte Rollen auslösen (leer = alle)</p>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-500 text-red-900 p-4 rounded mt-4">
          <Database className="h-5 w-5 inline-block mr-2" />
          {error}
        </div>
      )}
      
      {/* Refresh Button */}
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={loadEntities}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Lade...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Daten aktualisieren
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function renderTriggerSpecificConfig(triggerType: string, config: any, updateConfig: any) {
  switch (triggerType) {
    // ========== HR / MITARBEITER ==========
    case 'EMPLOYEE_ADDED_TO_TEAM':
    case 'EMPLOYEE_REMOVED_FROM_TEAM':
      return (
        <div>
          <Label>Team ID (optional)</Label>
          <Input
            placeholder="Leer lassen für alle Teams"
            value={config.team_id || ''}
            onChange={(e) => updateConfig('team_id', e.target.value || undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">Wenn leer, wird für alle Teams ausgelöst</p>
        </div>
      );
    
    // ========== LEARNING ==========
    case 'LEARNING_VIDEO_STARTED':
    case 'LEARNING_VIDEO_COMPLETED':
      return (
        <div>
          <Label>Video ID (optional)</Label>
          <Input
            placeholder="Leer lassen für alle Videos"
            value={config.video_id || ''}
            onChange={(e) => updateConfig('video_id', e.target.value || undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">Wenn leer, wird für alle Videos ausgelöst</p>
        </div>
      );
    
    case 'LEARNING_TEST_COMPLETED':
      return (
        <div className="space-y-4">
          <div>
            <Label>Test ID (optional)</Label>
            <Input
              placeholder="Leer lassen für alle Tests"
              value={config.test_id || ''}
              onChange={(e) => updateConfig('test_id', e.target.value || undefined)}
            />
          </div>
          <div>
            <Label>Minimale Punktzahl (optional)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="z.B. 80 für 80%"
              value={config.min_score || ''}
              onChange={(e) => updateConfig('min_score', e.target.value ? parseInt(e.target.value) : undefined)}
            />
            <p className="text-xs text-gray-500 mt-1">Nur auslösen wenn mindestens diese Punktzahl erreicht wurde</p>
          </div>
        </div>
      );
    
    case 'LEARNING_QUIZ_COMPLETED':
      return (
        <div>
          <Label>Lerneinheit ID (optional)</Label>
          <Input
            placeholder="Leer lassen für alle Lerneinheiten"
            value={config.quiz_id || ''}
            onChange={(e) => updateConfig('quiz_id', e.target.value || undefined)}
          />
        </div>
      );
    
    case 'XP_THRESHOLD_REACHED':
      return (
        <div>
          <Label>XP-Schwelle *</Label>
          <Input
            type="number"
            min="1"
            placeholder="z.B. 100, 500, 1000"
            value={config.xp_threshold || ''}
            onChange={(e) => updateConfig('xp_threshold', parseInt(e.target.value) || undefined)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Workflow wird ausgelöst wenn Mitarbeiter diese XP-Anzahl erreicht</p>
        </div>
      );
    
    case 'LEVEL_UP':
      return (
        <div>
          <Label>Level (optional)</Label>
          <Input
            type="number"
            min="1"
            placeholder="z.B. 5, 10, 20 (leer = jedes Level)"
            value={config.level || ''}
            onChange={(e) => updateConfig('level', e.target.value ? parseInt(e.target.value) : undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">Wenn leer, wird bei jedem Level-Aufstieg ausgelöst</p>
        </div>
      );
    
    case 'COINS_THRESHOLD_REACHED':
      return (
        <div>
          <Label>Coin-Schwelle *</Label>
          <Input
            type="number"
            min="1"
            placeholder="z.B. 500, 1000"
            value={config.coin_threshold || ''}
            onChange={(e) => updateConfig('coin_threshold', parseInt(e.target.value) || undefined)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Workflow wird ausgelöst wenn Mitarbeiter diesen Coin-Stand erreicht</p>
        </div>
      );
    
    case 'ACHIEVEMENT_UNLOCKED':
      return (
        <div>
          <Label>Achievement ID (optional)</Label>
          <Input
            placeholder="Leer lassen für alle Achievements"
            value={config.achievement_id || ''}
            onChange={(e) => updateConfig('achievement_id', e.target.value || undefined)}
          />
        </div>
      );
    
    case 'BENEFIT_PURCHASED':
    case 'BENEFIT_REDEEMED':
      return (
        <div>
          <Label>Benefit ID (optional)</Label>
          <Input
            placeholder="Leer lassen für alle Benefits"
            value={config.benefit_id || ''}
            onChange={(e) => updateConfig('benefit_id', e.target.value || undefined)}
          />
        </div>
      );
    
    case 'TASK_COMPLETED':
    case 'TASK_OVERDUE':
      return (
        <div>
          <Label>Task ID (optional)</Label>
          <Input
            placeholder="Leer lassen für alle Aufgaben"
            value={config.task_id || ''}
            onChange={(e) => updateConfig('task_id', e.target.value || undefined)}
          />
        </div>
      );
    
    case 'REQUEST_APPROVED':
    case 'REQUEST_REJECTED':
      return (
        <div>
          <Label>Antragstyp</Label>
          <Select
            value={config.request_type || 'all'}
            onValueChange={(value) => updateConfig('request_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Anträge</SelectItem>
              <SelectItem value="leave">Urlaubsanträge</SelectItem>
              <SelectItem value="document">Dokumentenanträge</SelectItem>
              <SelectItem value="expense">Spesenanträge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    
    case 'SCHEDULED_DATE':
      return (
        <div className="space-y-4">
          <div>
            <Label>Datum *</Label>
            <Input
              type="date"
              value={config.date || ''}
              onChange={(e) => updateConfig('date', e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Wiederholung</Label>
            <Select
              value={config.repeat || 'once'}
              onValueChange={(value) => updateConfig('repeat', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Einmalig</SelectItem>
                <SelectItem value="daily">Täglich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="yearly">Jährlich</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    
    case 'SCHEDULED_CRON':
      return (
        <div>
          <Label>Cron Expression *</Label>
          <Input
            placeholder='z.B. "0 9 * * 1" = Montags 9 Uhr'
            value={config.cron_expression || ''}
            onChange={(e) => updateConfig('cron_expression', e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Format: Minute Stunde Tag Monat Wochentag</p>
          <div className="text-xs text-gray-600 mt-2 space-y-1">
            <p><strong>Beispiele:</strong></p>
            <p>• "0 9 * * *" = Täglich 9 Uhr</p>
            <p>• "0 9 * * 1" = Montags 9 Uhr</p>
            <p>• "0 0 1 * *" = Jeden 1. des Monats</p>
          </div>
        </div>
      );
    
    case 'REMINDER_CHECK':
      return (
        <div className="space-y-4">
          <div>
            <Label>Check-Typ</Label>
            <Select
              value={config.check_type || 'incomplete_video'}
              onValueChange={(value) => updateConfig('check_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incomplete_video">Unvollständige Videos</SelectItem>
                <SelectItem value="incomplete_test">Unvollständige Tests</SelectItem>
                <SelectItem value="incomplete_quiz">Unvollständige Lerneinheiten</SelectItem>
                <SelectItem value="pending_task">Ausstehende Aufgaben</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Intervall (Stunden)</Label>
            <Input
              type="number"
              min="1"
              placeholder="z.B. 24 für täglich"
              value={config.interval_hours || ''}
              onChange={(e) => updateConfig('interval_hours', parseInt(e.target.value) || undefined)}
            />
            <p className="text-xs text-gray-500 mt-1">Wie oft soll geprüft werden?</p>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded border border-gray-200">
          Dieser Trigger benötigt keine zusätzliche Konfiguration.
        </div>
      );
  }
}