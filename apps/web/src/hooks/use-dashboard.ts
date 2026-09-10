import { useQuery } from '@tanstack/react-query';
import type { ActivityItem, DashboardStatistics, DashboardSummary } from '@trackcontrol/shared';
import { api } from '@/lib/api';

export function useDashboardSummary() {
  return useQuery({ queryKey: ['dashboard', 'summary'], queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data });
}

export function useDashboardStatistics(days = 30) {
  return useQuery({ queryKey: ['dashboard', 'statistics', days], queryFn: async () => (await api.get<DashboardStatistics>('/dashboard/statistics', { days })).data });
}

export function useDashboardActivity(limit = 10) {
  return useQuery({ queryKey: ['dashboard', 'activity', limit], queryFn: async () => (await api.get<ActivityItem[]>('/dashboard/activity', { limit })).data });
}
