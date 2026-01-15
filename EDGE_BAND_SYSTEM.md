# Kenar Bandı Yönetim Sistemi

## 📐 Temel Bilgiler

Bir parçanın **4 kenarı** vardır:
- **Üst (T)** - Top
- **Alt (B)** - Bottom  
- **Sol (L)** - Left
- **Sağ (R)** - Right

Her kenar için:
- Bantlı mı, değil mi?
- Hangi bant türü?
- Uzunluk hesabı

## 📊 Veri Yapısı

### Kenar Bandı Tanımları (Merkezi)
```json
{
  "edge_bands": [
    {
      "id": "edge_001",
      "name": "0.8mm Beyaz PVC",
      "thickness": 0.8,
      "width": 22,        // mm
      "color": "Beyaz",
      "material": "PVC",
      "price_per_meter": 2.5,
      "compatible_colors": ["Beyaz", "Krem"],  // Uyumlu plaka renkleri
      "stock_meters": 500
    },
    {
      "id": "edge_002",
      "name": "2mm Meşe ABS",
      "thickness": 2,
      "width": 22,
      "color": "Meşe",
      "material": "ABS",
      "price_per_meter": 5.5,
      "compatible_colors": ["Meşe", "Oak"],
      "stock_meters": 200
    }
  ]
}
```

### Parça Kenar Bilgisi
```json
{
  "part": {
    "name": "Dolap Yan",
    "width": 600,
    "length": 800,
    "quantity": 2,
    "edges": {
      "top": { "band_id": "edge_001" },     // 0.8mm Beyaz
      "bottom": { "band_id": "edge_001" },
      "left": { "band_id": null },          // Bant yok
      "right": { "band_id": "edge_002" }    // 2mm Meşe
    },
    "pattern": false
  }
}
```

## 🖥️ UI Yaklaşımları

### Seçenek A: Görsel Parça Diyagramı
```
        ┌─ [▣] ─┐
        │       │
      [▣]      [ ]
        │       │
        └─ [▣] ─┘
```
- Tıkla → Aktif/Pasif toggle
- Aktif olanlar vurgulu
- Farenin üstüne gel → Bant türü göster

### Seçenek B: Akıllı Hızlı Seçici (Önerim)
```
| Kenar Bandı                    |
| [4] [2H] [2V] [U] [Özel]      |
```
- **[4]** = 4 kenar bantlı
- **[2H]** = Yatay kenarlar (üst-alt)
- **[2V]** = Dikey kenarlar (sol-sağ)
- **[U]** = U şekli (3 kenar)
- **[Özel]** = Tıkla → Modal aç

### Seçenek C: Mini Görsel + Preset (Hibrit - EN İYİ)
```
| Kenar Bandı                              |
|  ┌──┐                                    |
|  │▓▓│  [4K] [2↔] [2↕] [U] [L] [⚙]      |
|  └──┘                                    |
```
- Sol tarafta küçük parça önizleme
- Bantlı kenarlar vurgulu
- Preset butonları hızlı seçim
- ⚙ = Detaylı ayarlar (her kenara farklı bant)

## 📏 Metre Hesabı

```javascript
function calculateEdgeBanding(part) {
  const { width, length, quantity, edges } = part;
  
  let totalLength = 0;
  
  if (edges.top) totalLength += width;
  if (edges.bottom) totalLength += width;
  if (edges.left) totalLength += length;
  if (edges.right) totalLength += length;
  
  return (totalLength * quantity) / 1000; // metre
}
```

## 🔧 Proje Seviyesi Ayarlar

```json
{
  "project_settings": {
    "default_edge_band": "edge_001",  // Proje için varsayılan bant
    "edge_trim_allowance": 2,          // Kesim payı (mm)
    "auto_suggest_band": true          // Malzeme rengine göre öner
  }
}
```

## 🎯 Uygulama Planı

### Faz 1: Basitleştirilmiş UI (Mevcut)
- 4 toggle [↑][↓][←][→]
- Tümü için aynı bant (proje ayarlarından seçilen)
- Otomatik metre hesabı

### Faz 2: Akıllı Presetler
- [4K] [2↔] [2↕] [U] [L] preset butonları
- Tek tıkla yaygın kombinasyonları seç
- Görsel önizleme

### Faz 3: Gelişmiş Kenar Yönetimi  
- Her kenara farklı bant atama
- "Kenar Detayları" modal
- Malzeme-bant uyumluluk kontrolü
- Eksik stok uyarısı

## 📋 Yaygın Kullanım Senaryoları

1. **Dolap Yanı** → 4 kenar bantlı
2. **Raf** → 3 kenar (görünen taraflar)
3. **Kapak** → 4 kenar
4. **Sırt Kaplama** → Bant yok
5. **Çekmece Ön** → Sadece üst kenar

## 🚀 Sonraki Adımlar

1. ✅ Mevcut toggle sistemini koru (çalışıyor)
2. ⏳ Preset butonları ekle (hızlı seçim)
3. ⏳ Metre hesabını düzelt (kenar uzunlukları)
4. ⏳ Proje varsayılan bant seçimi
5. ⏳ Kenar detay modal'ı
