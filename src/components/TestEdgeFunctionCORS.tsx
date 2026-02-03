import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

export default function TestEdgeFunctionCORS() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const testHealthEndpoint = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🧪 Testing Edge Function CORS...');
      console.log(`📍 URL: ${supabaseUrl}/functions/v1/BrowoKoordinator-Server/health`);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📡 Response Status:', response.status);
      console.log('📡 Response Headers:', [...response.headers.entries()]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Response Data:', data);

      if (data.status === 'ok') {
        setResult({
          success: true,
          message: '✅ CORS FIX ERFOLGREICH! Edge Function ist erreichbar!',
          details: data,
        });
      } else {
        setResult({
          success: false,
          message: '❌ Edge Function antwortet, aber mit falschem Status',
          details: data,
        });
      }
    } catch (error: any) {
      console.error('❌ Test Error:', error);

      if (error.message === 'Failed to fetch') {
        setResult({
          success: false,
          message: '❌ CORS FEHLER: Failed to fetch - Edge Function blockiert Anfragen!',
          details: {
            error: error.message,
            hint: 'Die Edge Function muss neu deployed werden mit origin: "*"',
          },
        });
      } else {
        setResult({
          success: false,
          message: `❌ Error: ${error.message}`,
          details: error,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const testUserCreation = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🧪 Testing User Creation Endpoint...');
      
      const testEmail = `test-${Date.now()}@hrthis.example.com`;
      const testPassword = 'TestPassword123!';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/users/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            userData: {
              first_name: 'Test',
              last_name: 'User',
              role: 'USER',
            },
          }),
        }
      );

      console.log('📡 Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response Data:', data);

      if (data.success) {
        setResult({
          success: true,
          message: '✅ USER CREATION FUNKTIONIERT! Test-User wurde erstellt!',
          details: {
            email: testEmail,
            userId: data.user?.id,
          },
        });
      } else {
        setResult({
          success: false,
          message: '❌ User Creation fehlgeschlagen',
          details: data,
        });
      }
    } catch (error: any) {
      console.error('❌ Test Error:', error);

      if (error.message === 'Failed to fetch') {
        setResult({
          success: false,
          message: '❌ CORS FEHLER: Failed to fetch - User Creation blockiert!',
          details: {
            error: error.message,
            hint: 'Die Edge Function muss neu deployed werden mit origin: "*"',
          },
        });
      } else {
        setResult({
          success: false,
          message: `❌ Error: ${error.message}`,
          details: error,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🧪 Edge Function CORS Test</h1>
          <p className="text-gray-600">
            Teste ob die Edge Function CORS korrekt konfiguriert ist
          </p>
        </div>

        {/* Test Buttons */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Test 1: Health Endpoint</h2>
            <p className="text-sm text-gray-600">
              Testet ob die Edge Function erreichbar ist und CORS korrekt funktioniert
            </p>
            <Button
              onClick={testHealthEndpoint}
              disabled={testing}
              className="w-full"
              size="lg"
            >
              {testing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Teste Health Endpoint...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Health Endpoint testen
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <h2 className="text-xl font-semibold">Test 2: User Creation</h2>
            <p className="text-sm text-gray-600">
              Testet ob User Creation funktioniert (erstellt einen Test-User)
            </p>
            <Button
              onClick={testUserCreation}
              disabled={testing}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              {testing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Teste User Creation...
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  User Creation testen
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Result */}
        {result && (
          <Card
            className={`p-6 ${
              result.success
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1 space-y-3">
                <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.message}
                </p>
                
                {result.details && (
                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm font-semibold mb-2">Details:</p>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}

                {!result.success && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">
                      🔧 Lösung:
                    </p>
                    <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                      <li>Öffne bei Cloud: Supabase Dashboard → Functions</li>
                      <li>Klick auf "make-server-f659121d"</li>
                      <li>Klick auf "Edit function"</li>
                      <li>Kopiere den Code aus /DEPLOY_EDGE_FUNCTION_NOW.md</li>
                      <li>Ersetze den kompletten Code</li>
                      <li>Klick "Deploy"</li>
                      <li>Warte 60 Sekunden</li>
                      <li>Teste nochmal hier!</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-2">
              <p className="font-semibold">ℹ️ Was wird getestet?</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Health Endpoint:</strong> Prüft ob CORS korrekt ist</li>
                <li><strong>User Creation:</strong> Prüft ob Mitarbeiter-Erstellung funktioniert</li>
              </ul>
              <p className="mt-3">
                <strong>Expected:</strong> Beide Tests sollten ✅ sein!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}