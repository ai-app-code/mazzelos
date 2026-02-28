from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from flask import Response
from functools import wraps
from datetime import timedelta, date, datetime
import os
import json
import sqlite3
import subprocess
import time
import threading
from urllib.error import HTTPError, URLError
from urllib.request import urlopen, Request as UrlRequest
from urllib.parse import quote

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get('MAZZEL_DATA_DIR', os.path.join(BASE_DIR, 'data'))

SETTINGS_FILE = os.environ.get('MAZZEL_SETTINGS_FILE', os.path.join(DATA_DIR, 'settings.json'))
NESTING_DATA_FILE = os.environ.get('MAZZEL_NESTING_DATA_FILE', os.path.join(DATA_DIR, 'nesting_data.json'))

TOKIDB_BASE_URL = os.environ.get('TOKIDB_BASE_URL', 'http://127.0.0.1:3001').rstrip('/')
TOKIDB_TIMEOUT_SEC = float(os.environ.get('TOKIDB_TIMEOUT_SEC', '10'))
TOKIDB_INTERNAL_TOKEN = os.environ.get('TOKIDB_INTERNAL_TOKEN')

app.secret_key = os.environ.get('MAZZEL_SECRET_KEY', 'mazzel-secret-key-2025')

# Optional: persist the session cookie across browser/PC restarts.
_session_permanent_raw = (os.environ.get('MAZZEL_SESSION_PERMANENT') or '').lower().strip()
MAZZEL_SESSION_PERMANENT = _session_permanent_raw in ('1', 'true', 'yes', 'on')
try:
    MAZZEL_SESSION_DAYS = int(os.environ.get('MAZZEL_SESSION_DAYS', '7'))
except Exception:
    MAZZEL_SESSION_DAYS = 7
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=max(1, MAZZEL_SESSION_DAYS))

# Basit kullanici
_admin_user = os.environ.get('MAZZEL_ADMIN_USER', 'admin')
_admin_password = os.environ.get('MAZZEL_ADMIN_PASSWORD', 'mazzel2025')
USERS = {_admin_user: _admin_password}

# Login decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            # For API requests, return JSON 401 instead of redirecting to the login HTML.
            # This prevents frontend fetch() calls from receiving HTML (302->/login) and breaking JSON parsing.
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Ayarlar dosyasi: SETTINGS_FILE env ile override edilebilir.

# TETRA local autostart (Windows only)
TETRA_URL_DEFAULT = 'http://localhost:5173/'
TETRA_HEALTH_URL_DEFAULT = 'http://localhost:3001/api/health'
TETRA_AUTOSTART = os.environ.get('TETRA_AUTOSTART', 'auto').lower()
TETRA_START_SCRIPT = os.environ.get(
    'TETRA_START_SCRIPT',
    os.path.join(os.path.dirname(__file__), 'start-tetra-local.bat')
)

_tetra_start_lock = threading.Lock()
_tetra_starting = False

def _is_http_url(url):
    return url.startswith('http://') or url.startswith('https://')

def _url_ok(url, timeout=1.0):
    if not _is_http_url(url):
        return False
    try:
        with urlopen(url, timeout=timeout) as resp:
            return resp.status < 500
    except Exception:
        return False

def _launch_start_script():
    # Use the Windows shell "start" to open new consoles reliably.
    try:
        subprocess.Popen(f'start "" "{TETRA_START_SCRIPT}"', shell=True)
    except Exception:
        pass

def _maybe_start_tetra(tetra_url, health_url):
    global _tetra_starting
    if os.name != 'nt':
        return
    if TETRA_AUTOSTART not in ('1', 'true', 'yes', 'auto'):
        return
    if _url_ok(tetra_url) and _url_ok(health_url):
        return
    if not os.path.exists(TETRA_START_SCRIPT):
        return
    with _tetra_start_lock:
        if _tetra_starting:
            return
        _tetra_starting = True
    try:
        _launch_start_script()
        for _ in range(20):
            if _url_ok(tetra_url):
                break
            time.sleep(0.5)
    finally:
        _tetra_starting = False

def load_settings():
    default_settings = {
        "theme": "dark",
        "site_title": "Mazzel Works Portal",
        "site_subtitle": "Profesyonel iş yönetimi, teklif hazırlama ve maliyet analizi için tek platform",
        "show_weather": True,
        "show_currency": True,
        "show_news": True,
        "show_clock": True,
        "weather_city": "Istanbul",
        "modules": [
            {"id": "teklif", "name": "Teklif Hazırla", "icon": "fa-file-invoice-dollar", "url": "/teklif/", "status": "active", "enabled": True},
            {"id": "mail", "name": "Mazzel Mail", "icon": "fa-envelope", "url": "/mail/", "status": "dev", "enabled": True},
            {"id": "maliyet", "name": "Maliyet Hesapla", "icon": "fa-calculator", "url": "/maliyet/", "status": "soon", "enabled": True},
            {"id": "tokidb", "name": "TOKI DB", "icon": "fa-database", "url": "/tokidb/", "status": "active", "enabled": True},
            {"id": "musteriler", "name": "Müşteriler", "icon": "fa-users", "url": "/musteriler/", "status": "soon", "enabled": True},
            {"id": "raporlar", "name": "Raporlar", "icon": "fa-chart-bar", "url": "/raporlar/", "status": "soon", "enabled": True},
            {"id": "ayarlar", "name": "Ayarlar", "icon": "fa-cog", "url": "/settings", "status": "active", "enabled": True}
        ],
        "nav_links": [
            {"name": "Ana Sayfa", "url": "/", "enabled": True},
            {"name": "Hizmetler", "url": "/hizmetler", "enabled": True},
            {"name": "Referanslar", "url": "/referanslar", "enabled": True},
            {"name": "İletişim", "url": "/iletisim", "enabled": True}
        ],
        "notifications": []
    }
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                default_settings.update(saved)
    except:
        pass
    return default_settings

