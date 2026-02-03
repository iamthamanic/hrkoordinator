/**
 * ============================================
 * BROWO KOORDINATOR - TIME CLOCK HOOK
 * ============================================
 * Factorial-Style Time Tracking State Management
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { supabaseUrl } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TimeRecord {
  id: string;
  user_id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  work_type: 'office' | 'field' | 'extern';
  location_id?: string | null;
  status: 'running' | 'completed';
  created_at?: string;
  updated_at?: string;
}

interface CurrentStatus {
  is_clocked_in: boolean;
  current_record: TimeRecord | null;
}

interface TimeRecordsSummary {
  records: TimeRecord[];
  summary: {
    total_hours: number;
    total_break_minutes: number;
    record_count: number;
  };
}

export function useTimeClock() {
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>({
    is_clocked_in: false,
    current_record: null,
  });
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [summary, setSummary] = useState({
    total_hours: 0,
    total_break_minutes: 0,
    record_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');

  const apiUrl = `${supabaseUrl}/functions/v1/BrowoKoordinator-Zeiterfassung`;

  // Helper to get auth token
  const getAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Nicht angemeldet. Bitte einloggen.');
    }
    return session.access_token;
  }, []);

  // Update current time every minute for live duration display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch current status
  const fetchCurrentStatus = useCallback(async () => {
    try {
      const token = await getAuthToken();
      console.log('[useTimeClock] Fetching current status with token:', token?.substring(0, 20) + '...');
      
      const response = await fetch(`${apiUrl}/time-records/current-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useTimeClock] Status fetch failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch current status');
      }

      const data: CurrentStatus = await response.json();
      setCurrentStatus(data);
    } catch (error: any) {
      console.error('Error fetching current status:', error);
      // Don't show toast for auth errors on initial load
      if (error.message !== 'Nicht angemeldet. Bitte einloggen.') {
        toast.error('Fehler beim Laden des Status');
      }
    }
  }, [apiUrl, getAuthToken]);

  // Fetch time records
  const fetchTimeRecords = useCallback(async (filterType: 'today' | 'week' | 'month' = 'today') => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      console.log('[useTimeClock] Fetching time records with token:', token?.substring(0, 20) + '...');
      
      const response = await fetch(`${apiUrl}/time-records?filter=${filterType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[useTimeClock] Records fetch failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch time records');
      }

      const data: TimeRecordsSummary = await response.json();
      setTimeRecords(data.records);
      setSummary(data.summary);
    } catch (error: any) {
      console.error('Error fetching time records:', error);
      // Don't show toast for auth errors
      if (error.message !== 'Nicht angemeldet. Bitte einloggen.') {
        toast.error('Fehler beim Laden der Zeitaufzeichnungen');
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getAuthToken]);

  // Clock in
  const clockIn = useCallback(async (workType: 'office' | 'field' | 'extern', locationId?: string) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await fetch(`${apiUrl}/time-records/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_type: workType,
          location_id: locationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock in');
      }

      toast.success('✅ Erfolgreich eingestempelt!');
      
      // Refresh status and records IN PARALLEL (faster!)
      await Promise.all([
        fetchCurrentStatus(),
        fetchTimeRecords(filter)
      ]);

      return { success: true, record: data.record };
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast.error(error.message || 'Fehler beim Einstempeln');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchCurrentStatus, fetchTimeRecords, filter, getAuthToken]);

  // Clock out
  const clockOut = useCallback(async (breakMinutesOverride?: number) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await fetch(`${apiUrl}/time-records/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          break_minutes_override: breakMinutesOverride,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock out');
      }

      toast.success('✅ Erfolgreich ausgestempelt!');
      
      // Refresh status and records IN PARALLEL (faster!)
      await Promise.all([
        fetchCurrentStatus(),
        fetchTimeRecords(filter)
      ]);

      return { success: true, record: data.record };
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast.error(error.message || 'Fehler beim Ausstempeln');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchCurrentStatus, fetchTimeRecords, filter, getAuthToken]);

  // Calculate elapsed time for running record
  const getElapsedTime = useCallback(() => {
    if (!currentStatus.is_clocked_in || !currentStatus.current_record?.time_in) {
      return { hours: 0, minutes: 0, formatted: '0h 0m' };
    }

    const today = new Date().toISOString().split('T')[0];
    const timeInDate = new Date(`${today}T${currentStatus.current_record.time_in}`);
    const diffMs = currentTime.getTime() - timeInDate.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      hours,
      minutes,
      formatted: `${hours}h ${minutes}m`,
    };
  }, [currentStatus, currentTime]);

  // Initial load
  useEffect(() => {
    fetchCurrentStatus();
    fetchTimeRecords(filter);
  }, [fetchCurrentStatus, fetchTimeRecords, filter]);

  // Change filter
  const changeFilter = useCallback((newFilter: 'today' | 'week' | 'month') => {
    setFilter(newFilter);
    fetchTimeRecords(newFilter);
  }, [fetchTimeRecords]);

  return {
    currentStatus,
    timeRecords,
    summary,
    loading,
    clockIn,
    clockOut,
    fetchCurrentStatus,
    fetchTimeRecords,
    getElapsedTime,
    filter,
    changeFilter,
  };
}