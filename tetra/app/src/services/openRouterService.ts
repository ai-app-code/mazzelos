/**
 * TETRA AI Debate - OpenRouter Service
 * 
 * 🔧 CACHE STRATEJİSİ:
 * - FAZ 1 (AKTİF): Provider-based prompt caching (Anthropic, OpenAI, DeepSeek, vs.)
 * - FAZ 2 (BEKLEMEDE): Backend response cache - Gerekirse bkz: docs/CACHE_ROADMAP.md
 * 
 * @see docs/CACHE_ROADMAP.md - Detaylı cache yol haritası
 */

import { LLMModel, Provider } from '@/types';

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

// 🆕 Anthropic cache_control için content part tipi
interface ContentPart {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

// ------------------------------------------------------------------
// 🆕 UI BİLDİRİM SİSTEMİ
// ------------------------------------------------------------------
export type OpenRouterEventType =
  | 'cache_fallback_started'    // Cache hatası, fallback başlıyor
  | 'cache_fallback_success'    // Fallback başarılı
  | 'cache_fallback_failed'     // Fallback da başarısız
  | 'retry_started'             // Retry başlıyor
  | 'retry_success'             // Retry başarılı
  | 'model_marked_incompatible' // Model cache-incompatible olarak işaretlendi
  | 'cache_hit';                // Cache hit (tasarruf)

export interface OpenRouterEvent {
  type: OpenRouterEventType;
  modelId: string;
  message: string;
  attempt?: number;
  maxAttempts?: number;
  savedPercent?: number;
}

type EventListener = (event: OpenRouterEvent) => void;
const eventListeners: EventListener[] = [];

// UI bileşenleri bu fonksiyonu kullanarak olayları dinleyebilir
export const onOpenRouterEvent = (listener: EventListener): (() => void) => {
  eventListeners.push(listener);
  // Unsubscribe fonksiyonu döndür
  return () => {
    const index = eventListeners.indexOf(listener);
    if (index > -1) eventListeners.splice(index, 1);
  };
};

// İç kullanım: Event tetikle
const emitEvent = (event: OpenRouterEvent) => {
  console.log(`[OpenRouter Event] ${event.type}:`, event.message);
  eventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (e) {
      console.error('[OpenRouter Event] Listener error:', e);
    }
  });
};

// ------------------------------------------------------------------
// 🚀 FAZ 1: Provider-Based Prompt Caching
// ------------------------------------------------------------------

// Cache destekleyen provider'lar ve keyword'leri
const CACHE_PROVIDERS = {
  // Anthropic: Manuel cache_control gerekli, %90 tasarruf (cache read)
  ANTHROPIC: ['anthropic', 'claude'],

  // DeepSeek: Otomatik prefix cache, %90 tasarruf
  DEEPSEEK: ['deepseek'],

  // OpenAI: Otomatik (1024+ token), %50-75 tasarruf
  OPENAI: ['openai', 'gpt-4', 'gpt-3.5', 'o1', 'o3'],

  // Google Gemini: Manuel cache_control gerekli (Anthropic gibi)
  GOOGLE: ['google', 'gemini'],

  // Grok: Otomatik, %75 tasarruf
  GROK: ['grok', 'x-ai'],

  // Groq: Otomatik (Kimi K2 modelleri)
  GROQ: ['groq'],

  // Moonshot: Otomatik
  MOONSHOT: ['moonshot', 'kimi'],
};

// 🆕 Cache hatalarını takip et (debug için)
const cacheErrors: Array<{ modelId: string; error: string; timestamp: number }> = [];

// 🆕 RUNTIME LEARNING: Cache uyumsuz modelleri öğren
// Bir model cache hatası verirse, sonraki isteklerde direkt standart format kullanılır
const cacheIncompatibleModels = new Set<string>();

// 🆕 Model cache uyumlu mu kontrol et (runtime öğrenme dahil)
const isModelCacheCompatible = (modelId: string): boolean => {
  return !cacheIncompatibleModels.has(modelId);
};

