
import { Message, DebateParticipant, ParticipantRole } from '../types';
import { sendChatCompletion } from './openRouterService';

export const generateTurnResponse = async (
  apiKey: string,
  participant: DebateParticipant,
  history: Message[],
  topic: string,
  allParticipants: DebateParticipant[],
  autoFinish: boolean = false
): Promise<{ text: string; usage: number; cost: number }> => {
  
  // 1. Convert internal message history to OpenRouter format with correct roles
  const rawMessages = history.map(m => {
    // Handle User Intervention
    // CHANGED: Use 'user' instead of 'system' for interventions to prevent 400 errors on strict providers (Anthropic)
    if (m.type === 'intervention') {
      return {
        role: 'user', 
        content: `\n\n[SİSTEM UYARISI / KULLANICI MÜDAHALESİ]: ${m.content} \n(Bu talimatı dikkate alarak yanıt ver.)\n\n`
      };
    }

    const speaker = allParticipants.find(p => p.id === m.participantId);
    const name = speaker ? speaker.name : (m.participantId === 'user-admin' ? 'Admin' : m.participantId);
    
    // Determine role relative to the current speaker
    // If the message was sent by the current participant (in the past), they are 'assistant'
    // Everyone else is 'user'
    const role = m.participantId === participant.id ? 'assistant' : 'user';
    
    return {
      role, 
      content: `[${name}]: ${m.content}`
    };
  });

  // 2. MERGE consecutive messages of the same role
  // Strict APIs (like Claude) fail if they receive [user, user, assistant]. It must be [user, assistant].
  const mergedHistory: { role: string; content: string }[] = [];
  
  if (rawMessages.length > 0) {
    let currentMsg = { ...rawMessages[0] };
    
    for (let i = 1; i < rawMessages.length; i++) {
      const nextMsg = rawMessages[i];
      if (nextMsg.role === currentMsg.role) {
        // Merge content with a clear separator
        currentMsg.content += `\n\n---\n\n${nextMsg.content}`;
      } else {
        mergedHistory.push(currentMsg);
        currentMsg = { ...nextMsg };
      }
    }
    mergedHistory.push(currentMsg);
  }

  // 3. Ensure conversation starts with 'user'
  // Some APIs fail if the first message is 'assistant'
  if (mergedHistory.length > 0 && mergedHistory[0].role === 'assistant') {
    mergedHistory.unshift({
      role: 'user',
      content: `[Sistem]: Oturum "${topic}" konusu üzerine başlatıldı. Lütfen giriş yapın.`
    });
  }

  // Context Management: Keep last ~10 merged blocks to fit context window while maintaining flow
  const limitedHistory = mergedHistory.slice(-10);

  // Dynamic System Prompt Construction
  let instruction = `
    KİMLİK:
    Sen ${participant.name} (${participant.modelName})'sin. 
    Rolün: ${participant.systemPrompt}

    BAĞLAM:
    Konu: "${topic}"

    KESİN KURALLAR (TOKEN EKONOMİSİ):
    1. MAKSİMUM UZUNLUK: Yanıtın KESİNLİKLE 100 kelimeyi geçmemeli. 
    2. GEREKSİZ GİRİŞ YAPMA: "Merhaba", "Katılıyorum", "Şunu eklemek isterim" gibi lafları sil. Direkt bilgi ver.
    3. MADDELER HALİNDE KONUŞ: Uzun paragraflar yerine 1-2 madde veya tek bir güçlü paragraf kullan.
    4. VIBE CODING: Hızlı, teknik ve net ol. Chat tarzında yaz, makale yazma.
    5. Diğer katılımcılara isimleriyle hitap et.
    6. Türkçe konuş.
  `;

  if (participant.role === ParticipantRole.MODERATOR) {
    instruction += `
    
    MODERATÖR GÖREVİ:
    - Tartışmayı yönlendir. Ekip dağılırsa toparla.
    - Henüz giriş yapılmadıysa konuyu aç ve ekibi davet et.
    
    FİKİR BİRLİĞİ VE BİTİŞ KURALLARI:
    - "Fikir Birliği Modu": ${autoFinish ? 'AKTİF' : 'PASİF'}.
    - Eğer mod AKTİF ise:
      1. Sadece ve sadece ekip teknik bir çözümde KESİN ve DETAYLI bir anlaşmaya vardıysa oturumu bitir.
      2. ASLA ilk turda veya tartışma henüz başlamışken bitirme. En az 3-4 tur tartışılmasını bekle.
      3. Sadece bitirme kararı aldığında yanıtının EN SONUNA [OTURUM_SONLANDI] yaz.
    `;
  } else {
     instruction += `
     - Sadece kendi uzmanlık alanından konuş. 
     - Asla oturumu sonlandırma yetkin yok.
     `;
  }

  try {
    return await sendChatCompletion(
        apiKey, 
        participant.modelId, 
        limitedHistory, 
        instruction
    );
  } catch (error) {
    console.error("Turn generation failed:", error);
    throw error;
  }
};
