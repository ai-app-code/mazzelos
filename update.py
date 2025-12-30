import os
import subprocess
import time

# AYARLAR
SERVER_IP = "45.76.89.61"
USER = "root"
REMOTE_PATH = "/opt/mazzel/gateway"
SERVICE_NAME = "mazzel-gateway"

def run_command(command):
    """Komutu calistirir"""
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    if process.returncode != 0:
        print(f"  ❌ HATA: {stderr.decode('utf-8')}")
        return False
    output = stdout.decode('utf-8').strip()
    if output:
        print(f"  {output}")
    return True

print("🚀 HIZLI GUNCELLEME BASLIYOR...")
print("-" * 40)
start_time = time.time()

script_dir = os.path.dirname(os.path.abspath(__file__))

# 1. Python dosyasini gonder
print("📤 app.py gonderiliyor...")
run_command(f'scp "{os.path.join(script_dir, "app.py")}" {USER}@{SERVER_IP}:{REMOTE_PATH}/')

# 2. HTML sablonlarini gonder
print("📤 Templates gonderiliyor...")
run_command(f'scp -r "{os.path.join(script_dir, "templates")}" {USER}@{SERVER_IP}:{REMOTE_PATH}/')

# 3. Servisi yeniden baslat
print("♻️  Servis yeniden baslatiliyor...")
run_command(f'ssh {USER}@{SERVER_IP} "systemctl restart {SERVICE_NAME}"')

elapsed = time.time() - start_time
print("-" * 40)
print(f"✅ GUNCELLEME TAMAMLANDI! ({elapsed:.1f} saniye)")
print(f"🌐 Site: http://{SERVER_IP}")