// 🆕 Modeli cache-incompatible olarak işaretle
const markModelCacheIncompatible = (modelId: string) => {
  if (!cacheIncompatibleModels.has(modelId)) {
    cacheIncompatibleModels.add(modelId);
    console.warn(`[OpenRouter] 🚫 Model "${modelId}" cache-incompatible olarak işaretlendi. Sonraki isteklerde standart format kullanılacak.`);
  }
};

// Model ID'ye göre provider türünü belirle
const getProviderType = (modelId: string): string => {
  const lowerId = modelId.toLowerCase();

  if (CACHE_PROVIDERS.ANTHROPIC.some(k => lowerId.includes(k))) return 'ANTHROPIC';
  if (CACHE_PROVIDERS.DEEPSEEK.some(k => lowerId.includes(k))) return 'DEEPSEEK';
  if (CACHE_PROVIDERS.OPENAI.some(k => lowerId.includes(k))) return 'OPENAI';
  if (CACHE_PROVIDERS.GOOGLE.some(k => lowerId.includes(k))) return 'GOOGLE';
  if (CACHE_PROVIDERS.GROK.some(k => lowerId.includes(k))) return 'GROK';
  if (CACHE_PROVIDERS.GROQ.some(k => lowerId.includes(k))) return 'GROQ';
  if (CACHE_PROVIDERS.MOONSHOT.some(k => lowerId.includes(k))) return 'MOONSHOT';

  return 'OTHER';
};

// Cache destekli mi? (Loglama için)
const isCacheSupported = (providerType: string): boolean => {
  return providerType !== 'OTHER';
};

// 🆕 Cache hatasını logla ve kaydet
const logCacheError = (modelId: string, error: string, context?: string) => {
  const errorEntry = {
    modelId,
    error,
    context: context || '',
    timestamp: Date.now()
  };

  cacheErrors.push(errorEntry);

  // Son 50 hatayı tut
  if (cacheErrors.length > 50) {
    cacheErrors.shift();
  }

  console.warn(`[OpenRouter] ⚠️ CACHE UYARI: Model=${modelId}`, {
    error,
    context,
    suggestion: 'Bu model için cache formatı sorunlu olabilir. Standart formata fallback edildi.',
    action: 'CACHE_ROADMAP.md dosyasına bu modeli ekle veya CACHE_PROVIDERS listesini güncelle.'
  });
};

// 🆕 Cache hatalarını dışa aktar (debug için)
export const getCacheErrors = () => [...cacheErrors];

// 🆕 Cache-incompatible modelleri dışa aktar (debug için)
export const getCacheIncompatibleModels = () => [...cacheIncompatibleModels];

// 🆕 Tüm cache durumunu dışa aktar (debug/UI için)
export const getCacheStatus = () => ({
  incompatibleModels: [...cacheIncompatibleModels],
  recentErrors: cacheErrors.slice(-10),
  totalErrorCount: cacheErrors.length
});

// 🆕 Bilinmeyen model uyarısı
const logUnknownModel = (modelId: string) => {
  console.info(`[OpenRouter] 🔍 BİLİNMEYEN MODEL: "${modelId}"`, {
    providerType: 'OTHER',
    cacheStatus: 'Desteklenmiyor (standart format kullanılıyor)',
    suggestion: 'Bu model cache destekliyorsa CACHE_PROVIDERS listesine ekle.',
    docFile: 'docs/CACHE_ROADMAP.md'
  });
};

// ------------------------------------------------------------------
// 🆕 DİNAMİK max_tokens KONTROLÜ (v1.0.1'den)
// ------------------------------------------------------------------

/**
 * Model ID'ye göre context window tahmin eder (model ID pattern'lerine göre)
 * Eğer bilinmiyorsa güvenli bir default döner
 */
