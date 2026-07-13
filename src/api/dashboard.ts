import { api } from './client';
import type { DashboardSummary } from '../types';

export function getDashboard() {
  return api<DashboardSummary>('/api/dashboard');
}
