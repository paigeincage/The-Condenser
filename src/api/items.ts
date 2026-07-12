import { api } from './client';
import type { PunchItem } from '../types';

export function createItemsBulk(items: {
  projectId: string;
  text: string;
  trade?: string;
  priority?: string;
  source?: string;
  sourceFileId?: string;
  location?: string;
  assignee?: string;
}[]) {
  return api<{ count: number }>('/api/items/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function updateItem(id: string, data: Partial<PunchItem>) {
  return api<{ item: PunchItem }>(`/api/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function saveTradeSteps(
  id: string,
  data: {
    steps: string[];
    assignee?: string;
    notes?: string;
    sendDate?: string | null;
    dueDate?: string | null;
  }
) {
  return api<{ item: PunchItem }>(`/api/items/${id}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteItem(id: string) {
  return api<{ ok: boolean }>(`/api/items/${id}`, { method: 'DELETE' });
}
