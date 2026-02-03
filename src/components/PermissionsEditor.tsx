import { useState, useEffect } from 'react';
import { Shield, Check, X, Save, RotateCcw, AlertTriangle } from './icons/BrowoKoIcons';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { usePermissions, UserRole } from '../hooks/usePermissions';
import { getPermissionsByCategory, type PermissionKey } from '../config/permissions';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { supabaseUrl } from '../utils/supabase/info';

interface PermissionOverride {
  permission_key: string;
  mode: 'GRANT' | 'REVOKE';
  granted_by?: string;
  granted_at?: string;
}

interface UserPermissionData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  rolePermissions: string[]; // Default permissions from role
  userOverrides: PermissionOverride[]; // Individual GRANT/REVOKE
  effectivePermissions: string[]; // Final calculated permissions
}

interface PermissionsEditorProps {
  userId: string;
  role: UserRole;
  onSave?: () => void;
  readOnly?: boolean;
}

export default function PermissionsEditor({ 
  userId, 
  role, 
  onSave,
  readOnly = false 
}: PermissionsEditorProps) {
  const { getAllPermissions, roleInfo } = usePermissions(role);
  
  // State
  const [permissionData, setPermissionData] = useState<UserPermissionData | null>(null);
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load permissions from backend
  useEffect(() => {
    loadUserPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  const loadUserPermissions = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Loading permissions for user:', userId);
      
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/users/${userId}/permissions`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to load permissions:', response.status, errorText);
        throw new Error(`Failed to load permissions: ${response.status}`);
      }

      const data: UserPermissionData = await response.json();
      console.log('✅ Permissions loaded:', data);
      
      setPermissionData(data);
      setOverrides(data.userOverrides || []);
      setHasChanges(false);
    } catch (error) {
      console.error('❌ Error loading permissions:', error);
      toast.error('Fehler beim Laden der Berechtigungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionKey: string) => {
    if (readOnly || !permissionData) return;
    
    const isRolePermission = permissionData.rolePermissions.includes(permissionKey);
    const existingOverride = overrides.find(o => o.permission_key === permissionKey);
    
    let newOverrides = [...overrides];
    
    if (isRolePermission) {
      // Permission is inherited from role
      if (existingOverride?.mode === 'REVOKE') {
        // Currently revoked → remove override (restore role default)
        newOverrides = newOverrides.filter(o => o.permission_key !== permissionKey);
      } else {
        // Not revoked → add REVOKE override
        newOverrides = newOverrides.filter(o => o.permission_key !== permissionKey);
        newOverrides.push({ permission_key: permissionKey, mode: 'REVOKE' });
      }
    } else {
      // Permission is NOT inherited from role
      if (existingOverride?.mode === 'GRANT') {
        // Currently granted → remove override
        newOverrides = newOverrides.filter(o => o.permission_key !== permissionKey);
      } else {
        // Not granted → add GRANT override
        newOverrides = newOverrides.filter(o => o.permission_key !== permissionKey);
        newOverrides.push({ permission_key: permissionKey, mode: 'GRANT' });
      }
    }
    
    setOverrides(newOverrides);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!permissionData) return;
    
    setIsSaving(true);
    try {
      console.log('💾 Saving permissions for user:', userId);
      console.log('Overrides:', overrides);
      
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/users/${userId}/permissions`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          overrides: overrides,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save permissions:', response.status, errorText);
        throw new Error(`Failed to save permissions: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Permissions saved:', result);
      
      toast.success('Berechtigungen erfolgreich gespeichert!');
      setHasChanges(false);
      
      // Reload to get fresh data
      await loadUserPermissions();
      
      onSave?.();
    } catch (error) {
      console.error('❌ Error saving permissions:', error);
      toast.error('Fehler beim Speichern der Berechtigungen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setOverrides([]);
    setHasChanges(true);
    toast.info('Alle individuellen Berechtigungen entfernt - Rollen-Standard wird verwendet');
  };

  const getPermissionState = (permissionKey: string): {
    enabled: boolean;
    source: 'role' | 'granted' | 'revoked' | 'none';
    override?: PermissionOverride;
  } => {
    if (!permissionData) {
      return { enabled: false, source: 'none' };
    }

    const isRolePermission = permissionData.rolePermissions.includes(permissionKey);
    const override = overrides.find(o => o.permission_key === permissionKey);

    if (override) {
      if (override.mode === 'GRANT') {
        return { enabled: true, source: 'granted', override };
      } else {
        return { enabled: false, source: 'revoked', override };
      }
    }

    if (isRolePermission) {
      return { enabled: true, source: 'role' };
    }

    return { enabled: false, source: 'none' };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (!permissionData) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-900">
          Berechtigungen konnten nicht geladen werden. Bitte versuchen Sie es erneut.
        </AlertDescription>
      </Alert>
    );
  }

  const overrideCount = overrides.length;
  const grantCount = overrides.filter(o => o.mode === 'GRANT').length;
  const revokeCount = overrides.filter(o => o.mode === 'REVOKE').length;

  return (
    <div className="space-y-6">
      {/* Role Overview */}
      <Card className={`${roleInfo.borderColor} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${roleInfo.bgColor}`}>
                <Shield className={`w-6 h-6 ${roleInfo.color}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${roleInfo.color}`}>
                  {roleInfo.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {roleInfo.description}
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {permissionData.rolePermissions.length} Standard-Berechtigungen
                  </Badge>
                  {overrideCount > 0 && (
                    <>
                      {grantCount > 0 && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs">
                          +{grantCount} zusätzlich
                        </Badge>
                      )}
                      {revokeCount > 0 && (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-200 text-xs">
                          -{revokeCount} entfernt
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {!readOnly && (
        <Alert className="bg-blue-50 border-blue-200">
          <Shield className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            💡 <span className="font-medium">Individuelle Berechtigungen:</span> Sie können einzelne Berechtigungen hinzufügen (GRANT) oder entfernen (REVOKE). 
            Grüne Badges = zusätzlich gewährt, Rote Badges = entfernt, Graue Badges = von Rolle geerbt.
          </AlertDescription>
        </Alert>
      )}

      {/* Permissions by Category */}
      <div className="space-y-4">
        {getAllPermissions.map((category) => {
          // Map permission names to keys
          const categoryPermissions = category.permissions.map(perm => {
            // Find matching permission key from rolePermissions or effectivePermissions
            const matchingKey = permissionData.rolePermissions.find(rp => {
              // Simple heuristic: convert permission name to snake_case and check
              const nameSnake = perm.name
                .toLowerCase()
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue')
                .replace(/ß/g, 'ss')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
              return rp.includes(nameSnake) || rp.endsWith(nameSnake);
            }) || permissionData.effectivePermissions.find(ep => {
              const nameSnake = perm.name
                .toLowerCase()
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue')
                .replace(/ß/g, 'ss')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
              return ep.includes(nameSnake) || ep.endsWith(nameSnake);
            });

            return {
              ...perm,
              key: matchingKey || `unknown_${perm.name}`,
            };
          });

          return (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="text-lg">{category.category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryPermissions.map((perm) => {
                  const state = getPermissionState(perm.key);
                  
                  return (
                    <div
                      key={perm.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        state.enabled 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      } ${readOnly ? '' : 'cursor-pointer hover:shadow-sm transition-shadow'}`}
                      onClick={() => !readOnly && handlePermissionToggle(perm.key)}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        state.enabled
                          ? 'bg-green-500 border-green-500'
                          : 'bg-white border-gray-300'
                      }`}>
                        {state.enabled && <Check className="w-3 h-3 text-white" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {perm.name}
                          </span>
                          {state.source === 'role' && (
                            <Badge variant="outline" className="text-xs bg-gray-100">
                              von Rolle
                            </Badge>
                          )}
                          {state.source === 'granted' && (
                            <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-200">
                              zusätzlich gewährt
                            </Badge>
                          )}
                          {state.source === 'revoked' && (
                            <Badge className="text-xs bg-red-100 text-red-800 hover:bg-red-200">
                              entfernt
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex items-center gap-3 sticky bottom-4 bg-white p-4 rounded-lg border-2 shadow-lg">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Änderungen speichern'}
          </Button>
          
          <Button
            onClick={handleResetToDefaults}
            disabled={overrideCount === 0 || isSaving}
            variant="outline"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Auf Rollen-Standard zurücksetzen
          </Button>

          {hasChanges && (
            <Badge className="bg-orange-100 text-orange-800">
              Ungespeicherte Änderungen
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}