# Mazzel Gateway - Dashboard HTML

Bu dosya, Mazzel Portal'ın (Gateway) ana karşılama ekranını oluşturur.
Sunucu üzerinde `/opt/mazzel/gateway/templates/dashboard.html` konumuna kaydedilecektir.

```bash
# 1. Önce klasör yapısını oluştur
mkdir -p /opt/mazzel/gateway/templates

# 2. Dosyayı oluştur
cat <<EOF > /opt/mazzel/gateway/templates/dashboard.html
<!DOCTYPE html>
<html>
<head>
    <title>Mazzel OS | Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background-color: #121212; color: #e0e0e0; }
        .navbar { background-color: #1e1e1e; border-bottom: 1px solid #333; }
        .module-card { 
            background-color: #1e1e1e; border: 1px solid #333; 
            transition: transform 0.2s, border-color 0.2s; cursor: pointer;
            height: 100%; text-decoration: none; color: inherit; display: block;
        }
        .module-card:hover { transform: translateY(-5px); border-color: #0d6efd; }
        .icon-box { font-size: 3rem; margin-bottom: 15px; color: #0d6efd; }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark p-3">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold" href="#">MAZZEL OS <span class="badge bg-primary ms-2">v1.0</span></a>
            <div class="d-flex">
                <span class="navbar-text me-3">Hosgeldin, {{ user }}</span>
                <a href="/logout" class="btn btn-outline-danger btn-sm">Cikis</a>
            </div>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="row g-4">
            <!-- TEKLIF MODULU -->
            <div class="col-md-4">
                <a href="/teklif/" class="card module-card p-4 text-center">
                    <div class="icon-box"><i class="fas fa-file-invoice-dollar"></i></div>
                    <h4>Teklif Hazirlama</h4>
                    <p class="text-muted small">Cami, Karavan ve Ahsap isleri icin teklif olustur.</p>
                    <span class="badge bg-success">Aktif</span>
                </a>
            </div>

            <!-- MAIL MODULU -->
            <div class="col-md-4">
                <a href="/mail/" class="card module-card p-4 text-center">
                    <div class="icon-box"><i class="fas fa-envelope-open-text"></i></div>
                    <h4>Mazzel Mail</h4>
                    <p class="text-muted small">Musterilere PDF teklif gonderimi ve takibi.</p>
                    <span class="badge bg-warning text-dark">Gelistiriliyor</span>
                </a>
            </div>

            <!-- NESTING MODULU -->
            <div class="col-md-4">
                <a href="/maliyet/" class="card module-card p-4 text-center">
                    <div class="icon-box"><i class="fas fa-th-large"></i></div>
                    <h4>Maliyet & Nesting</h4>
                    <p class="text-muted small">MDF plaka yerlesimi ve fire hesabi.</p>
                    <span class="badge bg-secondary">Yakinda</span>
                </a>
            </div>
        </div>
    </div>
</body>
</html>
EOF
```
