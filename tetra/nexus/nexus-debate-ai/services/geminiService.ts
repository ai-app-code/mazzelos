
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Initialize the client safely
try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.warn("Gemini API Key missing. Debate simulation will fail.");
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

interface GenerationResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generates content acting as a specific persona (Simulating other LLMs if needed using Gemini)
 */
export const generateDebateTurn = async (
  modelId: string,
  systemInstruction: string,
  history: { role: string; text: string }[],
  currentPrompt: string
): Promise<GenerationResult> => {
  if (!ai) throw new Error("AI Client not initialized. Check API Key.");

  // We use gemini-2.5-flash for speed and efficiency in this demo, 
  // mapping the request to it regardless of the selected ID to ensure it works
  // without needing 5 different API keys from the user.
  // In a production app, we would switch(modelId) to call different provider APIs.
  const actualModelToUse = 'gemini-2.5-flash';

  // Construct history for the model
  const transcript = history.map(h => `${h.role}: ${h.text}`).join('\n\n');
  
  const fullPrompt = `
    ÖNEMLİ: "Yaşayan Mühendislik Spesifikasyonu" oturumunda yer alıyorsun.
    DİL ZORUNLULUĞU: Yanıtların kesinlikle ve tamamen TÜRKÇE olmalıdır. Kod yorumları dahil Türkçe olmalıdır.
    
    SİSTEM TALİMATLARI:
    ${systemInstruction}
    
    KATILIM KURALLARI:
    1. SOMUT OL. "Derinlemesine inceleyelim", "önemli bir konudur", "zenginleştirir" gibi boş, edebi laflar etme.
    2. ÇIKTI ODAKLI OL. Bir çözüm önerdiğinde şunlardan en az birini MUTLAKA sunmalısın:
       - Kod Parçacıkları (Python, TypeScript, Rust, Go) -> Markdown kod bloğu kullan.
       - JSON Şemaları veya SQL Tabloları -> Markdown kod bloğu kullan.
       - Matematiksel Formüller -> LaTeX formatı kullan.
       - Mimari Diyagramlar -> Metin olarak açıkla (örn: "Client -> Load Balancer -> Service A").
    3. ELEŞTİREL OL. Eğer katılmıyorsan, spesifik teknik hataları belirt (örn: O(n^2) karmaşıklığı, race condition, tek hata noktası).
    4. HİKAYE YOK. Direkt teknik uygulamaya geç.
    
    BAĞLAM:
    Şu ana kadarki oturum dökümü:
    ---
    ${transcript}
    ---
    
    GÖREVİN:
    Sıra sende. ${currentPrompt}
    Tamamen karakterinde kalarak yanıt ver. Yoğun ve teknik konuş.
    
    SONLANDIRMA PROTOKOLÜ (Sadece talimat verilirse):
    Eğer Moderatör "Nihai Plan" (Final Blueprint) için oylama isterse, yanıtına mutlaka [ONAYLIYORUM] veya [REDDEDİYORUM] diyerek başla ve sebebini yaz.
    Eğer Moderatörsen ve önceki turda herkesin [ONAYLIYORUM] dediğini görürsen, özetinin en sonuna <<TERMINATE_SESSION>> kodunu ekle.
  `;

  try {
    const response = await ai.models.generateContent({
      model: actualModelToUse,
      contents: fullPrompt,
    });

    const text = response.text || "Ekleyeceğim bir şey yok.";
    
    // Estimate tokens (mock calculation since SDK returns usage metadata differently depending on model)
    const inputTokens = fullPrompt.length / 4; 
    const outputTokens = text.length / 4;

    return {
      text,
      inputTokens: Math.ceil(inputTokens),
      outputTokens: Math.ceil(outputTokens)
    };

  } catch (error) {
    console.error("Generation error:", error);
    return {
      text: "Sistem Hatası: Yanıt oluşturulamadı.",
      inputTokens: 0,
      outputTokens: 0
    };
  }
};
