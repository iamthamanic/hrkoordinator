/**
 * ADMIN STORE
 * ===========
 * Global admin state management
 * 
 * REFACTORED: Now uses UserService, LeaveService, LearningService
 * - Removed direct Supabase calls
 * - Uses service layer for all admin operations
 * - Better error handling with custom errors
 * - Type-safe with Zod validation
 */

import { create } from 'zustand';
import { User, LeaveRequest, VideoContent, CoinTransaction, Location, Department, SavedSearch, SearchConfig } from '../types/database';

// Specialization type
interface Specialization {
  id: string;
  name: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}
import { supabase } from '../utils/supabase/client';
import { getDefaultOrganizationId } from '../utils/BrowoKo_organizationHelper';
import { getServices } from '../services';
import { NotFoundError, ValidationError, ApiError } from '../services/base/ApiError';

interface AdminState {
  users: User[];
  leaveRequests: LeaveRequest[];
  locations: Location[];
  departments: Department[];
  specializations: Specialization[];
  savedSearches: SavedSearch[];
  loading: boolean;
  
  // User Management
  loadAllUsers: () => Promise<void>;
  loadUsers: () => Promise<void>; // Alias for loadAllUsers
  createUser: (userData: Partial<User>, password: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  
  // Leave Request Management
  loadAllLeaveRequests: () => Promise<void>;
  approveLeaveRequest: (requestId: string, approverId: string) => Promise<void>;
  rejectLeaveRequest: (requestId: string, approverId: string, reason: string) => Promise<void>;
  
  // Coin Management
  awardCoins: (userId: string, amount: number, reason: string) => Promise<void>;
  deductCoins: (userId: string, amount: number, reason: string) => Promise<void>;
  
  // Video Management
  createVideo: (videoData: Partial<VideoContent>) => Promise<void>;
  updateVideo: (videoId: string, updates: Partial<VideoContent>) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  
  // Location Management
  loadLocations: () => Promise<void>;
  createLocation: (locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLocation: (locationId: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  
  // Department Management
  loadDepartments: () => Promise<void>;
  createDepartment: (departmentData: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateDepartment: (departmentId: string, updates: Partial<Department>) => Promise<void>;
  deleteDepartment: (departmentId: string) => Promise<void>;
  
  // Specialization Management
  loadSpecializations: () => Promise<void>;
  createSpecialization: (name: string) => Promise<void>;
  updateSpecialization: (specializationId: string, name: string) => Promise<void>;
  deleteSpecialization: (specializationId: string) => Promise<void>;
  
  // Quick Actions - Notes
  createUserNote: (userId: string, noteText: string, isPrivate: boolean) => Promise<void>;
  
  // Quick Actions - Documents
  uploadUserDocument: (userId: string, file: File, category: string, title: string) => Promise<void>;
  
  // Saved Searches Management
  loadSavedSearches: () => Promise<void>;
  createSavedSearch: (name: string, description: string, config: SearchConfig, isGlobal: boolean) => Promise<void>;
  updateSavedSearch: (searchId: string, updates: Partial<SavedSearch>) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  users: [],
  leaveRequests: [],
  locations: [],
  departments: [],
  specializations: [],
  savedSearches: [],
  loading: false,

  // ============================================
  // USER MANAGEMENT
  // ============================================

  loadAllUsers: async () => {
    set({ loading: true });
    try {
      // Use UserService to load all users
      const services = getServices();
      const users = await services.user.getAllUsers();

      set({ users });
    } catch (error) {
      console.error('Load all users error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Alias for consistency
  loadUsers: async () => {
    return get().loadAllUsers();
  },

  createUser: async (userData, password) => {
    set({ loading: true });
    try {
      console.log('📝 Creating user...', { email: userData.email, role: userData.role });
      
      // Get default organization ID
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        throw new Error('Keine Standard-Organisation gefunden. Bitte erstelle zuerst eine Organisation in den Firmeneinstellungen.');
      }

      // Get Supabase config
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht authentifiziert');
      }

      // Import projectId and publicAnonKey
      const { supabaseUrl, publicAnonKey } = await import('../utils/supabase/info');

      console.log('🔗 Sending request to server...');

      // Create user via server endpoint with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/users/create`;
        console.log('🌐 Request URL:', url);
        console.log('🔑 Using auth token:', publicAnonKey.substring(0, 20) + '...');
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: userData.email,
            password: password,
            userData: {
              ...userData,
              organization_id: defaultOrgId, // ✅ AUTO-ASSIGN TO DEFAULT ORG
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Server error response:', errorText);
          console.error('❌ Full error details:', {
            status: response.status,
            statusText: response.statusText,
            url,
            errorText
          });
          
          let errorMessage = 'Fehler beim Erstellen des Mitarbeiters';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.details || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Server response:', result);

        if (!result.user) {
          throw new Error('Keine Benutzerdaten vom Server erhalten');
        }

        console.log('✅ User created successfully:', result.user.email);

        // Update local state
        const { users } = get();
        set({ users: [result.user, ...users] });

        return result.user;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Die Anfrage hat zu lange gedauert (Timeout). Bitte versuchen Sie es erneut oder überprüfen Sie Ihre Internetverbindung.');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('❌ Create user error:', error);
      
      // Enhanced error messages
      if (error.message?.includes('fetch')) {
        throw new Error('Netzwerkfehler: Kann Server nicht erreichen. Bitte überprüfen Sie:\n1. Ihre Internetverbindung\n2. Ob das Supabase-Projekt läuft\n3. Die Browser-Konsole für Details');
      }
      
      throw new Error(error.message || 'Fehler beim Erstellen des Mitarbeiters');
    } finally {
      set({ loading: false });
    }
  },

  updateUser: async (userId, updates) => {
    set({ loading: true });
    try {
      // Use UserService to update user
      const services = getServices();
      const updatedUser = await services.user.updateUser(userId, updates);

      // Update local state
      const { users } = get();
      set({
        users: users.map(u => u.id === userId ? { ...u, ...updatedUser } : u)
      });
    } catch (error) {
      console.error('Update user error:', error);
      
      if (error instanceof NotFoundError) {
        throw new Error('Benutzer nicht gefunden');
      } else if (error instanceof ValidationError) {
        throw new Error('Ungültige Eingabedaten');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deactivateUser: async (userId) => {
    set({ loading: true });
    try {
      // Use UserService to deactivate user
      const services = getServices();
      await services.user.deactivateUser(userId);

      // Update local state
      const { users } = get();
      set({
        users: users.map(u => u.id === userId ? { ...u, is_active: false } : u)
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      
      if (error instanceof NotFoundError) {
        throw new Error('Benutzer nicht gefunden');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // LEAVE REQUEST MANAGEMENT
  // ============================================

  loadAllLeaveRequests: async () => {
    set({ loading: true });
    try {
      // Use LeaveService to load all requests
      const services = getServices();
      const leaveRequests = await services.leave.getAllLeaveRequests();

      set({ leaveRequests });
    } catch (error) {
      console.error('Load all leave requests error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  approveLeaveRequest: async (requestId, approverId) => {
    set({ loading: true });
    try {
      // Use LeaveService to approve request
      const services = getServices();
      const updatedRequest = await services.leave.approveLeaveRequest(requestId, approverId);

      // Update local state
      const { leaveRequests } = get();
      set({
        leaveRequests: leaveRequests.map(r => r.id === requestId ? updatedRequest : r)
      });

      // Award coins for approved vacation
      if (updatedRequest.type === 'VACATION') {
        await get().awardCoins(updatedRequest.user_id, 5, 'Urlaubsantrag genehmigt');
      }
    } catch (error) {
      console.error('Approve leave request error:', error);
      
      if (error instanceof NotFoundError) {
        throw new Error('Urlaubsantrag nicht gefunden');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  rejectLeaveRequest: async (requestId, approverId, reason) => {
    set({ loading: true });
    try {
      // Use LeaveService to reject request
      const services = getServices();
      const updatedRequest = await services.leave.rejectLeaveRequest(requestId, approverId, reason);

      // Update local state
      const { leaveRequests } = get();
      set({
        leaveRequests: leaveRequests.map(r => r.id === requestId ? updatedRequest : r)
      });
    } catch (error) {
      console.error('Reject leave request error:', error);
      
      if (error instanceof NotFoundError) {
        throw new Error('Urlaubsantrag nicht gefunden');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // COIN MANAGEMENT
  // ============================================

  awardCoins: async (userId, amount, reason) => {
    try {
      // Use UserService to award coins
      const services = getServices();
      await services.user.awardCoins(userId, amount, reason);
    } catch (error) {
      console.error('Award coins error:', error);
      throw error;
    }
  },

  deductCoins: async (userId, amount, reason) => {
    try {
      // Use UserService to deduct coins
      const services = getServices();
      await services.user.deductCoins(userId, amount, reason);
    } catch (error) {
      console.error('Deduct coins error:', error);
      throw error;
    }
  },

  // ============================================
  // VIDEO MANAGEMENT
  // ============================================

  createVideo: async (videoData) => {
    set({ loading: true });
    try {
      // Use LearningService to create video
      const services = getServices();
      await services.learning.createVideo({
        title: videoData.title || '',
        youtube_url: videoData.youtube_url || '',
        description: videoData.description,
        duration_minutes: videoData.duration_minutes,
        thumbnail_url: videoData.thumbnail_url,
        category: videoData.category,
        xp_reward: videoData.xp_reward,
        coin_reward: videoData.coin_reward,
      });
    } catch (error) {
      console.error('Create video error:', error);
      
      if (error instanceof ValidationError) {
        throw new Error('Ungültige Video-Daten');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateVideo: async (videoId, updates) => {
    set({ loading: true });
    try {
      // Use LearningService to update video
      const services = getServices();
      await services.learning.updateVideo(videoId, updates);
    } catch (error) {
      console.error('Update video error:', error);
      
      if (error instanceof NotFoundError) {
        throw new Error('Video nicht gefunden');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteVideo: async (videoId) => {
    set({ loading: true });
    try {
      // Use LearningService to delete video
      const services = getServices();
      await services.learning.deleteVideo(videoId);
    } catch (error) {
      console.error('Delete video error:', error);
      
      if (error instanceof NotFoundError) {
        throw new Error('Video nicht gefunden');
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // LOCATION MANAGEMENT
  // ============================================

  loadLocations: async () => {
    set({ loading: true });
    try {
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        // Silently set empty array - no organization exists yet
        set({ locations: [] });
        return;
      }

      // Direct Supabase call (no LocationService yet)
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', defaultOrgId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      set({ locations: data || [] });
    } catch (error) {
      console.error('Load locations error:', error);
      set({ locations: [] });
    } finally {
      set({ loading: false });
    }
  },

  createLocation: async (locationData) => {
    set({ loading: true });
    try {
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        throw new Error('Keine Standard-Organisation gefunden. Bitte erstelle zuerst eine Organisation in den Firmeneinstellungen.');
      }

      // Direct Supabase call (no LocationService yet)
      const { data, error } = await supabase
        .from('locations')
        .insert({
          ...locationData,
          organization_id: defaultOrgId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { locations } = get();
      set({ locations: [...locations, data] });
    } catch (error) {
      console.error('Create location error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateLocation: async (locationId, updates) => {
    set({ loading: true });
    try {
      // Direct Supabase call (no LocationService yet)
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', locationId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { locations } = get();
      set({
        locations: locations.map(l => l.id === locationId ? data : l)
      });
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteLocation: async (locationId) => {
    set({ loading: true });
    try {
      // Soft delete - just set is_active to false
      // Direct Supabase call (no LocationService yet)
      const { error } = await supabase
        .from('locations')
        .update({ is_active: false })
        .eq('id', locationId);

      if (error) throw error;

      // Update local state - remove from list
      const { locations } = get();
      set({
        locations: locations.filter(l => l.id !== locationId)
      });
    } catch (error) {
      console.error('Delete location error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // DEPARTMENT MANAGEMENT
  // ============================================

  loadDepartments: async () => {
    set({ loading: true });
    try {
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        // Silently set empty array - no organization exists yet
        set({ departments: [] });
        return;
      }

      // Direct Supabase call (no DepartmentService yet)
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('organization_id', defaultOrgId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        // Check if it's a "table not found" error
        if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
          console.warn('⚠️ Departments table not found. Please run migration 024_add_departments.sql');
          set({ departments: [] });
          return;
        }
        throw error;
      }

      set({ departments: data || [] });
    } catch (error) {
      console.error('Load departments error:', error);
      // Don't throw - just set empty array to prevent app crash
      set({ departments: [] });
    } finally {
      set({ loading: false });
    }
  },

  createDepartment: async (departmentData) => {
    set({ loading: true });
    try {
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        throw new Error('Keine Standard-Organisation gefunden. Bitte erstelle zuerst eine Organisation in den Firmeneinstellungen.');
      }

      // Direct Supabase call (no DepartmentService yet)
      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...departmentData,
          organization_id: defaultOrgId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { departments } = get();
      set({ departments: [...departments, data] });
    } catch (error) {
      console.error('Create department error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateDepartment: async (departmentId, updates) => {
    set({ loading: true });
    try {
      // Direct Supabase call (no DepartmentService yet)
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', departmentId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { departments } = get();
      set({
        departments: departments.map(d => d.id === departmentId ? data : d)
      });
    } catch (error) {
      console.error('Update department error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteDepartment: async (departmentId) => {
    set({ loading: true });
    try {
      // Soft delete - just set is_active to false
      // Direct Supabase call (no DepartmentService yet)
      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', departmentId);

      if (error) throw error;

      // Update local state - remove from list
      const { departments } = get();
      set({
        departments: departments.filter(d => d.id !== departmentId)
      });
    } catch (error) {
      console.error('Delete department error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // SPECIALIZATION MANAGEMENT
  // ============================================

  loadSpecializations: async () => {
    set({ loading: true });
    try {
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        // Silently set empty array - no organization exists yet
        set({ specializations: [] });
        return;
      }

      // Direct Supabase call (no SpecializationService yet)
      const { data, error } = await supabase
        .from('specializations')
        .select('*')
        .eq('organization_id', defaultOrgId)
        .order('name', { ascending: true });

      if (error) {
        // Check if it's a \"table not found\" error
        if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
          console.warn('⚠️ Specializations table not found. Please run migration 070_specializations_master_table.sql');
          set({ specializations: [] });
          return;
        }
        throw error;
      }

      set({ specializations: data || [] });
    } catch (error) {
      console.error('Load specializations error:', error);
      // Don't throw - just set empty array to prevent app crash
      set({ specializations: [] });
    } finally {
      set({ loading: false });
    }
  },

  createSpecialization: async (name) => {
    set({ loading: true });
    try {
      const defaultOrgId = await getDefaultOrganizationId();
      if (!defaultOrgId) {
        throw new Error('Keine Standard-Organisation gefunden. Bitte erstelle zuerst eine Organisation in den Firmeneinstellungen.');
      }

      // Direct Supabase call (no SpecializationService yet)
      const { data, error } = await supabase
        .from('specializations')
        .insert({
          name: name.trim(),
          organization_id: defaultOrgId,
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error('Diese Spezialisierung existiert bereits');
        }
        throw error;
      }

      // Update local state
      const { specializations } = get();
      set({ specializations: [...specializations, data] });
    } catch (error) {
      console.error('Create specialization error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateSpecialization: async (specializationId, name) => {
    set({ loading: true });
    try {
      // Direct Supabase call (no SpecializationService yet)
      const { data, error } = await supabase
        .from('specializations')
        .update({ name: name.trim() })
        .eq('id', specializationId)
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error('Diese Spezialisierung existiert bereits');
        }
        throw error;
      }

      // Update local state
      const { specializations } = get();
      set({
        specializations: specializations.map(s => s.id === specializationId ? data : s)
      });
    } catch (error) {
      console.error('Update specialization error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteSpecialization: async (specializationId) => {
    set({ loading: true });
    try {
      // Hard delete - remove from database
      // Direct Supabase call (no SpecializationService yet)
      const { error } = await supabase
        .from('specializations')
        .delete()
        .eq('id', specializationId);

      if (error) throw error;

      // Update local state - remove from list
      const { specializations } = get();
      set({
        specializations: specializations.filter(s => s.id !== specializationId)
      });
    } catch (error) {
      console.error('Delete specialization error:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // ============================================
  // QUICK ACTIONS
  // ============================================

  createUserNote: async (userId, noteText, isPrivate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Direct Supabase call (no NoteService yet)
      const { error } = await supabase
        .from('user_notes')
        .insert({
          user_id: userId,
          author_id: user.id,
          note_text: noteText,
          is_private: isPrivate,
        });

      if (error) throw error;

      console.log('Note created successfully');
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  },

  uploadUserDocument: async (userId, file, category, title) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Use DocumentService to create document record
      const services = getServices();
      await services.document.uploadDocument({
        user_id: userId,           // ✅ CRITICAL: Who owns the document
        title,
        category,
        file_url: publicUrl,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,      // Who uploaded it (admin)
      });

      console.log('Document uploaded successfully');
    } catch (error) {
      console.error('Upload document error:', error);
      throw error;
    }
  },

  // ============================================
  // SAVED SEARCHES
  // ============================================

  loadSavedSearches: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Direct Supabase call (no SavedSearchService yet)
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .or(`user_id.eq.${user.id},is_global.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ savedSearches: data || [] });
    } catch (error) {
      console.error('Load saved searches error:', error);
      throw error;
    }
  },

  createSavedSearch: async (name, description, config, isGlobal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Direct Supabase call (no SavedSearchService yet)
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name,
          description,
          search_config: config,
          is_global: isGlobal,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { savedSearches } = get();
      set({ savedSearches: [data, ...savedSearches] });

      console.log('Saved search created successfully');
    } catch (error) {
      console.error('Create saved search error:', error);
      throw error;
    }
  },

  updateSavedSearch: async (searchId, updates) => {
    try {
      // Direct Supabase call (no SavedSearchService yet)
      const { data, error } = await supabase
        .from('saved_searches')
        .update(updates)
        .eq('id', searchId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { savedSearches } = get();
      set({
        savedSearches: savedSearches.map(s => s.id === searchId ? data : s)
      });
    } catch (error) {
      console.error('Update saved search error:', error);
      throw error;
    }
  },

  deleteSavedSearch: async (searchId) => {
    try {
      // Direct Supabase call (no SavedSearchService yet)
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      // Update local state
      const { savedSearches } = get();
      set({
        savedSearches: savedSearches.filter(s => s.id !== searchId)
      });
    } catch (error) {
      console.error('Delete saved search error:', error);
      throw error;
    }
  },
}));