def save_settings(settings):
    try:
        os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

# ── Vite manifest loader for masrafci ──────────────────────────
_masrafci_manifest_cache = None
_masrafci_manifest_cache_mtime = None

def _load_masrafci_manifest():
    """Load Vite manifest for the masrafci app. Returns dict with 'js' and 'css' keys, or None."""
    global _masrafci_manifest_cache, _masrafci_manifest_cache_mtime

    manifest_path = os.path.join(BASE_DIR, 'static', 'apps', 'masrafci', '.vite', 'manifest.json')
    if not os.path.exists(manifest_path):
        _masrafci_manifest_cache = None
        _masrafci_manifest_cache_mtime = None
        return None

    # In production mode, cache until manifest mtime changes.
    manifest_mtime = os.path.getmtime(manifest_path)
    if (
        not app.debug
        and _masrafci_manifest_cache is not None
        and _masrafci_manifest_cache_mtime == manifest_mtime
    ):
        return _masrafci_manifest_cache

    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    except (json.JSONDecodeError, OSError):
        _masrafci_manifest_cache = None
        _masrafci_manifest_cache_mtime = None
        return None

    entry = None
    for value in manifest.values():
        if isinstance(value, dict) and value.get('isEntry'):
            entry = value
            break
    if entry is None:
        return None

    prefix = 'apps/masrafci/'
    result = {
        'js': url_for('static', filename=prefix + entry['file']),
        'css': [url_for('static', filename=prefix + c) for c in entry.get('css', [])],
    }
    _masrafci_manifest_cache = result
    _masrafci_manifest_cache_mtime = manifest_mtime
    return result


def _proxy_url(url, timeout=TOKIDB_TIMEOUT_SEC):
    method = request.method.upper()
    body = None
    if method not in ('GET', 'HEAD'):
        body = request.get_data() or b''

    headers = {}
    # Forward only the minimal set of headers we need.
    for name in ('Content-Type', 'Accept'):
        if name in request.headers:
            headers[name] = request.headers[name]
    if TOKIDB_INTERNAL_TOKEN:
        headers['X-TOKIDB-INTERNAL-TOKEN'] = TOKIDB_INTERNAL_TOKEN

    upstream_req = UrlRequest(url, data=body, headers=headers, method=method)

    def _build_response(status, payload, upstream_headers):
        resp = Response(payload, status=status)
        hop_by_hop = {
            'connection',
            'keep-alive',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
            'transfer-encoding',
            'upgrade',
            'content-length',
        }
        if upstream_headers:
            for key, value in upstream_headers.items():
                if key.lower() in hop_by_hop:
                    continue
                resp.headers[key] = value
        return resp

    try:
        with urlopen(upstream_req, timeout=timeout) as upstream_resp:
            return _build_response(
                upstream_resp.status,
                upstream_resp.read(),
                upstream_resp.headers,
            )
    except HTTPError as e:
        try:
            payload = e.read()
        except Exception:
            payload = b''
        return _build_response(e.code, payload, getattr(e, 'headers', None))
    except URLError as e:
        return jsonify({
            'success': False,
            'error': 'Upstream unavailable',
            'details': str(e),
        }), 502

@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    settings = load_settings()
    return render_template('login.html', settings=settings)

@app.route('/login', methods=['GET', 'POST'])
def login():
    settings = load_settings()
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if USERS.get(username) == password:
            session['user'] = username
            if MAZZEL_SESSION_PERMANENT:
                session.permanent = True
            return redirect(url_for('dashboard'))
        return render_template('login.html', error="Hatalı kullanıcı adı veya şifre", settings=settings)
    return render_template('login.html', settings=settings)

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    settings = load_settings()
    return render_template('dashboard.html', user=session['user'], settings=settings, active_page='dashboard')

