import { supabase } from './client';
import { supabaseUrl } from './info';

/**
 * Test Supabase connection
 * Returns true if connection is successful, false otherwise
 */
export async function testSupabaseConnection(): Promise<boolean> {
  console.log('🔍 Testing Supabase connection...');
  console.log('🔗 URL:', supabaseUrl);
  
  try {
    // Try a simple health check
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        status: (error as any).status
      });
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection test threw exception:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🚨 NETWORK ERROR: Cannot reach Supabase server!');
      console.error('Possible causes:');
      console.error('1. Supabase project is paused (visit dashboard to wake it up)');
      console.error('2. Network/firewall blocking request');
      console.error('3. Invalid project ID or URL');
      console.error('4. CORS configuration issue');
    }
    
    return false;
  }
}
