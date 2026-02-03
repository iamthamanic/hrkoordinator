// ============================================================================
// BROWO KOORDINATOR - AUTOMATION SERVICE
// ============================================================================
// Service for managing automation API keys and monitoring
// Connects to BrowoKoordinator-Automation Edge Function
// ============================================================================

import { supabase } from '../utils/supabase/client';
import { supabaseUrl } from '../utils/supabase/info';

// Supabase client is already imported as singleton

// ============================================================================
// TYPES
// ============================================================================

export interface AutomationAPIKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string; // Only returned on creation!
  created_by: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  creator_name?: string;
}

export interface AutomationAuditLog {
  id: string;
  api_key_id: string;
  action: string;
  method: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AutomationStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  last_used: string | null;
  top_actions: Array<{ action: string; count: number }>;
}

export interface CreateAPIKeyResponse {
  success: boolean;
  api_key?: string; // Only returned on creation!
  id?: string;
  name?: string;
  error?: string;
}

// ============================================================================
// AUTOMATION SERVICE
// ============================================================================

class AutomationService {
  private baseUrl: string;

  constructor() {
    // Edge Function Base URL (lokal oder Env)
    this.baseUrl = `${supabaseUrl}/functions/v1/BrowoKoordinator-Automation`;
  }

  /**
   * Get authenticated user's JWT token
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  }

  /**
   * Generate a new API Key
   */
  async generateAPIKey(name: string): Promise<CreateAPIKeyResponse> {
    try {
      const token = await this.getAuthToken();

      console.log('🔑 Generating API Key...');
      console.log('📍 URL:', `${this.baseUrl}/automation/api-keys/generate`);
      console.log('📤 Request:', { name });

      const response = await fetch(`${this.baseUrl}/automation/api-keys/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      console.log('📥 Response Status:', response.status, response.statusText);
      console.log('📥 Content-Type:', response.headers.get('content-type'));

      // Get response text first to see what we're dealing with
      const responseText = await response.text();
      console.log('📥 Response Text (first 200 chars):', responseText.substring(0, 200));

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('📄 Full Response:', responseText);
        return {
          success: false,
          error: `Server returned non-JSON response: ${responseText.substring(0, 100)}...`,
        };
      }

      if (!response.ok) {
        console.error('❌ API Error:', data);
        return {
          success: false,
          error: data.error || data.details || 'Failed to generate API key',
        };
      }

      console.log('✅ API Key generated successfully');
      return {
        success: true,
        api_key: data.api_key,
        id: data.key_id || data.id,
        name: data.name,
      };
    } catch (error) {
      console.error('❌ Exception generating API key:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all API Keys for current organization
   */
  async getAPIKeys(): Promise<AutomationAPIKey[]> {
    try {
      console.log('🔍 Loading API Keys from database...');
      
      // FIRST: Try simple query without join to debug
      const { data, error } = await supabase
        .from('automation_api_keys')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database Error loading API keys:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Loaded API Keys (simple query):', data?.length || 0);
      console.log('📦 API Keys Data:', data);

      if (!data || data.length === 0) {
        console.warn('⚠️ No API keys found! Possible causes:');
        console.warn('  1. RLS Policy blocking access');
        console.warn('  2. Wrong organization_id');
        console.warn('  3. All keys have is_active = false');
        
        // Try loading WITHOUT is_active filter to debug
        const { data: allKeys } = await supabase
          .from('automation_api_keys')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('📊 Total keys in DB (ignoring is_active):', allKeys?.length || 0);
        if (allKeys && allKeys.length > 0) {
          console.log('📋 All keys:', allKeys);
        }
      }

      // Try to fetch creator names separately to avoid join issues
      const keysWithCreators = await Promise.all(
        (data || []).map(async (key: any) => {
          try {
            const { data: creator } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', key.created_by)
              .single();
            
            return {
              ...key,
              creator_name: creator
                ? `${creator.first_name} ${creator.last_name}`
                : 'Unbekannt',
            };
          } catch (err) {
            console.warn('⚠️ Could not fetch creator for key:', key.id);
            return {
              ...key,
              creator_name: 'Unbekannt',
            };
          }
        })
      );

      return keysWithCreators;
    } catch (error) {
      console.error('❌ Exception fetching API keys:', error);
      throw error; // Re-throw to show error in UI
    }
  }

  /**
   * Update API Key name
   */
  async updateAPIKeyName(id: string, name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('automation_api_keys')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating API key name:', error);
      return false;
    }
  }

  /**
   * Delete (deactivate) API Key
   */
  async deleteAPIKey(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('automation_api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting API key:', error);
      return false;
    }
  }

  /**
   * Get statistics for an API Key
   */
  async getAPIKeyStats(apiKeyId: string): Promise<AutomationStats> {
    try {
      const { data, error } = await supabase
        .from('automation_audit_log')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = data || [];
      const total_calls = logs.length;
      const successful_calls = logs.filter(log => log.success).length;
      const failed_calls = logs.filter(log => !log.success).length;
      const last_used = logs.length > 0 ? logs[0].created_at : null;

      // Count top actions
      const actionCounts = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});

      const top_actions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total_calls,
        successful_calls,
        failed_calls,
        last_used,
        top_actions,
      };
    } catch (error) {
      console.error('Error fetching API key stats:', error);
      return {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        last_used: null,
        top_actions: [],
      };
    }
  }

  /**
   * Get recent audit logs for an API Key
   */
  async getAuditLogs(apiKeyId: string, limit = 50): Promise<AutomationAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('automation_audit_log')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }
}

export const automationService = new AutomationService();