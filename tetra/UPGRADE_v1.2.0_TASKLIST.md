# TETRA AI Debate Protocol - v1.2.0 Yükseltme Görev Listesi

> **Oluşturulma Tarihi:** 2025-12-30
> **Tamamlanma Tarihi:** 2025-12-31
> **Hedef Versiyon:** v1.2.0
> **Mevcut Versiyon:** v1.0.0 (main) + Lokal değişiklikler
> **Kaynak:** feature/credits-error-handling branch (v1.0.1) + Lokal cache optimizasyonları

---

## 📋 GÖREV DURUMU

| Sembol | Anlam |
|--------|-------|
| ⬜ | Bekliyor |
| 🔄 | Devam ediyor |
| ✅ | Tamamlandı |
| ❌ | Başarısız/İptal |

---

## ADIM 0: Mevcut Değişiklikleri Commit'le (Yedek)
**Durum:** ✅ TAMAMLANDI

- [x] `git add -A` çalıştır
- [x] `git commit -m "wip: Cache fallback + Toast sistemi (merge öncesi yedek)"` çalıştır
- [x] Commit hash'i kaydet: `872d4b5`

**Test:** Git status temiz ✅

---

## ADIM 1: types.ts Güncellemesi
**Durum:** ✅ TAMAMLANDI

### Eklenecek Tipler:
- [x] `Participant` interface'e `contextWindow?: number` ekle
- [x] `DebateStatus` enum'a `REVISION = 'REVISION'` ekle
- [x] `DebateConfig` interface'e revizyon alanları ekle
- [x] `HistoryItem` interface'e status ve revisionCount ekle
- [x] Yeni tipler: `CatalystType`, `RevisionOutcome`, `RevisionRequest`, `RoundType`
- [x] `Round` interface'e `type?: RoundType` ekle
- [x] `DebateArchive` interface'e revizyon alanları ekle

**Test:** TypeScript hatası yok ✅

---

## ADIM 2: openRouterService.ts Güncellemesi
**Durum:** ✅ TAMAMLANDI

- [x] `estimateContextWindow()` fonksiyonu
- [x] `calculateMaxTokens()` fonksiyonu
- [x] `sendChatCompletion` imza değişikliği (contextWindow param)
- [x] Dinamik max_tokens kullanımı
- [x] 402/403 kredi hatası tespiti
- [x] Cache/Fallback/Retry sistemi korundu ✅

**Test:** npm run dev çalışıyor ✅

---

## ADIM 3: DebateArena.tsx Güncellemesi
**Durum:** ✅ TAMAMLANDI

- [x] `onClose` prop (zaten vardı)
- [x] `handleClose` fonksiyonu (zaten vardı)
- [x] `creditsError` state ve modal
- [x] "Anasayfaya Dön" butonu
- [x] Toast sistemi korundu ✅
- [x] "Tekrar Dene" fix korundu ✅

**Test:** UI düzgün render oluyor ✅

---

## ADIM 4: backend/server.js Güncellemesi
**Durum:** ⏭️ ATLANDI (Sonraki sürümde)

> Revizyon API endpoint'leri v1.3.0'da eklenecek

---

## ADIM 5: Yeni Dosyalar
**Durum:** ✅ TAMAMLANDI

- [x] `start-services.bat` oluşturuldu (UTF-8 destekli)

---

## ADIM 6: Versiyon Güncelleme
**Durum:** ✅ TAMAMLANDI

- [x] `app/package.json` → `"version": "1.2.0"`
- [x] `backend/package.json` → `"version": "1.2.0"`

---

## ADIM 7: CHANGELOG.md Oluştur
**Durum:** ✅ TAMAMLANDI

- [x] `CHANGELOG.md` oluşturuldu
- [x] v1.2.0 release notes eklendi
- [x] Sürüm karşılaştırma tablosu eklendi

---

## ADIM 8: Final Test
**Durum:** 🔄 KULLANICI TARAFINDAN YAPILACAK

### Fonksiyonel Testler
- [ ] Münazara başlatma çalışıyor
- [ ] Cache hit toast bildirimi görünüyor
- [ ] Münazara tamamlandığında "Anasayfaya Dön" butonu var
- [ ] "Tekrar Dene" butonu aynı katılımcıyı deniyor

---

## ADIM 9: Git Commit & Push
**Durum:** 🔄 BEKLİYOR

### Yapılacaklar
- [ ] `git add -A`
- [ ] `git commit -m "feat: v1.2.0 - Cache optimization + Toast + All v1.0.1 features"`
- [ ] `git tag v1.2.0`
- [ ] `git push origin main --tags`

**Final Commit Hash:** `_____________`

---

## 📊 İLERLEME ÖZETİ

| Adım | Durum |
|------|-------|
| 0 - Yedek Commit | ✅ |
| 1 - types.ts | ✅ |
| 2 - openRouterService.ts | ✅ |
| 3 - DebateArena.tsx | ✅ |
| 4 - backend/server.js | ⏭️ Atlandı |
| 5 - Yeni Dosyalar | ✅ |
| 6 - Versiyon | ✅ |
| 7 - CHANGELOG | ✅ |
| 8 - Final Test | 🔄 |
| 9 - Git Push | 🔄 |

---

## ✅ TAMAMLANAN ÖZELLİKLER

1. **Cache Optimization**
   - Provider-Based Prompt Caching
   - Runtime Learning (cache-incompatible models)
   - Fallback sistemi

2. **Toast Bildirimleri**
   - Sağ üst köşe, animasyonlu
   - Cache hit, retry, fallback bildirimleri

3. **Kredi Hatası Yönetimi**
   - 402/403 hata tespiti
   - Kullanıcı dostu modal
   - Çözüm önerileri

4. **Dinamik max_tokens**
   - Model context window'a göre hesaplama
   - Min 500, max 4000 sınırları

5. **UI İyileştirmeleri**
   - "Anasayfaya Dön" butonu
   - "Tekrar Dene" fix

6. **Altyapı**
   - start-services.bat
   - CHANGELOG.md
   - TypeScript tip güncellemeleri
