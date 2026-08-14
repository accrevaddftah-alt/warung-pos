// ================================================================
// config.js — Single source of truth untuk konfigurasi Warung
// Include SEBELUM sync.js di index.html dan customer.html
// ================================================================
window.WARUNG_CONFIG = {
    API_PORT: 5500,
    get API_BASE() {
        return `${location.protocol}//${location.hostname}:${this.API_PORT}/api`;
    }
};
