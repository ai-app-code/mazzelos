# AKILLI BANT SİSTEMİ - KÖKLÜ DEĞİŞİKLİK ANALİZİ

## 1. Mevcut Durum

### Buton Yapısı (Şu An)
| Buton | Anlam | Mantık |
|:------|:------|:-------|
| 1B | 1 Boy kenarı | Uzun kenar belirlenir, sadece bir tarafına bant |
| 2B | 2 Boy kenarı | Her iki uzun kenar |
| 1E | 1 En kenarı | Kısa kenar belirlenir, sadece bir tarafına bant |
| 4K | 4 Kenar | Tüm kenarlar |

### Eksiklik
- **2E yok**: 2 En kenarını seçmek için buton yok
- **4EB yerine 4K**: "4 Kenar" yerine "4 Edge Banding" (4EB = 2Boy + 2En) daha anlamlı

---

## 2. Önerilen Yeni Sistem

### Yeni Buton Yapısı
| Buton | Anlam | Hedef Kenarlar |
|:------|:------|:---------------|
| **1B** | 1 Boy | Sol VEYA Üst (hangisi uzunsa) |
| **2B** | 2 Boy | Sol + Sağ VEYA Üst + Alt |
| **1E** | 1 En | Üst VEYA Sol (hangisi kısaysa) |
| **2E** | 2 En | Üst + Alt VEYA Sol + Sağ |
| **4EB** | Tüm Kenarlar | Top + Bottom + Left + Right |

### Mantık Açıklaması
```
Her parçanın 2 Boy kenarı ve 2 En kenarı vardır.

Eğer Boy >= En:
  - Boy kenarları = SOL ve SAĞ (vertical sides)
  - En kenarları = ÜST ve ALT (horizontal sides)

Eğer En > Boy:
  - Boy kenarları = ÜST ve ALT
  - En kenarları = SOL ve SAĞ
```

---

## 3. Etkilenen Kod Bölümleri

### A. `renderPartRowHTML()` - Satır 1457-1463
**Değişiklik:** Buton HTML'i güncellenecek
```javascript
// ESKİ
<button ... onclick="setSmartEdge(this, '1B')">1B</button>
<button ... onclick="setSmartEdge(this, '2B')">2B</button>
<button ... onclick="setSmartEdge(this, '1E')">1E</button>
<button ... onclick="setSmartEdge(this, '4K')">4K</button>

// YENİ
<button ... onclick="setSmartEdge(this, '1B')">1B</button>
<button ... onclick="setSmartEdge(this, '2B')">2B</button>
<button ... onclick="setSmartEdge(this, '1E')">1E</button>
<button ... onclick="setSmartEdge(this, '2E')">2E</button>
<button ... onclick="setSmartEdge(this, '4EB')">4EB</button>
```

### B. `setSmartEdge()` - Satır 1498-1543
**Değişiklik:** Edge hesaplama mantığı genişletilecek
```javascript
// YENİ MANTIK
if (rule === '1B') {
    if (l >= w) edges.l = '0.8';  // Boy kenarı (sol)
    else edges.t = '0.8';          // Boy kenarı (üst)
}
if (rule === '2B') {
    if (l >= w) { edges.l = '0.8'; edges.r = '0.8'; }
    else { edges.t = '0.8'; edges.b = '0.8'; }
}
if (rule === '1E') {
    if (l >= w) edges.t = '0.8';  // En kenarı (üst)
    else edges.l = '0.8';          // En kenarı (sol)
}
if (rule === '2E') {  // YENİ
    if (l >= w) { edges.t = '0.8'; edges.b = '0.8'; }
    else { edges.l = '0.8'; edges.r = '0.8'; }
}
if (rule === '4EB') {  // İSİM DEĞİŞİKLİĞİ
    edges.t = '0.8'; edges.b = '0.8'; edges.l = '0.8'; edges.r = '0.8';
}
```

### C. `updateStats()` - Satır 1610-1635
**Değişiklik YOK** - Mevcut kod zaten her kenarı ayrı ayrı kontrol ediyor ve doğru hesaplıyor.
```javascript
if (t) totalEdge += (w * qty);  // Üst kenar = En uzunluğu
if (b) totalEdge += (w * qty);  // Alt kenar = En uzunluğu
if (lr) totalEdge += (l * qty); // Sol kenar = Boy uzunluğu
if (r) totalEdge += (l * qty);  // Sağ kenar = Boy uzunluğu
```

### D. `collectProjectData()` - Satır 1565-1608
**Değişiklik YOK** - Mevcut kod zaten her kenarın değerini ayrı ayrı kaydediyor.

### E. `recalcSmartEdge()` - Satır 1545-1554
**Değişiklik YOK** - Mevcut kod zaten rule değerini okuyup setSmartEdge'e gönderiyor.

---

## 4. CSS Değişikliği

`.smart-edge-group` için 5 buton sığacak şekilde genişlik ayarı gerekebilir.

```css
.smart-edge-group {
    display: flex;
    gap: 2px;  /* Daha sıkı gap */
    margin-bottom: 4px;
    justify-content: center;
    flex-wrap: nowrap;  /* Taşma olmasın */
}

.pill-btn {
    padding: 2px 4px;  /* Daha dar padding */
    font-size: 0.65rem;  /* Biraz daha küçük font */
}
```

---

## 5. Özet

| Dosya/Fonksiyon | Değişiklik Türü | Karmaşıklık |
|:----------------|:----------------|:------------|
| `renderPartRowHTML()` | Buton ekleme + isim değiştirme | Düşük |
| `setSmartEdge()` | 2E case ekleme + 4K→4EB isim değişikliği | Düşük |
| `updateStats()` | Değişiklik yok | - |
| `collectProjectData()` | Değişiklik yok | - |
| CSS (`.pill-btn`) | Genişlik ayarı | Düşük |

**Risk Değerlendirmesi:** DÜŞÜK - Değişiklikler lokalize ve geriye dönük uyumlu.

---

## 6. Onay Bekliyor

Değişiklikleri uygulamak için onayınızı bekliyorum.
