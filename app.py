from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from functools import wraps
import os
import json
import subprocess
import time
import threading
from urllib.request import urlopen

app = Flask(__name__)
app.secret_key = 'mazzel-secret-key-2025'

# Basit kullanici
USERS = {"admin": "mazzel2025"}

# Login decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Ayarlar dosyasi
SETTINGS_FILE = '/opt/mazzel/gateway/settings.json'

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
        "site_subtitle": "Profesyonel iÅŸ yÃ¶netimi, teklif hazÄ±rlama ve maliyet analizi iÃ§in tek platform",
        "show_weather": True,
        "show_currency": True,
        "show_news": True,
        "show_clock": True,
        "weather_city": "Istanbul",
        "modules": [
            {"id": "teklif", "name": "Teklif HazÄ±rla", "icon": "fa-file-invoice-dollar", "url": "/teklif/", "status": "active", "enabled": True},
            {"id": "mail", "name": "Mazzel Mail", "icon": "fa-envelope", "url": "/mail/", "status": "dev", "enabled": True},
            {"id": "maliyet", "name": "Maliyet Hesapla", "icon": "fa-calculator", "url": "/maliyet/", "status": "soon", "enabled": True},
            {"id": "musteriler", "name": "MÃ¼ÅŸteriler", "icon": "fa-users", "url": "/musteriler/", "status": "soon", "enabled": True},
            {"id": "raporlar", "name": "Raporlar", "icon": "fa-chart-bar", "url": "/raporlar/", "status": "soon", "enabled": True},
            {"id": "ayarlar", "name": "Ayarlar", "icon": "fa-cog", "url": "/settings", "status": "active", "enabled": True}
        ],
        "nav_links": [
            {"name": "Ana Sayfa", "url": "/", "enabled": True},
            {"name": "Hizmetler", "url": "/hizmetler", "enabled": True},
            {"name": "Referanslar", "url": "/referanslar", "enabled": True},
            {"name": "Ä°letiÅŸim", "url": "/iletisim", "enabled": True}
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
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

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
            return redirect(url_for('dashboard'))
        return render_template('login.html', error="HatalÄ± kullanÄ±cÄ± adÄ± veya ÅŸifre", settings=settings)
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

@app.route('/tetra/')
@login_required
def tetra():
    """TETRA AI MÃ¼nazara sistemi - standalone sayfaya yÃ¶nlendir"""
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
    return render_template('module_placeholder.html', user=session['user'], module_name="Teklif HazÄ±rlama", module_icon="fa-file-invoice-dollar", active_page='teklif')

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

NESTING_DATA_FILE = '/opt/mazzel/gateway/data/nesting_data.json'

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)



