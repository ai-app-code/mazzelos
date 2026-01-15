import os
import shutil
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
SOURCE_DIR = os.path.dirname(os.path.abspath(__file__))
MODULES_DIR = os.path.join(os.path.dirname(SOURCE_DIR), 'modules')

# List of modules to sync to
# Each module should have a 'templates' folder and a 'static' folder structure
TARGET_MODULES = [
    'teklif-app',
    'tokidb/frontend', # Assuming specific structure
    # Add other modules here
]

FILES_TO_SYNC = [
    {'src': 'templates/base.html', 'dst': 'templates/base.html'},
    {'src': 'templates/base_public.html', 'dst': 'templates/base_public.html'},
    {'src': 'templates/includes', 'dst': 'templates/includes', 'is_dir': True},
    {'src': 'static/css/main.css', 'dst': 'static/css/main.css'},
    {'src': 'static/js/theme.js', 'dst': 'static/js/theme.js'},
    # Add other shared assets here
]

def sync_design():
    logging.info("🚀 Starting Design System Sync...")
    logging.info(f"Source: {SOURCE_DIR}")
    logging.info(f"Modules Dir: {MODULES_DIR}")

    if not os.path.exists(MODULES_DIR):
        logging.warning(f"⚠️ Modules directory not found at {MODULES_DIR}. Creating it for simulation...")
        os.makedirs(MODULES_DIR, exist_ok=True)

    for module in TARGET_MODULES:
        target_base = os.path.join(MODULES_DIR, module)
        logging.info(f"📦 Syncing to module: {module}")

        if not os.path.exists(target_base):
            logging.warning(f"   ↳ Module directory {target_base} does not exist. Skipping.")
            continue

        for item in FILES_TO_SYNC:
            src_path = os.path.join(SOURCE_DIR, item['src'])
            dst_path = os.path.join(target_base, item['dst'])

            try:
                if not os.path.exists(src_path):
                    logging.error(f"   ❌ Source file missing: {src_path}")
                    continue

                # Create destination directory if it doesn't exist
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)

                if item.get('is_dir'):
                    if os.path.exists(dst_path):
                        shutil.rmtree(dst_path)
                    shutil.copytree(src_path, dst_path)
                    logging.info(f"   ✅ Copied directory: {item['src']} -> {item['dst']}")
                else:
                    shutil.copy2(src_path, dst_path)
                    logging.info(f"   ✅ Copied file: {item['src']} -> {item['dst']}")

            except Exception as e:
                logging.error(f"   ❌ Error syncing {item['src']}: {str(e)}")

    logging.info("✨ Sync completed successfully!")

if __name__ == "__main__":
    sync_design()
