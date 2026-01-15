# 🏗️ Mazzel Workspace Architecture

Mazzel OS is transitioning to a **modular workspace architecture** where the central Gateway application orchestrates independent modules.

## Directory Structure

This project represents the **Gateway** (`mazzel-gateway`) and the **Design System**.

```
mazzel-workspace/           [Planned Root]
├── mazzel-gateway/         [Current Project]
│   ├── app.py              (Port 5000 - Entry Point)
│   ├── templates/
│   │   ├── base.html       (Master Design System)
│   │   ├── includes/       (Shared Components: Sidebar, Header)
│   ├── static/             (Shared Assets: CSS, JS)
│   └── sync_design.py      (Design System Distributor)
│
└── modules/                [External Modules]
    ├── teklif-app/         (Port 5001)
    ├── tokidb/             (Port 5002)
    └── ...
```

## 🎨 Design System

The core design system is maintained in `mazzel-gateway`. 
- **CSS**: `static/css/main.css` (Contains all global styles, themes, forms, and cards)
- **JS**: `static/js/theme.js` (Handles theme switching logic)
- **Templates**: `templates/base.html`, `templates/includes/`

To update the design for ALL apps:
1. Modify files in `mazzel-gateway`.
2. Run `python sync_design.py`.
3. The script copies the latest design assets to all registered modules in `../modules/`.

## 🚀 Deployment

- **Gateway**: Deploys to Port **5000**.
- **Static Files**: `static/` folder is now essential and must be deployed.
- **Modules**: Each module will have its own `deploy_MODULE.py` and run on separate ports (5001, 5002...). Nginx handles the routing.

## 🛠️ Development

1. **New Page in Gateway**: Create a template extending `base.html` and define block `content`.
2. **New Module**: 
   - Create folder in `../modules/`.
   - Setup separate Flask/Node app.
   - Register in `sync_design.py`.
   - Run sync to get base templates.
   - Extend `base.html` in the module.

## 🔑 Commands

- `python app.py` - Runs Gateway (Port 5000)
- `python sync_design.py` - Distributes design changes to modules.
- `python deploy.py` - Deploys Gateway to Production.
