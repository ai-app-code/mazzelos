// ========================================
// MAZZEL UI - Toast & Dialog System
// ========================================

// Toast container reference
let toastContainer = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Add confirm dialog container
    createConfirmDialog();
});

// ========================================
// TOAST NOTIFICATIONS
// ========================================

const Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// ========================================
// CONFIRM DIALOG
// ========================================

let confirmDialog = null;
let confirmCallback = null;

function createConfirmDialog() {
    if (document.getElementById('confirmDialog')) return;

    const dialog = document.createElement('div');
    dialog.id = 'confirmDialog';
    dialog.className = 'confirm-overlay';
    dialog.innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon" id="confirmIcon">
                <i class="fas fa-question-circle"></i>
            </div>
            <h3 class="confirm-title" id="confirmTitle">Emin misiniz?</h3>
            <p class="confirm-message" id="confirmMessage">Bu işlemi geri alamazsınız.</p>
            <div class="confirm-buttons">
                <button class="confirm-btn confirm-btn-cancel" onclick="closeConfirm(false)">
                    <i class="fas fa-times"></i> İptal
                </button>
                <button class="confirm-btn confirm-btn-ok" id="confirmOkBtn" onclick="closeConfirm(true)">
                    <i class="fas fa-check"></i> Tamam
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    confirmDialog = dialog;

    // Close on overlay click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeConfirm(false);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && confirmDialog.classList.contains('show')) {
            closeConfirm(false);
        }
    });
}

function showConfirm(options = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Emin misiniz?',
            message = 'Bu işlemi gerçekleştirmek istediğinizden emin misiniz?',
            okText = 'Tamam',
            cancelText = 'İptal',
            type = 'warning', // warning, danger, info
            icon = null
        } = options;

        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;

        const okBtn = document.getElementById('confirmOkBtn');
        okBtn.innerHTML = `<i class="fas fa-check"></i> ${okText}`;
        okBtn.className = `confirm-btn confirm-btn-${type}`;

        const cancelBtn = confirmDialog.querySelector('.confirm-btn-cancel');
        cancelBtn.innerHTML = `<i class="fas fa-times"></i> ${cancelText}`;

        const iconEl = document.getElementById('confirmIcon');
        const icons = {
            warning: 'fa-exclamation-triangle',
            danger: 'fa-trash-alt',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };
        iconEl.innerHTML = `<i class="fas ${icon || icons[type] || icons.warning}"></i>`;
        iconEl.className = `confirm-icon confirm-icon-${type}`;

        confirmCallback = resolve;
        confirmDialog.classList.add('show');
    });
}

function closeConfirm(result) {
    confirmDialog.classList.remove('show');
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
}

// Shorthand for delete confirmation
async function confirmDelete(itemName = 'bu öğeyi') {
    return showConfirm({
        title: 'Silmek istediğinizden emin misiniz?',
        message: `${itemName} kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
        okText: 'Sil',
        cancelText: 'Vazgeç',
        type: 'danger'
    });
}

// Shorthand for save confirmation
async function confirmSave() {
    return showConfirm({
        title: 'Kaydetmek istiyor musunuz?',
        message: 'Yaptığınız değişiklikler kaydedilecek.',
        okText: 'Kaydet',
        cancelText: 'Vazgeç',
        type: 'success',
        icon: 'fa-save'
    });
}

// Make available globally
window.Toast = Toast;
window.showConfirm = showConfirm;
window.confirmDelete = confirmDelete;
window.confirmSave = confirmSave;
