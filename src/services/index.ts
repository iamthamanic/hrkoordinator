/**
 * SERVICES INDEX
 * ==============
 * Central export point for all services
 * 
 * Usage:
 * ```typescript
 * import { getServices } from '../services';
 * const services = getServices();
 * await services.auth.signIn(email, password);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';

// Base exports
export * from './base/ApiError';
export * from './base/ApiService';

// Domain service exports
export { AuthService } from './BrowoKo_authService';
export { UserService } from './BrowoKo_userService';
export { TeamService } from './BrowoKo_teamService';
export { LeaveService } from './BrowoKo_leaveService';
export { LearningService } from './BrowoKo_learningService';
export { OrganigramService } from './BrowoKo_organigramService';
export { DocumentService } from './BrowoKo_documentService';
export { DocumentAuditService } from './BrowoKo_documentAuditService';
export { AnnouncementService } from './BrowoKo_announcementService';
export { RealtimeService } from './BrowoKo_realtimeService';

// ESM imports for createServices (Vite/browser has no require())
import { AuthService } from './BrowoKo_authService';
import { UserService } from './BrowoKo_userService';
import { TeamService } from './BrowoKo_teamService';
import { LeaveService } from './BrowoKo_leaveService';
import { LearningService } from './BrowoKo_learningService';
import { OrganigramService } from './BrowoKo_organigramService';
import { DocumentService } from './BrowoKo_documentService';
import { DocumentAuditService } from './BrowoKo_documentAuditService';
import { AnnouncementService } from './BrowoKo_announcementService';
import { RealtimeService } from './BrowoKo_realtimeService';

// Services container type
export interface Services {
  auth: import('./BrowoKo_authService').AuthService;
  user: import('./BrowoKo_userService').UserService;
  team: import('./BrowoKo_teamService').TeamService;
  leave: import('./BrowoKo_leaveService').LeaveService;
  learning: import('./BrowoKo_learningService').LearningService;
  organigram: import('./BrowoKo_organigramService').OrganigramService;
  document: import('./BrowoKo_documentService').DocumentService;
  documentAudit: import('./BrowoKo_documentAuditService').DocumentAuditService;
  announcement: import('./BrowoKo_announcementService').AnnouncementService;
  realtime: import('./BrowoKo_realtimeService').RealtimeService;
}

/**
 * CREATE SERVICES
 * ===============
 * Factory function to create all services with a Supabase client
 * 
 * This ensures all services share the same Supabase client instance.
 */
export function createServices(client: SupabaseClient): Services {
  return {
    auth: new AuthService(client),
    user: new UserService(client),
    team: new TeamService(client),
    leave: new LeaveService(client),
    learning: new LearningService(client),
    organigram: new OrganigramService(client),
    document: new DocumentService(client),
    documentAudit: new DocumentAuditService(client),
    announcement: new AnnouncementService(client),
    realtime: new RealtimeService(client),
  };
}

/**
 * SINGLETON SERVICES INSTANCE
 * ===========================
 * Create services once and reuse
 * 
 * Usage:
 * ```typescript
 * import { getServices } from '../services';
 * 
 * const services = getServices();
 * await services.auth.signIn(email, password);
 * ```
 */
let servicesInstance: Services | null = null;

export function getServices(): Services {
  if (!servicesInstance) {
    if (!supabase || typeof supabase.from !== 'function') {
      console.error('[getServices] ❌ Supabase client invalid');
      throw new Error('Supabase client not available');
    }
    servicesInstance = createServices(supabase);
  }
  return servicesInstance;
}

/**
 * RESET SERVICES
 * ==============
 * Reset the singleton instance (useful for testing)
 */
export function resetServices(): void {
  servicesInstance = null;
}
