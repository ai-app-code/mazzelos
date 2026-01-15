# Mazzel OS Panel Saw Nesting: Geliştirme Planı v2

## 📋 Mevcut Durum

### ✅ Var Olan
- Guillotine Packer (basit First-Fit)
- Canvas görselleştirme
- Multi-Sheet desteği
- Kerf (testere kalınlığı) hesabı
- Malzeme gruplandırma

### ❌ Eksik
1. Parça etiketleme sistemi
2. Fire (atık) görselleştirmesi
3. Kesim sırası/rotası
4. Export (PDF, DXF, CSV)
5. Artık plaka yönetimi (Remnant)
6. İnteraktif parça düzenleme

---

## 🎯 5 Fazlı Geliştirme Planı

### Faz 1: Gelişmiş Görselleştirme (1-2 hafta)

#### 1.1 Canvas → SVG Geçişi
**Neden?** Canvas piksel bazlı, SVG vektörel. SVG ile:
- Sonsuz yakınlaştırma
- Tıklanabilir parçalar
- Hover efektleri
- Kolay PDF export

#### 1.2 Parça Etiketleme
Her parça üzerinde gösterilecek:
```
┌─────────────────────────────────┐
│  Soldolap > Yan Dikme           │
│  2220 x 600 mm                  │
│  [1B] ═══                       │
│  Adet: 1/2                      │
└─────────────────────────────────┘
```

**Gösterilecek bilgiler:**
| Alan | Örnek |
|------|-------|
| Modül Adı | Soldolap |
| Parça Adı | Yan Dikme |
| Boyutlar | 2220 x 600 |
| Kenar Bandı | 1B, 2E, 4EB |
| Adet | 1/2 (birinci/toplam) |

#### 1.3 Renk Kodlama
```css
Gövde parçaları    → Mor (#8B5CF6)
Kapak parçaları    → Yeşil (#10B981)
Çekmece parçaları  → Turuncu (#F59E0B)
Arkalık parçaları  → Mavi (#3B82F6)
Fire (boş alan)    → Kırmızı çapraz çizgi
```

#### 1.4 Fire Görselleştirmesi
- Kullanılmayan alanları **çapraz kırmızı çizgili** göster
- Her plaka için fire yüzdesini hesapla
- Toplam fire miktarını m² olarak göster

---

### Faz 2: Algoritma İyileştirmeleri (2 hafta)

#### 2.1 Mevcut Algoritma Analizi
```
Şu an: First-Fit → ~70% verimlilik
Hedef: Best-Fit → %85+ verimlilik
```

#### 2.2 Yeni Heuristikler
| Heuristik | Açıklama |
|-----------|----------|
| **BSSF** | Best Short Side Fit - En kısa kenarı eşleştir |
| **BAF** | Best Area Fit - Alan optimizasyonu |
| **BLSF** | Bottom-Left Short Side - Sola yasla + kısa kenar |

#### 2.3 Multi-Pass Optimizasyon
```javascript
// 1. İlk yerleşim
runPacking(parts);

// 2. Fireları analiz et
analyzeWaste(sheets);

// 3. Küçük parçaları firelara taşı
repackSmallParts(smallParts, wasteAreas);

// 4. Sonucu karşılaştır
if (newEfficiency > oldEfficiency) use(newLayout);
```

#### 2.4 Desen Yönü (Grain Direction)
```javascript
// Pattern özelliği açıksa:
if (part.pattern === true) {
  // Parçayı döndürme, desen yönü bozulmasın
  allowRotation = false;
}
```

---

### Faz 3: Kesim Sırası (1 hafta)

#### 3.1 Kesim Ağacı Oluşturma
Panel saw için optimum kesim sırası:
```
PLAKA
│
├── 1. Dikey kesim @ x=1400
│   ├── Sol parça grubu
│   └── Sağ parça grubu
│
├── 2. Yatay kesim @ y=900 (sol grup)
│   ├── Üst parçalar
│   └── Alt parçalar
│
└── 3. Detay kesimler...
```

