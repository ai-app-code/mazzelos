Bu harika bir analiz sorusu. Kod tabanına "bodozlama" girmeden önce haritayı çıkarmamız şart.

Yapacağımız değişiklikler 
page_nesting.html
 dosyası üzerinde yoğunlaşacak ama bu dosya içinde HTML Şablonları, JavaScript Logic ve CSS olmak üzere 3 farklı katmana dokunacağım.

İşte cerrahi müdahale yapacağım noktalar:

1. Veri Tanımları (Yeni)
Kodun en başına, parçaların hiyerarşisini tanımlayan sabit bir yapı (Constant) eklemem gerekecek.

Dokunulacak Yer: <script> etiketinin en başı.
Ne eklenecek: CONST_PART_TYPES objesi. (Gövde -> [Dikme, Raf...], Kapak -> [Kapak...] ilişkisi).
2. Modül Yapısı (addModule Fonksiyonu)
Modül kartının "kafasını" (header) değiştireceğim.

Dokunulacak Kod: addModule() fonksiyonu içindeki innerHTML şablonu.
Değişiklik: Modül isminin altına "Gövde Malzemesi" ve "Kapak Malzemesi" seçim kutularını ekleyeceğim.
Neden: Alt satırlardaki parçalar varsayılan malzemeyi buradan çekecek.
3. Satır Oluşturma Mantığı (renderPartRowHTML Fonksiyonu)
Burası en büyük değişimin olacağı yer. Şu anki "basit input" yapısını yıkıp "zincirleme çalışan select" yapısına geçireceğim.

Dokunulacak Kod: renderPartRowHTML(part) fonksiyonu.
Değişiklikler:
Parça Adı text input'unu kaldırıp yerine Grup Seçimi (Select) + Tip Seçimi (Select) ve salt okunur (veya düzenlenebilir) bir Sonuç Input'u koyacağım.
Malzeme seçimi artık boş gelmeyecek, modülden gelen varsayılan ID ile dolu gelecek.
Kenar Bandı UI: Mevcut "T/B/L/R" butonlarını gizleyip veya küçültüp, öne [1U] [2U] [1K] akıllı butonlarını koyacağım.
4. Akıllı Hesaplama Mantığı (Yeni Fonksiyonlar)
Mevcut kodda olmayan, tamamen yeni "beyin" fonksiyonları yazacağım.

Yeni Fonksiyon: calcSmartEdges(width, length, rule)
Görevi: En ve Boyu kıyaslayıp, "1 Uzun" dendiğinde doğru kenarın ID'sini (top/bottom veya left/right) bulup return etmek.
Yeni Fonksiyon: autoFillPartAttributes(group, type)
Görevi: "Yan Dikme" seçilince adet = 2 yapmak, isme "Gövde - Yan Dikme" yazmak.
5. Kayıt ve Yükleme (
collectProjectData
 & 
loadFromStorage
)
Veri şemamız değişiyor.

Dokunulacak Kod: 
collectProjectData
Değişiklik: Artık sadece parça adını değil, part_group ve part_type verisini de JSON'a kaydetmemiz lazım ki sayfa yenilenince seçimler kaybolmasın.
6. Görsel Tasarım (CSS)
Dokunulacak Yer: <style> bloğu.
Değişiklik: Tablo hücreleri artık metin kutusu değil, dropdown dolacak. Sütun genişliklerini (width: 25% vs.) yeniden ayarlamam lazım. Ayrıca "1U, 2K" butonları için hap şeklinde (pill-shaped) mini buton stilleri ekleyeceğim.
Özetle: Sadece arayüzü makyajlamıyoruz, veri akışını (flow) değiştiriyoruz.

Modül Malzemesi Seçilir ->
Parça Tipi Seçilir ->
Malzeme ve İsim Otomatik Dolar ->
Ölçü Girilir ->
Akıllı Bant Seçilir ->
İşlem Biter.
Onayınla ameliyata başlıyorum.
Önce ilgili plan dosyalarını inceleyip, bu yeni ve detaylı parça giriş sisteminin (Akıllı Kategoriler, Otomatik Malzeme, Akıllı Bant) mevcut mimariye uygunluğunu doğrulayayım.

Özellikle veri şemasının bu yeni alanları (part_group, part_type, smart_edge_rule vb.) nasıl karşılayacağını kontrol etmeliyim.

Analyzed
DATA_MANAGEMENT_PLAN.md#L1-197
DATA_MANAGEMENT_PLAN.md
 dosyasını inceledim. Bu dosya genel veri yönetimi için (Müşteriler, Malzemeler, Kenar Bantları) ve Nesting proje yapısı (yani Project -> Modules -> Parts hiyerarşisi) için spesifik bir JSON şeması içermiyor. Sadece "Müşteri ve Malzeme" tanımları var.

Bu iyi bir haber, çünkü Nesting Veri Yapısı (nesting_data.json içinde 
nesting_projects
 altında saklanıyor) konusunda elimiz daha serbest. Implementation Plan veya 2D Nesting & Optimization Engine KI'sine bakmamıza gerek yok çünkü en güncel nesting.js ve 
app.py
 üzerinde çalışıyoruz. 