@app.route('/settings', methods=['GET', 'POST'])
def settings_page():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    settings = load_settings()
    
    if request.method == 'POST':
        # Update settings from form
        settings['site_title'] = request.form.get('site_title', settings['site_title'])
        settings['site_subtitle'] = request.form.get('site_subtitle', settings['site_subtitle'])
        settings['theme'] = request.form.get('theme', 'dark')
        settings['show_weather'] = 'show_weather' in request.form
        settings['show_currency'] = 'show_currency' in request.form
        settings['show_news'] = 'show_news' in request.form
        settings['show_clock'] = 'show_clock' in request.form
        settings['weather_city'] = request.form.get('weather_city', 'Istanbul')
        
        # Update modules
        for module in settings['modules']:
            module['enabled'] = f"module_{module['id']}" in request.form
            new_name = request.form.get(f"module_{module['id']}_name")
            if new_name:
                module['name'] = new_name
        
        save_settings(settings)
        return render_template('settings.html', user=session['user'], settings=settings, success=True, active_page='settings')
    
    return render_template('settings.html', user=session['user'], settings=settings, active_page='settings')

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if request.method == 'POST':
        settings = load_settings()
        data = request.json
        settings.update(data)
        save_settings(settings)
        return jsonify({'success': True})
    
    return jsonify(load_settings())

@app.route('/api/notification', methods=['POST'])
def add_notification():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    settings = load_settings()
    data = request.json
    settings['notifications'].append({
        'message': data.get('message', ''),
        'type': data.get('type', 'info')
    })
    save_settings(settings)
    return jsonify({'success': True})

@app.route('/api/tokidb/health', methods=['GET'])
@login_required
def tokidb_health():
    return _proxy_url(f"{TOKIDB_BASE_URL}/health")

