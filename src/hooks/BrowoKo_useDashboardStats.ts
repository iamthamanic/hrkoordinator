/**
 * @file BrowoKo_useDashboardStats.ts
 * @domain BrowoKo - Dashboard
 * @description Custom hook for dashboard statistics (vacation, gamification, tasks)
 * @created Phase 2.2 - Priority 4 Refactoring
 * @updated v4.10.15 - Time tracking removed
 * @updated v4.10.16 - Added tasks statistics
 */

import { useEffect, useState } from 'react';
import { useGamificationStore } from '../stores/gamificationStore';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

export function useDashboardStats() {
  const { user, profile } = useAuthStore();
  const { coins, xp, level, loadUserStats } = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [tasksStats, setTasksStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        await loadUserStats(user.id);
        
        // Load tasks statistics
        const accessToken = (await user.getIdToken?.()) || publicAnonKey;
        const tasksResponse = await fetch(
          `${supabaseUrl}/functions/v1/BrowoKoordinator-Tasks/my-tasks`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          if (tasksData.success && tasksData.tasks) {
            const completed = tasksData.tasks.filter((t: any) => t.status === 'DONE').length;
            setTasksStats({
              completedTasks: completed,
              totalTasks: tasksData.tasks.length,
            });
          }
        }
      } catch (error) {
        console.error('Load dashboard data error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  // Calculate vacation
  const totalVacationDays = profile?.vacation_days || 30;
  const usedVacationDays = 0; // TODO: Get from leave requests
  const remainingVacationDays = totalVacationDays - usedVacationDays;

  // Calculate XP progress to next level
  const nextLevelXP = (level || 1) * 100;
  const currentXP = xp || 0;
  const xpProgress = nextLevelXP > 0 ? (currentXP / nextLevelXP) * 100 : 0;

  return {
    loading,
    
    // Vacation
    totalVacationDays,
    usedVacationDays,
    remainingVacationDays,
    
    // Gamification
    coins,
    xp,
    level,
    nextLevelXP,
    currentXP,
    xpProgress,
    
    // Tasks
    completedTasks: tasksStats.completedTasks,
    totalTasks: tasksStats.totalTasks,
  };
}
