// ================================================================
// utils.js — Shared helpers untuk POS Warung Sembako
// Include setelah config.js, sebelum script utama
// ================================================================
(function (global) {
    'use strict';

    const formatRupiah = (n) => {
        const num = Math.floor(Number(n) || 0);
        return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Escape karakter HTML untuk output aman ke innerHTML / template string
    const escapeHtml = (str) => {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const ORDER_STATUS_CONFIG = {
        pending:    { label: 'Menunggu',  icon: 'schedule',     next: 'processing', nextLabel: 'Proses Sekarang', color: '#d97706' },
        processing: { label: 'Diproses', icon: 'autorenew',    next: 'ready',      nextLabel: 'Tandai Siap',    color: '#2563eb' },
        ready:      { label: 'Siap',     icon: 'inventory',    next: 'done',       nextLabel: 'Selesaikan',     color: '#059669' },
        done:       { label: 'Selesai',  icon: 'check_circle', next: null,         nextLabel: null,             color: '#19a16f' },
        cancelled:  { label: 'Dibatal',  icon: 'cancel',       next: null,         nextLabel: null,             color: '#dc3545' }
    };

    const ORDER_STEP_LABELS = ['Dikirim', 'Diproses', 'Siap', 'Selesai'];
    const ORDER_STEP_ICONS  = ['send', 'autorenew', 'inventory', 'check_circle'];
    const ORDER_STEP_KEYS   = ['pending', 'processing', 'ready', 'done'];

    global.WarungUtils = {
        formatRupiah,
        escapeHtml,
        ORDER_STATUS_CONFIG,
        ORDER_STEP_LABELS,
        ORDER_STEP_ICONS,
        ORDER_STEP_KEYS
    };

    if (typeof global.formatRupiah !== 'function') {
        global.formatRupiah = formatRupiah;
    }
    if (typeof global.escapeHtml !== 'function') {
        global.escapeHtml = escapeHtml;
    }
})(typeof window !== 'undefined' ? window : globalThis);
