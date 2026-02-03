/**
 * Supabase Connection Test Component
 * Tests the frontend connection to Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

interface ConnectionTestResult {
  step: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export default function SupabaseConnectionTest() {
  const [results, setResults] = useState<ConnectionTestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const testResults: ConnectionTestResult[] = [];

    // TEST 1: Supabase Client Initialization
    testResults.push({
      step: '1. Supabase Client',
      status: supabase ? 'success' : 'error',
      message: supabase ? 'Client initialisiert' : 'Client NICHT initialisiert!',
      details: {
        url: supabaseUrl,
        hasAuth: !!supabase?.auth,
        hasFrom: typeof supabase?.from === 'function',
      },
    });
    setResults([...testResults]);

    // TEST 2: Supabase URL & Keys
    testResults.push({
      step: '2. API Keys',
      status: supabaseUrl && publicAnonKey ? 'success' : 'error',
      message: supabaseUrl && publicAnonKey ? 'Keys vorhanden' : 'Keys FEHLEN!',
      details: {
        supabaseUrl: supabaseUrl || 'FEHLT!',
        anonKeyLength: publicAnonKey?.length || 0,
      },
    });
    setResults([...testResults]);

    // TEST 3: Test Query
    try {
      console.log('[Connection Test] 📡 Testing Supabase connection...');
      const { data, error } = await supabase
        .from('dashboard_announcements')
        .select('count')
        .limit(1);

      if (error) {
        testResults.push({
          step: '3. Test Query',
          status: 'error',
          message: `Fehler: ${error.message}`,
          details: error,
        });
      } else {
        testResults.push({
          step: '3. Test Query',
          status: 'success',
          message: 'Connection erfolgreich!',
          details: data,
        });
      }
    } catch (err: any) {
      testResults.push({
        step: '3. Test Query',
        status: 'error',
        message: `Exception: ${err.message}`,
        details: err,
      });
    }
    setResults([...testResults]);

    // TEST 4: Get Current User
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        testResults.push({
          step: '4. Current User',
          status: 'error',
          message: `Auth Error: ${error.message}`,
          details: error,
        });
      } else if (!user) {
        testResults.push({
          step: '4. Current User',
          status: 'error',
          message: 'NICHT EINGELOGGT!',
          details: { user: null },
        });
      } else {
        testResults.push({
          step: '4. Current User',
          status: 'success',
          message: `Eingeloggt als: ${user.email}`,
          details: {
            id: user.id,
            email: user.email,
          },
        });
      }
    } catch (err: any) {
      testResults.push({
        step: '4. Current User',
        status: 'error',
        message: `Exception: ${err.message}`,
        details: err,
      });
    }
    setResults([...testResults]);

    // TEST 5: Fetch Announcements (Real Request)
    try {
      const { data, error } = await supabase
        .from('dashboard_announcements')
        .select('id, title, is_live')
        .order('created_at', { ascending: false });

      if (error) {
        testResults.push({
          step: '5. Fetch Announcements',
          status: 'error',
          message: `Fehler: ${error.message}`,
          details: error,
        });
      } else {
        testResults.push({
          step: '5. Fetch Announcements',
          status: 'success',
          message: `${data?.length || 0} Announcements gefunden`,
          details: data,
        });
      }
    } catch (err: any) {
      testResults.push({
        step: '5. Fetch Announcements',
        status: 'error',
        message: `Exception: ${err.message}`,
        details: err,
      });
    }
    setResults([...testResults]);

    setTesting(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            🔍 Supabase Connection Test
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Frontend Connection Diagnose
          </p>
        </div>

        {/* Results */}
        <div className="p-6 space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-500'
                  : result.status === 'error'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    result.status === 'success'
                      ? 'bg-green-500 text-white'
                      : result.status === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {result.status === 'success' ? '✓' : result.status === 'error' ? '✗' : '?'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{result.step}</h3>
                  <p
                    className={`text-sm ${
                      result.status === 'success'
                        ? 'text-green-700'
                        : result.status === 'error'
                        ? 'text-red-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {result.message}
                  </p>
                </div>
              </div>

              {/* Details */}
              {result.details && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                    Details anzeigen
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-xs rounded overflow-auto max-h-40">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}

          {testing && (
            <div className="flex items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={runTests}
            disabled={testing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Testing...' : 'Erneut testen'}
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
          >
            Zurück zum Dashboard
          </button>
          <button
            onClick={() => {
              console.log('=== SUPABASE CONNECTION TEST RESULTS ===');
              results.forEach((result) => {
                console.log(`${result.step}: ${result.status}`);
                console.log(`Message: ${result.message}`);
                if (result.details) {
                  console.log('Details:', result.details);
                }
                console.log('---');
              });
            }}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
          >
            Logs in Console
          </button>
        </div>
      </div>
    </div>
  );
}
