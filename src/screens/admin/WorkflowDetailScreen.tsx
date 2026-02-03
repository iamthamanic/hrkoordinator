/**
 * Workflow Detail Screen mit Tabs (n8n-Style)
 * - Tab "Editor": Workflow bearbeiten
 * - Tab "Executions": Execution-Verlauf für diesen Workflow
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Save, ArrowLeft, CheckCircle2, XCircle, Clock, FileText, Edit3, Play, AlertCircle, CheckCheck, Key } from '../../components/icons/BrowoKoIcons';
import { Workflow as WorkflowIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import { supabaseUrl } from '../../utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHelpers';

// Custom Nodes
import TriggerNode from '../../components/workflows/nodes/TriggerNode';
import ActionNode from '../../components/workflows/nodes/ActionNode';
import { HttpRequestNode } from '../../components/workflows/nodes/HttpRequestNode';
import NodeConfigPanel from '../../components/workflows/NodeConfigPanel';



const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  httpRequest: HttpRequestNode,
};

const INITIAL_NODES: Node[] = [
  {
    id: 'start',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Workflow Start', triggerType: 'MANUAL' },
  },
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

let id = 1;
const getId = () => `dndnode_${id++}`;

const DraggableItem = ({ type, actionType, label, icon, category }: any) => {
  const onDragStart = (event: React.DragEvent, nodeType: string, actionType: string, category?: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/actionType', actionType);
    event.dataTransfer.setData('application/label', label);
    if (category) {
      event.dataTransfer.setData('application/category', category);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md hover:border-blue-400 transition-all"
      onDragStart={(event) => onDragStart(event, type, actionType, category)}
      draggable
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
    </div>
  );
};

const WorkflowDetailScreen = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState('Neuer Workflow');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSearch, setActionSearch] = useState('');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // ========== SIDEBAR TAB STATE ==========
  const [sidebarTab, setSidebarTab] = useState<'actions' | 'triggers'>('actions');
  
  // Determine active tab from URL query params
  const defaultTab = searchParams.get('tab') || 'editor';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // ==================== DELETE NODES & EDGES ====================
  // Delete selected nodes/edges with DELETE or BACKSPACE key
  const onNodesDelete = useCallback((deleted: Node[]) => {
    console.log('Nodes deleted:', deleted);
  }, []);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    console.log('Edges deleted:', deleted);
  }, []);

  // Keyboard handler for Delete/Backspace
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete if user is typing in an input field
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          return;
        }
        
        // Delete selected nodes and edges
        setNodes((nds) => nds.filter((node) => !node.selected));
        setEdges((eds) => eds.filter((edge) => !edge.selected));
        setSelectedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setNodes, setEdges]);

  // Action Library
  const actionLibrary = [
    { type: "action", actionType: "SEND_EMAIL", label: "Email senden", icon: "✉️", tags: ["email", "nachricht", "senden", "benachrichtigung"] },
    { type: "action", actionType: "ASSIGN_DOCUMENT", label: "Dokument zuweisen", icon: "📄", tags: ["dokument", "datei", "zuweisen", "upload"] },
    { type: "action", actionType: "ASSIGN_TEST", label: "Test zuweisen", icon: "🎓", tags: ["test", "prüfung", "quiz", "lernen"] },
    { type: "action", actionType: "ASSIGN_VIDEO", label: "Video zuweisen", icon: "🎥", tags: ["video", "schulung", "training", "lernen"] },
    { type: "action", actionType: "CREATE_TASK", label: "Aufgabe erstellen", icon: "✅", tags: ["aufgabe", "task", "todo", "erstellen"] },
    { type: "action", actionType: "ASSIGN_EQUIPMENT", label: "Equipment zuweisen", icon: "💻", tags: ["equipment", "hardware", "laptop", "monitor", "zuweisen"] },
    { type: "action", actionType: "ASSIGN_BENEFITS", label: "Benefits zuweisen", icon: "🎁", tags: ["benefit", "vorteil", "zuweisen", "vergütung"] },
    { type: "action", actionType: "DISTRIBUTE_COINS", label: "Coins verteilen", icon: "🪙", tags: ["coins", "punkte", "belohnung", "gamification"] },
    { type: "action", actionType: "DELAY", label: "Warten (Delay)", icon: "⏱️", tags: ["warten", "delay", "pause", "zeit"] },
    { type: "httpRequest", actionType: "HTTP_REQUEST", label: "HTTP Request", icon: "🌐", tags: ["http", "api", "webhook", "request", "n8n", "integration", "extern"] },
    { type: "action", actionType: "CREATE_NOTIFICATION", label: "Benachrichtigung senden", icon: "🔔", tags: ["notification", "benachrichtigung", "alarm", "push"] },
    { type: "action", actionType: "ADD_TO_TEAM", label: "Zu Team hinzufügen", icon: "👥", tags: ["team", "gruppe", "hinzufügen", "mitglied"] },
    { type: "action", actionType: "ASSIGN_TRAINING", label: "Schulung zuweisen", icon: "📚", tags: ["schulung", "training", "kurs", "weiterbildung"] },
    { type: "action", actionType: "APPROVE_REQUEST", label: "Antrag genehmigen", icon: "👍", tags: ["genehmigen", "approve", "antrag", "request"] },
  ];

  // Filter actions based on search
  const filteredActions = actionLibrary.filter(action => {
    if (!actionSearch) return true;
    const searchLower = actionSearch.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchLower) ||
      action.tags.some(tag => tag.includes(searchLower))
    );
  });

  // Fetch workflow and executions on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!workflowId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch workflow definition
        const headers = await getAuthHeaders();
        const workflowResponse = await fetch(
          `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows/${workflowId}`,
          { headers }
        );

        if (workflowResponse.ok) {
          const { workflow } = await workflowResponse.json();
          if (workflow) {
            setWorkflowName(workflow.name || 'Unbenannter Workflow');
            if (workflow.nodes) setNodes(workflow.nodes);
            if (workflow.edges) setEdges(workflow.edges);
          }
        }

        // Fetch executions for this workflow
        const executionsResponse = await fetch(
          `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/executions`,
          { headers }
        );

        if (executionsResponse.ok) {
          const { executions: allExecutions } = await executionsResponse.json();
          // Filter executions for this specific workflow
          const filteredExecutions = allExecutions.filter((e: WorkflowExecution) => e.workflowId === workflowId);
          setExecutions(filteredExecutions);
        }
      } catch (error) {
        console.error('Failed to fetch workflow data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workflowId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const actionType = event.dataTransfer.getData('application/actionType');
      const label = event.dataTransfer.getData('application/label');
      const category = event.dataTransfer.getData('application/category');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: type === 'trigger' ? {
          label: label || 'Neue Aktion',
          triggerType: actionType,
          triggerLabel: label,
          category: category || 'Manual',
          config: {},
        } : { 
          label: label || 'Neue Aktion',
          actionType: actionType,
          type: actionType,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    // Open config panel for action and trigger nodes
    if (node.type === 'action' || node.type === 'trigger' || node.type === 'httpRequest') {
      setShowConfigPanel(true);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowConfigPanel(false);
  }, []);

  const updateNodeLabel = (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: evt.target.value,
            },
          };
        }
        return node;
      })
    );
  };

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: config,
            },
          };
        }
        return node;
      })
    );
    toast.success('Konfiguration gespeichert!');
  }, [setNodes]);

  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];
    
    // Check if workflow has at least one action node
    const actionNodes = nodes.filter(n => n.type === 'action');
    if (actionNodes.length === 0) {
      errors.push('Workflow muss mindestens eine Action-Node haben');
    }

    // Check if all action nodes are configured
    const unconfiguredNodes = actionNodes.filter(n => !n.data.config || Object.keys(n.data.config).length === 0);
    if (unconfiguredNodes.length > 0) {
      errors.push(`${unconfiguredNodes.length} Node(s) sind nicht konfiguriert: ${unconfiguredNodes.map(n => n.data.label || 'Unbenannt').join(', ')}`);
    }

    // Check if nodes are connected
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const disconnectedNodes = nodes.filter(n => n.type === 'action' && !connectedNodeIds.has(n.id));
    if (disconnectedNodes.length > 0) {
      errors.push(`${disconnectedNodes.length} Node(s) sind nicht verbunden`);
    }

    setValidationErrors(errors);

    if (errors.length === 0) {
      toast.success('✅ Workflow ist valide!', { duration: 3000 });
      return true;
    } else {
      toast.error(`❌ ${errors.length} Validierungsfehler gefunden`, { duration: 5000 });
      return false;
    }
  }, [nodes, edges]);

  const handleSave = async () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      const idToSave = workflowId || `wf_${Date.now()}`;
      
      const workflowData = {
        id: idToSave,
        name: workflowName,
        nodes: flow.nodes,
        edges: flow.edges,
        updated_at: new Date().toISOString(),
        is_active: true,
        trigger_type: 'MANUAL', // Will be determined from the trigger node
      };

      const toastId = toast.loading('Speichere Workflow...');

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows`, {
          method: 'POST',
          headers,
          body: JSON.stringify(workflowData)
        });

        if (!response.ok) throw new Error('Save failed');

        toast.success('Workflow erfolgreich gespeichert!', { id: toastId });
      } catch (error) {
        console.error(error);
        toast.error('Fehler beim Speichern', { id: toastId });
      }
    }
  };

  const handleExecute = async () => {
    if (!workflowId) return;

    // Validate workflow before execution
    const isValid = validateWorkflow();
    if (!isValid) {
      toast.error('Workflow kann nicht ausgeführt werden. Bitte behebe die Fehler.', { duration: 5000 });
      return;
    }

    const toastId = toast.loading('Führe Workflow aus...');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/workflows/${workflowId}/execute`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            context: {
              manual: true,
            }
          })
        }
      );

      if (!response.ok) throw new Error('Execution failed');

      const result = await response.json();
      toast.success('Workflow erfolgreich ausgeführt!', { id: toastId });
      
      // Switch to executions tab and refresh
      setActiveTab('executions');
      // Optionally refresh executions list here
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Ausführen', { id: toastId });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-white z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/workflows')}>
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div className="flex items-center gap-2">
             <Input 
               value={workflowName} 
               onChange={(e) => setWorkflowName(e.target.value)} 
               className="font-semibold text-lg border-none shadow-none hover:bg-gray-50 w-[300px]"
             />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'editor' && (
            <>
              <Button variant="outline" onClick={validateWorkflow}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Validieren
              </Button>
              <Button variant="outline" onClick={handleExecute}>
                <Play className="w-4 h-4 mr-2" />
                Test Run
              </Button>
              <Button onClick={handleSave} className="bg-blue-600">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-white px-6">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="editor">
              <Edit3 className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="executions">
              <FileText className="w-4 h-4 mr-2" />
              Executions ({executions.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Editor */}
        <TabsContent value="editor" className="flex-1 mt-0 flex overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar / Library */}
            <div className="w-64 border-r bg-gray-50 flex flex-col overflow-hidden">
              {/* Tabs: Aktionen | Trigger */}
              <div className="border-b bg-white">
                <div className="grid grid-cols-2">
                  <button
                    onClick={() => setSidebarTab('actions')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      sidebarTab === 'actions'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Aktionen
                  </button>
                  <button
                    onClick={() => setSidebarTab('triggers')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      sidebarTab === 'triggers'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Trigger
                  </button>
                </div>
              </div>
              
              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sidebarTab === 'actions' ? (
                  <>
                    {/* Search Input */}
                    <div>
                      <Input 
                        placeholder="Suche Aktionen..." 
                        value={actionSearch}
                        onChange={(e) => setActionSearch(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      {filteredActions.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">
                          Keine Aktionen gefunden
                        </div>
                      ) : (
                        filteredActions.map((action) => (
                          <DraggableItem 
                            key={action.actionType}
                            type={action.type}
                            actionType={action.actionType}
                            label={action.label}
                            icon={action.icon}
                          />
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Trigger Nodes */}
                    <div className="space-y-3">
                      <DraggableItem type="trigger" actionType="HR_TRIGGER" label="HR/Mitarbeiter" icon="👤" category="HR" />
                      <DraggableItem type="trigger" actionType="LEARNING_TRIGGER" label="Learning" icon="🎓" category="LEARNING" />
                      <DraggableItem type="trigger" actionType="GAMIFICATION_TRIGGER" label="Gamification" icon="🏆" category="GAMIFICATION" />
                      <DraggableItem type="trigger" actionType="SHOP_TRIGGER" label="Shop/Benefits" icon="🛒" category="SHOP" />
                      <DraggableItem type="trigger" actionType="TASKS_TRIGGER" label="Tasks" icon="✅" category="TASKS" />
                      <DraggableItem type="trigger" actionType="REQUESTS_TRIGGER" label="Anträge" icon="📄" category="REQUESTS" />
                      <DraggableItem type="trigger" actionType="TIME_TRIGGER" label="Zeitbasiert" icon="⏰" category="TIME" />
                      <DraggableItem type="trigger" actionType="MANUAL_TRIGGER" label="Manueller Start" icon="▶️" category="MANUAL" />
                    </div>
                  </>
                )}
              </div>
              
              {/* Help Cards */}
              <div className="p-4 space-y-3 border-t bg-white">
                <Card className="p-3 bg-blue-50 border-blue-100">
                  <div className="text-xs text-blue-800">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {sidebarTab === 'actions' 
                      ? 'Drag & Drop die Aktionen auf den Canvas.'
                      : 'Drag & Drop einen Trigger auf den Canvas.'}
                  </div>
                </Card>

                {sidebarTab === 'actions' && (
                  <Card className="p-3 bg-purple-50 border-purple-200">
                    <div className="text-xs">
                      <p className="font-medium text-purple-900 mb-2">🔐 Environment Variables</p>
                      <p className="text-purple-700 mb-2">
                        Verwalte API Keys und Secrets sicher für deine Workflows.
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-purple-700 hover:text-purple-900 hover:bg-purple-100 justify-start h-8 px-2"
                        onClick={() => window.open('/admin/workflows/env-vars', '_blank')}
                      >
                        <Key className="w-3 h-3 mr-2" />
                        Env Vars verwalten →
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative h-full" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[15, 15]}
                className="bg-gray-50"
              >
                <Controls />
                <Background gap={12} size={1} />
                
                {/* Validation Errors Panel */}
                {validationErrors.length > 0 && (
                  <Panel position="top-left">
                    <Card className="w-80 p-4 shadow-xl border-red-300 bg-red-50">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900 mb-2">Validierungsfehler</h3>
                          <ul className="space-y-1 text-sm text-red-800">
                            {validationErrors.map((error, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-red-600 shrink-0">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </Panel>
                )}
              </ReactFlow>
              
              {/* Node Configuration Panel */}
              {showConfigPanel && selectedNode && (
                <NodeConfigPanel 
                  node={selectedNode}
                  onClose={() => {
                    setShowConfigPanel(false);
                    setSelectedNode(null);
                  }}
                  onUpdateNode={updateNodeConfig}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Executions */}
        <TabsContent value="executions" className="flex-1 mt-0 overflow-hidden">
          <div className="h-full flex">
            {/* Executions List */}
            <div className="w-96 border-r bg-gray-50 overflow-y-auto">
              <div className="p-4 border-b bg-white">
                <h3 className="font-semibold text-gray-900">Execution History</h3>
                <p className="text-sm text-gray-600">{executions.length} Ausführungen</p>
              </div>
              
              {executions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Noch keine Executions</p>
                  <p className="text-sm mt-1">Führe den Workflow aus, um Logs zu sehen.</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {executions.map((exec) => (
                    <Card
                      key={exec.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        selectedExecution?.id === exec.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedExecution(exec)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            className={
                              exec.status === 'COMPLETED' 
                                ? 'bg-green-100 text-green-800' 
                                : exec.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-orange-100 text-orange-800'
                            }
                          >
                            {exec.status === 'COMPLETED' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Erfolgreich</>
                            ) : exec.status === 'FAILED' ? (
                              <><XCircle className="w-3 h-3 mr-1" /> Fehlgeschlagen</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1 animate-spin" /> Läuft</>
                            )}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {exec.id.split('_').pop()?.slice(0, 6)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{new Date(exec.startTime).toLocaleString('de-DE')}</p>
                        {exec.endTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            Dauer: {((new Date(exec.endTime).getTime() - new Date(exec.startTime).getTime()) / 1000).toFixed(1)}s
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Details */}
            <div className="flex-1 overflow-y-auto bg-white">
              {selectedExecution ? (
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">Execution Details</h2>
                      <Badge 
                        className={
                          selectedExecution.status === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedExecution.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }
                      >
                        {selectedExecution.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600">Start Time</p>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            {new Date(selectedExecution.startTime).toLocaleString('de-DE')}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600">End Time</p>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            {selectedExecution.endTime 
                              ? new Date(selectedExecution.endTime).toLocaleString('de-DE')
                              : '—'
                            }
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Logs */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Execution Logs</CardTitle>
                      <CardDescription>Schritt-für-Schritt Protokoll der Ausführung</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedExecution.logs.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Keine Logs verfügbar</p>
                      ) : (
                        <div className="space-y-2 font-mono text-sm">
                          {selectedExecution.logs.map((log, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded ${
                                log.includes('✅') || log.includes('🏁')
                                  ? 'bg-green-50 text-green-800'
                                  : log.includes('❌')
                                  ? 'bg-red-50 text-red-800'
                                  : log.includes('🚀')
                                  ? 'bg-blue-50 text-blue-800'
                                  : 'bg-gray-50 text-gray-800'
                              }`}
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Context Data */}
                  {Object.keys(selectedExecution.context).length > 0 && (
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle>Context Data</CardTitle>
                        <CardDescription>An den Workflow übergebene Daten</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                          {JSON.stringify(selectedExecution.context, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Wähle eine Execution aus der Liste</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Wrap with ReactFlowProvider
export default function WorkflowDetailScreenWrapper() {
  return (
    <ReactFlowProvider>
      <WorkflowDetailScreen />
    </ReactFlowProvider>
  );
}