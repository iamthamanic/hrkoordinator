/**
 * @file SystemHealthScreen.tsx
 * @version 4.11.2
 * @description System Health Dashboard - Monitor all 14 Edge Functions
 * 
 * Features:
 * - Health Check für alle 14 Functions
 * - Response Time Monitoring
 * - Error Rate Tracking
 * - Last Check Timestamp
 * - Auto-refresh alle 60 Sekunden
 * - Manual Check Button
 * - Color-coded Status Cards
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Activity,
  Clock,
  Zap,
  Database,
  ChevronDown,
  ChevronUp
} from '../../components/icons/BrowoKoIcons';
import { toast } from 'sonner@2.0.3';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface HealthCheckLog {
  timestamp: Date;
  status: 'healthy' | 'error';
  responseTime: number;
  requestUrl: string;
  responseStatus: number;
  responseBody?: string;
  errorMessage?: string;
}

interface EdgeFunctionStatus {
  name: string;
  displayName: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  responseTime: number | null;
  lastCheck: Date | null;
  errorMessage?: string;
  routes?: number;
  routesList?: string[];
  logs: HealthCheckLog[];
}

const EDGE_FUNCTIONS: Omit<EdgeFunctionStatus, 'status' | 'responseTime' | 'lastCheck' | 'logs'>[] = [
  { 
    name: 'BrowoKoordinator-Dokumente', 
    displayName: 'Dokumente', 
    routes: 10,
    routesList: [
      'GET /health',
      'GET /health-auth',
      'GET /documents',
      'GET /documents/:id',
      'POST /documents',
      'PUT /documents/:id',
      'DELETE /documents/:id',
      'GET /categories',
      'GET /stats',
      'GET /download/:id',
    ]
  },
  { 
    name: 'BrowoKoordinator-Zeiterfassung', 
    displayName: 'Zeiterfassung', 
    routes: 15,
    routesList: [
      'GET /health',
      'GET /health-auth',
      'GET /sessions',
      'GET /sessions/:id',
      'POST /sessions/clock-in',
      'POST /sessions/clock-out',
      'GET /sessions/active',
      'GET /stats',
      'GET /stats/monthly',
      'GET /stats/weekly',
      'POST /sessions/break-start',
      'POST /sessions/break-end',
      'GET /approval-queue',
      'POST /sessions/:id/approve',
      'POST /sessions/:id/reject',
    ]
  },
  { name: 'BrowoKoordinator-Antragmanager', displayName: 'Antragmanager', routes: 20 },
  { name: 'BrowoKoordinator-Lernen', displayName: 'Lernen', routes: 18 },
  { name: 'BrowoKoordinator-Benefits', displayName: 'Benefits', routes: 25 },
  { name: 'BrowoKoordinator-Personalakte', displayName: 'Personalakte', routes: 22 },
  { name: 'BrowoKoordinator-Chat', displayName: 'Chat', routes: 14 },
  { name: 'BrowoKoordinator-Kalender', displayName: 'Kalender', routes: 10 },
  { name: 'BrowoKoordinator-Organigram', displayName: 'Organigram', routes: 16 },
  { name: 'BrowoKoordinator-Field', displayName: 'Field', routes: 8 },
  { name: 'BrowoKoordinator-Analytics', displayName: 'Analytics', routes: 12 },
  { name: 'BrowoKoordinator-Notification', displayName: 'Notification', routes: 9 },
  { name: 'BrowoKoordinator-Tasks', displayName: 'Tasks', routes: 5 },
  { name: 'BrowoKoordinator-Automation', displayName: 'Automation', routes: 6 },
];

export default function SystemHealthScreen() {
  const [functions, setFunctions] = useState<EdgeFunctionStatus[]>(
    EDGE_FUNCTIONS.map(fn => ({
      ...fn,
      status: 'checking' as const,
      responseTime: null,
      lastCheck: null,
      logs: [],
    }))
  );
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [lastGlobalCheck, setLastGlobalCheck] = useState<Date | null>(null);

  // Health Check für eine einzelne Function
  const checkFunctionHealth = useCallback(async (functionName: string): Promise<Partial<EdgeFunctionStatus>> => {
    const startTime = Date.now();
    const url = `${supabaseUrl}/functions/v1/${functionName}/health`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const responseTime = Date.now() - startTime;
      const timestamp = new Date();

      // Try to parse response body
      let responseBody = '';
      try {
        const text = await response.text();
        responseBody = text;
      } catch {
        responseBody = 'Could not read response body';
      }

      if (response.ok) {
        const log: HealthCheckLog = {
          timestamp,
          status: 'healthy',
          responseTime,
          requestUrl: url,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 500), // Limit to 500 chars
        };

        return {
          status: 'healthy',
          responseTime,
          lastCheck: timestamp,
          errorMessage: undefined,
          logs: [log], // Will be merged with existing logs
        };
      } else {
        const log: HealthCheckLog = {
          timestamp,
          status: 'error',
          responseTime,
          requestUrl: url,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 500),
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        };

        return {
          status: 'error',
          responseTime,
          lastCheck: timestamp,
          errorMessage: `HTTP ${response.status}: ${response.statusText}`,
          logs: [log],
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const timestamp = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Network Error';

      const log: HealthCheckLog = {
        timestamp,
        status: 'error',
        responseTime,
        requestUrl: url,
        responseStatus: 0,
        errorMessage,
      };

      return {
        status: 'error',
        responseTime,
        lastCheck: timestamp,
        errorMessage,
        logs: [log],
      };
    }
  }, []);

  // Einzelne Function checken
  const handleCheckOne = useCallback(async (functionName: string) => {
    setFunctions(prev => prev.map(fn => 
      fn.name === functionName 
        ? { ...fn, status: 'checking' as const }
        : fn
    ));

    const result = await checkFunctionHealth(functionName);

    setFunctions(prev => prev.map(fn => {
      if (fn.name === functionName) {
        // Merge new logs with existing logs (keep last 10)
        const newLogs = [...(result.logs || []), ...fn.logs].slice(0, 10);
        return { ...fn, ...result, logs: newLogs };
      }
      return fn;
    }));
  }, [checkFunctionHealth]);

  // Alle Functions checken
  const handleCheckAll = useCallback(async () => {
    setIsCheckingAll(true);
    setFunctions(prev => prev.map(fn => ({ ...fn, status: 'checking' as const })));

    const results = await Promise.all(
      EDGE_FUNCTIONS.map(async (fn) => {
        const result = await checkFunctionHealth(fn.name);
        return { name: fn.name, ...result };
      })
    );

    setFunctions(prev => prev.map(fn => {
      const result = results.find(r => r.name === fn.name);
      if (result) {
        // Merge new logs with existing logs (keep last 10)
        const newLogs = [...(result.logs || []), ...fn.logs].slice(0, 10);
        return { ...fn, ...result, logs: newLogs };
      }
      return fn;
    }));

    setLastGlobalCheck(new Date());
    setIsCheckingAll(false);

    // Toast mit Zusammenfassung
    const healthy = results.filter(r => r.status === 'healthy').length;
    const total = results.length;
    
    if (healthy === total) {
      toast.success(`✅ Alle ${total} Functions sind gesund!`);
    } else {
      toast.warning(`⚠️ ${healthy}/${total} Functions sind gesund`);
    }
  }, [checkFunctionHealth]);

  // Auto-refresh alle 60 Sekunden
  useEffect(() => {
    // Initial check
    handleCheckAll();

    // Auto-refresh
    const interval = setInterval(() => {
      handleCheckAll();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [handleCheckAll]);

  // Status Badge Component
  const StatusBadge = ({ status }: { status: EdgeFunctionStatus['status'] }) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case 'checking':
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
    }
  };

  // Stats
  const healthyCount = functions.filter(fn => fn.status === 'healthy').length;
  const errorCount = functions.filter(fn => fn.status === 'error').length;
  const avgResponseTime = functions
    .filter(fn => fn.responseTime !== null)
    .reduce((acc, fn) => acc + (fn.responseTime || 0), 0) / functions.filter(fn => fn.responseTime !== null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Health Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Überwachung aller 14 Edge Functions
            {lastGlobalCheck && (
              <span className="ml-2">
                • Letzte Prüfung {formatDistanceToNow(lastGlobalCheck, { addSuffix: true, locale: de })}
              </span>
            )}
          </p>
        </div>

        <Button 
          onClick={handleCheckAll}
          disabled={isCheckingAll}
          className="w-full md:w-auto"
        >
          {isCheckingAll ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Prüfe alle...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Alle prüfen
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Total Functions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{functions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Healthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{healthyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isNaN(avgResponseTime) ? '--' : Math.round(avgResponseTime)}
              <span className="text-lg font-normal text-gray-500 ml-1">ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Functions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {functions.map((fn) => (
          <Card 
            key={fn.name}
            className={`transition-all ${
              fn.status === 'error' 
                ? 'border-red-200 bg-red-50' 
                : fn.status === 'healthy'
                ? 'border-green-200 bg-green-50'
                : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{fn.displayName}</CardTitle>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{fn.name}</p>
                </div>
                <StatusBadge status={fn.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Response Time */}
              {fn.responseTime !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Response Time
                  </span>
                  <span className={`font-semibold ${
                    fn.responseTime < 500 ? 'text-green-600' :
                    fn.responseTime < 1000 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {fn.responseTime}ms
                  </span>
                </div>
              )}

              {/* Routes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">API Routes</span>
                  <span className="font-semibold">{fn.routes || '--'}</span>
                </div>
                
                {/* Routes List (if available) */}
                {fn.routesList && fn.routesList.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-7 text-xs"
                      >
                        <span>Routes anzeigen ({fn.routesList.length})</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
                        {fn.routesList.map((route, idx) => (
                          <div 
                            key={idx}
                            className="text-xs font-mono text-gray-700 flex items-center gap-2"
                          >
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              route.startsWith('GET') ? 'bg-blue-100 text-blue-700' :
                              route.startsWith('POST') ? 'bg-green-100 text-green-700' :
                              route.startsWith('PUT') ? 'bg-yellow-100 text-yellow-700' :
                              route.startsWith('DELETE') ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {route.split(' ')[0]}
                            </span>
                            <span className="text-gray-600">{route.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Last Check */}
              {fn.lastCheck && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last Check
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(fn.lastCheck, { addSuffix: true, locale: de })}
                  </span>
                </div>
              )}

              {/* Error Message */}
              {fn.errorMessage && (
                <div className="bg-red-100 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-700 font-mono break-all">
                    {fn.errorMessage}
                  </p>
                </div>
              )}

              {/* Logs Section */}
              {fn.logs.length > 0 && (
                <Collapsible
                  open={expandedLogs[fn.name]}
                  onOpenChange={(isOpen) => 
                    setExpandedLogs(prev => ({ ...prev, [fn.name]: isOpen }))
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                    >
                      <span className="text-xs">
                        {expandedLogs[fn.name] ? 'Hide Logs' : `Show Logs (${fn.logs.length})`}
                      </span>
                      {expandedLogs[fn.name] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2 space-y-2">
                    {fn.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-2 text-xs ${
                          log.status === 'healthy'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        {/* Timestamp */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-700">
                            {format(log.timestamp, 'dd.MM.yyyy HH:mm:ss')}
                          </span>
                          <Badge
                            variant={log.status === 'healthy' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {log.status === 'healthy' ? '✓ OK' : '✗ Error'}
                          </Badge>
                        </div>

                        {/* Response Time */}
                        <div className="text-gray-600 mb-1">
                          <span className="font-mono">{log.responseTime}ms</span>
                        </div>

                        {/* Request URL */}
                        <div className="bg-white/50 rounded p-1 mb-1 break-all font-mono text-[10px]">
                          <span className="text-gray-500">URL:</span> {log.requestUrl}
                        </div>

                        {/* Response Status */}
                        <div className="text-gray-600 mb-1">
                          <span className="font-semibold">Status:</span>{' '}
                          <span className={`font-mono ${
                            log.responseStatus >= 200 && log.responseStatus < 300
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {log.responseStatus || 'N/A'}
                          </span>
                        </div>

                        {/* Response Body */}
                        {log.responseBody && (
                          <div className="bg-white/50 rounded p-1 mb-1">
                            <span className="text-gray-500 font-semibold">Response:</span>
                            <pre className="text-[10px] font-mono mt-1 whitespace-pre-wrap break-all">
                              {log.responseBody}
                            </pre>
                          </div>
                        )}

                        {/* Error Message */}
                        {log.errorMessage && (
                          <div className="text-red-600 font-mono text-[10px] break-all">
                            <span className="font-semibold">Error:</span> {log.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Check Button */}
              <Button 
                onClick={() => handleCheckOne(fn.name)}
                disabled={fn.status === 'checking'}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {fn.status === 'checking' ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Check Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Auto-Refresh aktiviert</h3>
              <p className="text-sm text-blue-700">
                Alle Edge Functions werden automatisch alle 60 Sekunden geprüft. 
                Du kannst auch manuell einzelne Functions oder alle gleichzeitig prüfen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}