// ================================================================
// sync.js — Lapisan Sinkronisasi Data Antar Perangkat
// ================================================================
// Menggantikan localStorage dengan API ke server.js untuk SYNC_KEYS.
// Include di index.html DAN customer.html setelah config.js & utils.js
//
// ETag / If-Match:
//   - GET menyimpan etag per key
//   - POST mengirim header If-Match
//   - 409: jangan timpa server; terapkan data server + etag baru
// ================================================================

(function () {
    'use strict';

    const BASE = (window.WARUNG_CONFIG && window.WARUNG_CONFIG.API_BASE)
        ? window.WARUNG_CONFIG.API_BASE
        : `${location.protocol}//${location.hostname}:5500/api`;

    const SYNC_KEYS = [
        'warung_products',
        'warung_transactions',
        'warung_settings',
        'warung_customer_orders',
    ];

    const isSyncKey = (key) => SYNC_KEYS.includes(key);

    const _cache = {};
    // ETag terakhir yang diketahui client per key (dari GET / POST sukses / 409)
    const _etags = {};

    const _native = window.localStorage;
    window._realLS = {
        getItem:    (k)    => _native.getItem(k),
        setItem:    (k, v) => _native.setItem(k, v),
        removeItem: (k)    => _native.removeItem(k),
        key:        (n)    => _native.key(n),
        clear:      ()     => _native.clear(),
        get length()       { return _native.length; },
    };

    const extractEtag = (res, json) => {
        if (json && json.etag != null) return String(json.etag);
        const h = res.headers.get('ETag');
        if (h) return h.replace(/^"|"$/g, '');
        return null;
    };

    const applyServerData = (key, data, etag) => {
        _cache[key] = data;
        if (etag != null) _etags[key] = String(etag);
        try {
            window._realLS.setItem(key, JSON.stringify(data));
        } catch (_) { /* quota */ }
    };

    // ============================================================
    // GET
    // ============================================================
    const serverGet = async (key) => {
        try {
            const res = await fetch(`${BASE}/${key}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const etag = extractEtag(res, json);
            applyServerData(key, json.data, etag);
            return json.data;
        } catch (err) {
            if (err.name === 'TypeError' || (err.message && err.message.includes('Failed to fetch'))) {
                console.warn('[sync] server unreachable for GET', key);
            } else {
                console.warn('[sync] GET failed for', key, ':', err.message);
            }
            try {
                const raw = window._realLS.getItem(key);
                return raw ? JSON.parse(raw) : (_cache[key] ?? null);
            } catch {
                return _cache[key] ?? null;
            }
        }
    };

    // ============================================================
    // SET — kirim If-Match; pada 409 jangan overwrite server
    // Untuk warung_customer_orders: merge by order.id lalu retry (terbatas)
    // ============================================================
    const ORDERS_MERGE_KEY = 'warung_customer_orders';
    const MAX_ORDERS_409_RETRY = 3;

    /** Union orders by id: server wins on same id; client-only ids retained. */
    const mergeCustomerOrders = (clientData, serverData) => {
        const clientArr = Array.isArray(clientData) ? clientData : [];
        const serverArr = Array.isArray(serverData) ? serverData : [];
        const byId = new Map();
        for (const o of serverArr) {
            if (o && o.id != null) byId.set(String(o.id), o);
        }
        for (const o of clientArr) {
            if (o && o.id != null && !byId.has(String(o.id))) {
                byId.set(String(o.id), o);
            }
        }
        const out = [];
        const seen = new Set();
        for (const o of clientArr) {
            if (!o || o.id == null) continue;
            const id = String(o.id);
            if (seen.has(id)) continue;
            out.push(byId.get(id));
            seen.add(id);
        }
        for (const o of serverArr) {
            if (!o || o.id == null) continue;
            const id = String(o.id);
            if (seen.has(id)) continue;
            out.push(byId.get(id));
            seen.add(id);
        }
        return out;
    };

    const serverSet = async (key, value, _retryCount) => {
        const retryCount = _retryCount || 0;
        // Optimistik di cache lokal dulu (UI responsif)
        _cache[key] = value;

        const headers = { 'Content-Type': 'application/json' };
        if (_etags[key]) {
            headers['If-Match'] = String(_etags[key]);
        }

        try {
            const res = await fetch(`${BASE}/${key}`, {
                method:  'POST',
                headers,
                body:    JSON.stringify({ data: value, ifMatch: _etags[key] || undefined }),
            });

            // Conflict: server punya versi lain
            if (res.status === 409) {
                let json = {};
                try { json = await res.json(); } catch (_) {}
                console.warn('[sync] 409 Conflict for', key, '— retryCount=', retryCount);

                let serverData = json.data;
                let serverEtag = json.etag != null ? json.etag : extractEtag(res, json);

                if (serverData === undefined) {
                    await serverGet(key);
                    serverData = _cache[key];
                    serverEtag = _etags[key];
                } else {
                    applyServerData(key, serverData, serverEtag);
                }

                // Hanya orders: merge by id + retry write dengan ETag baru
                if (key === ORDERS_MERGE_KEY && retryCount < MAX_ORDERS_409_RETRY) {
                    const merged = mergeCustomerOrders(value, serverData);
                    if (serverEtag != null) _etags[key] = String(serverEtag);
                    _cache[key] = merged;
                    try {
                        window._realLS.setItem(key, JSON.stringify(merged));
                    } catch (_) {}
                    // Retry POST dengan etag terbaru (batas MAX_ORDERS_409_RETRY)
                    await serverSet(key, merged, retryCount + 1);
                    return;
                }

                // Key lain, atau retry orders habis: server wins
                applyServerData(key, serverData, serverEtag);
                window.dispatchEvent(new CustomEvent('warung-data-changed', {
                    detail: { key, data: _cache[key], conflict: true }
                }));
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json = {};
            try { json = await res.json(); } catch (_) {}
            const etag = extractEtag(res, json);
            if (etag != null) _etags[key] = String(etag);
            // value sudah di _cache; persist lokal
            try {
                window._realLS.setItem(key, JSON.stringify(value));
            } catch (_) {}

            // Setelah sukses (termasuk hasil merge-retry), beri tahu UI
            if (retryCount > 0) {
                window.dispatchEvent(new CustomEvent('warung-data-changed', {
                    detail: { key, data: value, conflict: false, merged: true }
                }));
            }

        } catch (err) {
            if (err.name === 'TypeError' || (err.message && err.message.includes('Failed to fetch'))) {
                console.warn('[sync] server unreachable for SET', key);
            } else {
                console.warn('[sync] SET failed for', key, ':', err.message);
            }
            // Offline: simpan lokal saja (sudah di _cache)
            try {
                window._realLS.setItem(key, JSON.stringify(value));
            } catch (_) {}
        }
    };

    // ============================================================
    // Proxy localStorage
    // ============================================================
    const syncStorage = {
        getItem(key) {
            if (!isSyncKey(key)) return window._realLS.getItem(key);
            if (_cache[key] !== undefined) {
                try { return JSON.stringify(_cache[key]); } catch { /* fallthrough */ }
            }
            return window._realLS.getItem(key);
        },
        setItem(key, value) {
            if (!isSyncKey(key)) {
                window._realLS.setItem(key, value);
                return;
            }
            window._realLS.setItem(key, value);
            try {
                const parsed = JSON.parse(value);
                _cache[key] = parsed;
                serverSet(key, parsed);
            } catch {
                _cache[key] = value;
                serverSet(key, value);
            }
        },
        removeItem(key) {
            window._realLS.removeItem(key);
            if (isSyncKey(key)) {
                delete _cache[key];
                delete _etags[key];
                serverSet(key, null);
            }
        },
        key(n)  { return window._realLS.key(n); },
        clear() { window._realLS.clear(); },
        get length() { return window._realLS.length; },
    };

    try {
        Object.defineProperty(window, 'localStorage', {
            get: () => syncStorage,
            configurable: true,
        });
    } catch {
        window.syncStorage = syncStorage;
    }

    // ============================================================
    // Pre-load
    // ============================================================
    window.__syncReady = (async () => {
        const promises = SYNC_KEYS.map(async (key) => {
            const data = await serverGet(key);
            if (data !== null && data !== undefined) {
                _cache[key] = data;
            }
        });
        await Promise.allSettled(promises);
        console.log('[sync.js] Data dimuat dari server (atau fallback localStorage)');
    })();

    // ============================================================
    // Polling — update etag saat ada data baru
    // ============================================================
    const POLL_KEYS = ['warung_customer_orders', 'warung_products'];
    let _pollBusy = false;
    let _pollFailCount = 0;

    const pollOnce = async () => {
        if (_pollBusy) return;
        _pollBusy = true;
        try {
            for (const key of POLL_KEYS) {
                try {
                    const res = await fetch(`${BASE}/${key}`, { cache: 'no-store' });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const json = await res.json();
                    const fresh = json.data;
                    const etag = extractEtag(res, json);
                    const oldStr = JSON.stringify(_cache[key] ?? null);
                    const newStr = JSON.stringify(fresh ?? null);

                    if (oldStr !== newStr) {
                        applyServerData(key, fresh, etag);
                        window.dispatchEvent(new CustomEvent('warung-data-changed', {
                            detail: { key, data: fresh }
                        }));
                    } else if (etag != null) {
                        _etags[key] = String(etag);
                    }
                } catch (err) {
                    if (err.name === 'TypeError' || (err.message && err.message.includes('Failed to fetch'))) {
                        throw err;
                    }
                    console.warn('[sync] poll key failed', key, err.message);
                }
            }
            _pollFailCount = 0;
        } catch (err) {
            _pollFailCount++;
            console.warn('[sync] poll failed (count=' + _pollFailCount + '):', err.message || err);
        } finally {
            _pollBusy = false;
        }
    };

    const schedulePoll = () => {
        const delay = _pollFailCount > 3 ? 15000 : 8000;
        setTimeout(async () => {
            await pollOnce();
            schedulePoll();
        }, delay);
    };

    setTimeout(schedulePoll, 3000);
})();
