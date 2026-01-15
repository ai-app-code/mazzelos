# TETRA AI Debate Protocol - Changelog

Bu dosya projenin sürüm geçmişini ve değişikliklerini içerir.

---

## [1.2.0] - 2025-12-31

### 🆕 Yeni Özellikler

#### Cache Optimizasyonu
- 🔥 **Provider-Based Prompt Caching**: Anthropic, Google, OpenAI, DeepSeek, Grok modelleri için otomatik cache
- 🔄 **Cache Fallback Sistemi**: Cache hatası alınırsa otomatik standart formata geçiş
- 🧠 **Runtime Learning**: Hangi modellerin cache uyumsuz olduğunu çalışma zamanında öğrenir, tekrar denemez
- 💰 Cache hit'lerde %45-90 arası maliyet tasarrufu

#### UI İyileştirmeleri
- 🍞 **Toast Bildirim Sistemi**: Sağ üst köşede anlık bildirimler
  - Cache tasarruf bildirimleri (%X tasarruf)
  - Retry denemeleri (429, 502, 503, 504 hataları)
  - Fallback durumları
- 🏠 **"Anasayfaya Dön" Butonu**: Münazara tamamlandığında görünür
- 🔧 **"Tekrar Dene" Butonu Fix**: Başarısız katılımcıyla gerçekten tekrar deniyor (nextTurn yerine executeTurn)

#### API Kredi/Limit Yönetimi
- 💳 402/403 hataları için özel modal
- Kullanıcı dostu hata mesajları ve çözüm önerileri
- OpenRouter ayarlarına direkt link

#### Dinamik max_tokens
- Model context window'una göre otomatik hesaplama
- `estimateContextWindow()` ve `calculateMaxTokens()` fonksiyonları
- Küçük modeller için güvenli (min 500), büyük modeller için yeterli token (max 4000)

#### Tip Güncellemeleri (TypeScript)
- `Participant.contextWindow?: number` eklendi
- `DebateStatus.REVISION` enum değeri eklendi
- `CatalystType`, `RevisionOutcome`, `RevisionRequest` tipleri eklendi
- `RoundType = 'NORMAL' | 'REVISION'` eklendi
- `DebateConfig` ve `DebateArchive` revizyon alanları eklendi

### 🔧 İyileştirmeler

- API key başındaki/sonundaki boşlukları temizleme (`.trim()`)
- 401 hataları için detaylı debug logu
- Retry mekanizmasında UI bildirimi (toast)
- Fallback durumunda model cache-incompatible olarak işaretleniyor

### 📦 Yeni Dosyalar

- `start-services.bat` - Tek tıkla backend/frontend başlatma (UTF-8 destekli)
- `CHANGELOG.md` - Bu dosya
- `UPGRADE_v1.2.0_TASKLIST.md` - Yükseltme görev listesi

---

## [1.0.1] - 2025-12-15 (feature branch, merge edilmedi)

### Özellikler
- API kredi/limit hatası yönetimi (402/403)
- Dinamik max_tokens hesaplaması
- Yarı-otomatik modda tur sonu duraklatma düzeltmesi
- Revizyon modu tip tanımları
- Revizyon API endpoint'leri

---

## [1.0.0] - 2025-12-13

### İlk Sürüm
- TETRA AI Debate Protocol temel mimarisi
- React + TypeScript + Vite frontend
- Express.js backend
- OpenRouter API entegrasyonu
- Model havuzu yönetimi
- Münazara arşivleme sistemi
- Prompt şablonları

---

## Sürüm Karşılaştırması

| Özellik | v1.0.0 | v1.0.1 | v1.2.0 |
|---------|--------|--------|--------|
| Cache Sistemi | ❌ | ❌ | ✅ |
| Toast Bildirimleri | ❌ | ❌ | ✅ |
| Runtime Learning | ❌ | ❌ | ✅ |
| Kredi Hatası Modal | ❌ | ✅ | ✅ |
| Dinamik max_tokens | ❌ | ✅ | ✅ |
| Anasayfaya Dön | ❌ | ✅ | ✅ |
| Revizyon Modu | ❌ | Kısmi | Kısmi |
| start-services.bat | ❌ | ✅ | ✅ |
