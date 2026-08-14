// ================================================================
// config.js — Single source of truth untuk konfigurasi Warung
// Include SEBELUM sync.js di index.html dan customer.html
// ================================================================
window.WARUNG_CONFIG = {
    get API_BASE() {
        // Di Railway/production: pakai origin yang sama (tanpa port)
        // Di localhost: pakai port 5500
        const isLocalhost = location.hostname === 'localhost' 
            || location.hostname === '127.0.0.1'
            || location.hostname.match(/^192\.168\./);
        
        if (isLocalhost) {
            return `${location.protocol}//${location.hostname}:5500/api`;
        }
        return `${location.origin}/api`;
    }
};