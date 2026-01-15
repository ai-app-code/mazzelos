# 🏗️ Mazzel OS - Modular Workspace Plan

## 🎯 Objective
Transition from a monolithic Flask app to a "Gateway + Modules" architecture (Mazzel OS).
- **Gateway (`mazzel-gateway`)**: Handles Authentication, Shared Design System, and Routing.
- **Modules**: Independent apps (e.g., Teklif, Mail, Nesting) running on separate ports.

## 📦 Directory Structure
```
mazzelos/ (Local)
├── app.py              # Gateway logic (Port 5000)
├── templates/          # Design System (Base templates)
├── static/             # Unified CSS/JS
├── sync_design.py      # Design Distributor Script
├── deploy.py           # Vultr Deployment Script
└── modules/            # Future Home for Modules
    ├── teklif-app/
    └── ...
```

## ✅ Completed Tasks (Phase 1: Gateway & Design System)
- [x] **Design System Extraction**:
    - Centralized CSS in `static/css/main.css`.
    - Centralized Logic in `static/js/theme.js`.
    - Created Master Templates: `base.html` (Dashboard) & `base_public.html` (Landing).
- [x] **Modular Includes**: extracted `sidebar.html`, `header.html`, `navbar_public.html`.
- [x] **Page Refactoring**:
    - Dashboard Pages: `dashboard.html`, `settings.html`.
    - Public Pages: `login.html` (Landing), `page_hizmetler.html`, `page_referanslar.html`, `page_iletisim.html`.
- [x] **Sync Mechanism**: Created `sync_design.py` to distribute `base.html`, CSS, and JS to modules.
- [x] **Deployment Setup**: Updated `deploy.py` to push `static` assets and all templates.

## 🔄 Next Steps (Phase 2: Modules)
1. **Initialize Modules**:
    - Create/Move `teklif-app` into `modules/`.
2. **Apply Design**:
    - Run `python sync_design.py`.
    - Update Module templates to extend `base.html`.
3. **Configure Nginx**:
    - Update Vultr Nginx config to proxy `/teklif` to `127.0.0.1:5001`.

## 🚀 Deployment Status
- **Server**: Vultr (45.76.89.61)
- **URL**: [mazzelworks.com](http://mazzelworks.com)
- **Repo**: `mazzelos` (Serving as the Gateway)
