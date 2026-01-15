# 🔧 TETRA Cache Optimizasyon Yol Haritası

> **Son Güncelleme:** Aralık 2024  
> **Durum:** FAZ 1 Tamamlandı, FAZ 2 Beklemede

---

## 📊 Genel Bakış

TETRA münazara platformu için iki aşamalı cache stratejisi planlandı:

| FAZ | Açıklama | Durum | Dosya |
|-----|----------|-------|-------|
| FAZ 1 | Provider-Based Prompt Caching | ✅ **TAMAMLANDI** | `openRouterService.ts` |
| FAZ 2 | Backend Response Cache | ⏸️ **BEKLEMEDE** | - |

---

## ✅ FAZ 1: Provider-Based Prompt Caching (TAMAMLANDI)

### Ne Yapıyor?
- OpenRouter API'ye gönderilen system prompt'lar için provider'a özel cache formatı kullanıyor
- Anthropic/Google: `cache_control: { type: 'ephemeral' }` flag'i
- OpenAI/DeepSeek/Grok: Otomatik prefix caching (doğru sıralama yeterli)

### Beklenen Tasarruf
| Provider | Cache Read Tasarrufu |
|----------|---------------------|
| Anthropic (Claude) | %90 |
| DeepSeek | %90 |
| OpenAI (GPT-4, o1) | %50-75 |
| Google (Gemini) | %75 |
| Grok | %75 |

### Dosya
`app/src/services/openRouterService.ts`

---

## ⏸️ FAZ 2: Backend Response Cache (BEKLEMEDE)

### Ne Yapacak?
Aynı istek (aynı model + aynı mesajlar) tekrar gelirse, API'ye hiç gitmeden backend cache'den dönecek.

### Ne Zaman Gerekli?
- ❌ Normal münazara ilerlemesi → Her tur farklı bağlam, cache HIT etmez
- ✅ Hata sonrası retry → Aynı istek tekrar gönderilir
- ✅ Interrupt/kesinti sonrası devam → Aynı yerden devam
- ⚠️ Sayfa yenileme → State zaten kaybolmuş olabilir

### Neden Şimdi Yapmadık?
Münazarada bağlam sürekli evrimleşiyor:
```
TUR 1: [System] + [Mesaj1]                    → Hash A
TUR 2: [System] + [Mesaj1] + [Mesaj2]         → Hash B (farklı!)
TUR 3: [System] + [Mesaj1] + [Mesaj2] + [M3]  → Hash C (farklı!)
```
Her tur farklı hash üretir → Cache neredeyse hiç HIT etmez.

### Implementasyon Planı (Gerekirse)

#### 1. Backend Endpoint'i
```javascript
// server.js'e eklenecek

// --- RESPONSE CACHE ---
app.get('/api/cache/:hash', (req, res) => {
  const { hash } = req.params;
  const cache = readData('response-cache.json') || {};
  
  if (cache[hash] && Date.now() - cache[hash].timestamp < 24 * 60 * 60 * 1000) {
    console.log(`[CACHE HIT] Hash: ${hash.substring(0, 8)}...`);
    return res.json({ hit: true, data: cache[hash] });
  }
  
  res.json({ hit: false });
});

app.post('/api/cache/:hash', (req, res) => {
  const { hash } = req.params;
  const { response, modelId, tokens } = req.body;
  const cache = readData('response-cache.json') || {};
  
  cache[hash] = {
    response,
    modelId,
    tokens,
    timestamp: Date.now()
  };
  
  // Cache boyutunu kontrol et (max 1000 entry)
  const keys = Object.keys(cache);
  if (keys.length > 1000) {
    // En eski 100 entry'yi sil
    const sortedKeys = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
    sortedKeys.slice(0, 100).forEach(k => delete cache[k]);
  }
  
  writeData('response-cache.json', cache);
  res.json({ success: true });
});
```

#### 2. Frontend Cache Utility
```typescript
// cacheUtils.ts - Oluşturulacak

// SHA-256 hash fonksiyonu
async function generateCacheKey(modelId: string, messages: any[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify({ modelId, messages });
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const ResponseCache = {
  async get(modelId: string, messages: any[]): Promise<any | null> {
    const hash = await generateCacheKey(modelId, messages);
    const res = await fetch(`/api/cache/${hash}`);
    const data = await res.json();
    return data.hit ? data.data : null;
  },

  async set(modelId: string, messages: any[], response: any, tokens: number): Promise<void> {
    const hash = await generateCacheKey(modelId, messages);
    await fetch(`/api/cache/${hash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, modelId, tokens })
    });
  }
};
```

#### 3. openRouterService.ts Entegrasyonu
```typescript
// sendChatCompletion fonksiyonunun başına eklenecek

// Cache kontrolü (FAZ 2)
const cachedResponse = await ResponseCache.get(modelId, messages);
if (cachedResponse) {
  console.log(`[CACHE] 🎯 Backend cache HIT! API'ye gidilmedi.`);
  return {
    text: cachedResponse.response,
    usage: cachedResponse.tokens,
    cost: 0, // Cache'den geldi, maliyet yok
    cachedTokens: cachedResponse.tokens,
    fromCache: true
  };
}

// ... normal API çağrısı ...

// Başarılı response'u cache'e yaz
await ResponseCache.set(modelId, messages, result.text, result.usage);
```

### Bu Dosyayı Ne Zaman Güncellemeliyiz?
- [ ] Retry oranı %5'i geçerse
- [ ] Kullanıcılardan "aynı yanıtı tekrar aldım" şikayetleri gelirse
- [ ] Maliyet analizi yapıldığında gereksiz API çağrıları tespit edilirse

---

## 📈 Maliyet Takibi (İleride)

FAZ 1 ve FAZ 2'nin etkisini ölçmek için:

```typescript
// Telemetri verisi
interface CacheStats {
  totalRequests: number;
  promptCacheHits: number;      // FAZ 1 - Provider cache
  responseCacheHits: number;    // FAZ 2 - Backend cache
  estimatedSavings: number;     // USD
}
```

---

## 🔗 İlgili Dosyalar

- `app/src/services/openRouterService.ts` - FAZ 1 implementasyonu
- `backend/server.js` - Backend API
- `backend/data/response-cache.json` - FAZ 2 cache dosyası (oluşturulacak)

---

## 📝 Notlar

> **Karar (Aralık 2024):** FAZ 2 şimdilik atlandı çünkü münazara senaryosunda her tur farklı bağlam üretiyor. Cache hit oranı çok düşük olacağı için gereksiz karmaşıklık eklememek tercih edildi. Hata/interrupt senaryoları için gerekirse ileride eklenecek.



