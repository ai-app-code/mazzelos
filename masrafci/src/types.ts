export type RecordType = 'harcama' | 'fatura' | 'kredikarti' | 'alacakli';

export interface MasrafRecord {
  id: number;
  user: string;
  type: RecordType;
  ad: string;
  tutar: number;
  ay: string | null;
  tarih: string | null;
  kategori: string | null;
  kurum: string | null;
  odeme_yontemi: string | null;
  son_odeme: string | null;
  durum: string;
  taksit_sayisi: number | null;
  taksit_odenen: number;
  aylik_tutar: number | null;
  kart: string | null;
  otomatik_odeme: boolean;
  telefon: string | null;
  iban: string | null;
  abone_no: string | null;
  notlar: string | null;
  created_at: string;
}

export interface KategoriDagilimi {
  kategori: string;
  toplam: number;
  adet: number;
}

export interface Summary {
  toplam_gider: number;
  kategori_dagilimi: KategoriDagilimi[];
  yaklasan_faturalar: MasrafRecord[];
  aktif_taksitler: MasrafRecord[];
  son_islemler: MasrafRecord[];
  pending_reminders: number;
}

export interface ReminderRule {
  id: number;
  user: string;
  provider_key: string;
  display_name: string;
  enabled: boolean;
  expected_start_day: number;
  expected_end_day: number;
  lead_days: number;
  last_prompted_month: string | null;
  snooze_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderEvent {
  id: number;
  rule_id: number;
  month: string;
  status: 'pending' | 'prompted' | 'entered' | 'skipped_month' | 'dismissed';
  prompted_at: string | null;
  answered_at: string | null;
  linked_record_id: number | null;
  created_at: string;
  display_name: string;
  provider_key: string;
  expected_start_day: number;
  expected_end_day: number;
}

export interface CreateReminderRulePayload {
  display_name: string;
  expected_start_day?: number;
  expected_end_day?: number;
  lead_days?: number;
}

export type ReminderAction = 'add_now' | 'snooze_3d' | 'skip_month' | 'disable_rule';

export interface CreateRecordPayload {
  type: RecordType;
  ad: string;
  tutar?: number;
  ay?: string;
  tarih?: string;
  kategori?: string;
  kurum?: string;
  odeme_yontemi?: string;
  son_odeme?: string;
  durum?: string;
  taksit_sayisi?: number;
  taksit_odenen?: number;
  aylik_tutar?: number;
  kart?: string;
  otomatik_odeme?: boolean;
  telefon?: string;
  iban?: string;
  abone_no?: string;
  notlar?: string;
}
