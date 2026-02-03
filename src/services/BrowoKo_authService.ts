/**
 * AUTHENTICATION SERVICE
 * ======================
 * Handles all authentication operations
 * 
 * This service replaces direct Supabase calls in authStore
 * and provides a clean API for authentication.
 * 
 * Features:
 * - Sign in / Sign up
 * - Sign out
 * - Password reset
 * - Session management
 * - Profile fetching
 * - Organization fetching
 * 
 * Usage:
 * ```typescript
 * const authService = new AuthService(supabase);
 * 
 * // Sign in
 * const session = await authService.signIn('email@example.com', 'password');
 * 
 * // Get profile
 * const profile = await authService.getCurrentUserProfile(userId);
 * ```
 */

import { ApiService } from './base/ApiService';
import { AuthenticationError, ValidationError, NotFoundError } from './base/ApiError';
import type { User as AuthUser, Session } from '@supabase/supabase-js';
import type { User, UserWithAvatar, Organization } from '../types/database';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

/**
 * SIGN IN RESPONSE
 */
export interface SignInResponse {
  user: AuthUser;
  session: Session;
}

/**
 * SIGN UP DATA
 */
export interface SignUpData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization_id?: string;
}

/**
 * AUTH SERVICE
 * ============
 */
export class AuthService extends ApiService {
  /**
   * SIGN IN
   * =======
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<SignInResponse> {
    this.logRequest('signIn', 'AuthService', { email });

    // Validate input
    if (!email || !password) {
      throw new ValidationError(
        'Email und Passwort sind erforderlich',
        'AuthService.signIn',
        {
          email: !email ? 'Email ist erforderlich' : '',
          password: !password ? 'Passwort ist erforderlich' : '',
        }
      );
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.signIn',
          error
        );
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError(
          'Keine Benutzerdaten zurückgegeben',
          'AuthService.signIn'
        );
      }

      this.logResponse('AuthService.signIn', { userId: data.user.id });
      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.signIn');
    }
  }

  /**
   * SIGN UP
   * =======
   * Create a new user account
   */
  async signUp(userData: SignUpData): Promise<SignInResponse> {
    this.logRequest('signUp', 'AuthService', { email: userData.email });

    // Validate input
    const validationErrors: Record<string, string> = {};
    if (!userData.email) validationErrors.email = 'Email ist erforderlich';
    if (!userData.password) validationErrors.password = 'Passwort ist erforderlich';
    if (!userData.first_name) validationErrors.first_name = 'Vorname ist erforderlich';
    if (!userData.last_name) validationErrors.last_name = 'Nachname ist erforderlich';

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError(
        'Alle Felder sind erforderlich',
        'AuthService.signUp',
        validationErrors
      );
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            organization_id: userData.organization_id,
          },
        },
      });

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.signUp',
          error
        );
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError(
          'Keine Benutzerdaten zurückgegeben',
          'AuthService.signUp'
        );
      }

      this.logResponse('AuthService.signUp', { userId: data.user.id });
      
      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.signUp');
    }
  }

  /**
   * SIGN OUT
   * ========
   * Sign out current user
   */
  async signOut(): Promise<void> {
    this.logRequest('signOut', 'AuthService');

    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.signOut',
          error
        );
      }

      this.logResponse('AuthService.signOut', 'Erfolg');
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.signOut');
    }
  }

  /**
   * GET CURRENT SESSION
   * ===================
   * Get the current session
   */
  async getCurrentSession(): Promise<Session | null> {
    this.logRequest('getCurrentSession', 'AuthService');

    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.getCurrentSession',
          error
        );
      }

      this.logResponse('AuthService.getCurrentSession', { 
        hasSession: !!data.session 
      });
      
      return data.session;
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.getCurrentSession');
    }
  }

  /**
   * GET CURRENT USER
   * ================
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    this.logRequest('getCurrentUser', 'AuthService');

    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.getCurrentUser',
          error
        );
      }

      this.logResponse('AuthService.getCurrentUser', { 
        userId: data.user?.id 
      });
      
      return data.user;
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.getCurrentUser');
    }
  }

  /**
   * GET USER PROFILE
   * ================
   * Get user profile with avatar
   */
  async getCurrentUserProfile(userId: string): Promise<UserWithAvatar> {
    this.logRequest('getCurrentUserProfile', 'AuthService', { userId });

    if (!userId) {
      throw new ValidationError(
        'User ID ist erforderlich',
        'AuthService.getCurrentUserProfile',
        { userId: 'User ID ist erforderlich' }
      );
    }

    try {
      const { data: profile, error } = await this.supabase
        .from('users')
        .select(`
          *,
          avatar:user_avatars(*)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw new NotFoundError(
          'Benutzerprofil',
          'AuthService.getCurrentUserProfile',
          error
        );
      }

      if (!profile) {
        throw new NotFoundError(
          'Benutzerprofil',
          'AuthService.getCurrentUserProfile'
        );
      }

      this.logResponse('AuthService.getCurrentUserProfile', { 
        email: profile.email 
      });
      
      return profile as UserWithAvatar;
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.getCurrentUserProfile');
    }
  }

  /**
   * GET USER ORGANIZATION
   * =====================
   * Get user's organization
   */
  async getUserOrganization(userId: string): Promise<Organization | null> {
    this.logRequest('getUserOrganization', 'AuthService', { userId });

    if (!userId) {
      throw new ValidationError(
        'User ID ist erforderlich',
        'AuthService.getUserOrganization',
        { userId: 'User ID ist erforderlich' }
      );
    }

    try {
      // First get the user's organization_id
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new NotFoundError(
          'Benutzer',
          'AuthService.getUserOrganization',
          userError
        );
      }

      if (!user?.organization_id) {
        this.logResponse('AuthService.getUserOrganization', { 
          hasOrganization: false 
        });
        return null;
      }

      // Then get the organization
      const { data: organization, error: orgError } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single();

      if (orgError) {
        console.error('Organization fetch error:', orgError);
        return null; // Don't fail if organization not found
      }

      this.logResponse('AuthService.getUserOrganization', { 
        organizationName: organization?.name 
      });
      
      return organization as Organization;
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.getUserOrganization');
    }
  }

  /**
   * RESET PASSWORD FOR EMAIL
   * ========================
   * Send password reset email
   */
  async resetPasswordForEmail(email: string): Promise<void> {
    this.logRequest('resetPasswordForEmail', 'AuthService', { email });

    if (!email) {
      throw new ValidationError(
        'Email ist erforderlich',
        'AuthService.resetPasswordForEmail',
        { email: 'Email ist erforderlich' }
      );
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.resetPasswordForEmail',
          error
        );
      }

      this.logResponse('AuthService.resetPasswordForEmail', 'Erfolg');
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.resetPasswordForEmail');
    }
  }

  /**
   * UPDATE PASSWORD
   * ===============
   * Update user's password
   */
  async updatePassword(newPassword: string): Promise<void> {
    this.logRequest('updatePassword', 'AuthService');

    if (!newPassword || newPassword.length < 6) {
      throw new ValidationError(
        'Passwort muss mindestens 6 Zeichen lang sein',
        'AuthService.updatePassword',
        { password: 'Passwort muss mindestens 6 Zeichen lang sein' }
      );
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.updatePassword',
          error
        );
      }

      this.logResponse('AuthService.updatePassword', 'Erfolg');
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.updatePassword');
    }
  }

  /**
   * REFRESH SESSION
   * ===============
   * Refresh the current session
   */
  async refreshSession(): Promise<Session | null> {
    this.logRequest('refreshSession', 'AuthService');

    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        throw new AuthenticationError(
          error.message,
          'AuthService.refreshSession',
          error
        );
      }

      this.logResponse('AuthService.refreshSession', { 
        hasSession: !!data.session 
      });
      
      return data.session;
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      this.handleError(error, 'AuthService.refreshSession');
    }
  }

  /**
   * GET PERMISSIONS
   * ===============
   * Get effective permissions for a user from the backend
   * This calls the BrowoKoordinator-Server API to get permissions
   * from the effective_user_permissions view
   */
  async getPermissions(userId: string): Promise<string[]> {
    this.logRequest('getPermissions', 'AuthService', { userId });

    if (!userId) {
      throw new ValidationError(
        'User ID ist erforderlich',
        'AuthService.getPermissions',
        { userId: 'User ID ist erforderlich' }
      );
    }

    try {
      // Get current session token for authentication
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (!session) {
        console.warn('⚠️ No session found, returning empty permissions');
        return [];
      }

      // Call the BrowoKoordinator-Server API
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/me/permissions`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Permissions fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch permissions: ${response.status}`);
      }

      const data = await response.json();
      
      this.logResponse('AuthService.getPermissions', { 
        permissionCount: data.permissions?.length || 0 
      });
      
      return data.permissions || [];
    } catch (error: any) {
      console.error('❌ Error fetching permissions:', error);
      
      // Don't throw - return empty array as fallback
      // This allows the app to continue working with role-based permissions
      return [];
    }
  }
}