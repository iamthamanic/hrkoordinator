/**
 * @file BrowoKo_useTrainingCompliance.ts
 * @domain ADMIN - Training Compliance Dashboard
 * @description Hook for fetching training progress data
 * @version v4.13.3
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { projectId, supabaseUrl, publicAnonKey } from '../utils/supabase/info';

interface VideoProgressData {
  video_id: string;
  video_title: string;
  video_category: string | null;
  video_duration: number;
  user_id: string;
  user_name: string;
  user_email: string;
  department_id: string | null;
  team_id: string | null;
  location_id: string | null;
  progress_percent: number;
  completed: boolean;
  last_watched_at: string | null;
  completed_at: string | null;
}

interface TestProgressData {
  test_id: string;
  test_title: string;
  test_category: string | null;
  passing_score: number;
  user_id: string;
  user_name: string;
  user_email: string;
  department_id: string | null;
  team_id: string | null;
  location_id: string | null;
  attempts: number;
  best_score: number;
  passed: boolean;
  last_attempt_at: string | null;
}

interface ExternalTraining {
  id: string;
  user_id: string;
  training_name: string;
  category: string | null;
  provider: string | null;
  completed_at: string;
  expires_at: string | null;
  certificate_url: string | null;
  notes: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string | null;
    team_id: string | null;
    location_id: string | null;
  };
  created_by_user: {
    first_name: string;
    last_name: string;
  } | null;
}

export function useBrowoKo_TrainingCompliance() {
  const [videosProgress, setVideosProgress] = useState<VideoProgressData[]>([]);
  const [testsProgress, setTestsProgress] = useState<TestProgressData[]>([]);
  const [externalTrainings, setExternalTrainings] = useState<ExternalTraining[]>([]);
  
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);

  // Get auth token from localStorage (correct key!)
  const getAuthToken = () => {
    try {
      // Get the Supabase session from localStorage
      const authStorage = localStorage.getItem(`sb-${projectId}-auth-token`);
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        if (parsed?.access_token) {
          return parsed.access_token;
        }
      }
      
      // Fallback: try to get from zustand store via localStorage
      const zustandAuth = localStorage.getItem('browo-auth-storage');
      if (zustandAuth) {
        const parsed = JSON.parse(zustandAuth);
        if (parsed?.state?.session?.access_token) {
          return parsed.state.session.access_token;
        }
      }
      
      console.warn('[TrainingCompliance] No auth token found, using anon key');
      return publicAnonKey;
    } catch (error) {
      console.error('[TrainingCompliance] Error getting auth token:', error);
      return publicAnonKey;
    }
  };

  // Fetch Videos Progress
  const fetchVideosProgress = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const token = getAuthToken();
      console.log('[TrainingCompliance] Fetching videos progress with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Lernen/training-progress/videos`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[TrainingCompliance] Videos response status:', response.status);

      if (!response.ok) {
        // Try to parse as JSON first, fallback to text
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error('[TrainingCompliance] Non-JSON error response:', errorText);
          errorMessage = errorText.substring(0, 200); // First 200 chars
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Transform API response to flat array
      const flatData: VideoProgressData[] = [];
      if (result.videos) {
        result.videos.forEach((video: any) => {
          video.users.forEach((user: any) => {
            flatData.push({
              video_id: video.video_id,
              video_title: video.video_title,
              video_category: null,
              video_duration: 0,
              user_id: user.user_id,
              user_name: user.user_name,
              user_email: user.user_email || '',
              department_id: user.department_id,
              team_id: user.team_id,
              location_id: user.location_id,
              progress_percent: user.progress_percent,
              completed: user.completed,
              last_watched_at: user.last_watched_at,
              completed_at: user.completed ? user.last_watched_at : null,
            });
          });
        });
      }
      
      console.log('[TrainingCompliance] Videos progress loaded:', flatData.length, 'entries');
      setVideosProgress(flatData);
    } catch (error: any) {
      console.error('[TrainingCompliance] Fetch videos progress error:', error);
      toast.error(`Fehler beim Laden: ${error.message}`);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  // Fetch Tests Progress
  const fetchTestsProgress = useCallback(async () => {
    setLoadingTests(true);
    try {
      const token = getAuthToken();
      console.log('[TrainingCompliance] Fetching tests progress with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Lernen/training-progress/tests`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[TrainingCompliance] Tests response status:', response.status);

      if (!response.ok) {
        // Try to parse as JSON first, fallback to text
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error('[TrainingCompliance] Non-JSON error response:', errorText);
          errorMessage = errorText.substring(0, 200); // First 200 chars
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Transform API response to flat array
      const flatData: TestProgressData[] = [];
      if (result.tests) {
        result.tests.forEach((test: any) => {
          test.users.forEach((user: any) => {
            flatData.push({
              test_id: test.test_id,
              test_title: test.test_title,
              test_category: null,
              passing_score: test.passing_score,
              user_id: user.user_id,
              user_name: user.user_name,
              user_email: user.user_email || '',
              department_id: user.department_id,
              team_id: user.team_id,
              location_id: user.location_id,
              attempts: user.attempts,
              best_score: user.best_score,
              passed: user.passed,
              last_attempt_at: user.last_attempt_at,
            });
          });
        });
      }
      
      console.log('[TrainingCompliance] Tests progress loaded:', flatData.length, 'entries');
      setTestsProgress(flatData);
    } catch (error: any) {
      console.error('[TrainingCompliance] Fetch tests progress error:', error);
      toast.error(`Fehler beim Laden: ${error.message}`);
    } finally {
      setLoadingTests(false);
    }
  }, []);

  // Fetch External Trainings
  const fetchExternalTrainings = useCallback(async () => {
    setLoadingExternal(true);
    try {
      const token = getAuthToken();
      console.log('[TrainingCompliance] Fetching external trainings with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Lernen/external-trainings`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[TrainingCompliance] External trainings response status:', response.status);

      if (!response.ok) {
        // Try to parse as JSON first, fallback to text
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error('[TrainingCompliance] Non-JSON error response:', errorText);
          errorMessage = errorText.substring(0, 200); // First 200 chars
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setExternalTrainings(result.trainings || []);
    } catch (error: any) {
      console.error('[TrainingCompliance] Fetch external trainings error:', error);
      toast.error(`Fehler beim Laden: ${error.message}`);
    } finally {
      setLoadingExternal(false);
    }
  }, []);

  // Delete External Training
  const deleteExternalTraining = useCallback(async (trainingId: string) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Lernen/external-trainings/${trainingId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete external training');
      }

      toast.success('Schulung gelöscht');
      await fetchExternalTrainings(); // Reload
    } catch (error: any) {
      console.error('[TrainingCompliance] Delete external training error:', error);
      toast.error(`Fehler: ${error.message}`);
    }
  }, [fetchExternalTrainings]);

  return {
    videosProgress,
    testsProgress,
    externalTrainings,
    loadingVideos,
    loadingTests,
    loadingExternal,
    fetchVideosProgress,
    fetchTestsProgress,
    fetchExternalTrainings,
    deleteExternalTraining,
  };
}
