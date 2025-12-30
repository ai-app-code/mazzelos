import os
import subprocess

# AYARLAR
SERVER_IP = "45.76.89.61"
USER = "root"
REMOTE_PATH = "/opt/mazzel/gateway"
SERVICE_NAME = "mazzel-gateway"

def run_command(command):
    """Terminal komutu calistirir"""
    print(f"  >> {command[:80]}...")
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"  ❌ HATA: {stderr.decode('utf-8')}")
        return False
    else:
        output = stdout.decode('utf-8').strip()
        if output:
            print(f"  {output}")
        return True

print("🚀 MAZZEL DEPLOY BASLIYOR...")
print("="*50)

# 1. Uzak sunucuda klasorleri olustur
print("\n📁 [1/4] Sunucuda klasorler olusturuluyor...")
run_command(f'ssh {USER}@{SERVER_IP} "mkdir -p {REMOTE_PATH}/templates"')

# 2. Dosyalari SCP ile gonder
print("\n📤 [2/4] Dosyalar yukleniyor...")
script_dir = os.path.dirname(os.path.abspath(__file__))
run_command(f'scp "{os.path.join(script_dir, "app.py")}" {USER}@{SERVER_IP}:{REMOTE_PATH}/')
run_command(f'scp -r "{os.path.join(script_dir, "templates")}" {USER}@{SERVER_IP}:{REMOTE_PATH}/')

# 3. Gerekli paketleri kur ve Servisi olustur
print("\n⚙️  [3/4] Sunucu ayarlari yapiliyor...")
setup_script = f'''
apt install -y python3-pip python3-flask > /dev/null 2>&1

cat > /etc/systemd/system/{SERVICE_NAME}.service << SVCEOF
[Unit]
Description=Mazzel Gateway
After=network.target

[Service]
User=root
WorkingDirectory={REMOTE_PATH}
ExecStart=/usr/bin/python3 {REMOTE_PATH}/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable {SERVICE_NAME}
systemctl restart {SERVICE_NAME}
echo "Servis durumu:"
systemctl is-active {SERVICE_NAME}
'''
run_command(f'ssh {USER}@{SERVER_IP} "{setup_script}"')

# 4. Nginx ayari
print("\n🌐 [4/4] Nginx ayarlaniyor...")
nginx_config = f'''
cat > /etc/nginx/sites-available/mazzel << NGXEOF
server {{
    listen 80;
    server_name mazzelworks.com www.mazzelworks.com {SERVER_IP};

    location / {{
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    }}
}}
NGXEOF

ln -sf /etc/nginx/sites-available/mazzel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "Nginx durumu:"
systemctl is-active nginx
'''
run_command(f'ssh {USER}@{SERVER_IP} "{nginx_config}"')

print("\n" + "="*50)
print("✅ ISLEM TAMAM!")
print(f"   🌐 Site: http://mazzelworks.com")
print(f"   🔗 IP ile test: http://{SERVER_IP}")
print("   👤 Giris: admin / mazzel2025")
print("="*50)
