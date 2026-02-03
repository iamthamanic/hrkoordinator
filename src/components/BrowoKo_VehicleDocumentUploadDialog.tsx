/**
 * @file BrowoKo_VehicleDocumentUploadDialog.tsx
 * @version 1.0.0
 * @description Dialog for uploading documents to vehicles
 */

import { useState } from 'react';
import { Upload, X, FileText, Trash2 } from './icons/BrowoKoIcons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface VehicleDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'fahrzeugbrief', label: 'Fahrzeugbrief' },
  { value: 'fahrzeugschein', label: 'Fahrzeugschein' },
  { value: 'versicherung', label: 'Versicherung' },
  { value: 'tuv', label: 'TÜV-Bericht' },
  { value: 'wartung', label: 'Wartungsdokument' },
  { value: 'rechnung', label: 'Rechnung' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export function VehicleDocumentUploadDialog({ 
  open, 
  onOpenChange, 
  vehicleId,
  onSuccess 
}: VehicleDocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('sonstiges');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Check file size (max 10MB per file)
    const oversizedFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Einige Dateien sind größer als 10MB');
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
    toast.success(`${selectedFiles.length} Datei(en) hinzugefügt`);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Datei aus');
      return;
    }

    setUploading(true);

    try {
      // TODO: Implement actual file upload to Supabase Storage
      // For now, we'll just create database records
      
      const { supabaseUrl, publicAnonKey } = await import('../utils/supabase/info');
      
      for (const file of files) {
        // In production, upload to Supabase Storage first
        // const storageResponse = await supabase.storage
        //   .from('vehicle-documents')
        //   .upload(`${vehicleId}/${Date.now()}_${file.name}`, file);
        
        // Create document record
        const response = await fetch(
          `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge/api/vehicles/${vehicleId}/documents`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: file.name,
              type: documentType,
              file_path: `vehicle-documents/${vehicleId}/${file.name}`, // Placeholder
              file_size: file.size,
              uploaded_by: 'current_user', // TODO: Get from auth context
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      toast.success(`${files.length} Dokument(e) erfolgreich hochgeladen`);
      setFiles([]);
      setDocumentType('sonstiges');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dokumente hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie Dokumente für dieses Fahrzeug hoch (max. 10MB pro Datei)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label>Dokumenttyp</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Dateien auswählen</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="document-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Klicken zum Auswählen oder Dateien hierher ziehen
                </p>
                <p className="text-xs text-gray-500">
                  PDF, Word, JPG, PNG (max. 10MB)
                </p>
              </label>
            </div>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Ausgewählte Dateien ({files.length})</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird hochgeladen...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {files.length} Datei(en) hochladen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
