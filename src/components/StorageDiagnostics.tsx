import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from './icons/BrowoKoIcons';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

interface BucketInfo {
  name: string;
  exists: boolean;
  details: any;
}

interface BucketStatus {
  status: 'ready' | 'partial' | 'error';
  buckets: {
    logo: BucketInfo;
    profile: BucketInfo;
  };
  allBuckets: string[];
  error?: string;
}

export default function StorageDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BucketStatus | null>(null);

  const checkBucketStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/storage/status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check bucket status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (error: any) {
      console.error('Bucket status check error:', error);
      setStatus({
        status: 'error',
        buckets: {
          logo: {
            name: 'make-f659121d-company-logos',
            exists: false,
            details: null
          },
          profile: {
            name: 'make-f659121d-profile-pictures',
            exists: false,
            details: null
          }
        },
        allBuckets: [],
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return null;
    
    switch (status.status) {
      case 'ready':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'missing':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getStatusText = () => {
    if (!status) return null;
    
    switch (status.status) {
      case 'ready':
        return 'Alle Storage Buckets sind bereit';
      case 'partial':
        return 'Einige Storage Buckets fehlen - werden beim nächsten Upload automatisch erstellt';
      case 'error':
        return 'Fehler beim Überprüfen der Storage Buckets';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Storage Diagnose
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={checkBucketStatus}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Status überprüfen
          </Button>
        </div>

        {status && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
              {getStatusIcon()}
              <div>
                <p className="font-medium">{getStatusText()}</p>
              </div>
            </div>

            {/* Individual Bucket Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo Bucket */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {status.buckets.logo.exists ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <p className="text-sm font-medium">Logo Bucket</p>
                </div>
                <p className="text-xs text-gray-500">{status.buckets.logo.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Status: {status.buckets.logo.exists ? 'Bereit' : 'Fehlt'}
                </p>
              </div>

              {/* Profile Bucket */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {status.buckets.profile.exists ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <p className="text-sm font-medium">Profile Pictures Bucket</p>
                </div>
                <p className="text-xs text-gray-500">{status.buckets.profile.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Status: {status.buckets.profile.exists ? 'Bereit' : 'Fehlt'}
                </p>
              </div>
            </div>

            {status.allBuckets.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Alle Buckets:</p>
                <ul className="text-sm space-y-1">
                  {status.allBuckets.map((bucket) => (
                    <li key={bucket} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      {bucket}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-1">Fehler:</p>
                <p className="text-sm text-red-600">{status.error}</p>
              </div>
            )}

            {status.status === 'partial' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Hinweis:
                </p>
                <p className="text-sm text-blue-600">
                  Fehlende Storage Buckets werden automatisch erstellt, wenn du das erste Mal ein Bild hochlädst.
                  Du musst nichts manuell einrichten.
                </p>
              </div>
            )}

            {status.status === 'error' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  Mögliche Lösungen:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Überprüfe, ob die Edge Function läuft</li>
                  <li>Überprüfe die Service Role Key Berechtigungen</li>
                  <li>Versuche, den Bucket manuell in der Supabase UI zu erstellen</li>
                  <li>Siehe STORAGE_BUCKET_SETUP.md für Details</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}