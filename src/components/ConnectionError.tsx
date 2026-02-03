import { AlertTriangle, RefreshCw } from './icons/BrowoKoIcons';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface ConnectionErrorProps {
  onRetry?: () => void;
}

export default function ConnectionError({ onRetry }: ConnectionErrorProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Verbindungsfehler
          </h2>
          
          <p className="text-sm text-gray-600 mb-6">
            Die Verbindung zur Datenbank konnte nicht hergestellt werden.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
            <p className="text-xs font-bold text-red-900 mb-2">⚠️ Fehler: TypeError: Failed to fetch</p>
            <p className="text-xs text-red-700 mb-3">
              Dies bedeutet, dass die Verbindung zu Supabase fehlgeschlagen ist.
            </p>
            <p className="text-xs font-medium text-red-900 mb-2">🔍 Mögliche Ursachen:</p>
            <ul className="text-xs text-red-700 space-y-1">
              <li><strong>1. Lokal: Supabase nicht gestartet</strong> → <code>supabase start</code></li>
              <li>2. Netzwerk- oder Firewall-Probleme</li>
              <li>3. Ungültige API-Konfiguration</li>
              <li>4. CORS-Konfigurationsfehler</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-bold text-blue-900 mb-2">✅ Lösung:</p>
            <ol className="text-xs text-blue-700 space-y-2">
              <li><strong>1.</strong> Lokal: Prüfe ob Supabase läuft (<code>supabase status</code>)</li>
              <li><strong>2.</strong> Prüfe .env: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (von <code>supabase start</code>)</li>
              <li><strong>3.</strong> Klicke unten auf „Erneut versuchen“</li>
            </ol>
          </div>
          
          <div className="space-y-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Erneut versuchen
              </Button>
            )}
            
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              variant="outline"
            >
              Seite neu laden
            </Button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Öffne die Browser-Konsole (F12) für detaillierte Fehlerinformationen
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
