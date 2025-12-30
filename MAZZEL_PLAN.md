# Mazzel Portal - Mimari Dönüşüm ve Acil Durum Planı

## Durum Özeti
Kırmızı "bağlantı yok" ikonu backend servisinin (API) cevap vermediğini gösteriyor. 
Zihnindeki karmaşayı tek bir merkezde (Mazzel Portal) toplayıp, sistemi modüler hale getirecek mimariyi çiziyoruz. 
Sunucu: Vultr (2 vCPU, 2GB RAM, Ubuntu 24.04). Kaynaklar yeterli, doğru yönetim gerekli.

## İş Planı
1. **Yangını Söndür**: Backend'i Ayağa Kaldır.
2. **Mimariyi Kur**: Tek Merkez, Çok Modül (Mazzel OS Mantığı).

---

## ADIM 1: ACİL MÜDAHALE (Backend Neden Durdu?)

Site (Frontend) açılıyor çünkü o sadece HTML/JS dosyaları (Nginx sunuyor). Ama veri gelmiyor çünkü Python/Node servisin (Backend) durmuş.

**Hemen terminalden (SSH) şunları kontrol et:**

1.  **Backend servisin çalışıyor mu?** (Servis adını `mazzel-backend` veya benzeri bir şey yapmıştık):
    ```bash
    sudo systemctl status mazzel-backend
    # Eğer "inactive" veya "failed" diyorsa:
    sudo systemctl restart mazzel-backend
    ```

    *Not: Eğer servisi systemd'ye bağlamadıysan ve elle `python app.py` diye çalıştırdıysan, SSH'ı kapatınca kapanmıştır. Bunu systemd servisi yapmamız şart.*

2.  **Loglara bakalım, hata ne?**
    ```bash
    journalctl -u mazzel-backend -n 50 --no-pager
    ```
    (Bu çıktıyı paylaşırsan hatayı nokta atışı çözeriz.)

---

## ADIM 2: YENİ MİMARİ (Mazzel OS Mantığı)

Hedeflenen yapı "Micro-Frontend" veya "Modüler Monolit" arası bir şey. GitHub'daki projeleri tek bir çatı altında toplayacağız.

### Mevcut Durum
*   `mazzelworks.com` -> Teklif Uygulaması (Backend + Frontend karışık)

### Hedeflenen Düzen (Mazzel Hub)
Vultr sunucusunda `/opt/mazzel/` klasörü ana üssümüz olacak.

*   **Ana Karşılama (Gateway):** `mazzelworks.com`
    *   Burası sadece giriş ekranı (Login) ve menü olacak.
    *   Kullanıcı giriş yapınca Dashboard'a düşecek.

*   **Modüller (GitHub Repoları):**
    *   **Teklif Modülü:** `/opt/mazzel/teklif-app` (Port 8001) -> `mazzelworks.com/teklif`
    *   **Mail Modülü:** `/opt/mazzel/mail-app` (Port 8002) -> `mazzelworks.com/mail`
    *   **Nesting Modülü:** `/opt/mazzel/nesting-app` (Port 8003) -> `mazzelworks.com/maliyet`

### Nasıl Yapacağız? (Nginx Reverse Proxy)
Tüm projeleri tek bir Nginx yönetecek.

```nginx
# Örnek Nginx Mantığı
server {
    server_name mazzelworks.com;

    # Ana Giriş (Portal)
    location / {
        proxy_pass http://localhost:3000; # Ana Dashboard
    }

    # Teklif Modülü
    location /teklif/ {
        proxy_pass http://localhost:8001; # Python App 1
    }

    # Mail Modülü
    location /mail/ {
        proxy_pass http://localhost:8002; # Python App 2
    }
}
```

---

## ADIM 3: GITHUB VE UPDATE YÖNETİMİ (Antigravity Gateway)

"Her proje ayrı GitHub reposu, ama sunucuda nasıl birleşecek?" sorusunun cevabı.

### Yöntem
Vultr içinde `/var/www/mazzelworks/` diye bir klasör aç. Her projeyi buraya ayrı klasör olarak çek (`git clone`).

*   `/var/www/mazzelworks/portal` (Ana React/Vue app)
*   `/var/www/mazzelworks/backend-teklif` (Python)
*   `/var/www/mazzelworks/backend-mail` (Python)

### IDE Bağlantısı (Gateway)
"Antigravity IDE" dediğin yerde (VS Code) "Remote - SSH" eklentisi kuruyoruz.
*   Bu sayede Vultr sunucusundaki dosyaları sanki kendi bilgisayarındaymış gibi açıp düzenleyebilirsin.
*   Github'a pushlamadan bile canlıda kod deneyebilirsin (Test ortamı için), sonra commit atarsın.

---

## ÖZET VE AKSİYON

Sırasıyla yapılması gerekenler:

1.  **Backend'i Canlandır:** SSH ile bağlan, servisi yeniden başlat (`systemctl restart ...`). Loglara bak.
2.  **Karar Ver:** Mevcut `mazzelworks.com` kalsın mı, yoksa hemen "Portal" yapısına çevirip, teklif uygulamasını `/teklif` altına mı taşıyalım?

**Bekleniyor:** Backend logu veya durumu.
