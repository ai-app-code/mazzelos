# Kenar Bandı & UI Revizyon Planı

## 1. Tespit Edilen Sorunlar
*   **Tutarsızlık:** Sayfa yüklendiğinde var olan satırlar ile yeni eklenen satırlar farklı yapıda.
*   **UI Karmaşası:** Kenar bandı butonları ve desen toggle'ı iç içe geçmiş, butonlar çok yer kaplıyor.
*   **Eksik Presetler:** L tipi (köşe) bantlama gibi yaygın senaryolar için hızlı seçim yok.

## 2. Çözüm: "Akıllı Kenar Yöneticisi"

### A. Görsel Yapı (Tablo Hücresi)
Tablo hücresini sadeleştireceğiz. Varsayılan olarak sadece **4 Yön Oku** ve bir **Şablon Menüsü** görünecek.

```
[⚙ Şablon▼]  [↑] [↓] [←] [→]
```

*   **⚙ Şablon:** Mouse üzerine gelince (Hover) açılan mini bir menü. İçinde:
    *   `[■]` 4 Kenar
    *   `[=]` Yatay (Alt-Üst)
    *   `[||]` Dikey (Sol-Sağ)
    *   `[U]` U Şekli
    *   `[L]` L Şekli (Üst + Sol)
*   **Yön Okları:** Manuel seçim için her zaman görünür. Tıkla/Bırak mantığı.

### B. L Tipi ve Özel Bantlama
"L de ne yapacağız?" sorusunun cevabı iki katmanlı:
1.  **Hızlı Yol (Preset):** Şablon menüsüne "L" seçeneği eklenecek (Kullanıcıların en sık kullandığı köşe birleşimi).
2.  **Esnek Yol (Manuel):** Kullanıcı [↑] ve [←] butonlarına tıklayarak istediği herhangi bir kombinasyonu (örneğin sadece 1 uzun, 1 kısa) oluşturabilir.

### C. Kod Mimarisi Revizyonu
Mevcut `addPartRow` fonksiyonu içindeki HTML oluşturma kodunu dışarı alıp `renderPartRowHTML()` fonksiyonunda tekilleştireceğim.

**Akış:**
1.  Sayfa Yüklenir → `renderPartRowHTML()` ile boş satır oluşturulur.
2.  "Parça Ekle" denir → `renderPartRowHTML()` ile yeni satır eklenir.
3.  Kayıtlı Proje Yüklenir → `renderPartRowHTML()` ile kayıtlı verilerle satır oluşturulur.
*Böylece "ilk parçada çıkmadı" sorunu kesin olarak çözülür.*

## 3. Uygulama Adımları

1.  **JS Refactoring:** `createPartRow` fonksiyonu yazılacak.
2.  **UI Temizliği:** Butonlar küçültülecek, presetler dropdown/hover menüye alınacak. CSS ile "Kenar Bandı" ve "Desen" sütunları birbirinden net çizgilerle ayrılacak.
3.  **L Preset:** L (Sol+Üst) preseti eklenecek.

Bu planı şimdi uyguluyorum.
