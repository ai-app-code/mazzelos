import type { MasrafRecord, Summary, CreateRecordPayload, ReminderRule, ReminderEvent, CreateReminderRulePayload, ReminderAction } from './types';

const BASE = '/api/masrafci';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchRecords(params?: { type?: string; month?: string }): Promise<MasrafRecord[]> {
  const sp = new URLSearchParams();
  if (params?.type) sp.set('type', params.type);
  if (params?.month) sp.set('month', params.month);
  const qs = sp.toString();
  return request(`${BASE}/records${qs ? '?' + qs : ''}`);
}

export function createRecord(data: CreateRecordPayload): Promise<{ success: boolean; id: number }> {
  return request(`${BASE}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteRecord(id: number): Promise<{ success: boolean }> {
  return request(`${BASE}/records/${id}`, { method: 'DELETE' });
}

export function fetchSummary(month?: string): Promise<Summary> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return request(`${BASE}/summary${qs}`);
}

export function fetchReminderRules(): Promise<ReminderRule[]> {
  return request(`${BASE}/reminder-rules`);
}

export function createReminderRule(data: CreateReminderRulePayload): Promise<{ success: boolean; provider_key: string }> {
  return request(`${BASE}/reminder-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function fetchReminders(month: string): Promise<ReminderEvent[]> {
  return request(`${BASE}/reminders?month=${encodeURIComponent(month)}`);
}

export function runReminderCheck(month?: string): Promise<ReminderEvent[]> {
  return request(`${BASE}/reminder-check/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month }),
  });
}

export function performReminderAction(eventId: number, action: ReminderAction): Promise<{ success: boolean; redirect?: string; display_name?: string }> {
  return request(`${BASE}/reminders/${eventId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
}