const estimateContextWindow = (modelId: string): number => {
  const lowerId = modelId.toLowerCase();

  // Büyük modeller (128K+)
  if (lowerId.includes('gpt-4-turbo') || lowerId.includes('gpt-4o') ||
    lowerId.includes('claude-3-5') || lowerId.includes('claude-3-opus') ||
    lowerId.includes('claude-3-sonnet') || lowerId.includes('gemini-2.0') ||
    lowerId.includes('gemini-1.5-pro') || lowerId.includes('gemini-1.5-flash')) {
    return 200000; // 200K
  }

  // Orta-büyük modeller (32K-128K)
  if (lowerId.includes('gpt-4') || lowerId.includes('claude-3') ||
    lowerId.includes('gemini-1.5') || lowerId.includes('gemini-pro')) {
    return 100000; // 100K
  }

  // Orta modeller (8K-32K)
  if (lowerId.includes('gpt-3.5') || lowerId.includes('claude-2') ||
    lowerId.includes('gemini') || lowerId.includes('grok')) {
    return 32000; // 32K
  }

  // Küçük modeller (2K-8K)
  if (lowerId.includes('llama-3.2-3b') || lowerId.includes('llama-3.1-8b') ||
    lowerId.includes('phi-3') || lowerId.includes('qwen-2.5-7b')) {
    return 8000; // 8K
  }

  // Çok küçük modeller (1K-2K)
  if (lowerId.includes('1b') || lowerId.includes('3b') || lowerId.includes('7b')) {
    return 4000; // 4K
  }

  // Bilinmeyen modeller için güvenli default
  return 16000; // 16K (çoğu model için yeterli)
};

/**
 * Model context window'una göre dinamik max_tokens hesaplar
 * Formül: contextWindow'un %25'i (min: 500, max: 4000)
 * Bu sayede küçük modeller için güvenli, büyük modeller için yeterli alan
 */
const calculateMaxTokens = (modelId: string, contextWindow?: number): number => {
  const estimatedContext = contextWindow || estimateContextWindow(modelId);

  // Context window'un %25'ini al (ama min 500, max 4000)
  const calculated = Math.floor(estimatedContext * 0.25);

  // Güvenli sınırlar
  const minTokens = 500;   // Çok küçük modeller için minimum
  const maxTokens = 4000;  // Çok büyük modeller için maksimum (maliyet kontrolü)

  const result = Math.max(minTokens, Math.min(maxTokens, calculated));

  console.log(`[OpenRouter] 📊 max_tokens: ${result} (model: ${modelId}, context: ${estimatedContext})`);

  return result;
};

// ------------------------------------------------------------------
// API Functions
// ------------------------------------------------------------------

// Fetch available models from OpenRouter
export const fetchOpenRouterModels = async (apiKey: string): Promise<LLMModel[]> => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'TETRA AI Debate',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawModels: OpenRouterModel[] = data.data;

    const mappedModels: LLMModel[] = rawModels
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: Provider.OPENROUTER,
        contextWindow: m.context_length,
        inputCost: parseFloat(m.pricing.prompt) * 1000000,
        outputCost: parseFloat(m.pricing.completion) * 1000000,
        description: m.description || 'High-performance model hosted via OpenRouter.',
        tags: ['External'],
        isConnected: true
      }))
      .sort((a, b) => b.contextWindow - a.contextWindow);

    return mappedModels;
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    return [];
  }
};

