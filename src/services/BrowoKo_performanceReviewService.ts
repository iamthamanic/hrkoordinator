/**
 * PERFORMANCE REVIEW SERVICE
 * ==========================
 * API Client für Mitarbeitergespräche Edge Function
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

// Performance Reviews are served by BrowoKoordinator-Server
const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server/api/performance-reviews`;

export interface Question {
  id: string;
  type: 'text-short' | 'text-long' | 'rating-scale' | 'yes-no' | 'checkboxes' | 'date-input' | 'signature';
  question: string;
  description?: string;
  required: boolean;
  order: number;
  // Type-specific fields
  options?: { id: string; text: string }[];
  minRating?: number;
  maxRating?: number;
  ratingLabels?: { min: string; max: string };
}

export interface Template {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  questions: Question[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'DRAFT' | 'SENT' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';

export interface PerformanceReview {
  id: string;
  organization_id: string;
  employee_id: string;
  manager_id?: string;
  template_snapshot: Question[];
  status: ReviewStatus;
  due_date?: string;
  conversation_date?: string;
  employee_notes?: { note: string; created_at: string }[];
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  created_by_user?: {
    first_name: string;
    last_name: string;
  };
}

export interface Answer {
  id: string;
  review_id: string;
  question_id: string;
  employee_answer?: any;
  employee_answered_at?: string;
  manager_comment?: string;
  manager_answered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  review_id: string;
  user_id: string;
  role: 'employee' | 'manager';
  signature_data: string;
  signed_at: string;
}

export class PerformanceReviewService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get access token from current session
   */
  private async getAccessToken(): Promise<string> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  }

  /**
   * Fetch helper with auth
   */
  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    const fullUrl = `${EDGE_FUNCTION_URL}${endpoint}`;
    console.log('🔍 Fetching:', fullUrl);
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('📡 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error('❌ API Error Response:', errorData);
      } catch (parseError) {
        // If JSON parse fails, try to get text
        try {
          const errorText = await response.text();
          console.error('❌ API Error Text:', errorText);
          errorMessage = errorText || errorMessage;
        } catch {
          console.error('❌ API Error - Could not parse response');
        }
      }
      throw new Error(errorMessage);
    }

    return response;
  }

  // ========================================
  // TEMPLATES
  // ========================================

  async getTemplates(): Promise<Template[]> {
    const response = await this.fetch('/templates');
    const data = await response.json();
    return data.templates;
  }

  async getTemplate(id: string): Promise<Template> {
    const response = await this.fetch(`/templates/${id}`);
    const data = await response.json();
    return data.template;
  }

  async createTemplate(templateData: {
    title: string;
    description?: string;
    questions: Question[];
  }): Promise<Template> {
    const response = await this.fetch('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
    const data = await response.json();
    return data.template;
  }

  async updateTemplate(id: string, updates: {
    title?: string;
    description?: string;
    questions?: Question[];
  }): Promise<Template> {
    const response = await this.fetch(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    return data.template;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.fetch(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // PERFORMANCE REVIEWS
  // ========================================

  async sendReview(data: {
    template_id: string;
    employee_id: string;
    manager_id?: string;
    due_date?: string;
  }): Promise<PerformanceReview> {
    const response = await this.fetch('/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return result.review;
  }

  async getMyReviews(): Promise<PerformanceReview[]> {
    const response = await this.fetch('/my-reviews');
    const data = await response.json();
    return data.reviews;
  }

  async getTeamReviews(employeeId?: string): Promise<PerformanceReview[]> {
    const endpoint = employeeId 
      ? `/team-reviews?employee_id=${employeeId}`
      : '/team-reviews';
    const response = await this.fetch(endpoint);
    const data = await response.json();
    return data.reviews;
  }

  async getReview(id: string): Promise<{
    review: PerformanceReview;
    answers: Answer[];
    signatures: Signature[];
  }> {
    const response = await this.fetch(`/${id}`);
    const data = await response.json();
    return data;
  }

  async saveAnswer(reviewId: string, questionId: string, answer: any): Promise<Answer> {
    const response = await this.fetch(`/${reviewId}/answer`, {
      method: 'PUT',
      body: JSON.stringify({ question_id: questionId, answer }),
    });
    const data = await response.json();
    return data.answer;
  }

  async saveManagerComment(reviewId: string, questionId: string, comment: string): Promise<Answer> {
    const response = await this.fetch(`/${reviewId}/manager-comment`, {
      method: 'PUT',
      body: JSON.stringify({ question_id: questionId, comment }),
    });
    const data = await response.json();
    return data.answer;
  }

  async submitReview(reviewId: string): Promise<PerformanceReview> {
    const response = await this.fetch(`/${reviewId}/submit`, {
      method: 'PUT',
    });
    const data = await response.json();
    return data.review;
  }

  async completeReview(reviewId: string, conversationDate?: string): Promise<PerformanceReview> {
    const response = await this.fetch(`/${reviewId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ conversation_date: conversationDate }),
    });
    const data = await response.json();
    return data.review;
  }

  async saveSignature(reviewId: string, signatureData: string, role: 'employee' | 'manager'): Promise<Signature> {
    const response = await this.fetch(`/${reviewId}/signature`, {
      method: 'POST',
      body: JSON.stringify({ signature_data: signatureData, role }),
    });
    const data = await response.json();
    return data.signature;
  }

  async exportPDF(reviewId: string): Promise<{
    document: any;
    pdf_data: any;
  }> {
    const response = await this.fetch(`/${reviewId}/export-pdf`, {
      method: 'POST',
    });
    const data = await response.json();
    return data;
  }

  async addNote(reviewId: string, note: string): Promise<PerformanceReview> {
    const response = await this.fetch(`/${reviewId}/add-note`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    return data.review;
  }
}