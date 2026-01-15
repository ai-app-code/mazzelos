# Mazzel OS - Merkezi Veri Yönetimi Planı

## 🎯 Amaç
Tüm modüller için merkezi veri yönetimi - Müşteriler, Malzemeler, Şantiyeler

---

## 📊 Veri Yapısı

### 1. MÜŞTERİLER (Customers)
```json
{
  "id": "cust_001",
  "type": "company|individual",  // Firma veya Bireysel
  "company_name": "ABC Mobilya",
  "tax_number": "1234567890",
  "tax_office": "Kadıköy",
  
  "contact": {
    "name": "Ahmet Yılmaz",
    "phone": "0532 xxx xx xx",
    "email": "ahmet@abc.com",
    "position": "Satın Alma Müdürü"
  },
  
  "address": {
    "street": "Sanayi Cad. No:45",
    "district": "Ümraniye",
    "city": "İstanbul",
    "postal_code": "34000"
  },
  
  "sites": [  // Şantiyeler/Teslimat Adresleri
    {
      "id": "site_001",
      "name": "Ataşehir Projesi",
      "address": "Ataşehir Bulvarı No:123",
      "contact_person": "Mehmet Usta",
      "phone": "0533 xxx xx xx"
    }
  ],
  
  "payment": {
    "method": "transfer|cash|check",
    "term_days": 30,  // Vade
    "credit_limit": 50000
  },
  
  "tags": ["vip", "mobilya", "toptan"],
  "notes": "Her ay düzenli sipariş veriyor",
  "created_at": "2024-01-15",
  "status": "active|passive"
}
```

### 2. MALZEMELER (Materials)
```json
{
  "id": "mat_001",
  "category": "mdf|suntalam|kontraplak|osb|lam_mdf|lake|pvc",
  "name": "18mm Beyaz Melamin MDF",
  "brand": "Kastamonu",
  
  "dimensions": {
    "thickness": 18,
    "width": 2100,
    "height": 2800,
    "unit": "mm"
  },
  
  "properties": {
    "color": "Beyaz",
    "pattern": "Düz|Ahşap Desen|Mermer",
    "surface": "Mat|Parlak|Yarı Mat",
    "edge_compatible": true
  },
  
  "pricing": {
    "purchase_price": 750,
    "sale_price": 850,
    "currency": "TRY",
    "vat_rate": 20
  },
  
  "stock": {
    "quantity": 45,
    "min_stock": 10,
    "location": "Depo A - Raf 3"
  },
  
  "supplier": {
    "id": "supp_001",
    "name": "Kastamonu Bayii"
  },
  
  "status": "active|passive"
}
```

### 3. KENAR BANTLARI (Edge Bands)
```json
{
  "id": "edge_001",
  "name": "0.8mm Beyaz PVC",
  "thickness": 0.8,
  "width": 22,
  "color": "Beyaz",
  "material_match": ["mat_001", "mat_005"],  // Uyumlu malzemeler
  "price_per_meter": 2.5,
  "stock_meters": 500
}
```

---

## 🖥️ Yönetim Sayfaları

### 1. Müşteri Yönetimi `/musteriler/`
- Müşteri listesi (tablo + arama + filtre)
- Yeni müşteri ekleme (modal/sayfa)
- Müşteri detay sayfası `/musteriler/<id>`
  - Genel bilgiler
  - Şantiyeler listesi
  - Sipariş geçmişi
  - Ödeme durumu

### 2. Malzeme Yönetimi `/malzemeler/` veya `/settings/materials`
- Kategori bazlı liste
- Yeni malzeme ekleme
- Fiyat güncelleme toplu işlem
- Stok takibi

### 3. Tedarikçiler `/tedarikciler/`
- Tedarikçi listesi
- İletişim bilgileri
- Malzeme-tedarikçi eşleşmesi

---

## 🔗 API Endpoints

```
# Müşteriler
GET    /api/customers              - Liste
POST   /api/customers              - Yeni ekle
GET    /api/customers/<id>         - Detay
PUT    /api/customers/<id>         - Güncelle
DELETE /api/customers/<id>         - Sil
POST   /api/customers/<id>/sites   - Şantiye ekle

# Malzemeler
GET    /api/materials              - Liste (kategori filtreli)
POST   /api/materials              - Yeni ekle
PUT    /api/materials/<id>         - Güncelle
DELETE /api/materials/<id>         - Sil

# Kenar Bantları
GET    /api/edge-bands             - Liste
POST   /api/edge-bands             - Yeni ekle
```

---

## 📱 UI Akışı

### Nesting Sayfasında Müşteri Seçimi:
1. Dropdown açılır
2. Arama yapılabilir
3. Son kullanılanlar gösterilir
4. "Yeni Müşteri Ekle" seçeneği (modal açar)

### Malzeme Seçimi:
1. Modal açılır
2. Kategoriye göre filtre (MDF, Suntalam, Kontraplak...)
3. Arama
4. Stokta olanlar önce
5. "Yeni Malzeme Tanımla" seçeneği

---

## 🚀 Uygulama Sırası

### Faz 1: Temel Altyapı
1. ✅ JSON veri yapısı güncelle
2. ⏳ API endpoint'leri oluştur
3. ⏳ Müşteri yönetim sayfası

### Faz 2: Malzeme Yönetimi
4. ⏳ Malzeme yönetim sayfası
5. ⏳ Kategori sistemi
6. ⏳ Kenar bandı yönetimi

### Faz 3: Entegrasyon
7. ⏳ Nesting'de akıllı seçiciler
8. ⏳ Stok kontrolü
9. ⏳ Raporlama