// ------------------------------------------------------------------
// 🔥 MAIN: Send Chat Completion with Provider-Based Caching
// ------------------------------------------------------------------
export const sendChatCompletion = async (
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  systemPrompt: string,
  contextWindow?: number  // 🆕 Dinamik max_tokens hesaplaması için model'in context window değeri
): Promise<{ text: string; usage: number; cost: number; cachedTokens?: number; cacheDiscount?: number }> => {

  // 🆕 API Key temizleme (boşluk, görünmez karakterler)
  apiKey = apiKey?.trim() || '';

  // Validation
  if (!apiKey) {
    throw new Error('API anahtarı bulunamadı. Lütfen API Anahtarları sayfasından OpenRouter anahtarınızı girin.');
  }

  // 🆕 Debug log (ilk 10 ve son 4 karakter)
  console.log(`[OpenRouter] 🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)} (${apiKey.length} karakter)`);

  if (!modelId || modelId.trim() === '') {
    throw new Error('Model ID bulunamadı. Lütfen katılımcılara model atayın.');
  }

  // Provider tipini belirle
  const providerType = getProviderType(modelId);
  const cacheSupported = isCacheSupported(providerType);

  // 🆕 Bilinmeyen model uyarısı
  if (providerType === 'OTHER') {
    logUnknownModel(modelId);
  }

  // Final mesaj listesi
  let finalMessages: any[] = [];

  // 🆕 Cache formatı kullanıldı mı? (hata takibi için)
  let cacheFormatUsed = false;
  let cacheFormatFailed = false;

  // ------------------------------------------------------------------
  // 1️⃣ SYSTEM PROMPT - Provider'a Göre Cache Formatı (Güvenli + Runtime Learning)
  // ------------------------------------------------------------------
  if (systemPrompt) {
    // 🆕 RUNTIME LEARNING: Bu model daha önce cache hatası verdi mi?
    const modelCacheCompatible = isModelCacheCompatible(modelId);

    if (!modelCacheCompatible) {
      // Bu model daha önce cache hatası verdi, direkt standart format kullan
      console.log(`[OpenRouter] ⚡ Model "${modelId}" cache-incompatible listesinde. Standart format kullanılıyor.`);
      finalMessages.push({ role: 'system', content: systemPrompt });
      cacheFormatUsed = false;
    } else {
      try {
        if (providerType === 'ANTHROPIC' || providerType === 'GOOGLE') {
          // ✅ ANTHROPIC & GOOGLE: Manuel cache_control gerekli
          // System prompt'u content array formatında gönder
          finalMessages.push({
            role: 'system',
            content: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' }
              }
            ]
          });
          cacheFormatUsed = true;
        } else {
          // ✅ DİĞERLERİ (OpenAI, DeepSeek, Grok, vs.): Standart string
          // Prefix caching için EN BAŞTA olması yeterli
          finalMessages.push({ role: 'system', content: systemPrompt });

          // Bilinen cache destekli provider'lar için işaretle
          if (cacheSupported) {
            cacheFormatUsed = true;
          }
        }
      } catch (formatError: any) {
        // 🆕 FALLBACK: Cache formatı oluştururken hata olursa standart format kullan
        cacheFormatFailed = true;
        logCacheError(modelId, formatError.message, 'System prompt cache format oluşturma');
        markModelCacheIncompatible(modelId); // 🆕 Runtime learning

        // Güvenli fallback: Her zaman çalışan standart string format
        finalMessages.push({ role: 'system', content: systemPrompt });
      }
    }
  }

  // ------------------------------------------------------------------
  // 2️⃣ MESAJ GEÇMİŞİ - Sıralama Kritik!
  // ------------------------------------------------------------------
  // Prefix Caching için sıra: System → History → User (son mesaj)
  // Bu sıra bozulursa cache çalışmaz!

  const historyMessages = messages.length > 0
    ? messages
    : [{ role: 'user' as const, content: 'Lütfen başla.' }];

  // Mesajları ekle (string content olarak normalize et)
  historyMessages.forEach(msg => {
    finalMessages.push({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    });
  });

  // ------------------------------------------------------------------
  // 3️⃣ PAYLOAD OLUŞTUR
  // ------------------------------------------------------------------
  // 🆕 DİNAMİK max_tokens: Model context window'una göre hesaplanır
  const dynamicMaxTokens = calculateMaxTokens(modelId, contextWindow);

  const payload: any = {
    model: modelId,
    messages: finalMessages,
    temperature: 0.7,
    max_tokens: dynamicMaxTokens, // 🆕 Dinamik: Her model için uygun değer
  };

  // Cache-friendly routing için provider ayarı (opsiyonel)
  if (cacheSupported) {
    payload.provider = {
      // Cache'li isteklerin aynı node'a gitmesini sağla
      allow_fallbacks: false
    };
  }

  // 🆕 Detaylı istek logu
  console.log(`[OpenRouter] 📤 İstek:`, {
    model: modelId,
    provider: providerType,
    cacheSupported: cacheSupported ? '✅ Evet' : '❌ Hayır',
    cacheFormatUsed: cacheFormatUsed ? '✅ Uygulandı' : '❌ Standart format',
    messageCount: finalMessages.length
  });

  // ------------------------------------------------------------------
  // 4️⃣ API İSTEĞİ (Retry + Timeout)
  // ------------------------------------------------------------------
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 90000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn(`[OpenRouter] ⏱️ Timeout! Model: ${modelId}, ${TIMEOUT_MS / 1000}s aşıldı`);
      }, TIMEOUT_MS);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'TETRA AI Debate',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 🆕 KREDİ/LİMİT HATASI TESPİTİ (402, 403)
      // Bu hatalar retry yapılmamalı - kullanıcının aksiyonu gerekli
      if (response.status === 402 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';
        const providerError = errorData.error?.metadata?.provider_error || '';
        const rawError = errorData.error?.metadata?.raw || '';
        const fullError = [errorMessage, providerError, rawError].filter(Boolean).join(' ');

        // Kredi/limit hatası mı kontrol et
        const isCreditsError =
          response.status === 402 ||
          fullError.toLowerCase().includes('limit exceeded') ||
          fullError.toLowerCase().includes('insufficient') ||
          fullError.toLowerCase().includes('credit') ||
          fullError.toLowerCase().includes('balance') ||
          fullError.toLowerCase().includes('quota');

        if (isCreditsError) {
          console.error(`[OpenRouter] 💳 KREDİ/LİMİT HATASI: ${modelId}`, { status: response.status, error: fullError });

          // Özel hata objesi fırlat - DebateArena'da yakalanacak
          const creditsError = new Error(`API_CREDITS_EXHAUSTED`);
          (creditsError as any).isCreditsError = true;
          (creditsError as any).statusCode = response.status;
          (creditsError as any).modelId = modelId;
          (creditsError as any).details = fullError || 'API krediniz veya limitiniz tükendi.';
          (creditsError as any).settingsUrl = 'https://openrouter.ai/settings/keys';
          throw creditsError;
        }
      }

      // 🆕 GEÇİCİ HATA RETRY MEKANİZMASI
      // Rate Limit (429), Bad Gateway (502), Service Unavailable (503), Gateway Timeout (504)
      const RETRYABLE_STATUS_CODES = [429, 502, 503, 504, 520, 522, 524];
      const isRetryableError = RETRYABLE_STATUS_CODES.includes(response.status);

      if (isRetryableError) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt + 1) * 1000; // Exponential backoff: 2s, 4s, 8s
          const statusName = {
            429: 'Rate Limit',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
            520: 'Unknown Error',
            522: 'Connection Timed Out',
            524: 'A Timeout Occurred'
          }[response.status] || 'Error';

          console.warn(`[OpenRouter] ⚠️ ${statusName} (${response.status}) ${modelId}. ${delay}ms bekleniyor... (Deneme ${attempt + 1}/${MAX_RETRIES})`);

          // 🆕 UI BİLDİRİMİ: Retry başladı
          emitEvent({
            type: 'retry_started',
            modelId,
            message: `${modelId.split('/').pop()}: ${statusName} - Deneme ${attempt + 1}/${MAX_RETRIES}`,
            attempt: attempt + 1,
            maxAttempts: MAX_RETRIES
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error(`Geçici hata (${response.status}). Model meşgul veya erişilemiyor. Lütfen biraz bekleyip tekrar deneyin.`);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        const providerError = errorData.error?.metadata?.provider_error || '';
        const errorMessage = errorData.error?.message || '';
        const errorCode = errorData.error?.code || '';
        const rawError = errorData.error?.metadata?.raw || '';

        const fullErrorDetail = [providerError, errorMessage, rawError, errorCode]
          .filter(Boolean).join(' | ') || response.statusText;

        console.error(`[OpenRouter] ❌ Model: ${modelId}, Status: ${response.status}, Error:`, errorData);

        // 🆕 GENİŞLETİLMİŞ FALLBACK: Cache formatı kullanıldıysa VE hata olduysa
        // Artık sadece belirli hata mesajları değil, TÜM hatalar için fallback dene
        const shouldTryFallback = cacheFormatUsed && !cacheFormatFailed;

        // Ek olarak: Spesifik cache hata tespiti (loglama için)
        const isCacheFormatError =
          fullErrorDetail.toLowerCase().includes('cache') ||
          fullErrorDetail.toLowerCase().includes('content') ||
          fullErrorDetail.toLowerCase().includes('format') ||
          fullErrorDetail.toLowerCase().includes('invalid') ||
          fullErrorDetail.toLowerCase().includes('schema') ||
          response.status === 400; // Bad Request genellikle format hatası

        if (shouldTryFallback) {
          // 🔄 CACHE FORMAT HATASI - Fallback dene
          const errorContext = isCacheFormatError
            ? 'Cache format reddedildi'
            : 'Genel API hatası (cache formatı şüpheli)';
          logCacheError(modelId, fullErrorDetail, `API Status: ${response.status} - ${errorContext}`);

          console.warn(`[OpenRouter] 🔄 CACHE FALLBACK: ${modelId} için standart format deneniyor...`);

          // 🆕 UI BİLDİRİMİ: Fallback başladı
          emitEvent({
            type: 'cache_fallback_started',
            modelId,
            message: `${modelId.split('/').pop()} için standart format deneniyor...`
          });

          // Standart format ile tekrar dene (recursive değil, sadece mesajları düzelt)
          const fallbackMessages = [
            { role: 'system', content: systemPrompt },
            ...historyMessages.map(msg => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            }))
          ];

          const fallbackPayload = {
            model: modelId,
            messages: fallbackMessages,
            temperature: 0.7,
            max_tokens: calculateMaxTokens(modelId, contextWindow), // 🆕 Dinamik: Her model için uygun değer
          };

          console.log(`[OpenRouter] 🔄 Fallback istek gönderiliyor (cache devre dışı)...`);

          const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.href,
              'X-Title': 'TETRA AI Debate',
            },
            body: JSON.stringify(fallbackPayload),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackChoice = fallbackData.choices?.[0];

            if (fallbackChoice) {
              console.log(`[OpenRouter] ✅ FALLBACK BAŞARILI: ${modelId} standart format ile çalıştı`);

              // 🆕 RUNTIME LEARNING: Bu modeli cache-incompatible olarak işaretle
              markModelCacheIncompatible(modelId);

              // 🆕 UI BİLDİRİMİ: Fallback başarılı
              emitEvent({
                type: 'cache_fallback_success',
                modelId,
                message: `${modelId.split('/').pop()} standart format ile başarılı!`
              });
              emitEvent({
                type: 'model_marked_incompatible',
                modelId,
                message: `${modelId.split('/').pop()} cache-incompatible olarak işaretlendi`
              });

              return {
                text: fallbackChoice.message?.content || '',
                usage: fallbackData.usage?.total_tokens || 0,
                cost: (fallbackData.usage?.total_tokens || 0) / 1000000,
                cachedTokens: 0,
                cacheDiscount: 0
              };
            }
          }

          // Fallback da başarısız olduysa orijinal hatayı göster
          console.error(`[OpenRouter] ❌ FALLBACK DA BAŞARISIZ: ${modelId}`);
          // Yine de modeli işaretle - belki farklı bir sorun var ama cache'i denemeyeceğiz
          markModelCacheIncompatible(modelId);

          // 🆕 UI BİLDİRİMİ: Fallback başarısız
          emitEvent({
            type: 'cache_fallback_failed',
            modelId,
            message: `${modelId.split('/').pop()} için fallback da başarısız oldu`
          });
        }

        throw new Error(`Model Erişim Hatası (${modelId}): ${fullErrorDetail} [Status: ${response.status}]`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error('Model boş yanıt döndü. Farklı bir model deneyin.');
      }

      // ------------------------------------------------------------------
      // 5️⃣ CACHE TELEMETRİSİ
      // ------------------------------------------------------------------
      const usage = data.usage?.total_tokens || 0;

      // Cache bilgilerini çıkar (provider'a göre farklı field'lar)
      let cachedTokens = 0;
      let cacheDiscount = 0;

      // OpenAI format
      if (data.usage?.prompt_tokens_details?.cached_tokens) {
        cachedTokens = data.usage.prompt_tokens_details.cached_tokens;
      }

      // Anthropic format
      if (data.usage?.cache_read_input_tokens) {
        cachedTokens = data.usage.cache_read_input_tokens;
      }

      // OpenRouter cache_discount field (varsa)
      if (data.cache_discount) {
        cacheDiscount = data.cache_discount;
      }

      // Maliyet tahmini (basit)
      const cost = (usage / 1000000) * 1;

      // Cache loglama
      if (cachedTokens > 0) {
        const savedPercent = Math.round((cachedTokens / (data.usage?.prompt_tokens || 1)) * 100);
        console.log(`[OpenRouter] 🔥 CACHE HIT! Model: ${modelId} | Cache: ${cachedTokens} token (%${savedPercent} tasarruf)`);

        // 🆕 UI BİLDİRİMİ: Cache hit
        emitEvent({
          type: 'cache_hit',
          modelId,
          message: `${modelId.split('/').pop()}: %${savedPercent} tasarruf (${cachedTokens} token)`,
          savedPercent
        });
      } else if (cacheSupported) {
        console.log(`[OpenRouter] 📝 Cache WRITE: ${modelId} | Sonraki isteklerde cache aktif olacak`);
      }

      console.log(`[OpenRouter] ✅ Başarılı: ${usage} token kullanıldı`);

      return {
        text: choice.message?.content || '',
        usage,
        cost,
        cachedTokens,
        cacheDiscount
      };

    } catch (error: any) {
      lastError = error;

      // 🆕 TIMEOUT VE NETWORK HATALARI İÇİN RETRY
      const isNetworkError = error.name === 'AbortError' ||
        error.name === 'TypeError' ||
        error.message?.includes('fetch') ||
        error.message?.includes('network');

      if (isNetworkError && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[OpenRouter] 🔄 Network hatası (${error.name}). ${delay}ms bekleniyor... (Deneme ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (error.name === 'AbortError') {
        throw new Error(`⏱️ Zaman Aşımı: ${modelId} modeli ${TIMEOUT_MS / 1000} saniye içinde yanıt vermedi. ${MAX_RETRIES} deneme yapıldı. Model meşgul veya yavaş olabilir.`);
      }

      // Diğer hatalar için direkt fırlat
      throw error;
    }
  }

  throw lastError || new Error("Bilinmeyen hata");
};

