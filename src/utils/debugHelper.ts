/**
 * Debug Helper - Logging utilities for development
 */

export const DEBUG = {
  AUTH: true,
  API: true,
  ERRORS: true,
  PERFORMANCE: false,
};

export function logAuth(message: string, data?: any) {
  if (!DEBUG.AUTH) return;
  console.log(`🔐 [AUTH] ${message}`, data || '');
}

export function logAPI(message: string, data?: any) {
  if (!DEBUG.API) return;
  console.log(`📡 [API] ${message}`, data || '');
}

export function logError(message: string, error: any) {
  if (!DEBUG.ERRORS) return;
  console.error(`❌ [ERROR] ${message}`, error);
  
  // Log additional error details
  if (error instanceof Error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
  
  // Check for specific error types
  if (error instanceof TypeError && error.message.includes('fetch')) {
    console.error('🚨 FETCH ERROR DETECTED!');
    console.error('Possible causes:');
    console.error('1. Network connection lost');
    console.error('2. Supabase server unreachable');
    console.error('3. CORS configuration issue');
    console.error('4. Invalid URL or endpoint');
  }
}

export function logPerformance(label: string, startTime: number) {
  if (!DEBUG.PERFORMANCE) return;
  const duration = performance.now() - startTime;
  console.log(`⏱️ [PERF] ${label}: ${duration.toFixed(2)}ms`);
}

/**
 * Log a Supabase error with additional context
 */
export function logSupabaseError(operation: string, error: any, context?: any) {
  console.error(`❌ [SUPABASE] ${operation} failed:`, error);
  
  if (context) {
    console.error('Context:', context);
  }
  
  // Check for common Supabase error patterns
  if (error?.message?.includes('JWT')) {
    console.error('🔑 JWT/Auth error detected - Session might be expired');
  }
  
  if (error?.message?.includes('permission')) {
    console.error('🔒 Permission error - RLS policy issue');
  }
  
  if (error?.code === 'PGRST116') {
    console.error('📊 Table/View not found - Database schema issue');
  }
  
  if (error?.message?.includes('timeout')) {
    console.error('⏰ Timeout error - Query took too long');
  }
}

/**
 * Create a performance timer
 */
export function startTimer(label: string) {
  const start = performance.now();
  return () => logPerformance(label, start);
}

/**
 * Safe JSON stringify with error handling
 */
export function safeStringify(obj: any, indent?: number): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return `[Unable to stringify: ${error}]`;
  }
}

/**
 * Test if Supabase is reachable
 */
export async function testSupabaseConnection(supabaseBaseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseBaseUrl}/auth/v1/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    logError('Supabase connection test failed', error);
    return false;
  }
}
