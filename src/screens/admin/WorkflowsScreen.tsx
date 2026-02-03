import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Play, Edit, Trash2, Copy, Filter, TrendingUp, Activity, CheckCircle2, XCircle, Clock, Zap, AlertCircle } from '../../components/icons/BrowoKoIcons';
import { Workflow as WorkflowIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner@2.0.3';
import { Workflow, WorkflowTriggerType } from '../../types/workflow';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getTriggerBadge, getTriggerLabel } from '../../utils/workflowHelpers';

// MOCK DATA
const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf_1',
    organization_id: 'org_1',
    name: 'Onboarding: Office Berlin',
    description: 'Standard Onboarding für neue Office Mitarbeiter in Berlin',
    is_active: true,
    trigger_type: 'ONBOARDING_START',
    trigger_config: { location_ids: ['loc_berlin'] },
    nodes: [],
    edges: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    created_by: 'user_hr_1'
  },
  {
    id: 'wf_2',
    organization_id: 'org_1',
    name: 'Offboarding: Standard',
    description: 'Checkliste für Austritte',
    is_active: true,
    trigger_type: 'OFFBOARDING_START',
    trigger_config: {},
    nodes: [],
    edges: [],
    created_at: '2024-02-01T09:00:00Z',
    updated_at: '2024-02-01T09:00:00Z',
    created_by: 'user_hr_1'
  },
  {
    id: 'wf_3',
    organization_id: 'org_1',
    name: 'Jubiläum: 5 Jahre',
    description: 'Automatischer Bonus und Glückwunsch-Email',
    is_active: false,
    trigger_type: 'TIME_BASED',
    trigger_config: { days_offset: 1825 }, // 5 years
    nodes: [],
    edges: [],
    created_at: '2024-03-10T11:20:00Z',
    updated_at: '2024-03-10T11:20:00Z',
    created_by: 'user_hr_1'
  }
];

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflow_name: string;
  status: 'COMPLETED' | 'FAILED' | 'RUNNING';
  startTime: string;
  endTime?: string;
  logs: string[];
  context: Record<string, any>;
}

// MOCK EXECUTIONS for statistics
const MOCK_EXECUTIONS: WorkflowExecution[] = [
  { id: 'exec_1', workflowId: 'wf_1', workflow_name: 'Onboarding: Office Berlin', status: 'COMPLETED', startTime: '2024-11-20T10:00:00Z', endTime: '2024-11-20T10:02:15Z', logs: [], context: {} },
  { id: 'exec_2', workflowId: 'wf_1', workflow_name: 'Onboarding: Office Berlin', status: 'COMPLETED', startTime: '2024-11-21T14:30:00Z', endTime: '2024-11-21T14:32:10Z', logs: [], context: {} },
  { id: 'exec_3', workflowId: 'wf_2', workflow_name: 'Offboarding: Standard', status: 'FAILED', startTime: '2024-11-22T09:15:00Z', endTime: '2024-11-22T09:15:45Z', logs: [], context: {} },
  { id: 'exec_4', workflowId: 'wf_1', workflow_name: 'Onboarding: Office Berlin', status: 'COMPLETED', startTime: '2024-11-23T11:00:00Z', endTime: '2024-11-23T11:01:50Z', logs: [], context: {} },
  { id: 'exec_5', workflowId: 'wf_2', workflow_name: 'Offboarding: Standard', status: 'COMPLETED', startTime: '2024-11-23T16:20:00Z', endTime: '2024-11-23T16:22:30Z', logs: [], context: {} },
];

