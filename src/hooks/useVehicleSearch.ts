/**
 * @file useVehicleSearch.ts
 * @version 1.0.0
 * @description Custom hook for PostgreSQL Full-Text Search on vehicles
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

export interface Vehicle {
  id: string;
  kennzeichen: string;
  modell: string;
  typ: string;
  ladekapazitaet: string | null;
  standort: string | null;
  notizen: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  rank?: number; // FTS ranking
}

export interface VehicleSearchResult {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  total: number;
}

export const useVehicleSearch = (searchQuery: string, debounceMs: number = 300) => {
  const [result, setResult] = useState<VehicleSearchResult>({
    vehicles: [],
    loading: false,
    error: null,
    total: 0,
  });

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const endpoint = query.trim()
        ? `/api/vehicles/search?q=${encodeURIComponent(query)}`
        : '/api/vehicles';

      const url = `${supabaseUrl}/functions/v1/BrowoKoordinator-Fahrzeuge${endpoint}`;
      
      console.log('🔍 Fetching vehicles from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText || errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      setResult({
        vehicles: data.vehicles || [],
        loading: false,
        error: null,
        total: data.total || 0,
      });
    } catch (error: any) {
      console.error('🔍 Vehicle search error:', error);
      
      let errorMessage = error.message || 'Failed to search vehicles';
      
      // Check for common errors
      if (error.message.includes('404')) {
        errorMessage = 'Edge Function nicht deployed. Bitte "BrowoKoordinator-Fahrzeuge" über Supabase Dashboard deployen.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Netzwerkfehler. Bitte Internetverbindung prüfen.';
      }
      
      setResult({
        vehicles: [],
        loading: false,
        error: errorMessage,
        total: 0,
      });
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  return result;
};
