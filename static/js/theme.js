let currentMode = 'light';
let currentColor = 'purple';

function setMode(mode) {
    currentMode = mode;
    applyTheme();
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.theme-btn.${mode}`)?.classList.add('active');
    localStorage.setItem('themeMode', mode);
    showToast('success', 'Tema', mode === 'light' ? 'Açık tema uygulandı' : 'Koyu tema uygulandı');
}

function setColor(color) {
    currentColor = color;
    applyTheme();
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.color-btn.${color}`)?.classList.add('active');
    localStorage.setItem('themeColor', color);
}

function applyTheme() {
    let theme = currentMode;
    if (currentColor !== 'purple') {
        theme = currentMode === 'dark' ? `${currentColor}-dark` : currentColor;
    }
    document.body.setAttribute('data-theme', theme);
}

const savedMode = localStorage.getItem('themeMode') || 'light';
const savedColor = localStorage.getItem('themeColor') || 'purple';
currentMode = savedMode;
currentColor = savedColor;
applyTheme();
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector(`.theme-btn.${savedMode}`)?.classList.add('active');
    document.querySelector(`.color-btn.${savedColor}`)?.classList.add('active');
    document.querySelector(`.theme-btn:not(.${savedMode})`)?.classList.remove('active');
});

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        success: 'fa-check',
        info: 'fa-info'
    };
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
        <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Sidebar Dropdown Toggle
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function () {
            this.closest('.nav-dropdown').classList.toggle('open');
        });
    });
});
