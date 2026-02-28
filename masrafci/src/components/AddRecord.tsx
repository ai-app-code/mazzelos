import React, { useState, useEffect } from 'react';
import { Edit2, ChevronDown, CreditCard, Landmark, Banknote, PieChart, User, Check, FileText, Users, Phone, Loader2, Bell } from 'lucide-react';
import MonthSelector from './MonthSelector';
import { useToast } from './Toast';
import { createRecord, createReminderRule } from '../api';
import type { RecordType, CreateRecordPayload } from '../types';

interface AddRecordProps {
  onCancel: () => void;
  onSaved: () => void;
  selectedMonth: string;
  prefill?: { kurum?: string } | null;
}

const EMPTY_FORM = {
  ad: '',
  tutar: '',
  tarih: '',
  kategori: '',
  kurum: '',
  abone_no: '',
  odeme_yontemi: 'kredi_karti',
  son_odeme: '',
  durum: 'odenmedi',
  taksit_sayisi: '',
  aylik_tutar: '',
  kart: '',
  otomatik_odeme: false,
  telefon: '',
  iban: '',
  notlar: '',
};

export default function AddRecord({ onCancel, onSaved, selectedMonth, prefill }: AddRecordProps) {
  const [recordType, setRecordType] = useState<RecordType>('harcama');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [ay, setAy] = useState(selectedMonth);
  const [saving, setSaving] = useState(false);
  const [setupReminder, setSetupReminder] = useState(false);
  const [reminderStartDay, setReminderStartDay] = useState(1);
  const [reminderEndDay, setReminderEndDay] = useState(28);
  const [reminderLeadDays, setReminderLeadDays] = useState(3);
  const toast = useToast();

  useEffect(() => {
    if (prefill?.kurum) {
      setRecordType('fatura');
      setForm(prev => ({ ...prev, kurum: prefill.kurum!, ad: prefill.kurum! }));
    }
  }, [prefill]);

  // Tarih girildiginde hatirlatici gun araligini oner
  useEffect(() => {
    if (recordType !== 'fatura') return;
    const dateStr = form.son_odeme || form.tarih;
    if (!dateStr) return;
    const day = new Date(dateStr).getDate();
    if (day >= 1 && day <= 28) {
      setReminderStartDay(Math.max(1, day - 5));
      setReminderEndDay(Math.min(28, day + 5));
    }
  }, [form.son_odeme, form.tarih, recordType]);

  const set = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: RecordType) => {
    setRecordType(type);
    setForm({ ...EMPTY_FORM });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ad.trim()) {
      toast.warning('Lütfen bir ad giriniz');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateRecordPayload = {
        type: recordType,
        ad: form.ad.trim(),
        ay,
        tutar: form.tutar ? parseFloat(form.tutar) : 0,
        notlar: form.notlar || undefined,
      };

      if (recordType === 'harcama') {
        payload.kategori = form.kategori || undefined;
        payload.tarih = form.tarih || undefined;
        payload.odeme_yontemi = form.odeme_yontemi || undefined;
        if (form.taksit_sayisi) payload.taksit_sayisi = parseInt(form.taksit_sayisi);
        if (form.aylik_tutar) payload.aylik_tutar = parseFloat(form.aylik_tutar);
      } else if (recordType === 'fatura') {
        payload.kurum = form.kurum.trim() || undefined;
        payload.abone_no = form.abone_no.trim() || undefined;
        payload.tarih = form.tarih || undefined;
        payload.son_odeme = form.son_odeme || undefined;
        payload.otomatik_odeme = form.otomatik_odeme;
      } else if (recordType === 'kredikarti') {
        payload.kart = form.ad.trim();
        payload.son_odeme = form.son_odeme || undefined;
      } else if (recordType === 'alacakli') {
        payload.telefon = form.telefon || undefined;
        payload.iban = form.iban || undefined;
      }

      await createRecord(payload);
      toast.success('Kayıt başarıyla eklendi');

      if (setupReminder && recordType === 'fatura' && form.kurum.trim()) {
        try {
          await createReminderRule({
            display_name: form.kurum.trim(),
            expected_start_day: reminderStartDay,
            expected_end_day: reminderEndDay,
            lead_days: reminderLeadDays,
          });
          toast.success('Hatırlatıcı kuruldu');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Hatırlatıcı kurulamadı';
          toast.warning(msg);
        }
      }

      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kayıt eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'harcama' as RecordType, label: 'Harcama', icon: Banknote },
    { id: 'fatura' as RecordType, label: 'Fatura', icon: FileText },
    { id: 'kredikarti' as RecordType, label: 'Kredi Kartı', icon: CreditCard },
    { id: 'alacakli' as RecordType, label: 'Alacaklı', icon: Users },
  ];

  const inputCls = "w-full h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";
  const labelCls = "text-sm font-bold text-gray-900 dark:text-white";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2 transition-colors">Yeni Kayıt Ekle</h1>
          <p className="text-gray-500 dark:text-gray-400 transition-colors">Sisteme eklemek istediğiniz kayıt türünü seçin ve detayları girin.</p>
        </div>
        <MonthSelector value={ay} onChange={setAy} />
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto no-scrollbar pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTypeChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              recordType === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 lg:p-8 transition-colors">
        <form className="space-y-8" onSubmit={handleSubmit}>

          {/* HARCAMA */}
          {recordType === 'harcama' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Harcama Adı</label>
                  <div className="relative">
                    <input type="text" placeholder="Örn: Market Alışverişi" value={form.ad} onChange={e => set('ad', e.target.value)} className={inputCls} />
                    <Edit2 className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Kategori</label>
                  <div className="relative">
                    <select value={form.kategori} onChange={e => set('kategori', e.target.value)} className={`${inputCls} appearance-none`}>
                      <option value="">Kategori Seçiniz</option>
                      <option value="market">Market</option>
                      <option value="fatura">Fatura</option>
                      <option value="eglence">Eğlence</option>
                      <option value="ulasim">Ulaşım</option>
                      <option value="saglik">Sağlık</option>
                      <option value="kira">Kira</option>
                      <option value="diger">Diğer</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Tutar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 font-bold">₺</span>
                    <input type="number" step="0.01" placeholder="0.00" value={form.tutar} onChange={e => set('tutar', e.target.value)} className={`${inputCls} pl-10`} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Harcama Tarihi</label>
                  <input type="date" value={form.tarih} onChange={e => set('tarih', e.target.value)} className={inputCls} />
                </div>
              </div>

              <hr className="border-gray-100 dark:border-slate-800" />

              <div className="flex flex-col gap-4">
                <label className={labelCls}>Ödeme Yöntemi</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { val: 'kredi_karti', label: 'Kredi Kartı', sub: 'Tek çekim veya taksitli', Icon: CreditCard },
                    { val: 'havale', label: 'IBAN / Havale', sub: 'Banka transferi', Icon: Landmark },
                    { val: 'nakit', label: 'Nakit', sub: 'Elden ödeme', Icon: Banknote },
                  ].map(p => (
                    <label key={p.val} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${form.odeme_yontemi === p.val ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                      <input type="radio" name="payment" checked={form.odeme_yontemi === p.val} onChange={() => set('odeme_yontemi', p.val)} className="w-5 h-5 text-blue-600 focus:ring-blue-500" />
                      <div className="flex items-center gap-3">
                        <p.Icon className={`w-6 h-6 ${form.odeme_yontemi === p.val ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{p.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{p.sub}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-6 border border-gray-100 dark:border-slate-800 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Taksit Detayları</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Sadece taksitli işlemlerde doldurunuz)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Taksit Sayısı</label>
                    <div className="relative">
                      <select value={form.taksit_sayisi} onChange={e => set('taksit_sayisi', e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 dark:text-white">
                        <option value="">Seçiniz</option>
                        <option value="3">3 Taksit</option>
                        <option value="6">6 Taksit</option>
                        <option value="9">9 Taksit</option>
                        <option value="12">12 Taksit</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Aylık Taksit Tutarı</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400 text-sm font-bold">₺</span>
                      <input type="number" step="0.01" placeholder="0.00" value={form.aylik_tutar} onChange={e => set('aylik_tutar', e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">İlk Ödeme Tarihi</label>
                    <input type="date" value={form.son_odeme} onChange={e => set('son_odeme', e.target.value)} className="w-full h-11 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 dark:text-white" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FATURA */}
          {recordType === 'fatura' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Fatura Adı</label>
                <div className="relative">
                  <input type="text" placeholder="Örn: Doğalgaz Faturası" value={form.ad} onChange={e => set('ad', e.target.value)} className={inputCls} />
                  <FileText className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Kurum</label>
                <div className="relative">
                  <input type="text" placeholder="Örn: Aksa Doğalgaz" value={form.kurum} onChange={e => set('kurum', e.target.value)} className={inputCls} />
                  <Landmark className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Abone No</label>
                <div className="relative">
                  <input type="text" placeholder="Örn: 12345678" value={form.abone_no} onChange={e => set('abone_no', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Tutar</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 font-bold">₺</span>
                  <input type="number" step="0.01" placeholder="0.00" value={form.tutar} onChange={e => set('tutar', e.target.value)} className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Geliş Tarihi</label>
                <input type="date" value={form.tarih} onChange={e => set('tarih', e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Son Ödeme Tarihi</label>
                <input type="date" value={form.son_odeme} onChange={e => set('son_odeme', e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-1 md:col-span-2 flex items-center gap-3 mt-2">
                <input type="checkbox" id="auto-pay" checked={form.otomatik_odeme} onChange={e => set('otomatik_odeme', e.target.checked)} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700" />
                <label htmlFor="auto-pay" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Otomatik ödeme talimatı var</label>
              </div>

              <div className="col-span-1 md:col-span-2 mt-2">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="setup-reminder" checked={setupReminder} onChange={e => setSetupReminder(e.target.checked)} className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700" />
                  <label htmlFor="setup-reminder" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Bu fatura için aylık hatırlatıcı kur
                  </label>
                </div>

                {setupReminder && (
                  <div className="mt-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
                    <div className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3">Hatırlatıcı Ayarları</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Beklenen başlangıç günü</label>
                        <select value={reminderStartDay} onChange={e => setReminderStartDay(Number(e.target.value))} className="h-10 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Beklenen bitiş günü</label>
                        <select value={reminderEndDay} onChange={e => setReminderEndDay(Number(e.target.value))} className="h-10 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-amber-700 dark:text-amber-400">Kaç gün önce hatırlat</label>
                        <select value={reminderLeadDays} onChange={e => setReminderLeadDays(Number(e.target.value))} className="h-10 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 px-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                          {[0, 1, 2, 3, 5, 7].map(d => (
                            <option key={d} value={d}>{d} gün</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KREDİ KARTI */}
          {recordType === 'kredikarti' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Harcama Adı</label>
                <div className="relative">
                  <input type="text" placeholder="Örn: iPhone 15 Pro" value={form.ad} onChange={e => set('ad', e.target.value)} className={inputCls} />
                  <CreditCard className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Toplam Tutar</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 font-bold">₺</span>
                  <input type="number" step="0.01" placeholder="0.00" value={form.tutar} onChange={e => set('tutar', e.target.value)} className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Kart Adı / Banka</label>
                <div className="relative">
                  <input type="text" placeholder="Örn: Garanti Bonus" value={form.kart} onChange={e => set('kart', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Taksit Sayısı</label>
                <div className="relative">
                  <select value={form.taksit_sayisi} onChange={e => set('taksit_sayisi', e.target.value)} className={`${inputCls} appearance-none`}>
                    <option value="">Seçiniz</option>
                    <option value="1">Tek Çekim</option>
                    <option value="3">3 Taksit</option>
                    <option value="6">6 Taksit</option>
                    <option value="9">9 Taksit</option>
                    <option value="12">12 Taksit</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Aylık Taksit Tutarı</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 font-bold">₺</span>
                  <input type="number" step="0.01" placeholder="0.00" value={form.aylik_tutar} onChange={e => set('aylik_tutar', e.target.value)} className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Son Ödeme Tarihi</label>
                <input type="date" value={form.son_odeme} onChange={e => set('son_odeme', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* ALACAKLI */}
          {recordType === 'alacakli' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Alacaklı Adı / Ünvanı</label>
                <div className="relative">
                  <input type="text" placeholder="Örn: Ahmet Yılmaz" value={form.ad} onChange={e => set('ad', e.target.value)} className={inputCls} />
                  <User className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Tutar</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-500 dark:text-gray-400 font-bold">₺</span>
                  <input type="number" step="0.01" placeholder="0.00" value={form.tutar} onChange={e => set('tutar', e.target.value)} className={`${inputCls} pl-10`} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>İletişim Numarası</label>
                <div className="relative">
                  <input type="tel" placeholder="05XX XXX XX XX" value={form.telefon} onChange={e => set('telefon', e.target.value)} className={inputCls} />
                  <Phone className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelCls}>Son Ödeme Tarihi</label>
                <input type="date" value={form.son_odeme} onChange={e => set('son_odeme', e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                <label className={labelCls}>IBAN Numarası</label>
                <div className="relative">
                  <input type="text" placeholder="TR__ ____ ____ ____ ____" value={form.iban} onChange={e => set('iban', e.target.value)} className={inputCls} />
                  <Landmark className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>
          )}

          {/* Ortak Notlar */}
          <div className="flex flex-col gap-2">
            <label className={labelCls}>Notlar / Açıklama</label>
            <textarea rows={3} placeholder="Eklemek istedikleriniz..." value={form.notlar} onChange={e => set('notlar', e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              İptal Et
            </button>
            <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