DATA_MANAGEMENT_PLAN.md
 dosyasındaki Malzeme ve Müşteri ID yapıları, bizim Nesting içinde referans vereceğimiz yapılarla uyumlu.

Önemli Tespitler:

Planladığımız değişiklikler, 
DATA_MANAGEMENT_PLAN.md
'deki merkezi varlık tanımlarına (Müşteri, Malzeme) zarar vermiyor.
parts objesine yeni alanlar (part_group, part_type) eklemek, mevcut JSON yapısını bozmuyor; sadece genişletiyor.
Planı güvenle uygulayabiliriz.

Kodlamaya Başlıyorum:

İlk adım: Sabit veri yapısını (CONST_PART_TYPES) ve yeni modül başlığı HTML'ini eklemek. Bunun için 
page_nesting.html
 dosyasını düzenleyeceğim.

Adım 1: Sabitleri ve Yardımcı Fonksiyonları Ekleme
Önce <script> bloğunun başına parça tanımlarını ekleyeceğim. Sonra addModule fonksiyonunu güncelleyeceğim.

Şimdi bu değişikliği yapıyorum.ilk adım olarak. sonra renderPartRowHTML'i güncelleyeceğim.

Sırasıyla:

CONST_PART_TYPES tanımı ekle.
addModule HTML yapısını güncelle (varsayılan malzeme seçimleri ekle).
renderPartRowHTML yapısını güncelle (select inputlar ve akıllı butonlar).
Gerekli CSS ekle.
Hadi başlayalım.

Şimdi dosyayı güncelliyorum. CONST_PART_TYPES ile başlıyoruz ve addModule fonksiyonun güncelliyorum. renderPartRowHTML'i de aynı anda güncelleyeceğim çünkü birbirine bağlılar. getCabinetParts() yardımcı fonksiyonunu da ekleyeceğim. updateStats, 
collectProjectData
 ve 
loadFromStorage
 fonksiyonlarını da yeni yapıya uyarlayacağım. CSS'i de style bloğuna ekleyeceğim.

Plan %100 doğrulandı ve herhangi bir "blocker" yok.

İşlem başlıyor.

İlk olarak constantları ve CSS'i ekleyelim, sonra fonksiyonları güncelleyelim.

Düzeltme: Tek bir replace_file_content yerine adım adım gideceğim ki hata riskini azaltayım. Önce CSS ve Constantları ekleyelim. Sonra JS fonksiyonlarını değiştirelim.

Ama tek seferde tüm JS ve HTML yapısını değiştirmek daha tutarlı olabilir çünkü renderPartRowHTML yeni HTML return edecek ve addModule yeni HTML üretecek. Parça parça yaparsam arada kırık bir state oluşabilir. O yüzden büyük bir güncelleme yapacağım.

Kritik Not: Kullanıcının localStorage'ını temizlemesi gerekecek yine, çünkü veri yapısı kökten değişiyor. Bunu not olarak ekleyeceğim.

Başlıyorum.

javascript
const CONST_PART_TYPES = {
    'cabinet': { label: 'Gövde', parts: ['Yan Dikme', 'Alt Tabla', 'Üst Tabla', 'Raf', 'Ara Dikme', 'Arkalk', 'Kayıt'] },
    'door': { label: 'Kapak', parts: ['Kapak', 'Çekmece Klavapası', 'Sabit Klavapa'] },
    'drawer': { label: 'Çekmece', parts: ['Çekmece Yanı', 'Çekmece Arkası', 'Çekmece Dibi'] },
    'custom': { label: 'Özel', parts: ['Özel Parça'] }
};
CSS'te pill-btn sınıfını eklemeliyim.

Şimdi dosyayı güncelliyorum. Bu büyük bir güncelleme. 
page_nesting.html
 dosyasını baştan aşağı yenileyeceğim (ilgili kısımları).

Dikkat: Dosya çok büyük, read_file ile okuyup local replacement yapıyorum.

Mevcut 
page_nesting.html
 dosyasındaki JS bloğunu tamamen değiştirmek yerine fonksiyonları tek tek güncelleyeceğim.

Adım 1: CSS ve Sabitler Adım 2: addModule güncellemesi Adım 3: renderPartRowHTML güncellemesi ve yeni yardımcı fonksiyonlar (updatePartMaterial, calcSmartEdges)

İlk önce CSS'i güncelleyelim. <style> bloğuna eklemeler yapacağım.

Sonra JS kısmına geçeceğiz.

Planım şu:

CSS Ekle: Akıllı bant butonları ve yeni select'ler için stiller.
JS Ekle: CONST_PART_TYPES, addModule, renderPartRowHTML, calcSmartEdges, autoFillPartAttributes. 
collectProjectData
 ve 
loadFromStorage
 güncellemeleri.
Hadi CSS ile başlayalım. <style> bloğunun sonuna ekleme yapıyorum.

Sonra JS fonksiyonlarını güncelleyeceğim.

Bekle, addModule içinde "Varsayılan Malzeme" seçimleri için defaults objesine ihtiyacımız var.

Başlıyoruz.

Önce tüm JS bloğunu incelemiştim (önceki tool calls).

Şimdi CSS ekliyorum. Sonra JS fonksiyonlarını replace edeceğim.

CSS Güncellemesi:

