/**
 * DOCUMENT SERVICE
 * ================
 * Handles all document operations via Edge Function
 * 
 * MIGRATION: From direct Supabase calls to Edge Function API calls
 * Edge Function: BrowoKoordinator-Dokumente
 */

import { supabase } from '../utils/supabase/client';
import { supabaseUrl } from '../utils/supabase/info';
import type { Document } from '../types/database';

export interface CreateDocumentData {
  title: string;
  category: string;
  file_url: string;
  user_id?: string;
  mime_type?: string;
  file_size?: number;
  organization_id?: string;
  uploaded_by?: string;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  category?: string;
}

export interface DocumentFilters {
  category?: string;
  organization_id?: string;
  search?: string;
  uploaded_by?: string;
}

/**
 * DOCUMENT SERVICE
 * ================
 * Manages documents via Edge Function API
 */
export class DocumentService {
  private baseUrl: string;

  constructor() {
    // Edge Function Base URL (new architecture without /make-server-f659121d)
    this.baseUrl = `${supabaseUrl}/functions/v1/BrowoKoordinator-Dokumente`;
  }

  /**
   * Get authenticated user's JWT token
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  }

  /**
   * Log request for debugging
   */
  private logRequest(method: string, operation: string, data?: any) {
    console.log(`📤 [DocumentService] ${operation}`, data);
  }

  /**
   * Log response for debugging
   */
  private logResponse(operation: string, data?: any) {
    console.log(`📥 [DocumentService] ${operation} Response:`, data);
  }

  /**
   * Get all documents with optional filters
   */
  async getAllDocuments(filters?: DocumentFilters): Promise<Document[]> {
    this.logRequest('GET', 'getAllDocuments', { filters });

    try {
      const token = await this.getAuthToken();

      // Build query params
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.organization_id) params.append('organization_id', filters.organization_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.uploaded_by) params.append('uploaded_by', filters.uploaded_by);

      const url = `${this.baseUrl}/documents${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch documents');
      }

      const data = await response.json();
      this.logResponse('getAllDocuments', { count: data.documents?.length || 0 });

      return (data.documents || []) as Document[];
    } catch (error: any) {
      console.error('❌ [DocumentService] getAllDocuments error:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<Document> {
    this.logRequest('GET', 'getDocumentById', { documentId });

    if (!documentId) {
      throw new Error('Document ID ist erforderlich');
    }

    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Document not found');
      }

      const data = await response.json();
      this.logResponse('getDocumentById', { title: data.document?.title });

      return data.document as Document;
    } catch (error: any) {
      console.error('❌ [DocumentService] getDocumentById error:', error);
      throw error;
    }
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category: string): Promise<Document[]> {
    this.logRequest('GET', 'getDocumentsByCategory', { category });

    if (!category) {
      throw new Error('Category ist erforderlich');
    }

    return await this.getAllDocuments({ category });
  }

  /**
   * Get documents by user ID (uploaded by user)
   */
  async getDocumentsByUserId(userId: string): Promise<Document[]> {
    this.logRequest('GET', 'getDocumentsByUserId', { userId });

    if (!userId) {
      throw new Error('User ID ist erforderlich');
    }

    return await this.getAllDocuments({ uploaded_by: userId });
  }

  /**
   * Upload document (create document record)
   */
  async uploadDocument(data: CreateDocumentData): Promise<Document> {
    this.logRequest('POST', 'uploadDocument', data);

    // Validate input
    if (!data.title) throw new Error('Titel ist erforderlich');
    if (!data.category) throw new Error('Kategorie ist erforderlich');
    if (!data.file_url) throw new Error('Datei URL ist erforderlich');

    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create document');
      }

      const result = await response.json();
      this.logResponse('uploadDocument', { id: result.document?.id });

      return result.document as Document;
    } catch (error: any) {
      console.error('❌ [DocumentService] uploadDocument error:', error);
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: string, updates: UpdateDocumentData): Promise<Document> {
    this.logRequest('PUT', 'updateDocument', { documentId, updates });

    if (!documentId) {
      throw new Error('Document ID ist erforderlich');
    }

    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update document');
      }

      const data = await response.json();
      this.logResponse('updateDocument', { id: data.document?.id });

      return data.document as Document;
    } catch (error: any) {
      console.error('❌ [DocumentService] updateDocument error:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    this.logRequest('DELETE', 'deleteDocument', { documentId });

    if (!documentId) {
      throw new Error('Document ID ist erforderlich');
    }

    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete document');
      }

      this.logResponse('deleteDocument', 'Erfolg');
    } catch (error: any) {
      console.error('❌ [DocumentService] deleteDocument error:', error);
      throw error;
    }
  }

  /**
   * Get document download URL (signed URL for private files)
   */
  async getDocumentUrl(documentId: string, expiresIn: number = 3600): Promise<string> {
    this.logRequest('GET', 'getDocumentUrl', { documentId, expiresIn });

    if (!documentId) {
      throw new Error('Document ID ist erforderlich');
    }

    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/download/${documentId}?expiresIn=${expiresIn}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get download URL');
      }

      const data = await response.json();
      this.logResponse('getDocumentUrl', 'Erfolg');

      return data.url;
    } catch (error: any) {
      console.error('❌ [DocumentService] getDocumentUrl error:', error);
      throw error;
    }
  }

  /**
   * Download document (get file as blob)
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    this.logRequest('GET', 'downloadDocument', { documentId });

    if (!documentId) {
      throw new Error('Document ID ist erforderlich');
    }

    try {
      // Get signed URL first
      const url = await this.getDocumentUrl(documentId);

      // Download file
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      this.logResponse('downloadDocument', 'Erfolg');

      return blob;
    } catch (error: any) {
      console.error('❌ [DocumentService] downloadDocument error:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string): Promise<Document[]> {
    this.logRequest('GET', 'searchDocuments', { query });

    if (!query || query.trim().length < 2) {
      throw new Error('Suchbegriff muss mindestens 2 Zeichen lang sein');
    }

    return await this.getAllDocuments({ search: query.trim() });
  }

  /**
   * Get document categories (unique categories from all documents)
   */
  async getDocumentCategories(): Promise<string[]> {
    this.logRequest('GET', 'getDocumentCategories');

    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch categories');
      }

      const data = await response.json();
      this.logResponse('getDocumentCategories', { count: data.categories?.length || 0 });

      return data.categories || [];
    } catch (error: any) {
      console.error('❌ [DocumentService] getDocumentCategories error:', error);
      throw error;
    }
  }

  /**
   * Get document stats
   */
  async getDocumentStats(organizationId?: string): Promise<{
    total: number;
    by_category: Record<string, number>;
    total_size_mb: number;
  }> {
    this.logRequest('GET', 'getDocumentStats', { organizationId });

    try {
      const token = await this.getAuthToken();

      const params = new URLSearchParams();
      if (organizationId) params.append('organization_id', organizationId);

      const url = `${this.baseUrl}/stats${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch stats');
      }

      const data = await response.json();
      this.logResponse('getDocumentStats', data.stats);

      return data.stats;
    } catch (error: any) {
      console.error('❌ [DocumentService] getDocumentStats error:', error);
      throw error;
    }
  }
}
