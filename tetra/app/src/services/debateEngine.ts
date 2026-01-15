// Debate Engine Service (SYNAPSE)
// Handles message merging, context management, and dynamic prompts

import { Message, Participant, Role, RoundSummary } from '@/types';
import { sendChatCompletion } from './openRouterService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 🆕 LOOP DETECTION: Tekrarlayan içerik tespiti
const calculateSimilarity = (a: string, b: string): number => {
  // Basit Jaccard benzerliği (kelime bazlı)
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
};

const detectLoop = (newContent: string, history: Message[], participantId: string): boolean => {
  // Son 3 mesajı aynı katılımcıdan kontrol et
  const lastMsgs = history
    .filter(m => m.participantId === participantId)
    .slice(-3)
    .map(m => m.content);
  
  for (const oldContent of lastMsgs) {
    const similarity = calculateSimilarity(newContent, oldContent);
    if (similarity > 0.85) {
      console.warn(`[Loop Detection] %${(similarity * 100).toFixed(0)} benzerlik tespit edildi!`);
      return true;
    }
  }
  
  // Ayrıca: Tekrarlayan pattern tespiti (aynı cümle 3+ kez)
  const sentences = newContent.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  const sentenceCounts = new Map<string, number>();
  
  for (const sentence of sentences) {
    const count = (sentenceCounts.get(sentence) || 0) + 1;
    sentenceCounts.set(sentence, count);
    if (count >= 3) {
      console.warn(`[Loop Detection] Tekrarlayan cümle tespit edildi: "${sentence.slice(0, 50)}..."`);
      return true;
    }
  }
  
  return false;
};

// Özet oluşturma prompt şablonu (Geliştirilmiş - Çatışma Tespiti + İlerleme)
const SUMMARY_PROMPT = `
Aşağıdaki münazara turunu ANALİZ ET ve JSON formatında özet çıkar.
SADECE geçerli JSON döndür, başka bir şey yazma.

Format:
{
  "summary": ["madde1", "madde2", "madde3"],
  "speakerHighlights": [
    {"name": "Katılımcı Adı", "contribution": "Katkısının 1 cümlelik özeti"}
  ],
  "decisions": ["karar1", "karar2"],
  "openQuestions": ["soru1", "soru2"],
  "conflicts": ["[İsim1] vs [İsim2]: Konu X'te farklı görüşler"],
  "progressPercent": 30,
  "nextDirective": "Ekip X konusunda somut öneri vermeli"
}

KURALLAR:
1. summary: 3-5 madde, SADECE somut çıktılar (ne teklif edildi, ne kabul edildi)
2. speakerHighlights: HER katılımcı için 1 cümle (kim ne TEZ/ANTİTEZ sundu)
3. decisions: Kesinleşmiş kararlar (yoksa boş dizi)
4. openQuestions: Yanıtlanmamış sorular (yoksa boş dizi)
5. conflicts: ÇATIŞMA/UYUMSUZLUK tespiti. Format: "[İsim1] vs [İsim2]: Konu"
   - İki kişi farklı şey mi söylüyor? YAZI
   - Herkes hemfikir mi? Boş dizi []
6. progressPercent: Münazaranın HEDEFE yakınlığı (0-100 arası tam sayı)
   - 0-20: Henüz konu açılıyor
   - 20-40: Fikirler toplanıyor
   - 40-60: Çatışmalar çözülüyor
   - 60-80: Karar aşaması
   - 80-100: Sonuç netleşiyor
7. nextDirective: Sonraki tur için TEK NET GÖREV/SORU
   - "Ekip, [spesifik konu] için somut öneri verin"
   - Açık uçlu olmasın, direktif olsun

Türkçe yaz, kısa ve öz tut.
`;

// Tur özeti üretmek için gizli API çağrısı
export const generateRoundSummary = async (
  apiKey: string,
  modelId: string,
  roundMessages: Message[],
  allParticipants: Participant[]
): Promise<RoundSummary | null> => {
  try {
    // Mesajları basit metin formatına çevir
    const messagesText = roundMessages.map(m => {
      const speaker = allParticipants.find(p => p.id === m.participantId);
      const name = speaker?.name || 'Unknown';
      const role = speaker?.role || 'Participant';
      return `[${name} (${role})]: ${m.content}`;
    }).join('\n\n');

    const result = await sendChatCompletion(
      apiKey,
      modelId,
      [{ role: 'user', content: `Mesajlar:\n${messagesText}` }],
      SUMMARY_PROMPT
    );

    // JSON parse et
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || [],
        speakerHighlights: parsed.speakerHighlights || [],
        decisions: parsed.decisions || [],
        openQuestions: parsed.openQuestions || [],
        conflicts: parsed.conflicts || [],
        progressPercent: typeof parsed.progressPercent === 'number' ? parsed.progressPercent : 0,
        nextDirective: parsed.nextDirective || '',
        generatedAt: Date.now()
      };
    }
    return null;
  } catch (error) {
    console.error('Round summary generation failed:', error);
    return null;
  }
};

