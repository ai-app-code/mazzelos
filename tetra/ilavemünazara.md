# İlave Münazara — Geliştirme Notları

Bu doküman, bitmiş bir münazaranın yeniden açılması (reopen) durumunda **bağlamın (context)** nasıl kurulacağı, UI akışı ve sistem davranışlarının nasıl tasarlanacağına dair geliştirme notlarını içerir.

## Amaç

- **Amaç**: Bitmiş (COMPLETED) bir münazarayı, kullanıcı yeni bilgi eklemek istediğinde **tarihçeyi bozmadan** (append-only) yeniden ele almak.
- **Hedef**: Modelin geçmişin detaylarında boğulmadan **sonuç (verdict)** ve **yeni tetikleyici (catalyst)** üzerine odaklanması.

## Ana Mimari Karar: Append-only (Eklemeli Devam) + Revision Phase (Revizyon Faslı)

- **Append-only (Eklemeli Devam)**: Geçmiş mesajlar ve kararlar **asla yeniden yazılmaz**.
- **Revision Phase (Revizyon Faslı)**: Yeniden açma, “normal tur devamı” değil; özel etiketli revizyon turlarıyla ilerler (örn. `R1`, `R2`).

### Neden Fork (Dallanma) değil?

- Fork (dallanma) yazılım geliştirmede (git) anlamlı olsa da, karar destek münazarasında “birden fazla gerçek” algısı yaratır.
- Revizyon ihtiyacı genelde “yeni kanıt/kısıt” sebebiyledir; bu, aynı kararın **güncellenmesi** sürecidir.

## Bağlam Mimarisi: Pruned Context (Budanmış Bağlam) / Soft Reset (Yumuşak Sıfırlama)

Bitmiş münazara yüzlerce mesaj içerebilir. Tam geçmişi tekrar modele vermek:
- maliyetlidir,
- dikkat dağıtır,
- yanlış “eski detaylara takılma” davranışını artırır.

Bu nedenle yeniden açmada bağlam şu 3 parçadan oluşur:

1) **Sabit Çerçeve (Fixed Frame)**  
   - Konu, roller, format kuralları, hedef.

2) **Önceki Hüküm (Verdict)**  
   - Son turun özeti (round summary)
   - Alınan karar(lar) (decisions)
   - Varsayımlar (assumptions) ve açık noktalar (open issues)

3) **Yeni Değişken (Catalyst)**  
   - Kullanıcının eklediği yeni kanıt (new evidence) veya yeni kısıt/kapsam değişimi (constraint/scope change)

### Prompt (İstem) Şablonu (LLM’e verilecek görev)

- **Kural**: “Eski tartışmayı tekrar etme; sadece yeni girdinin önceki hükmü değiştirip değiştirmediğini analiz et.”

Örnek görev metni:

> Bu oturum daha önce tamamlandı. Varılan sonuç: **[X]**  
> Kullanıcı şu yeni girdiyi sundu: **[Y]**  
> **Görev**: Eski tartışmayı tekrar etme. Sadece **Y**’nin **X** kararını değiştirip değiştirmediğini değerlendir.  
> Çıktı: “Karar korunur / karar güncellenir” + kısa gerekçe + gerekiyorsa yeni test önerisi.

## UI (Kullanıcı Arayüzü) Akışı

Bitmiş münazarada standart “Mesaj yaz” alanı yerine iki net aksiyon sunulmalı:

- **Yeni Kanıt Ekle (New evidence)**: “Yeni benchmark buldum” gibi.
- **Kapsam Değiştir (Scope/constraint change)**: “Bütçe sınırsız oldu” gibi.

### UI doğrulama (validation) beklentisi

Kullanıcıdan minimum şu alanlar toplanmalı:
- **Ne ekliyorsun?** (content)
- **Hangi iddiayı etkiliyor?** (target claim)
- **Beklenen çıktı** (desired outcome)
- Opsiyonel: **kaynak/örnek/komut** (evidence link/example)

## Sistem Durumları (State) ve Geçişler

Önerilen durum geçişi:

- `COMPLETED` → (kullanıcı revizyon ister) → `REVISION`
- `REVISION` içinde turlar: `R1`, `R2`, ...
- Revizyon kapanınca tekrar `COMPLETED` (ancak “revize edildi” işareti ile)

## Moderatör (Moderator) Açılış Şablonu

Revizyon turları açılış mesajı:

> Oturum revizyon talebi ile yeniden açıldı.  
> Mevcut karar: **[Eski Karar]**  
> Yeni girdi: **[Kullanıcı Girdisi]**  
> Ekip: Sadece bu yeni girdiyi test edin; karar korunuyor mu yoksa güncelleniyor mu bildirin.

## Veri Modeli Notu (Uygulama için)

Append-only yaklaşımı için veride şu alanlar kritik:
- `sessionId`
- `status`: `ACTIVE | COMPLETED | REVISION`
- `messages[]`: immutable (değişmez) kayıt
- `rounds[]`: her tur için `roundId`, `type: NORMAL | REVISION`, `summary`, `decisions`
- `revisionRequests[]`: `catalystType: EVIDENCE | SCOPE`, `catalystPayload`, `createdAt`

> Not: Bu kısım, mevcut veri formatına (ör. `backend/data/history.json`) uyarlanırken tekrar netleştirilecek.

## Şu anki Öncelik: “Tur Özeti Senkronizasyonu” (Round Summary Synchronization)

Sorun tanımı (hipotezler):
- Özet animasyonu (animation) tamamlanmadan state güncelleniyor olabilir.
- Özetler yanlış tur kimliği (roundId) ile eşleşiyor olabilir.
- Render sırası (render order) nedeniyle “eski özet” kısa süre görünür kalıyor olabilir.

Hedef:
- Özet üretimi tamamlanmadan UI “tamamlandı” durumuna geçmesin.
- Özet kartı ve tur etiketi deterministik sırada güncellensin.

## Açık Sorular (Takip)

1) Revizyon modunda katılımcı rolleri aynı mı kalacak, yoksa sadece seçili roller mi konuşacak?
2) “Kapsam değiştir” seçeneği, önceki kararı otomatik “şartlı” hale mi getirecek?
3) Özet formatı: tek paragraf mı, maddeler mi, yoksa karar + gerekçe + test önerisi şeklinde mi?


