/**
 * @file TriggerNode.tsx
 * @domain Workflows - Interactive Trigger Node
 * @description Zapier-style interactive trigger node with dropdowns, filters, and JSON mode
 * @version 2.0.0
 */

import { memo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Play, Clock, User, GraduationCap, ShoppingCart, CheckSquare, FileText, Users, Video, Award, Coins, Trophy, Gift, Code, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { supabaseUrl, publicAnonKey } from '../../../utils/supabase/info';

// ==================== TRIGGER TYPE DEFINITIONS ====================

const TRIGGER_CATEGORIES = {
  HR: {
    label: 'HR/Mitarbeiter',
    icon: User,
    color: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    events: [
      { value: 'EMPLOYEE_CREATED', label: 'Mitarbeiter angelegt' },
      { value: 'EMPLOYEE_UPDATED', label: 'Mitarbeiter aktualisiert' },
      { value: 'EMPLOYEE_DELETED', label: 'Mitarbeiter gelöscht' },
      { value: 'EMPLOYEE_ADDED_TO_TEAM', label: 'Zu Team hinzugefügt' },
      { value: 'EMPLOYEE_REMOVED_FROM_TEAM', label: 'Aus Team entfernt' },
    ],
    entityType: 'employees',
    entityLabel: 'Mitarbeiter',
  },
  LEARNING: {
    label: 'Learning',
    icon: GraduationCap,
    color: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-600', iconBg: 'bg-green-100' },
    events: [
      { value: 'LEARNING_VIDEO_STARTED', label: 'Video gestartet' },
      { value: 'LEARNING_VIDEO_COMPLETED', label: 'Video abgeschlossen' },
      { value: 'LEARNING_TEST_COMPLETED', label: 'Test abgeschlossen' },
      { value: 'LEARNING_QUIZ_COMPLETED', label: 'Quiz abgeschlossen' },
    ],
    entityType: 'videos',
    entityLabel: 'Videos',
  },
  GAMIFICATION: {
    label: 'Gamification',
    icon: Trophy,
    color: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    events: [
      { value: 'XP_THRESHOLD_REACHED', label: 'XP-Schwelle erreicht' },
      { value: 'LEVEL_UP', label: 'Level aufgestiegen' },
      { value: 'COINS_THRESHOLD_REACHED', label: 'Coin-Schwelle erreicht' },
      { value: 'ACHIEVEMENT_UNLOCKED', label: 'Achievement freigeschaltet' },
    ],
    entityType: null, // No specific entities
    entityLabel: null,
  },
  SHOP: {
    label: 'Shop/Benefits',
    icon: ShoppingCart,
    color: { bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-600', iconBg: 'bg-pink-100' },
    events: [
      { value: 'BENEFIT_PURCHASED', label: 'Benefit gekauft' },
      { value: 'BENEFIT_REDEEMED', label: 'Benefit eingelöst' },
    ],
    entityType: 'benefits',
    entityLabel: 'Benefits',
  },
  TASKS: {
    label: 'Tasks',
    icon: CheckSquare,
    color: { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-600', iconBg: 'bg-teal-100' },
    events: [
      { value: 'TASK_COMPLETED', label: 'Task abgeschlossen' },
      { value: 'TASK_OVERDUE', label: 'Task überfällig' },
    ],
    entityType: null,
    entityLabel: null,
  },
  REQUESTS: {
    label: 'Anträge',
    icon: FileText,
    color: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    events: [
      { value: 'REQUEST_APPROVED', label: 'Antrag genehmigt' },
      { value: 'REQUEST_REJECTED', label: 'Antrag abgelehnt' },
    ],
    entityType: null,
    entityLabel: null,
  },
  TIME: {
    label: 'Zeitbasiert',
    icon: Clock,
    color: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
    events: [
      { value: 'SCHEDULED_DATE', label: 'Bestimmtes Datum' },
      { value: 'SCHEDULED_CRON', label: 'Zeitplan (Cron)' },
      { value: 'REMINDER_CHECK', label: 'Periodischer Check' },
    ],
    entityType: null,
    entityLabel: null,
  },
  MANUAL: {
    label: 'Manual',
    icon: Play,
    color: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-600', iconBg: 'bg-gray-100' },
    events: [
      { value: 'MANUAL', label: 'Manueller Start' },
    ],
    entityType: null,
    entityLabel: null,
  },
};

// ==================== TRIGGER NODE COMPONENT ====================

export default memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { setNodes } = useReactFlow();
  const category = data.category || 'MANUAL';
  const config = TRIGGER_CATEGORIES[category] || TRIGGER_CATEGORIES.MANUAL;
  
  // State
  const [eventType, setEventType] = useState(data.eventType || config.events[0]?.value);
  const [filterMode, setFilterMode] = useState<'general' | 'specific'>(data.filterMode || 'general');
  const [selectedEntities, setSelectedEntities] = useState<string[]>(data.selectedEntities || []);
  const [isJSONMode, setIsJSONMode] = useState(data.isJSONMode || false);
  const [jsonConfig, setJsonConfig] = useState(data.jsonConfig || '{}');
  const [entities, setEntities] = useState<any[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  
  const Icon = config.icon;
  const color = config.color;
  
  // Load entities (lazy loading with preloading)
  useEffect(() => {
    if (config.entityType && filterMode === 'specific') {
      loadEntities();
    }
  }, [config.entityType, filterMode]);
  
  const loadEntities = async () => {
    if (!config.entityType) return;
    
    setLoadingEntities(true);
    try {
      let url = '';
      if (config.entityType === 'employees') {
        url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Personalakte/employees`;
      } else if (config.entityType === 'videos') {
        url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Learning/videos`;
      } else if (config.entityType === 'benefits') {
        url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Shop/benefits`;
      }
      
      if (url) {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          setEntities(result.employees || result.videos || result.benefits || []);
        }
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setLoadingEntities(false);
    }
  };
  
  // Update node data when state changes
  useEffect(() => {
    updateNodeData();
  }, [eventType, filterMode, selectedEntities, isJSONMode, jsonConfig]);
  
  const updateNodeData = () => {
    const eventLabel = config.events.find(e => e.value === eventType)?.label || eventType;
    let displayLabel = `${eventLabel}`;
    
    if (filterMode === 'specific' && selectedEntities.length > 0) {
      const entityNames = entities
        .filter(e => selectedEntities.includes(e.id))
        .map(e => e.full_name || e.name || e.email)
        .join(', ');
      displayLabel += ` → ${entityNames}`;
    } else if (filterMode === 'general') {
      displayLabel += ' → Alle';
    }
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              eventType,
              filterMode,
              selectedEntities,
              isJSONMode,
              jsonConfig,
              displayLabel,
            },
          };
        }
        return node;
      })
    );
  };
  
  const toggleEntitySelection = (entityId: string) => {
    setSelectedEntities(prev => 
      prev.includes(entityId) 
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };
  
  const handleDelete = () => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  };
  
  return (
    <div className={`shadow-lg rounded-md bg-white border-2 ${selected ? color.border : 'border-gray-300'} w-[320px] transition-all group relative`}>
      {/* Header */}
      <div className={`${color.bg} p-3 rounded-t-md border-b ${color.border.replace('border-', 'border-b-')} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${color.iconBg} flex items-center justify-center ${color.text}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">{config.label}</div>
            <div className={`text-xs ${color.text} uppercase tracking-wide`}>Trigger</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsJSONMode(!isJSONMode)}
            className={`p-1.5 rounded hover:bg-white/50 transition-colors ${isJSONMode ? 'bg-white' : ''}`}
            title={isJSONMode ? 'UI Mode' : 'JSON Mode'}
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded bg-red-100 hover:bg-red-200 transition-colors text-red-600"
            title="Node entfernen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-3">
        {isJSONMode ? (
          // JSON Mode
          <div>
            <Label className="text-xs text-gray-600 mb-1 block">JSON Configuration</Label>
            <Textarea
              value={jsonConfig}
              onChange={(e) => setJsonConfig(e.target.value)}
              placeholder='{"event": "EMPLOYEE_CREATED", "filters": {...}}'
              rows={6}
              className="text-xs font-mono"
            />
          </div>
        ) : (
          // UI Mode
          <>
            {/* Event Type Dropdown */}
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Wenn:</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.events.map(event => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Filter Mode: General / Specific */}
            {config.entityType && (
              <>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filterMode === 'general'}
                      onChange={() => setFilterMode('general')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">General</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filterMode === 'specific'}
                      onChange={() => setFilterMode('specific')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Spezifisch</span>
                  </label>
                </div>
                
                {/* Entity Multi-Select (if specific) */}
                {filterMode === 'specific' && (
                  <div className="border rounded p-2 max-h-40 overflow-y-auto bg-gray-50">
                    {loadingEntities ? (
                      <div className="text-xs text-gray-500 text-center py-2">Lädt...</div>
                    ) : entities.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center py-2">
                        Keine {config.entityLabel} verfügbar
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {entities.map(entity => (
                          <label
                            key={entity.id}
                            className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEntities.includes(entity.id)}
                              onChange={() => toggleEntitySelection(entity.id)}
                              className="w-4 h-4"
                            />
                            <span className="truncate">
                              {entity.full_name || entity.name || entity.email || entity.id}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Display Summary */}
            <div className={`text-xs ${color.text} font-medium p-2 ${color.bg} rounded border ${color.border}`}>
              {data.displayLabel || config.events[0]?.label}
            </div>
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 ${color.border.replace('border-', 'bg-')} border-2 border-white`}
      />
    </div>
  );
});