@app.route('/api/tokidb/<path:subpath>', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@login_required
def tokidb_api_proxy(subpath):
    # Flask decodes path params, so re-encode to preserve spaces/Turkish chars safely.
    encoded_subpath = quote(subpath.lstrip('/'), safe='/')
    target_url = f"{TOKIDB_BASE_URL}/api/{encoded_subpath}"
    if request.query_string:
        target_url = f"{target_url}?{request.query_string.decode('utf-8', errors='ignore')}"
    return _proxy_url(target_url)

@app.route('/tetra/')
@login_required
def tetra():
    """TETRA AI Münazara sistemi - standalone sayfaya yönlendir"""
    # Local: http://localhost:5173/
    # Production: /tetra-app/
    tetra_url = os.environ.get('TETRA_URL', TETRA_URL_DEFAULT)
    health_url = os.environ.get('TETRA_HEALTH_URL', TETRA_HEALTH_URL_DEFAULT)
    _maybe_start_tetra(tetra_url, health_url)
    if not _url_ok(tetra_url):
        return (
            "<!DOCTYPE html>"
            "<html lang='en'>"
            "<head>"
            "<meta charset='utf-8'/>"
            "<meta name='viewport' content='width=device-width, initial-scale=1'/>"
            "<meta http-equiv='refresh' content='3'/>"
            "<title>Starting TETRA...</title>"
            "<style>"
            "body{font-family:Arial,Helvetica,sans-serif;margin:0;display:flex;min-height:100vh;"
            "align-items:center;justify-content:center;background:#0b1220;color:#e2e8f0}"
            ".box{max-width:520px;padding:24px 28px;border:1px solid #1e293b;border-radius:12px;"
            "background:#0f172a;box-shadow:0 10px 30px rgba(0,0,0,0.3)}"
            "h1{margin:0 0 8px;font-size:20px}"
            "p{margin:6px 0;color:#94a3b8;font-size:14px;line-height:1.5}"
            "</style>"
            "</head>"
            "<body>"
            "<div class='box'>"
            "<h1>Starting TETRA...</h1>"
            "<p>Services are starting on your machine. This page will refresh in a few seconds.</p>"
            "<p>If it keeps loading, check that Node.js is installed and the terminal windows opened.</p>"
            "</div>"
            "</body>"
            "</html>"
        )
    return redirect(tetra_url)


@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# Moduller icin placeholder
@app.route('/teklif/')
def teklif():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('module_placeholder.html', user=session['user'], module_name="Teklif Hazırlama", module_icon="fa-file-invoice-dollar", active_page='teklif')

@app.route('/mail/')
@login_required
def mail():
    return render_template('module_placeholder.html', user=session['user'], module_name="Mazzel Mail", module_icon="fa-envelope", active_page='mail')

@app.route('/maliyet/')
@login_required
def maliyet():
    return render_template('module_placeholder.html',
                         module_name="Maliyet Hesaplama",
                         module_icon="fa-calculator",
                         active_page='maliyet',
                         user=session.get('user'))

@app.route('/masrafci/')
@login_required
def masrafci():
    manifest = _load_masrafci_manifest()
    if manifest is None:
        return render_template('module_placeholder.html',
                             module_name="Masrafçı",
                             module_icon="fa-wallet",
                             active_page='masrafci',
                             user=session.get('user'))
    return render_template('page_masrafci.html',
                         active_page='masrafci',
                         user=session.get('user'),
                         masrafci_js=manifest['js'],
                         masrafci_css=manifest['css'])

@app.route('/tokidb/')
@login_required
def tokidb_dashboard():
    return render_template('tokidb/dashboard.html', user=session['user'], active_page='tokidb')

@app.route('/tokidb/projects')
@login_required
def tokidb_projects():
    return render_template('tokidb/projects.html', user=session['user'], active_page='tokidb_projects')

@app.route('/tokidb/projects/<toki_id>')
@login_required
def tokidb_project_detail(toki_id):
    return render_template('tokidb/project_detail.html', user=session['user'], active_page='tokidb_projects', toki_id=toki_id)

@app.route('/tokidb/cities')
@login_required
def tokidb_cities():
    return render_template('tokidb/cities.html', user=session['user'], active_page='tokidb_cities')

@app.route('/tokidb/companies')
@login_required
def tokidb_companies():
    return render_template('tokidb/companies.html', user=session['user'], active_page='tokidb_companies')

@app.route('/tokidb/companies/<name>')
@login_required
def tokidb_company_detail(name):
    return render_template('tokidb/company_detail.html', user=session['user'], active_page='tokidb_companies', company_name=name)

@app.route('/tokidb/watchlist')
@login_required
def tokidb_watchlist():
    return render_template('tokidb/watchlist.html', user=session['user'], active_page='tokidb_watchlist')

@app.route('/tokidb/admin')
@login_required
def tokidb_admin():
    return render_template('tokidb/admin.html', user=session['user'], active_page='tokidb_admin')

def load_nesting_data():
    default_data = {"customers": [], "materials": [], "nesting_projects": []}
    try:
        if os.path.exists(NESTING_DATA_FILE):
            with open(NESTING_DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return default_data

@app.route('/nesting/')
@login_required
def nesting():
    data = load_nesting_data()
    return render_template('page_nesting.html', 
                         active_page='nesting',
                         user=session.get('user'),
                         customers=data.get('customers', []),
                         materials=data.get('materials', []),
                         edge_bands=data.get('edge_bands', []),
                         material_categories=data.get('material_categories', []))

@app.route('/nesting/projects')
@login_required
def nesting_projects():
    data = load_nesting_data()
    return render_template('page_nesting_projects.html', 
                         active_page='nesting_list',
                         user=session.get('user'),
                         projects=data.get('nesting_projects', []),
                         customers=data.get('customers', []))

def save_nesting_data(data):
    try:
        os.makedirs(os.path.dirname(NESTING_DATA_FILE), exist_ok=True)
        with open(NESTING_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

@app.route('/api/nesting/project', methods=['POST'])
@login_required
def save_nesting_project():
    try:
        project_data = request.json
        data = load_nesting_data()
        
        # Check if updating existing or creating new
        project_id = project_data.get('id')
        if project_id:
            # Update existing
            for i, p in enumerate(data['nesting_projects']):
                if p['id'] == project_id:
                    data['nesting_projects'][i] = project_data
                    break
        else:
            # Create new with unique ID
            import time
            project_data['id'] = f"nest_{int(time.time())}"
            project_data['created_at'] = time.strftime('%Y-%m-%d')
            data['nesting_projects'].append(project_data)
        
        save_nesting_data(data)
        return jsonify({'success': True, 'id': project_data['id']})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/nesting/project/<project_id>', methods=['GET'])
@login_required
def get_nesting_project(project_id):
    data = load_nesting_data()
    for p in data['nesting_projects']:
        if p['id'] == project_id:
            return jsonify(p)
    return jsonify({'error': 'Project not found'}), 404

@app.route('/api/nesting/project/<project_id>', methods=['DELETE'])
@login_required
def delete_nesting_project(project_id):
    data = load_nesting_data()
    data['nesting_projects'] = [p for p in data['nesting_projects'] if p['id'] != project_id]
    save_nesting_data(data)
    return jsonify({'success': True})

@app.route('/api/nesting/materials', methods=['GET'])
@login_required
def get_materials():
    data = load_nesting_data()
    category = request.args.get('category')
    materials = data.get('materials', [])
    if category:
        materials = [m for m in materials if m.get('category') == category]
    return jsonify(materials)

@app.route('/api/nesting/customers', methods=['GET'])
@login_required
def get_customers():
    data = load_nesting_data()
    return jsonify(data.get('customers', []))

# === CUSTOMER CRUD ===
@app.route('/api/customers', methods=['GET'])
@login_required
def api_get_customers():
    data = load_nesting_data()
    return jsonify(data.get('customers', []))

@app.route('/api/customers', methods=['POST'])
@login_required
def api_create_customer():
    try:
        customer = request.json
        data = load_nesting_data()
        import time
        customer['id'] = f"cust_{int(time.time())}"
        customer['created_at'] = time.strftime('%Y-%m-%d')
        customer['status'] = 'active'
        if 'customers' not in data:
            data['customers'] = []
        data['customers'].append(customer)
        save_nesting_data(data)
        return jsonify({'success': True, 'id': customer['id']})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/customers/<customer_id>', methods=['GET'])
@login_required
def api_get_customer(customer_id):
    data = load_nesting_data()
    for c in data.get('customers', []):
        if c['id'] == customer_id:
            return jsonify(c)
    return jsonify({'error': 'Customer not found'}), 404

@app.route('/api/customers/<customer_id>', methods=['PUT'])
@login_required
def api_update_customer(customer_id):
    try:
        updated = request.json
        data = load_nesting_data()
        for i, c in enumerate(data.get('customers', [])):
            if c['id'] == customer_id:
                updated['id'] = customer_id
                data['customers'][i] = updated
                save_nesting_data(data)
                return jsonify({'success': True})
        return jsonify({'error': 'Customer not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/customers/<customer_id>', methods=['DELETE'])
@login_required
def api_delete_customer(customer_id):
    data = load_nesting_data()
    data['customers'] = [c for c in data.get('customers', []) if c['id'] != customer_id]
    save_nesting_data(data)
    return jsonify({'success': True})

# === MATERIAL CRUD ===
@app.route('/api/materials', methods=['GET'])
@login_required
def api_get_materials():
    data = load_nesting_data()
    category = request.args.get('category')
    materials = data.get('materials', [])
    if category:
        materials = [m for m in materials if m.get('category') == category]
    return jsonify(materials)

@app.route('/api/materials', methods=['POST'])
@login_required
def api_create_material():
    try:
        material = request.json
        data = load_nesting_data()
        import time
        material['id'] = f"mat_{int(time.time())}"
        material['status'] = 'active'
        if 'materials' not in data:
            data['materials'] = []
        data['materials'].append(material)
        save_nesting_data(data)
        return jsonify({'success': True, 'id': material['id']})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/materials/<material_id>', methods=['PUT'])
@login_required
def api_update_material(material_id):
    try:
        updated = request.json
        data = load_nesting_data()
        for i, m in enumerate(data.get('materials', [])):
            if m['id'] == material_id:
                updated['id'] = material_id
                data['materials'][i] = updated
                save_nesting_data(data)
                return jsonify({'success': True})
        return jsonify({'error': 'Material not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/materials/<material_id>', methods=['DELETE'])
@login_required
def api_delete_material(material_id):
    data = load_nesting_data()
    data['materials'] = [m for m in data.get('materials', []) if m['id'] != material_id]
    save_nesting_data(data)
    return jsonify({'success': True})

@app.route('/api/categories', methods=['GET'])
@login_required
def api_get_categories():
    data = load_nesting_data()
    return jsonify(data.get('material_categories', []))

# === PAGE ROUTES ===
@app.route('/musteriler/')
@login_required
def musteriler():
    data = load_nesting_data()
    return render_template('page_musteriler.html', 
                         user=session['user'], 
                         active_page='musteriler',
                         customers=data.get('customers', []))

@app.route('/malzemeler/')
@login_required
def malzemeler():
    data = load_nesting_data()
    return render_template('page_malzemeler.html', 
                         user=session['user'], 
                         active_page='malzemeler',
                         materials=data.get('materials', []),
                         categories=data.get('material_categories', []))

@app.route('/raporlar/')
@login_required
def raporlar():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('module_placeholder.html', user=session['user'], module_name="Raporlar", module_icon="fa-chart-bar")

@app.route('/hizmetler')
def hizmetler():
    settings = load_settings()
    return render_template('page_hizmetler.html', settings=settings)

@app.route('/referanslar')
def referanslar():
    settings = load_settings()
    return render_template('page_referanslar.html', settings=settings)

@app.route('/iletisim')
def iletisim():
    settings = load_settings()
    return render_template('page_iletisim.html', settings=settings)

# ── Masrafci SQLite Backend ──────────────────────────────────
MASRAFCI_DB_PATH = os.path.join(DATA_DIR, 'masrafci.db')

_MASRAFCI_ALLOWED_FIELDS = {
    'type', 'ad', 'tutar', 'ay', 'tarih', 'kategori', 'kurum',
    'odeme_yontemi', 'son_odeme', 'durum', 'taksit_sayisi',
    'taksit_odenen', 'aylik_tutar', 'kart', 'otomatik_odeme',
    'telefon', 'iban', 'notlar', 'abone_no',
}

def _get_masrafci_db():
    os.makedirs(os.path.dirname(MASRAFCI_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(MASRAFCI_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('harcama','fatura','kredikarti','alacakli')),
            ad TEXT NOT NULL,
            tutar REAL DEFAULT 0,
            ay TEXT,
            tarih TEXT,
            kategori TEXT,
            kurum TEXT,
            odeme_yontemi TEXT,
            son_odeme TEXT,
            durum TEXT DEFAULT 'odenmedi',
            taksit_sayisi INTEGER,
            taksit_odenen INTEGER DEFAULT 0,
            aylik_tutar REAL,
            kart TEXT,
            otomatik_odeme INTEGER DEFAULT 0,
            telefon TEXT,
            iban TEXT,
            notlar TEXT,
            abone_no TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)
    try:
        conn.execute("ALTER TABLE records ADD COLUMN abone_no TEXT")
    except sqlite3.OperationalError:
        pass  # kolon zaten var
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bill_reminder_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            provider_key TEXT NOT NULL,
            display_name TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            expected_start_day INTEGER NOT NULL DEFAULT 1 CHECK(expected_start_day BETWEEN 1 AND 28),
            expected_end_day INTEGER NOT NULL DEFAULT 28 CHECK(expected_end_day BETWEEN 1 AND 28),
            lead_days INTEGER NOT NULL DEFAULT 3 CHECK(lead_days BETWEEN 0 AND 14),
            last_prompted_month TEXT,
            snooze_until TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime')),
            UNIQUE(user, provider_key)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bill_reminder_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id INTEGER NOT NULL REFERENCES bill_reminder_rules(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','prompted','entered','skipped_month','dismissed')),
            prompted_at TEXT,
            answered_at TEXT,
            linked_record_id INTEGER REFERENCES records(id) ON DELETE SET NULL,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            UNIQUE(rule_id, month)
        )
    """)
    return conn

def _row_to_dict(row):
    d = dict(row)
    d['otomatik_odeme'] = bool(d.get('otomatik_odeme'))
    return d


def _normalize_provider_key(raw: str) -> str:
    _TR_MAP = str.maketrans({
        '\u00e7': 'c', '\u00c7': 'c',  # ç, Ç
        '\u015f': 's', '\u015e': 's',  # ş, Ş
        '\u011f': 'g', '\u011e': 'g',  # ğ, Ğ
        '\u00fc': 'u', '\u00dc': 'u',  # ü, Ü
        '\u00f6': 'o', '\u00d6': 'o',  # ö, Ö
        '\u0131': 'i', '\u0130': 'i',  # ı, İ
    })
    text = (raw or '').strip().lower().translate(_TR_MAP)
    return ' '.join(text.split())


def _run_reminder_check(conn, user, month):
    today = date.today()
    today_day = today.day
    today_iso = today.isoformat()

    rules = conn.execute(
        "SELECT * FROM bill_reminder_rules WHERE user = ? AND enabled = 1",
        (user,)
    ).fetchall()

    fatura_records = conn.execute(
        "SELECT kurum FROM records WHERE user = ? AND type = 'fatura' AND ay = ?",
        (user, month)
    ).fetchall()
    fatura_keys = {_normalize_provider_key(r['kurum'] or '') for r in fatura_records}

    for rule in rules:
        provider_key = rule['provider_key']

        # Bu ay icin fatura zaten girilmis mi?
        if provider_key in fatura_keys:
            continue

        # Gun araligi kontrolu (lead_days dahil)
        start_day = max(1, rule['expected_start_day'] - rule['lead_days'])
        end_day = rule['expected_end_day']
        if not (start_day <= today_day <= end_day):
            continue

        # Snooze kontrolu
        snooze = rule['snooze_until']
        if snooze and snooze > today_iso:
            continue

        # Bu rule+month icin event var mi?
        existing = conn.execute(
            "SELECT id FROM bill_reminder_events WHERE rule_id = ? AND month = ?",
            (rule['id'], month)
        ).fetchone()
        if existing:
            continue

        # Yeni pending event olustur
        conn.execute(
            "INSERT INTO bill_reminder_events (rule_id, month, status) VALUES (?, ?, 'pending')",
            (rule['id'], month)
        )

    conn.commit()

    # Tum pending event'leri don (rule bilgileriyle birlikte)
    rows = conn.execute("""
        SELECT e.*, r.display_name, r.provider_key, r.expected_start_day, r.expected_end_day
        FROM bill_reminder_events e
        JOIN bill_reminder_rules r ON e.rule_id = r.id
        WHERE r.user = ? AND e.month = ? AND e.status = 'pending'
        ORDER BY r.expected_start_day ASC
    """, (user, month)).fetchall()
    return [dict(r) for r in rows]

@app.route('/api/masrafci/records', methods=['GET'])
@login_required
def masrafci_records_list():
    record_type = request.args.get('type')
    month = request.args.get('month')
    conn = _get_masrafci_db()
    try:
        clauses = ['user = ?']
        params = [session['user']]
        if record_type:
            clauses.append('type = ?')
            params.append(record_type)
        if month:
            clauses.append('ay = ?')
            params.append(month)
        sql = f"SELECT * FROM records WHERE {' AND '.join(clauses)} ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        return jsonify([_row_to_dict(r) for r in rows])
    finally:
        conn.close()

@app.route('/api/masrafci/records', methods=['POST'])
@login_required
def masrafci_records_create():
    data = request.get_json(silent=True) or {}
    ad = (data.get('ad') or '').strip()
    record_type = data.get('type', '')
    if not ad:
        return jsonify({'error': 'ad alanı zorunludur'}), 400
    if record_type not in ('harcama', 'fatura', 'kredikarti', 'alacakli'):
        return jsonify({'error': 'Geçersiz kayıt tipi'}), 400

    filtered = {k: data[k] for k in _MASRAFCI_ALLOWED_FIELDS if k in data}
    filtered['user'] = session['user']
    if 'otomatik_odeme' in filtered:
        filtered['otomatik_odeme'] = 1 if filtered['otomatik_odeme'] else 0

    cols = list(filtered.keys())
    placeholders = ', '.join(['?'] * len(cols))
    col_names = ', '.join(cols)
    values = [filtered[c] for c in cols]

    conn = _get_masrafci_db()
    try:
        cur = conn.execute(f"INSERT INTO records ({col_names}) VALUES ({placeholders})", values)
        conn.commit()
        return jsonify({'success': True, 'id': cur.lastrowid}), 201
    finally:
        conn.close()

@app.route('/api/masrafci/records/<int:record_id>', methods=['DELETE'])
@login_required
def masrafci_records_delete(record_id):
    conn = _get_masrafci_db()
    try:
        row = conn.execute("SELECT user FROM records WHERE id = ?", (record_id,)).fetchone()
        if row is None:
            return jsonify({'error': 'Kayıt bulunamadı'}), 404
        if row['user'] != session['user']:
            return jsonify({'error': 'Yetkiniz yok'}), 403
        conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()

@app.route('/api/masrafci/summary', methods=['GET'])
@login_required
def masrafci_summary():
    month = request.args.get('month')
    user = session['user']
    conn = _get_masrafci_db()
    try:
        params_base = [user]
        month_clause = ''
        if month:
            month_clause = ' AND ay = ?'
            params_base.append(month)

        # Toplam gider
        row = conn.execute(
            f"SELECT COALESCE(SUM(tutar), 0) AS total FROM records WHERE user = ?{month_clause}",
            params_base
        ).fetchone()
        toplam_gider = row['total']

        # Kategori dağılımı
        rows = conn.execute(
            f"SELECT kategori, SUM(tutar) AS total, COUNT(*) AS cnt FROM records WHERE user = ?{month_clause} GROUP BY kategori ORDER BY total DESC",
            params_base
        ).fetchall()
        kategori_dagilimi = [{'kategori': r['kategori'] or 'Belirtilmemiş', 'toplam': r['total'], 'adet': r['cnt']} for r in rows]

        # Yaklaşan faturalar (ödenmemiş)
        fatura_params = [user]
        fatura_month = ''
        if month:
            fatura_month = ' AND ay = ?'
            fatura_params.append(month)
        faturalar = conn.execute(
            f"SELECT * FROM records WHERE user = ? AND type = 'fatura' AND durum != 'odendi'{fatura_month} ORDER BY son_odeme ASC LIMIT 5",
            fatura_params
        ).fetchall()

        # Aktif taksitler
        taksit_params = [user]
        taksit_month = ''
        if month:
            taksit_month = ' AND ay = ?'
            taksit_params.append(month)
        taksitler = conn.execute(
            f"SELECT * FROM records WHERE user = ? AND type = 'kredikarti' AND taksit_sayisi > 0{taksit_month} ORDER BY created_at DESC LIMIT 5",
            taksit_params
        ).fetchall()

        # Son işlemler
        son_params = [user]
        son_month = ''
        if month:
            son_month = ' AND ay = ?'
            son_params.append(month)
        son_islemler = conn.execute(
            f"SELECT * FROM records WHERE user = ?{son_month} ORDER BY created_at DESC LIMIT 10",
            son_params
        ).fetchall()

        # Pending reminder sayisi
        pending_count = conn.execute(
            """SELECT COUNT(*) AS cnt FROM bill_reminder_events e
               JOIN bill_reminder_rules r ON e.rule_id = r.id
               WHERE r.user = ? AND e.month = ? AND e.status = 'pending'""",
            (user, month or getCurrentMonth())
        ).fetchone()['cnt']

        return jsonify({
            'toplam_gider': toplam_gider,
            'kategori_dagilimi': kategori_dagilimi,
            'yaklasan_faturalar': [_row_to_dict(r) for r in faturalar],
            'aktif_taksitler': [_row_to_dict(r) for r in taksitler],
            'son_islemler': [_row_to_dict(r) for r in son_islemler],
            'pending_reminders': pending_count,
        })
    finally:
        conn.close()


def getCurrentMonth():
    now = date.today()
    return f"{now.year}-{now.month:02d}"


# ── Reminder API Endpoints ──────────────────────────────────

@app.route('/api/masrafci/reminder-rules', methods=['GET'])
@login_required
def masrafci_reminder_rules_list():
    conn = _get_masrafci_db()
    try:
        rows = conn.execute(
            "SELECT * FROM bill_reminder_rules WHERE user = ? ORDER BY display_name ASC",
            (session['user'],)
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d['enabled'] = bool(d.get('enabled'))
            result.append(d)
        return jsonify(result)
    finally:
        conn.close()


@app.route('/api/masrafci/reminder-rules', methods=['POST'])
@login_required
def masrafci_reminder_rules_create():
    data = request.get_json(silent=True) or {}
    display_name = (data.get('display_name') or '').strip()
    if not display_name:
        return jsonify({'error': 'display_name zorunludur'}), 400

    provider_key = _normalize_provider_key(display_name)
    if not provider_key:
        return jsonify({'error': 'Geçersiz kurum adı'}), 400

    expected_start_day = data.get('expected_start_day', 1)
    expected_end_day = data.get('expected_end_day', 28)
    lead_days = data.get('lead_days', 3)

    conn = _get_masrafci_db()
    try:
        conn.execute(
            """INSERT INTO bill_reminder_rules
               (user, provider_key, display_name, expected_start_day, expected_end_day, lead_days)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (session['user'], provider_key, display_name, expected_start_day, expected_end_day, lead_days)
        )
        conn.commit()
        return jsonify({'success': True, 'provider_key': provider_key}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Bu kurum için hatırlatıcı zaten mevcut'}), 409
    finally:
        conn.close()


@app.route('/api/masrafci/reminder-rules/<int:rule_id>', methods=['PATCH'])
@login_required
def masrafci_reminder_rules_update(rule_id):
    data = request.get_json(silent=True) or {}
    conn = _get_masrafci_db()
    try:
        rule = conn.execute(
            "SELECT * FROM bill_reminder_rules WHERE id = ? AND user = ?",
            (rule_id, session['user'])
        ).fetchone()
        if not rule:
            return jsonify({'error': 'Kural bulunamadı'}), 404

        allowed = {'display_name', 'enabled', 'expected_start_day', 'expected_end_day', 'lead_days', 'snooze_until'}
        sets = []
        params = []
        for key in allowed:
            if key in data:
                val = data[key]
                if key == 'enabled':
                    val = 1 if val else 0
                if key == 'display_name':
                    pkey = _normalize_provider_key(val)
                    sets.append('provider_key = ?')
                    params.append(pkey)
                sets.append(f'{key} = ?')
                params.append(val)
        if not sets:
            return jsonify({'error': 'Güncellenecek alan yok'}), 400

        sets.append("updated_at = datetime('now','localtime')")
        params.extend([rule_id, session['user']])
        conn.execute(
            f"UPDATE bill_reminder_rules SET {', '.join(sets)} WHERE id = ? AND user = ?",
            params
        )
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()


@app.route('/api/masrafci/reminders', methods=['GET'])
@login_required
def masrafci_reminders_list():
    month = request.args.get('month', getCurrentMonth())
    conn = _get_masrafci_db()
    try:
        rows = conn.execute("""
            SELECT e.*, r.display_name, r.provider_key, r.expected_start_day, r.expected_end_day
            FROM bill_reminder_events e
            JOIN bill_reminder_rules r ON e.rule_id = r.id
            WHERE r.user = ? AND e.month = ?
            ORDER BY r.expected_start_day ASC
        """, (session['user'], month)).fetchall()
        return jsonify([dict(r) for r in rows])
    finally:
        conn.close()


@app.route('/api/masrafci/reminders/<int:event_id>/action', methods=['POST'])
@login_required
def masrafci_reminder_action(event_id):
    data = request.get_json(silent=True) or {}
    action = data.get('action', '')
    if action not in ('add_now', 'snooze_3d', 'skip_month', 'disable_rule'):
        return jsonify({'error': 'Geçersiz aksiyon'}), 400

    conn = _get_masrafci_db()
    try:
        event = conn.execute("""
            SELECT e.*, r.display_name, r.provider_key, r.user
            FROM bill_reminder_events e
            JOIN bill_reminder_rules r ON e.rule_id = r.id
            WHERE e.id = ?
        """, (event_id,)).fetchone()
        if not event or event['user'] != session['user']:
            return jsonify({'error': 'Event bulunamadı'}), 404

        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        if action == 'add_now':
            conn.execute(
                "UPDATE bill_reminder_events SET status = 'prompted', prompted_at = ? WHERE id = ?",
                (now_str, event_id)
            )
            conn.commit()
            return jsonify({
                'success': True,
                'redirect': 'add-record',
                'display_name': event['display_name'],
            })

        elif action == 'snooze_3d':
            snooze_date = (date.today() + timedelta(days=3)).isoformat()
            conn.execute(
                "UPDATE bill_reminder_rules SET snooze_until = ? WHERE id = ?",
                (snooze_date, event['rule_id'])
            )
            conn.execute("DELETE FROM bill_reminder_events WHERE id = ?", (event_id,))
            conn.commit()
            return jsonify({'success': True})

        elif action == 'skip_month':
            conn.execute(
                "UPDATE bill_reminder_events SET status = 'skipped_month', answered_at = ? WHERE id = ?",
                (now_str, event_id)
            )
            conn.commit()
            return jsonify({'success': True})

        elif action == 'disable_rule':
            conn.execute(
                "UPDATE bill_reminder_rules SET enabled = 0 WHERE id = ?",
                (event['rule_id'],)
            )
            conn.execute(
                "UPDATE bill_reminder_events SET status = 'dismissed', answered_at = ? WHERE id = ?",
                (now_str, event_id)
            )
            conn.commit()
            return jsonify({'success': True})

        return jsonify({'error': 'Bilinmeyen aksiyon'}), 400
    finally:
        conn.close()


@app.route('/api/masrafci/reminder-check/run', methods=['POST'])
@login_required
def masrafci_reminder_check_run():
    data = request.get_json(silent=True) or {}
    month = data.get('month', getCurrentMonth())
    conn = _get_masrafci_db()
    try:
        pending = _run_reminder_check(conn, session['user'], month)
        return jsonify(pending)
    finally:
        conn.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