// ------------------------------------------------------------------
// Model Erişim Testi - GERÇEKÇİ TEST (Münazara koşullarını simüle eder)
// ------------------------------------------------------------------
export const testModelAccess = async (
  apiKey: string,
  modelId: string
): Promise<{ success: boolean; error?: string }> => {
  // 🆕 API Key temizleme
  apiKey = apiKey?.trim() || '';

  if (!apiKey) {
    return { success: false, error: 'API anahtarı bulunamadı' };
  }

  console.log(`[OpenRouter Test] 🔑 Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);

  try {
    // 🆕 GERÇEKÇİ TEST: Münazara koşullarını simüle et
    // Basit "test" yerine sistem promptu + anlamlı soru gönder
    const testSystemPrompt = "Sen bir teknik uzman olarak kısa ve öz yanıtlar veriyorsun.";
    const testUserMessage = "Merhaba, hazır mısın? Tek kelime ile yanıt ver.";

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'TETRA AI Debate',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: testSystemPrompt },
          { role: 'user', content: testUserMessage }
        ],
        max_tokens: 50, // Biraz daha uzun ama hala kısa
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      const providerError = errorData.error?.metadata?.provider_error || '';
      const errorMessage = errorData.error?.message || '';
      const errorCode = errorData.error?.code || '';
      const rawError = errorData.error?.metadata?.raw || '';

      const fullErrorDetail = [providerError, errorMessage, rawError, errorCode]
        .filter(Boolean).join(' | ') || response.statusText;

      console.error(`[OpenRouter Test] Model: ${modelId}, Status: ${response.status}, Error:`, errorData);

      // 🆕 401 için özel uyarı
      if (response.status === 401) {
        console.error(`[OpenRouter] ⚠️ 401 AUTH HATASI! API Key geçersiz veya silinmiş olabilir.`);
      }

      // 🆕 KREDİ/LİMİT HATASI TESPİTİ (402, 403)
      if (response.status === 402 || response.status === 403) {
        const isCreditsError =
          fullErrorDetail.toLowerCase().includes('limit exceeded') ||
          fullErrorDetail.toLowerCase().includes('insufficient') ||
          fullErrorDetail.toLowerCase().includes('credit') ||
          fullErrorDetail.toLowerCase().includes('balance') ||
          fullErrorDetail.toLowerCase().includes('quota') ||
          response.status === 402; // 402 = Payment Required

        if (isCreditsError) {
          return {
            success: false,
            error: `💳 API Kredi/Limit Hatası: ${response.status === 402 ? 'Yetersiz bakiye' : 'Limit aşıldı'}. OpenRouter hesabınıza kredi yükleyin veya ücretsiz model deneyin.`,
            isCreditsError: true
          } as any;
        }
      }

      return {
        success: false,
        error: `[${response.status}] ${fullErrorDetail}`
      };
    }

    // 🆕 YANIT KALİTESİ KONTROLÜ: Boş yanıt veriyorsa uyar
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content || content.trim().length < 2) {
      console.warn(`[OpenRouter Test] Model ${modelId} boş yanıt verdi, münazarada sorun çıkabilir.`);
      return {
        success: true, // Erişim var ama uyarı
        error: '⚠️ Model erişilebilir ama boş yanıt verdi. Münazarada sorun çıkabilir.'
      };
    }

    console.log(`[OpenRouter Test] ✅ Model ${modelId} hazır: "${content.substring(0, 30)}..."`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ------------------------------------------------------------------
// 📊 Cache İstatistikleri (Opsiyonel - UI için)
// ------------------------------------------------------------------
export const getCacheStats = (modelId: string): { provider: string; cacheSupported: boolean; expectedSavings: string } => {
  const providerType = getProviderType(modelId);
  const cacheSupported = isCacheSupported(providerType);

  const savingsMap: Record<string, string> = {
    'ANTHROPIC': '%90 (cache read)',
    'DEEPSEEK': '%90 (otomatik)',
    'OPENAI': '%50-75 (otomatik)',
    'GOOGLE': '%75 (cache read)',
    'GROK': '%75 (otomatik)',
    'GROQ': 'Değişken',
    'MOONSHOT': 'Değişken',
    'OTHER': 'Yok'
  };

  return {
    provider: providerType,
    cacheSupported,
    expectedSavings: savingsMap[providerType] || 'Bilinmiyor'
  };
};
