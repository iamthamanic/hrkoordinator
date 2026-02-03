/**
 * @file ITEquipmentManagementScreen.tsx
 * @description IT Equipment management screen
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Monitor, Smartphone, Headphones } from 'lucide-react';
import { Plus, Search, X, User, Calendar, Filter } from '../../components/icons/BrowoKoIcons';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner@2.0.3';

import { supabaseUrl, publicAnonKey } from '../../utils/supabase/info';

interface ITEquipment {
  id: string;
  category: 'LAPTOP' | 'MONITOR' | 'SMARTPHONE' | 'ACCESSORY' | 'OTHER';
  brand: string;
  model: string;
  serial_number: string;
  purchase_date?: string;
  warranty_end?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'REPAIR' | 'DISPOSED';
  assigned_to_user_id?: string; // In a real app this would link to a user
  assigned_to_name?: string; // Mock name for display
  notes?: string;
  created_at: string;
}

const MOCK_IT_EQUIPMENT: ITEquipment[] = [
  {
    id: 'it_1',
    category: 'LAPTOP',
    brand: 'Apple',
    model: 'MacBook Pro 14"',
    serial_number: 'FVFD1234X',
    purchase_date: '2023-11-01',
    status: 'ASSIGNED',
    assigned_to_name: 'Max Mustermann',
    created_at: '2023-11-01T10:00:00Z'
  },
  {
    id: 'it_2',
    category: 'MONITOR',
    brand: 'Dell',
    model: 'U2720Q',
    serial_number: 'CN-0X123',
    status: 'AVAILABLE',
    created_at: '2023-11-05T11:00:00Z'
  },
  {
    id: 'it_3',
    category: 'SMARTPHONE',
    brand: 'Apple',
    model: 'iPhone 15',
    serial_number: 'IMEI356...',
    status: 'REPAIR',
    notes: 'Display Schaden',
    created_at: '2024-01-10T09:30:00Z'
  }
];

export default function ITEquipmentManagementScreen() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<ITEquipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'ASSIGNED' | 'REPAIR' | 'DISPOSED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form State
  const [newItem, setNewItem] = useState<Partial<ITEquipment>>({
    category: 'LAPTOP',
    status: 'AVAILABLE'
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Server/it-equipment`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
           setEquipment(data.items);
        } else {
           // If empty from DB, use Mock and save it to DB for next time (Initialization)
           setEquipment(MOCK_IT_EQUIPMENT);
           MOCK_IT_EQUIPMENT.forEach(async (item) => {
              await saveEquipmentToDB(item);
           });
        }
      } else {
         // Fallback
         console.warn('Backend not reachable, using local mock');
         setEquipment(MOCK_IT_EQUIPMENT);
      }
    } catch (error) {
      console.error('Fetch error', error);
      setEquipment(MOCK_IT_EQUIPMENT);
    } finally {
      setLoading(false);
    }
  };
  
  const saveEquipmentToDB = async (item: ITEquipment) => {
     try {
        await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Server/it-equipment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(item)
        });
     } catch (e) {
       console.error('Save error', e);
     }
  };

  const handleSaveItem = async () => {
    if (!newItem.brand || !newItem.model || !newItem.category) {
      toast.error('Bitte Marke, Modell und Kategorie ausfüllen');
      return;
    }

    const item: ITEquipment = {
      id: `it_${Date.now()}`,
      category: newItem.category as any,
      brand: newItem.brand,
      model: newItem.model,
      serial_number: newItem.serial_number || '',
      purchase_date: newItem.purchase_date,
      status: newItem.status as any,
      assigned_to_name: newItem.assigned_to_name,
      notes: newItem.notes,
      created_at: new Date().toISOString()
    };

    // Optimistic Update
    const updatedList = [item, ...equipment];
    setEquipment(updatedList);
    setIsAddDialogOpen(false);
    setNewItem({ category: 'LAPTOP', status: 'AVAILABLE' });
    
    // Async Save
    await saveEquipmentToDB(item);
    toast.success('IT-Equipment erfolgreich angelegt');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Wirklich löschen?')) {
      const updated = equipment.filter(e => e.id !== id);
      setEquipment(updated);
      
      try {
         await fetch(`${supabaseUrl}/functions/v1/BrowoKoordinator-Server/it-equipment/${id}`, {
           method: 'DELETE',
           headers: {
             'Authorization': `Bearer ${publicAnonKey}`,
           }
         });
         toast.success('Gelöscht');
      } catch (e) {
        console.error('Delete error', e);
        toast.error('Fehler beim Löschen auf dem Server');
      }
    }
  };

  // Filter
  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.brand.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.serial_number.toLowerCase().includes(query) ||
        (item.assigned_to_name && item.assigned_to_name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [equipment, searchQuery, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: equipment.length,
    available: equipment.filter(e => e.status === 'AVAILABLE').length,
    assigned: equipment.filter(e => e.status === 'ASSIGNED').length,
    repair: equipment.filter(e => e.status === 'REPAIR').length,
  }), [equipment]);

  const getIcon = (category: string) => {
    switch(category) {
      case 'LAPTOP': return <Laptop className="w-5 h-5" />;
      case 'MONITOR': return <Monitor className="w-5 h-5" />;
      case 'SMARTPHONE': return <Smartphone className="w-5 h-5" />;
      case 'ACCESSORY': return <Headphones className="w-5 h-5" />;
      default: return <Laptop className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-20 md:pt-6 pb-20 md:pb-8">
      <div className="container-responsive">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Monitor className="w-6 h-6 text-blue-600" />
              IT-Equipment Verwaltung
            </h1>
            <p className="text-gray-600">
              Verwalte Laptops, Smartphones und Zubehör.
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Equipment hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Neues IT-Equipment erfassen</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategorie</Label>
                    <Select 
                      value={newItem.category} 
                      onValueChange={(v) => setNewItem({...newItem, category: v as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LAPTOP">Laptop</SelectItem>
                        <SelectItem value="MONITOR">Monitor</SelectItem>
                        <SelectItem value="SMARTPHONE">Smartphone</SelectItem>
                        <SelectItem value="ACCESSORY">Zubehör</SelectItem>
                        <SelectItem value="OTHER">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={newItem.status} 
                      onValueChange={(v) => setNewItem({...newItem, status: v as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Verfügbar</SelectItem>
                        <SelectItem value="ASSIGNED">Zugewiesen</SelectItem>
                        <SelectItem value="REPAIR">Reparatur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Marke</Label>
                  <Input value={newItem.brand || ''} onChange={e => setNewItem({...newItem, brand: e.target.value})} placeholder="z.B. Apple, Dell" />
                </div>
                <div className="space-y-2">
                  <Label>Modell</Label>
                  <Input value={newItem.model || ''} onChange={e => setNewItem({...newItem, model: e.target.value})} placeholder="z.B. MacBook Pro 14" />
                </div>
                <div className="space-y-2">
                  <Label>Seriennummer</Label>
                  <Input value={newItem.serial_number || ''} onChange={e => setNewItem({...newItem, serial_number: e.target.value})} placeholder="Optional" />
                </div>
                
                {newItem.status === 'ASSIGNED' && (
                   <div className="space-y-2">
                    <Label>Zugewiesen an (Name)</Label>
                    <Input value={newItem.assigned_to_name || ''} onChange={e => setNewItem({...newItem, assigned_to_name: e.target.value})} placeholder="Mitarbeiter Name" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleSaveItem}>Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
           <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500">Gesamt</div>
            </CardContent>
           </Card>
           <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
              <div className="text-xs text-gray-500">Verfügbar</div>
            </CardContent>
           </Card>
           <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
              <div className="text-xs text-gray-500">Im Einsatz</div>
            </CardContent>
           </Card>
           <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.repair}</div>
              <div className="text-xs text-gray-500">Reparatur</div>
            </CardContent>
           </Card>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
             <div className="flex flex-col md:flex-row gap-4">
               <div className="flex-1 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <Input 
                   value={searchQuery} 
                   onChange={e => setSearchQuery(e.target.value)} 
                   className="pl-10" 
                   placeholder="Suche nach Modell, Marke, Mitarbeiter..." 
                 />
               </div>
               <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                 <SelectTrigger className="w-full md:w-[180px]">
                   <SelectValue placeholder="Status" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">Alle Status</SelectItem>
                   <SelectItem value="AVAILABLE">Verfügbar</SelectItem>
                   <SelectItem value="ASSIGNED">Zugewiesen</SelectItem>
                   <SelectItem value="REPAIR">Reparatur</SelectItem>
                   <SelectItem value="DISPOSED">Ausgemustert</SelectItem>
                 </SelectContent>
               </Select>
               <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                 <SelectTrigger className="w-full md:w-[180px]">
                   <SelectValue placeholder="Kategorie" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="ALL">Alle Kategorien</SelectItem>
                   <SelectItem value="LAPTOP">Laptop</SelectItem>
                   <SelectItem value="MONITOR">Monitor</SelectItem>
                   <SelectItem value="SMARTPHONE">Smartphone</SelectItem>
                   <SelectItem value="ACCESSORY">Zubehör</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </CardContent>
        </Card>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map(item => (
            <Card key={item.id} className="group hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {getIcon(item.category)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.brand} {item.model}</CardTitle>
                    <div className="text-xs text-gray-500">{item.serial_number || 'Keine SN'}</div>
                  </div>
                </div>
                <Badge variant={item.status === 'AVAILABLE' ? 'default' : item.status === 'ASSIGNED' ? 'secondary' : 'outline'}>
                  {item.status === 'AVAILABLE' && 'Lager'}
                  {item.status === 'ASSIGNED' && 'Vergeben'}
                  {item.status === 'REPAIR' && 'Reparatur'}
                  {item.status === 'DISPOSED' && 'Weg'}
                </Badge>
              </CardHeader>
              <CardContent>
                 <div className="space-y-2 mt-2">
                    {item.status === 'ASSIGNED' && item.assigned_to_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-gray-50 rounded">
                        <User className="w-4 h-4 text-gray-400" />
                        {item.assigned_to_name}
                      </div>
                    )}
                    {item.purchase_date && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Kaufdatum: {new Date(item.purchase_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="pt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        Löschen
                      </Button>
                    </div>
                 </div>
              </CardContent>
            </Card>
          ))}
          {filteredEquipment.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              Keine Einträge gefunden.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}