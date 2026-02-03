/**
 * @file VehicleDetailScreen.tsx
 * @version 4.5.9
 * @description Vehicle detail view with tabs (Overview, Documents, Maintenance, Accidents, Equipment)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {  ArrowLeft, Truck, Calendar, Weight, FileText, Wrench, AlertTriangle, Image as ImageIcon, Package, Edit, X, Save, BarChart3, Plus, Trash2, Download, Upload } from '../../components/icons/BrowoKoIcons';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar as CalendarUI } from '../../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { EquipmentAddDialog, type EquipmentFormData } from '../../components/BrowoKo_EquipmentAddDialog';
import { VehicleDocumentUploadDialog } from '../../components/BrowoKo_VehicleDocumentUploadDialog';
import { VehicleMaintenanceDialog, type Maintenance } from '../../components/BrowoKo_VehicleMaintenanceDialog';
import { toast } from 'sonner@2.0.3';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';

interface Equipment {
  id: string;
  name: string;
  description: string;
  serial_number: string;
  purchase_date?: string;
  next_maintenance?: string;
  status: 'AKTIV' | 'WARTUNG' | 'DEFEKT';
  images: string[];
  created_at: string;
}

interface Vehicle {
  id: string;
  kennzeichen: string;
  modell: string;
  fahrzeugtyp: string;
  ladekapazitaet: number;
  dienst_start?: string;
  letzte_wartung?: string;
  images: string[];
  documents: { name: string; url: string }[];
  wartungen: { date: string; description: string; cost?: number }[];
  unfaelle: { date: string; description: string; damage?: string }[];
  equipment: Equipment[];
  created_at: string;
}

export default function VehicleDetailScreen() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  
  // Edit mode state
  const [isEditingVehicleData, setIsEditingVehicleData] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [editKennzeichen, setEditKennzeichen] = useState('');
  const [editModell, setEditModell] = useState('');
  const [editFahrzeugtyp, setEditFahrzeugtyp] = useState('');
  const [editLadekapazitaet, setEditLadekapazitaet] = useState('');
  const [editDienstStart, setEditDienstStart] = useState('');
  const [editLetzteWartung, setEditLetzteWartung] = useState('');
  
  // Statistics state
  const [statistics, setStatistics] = useState<any[]>([]);
  const [customColumns, setCustomColumns] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{statId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('currency');
  const [loadingStats, setLoadingStats] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const [hasInitializedStats, setHasInitializedStats] = useState(false);

  // Documents State
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Maintenance State
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [loadingMaintenances, setLoadingMaintenances] = useState(false);

  // Load vehicle data
  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);
  
  // Load statistics when tab changes to statistics
  useEffect(() => {
    if (activeTab === 'statistics' && vehicleId && !hasInitializedStats) {
      initializeStatistics();
      setHasInitializedStats(true);
    }
  }, [activeTab, vehicleId]);
  
  // Dokumente laden wenn Tab geöffnet wird
  useEffect(() => {
    if (activeTab === 'documents' && vehicleId) {
      loadDocuments();
    }
  }, [activeTab, vehicleId]);

  // Wartungen laden wenn Tab geöffnet wird
  useEffect(() => {
    if (activeTab === 'maintenance' && vehicleId) {
      loadMaintenances();
    }
  }, [activeTab, vehicleId]);
  
  // Reload statistics when month filter changes
  useEffect(() => {
    if (activeTab === 'statistics' && vehicleId && hasInitializedStats) {
      loadStatistics();
    }
  }, [selectedMonth]);

  const loadVehicle = () => {
    try {
      const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
      const found = vehicles.find((v: Vehicle) => v.id === vehicleId);
      
      if (found) {
        // Ensure equipment array exists
        if (!found.equipment) {
          found.equipment = [];
        }
        setVehicle(found);
      } else {
        toast.error('Fahrzeug nicht gefunden');
        navigate('/admin/field-management');
      }
    } catch (error) {
      console.error('Load vehicle error:', error);
      toast.error('Fehler beim Laden des Fahrzeugs');
    } finally {
      setLoading(false);
    }
  };

  // Documents laden
  const loadDocuments = async () => {
    if (!vehicleId) return;
    
    setLoadingDocs(true);
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/documents`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error: any) {
      console.error('Load documents error:', error);
      toast.error('Fehler beim Laden der Dokumente');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Maintenances laden
  const loadMaintenances = async () => {
    if (!vehicleId) return;
    
    setLoadingMaintenances(true);
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/maintenances`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load maintenances');
      }
      
      const data = await response.json();
      setMaintenances(data.maintenances || []);
    } catch (error: any) {
      console.error('Load maintenances error:', error);
      toast.error('Fehler beim Laden der Wartungen');
    } finally {
      setLoadingMaintenances(false);
    }
  };

  const handleAddEquipment = (data: EquipmentFormData) => {
    if (!vehicle) return;

    const newEquipment: Equipment = {
      id: `eq-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
    };

    const updatedVehicle = {
      ...vehicle,
      equipment: [...(vehicle.equipment || []), newEquipment]
    };

    // Update in state
    setVehicle(updatedVehicle);

    // Update in localStorage
    const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
    const index = vehicles.findIndex((v: Vehicle) => v.id === vehicleId);
    if (index !== -1) {
      vehicles[index] = updatedVehicle;
      localStorage.setItem('vehicles', JSON.stringify(vehicles));
    }

    setEquipmentDialogOpen(false);
    toast.success('Equipment erfolgreich hinzugefügt');
  };

  const handleEditVehicleData = () => {
    if (!vehicle) return;
    
    // Initialize form with current values
    setEditKennzeichen(vehicle.kennzeichen);
    setEditModell(vehicle.modell);
    setEditFahrzeugtyp(vehicle.fahrzeugtyp);
    setEditLadekapazitaet(vehicle.ladekapazitaet.toString());
    setEditDienstStart(vehicle.dienst_start || '');
    setEditLetzteWartung(vehicle.letzte_wartung || '');
    setIsEditingVehicleData(true);
  };

  const handleCancelEditVehicleData = () => {
    setIsEditingVehicleData(false);
  };

  const handleSaveVehicleData = () => {
    if (!vehicle) return;
    
    // Validation
    if (!editKennzeichen.trim() || !editModell.trim()) {
      toast.error('Kennzeichen und Modell sind Pflichtfelder');
      return;
    }

    const ladekapazitaet = parseInt(editLadekapazitaet);
    if (isNaN(ladekapazitaet) || ladekapazitaet <= 0) {
      toast.error('Ladekapazität muss eine positive Zahl sein');
      return;
    }

    setSaving(true);

    try {
      const updatedVehicle: Vehicle = {
        ...vehicle,
        kennzeichen: editKennzeichen,
        modell: editModell,
        fahrzeugtyp: editFahrzeugtyp,
        ladekapazitaet: ladekapazitaet,
        dienst_start: editDienstStart || undefined,
        letzte_wartung: editLetzteWartung || undefined,
      };

      // Update in state
      setVehicle(updatedVehicle);

      // Update in localStorage
      const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
      const index = vehicles.findIndex((v: Vehicle) => v.id === vehicleId);
      if (index !== -1) {
        vehicles[index] = updatedVehicle;
        localStorage.setItem('vehicles', JSON.stringify(vehicles));
      }

      setIsEditingVehicleData(false);
      toast.success('Fahrzeugdaten erfolgreich gespeichert');
    } catch (error: any) {
      console.error('Save vehicle data error:', error);
      toast.error('Fehler beim Speichern: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DOCUMENTS FUNCTIONS
  // ============================================
  
  const handleDeleteDocument = async (docId: string) => {
    if (!vehicleId || !confirm('Möchten Sie dieses Dokument wirklich löschen?')) return;
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/documents/${docId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      toast.success('Dokument gelöscht');
      loadDocuments();
    } catch (error: any) {
      console.error('Delete document error:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  // ============================================
  // MAINTENANCE FUNCTIONS
  // ============================================
  
  const handleDeleteMaintenance = async (maintId: string) => {
    if (!vehicleId || !confirm('Möchten Sie diese Wartung wirklich löschen?')) return;
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/maintenances/${maintId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete maintenance');
      }
      
      toast.success('Wartung gelöscht');
      loadMaintenances();
    } catch (error: any) {
      console.error('Delete maintenance error:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleEditMaintenance = (maintenance: any) => {
    setSelectedMaintenance(maintenance);
    setMaintenanceDialogOpen(true);
  };

  const handleAddMaintenance = () => {
    setSelectedMaintenance(null);
    setMaintenanceDialogOpen(true);
  };

  // ============================================
  // STATISTICS FUNCTIONS
  // ============================================
  
  const initializeStatistics = async () => {
    setLoadingStats(true);
    
    // Create default table with 12 months
    const currentDate = new Date();
    const defaultStats = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = format(date, 'yyyy-MM');
      defaultStats.push({
        id: `default-${month}`,
        month: month,
        verbrauchskosten: 0,
        wartungskosten: 0,
        sonstige_kosten: 0,
        custom_fields: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isDefault: true,
      });
    }
    
    setStatistics(defaultStats);
    
    // Try to load from API
    await loadStatistics();
    await loadCustomColumns();
  };
  
  const loadStatistics = async () => {
    if (!vehicleId) return;
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/statistics${selectedMonth ? `?month=${selectedMonth}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        console.warn('API not connected or error occurred');
        setApiConnected(false);
        setLoadingStats(false);
        return;
      }
      
      const data = await response.json();
      setApiConnected(true);
      
      // Merge API data with default months if exists
      if (data.statistics && data.statistics.length > 0) {
        setStatistics(data.statistics);
      }
    } catch (error: any) {
      console.error('Load statistics error:', error);
      setApiConnected(false);
    } finally {
      setLoadingStats(false);
    }
  };
  
  const loadCustomColumns = async () => {
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/statistics/columns`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        console.warn('Failed to load columns - API not connected');
        return;
      }
      
      const data = await response.json();
      setCustomColumns(data.columns || []);
    } catch (error: any) {
      console.error('Load columns error:', error);
    }
  };
  
  const handleAddStatistic = async () => {
    if (!vehicleId) return;
    
    if (!apiConnected) {
      toast.error('API nicht verbunden - Bitte stellen Sie sicher, dass BrowoKoordinator-Fahrzeuge deployed ist');
      return;
    }
    
    const currentMonth = format(new Date(), 'yyyy-MM');
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/statistics`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: currentMonth,
          verbrauchskosten: 0,
          wartungskosten: 0,
          sonstige_kosten: 0,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create statistic');
      }
      
      toast.success('Statistik-Eintrag erstellt');
      loadStatistics();
    } catch (error: any) {
      console.error('Add statistic error:', error);
      toast.error('Fehler beim Erstellen: ' + error.message);
      setApiConnected(false);
    }
  };
  
  const handleDeleteStatistic = async (statId: string) => {
    if (!vehicleId || !confirm('Möchten Sie diesen Eintrag wirklich löschen?')) return;
    
    if (!apiConnected) {
      toast.error('API nicht verbunden');
      return;
    }
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/statistics/${statId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete statistic');
      }
      
      toast.success('Eintrag gelöscht');
      loadStatistics();
    } catch (error: any) {
      console.error('Delete statistic error:', error);
      toast.error('Fehler beim Löschen: ' + error.message);
      setApiConnected(false);
    }
  };
  
  const handleCellEdit = (statId: string, field: string, currentValue: any) => {
    setEditingCell({ statId, field });
    setEditValue(currentValue?.toString() || '');
  };
  
  const handleCellSave = async () => {
    if (!editingCell || !vehicleId) return;
    
    const { statId, field } = editingCell;
    const stat = statistics.find(s => s.id === statId);
    if (!stat) return;
    
    // Update local state immediately for better UX
    const updatedStats = statistics.map(s => {
      if (s.id === statId) {
        if (['verbrauchskosten', 'wartungskosten', 'sonstige_kosten', 'month'].includes(field)) {
          return { ...s, [field]: field === 'month' ? editValue : parseFloat(editValue) || 0 };
        } else {
          return {
            ...s,
            custom_fields: {
              ...(s.custom_fields || {}),
              [field]: parseFloat(editValue) || 0,
            }
          };
        }
      }
      return s;
    });
    setStatistics(updatedStats);
    setEditingCell(null);
    setEditValue('');
    
    if (!apiConnected) {
      toast.warning('API nicht verbunden - Änderung nur lokal gespeichert');
      return;
    }
    
    try {
      let updateData: any = {};
      
      // Check if it's a custom field
      if (['verbrauchskosten', 'wartungskosten', 'sonstige_kosten', 'month'].includes(field)) {
        updateData[field] = field === 'month' ? editValue : parseFloat(editValue) || 0;
      } else {
        // Custom field
        updateData.custom_fields = {
          ...(stat.custom_fields || {}),
          [field]: parseFloat(editValue) || 0,
        };
      }
      
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/statistics/${statId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update statistic');
      }
      
      loadStatistics();
    } catch (error: any) {
      console.error('Cell save error:', error);
      toast.error('Fehler beim Speichern in API: ' + error.message);
      setApiConnected(false);
    }
  };
  
  const handleAddCustomColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error('Bitte geben Sie einen Spaltennamen ein');
      return;
    }
    
    if (!apiConnected) {
      toast.error('API nicht verbunden - Bitte stellen Sie sicher, dass BrowoKoordinator-Fahrzeuge deployed ist');
      return;
    }
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/statistics/columns`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newColumnName,
          type: newColumnType,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create column');
      }
      
      toast.success('Spalte hinzugefügt');
      setAddColumnDialogOpen(false);
      setNewColumnName('');
      setNewColumnType('currency');
      loadCustomColumns();
    } catch (error: any) {
      console.error('Add column error:', error);
      toast.error('Fehler beim Hinzufügen: ' + error.message);
      setApiConnected(false);
    }
  };
  
  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Möchten Sie diese Spalte wirklich löschen? Die Daten in dieser Spalte gehen verloren.')) return;
    
    if (!apiConnected) {
      toast.error('API nicht verbunden');
      return;
    }
    
    try {
      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/statistics/columns/${columnId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete column');
      }
      
      toast.success('Spalte gelöscht');
      loadCustomColumns();
      loadStatistics();
    } catch (error: any) {
      console.error('Delete column error:', error);
      toast.error('Fehler beim Löschen: ' + error.message);
      setApiConnected(false);
    }
  };
  
  const handleExportCSV = () => {
    if (statistics.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }
    
    // Prepare CSV headers
    const headers = ['Monat', 'Verbrauchskosten', 'Wartungskosten', 'Sonstige Kosten'];
    customColumns.forEach(col => headers.push(col.name));
    
    // Prepare CSV rows
    const rows = statistics.map(stat => {
      const row = [
        stat.month,
        stat.verbrauchskosten?.toFixed(2) || '0.00',
        stat.wartungskosten?.toFixed(2) || '0.00',
        stat.sonstige_kosten?.toFixed(2) || '0.00',
      ];
      
      customColumns.forEach(col => {
        const value = stat.custom_fields?.[col.name] || 0;
        row.push(value.toFixed(2));
      });
      
      return row;
    });
    
    // Add sum row
    const sumRow = ['SUMME'];
    const verbrauchSum = statistics.reduce((sum, s) => sum + (s.verbrauchskosten || 0), 0);
    const wartungSum = statistics.reduce((sum, s) => sum + (s.wartungskosten || 0), 0);
    const sonstigeSum = statistics.reduce((sum, s) => sum + (s.sonstige_kosten || 0), 0);
    
    sumRow.push(verbrauchSum.toFixed(2), wartungSum.toFixed(2), sonstigeSum.toFixed(2));
    
    customColumns.forEach(col => {
      const sum = statistics.reduce((sum, s) => sum + (s.custom_fields?.[col.name] || 0), 0);
      sumRow.push(sum.toFixed(2));
    });
    
    rows.push(sumRow);
    
    // Create CSV content
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fahrzeug_${vehicle?.kennzeichen}_statistiken_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV exportiert');
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Fahrzeug...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-20 md:pt-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/field-management')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                {vehicle.kennzeichen}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {vehicle.fahrzeugtyp}
                </Badge>
                <span className="text-sm text-gray-500">
                  Hinzugefügt: {new Date(vehicle.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs Navigation */}
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto mb-6">
            <TabsTrigger value="overview" className="tab-trigger-responsive">
              <Truck className="w-4 h-4" />
              <span>Übersicht</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="tab-trigger-responsive">
              <FileText className="w-4 h-4" />
              <span>Dokumente</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="tab-trigger-responsive">
              <Wrench className="w-4 h-4" />
              <span>Wartungen</span>
            </TabsTrigger>
            <TabsTrigger value="accidents" className="tab-trigger-responsive">
              <AlertTriangle className="w-4 h-4" />
              <span>Unfälle</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="tab-trigger-responsive">
              <Package className="w-4 h-4" />
              <span>Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="tab-trigger-responsive">
              <BarChart3 className="w-4 h-4" />
              <span>Statistiken</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Images Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Bilder ({vehicle.images.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {vehicle.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`${vehicle.kennzeichen} ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Vorschaubild
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Truck className="w-12 h-12 mx-auto mb-3" />
                    <p>Keine Bilder vorhanden</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fahrzeugdaten</CardTitle>
                  {!isEditingVehicleData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditVehicleData}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Bearbeiten
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingVehicleData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kennzeichen */}
                      <div className="space-y-2">
                        <Label htmlFor="kennzeichen">Kennzeichen *</Label>
                        <Input
                          id="kennzeichen"
                          value={editKennzeichen}
                          onChange={(e) => setEditKennzeichen(e.target.value)}
                          placeholder="B-AB 1234"
                        />
                      </div>

                      {/* Modell */}
                      <div className="space-y-2">
                        <Label htmlFor="modell">Modell *</Label>
                        <Input
                          id="modell"
                          value={editModell}
                          onChange={(e) => setEditModell(e.target.value)}
                          placeholder="Mercedes Sprinter"
                        />
                      </div>

                      {/* Fahrzeugtyp */}
                      <div className="space-y-2">
                        <Label htmlFor="fahrzeugtyp">Fahrzeugtyp</Label>
                        <Select
                          value={editFahrzeugtyp}
                          onValueChange={setEditFahrzeugtyp}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Bitte wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Transporter">Transporter</SelectItem>
                            <SelectItem value="LKW">LKW</SelectItem>
                            <SelectItem value="PKW">PKW</SelectItem>
                            <SelectItem value="Kleintransporter">Kleintransporter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ladekapazität */}
                      <div className="space-y-2">
                        <Label htmlFor="ladekapazitaet">Ladekapazität (kg)</Label>
                        <Input
                          id="ladekapazitaet"
                          type="number"
                          value={editLadekapazitaet}
                          onChange={(e) => setEditLadekapazitaet(e.target.value)}
                          placeholder="1500"
                        />
                      </div>

                      {/* Dienst Start */}
                      <div className="space-y-2">
                        <Label htmlFor="dienst_start">Dienst Start</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {editDienstStart
                                ? format(new Date(editDienstStart), 'dd.MM.yyyy', { locale: de })
                                : 'Datum wählen'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarUI
                              mode="single"
                              selected={editDienstStart ? new Date(editDienstStart) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setEditDienstStart(format(date, 'yyyy-MM-dd'));
                                }
                              }}
                              initialFocus
                              locale={de}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Letzte Wartung */}
                      <div className="space-y-2">
                        <Label htmlFor="letzte_wartung">Letzte Wartung</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {editLetzteWartung
                                ? format(new Date(editLetzteWartung), 'dd.MM.yyyy', { locale: de })
                                : 'Datum wählen'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarUI
                              mode="single"
                              selected={editLetzteWartung ? new Date(editLetzteWartung) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setEditLetzteWartung(format(date, 'yyyy-MM-dd'));
                                }
                              }}
                              initialFocus
                              locale={de}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={handleCancelEditVehicleData}
                        disabled={saving}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Abbrechen
                      </Button>
                      <Button onClick={handleSaveVehicleData} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Speichert...' : 'Speichern'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Kennzeichen</Label>
                      <div className="field-readonly-v2">
                        {vehicle.kennzeichen}
                      </div>
                    </div>

                    <div>
                      <Label>Modell</Label>
                      <div className="field-readonly-v2">
                        {vehicle.modell}
                      </div>
                    </div>

                    <div>
                      <Label>Fahrzeugtyp</Label>
                      <div className="field-readonly-v2">
                        {vehicle.fahrzeugtyp}
                      </div>
                    </div>

                    <div>
                      <Label>Ladekapazität</Label>
                      <div className="field-readonly-v2 flex items-center gap-2">
                        <Weight className="w-4 h-4 text-gray-400" />
                        {vehicle.ladekapazitaet.toLocaleString('de-DE')} kg
                      </div>
                    </div>

                    {vehicle.dienst_start && (
                      <div>
                        <Label>Dienst Start</Label>
                        <div className="field-readonly-v2 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(vehicle.dienst_start).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    )}

                    {vehicle.letzte_wartung && (
                      <div>
                        <Label>Letzte Wartung</Label>
                        <div className="field-readonly-v2 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(vehicle.letzte_wartung).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Documents */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Dokumente ({documents.length})</CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => setDocumentDialogOpen(true)}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Dokument hochladen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDocs ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Lade Dokumente...</p>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {doc.type}
                              </Badge>
                              <span>{new Date(doc.uploaded_at).toLocaleDateString('de-DE')}</span>
                              {doc.file_size && (
                                <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3" />
                    <p className="mb-4">Keine Dokumente vorhanden</p>
                    <Button 
                      size="sm"
                      onClick={() => setDocumentDialogOpen(true)}
                    >
                      Erstes Dokument hochladen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Maintenance */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Wartungshistorie ({maintenances.length})</CardTitle>
                  <Button 
                    size="sm"
                    onClick={handleAddMaintenance}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Wartung hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMaintenances ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Lade Wartungen...</p>
                  </div>
                ) : maintenances.length > 0 ? (
                  <div className="space-y-4">
                    {maintenances.map((wartung) => (
                      <div key={wartung.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {new Date(wartung.maintenance_date).toLocaleDateString('de-DE')}
                              </span>
                              <Badge 
                                variant="secondary"
                                className={
                                  wartung.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  wartung.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }
                              >
                                {wartung.status === 'completed' ? 'Abgeschlossen' :
                                 wartung.status === 'overdue' ? 'Überfällig' : 'Geplant'}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">{wartung.title}</h4>
                            {wartung.description && (
                              <p className="text-sm text-gray-600 mb-2">{wartung.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {wartung.cost && (
                              <Badge variant="secondary">
                                {wartung.cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </Badge>
                            )}
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEditMaintenance(wartung)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteMaintenance(wartung.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Wrench className="w-12 h-12 mx-auto mb-3" />
                    <p className="mb-4">Keine Wartungen erfasst</p>
                    <Button 
                      size="sm"
                      onClick={handleAddMaintenance}
                    >
                      Erste Wartung hinzufügen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Accidents */}
          <TabsContent value="accidents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Unfallhistorie ({vehicle.unfaelle.length})</CardTitle>
                  <Button size="sm">+ Unfall melden</Button>
                </div>
              </CardHeader>
              <CardContent>
                {vehicle.unfaelle.length > 0 ? (
                  <div className="space-y-4">
                    {vehicle.unfaelle.map((unfall, index) => (
                      <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-gray-900">
                              {new Date(unfall.date).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                          {unfall.damage && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              {unfall.damage}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{unfall.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p className="text-green-600 font-medium mb-1">Keine Unfälle! 🎉</p>
                    <p className="text-sm text-gray-500">Dieses Fahrzeug hat eine saubere Bilanz</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Equipment */}
          <TabsContent value="equipment" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Equipment ({vehicle.equipment?.length || 0})</CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => setEquipmentDialogOpen(true)}
                    className="gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Equipment hinzufügen
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {vehicle.equipment && vehicle.equipment.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.equipment.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        {/* Equipment Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                            {item.serial_number && (
                              <p className="text-xs text-gray-500">SN: {item.serial_number}</p>
                            )}
                          </div>
                          <Badge 
                            variant="secondary"
                            className={
                              item.status === 'AKTIV' 
                                ? 'bg-green-100 text-green-700'
                                : item.status === 'WARTUNG'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {item.status === 'AKTIV' && '✅ Aktiv'}
                            {item.status === 'WARTUNG' && '🔧 Wartung'}
                            {item.status === 'DEFEKT' && '❌ Defekt'}
                          </Badge>
                        </div>

                        {/* Equipment Images */}
                        {item.images.length > 0 && (
                          <div className="mb-3">
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-32 object-cover rounded-md"
                            />
                          </div>
                        )}

                        {/* Equipment Description */}
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        )}

                        {/* Equipment Dates */}
                        <div className="space-y-2 text-xs text-gray-500">
                          {item.purchase_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>Angeschafft: {new Date(item.purchase_date).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                          {item.next_maintenance && (
                            <div className="flex items-center gap-2">
                              <Wrench className="w-3 h-3" />
                              <span>Wartung: {new Date(item.next_maintenance).toLocaleDateString('de-DE')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3" />
                    <p className="mb-4">Noch kein Equipment erfasst</p>
                    <Button 
                      size="sm"
                      onClick={() => setEquipmentDialogOpen(true)}
                      className="gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Erstes Equipment hinzufügen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Statistics */}
          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Kostenstatistiken
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Month Filter */}
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-auto"
                      placeholder="Alle Monate"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMonth('')}
                    >
                      Filter zurücksetzen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportCSV}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      CSV Export
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddColumnDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Spalte
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddStatistic}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Eintrag
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* API Status Banner */}
                {!apiConnected && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 mb-1">API Disconnected</h4>
                        <p className="text-sm text-amber-800 mb-2">
                          Die BrowoKoordinator-Fahrzeuge Edge Function ist nicht erreichbar. 
                          Änderungen werden nur lokal gespeichert.
                        </p>
                        <p className="text-xs text-amber-700">
                          <strong>Lösung:</strong> Deployen Sie die Edge Function "BrowoKoordinator-Fahrzeuge" im Supabase Dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {loadingStats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : statistics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left p-3 bg-gray-50 font-semibold">Monat</th>
                          <th className="text-right p-3 bg-gray-50 font-semibold">Verbrauchskosten</th>
                          <th className="text-right p-3 bg-gray-50 font-semibold">Wartungskosten</th>
                          <th className="text-right p-3 bg-gray-50 font-semibold">Sonstige Kosten</th>
                          {customColumns.map(col => (
                            <th key={col.id} className="text-right p-3 bg-gray-50 font-semibold group relative">
                              <div className="flex items-center justify-end gap-2">
                                <span>{col.name}</span>
                                <button
                                  onClick={() => handleDeleteColumn(col.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Spalte löschen"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600 hover:text-red-700" />
                                </button>
                              </div>
                            </th>
                          ))}
                          <th className="text-center p-3 bg-gray-50 font-semibold w-20">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.map((stat, index) => (
                          <tr key={stat.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {/* Month */}
                            <td className="p-3 border-b border-gray-200">
                              {editingCell?.statId === stat.id && editingCell?.field === 'month' ? (
                                <Input
                                  type="month"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                  autoFocus
                                  className="w-40"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellEdit(stat.id, 'month', stat.month)}
                                  className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                >
                                  {stat.month}
                                </div>
                              )}
                            </td>
                            
                            {/* Verbrauchskosten */}
                            <td className="p-3 border-b border-gray-200 text-right">
                              {editingCell?.statId === stat.id && editingCell?.field === 'verbrauchskosten' ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                  autoFocus
                                  className="w-32 text-right"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellEdit(stat.id, 'verbrauchskosten', stat.verbrauchskosten)}
                                  className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                >
                                  {formatCurrency(stat.verbrauchskosten)}
                                </div>
                              )}
                            </td>
                            
                            {/* Wartungskosten */}
                            <td className="p-3 border-b border-gray-200 text-right">
                              {editingCell?.statId === stat.id && editingCell?.field === 'wartungskosten' ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                  autoFocus
                                  className="w-32 text-right"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellEdit(stat.id, 'wartungskosten', stat.wartungskosten)}
                                  className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                >
                                  {formatCurrency(stat.wartungskosten)}
                                </div>
                              )}
                            </td>
                            
                            {/* Sonstige Kosten */}
                            <td className="p-3 border-b border-gray-200 text-right">
                              {editingCell?.statId === stat.id && editingCell?.field === 'sonstige_kosten' ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                  autoFocus
                                  className="w-32 text-right"
                                />
                              ) : (
                                <div
                                  onClick={() => handleCellEdit(stat.id, 'sonstige_kosten', stat.sonstige_kosten)}
                                  className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                >
                                  {formatCurrency(stat.sonstige_kosten)}
                                </div>
                              )}
                            </td>
                            
                            {/* Custom Columns */}
                            {customColumns.map(col => {
                              const value = stat.custom_fields?.[col.name] || 0;
                              return (
                                <td key={col.id} className="p-3 border-b border-gray-200 text-right">
                                  {editingCell?.statId === stat.id && editingCell?.field === col.name ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleCellSave}
                                      onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                      autoFocus
                                      className="w-32 text-right"
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit(stat.id, col.name, value)}
                                      className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                    >
                                      {formatCurrency(value)}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            
                            {/* Actions */}
                            <td className="p-3 border-b border-gray-200 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteStatistic(stat.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        
                        {/* Sum Row */}
                        <tr className="bg-blue-50 border-t-2 border-blue-300 font-semibold">
                          <td className="p-3">SUMME</td>
                          <td className="p-3 text-right">
                            {formatCurrency(statistics.reduce((sum, s) => sum + (s.verbrauchskosten || 0), 0))}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(statistics.reduce((sum, s) => sum + (s.wartungskosten || 0), 0))}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(statistics.reduce((sum, s) => sum + (s.sonstige_kosten || 0), 0))}
                          </td>
                          {customColumns.map(col => {
                            const sum = statistics.reduce((sum, s) => sum + (s.custom_fields?.[col.name] || 0), 0);
                            return (
                              <td key={col.id} className="p-3 text-right">
                                {formatCurrency(sum)}
                              </td>
                            );
                          })}
                          <td className="p-3"></td>
                        </tr>
                      </tbody>
                    </table>
                    
                    {/* Info Text */}
                    <div className="mt-4 text-sm text-gray-500 space-y-2">
                      <p>💡 <strong>Inline-Bearbeitung:</strong> Klicken Sie auf eine Zelle, um den Wert zu bearbeiten</p>
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-blue-900 font-semibold mb-2">📊 n8n Integration API</p>
                        <p className="text-xs text-blue-800 mb-1">
                          <strong>Endpoint:</strong> POST /api/vehicles/{`{vehicleId}`}/statistics
                        </p>
                        <p className="text-xs text-blue-800 mb-2">
                          <strong>URL:</strong> {supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/{vehicleId}/statistics
                        </p>
                        <p className="font-mono text-xs bg-white p-2 rounded border border-blue-300">
                          {`{\n  "month": "2024-11",\n  "verbrauchskosten": 250.00,\n  "wartungskosten": 180.00,\n  "sonstige_kosten": 50.00\n}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3" />
                    <p className="mb-4">Noch keine Statistiken erfasst</p>
                    <Button 
                      size="sm"
                      onClick={handleAddStatistic}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ersten Eintrag erstellen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Equipment Dialog */}
      <EquipmentAddDialog
        open={equipmentDialogOpen}
        onClose={() => setEquipmentDialogOpen(false)}
        onSave={handleAddEquipment}
      />
      
      {/* Add Column Dialog */}
      <Dialog open={addColumnDialogOpen} onOpenChange={setAddColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Spalte hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine benutzerdefinierte Spalte für zusätzliche Kostenarten.
              Diese Spalte wird für alle Fahrzeuge verfügbar sein.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Spaltenname *</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="z.B. Reinigungskosten, Versicherung"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="columnType">Typ</Label>
              <Select value={newColumnType} onValueChange={setNewColumnType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currency">Währung (€)</SelectItem>
                  <SelectItem value="number">Zahl</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddColumnDialogOpen(false);
                setNewColumnName('');
                setNewColumnType('currency');
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handleAddCustomColumn}>
              Spalte hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      {vehicleId && (
        <VehicleDocumentUploadDialog
          open={documentDialogOpen}
          onOpenChange={setDocumentDialogOpen}
          vehicleId={vehicleId}
          onSuccess={loadDocuments}
        />
      )}

      {/* Maintenance Dialog */}
      {vehicleId && (
        <VehicleMaintenanceDialog
          open={maintenanceDialogOpen}
          onOpenChange={(open) => {
            setMaintenanceDialogOpen(open);
            if (!open) setSelectedMaintenance(null);
          }}
          vehicleId={vehicleId}
          maintenance={selectedMaintenance}
          onSuccess={loadMaintenances}
        />
      )}
    </div>
  );
}

// Label component
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-gray-700 mb-2 block">
      {children}
    </label>
  );
}