export default function WorkflowsScreen() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | WorkflowTriggerType>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workflows');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Workflows
        const workflowsResponse = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        });
        
        if (workflowsResponse.ok) {
          const data = await workflowsResponse.json();
          if (data.workflows && Array.isArray(data.workflows)) {
             setWorkflows(data.workflows);
          } else {
             setWorkflows(MOCK_WORKFLOWS);
          }
        } else {
           setWorkflows(MOCK_WORKFLOWS); 
        }

        // Fetch Executions
        const executionsResponse = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/executions`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        });
        
        if (executionsResponse.ok) {
          const execData = await executionsResponse.json();
          if (execData.executions && Array.isArray(execData.executions)) {
             setExecutions(execData.executions);
          } else {
             setExecutions(MOCK_EXECUTIONS);
          }
        } else {
           setExecutions(MOCK_EXECUTIONS); 
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
        setWorkflows(MOCK_WORKFLOWS);
        setExecutions(MOCK_EXECUTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredWorkflows = workflows.filter(wf => {
    const matchesSearch = wf.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          wf.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || wf.trigger_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleCreateWorkflow = () => {
    const newId = `wf_${Date.now()}`;
    // In reality, we would call API to create draft
    navigate(`/admin/workflows/builder/${newId}?new=true`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Workflow wirklich löschen?')) {
      // Check if this is a mock workflow (has simple ID like wf_1, wf_2, etc.)
      const isMockWorkflow = /^wf_\d+$/.test(id);
      
      // Optimistic update
      setWorkflows(prev => prev.filter(w => w.id !== id));
      
      if (isMockWorkflow) {
        // Mock workflow - just update local state
        toast.success('Workflow gelöscht (Mock)');
        return;
      }
      
      // Real workflow - call API
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            }
        });
        
        if (response.ok) {
           toast.success('Workflow gelöscht');
        } else {
           const errorText = await response.text();
           console.error('❌ Workflow deletion failed:', response.status, errorText);
           toast.error(`Fehler beim Löschen: ${response.status}`);
           // Rollback optimistic update
           const fetchData = async () => {
             try {
               const workflowsResponse = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows`, {
                 headers: { 'Authorization': `Bearer ${publicAnonKey}` }
               });
               if (workflowsResponse.ok) {
                 const data = await workflowsResponse.json();
                 if (data.workflows && Array.isArray(data.workflows)) {
                   setWorkflows(data.workflows);
                 }
               }
             } catch (e) {
               console.error('Failed to refresh workflows', e);
             }
           };
           fetchData();
        }
      } catch (e) {
         console.error('❌ Workflow deletion error:', e);
         toast.error('Netzwerkfehler beim Löschen');
         // Rollback optimistic update
         const fetchData = async () => {
           try {
             const workflowsResponse = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows`, {
               headers: { 'Authorization': `Bearer ${publicAnonKey}` }
             });
             if (workflowsResponse.ok) {
               const data = await workflowsResponse.json();
               if (data.workflows && Array.isArray(data.workflows)) {
                 setWorkflows(data.workflows);
               }
             }
           } catch (e) {
             console.error('Failed to refresh workflows', e);
           }
         };
         fetchData();
      }
    }
  };

  // Removed - now using getTriggerBadge from utils/workflowHelpers

  // Calculate Statistics
  const calculateStats = () => {
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'COMPLETED').length;
    const failedExecutions = executions.filter(e => e.status === 'FAILED').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(1) : '0';
    
    // Average execution time (in seconds)
    const avgTime = executions
      .filter(e => e.endTime)
      .reduce((acc, e) => {
        const duration = new Date(e.endTime!).getTime() - new Date(e.startTime).getTime();
        return acc + duration / 1000; // convert to seconds
      }, 0) / (executions.filter(e => e.endTime).length || 1);

    // Trigger type distribution
    const triggerDistribution = workflows.reduce((acc, wf) => {
      acc[wf.trigger_type] = (acc[wf.trigger_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Most triggered workflows
    const workflowExecutionCounts = executions.reduce((acc, exec) => {
      acc[exec.workflowId] = (acc[exec.workflowId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWorkflows = Object.entries(workflowExecutionCounts)
      .map(([id, count]) => ({
        id,
        name: workflows.find(w => w.id === id)?.name || 'Unknown',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Executions over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const executionsByDay = last7Days.map(day => ({
      date: day,
      success: executions.filter(e => 
        e.startTime.startsWith(day) && e.status === 'COMPLETED'
      ).length,
      failed: executions.filter(e => 
        e.startTime.startsWith(day) && e.status === 'FAILED'
      ).length,
    }));

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.is_active).length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: parseFloat(successRate),
      avgExecutionTime: avgTime.toFixed(1),
      triggerDistribution,
      topWorkflows,
      executionsByDay,
    };
  };

  const stats = calculateStats();

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-20 md:pt-6 pb-20 md:pb-8">
      <div className="container-responsive">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <WorkflowIcon className="w-6 h-6 text-blue-600" />
              Workflows
            </h1>
            <p className="text-gray-600">
              Automatisiere HR-Prozesse mit visuellen Workflows.
            </p>
          </div>
          <Button onClick={handleCreateWorkflow} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Neuer Workflow
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6">
            <TabsTrigger value="workflows">
              <WorkflowIcon className="w-4 h-4 mr-2" />
              Aktive Workflows
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Statistiken
            </TabsTrigger>
          </TabsList>

          {/* Tab: Aktive Workflows */}
          <TabsContent value="workflows" className="mt-0">
            {/* Filter & Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Suche Workflows..." 
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Typ filtern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Alle Typen</SelectItem>
                        <SelectItem value="ONBOARDING_START">Onboarding</SelectItem>
                        <SelectItem value="OFFBOARDING_START">Offboarding</SelectItem>
                        <SelectItem value="TIME_BASED">Zeitbasiert</SelectItem>
                        <SelectItem value="MANUAL">Manuell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkflows.map(workflow => (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
                    {/* Status Stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${workflow.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    
                    <CardHeader className="pb-3 pl-5">
                      <div className="flex justify-between items-start">
                        {getTriggerBadge(workflow.trigger_type)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/workflows/builder/${workflow.id}`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info('Duplizieren (Mock)')}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplizieren
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(workflow.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-lg mt-2 line-clamp-1">{workflow.name}</CardTitle>
                      <CardDescription className="line-clamp-2 h-10">
                        {workflow.description || 'Keine Beschreibung'}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pl-5 pb-4 pt-0">
                      <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
                        <span>{workflow.nodes.length} Steps</span>
                        <span>{workflow.is_active ? 'Aktiv' : 'Entwurf'}</span>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full mt-4 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors"
                        onClick={() => navigate(`/admin/workflows/builder/${workflow.id}`)}
                      >
                        <WorkflowIcon className="w-4 h-4 mr-2" />
                        Workflow öffnen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Empty State */}
                {filteredWorkflows.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    Keine Workflows gefunden.
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab: Statistiken */}
          <TabsContent value="statistics" className="mt-0 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Gesamt Workflows</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalWorkflows}</p>
                      <p className="text-sm text-green-600 mt-1">{stats.activeWorkflows} aktiv</p>
                    </div>
                    <WorkflowIcon className="w-12 h-12 text-blue-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Gesamt Executions</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalExecutions}</p>
                      <p className="text-sm text-gray-600 mt-1">Alle Zeit</p>
                    </div>
                    <Activity className="w-12 h-12 text-purple-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.successRate}%</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">{stats.successfulExecutions} erfolgreich</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-12 h-12 text-green-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ø Execution Time</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgExecutionTime}s</p>
                      <div className="flex items-center gap-2 mt-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600">{stats.failedExecutions} fehlgeschlagen</span>
                      </div>
                    </div>
                    <Clock className="w-12 h-12 text-orange-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Executions Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Executions (Letzte 7 Tage)
                  </CardTitle>
                  <CardDescription>Erfolgreiche vs. fehlgeschlagene Workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.executionsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="success" fill="#10b981" name="Erfolgreich" />
                      <Bar dataKey="failed" fill="#ef4444" name="Fehlgeschlagen" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Trigger Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Trigger-Type Verteilung
                  </CardTitle>
                  <CardDescription>Wie werden Workflows getriggert?</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(stats.triggerDistribution).map(([key, value]) => ({
                          name: key,
                          value
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(stats.triggerDistribution).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Workflows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Am häufigsten ausgeführte Workflows
                </CardTitle>
                <CardDescription>Top 5 der meist genutzten Workflows</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topWorkflows.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Noch keine Executions vorhanden
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.topWorkflows.map((wf, index) => (
                      <div key={wf.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{wf.name}</p>
                            <p className="text-sm text-gray-600">{wf.count} Executions</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/admin/workflows/builder/${wf.id}?tab=executions`)}
                        >
                          Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Executions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Letzte Executions
                </CardTitle>
                <CardDescription>Die neuesten Workflow-Ausführungen</CardDescription>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Noch keine Executions vorhanden
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executions.slice(0, 10).map(exec => (
                      <div key={exec.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3">
                          {exec.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : exec.status === 'FAILED' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-orange-600 animate-spin" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{exec.workflow_name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(exec.startTime).toLocaleString('de-DE')}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={
                            exec.status === 'COMPLETED' 
                              ? 'bg-green-100 text-green-800' 
                              : exec.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }
                        >
                          {exec.status === 'COMPLETED' ? 'Erfolgreich' : exec.status === 'FAILED' ? 'Fehlgeschlagen' : 'Läuft'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}