from flask import Flask, render_template, redirect, url_for, session, request, jsonify
import os
import json

app = Flask(__name__)
app.secret_key = 'mazzel-secret-key-2025'

# Basit kullanici
USERS = {"admin": "mazzel2025"}

# Ayarlar dosyasi
SETTINGS_FILE = '/opt/mazzel/gateway/settings.json'

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
        return render_template('login.html', error="Hatalı kullanıcı adı veya şifre", settings=settings)
    return render_template('login.html', settings=settings)

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    settings = load_settings()
    return render_template('dashboard.html', user=session['user'], settings=settings)

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
        return render_template('settings.html', user=session['user'], settings=settings, success=True)
    
    return render_template('settings.html', user=session['user'], settings=settings)

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

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# Moduller icin placeholder
@app.route('/teklif/')
def teklif():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('module_placeholder.html', user=session['user'], module_name="Teklif Hazırlama", module_icon="fa-file-invoice-dollar")

@app.route('/mail/')
def mail():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('module_placeholder.html', user=session['user'], module_name="Mazzel Mail", module_icon="fa-envelope")

@app.route('/maliyet/')
def maliyet():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('module_placeholder.html', user=session['user'], module_name="Maliyet & Nesting", module_icon="fa-calculator")

@app.route('/musteriler/')
def musteriler():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('module_placeholder.html', user=session['user'], module_name="Müşteriler", module_icon="fa-users")

@app.route('/raporlar/')
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