#### 3.2 Kesim Animasyonu
- Play/Pause butonu
- İleri/Geri adım
- Mevcut kesimi vurgula
- "Kesildi" parçaları işaretle

#### 3.3 Yazdırılabilir Talimatlar
```
Plaka 1 - Kesim Sırası
━━━━━━━━━━━━━━━━━━━━━━
Adım 1: Dikey kesim, x=1400mm
Adım 2: Sol parça - Yatay kesim, y=900mm
Adım 3: ...
```

---

### Faz 4: Export Özellikleri (1 hafta)

#### 4.1 PDF Export
İçerik:
- Proje bilgileri (müşteri, tarih)
- Her plaka için görsel
- Parça listesi tablosu
- Kesim talimatları
- Toplam malzeme özeti

#### 4.2 DXF Export (CNC hazırlık)
- AutoCAD uyumlu format
- Parça sınırları
- Etiket pozisyonları

#### 4.3 CSV Parça Listesi
```csv
No,Modül,Parça,Boy,En,Adet,Malzeme,Kenar
1,Soldolap,Yan Dikme,2220,600,2,18mm MDF,1B
2,Soldolap,Alt Tabla,1354,600,1,18mm MDF,2E
```

#### 4.4 PNG/SVG Görsel
- Yüksek çözünürlüklü plaka görseli
- Yazdırmaya hazır

---

### Faz 5: Artık (Remnant) Yönetimi (1 hafta)

#### 5.1 Artık Kayıt
Kesimden kalan plakaları kaydet:
```javascript
{
  id: "rem_001",
  material: "18mm Beyaz MDF",
  width: 800,
  height: 1200,
  source: "Proje: Ahmet Bey Mutfak",
  date: "2026-01-02",
  location: "Raf A-3"
}
```

#### 5.2 Artık-Öncelikli Optimizasyon
```
Optimizasyon Sırası:
1. Önce artık plakaları kontrol et
2. Küçük parçaları artıklardan kes
3. Yeni plaka sadece gerektiğinde
```

#### 5.3 Artık Envanter Sayfası
- Tüm artıkları listele
- Boyut, malzeme, konum
- Kullanım önerileri

---

## 📊 Başarı Metrikleri

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| Verimlilik | ~70% | **85%+** |
| Hesaplama (100 parça) | 2s | **1s** |
| Export Formatları | 0 | **4** |
| Kullanıcı Memnuniyeti | - | **Kolay kullanım** |

---

## 🗓 Zaman Çizelgesi

| Hafta | Faz | Çıktı |
|-------|-----|-------|
| **1-2** | Faz 1 | SVG görselleştirme, parça etiketleri, renk kodlama |
| **3-4** | Faz 2 | İyileştirilmiş algoritma, %85+ verimlilik |
| **5** | Faz 3 | Kesim sırası ve animasyon |
| **6** | Faz 4 | PDF, DXF, CSV export |
| **7** | Faz 5 | Artık plaka yönetimi |

**Toplam: 7 hafta**

---

## 🚀 Hemen Başlanabilecekler

### Öncelik 1: SVG Görselleştirme + Parça Etiketleri
1. `drawResults()` fonksiyonunu Canvas → SVG değiştir
2. Her parçaya text elementi ekle
3. Hover ile detay göster

### Öncelik 2: Fire Görselleştirme
1. Boş dikdörtgenleri bul (freeRectangles)
2. Çapraz pattern ile çiz
3. Fire yüzdesini hesapla

### Öncelik 3: Renk Kodlama
1. Parça tipine göre renk ata
2. Legend (açıklama) ekle

---

## 📝 Not: CNC/Lazer Nesting

CNC/Lazer Nesting ayrı bir modül olarak geliştirilecek:
- Düzensiz şekil desteği
- Path optimizasyonu
- G-code export
- **Bu plan sadece Panel Saw için**

---

## 📚 Referanslar

### Açık Kaynak
- SVGnest / Deepnest.io
- bin-packing (NPM)

### Ticari Örnekler
- CutList Optimizer
- OptiCut
- HOMAG IntelliDivide