export const generateTurnResponse = async (
  apiKey: string,
  participant: Participant,
  history: Message[],
  topic: string,
  allParticipants: Participant[],
  autoFinish: boolean = false,
  previousRoundSummary?: RoundSummary  // YENİ: Önceki tur özeti
): Promise<{ text: string; usage: number; cost: number }> => {
  
  // 1. Convert internal message history to OpenRouter format with correct roles
  const rawMessages: ChatMessage[] = history.map(m => {
    // Handle User Intervention
    if (m.type === 'intervention') {
      return {
        role: 'user' as const,
        content: `\n\n[SİSTEM UYARISI / KULLANICI MÜDAHALESİ]: ${m.content} \n(Bu talimatı dikkate alarak yanıt ver.)\n\n`
      };
    }

    const speaker = allParticipants.find(p => p.id === m.participantId);
    const name = speaker ? speaker.name : (m.participantId === 'user-admin' ? 'Admin' : m.participantId);
    
    // Determine role relative to the current speaker
    const role: 'user' | 'assistant' = m.participantId === participant.id ? 'assistant' : 'user';
    
    return {
      role,
      content: `[${name}]: ${m.content}`
    };
  });

  // 2. MERGE consecutive messages of the same role
  // Strict APIs (like Claude) fail if they receive [user, user, assistant]
  const mergedHistory: ChatMessage[] = [];
  
  if (rawMessages.length > 0) {
    let currentMsg = { ...rawMessages[0] };
    
    for (let i = 1; i < rawMessages.length; i++) {
      const nextMsg = rawMessages[i];
      if (nextMsg.role === currentMsg.role) {
        currentMsg.content += `\n\n---\n\n${nextMsg.content}`;
      } else {
        mergedHistory.push(currentMsg);
        currentMsg = { ...nextMsg };
      }
    }
    mergedHistory.push(currentMsg);
  }

  // 3. Ensure conversation starts with 'user' (CRITICAL: also handle empty history!)
  // 🆕 FIX: Deterministik açılış - moderatör kendi sorusunu UYDURMASIN
  if (mergedHistory.length === 0) {
    // İlk tur - SABİT FORMAT açılış
    mergedHistory.push({
      role: 'user',
      content: `[Sistem]: Yeni oturum başladı.

AÇILIŞ TALİMATI (AYNEN UYGULA):
Sadece şunu yaz: "Merhaba ekip, [KONU] üzerine çalışacağız. Başlayalım."

KONU: ${topic}

KURALLAR:
- Konuyu AYNEN yaz, değiştirme
- "metodoloji", "yaklaşım", "yöntem", "kanıtlama" gibi kelimeler YASAK
- Kendi sorunu UYDURMA
- Ekstra açıklama YAPMA
- MAX 2 CÜMLE`
    });
  } else if (mergedHistory[0].role === 'assistant') {
    mergedHistory.unshift({
      role: 'user',
      content: `[Sistem]: Oturum devam ediyor.`
    });
  }

  // Context Management: Keep last ~10 merged blocks
  const limitedHistory = mergedHistory.slice(-10);

  // Dynamic System Prompt Construction
  let instruction = `
    KİMLİK:
    Sen ${participant.name} (${participant.modelName})'sin. 
    Rolün: ${participant.systemPrompt}

    ═══════════════════════════════════════════════════════════════
    OTURUM KONUSU (DOKUNULMAZ - AYNEN KULLAN)
    ═══════════════════════════════════════════════════════════════
    ${topic}
    ═══════════════════════════════════════════════════════════════
    
    ⚠️ KONU KORUMA KURALI (KRİTİK):
    Yukarıdaki konu metnini ASLA:
    - Özetleme
    - Kısaltma  
    - Sadeleştirme
    - "Kısaca" diye geçiştirme
    - Kendi kelimelerinle yeniden yazma
    
    Konunun HER DETAYI, HER MADDESİ, HER KURALI tartışmada yer almalı.
    Eğer konu uzunsa, onu parçalara böl ama hiçbir şeyi ATLAMA.
`;

  // ÖNCEKİ TUR ÖZETİ ENJEKSİYONU (Geliştirilmiş - Çatışma + İlerleme)
  if (previousRoundSummary && previousRoundSummary.summary.length > 0) {
    instruction += `
    ════════════════════════════════════════════════════════════════
    📋 ÖNCEKİ TUR ÖZETİ (BU BİLGİYİ KULLAN - TEKRARİ ÖNLE!)
    ════════════════════════════════════════════════════════════════
    
    📊 HEDEF İLERLEME: %${previousRoundSummary.progressPercent || 0}
    
    [SOMUT ÇIKTILAR]
    ${previousRoundSummary.summary.map((s, i) => `${i + 1}. ${s}`).join('\n    ')}
    `;
    
    // KİM NE DEDİ - Tez/Antitez takibi için kritik
    if (previousRoundSummary.speakerHighlights && previousRoundSummary.speakerHighlights.length > 0) {
      instruction += `
    [KİM NE DEDİ - REFERANS VER]
    ${previousRoundSummary.speakerHighlights.map(sh => `• ${sh.name}: ${sh.contribution}`).join('\n    ')}
    `;
    }
    
    // ÇATIŞMALAR - YENİ
    if (previousRoundSummary.conflicts && previousRoundSummary.conflicts.length > 0) {
      instruction += `
    ⚠️ [TESPİT EDİLEN ÇATIŞMALAR - ÇÖZÜLECEK]
    ${previousRoundSummary.conflicts.map(c => `🔥 ${c}`).join('\n    ')}
    `;
    }
    
    if (previousRoundSummary.decisions && previousRoundSummary.decisions.length > 0) {
      instruction += `
    ✅ [KESİNLEŞEN KARARLAR - TARTIŞMA KAPANDI]
    ${previousRoundSummary.decisions.map(d => `✓ ${d}`).join('\n    ')}
    `;
    }
    
    if (previousRoundSummary.openQuestions && previousRoundSummary.openQuestions.length > 0) {
      instruction += `
    ❓ [AÇIK SORULAR - ÖNCELİKLE YANIT VER]
    ${previousRoundSummary.openQuestions.map(q => `→ ${q}`).join('\n    ')}
    `;
    }
    
    // SONRAKİ TUR DİREKTİFİ - YENİ
    if (previousRoundSummary.nextDirective) {
      instruction += `
    🎯 [BU TUR İÇİN DİREKTİF]
    ${previousRoundSummary.nextDirective}
    `;
    }
    
    instruction += `
    ════════════════════════════════════════════════════════════════
    ⚠️ KRİTİK KURALLAR:
    - Yukarıdaki isimlere ATIF yap: "[DevOps]'un önerisine ek olarak..."
    - Kesinleşen kararları TEKRAR tartışma. Kapanmış konu.
    - Çatışma varsa, BİR TARAFI SEÇ ve gerekçele
    - Açık sorulardan BİRİNE SOMUT öneri ver
    - DÖNGÜ YASAK: Önceki turda söylediğini tekrarlama
    ════════════════════════════════════════════════════════════════
    `;
  }

  // Katılımcılar için token limiti (Moderatör ilk turda serbest)
  const isFirstTurn = history.length === 0;
  const isModeratorFirstTurn = participant.role === Role.MODERATOR && isFirstTurn;
  
  if (!isModeratorFirstTurn) {
    instruction += `
    ═══════════════════════════════════════
    📏 KATILIMCI KURALLARI (SIKI LİMİT):
    ═══════════════════════════════════════
    
    1. MAX ${participant.role === Role.MODERATOR ? '80' : '60'} KELİME - Aşarsan kesilirsin
    2. Giriş cümlesi YASAK: "Katılıyorum", "Güzel nokta", "Eklemek isterim" = SİL
    3. Sadece SOMUT öneri/bilgi ver
    4. 1-2 madde veya tek paragraf
    5. İsimle hitap et: "[DevOps], senin önerindeki sorun şu..."
    6. Önceki turda söylediğini TEKRARLAMA
    7. Türkçe konuş
    
    ⚡ ÖRNEK İYİ YANIT:
    "[Nexus], Binder IPC yerine HAL katmanı daha verimli. 
    Gerekçe: 1) Daha az overhead, 2) Root gerektirmez.
    Somut öneri: HAL service olarak implemente edelim."
    
    ❌ ÖRNEK KÖTÜ YANIT:
    "Harika bir tartışma oluyor arkadaşlar. Ben de bu konuda 
    birkaç şey söylemek istiyorum. Öncelikle şunu belirtmeliyim ki..."
    `;
  } else {
    instruction += `
    ═══════════════════════════════════════
    📢 İLK TUR KURALLARI (SABİT FORMAT):
    ═══════════════════════════════════════
    
    SADECE BU FORMATI KULLAN (DEĞİŞTİRME!):
    
    "Merhaba ekip, [KONU_AYNEN_BURAYA] üzerine çalışacağız. Başlayalım."
    
    ⛔ MUTLAK YASAKLAR:
    - "metodoloji" kelimesi YASAK
    - "yaklaşım", "yöntem", "kanıtlama" YASAK
    - Kendi sorunu UYDURMA
    - "İlk odak noktamız" gibi eklemeler YASAK
    - Konuyu yorumlama, sadeleştirme YASAK
    - Akademik dil YASAK
    
    ✅ DOĞRU ÖRNEK:
    "Merhaba ekip, 5x5=25 doğru mu? üzerine çalışacağız. Başlayalım."
    
    ❌ YANLIŞ ÖRNEK:
    "Merhaba ekip, matematiksel önermenin doğruluğunu metodolojik açıdan..."
    
    📏 MAX 2 CÜMLE - FAZLASI HATA!
    `;
  }

  if (participant.role === Role.MODERATOR) {
    instruction += `
    
    ════════════════════════════════════════════════════════════════
    🎯 MODERATÖR ROLÜ: SADECE DİREKTİF VER (ÖZET YAZMA!)
    ════════════════════════════════════════════════════════════════
    
    ⚠️ KRİTİK: Özet YAZMA! Özet zaten UI'da "Tur Raporu" kartında görünüyor.
    Senin görevin SADECE ekibe direktif vermek.
    
    ═══════════════════════════════════════
    📋 MESAJ FORMATI (SABİT - DEĞİŞTİRME!):
    ═══════════════════════════════════════
    
    SADECE şunu yaz (max 2-3 cümle):
    
    "[Direktif cümlesi]. [Varsa çatışma çözümü]. Başlayın."
    
    ✅ DOĞRU ÖRNEKLER:
    - "Ekip, sayı tabanını (Decimal/Octal) kesinleştirin. Başlayın."
    - "[DevOps] ile [Alfa] arasındaki çatışmayı çözün: Hangi yaklaşım? Başlayın."
    - "Mimari katman kararını somutlaştırın. Başlayın."
    
    ❌ YANLIŞ ÖRNEKLER (YAPMA!):
    - "Önceki turda şunlar konuşuldu..." → ÖZET YAZMA!
    - "DevOps şunu dedi, Alfa bunu dedi..." → TEKRAR ETME!
    - "İlerleme %30..." → UI'DA ZATEN VAR!
    - "1️⃣ 2️⃣ 3️⃣ 4️⃣" şablonu → KULLANMA!
    
    ═══════════════════════════════════════
    ⛔ MUTLAK YASAKLAR:
    ═══════════════════════════════════════
    
    ❌ Özet yazmak YASAK (UI'da var)
    ❌ "Önceki turda..." ile başlamak YASAK
    ❌ Katılımcıların dediklerini tekrarlamak YASAK
    ❌ İlerleme yüzdesi yazmak YASAK (UI'da var)
    ❌ Numaralı liste (1️⃣ 2️⃣) YASAK
    ❌ 3 cümleden fazla yazmak YASAK
    
    ═══════════════════════════════════════
    🏁 BİTİŞ KURALLARI:
    ═══════════════════════════════════════
    - "Fikir Birliği Modu": ${autoFinish ? 'AKTİF' : 'PASİF'}.
    - Mod AKTİF ve plan tamamlandıysa:
      1. "Plan kabul edildi: [3 madde özet]"
      2. Yanıtının EN SONUNA [OTURUM_SONLANDI] yaz
    - En az 3 tur geçmeden bitirme
    
    📏 MAX 50 KELİME - FAZLASI HATA!
    `;
  } else {
    instruction += `
     - Sadece kendi uzmanlık alanından konuş. 
     - Asla oturumu sonlandırma yetkin yok.
     `;
  }

  try {
    const result = await sendChatCompletion(
      apiKey,
      participant.modelId,
      limitedHistory,
      instruction
    );
    
    // 🆕 LOOP DETECTION: Tekrarlayan içerik kontrolü
    if (detectLoop(result.text, history, participant.id)) {
      throw new Error('Model döngüye girdi - tekrarlayan içerik tespit edildi. Lütfen farklı bir model deneyin veya konuyu değiştirin.');
    }
    
    return result;
  } catch (error) {
    console.error("Turn generation failed:", error);
    throw error;
  }
};

