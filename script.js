// ================================================================
// POS WARUNG SEMBAKO — script.js
// ================================================================
// DAFTAR SEKSI:
//   1.  Inisialisasi Data & Variabel Global
//   2.  Format & Parse Rupiah
//   3.  Alert & Confirm Custom
//   4.  Penyimpanan Lokal (localStorage)
//   5.  Branding & Logo Toko
//   6.  Kompresi Gambar
//   7.  Navigasi & Menu Aktif
//   8.  Notifikasi Restok
//   9.  Render Aplikasi (Router Utama)
//  10.  Halaman Riwayat Transaksi
//  11.  Halaman Laporan Penjualan
//  12.  Halaman Pengaturan Toko
//  13.  Render Grid Produk (Dashboard Kasir)
//  14.  Render Kartu Produk (Manajemen)
//  15.  Keranjang Belanja (Cart)
//  16.  Kalkulasi Total & Kembalian
//  17.  Modal Form Tambah / Edit Produk
//  18.  Kamera & Upload Foto Produk
//  19.  Sidebar Navigasi
//  20.  Cash Panel & Numpad
//  21.  Proses Pembayaran
//  22.  Modal Sukses & Struk (Receipt)
//  23.  Filter & Periode Laporan
//  24.  Inisialisasi Awal
//  25.  Mobile Enhancements
// ================================================================

// ============================================================
// 1. INISIALISASI DATA & VARIABEL GLOBAL
// ============================================================

let products     = JSON.parse(localStorage.getItem('warung_products'))     || [];
let transactions = JSON.parse(localStorage.getItem('warung_transactions')) || [];

const defaultStoreSettings = {
    name:    'WARUNG SEMBAKO',
    address: '',
    phone:   '',
    logo:    '' // base64 logo toko
};

let storeSettings = {
    ...defaultStoreSettings,
    ...(JSON.parse(localStorage.getItem('warung_settings')) || {})
};

let cart               = [];
// Restore view dari sessionStorage agar tidak balik ke dashboard saat refresh
let currentView        = sessionStorage.getItem('warung_current_view') || 'dashboard';
let uploadedImageBase64 = '';          // penampung file gambar lokal

// Gambar default produk jika user tidak upload foto.
// Ganti path ini jika ingin memakai gambar lain (harus satu folder dengan index.html).
const DEFAULT_PRODUCT_IMG = 'Food.png';

// ============================================================
// 2. FORMAT & PARSE RUPIAH
// ============================================================

// Format angka menjadi "Rp 10.000"
const formatRupiah = (number) => {
    const num = Math.floor(Number(number) || 0);
    const str = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'Rp ' + str;
};

// Format angka saja dengan titik ribuan, tanpa "Rp " (untuk input field)
const formatNumber = (number) => {
    const num = Math.floor(Number(number) || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Parse string yang mungkin berisi titik ribuan menjadi angka murni
const parseRupiah = (str) => {
    if (str === null || str === undefined || str === '') return 0;
    const cleaned = String(str).replace(/[^\d]/g, '');
    return Number(cleaned) || 0;
};

// ============================================================
// 3. ALERT & CONFIRM CUSTOM
//    Menggantikan alert() / confirm() bawaan browser
// ============================================================

const APP_ALERT_ICONS = {
    info:    { icon: 'info',         title: 'Informasi' },
    success: { icon: 'check_circle', title: 'Berhasil'  },
    warning: { icon: 'warning',      title: 'Peringatan' },
    error:   { icon: 'error',        title: 'Gagal'      },
    confirm: { icon: 'help',         title: 'Konfirmasi' }
};

let _alertResolver = null;

const _closeAppAlert = (result) => {
    const overlay = document.getElementById('appAlertOverlay');
    if (overlay) overlay.classList.remove('active');
    if (_alertResolver) {
        const resolve = _alertResolver;
        _alertResolver = null;
        resolve(result);
    }
};

const showAlert = (message, type = 'info', title = null) => {
    return new Promise((resolve) => {
        _alertResolver = resolve;
        const meta      = APP_ALERT_ICONS[type] || APP_ALERT_ICONS.info;
        const overlay   = document.getElementById('appAlertOverlay');
        const iconWrap  = document.getElementById('appAlertIconWrap');
        const iconEl    = document.getElementById('appAlertIcon');
        const titleEl   = document.getElementById('appAlertTitle');
        const msgEl     = document.getElementById('appAlertMessage');
        const okBtn     = document.getElementById('appAlertOk');
        const cancelBtn = document.getElementById('appAlertCancel');

        if (!overlay) {
            window.alert(message);
            resolve(true);
            return;
        }

        iconWrap.className    = 'app-alert-icon-wrap ' + type;
        iconEl.textContent    = meta.icon;
        titleEl.textContent   = title || meta.title;
        msgEl.textContent     = message;
        cancelBtn.style.display = 'none';
        okBtn.textContent     = 'OK';
        okBtn.className       = 'btn-primary';
        okBtn.onclick         = () => _closeAppAlert(true);
        cancelBtn.onclick     = null;
        overlay.classList.add('active');
    });
};

const showConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
        _alertResolver = resolve;
        const type      = options.type || 'confirm';
        const meta      = APP_ALERT_ICONS[type] || APP_ALERT_ICONS.confirm;
        const overlay   = document.getElementById('appAlertOverlay');
        const iconWrap  = document.getElementById('appAlertIconWrap');
        const iconEl    = document.getElementById('appAlertIcon');
        const titleEl   = document.getElementById('appAlertTitle');
        const msgEl     = document.getElementById('appAlertMessage');
        const okBtn     = document.getElementById('appAlertOk');
        const cancelBtn = document.getElementById('appAlertCancel');

        if (!overlay) {
            resolve(window.confirm(message));
            return;
        }

        iconWrap.className      = 'app-alert-icon-wrap ' + type;
        iconEl.textContent      = options.icon  || meta.icon;
        titleEl.textContent     = options.title || meta.title;
        msgEl.textContent       = message;
        cancelBtn.style.display = '';
        cancelBtn.textContent   = options.cancelText || 'Batal';
        okBtn.textContent       = options.okText     || 'Ya';
        okBtn.className         = options.danger ? 'btn-danger' : 'btn-primary';
        okBtn.onclick           = () => _closeAppAlert(true);
        cancelBtn.onclick       = () => _closeAppAlert(false);
        overlay.classList.add('active');
    });
};

// Klik backdrop overlay menutup alert (bukan confirm berbahaya)
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('appAlertOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const cancelBtn = document.getElementById('appAlertCancel');
                if (cancelBtn && cancelBtn.style.display !== 'none') {
                    _closeAppAlert(false); // mode confirm → anggap Batal
                } else {
                    _closeAppAlert(true);  // mode alert → anggap OK
                }
            }
        });
    }
});

// ============================================================
// 4. PENYIMPANAN LOKAL (localStorage)
// ============================================================

const saveProductsToStorage = () => {
    localStorage.setItem('warung_products', JSON.stringify(products));
};

const saveTransactionsToStorage = () => {
    localStorage.setItem('warung_transactions', JSON.stringify(transactions));
};

const saveStoreSettings = () => {
    localStorage.setItem('warung_settings', JSON.stringify(storeSettings));
    applyStoreBranding();
};

// ============================================================
// 5. BRANDING & LOGO TOKO
// ============================================================

const applyStoreBranding = () => {
    const logoEl = document.querySelector('.logo');
    if (!logoEl) return;

    const name = (storeSettings.name || 'WARUNG SEMBAKO').trim() || 'WARUNG SEMBAKO';

    if (storeSettings.logo) {
        logoEl.innerHTML = `<img class="nav-store-logo" src="${storeSettings.logo}" alt="Logo">
                            <span class="nav-store-name">${name.toUpperCase()}</span>`;
    } else {
        logoEl.innerHTML = `<span class="material-symbols-outlined">storefront</span>
                            <span class="nav-store-name">${name.toUpperCase()}</span>`;
    }
};

// ============================================================
// 6. KOMPRESI GAMBAR
//    Mengecilkan ukuran gambar agar tidak memenuhi localStorage
// ============================================================

const compressImageToBase64 = (file, maxSize = 240, quality = 0.85) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;

                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = Math.round(h * (maxSize / w));
                        w = maxSize;
                    } else {
                        w = Math.round(w * (maxSize / h));
                        h = maxSize;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src     = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// ============================================================
// 7. NAVIGASI & MENU AKTIF
// ============================================================

const setActiveMenu = (activeId) => {
    ['menuDashboard', 'menuProdukList', 'menuRiwayat', 'menuLaporan', 'menuPengaturan', 'menuPesanan', 'menuArsip']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('active', id === activeId);
        });
};

window.setActiveMenu = setActiveMenu;

// ============================================================
// 8. NOTIFIKASI RESTOK
// ============================================================

const getLowStockProducts = () => {
    return products
        .filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0))
        .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
};

const updateRestockNotif = () => {
    const badge      = document.getElementById('notifBadge');
    const list       = document.getElementById('notifList');
    const countLabel = document.getElementById('notifCountLabel');
    if (!badge || !list) return;

    const lowItems = getLowStockProducts();
    const count    = lowItems.length;

    // Update badge
    if (count > 0) {
        badge.style.display = 'flex';
        badge.textContent   = count > 99 ? '99+' : String(count);
    } else {
        badge.style.display = 'none';
    }

    // Update label jumlah
    if (countLabel) {
        countLabel.textContent   = count === 0 ? 'Aman' : `${count} item perlu restok`;
        countLabel.style.color   = count === 0 ? '#19a16f' : '#dc3545';
        countLabel.style.background = count === 0 ? '#eaf5f0' : '#fde8ea';
    }

    // Render daftar notifikasi
    if (count === 0) {
        list.innerHTML = `<div class="notif-empty">Stok aman. Tidak ada barang yang perlu direstok.</div>`;
        return;
    }

    list.innerHTML = lowItems.map(p => {
        const stock      = Number(p.stock) || 0;
        const min        = Number(p.minStock) || 0;
        const need       = Math.max(min - stock, 0);
        const statusClass = stock <= 0 ? 'habis' : 'menipis';
        const statusText  = stock <= 0
            ? 'Habis'
            : `Sisa ${stock} ${p.unit || 'Pcs'}`;
        const needText = stock <= 0
            ? `Perlu restok min. ${min} ${p.unit || 'Pcs'}`
            : `Perlu restok +${need} lagi (min ${min})`;

        return `
            <div class="notif-item">
                <img class="notif-item-img" src="${p.img || DEFAULT_PRODUCT_IMG}" alt="${p.name}">
                <div class="notif-item-info">
                    <div class="notif-item-name">${p.name}</div>
                    <div class="notif-item-meta">${needText}</div>
                </div>
                <span class="notif-item-stock ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
};

const setupNotifUI = () => {
    const btn      = document.getElementById('notifBtn');
    const dropdown = document.getElementById('notifDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateRestockNotif();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
};

// ============================================================
// 9. RENDER APLIKASI (ROUTER UTAMA)
//    Memuat tampilan sesuai currentView
// ============================================================

// Registry agar modul eksternal (orders-patch.js) bisa mendaftarkan view
// tanpa meng-override window.renderApp secara global.
const viewHandlers = {};

window.registerView = (name, fn) => {
    if (typeof fn === 'function') viewHandlers[name] = fn;
};

const renderApp = () => {
    const mainPanel = document.getElementById('mainPanelContent');
    const rightPanel = document.getElementById('rightPanel');
    const cashPanel  = document.getElementById('cashSection');

    document.body.dataset.view = currentView;
    sessionStorage.setItem('warung_current_view', currentView); // simpan posisi halaman
    updateRestockNotif();

    // View yang didaftarkan lewat registerView (orders, archive, dll.)
    if (viewHandlers[currentView]) {
        viewHandlers[currentView]();
        return;
    }

    // --- 9a. DASHBOARD (Kasir / POS) ---
    if (currentView === 'dashboard') {
        rightPanel.style.display = 'flex';
        mainPanel.innerHTML = `
            <div class="panel-header" style="justify-content: flex-end;">
                <div class="search-bar">
                    <input type="text" id="searchInput" placeholder="Cari produk di sini...">
                    <button class="search-btn"><span class="material-symbols-outlined">search</span></button>
                </div>
            </div>
            <div class="product-grid" id="productGrid"></div>
            <div class="categories">
                <button class="cat-btn active" data-category="all"><span class="material-symbols-outlined">apps</span><span>Semua</span></button>
                <button class="cat-btn" data-category="Sembako"><span class="material-symbols-outlined">inventory</span><span>Sembako</span></button>
                <button class="cat-btn" data-category="Minuman"><span class="material-symbols-outlined">coffee</span><span>Minuman</span></button>
                <button class="cat-btn" data-category="Bumbu"><span class="material-symbols-outlined">egg</span><span>Bumbu</span></button>
                <button class="cat-btn" data-category="Cemilan"><span class="material-symbols-outlined">cookie</span><span>Cemilan</span></button>
                <button class="cat-btn" data-category="Sabun"><span class="material-symbols-outlined">sanitizer</span><span>Sabun</span></button>
            </div>
        `;

        let activeCategory = 'all';

        const applyDashboardFilter = () => {
            const keyword  = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
            let filtered   = products;

            if (activeCategory !== 'all') {
                if (activeCategory === 'Cemilan') {
                    filtered = filtered.filter(p => ['Cemilan', 'Snacks'].includes(p.category || ''));
                } else {
                    filtered = filtered.filter(p => (p.category || '') === activeCategory);
                }
            }

            if (keyword) {
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(keyword) ||
                    (p.category || '').toLowerCase().includes(keyword)
                );
            }

            renderProductsGrid(filtered);
        };

        applyDashboardFilter();

        document.getElementById('searchInput').addEventListener('input', applyDashboardFilter);

        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCategory = btn.dataset.category || 'all';
                applyDashboardFilter();
            });
        });

    // --- 9b. MANAJEMEN PRODUK ---
    } else if (currentView === 'products') {
        rightPanel.style.display = 'none';
        if (cashPanel) cashPanel.style.display = 'none';
        const btnCashEl = document.getElementById('btnCash');
        if (btnCashEl) btnCashEl.classList.remove('active');

        mainPanel.innerHTML = `
            <div class="product-actions-top">
                <h2>Manajemen Katalog Produk</h2>
                <div class="product-actions-right">
                    <div class="search-bar search-bar-inline">
                        <input type="text" id="searchProductTable" placeholder="Cari nama atau kategori...">
                        <button class="search-btn" type="button"><span class="material-symbols-outlined">search</span></button>
                    </div>
                    <button class="btn-primary" id="openAddModalBtnList" style="padding: 8px 15px; font-size: 13px; white-space: nowrap;">+ Tambah Produk Baru</button>
                </div>
            </div>
            <div class="product-divider"></div>
            <div class="manage-product-grid" id="productTableBody"></div>
        `;

        renderProductsTable(products);
        document.getElementById('openAddModalBtnList').onclick = () => openModal();

        document.getElementById('searchProductTable').addEventListener('input', (e) => {
            const keyword  = e.target.value.toLowerCase().trim();
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(keyword) ||
                (p.category || '').toLowerCase().includes(keyword)
            );
            renderProductsTable(filtered);
        });

    // --- 9c. RIWAYAT TRANSAKSI ---
    } else if (currentView === 'history') {
        rightPanel.style.display = 'none';
        if (cashPanel) cashPanel.style.display = 'none';
        const btnCashEl = document.getElementById('btnCash');
        if (btnCashEl) btnCashEl.classList.remove('active');

        const totalTrans = transactions.length;
        const totalOmzet = transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);

        mainPanel.innerHTML = `
            <div class="history-header">
                <div>
                    <h2>Riwayat Transaksi</h2>
                    <p class="history-subtitle">Semua transaksi penjualan yang sudah berhasil</p>
                </div>
                <div class="history-stats">
                    <div class="stat-card">
                        <span class="stat-label">Total Transaksi</span>
                        <span class="stat-value">${totalTrans}</span>
                    </div>
                    <div class="stat-card stat-omzet">
                        <span class="stat-label">Total Omzet</span>
                        <span class="stat-value">${formatRupiah(totalOmzet)}</span>
                    </div>
                </div>
            </div>
            <div class="product-divider"></div>
            <div class="history-toolbar">
                <div class="search-bar search-bar-inline">
                    <input type="text" id="searchHistory" placeholder="Cari transaksi / nama barang...">
                    <button class="search-btn" type="button"><span class="material-symbols-outlined">search</span></button>
                </div>
            </div>
            <div class="history-list" id="historyList"></div>
        `;

        renderHistoryList(transactions);

        document.getElementById('searchHistory').addEventListener('input', (e) => {
            const keyword  = e.target.value.toLowerCase().trim();
            const filtered = transactions.filter(t => {
                if (!keyword) return true;
                const dateStr   = formatHistoryDate(t.date).toLowerCase();
                const itemMatch = (t.items || []).some(it => (it.name || '').toLowerCase().includes(keyword));
                const idMatch   = String(t.id).includes(keyword);
                return dateStr.includes(keyword) || itemMatch || idMatch;
            });
            renderHistoryList(filtered);
        });

    // --- 9d. LAPORAN PENJUALAN ---
    } else if (currentView === 'laporan') {
        rightPanel.style.display = 'none';
        if (cashPanel) cashPanel.style.display = 'none';
        const btnCashEl = document.getElementById('btnCash');
        if (btnCashEl) btnCashEl.classList.remove('active');

        mainPanel.innerHTML = `
            <div class="laporan-wrap">
                <div class="laporan-header">
                    <h2>Laporan Penjualan</h2>
                    <div class="laporan-periode-tabs" id="periodeTabs">
                        <button type="button" class="periode-tab active" data-periode="hari">Hari Ini</button>
                        <button type="button" class="periode-tab" data-periode="minggu">7 Hari</button>
                        <button type="button" class="periode-tab" data-periode="bulan">Bulan Ini</button>
                        <button type="button" class="periode-tab" data-periode="semua">Semua</button>
                    </div>
                </div>
                <div class="laporan-stats" id="laporanStats"></div>
                <div class="laporan-chart-card">
                    <div class="laporan-chart-title">Grafik Omzet</div>
                    <div class="laporan-chart-wrap" id="laporanChart"></div>
                </div>
                <div class="laporan-bottom">
                    <div class="laporan-card">
                        <div class="laporan-card-title">Produk Terlaris</div>
                        <div id="laporanTerlaris"></div>
                    </div>
                    <div class="laporan-card">
                        <div class="laporan-card-title">Ringkasan</div>
                        <div id="laporanRingkasan"></div>
                    </div>
                </div>
            </div>
        `;

        let activePeriode = 'hari';
        const render = () => renderLaporan(activePeriode);
        render();

        document.querySelectorAll('.periode-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.periode-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activePeriode = btn.dataset.periode || 'hari';
                render();
            });
        });

    // --- 9e. PENGATURAN TOKO ---
    } else if (currentView === 'settings') {
        rightPanel.style.display = 'none';
        if (cashPanel) cashPanel.style.display = 'none';
        const btnCashEl = document.getElementById('btnCash');
        if (btnCashEl) btnCashEl.classList.remove('active');

        mainPanel.innerHTML = `
            <div class="settings-header">
                <div>
                    <h2>Pengaturan Warung</h2>
                    <p class="history-subtitle">Profil toko akan muncul otomatis di struk belanja</p>
                </div>
            </div>
            <div class="product-divider"></div>

            <form id="settingsForm" class="settings-form">
                <div class="settings-section">
                    <div class="settings-section-title">
                        <span class="material-symbols-outlined">storefront</span>
                        Profil Toko
                    </div>

                    <div class="form-group full-width">
                        <label>Logo Toko</label>
                        <div class="logo-upload-row">
                            <div class="logo-preview-box" id="logoPreviewBox">
                                ${storeSettings.logo
                                    ? `<img src="${storeSettings.logo}" alt="Logo" id="logoPreviewImg">`
                                    : `<span class="material-symbols-outlined logo-placeholder-icon">image</span>`}
                            </div>
                            <div class="logo-upload-actions">
                                <label class="btn-photo-file" for="settingStoreLogo">
                                    <span class="material-symbols-outlined">upload</span>
                                    Pilih Logo
                                </label>
                                <input type="file" id="settingStoreLogo" accept="image/*" hidden>
                                <button type="button" class="btn-secondary btn-remove-logo" id="btnRemoveLogo"
                                    ${storeSettings.logo ? '' : 'style="display:none;"'}>
                                    Hapus Logo
                                </button>
                                <small class="logo-hint">PNG/JPG, disarankan persegi. Muncul di navbar & struk.</small>
                            </div>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label>Nama Warung</label>
                        <input type="text" id="settingStoreName"
                            placeholder="Contoh: Warung Sembako Sejahtera"
                            value="${(storeSettings.name || '').replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group full-width">
                        <label>Alamat</label>
                        <textarea id="settingStoreAddress" rows="3"
                            placeholder="Contoh: Jl. Merdeka No. 10, Jakarta">${(storeSettings.address || '').replace(/</g, '&lt;')}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label>Nomor Telepon</label>
                        <input type="text" id="settingStorePhone"
                            placeholder="Contoh: 0812-3456-7890"
                            value="${(storeSettings.phone || '').replace(/"/g, '&quot;')}">
                    </div>
                </div>

                <div class="settings-preview">
                    <div class="settings-preview-label">Pratinjau Header Struk</div>
                    <div class="receipt-preview" id="receiptPreview">
                        <div class="rp-logo-wrap" id="rpLogoWrap" style="${storeSettings.logo ? '' : 'display:none;'}">
                            <img class="rp-logo" id="rpLogo" src="${storeSettings.logo || ''}" alt="Logo">
                        </div>
                        <div class="rp-name">${(storeSettings.name || 'WARUNG SEMBAKO').replace(/</g, '&lt;')}</div>
                        <div class="rp-address" id="rpAddress">${(storeSettings.address || 'Alamat belum diisi').replace(/</g, '&lt;')}</div>
                        <div class="rp-phone"   id="rpPhone">${(storeSettings.phone || 'Telepon belum diisi').replace(/</g, '&lt;')}</div>
                    </div>
                </div>

                <div class="settings-actions">
                    <button type="submit" class="btn-primary">Simpan Pengaturan</button>
                    <button type="button" class="btn-secondary" id="btnResetSettings">Reset Default</button>
                </div>
            </form>
        `;

        renderSettingsLogic();
    }
};

// ============================================================
// 10. HALAMAN RIWAYAT TRANSAKSI
// ============================================================

const formatHistoryDate = (iso) => {
    try {
        const d = new Date(iso);
        return d.toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return iso || '-';
    }
};

const renderHistoryList = (list) => {
    const container = document.getElementById('historyList');
    if (!container) return;
    container.innerHTML = '';

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="history-empty">
                <span class="material-symbols-outlined">receipt_long</span>
                <p>Belum ada riwayat transaksi.</p>
                <small>Transaksi yang berhasil akan muncul di sini.</small>
            </div>
        `;
        return;
    }

    const sorted = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));

    sorted.forEach(trx => {
        const items        = trx.items || [];
        const itemCount    = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
        const itemsPreview = items.slice(0, 3).map(it => `${it.name} ×${it.qty}`).join(', ')
                           + (items.length > 3 ? `, +${items.length - 3} lainnya` : '');

        const isFromOrder = !!trx.fromOrder;

        // Badge kanan atas: Tunai / Online / Langsung — selalu tampil, warna berbeda
        const badgeClass = isFromOrder
            ? 'badge-order'
            : (trx.paymentMethod === 'cash' ? 'badge-cash' : 'badge-direct');
        const badgeLabel = isFromOrder
            ? 'Online'
            : (trx.paymentMethod === 'cash' ? 'Tunai' : 'Langsung');

        // Baris tag bawah: kode order + nama pembeli (hanya jika dari order online)
        const orderTagHtml = isFromOrder
            ? `<span class="history-order-tag">
                   <span class="material-symbols-outlined" style="font-size:11px;vertical-align:middle;">receipt</span>
                   ${String(trx.fromOrder).slice(-10)}
               </span>
               ${trx.buyerName ? `<span class="history-order-tag">
                   <span class="material-symbols-outlined" style="font-size:11px;vertical-align:middle;">person</span>
                   ${window.WarungUtils.escapeHtml(trx.buyerName)}
               </span>` : ''}`
            : '';
        const buyerTagHtml = '';
        const subTagsHtml = orderTagHtml
            ? `<div class="history-sub-tags">${orderTagHtml}</div>`
            : '';

        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div class="history-card-top">
                <div class="history-card-meta">
                    <div class="history-meta-row">
                        ${!isFromOrder ? `<span class="history-id">#${String(trx.id).slice(-6)}</span>` : ''}
                        <span class="history-date">${formatHistoryDate(trx.date)}</span>
                    </div>
                    ${subTagsHtml}
                </div>
                <span class="history-badge ${badgeClass}">${badgeLabel}</span>
            </div>
            <div class="history-card-body">
                <div class="history-items-preview">${itemsPreview || '(Tidak ada item)'}</div>
                <div class="history-card-footer">
                    <span class="history-item-count">${itemCount} item</span>
                    <span class="history-total">${formatRupiah(trx.total)}</span>
                </div>
            </div>
            <div class="history-card-actions">
                <button class="btn-history-detail"  data-id="${trx.id}" title="Detail">
                    <span class="material-symbols-outlined">visibility</span> Detail
                </button>
                <button class="btn-history-reprint" data-id="${trx.id}" title="Cetak Ulang">
                    <span class="material-symbols-outlined">print</span> Cetak
                </button>
                <button class="btn-history-delete"  data-id="${trx.id}" title="Hapus Transaksi">
                    <span class="material-symbols-outlined">delete</span> Hapus
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    // Event: lihat detail
    container.querySelectorAll('.btn-history-detail').forEach(btn => {
        btn.addEventListener('click', () => {
            const trx = transactions.find(t => t.id === Number(btn.dataset.id));
            if (trx) showHistoryDetail(trx);
        });
    });

    // Event: cetak ulang
    container.querySelectorAll('.btn-history-reprint').forEach(btn => {
        btn.addEventListener('click', () => {
            const trx = transactions.find(t => t.id === Number(btn.dataset.id));
            if (trx) {
                lastReceipt = {
                    total: trx.total,
                    cash:  trx.cash,
                    change: trx.change,
                    items: trx.items || []
                };
                downloadReceiptImage();
            }
        });
    });

    // Event: hapus transaksi
    container.querySelectorAll('.btn-history-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.dataset.id);
            if (await showConfirm('Hapus transaksi ini?\nTindakan ini tidak bisa dibatalkan.', {
                type: 'error', danger: true, okText: 'Hapus', title: 'Hapus Transaksi'
            })) {
                transactions = transactions.filter(t => t.id !== id);
                saveTransactionsToStorage();
                renderApp();
            }
        });
    });
};

const showHistoryDetail = (trx) => {
    const items    = trx.items || [];
    let itemsHtml  = items.map(it => {
        const sub = (Number(it.price) || 0) * (Number(it.qty) || 0);
        return `<div class="detail-row">
            <span>${it.name} (${it.qty} × ${formatRupiah(it.price)})</span>
            <span>${formatRupiah(sub)}</span>
        </div>`;
    }).join('');

    if (!itemsHtml) itemsHtml = '<div class="detail-row"><span>Tidak ada item</span><span>-</span></div>';

    let cashHtml = '';
    if (trx.cash != null) {
        cashHtml = `
            <div class="detail-row"><span>Uang Diterima</span><span>${formatRupiah(trx.cash)}</span></div>
            <div class="detail-row total-row-detail"><span>Kembalian</span><span>${formatRupiah(trx.change || 0)}</span></div>
        `;
    }

    // --- LOGIKA BARU: Cek apakah transaksi dari pesanan online ---
    const isFromOrder = !!trx.fromOrder;
    
    // Tampilkan Kode Resi jika online, atau ID Kasir jika offline
    const displayId = isFromOrder 
        ? String(trx.fromOrder).slice(-10) 
        : `#${String(trx.id).slice(-6)}`;
        
    // Label Metode Pembayaran
    const displayMethod = isFromOrder
        ? 'Online'
        : (trx.paymentMethod === 'cash' ? 'Tunai' : 'Langsung');
    // -----------------------------------------------------------

    // Gunakan successModal sebagai detail viewer
    const modal    = document.getElementById('successModal');
    const details  = document.getElementById('successDetails');
    const title    = modal.querySelector('.success-title');
    const checkWrap = modal.querySelector('.success-check-wrap');

    if (title)     title.textContent        = 'Detail Transaksi';
    if (checkWrap) checkWrap.style.display  = 'none';

    // Inject data yang sudah diformat ke dalam modal
    details.innerHTML = `
        <div class="detail-row"><span>ID / Resi</span><span style="font-weight:700;">${displayId}</span></div>
        <div class="detail-row"><span>Waktu</span><span>${formatHistoryDate(trx.date)}</span></div>
        <div class="detail-row"><span>Metode</span><span style="color:${isFromOrder ? '#d97706' : '#19a16f'}; font-weight:700;">${displayMethod}</span></div>
        <div style="margin: 8px 0; border-top: 1px solid #eee;"></div>
        ${itemsHtml}
        <div style="margin: 8px 0; border-top: 1px solid #eee;"></div>
        <div class="detail-row total-row-detail"><span>Total</span><span>${formatRupiah(trx.total)}</span></div>
        ${cashHtml}
    `;

    lastReceipt = { total: trx.total, cash: trx.cash, change: trx.change, items: trx.items || [] };
    modal.classList.add('active');

    // Pulihkan tampilan modal sukses saat ditutup
    const okBtn  = document.getElementById('btnSuccessOk');
    const restore = () => {
        if (title)     title.textContent       = 'Pembayaran Berhasil!';
        if (checkWrap) checkWrap.style.display = '';
        okBtn.removeEventListener('click', restore);
    };
    okBtn.addEventListener('click', restore);
};

// ============================================================
// 11. HALAMAN LAPORAN PENJUALAN
// ============================================================

const getPeriodeRange = (periode) => {
    const now   = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (periode === 'hari')   return { start, end: now, label: 'Hari Ini' };
    if (periode === 'minggu') {
        start.setDate(start.getDate() - 6);
        return { start, end: now, label: '7 Hari Terakhir' };
    }
    if (periode === 'bulan') {
        start.setDate(1);
        return { start, end: now, label: 'Bulan Ini' };
    }
    return { start: new Date(0), end: now, label: 'Semua Waktu' };
};

const filterTransactionsByPeriode = (periode) => {
    const { start, end } = getPeriodeRange(periode);
    return transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
    });
};

const renderLaporan = (periode = 'hari') => {
    const list        = filterTransactionsByPeriode(periode);
    const { label }   = getPeriodeRange(periode);

    let omzet       = 0;
    let totalItems  = 0;
    let totalModal  = 0;
    const productMap = {};

    list.forEach(trx => {
        omzet += Number(trx.total) || 0;
        (trx.items || []).forEach(it => {
            const qty   = Number(it.qty)   || 0;
            const price = Number(it.price) || 0;
            totalItems += qty;

            const name = it.name || 'Tanpa Nama';
            if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 };
            productMap[name].qty     += qty;
            productMap[name].revenue += qty * price;

            const prod = products.find(p => p.name === name);
            if (prod) totalModal += qty * (Number(prod.buyPrice) || 0);
        });
    });

    const profit   = omzet - totalModal;
    const trxCount = list.length;
    const avgTrx   = trxCount > 0 ? omzet / trxCount : 0;

    // Statistik kartu
    const statsEl = document.getElementById('laporanStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">🧾</div>
                <div>
                    <div class="stat-label">Transaksi</div>
                    <div class="stat-val">${trxCount}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div>
                    <div class="stat-label">Omzet</div>
                    <div class="stat-val">${formatRupiah(omzet)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📦</div>
                <div>
                    <div class="stat-label">Item Terjual</div>
                    <div class="stat-val">${totalItems}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div>
                    <div class="stat-label">Estimasi Profit</div>
                    <div class="stat-val ${profit >= 0 ? 'positif' : 'negatif'}">${formatRupiah(profit)}</div>
                </div>
            </div>
        `;
    }

    // Grafik omzet per hari
    const dayMap = {};
    list.forEach(trx => {
        const d   = new Date(trx.date);
        const key = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        dayMap[key] = (dayMap[key] || 0) + (Number(trx.total) || 0);
    });
    const chartLabels = Object.keys(dayMap);
    const chartValues = Object.values(dayMap);
    const maxVal      = Math.max(...chartValues, 1);

    const chartEl = document.getElementById('laporanChart');
    if (chartEl) {
        if (chartLabels.length === 0) {
            chartEl.innerHTML = `<div class="laporan-empty">Belum ada data untuk periode ini.</div>`;
        } else {
            chartEl.innerHTML = `
                <div class="simple-bar-chart">
                    ${chartLabels.map((lab, i) => {
                        const h = Math.max(4, Math.round((chartValues[i] / maxVal) * 160));
                        return `
                            <div class="bar-col">
                                <div class="bar-val">${formatRupiah(chartValues[i])}</div>
                                <div class="bar-fill" style="height:${h}px"></div>
                                <div class="bar-label">${lab}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }

    // Produk terlaris (top 5)
    const ranked = Object.entries(productMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
    const maxQty = ranked.length ? ranked[0].qty : 1;

    const terlarisEl = document.getElementById('laporanTerlaris');
    if (terlarisEl) {
        if (ranked.length === 0) {
            terlarisEl.innerHTML = `<div class="laporan-empty">Belum ada produk terjual.</div>`;
        } else {
            terlarisEl.innerHTML = ranked.map((p, i) => `
                <div class="terlaris-item">
                    <div class="terlaris-rank">${i + 1}</div>
                    <div class="terlaris-info">
                        <div class="terlaris-name">${p.name}</div>
                        <div class="terlaris-bar-wrap">
                            <div class="terlaris-bar" style="width:${Math.round((p.qty / maxQty) * 100)}%"></div>
                        </div>
                    </div>
                    <div class="terlaris-qty">${p.qty} pcs</div>
                </div>
            `).join('');
        }
    }

    // Ringkasan periode
    const ringkasanEl = document.getElementById('laporanRingkasan');
    if (ringkasanEl) {
        ringkasanEl.innerHTML = `
            <div class="ringkasan-item">
                <span class="ringkasan-label">Periode</span>
                <span class="ringkasan-val">${label}</span>
            </div>
            <div class="ringkasan-item">
                <span class="ringkasan-label">Jumlah Transaksi</span>
                <span class="ringkasan-val">${trxCount}</span>
            </div>
            <div class="ringkasan-item">
                <span class="ringkasan-label">Rata-rata / Transaksi</span>
                <span class="ringkasan-val">${formatRupiah(avgTrx)}</span>
            </div>
            <div class="ringkasan-item">
                <span class="ringkasan-label">Total Omzet</span>
                <span class="ringkasan-val">${formatRupiah(omzet)}</span>
            </div>
            <div class="ringkasan-item">
                <span class="ringkasan-label">Estimasi Modal</span>
                <span class="ringkasan-val">${formatRupiah(totalModal)}</span>
            </div>
            <div class="ringkasan-item">
                <span class="ringkasan-label">Estimasi Profit</span>
                <span class="ringkasan-val" style="color:${profit >= 0 ? '#19a16f' : '#dc3545'}">${formatRupiah(profit)}</span>
            </div>
        `;
    }
};

// ============================================================
// 12. HALAMAN PENGATURAN TOKO
// ============================================================

const renderSettingsLogic = () => {
    const nameInput     = document.getElementById('settingStoreName');
    const addressInput  = document.getElementById('settingStoreAddress');
    const phoneInput    = document.getElementById('settingStorePhone');
    const logoInput     = document.getElementById('settingStoreLogo');
    const btnRemoveLogo = document.getElementById('btnRemoveLogo');
    const logoPreviewBox = document.getElementById('logoPreviewBox');
    const previewName   = document.querySelector('#receiptPreview .rp-name');
    const previewAddress = document.getElementById('rpAddress');
    const previewPhone  = document.getElementById('rpPhone');
    const rpLogoWrap    = document.getElementById('rpLogoWrap');
    const rpLogo        = document.getElementById('rpLogo');

    let pendingLogo = storeSettings.logo || '';

    const renderLogoPreview = (src) => {
        if (src) {
            logoPreviewBox.innerHTML = `<img src="${src}" alt="Logo" id="logoPreviewImg">`;
            if (btnRemoveLogo) btnRemoveLogo.style.display = '';
            if (rpLogoWrap) {
                rpLogoWrap.style.display = '';
                if (rpLogo) rpLogo.src = src;
            }
        } else {
            logoPreviewBox.innerHTML = `<span class="material-symbols-outlined logo-placeholder-icon">image</span>`;
            if (btnRemoveLogo) btnRemoveLogo.style.display = 'none';
            if (rpLogoWrap)    rpLogoWrap.style.display    = 'none';
            if (rpLogo)        rpLogo.src = '';
        }
    };

    // Live preview header struk
    const updatePreview = () => {
        previewName.textContent    = nameInput.value.trim()    || 'WARUNG SEMBAKO';
        previewAddress.textContent = addressInput.value.trim() || 'Alamat belum diisi';
        previewPhone.textContent   = phoneInput.value.trim()   || 'Telepon belum diisi';
    };

    nameInput.addEventListener('input', updatePreview);
    addressInput.addEventListener('input', updatePreview);
    phoneInput.addEventListener('input', updatePreview);

    if (logoInput) {
        logoInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showAlert('File harus berupa gambar.', 'warning');
                return;
            }
            try {
                pendingLogo = await compressImageToBase64(file, 400, 0.92);
                renderLogoPreview(pendingLogo);
            } catch (err) {
                console.error(err);
                showAlert('Gagal memuat logo.', 'error');
            }
        });
    }

    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener('click', () => {
            pendingLogo = '';
            if (logoInput) logoInput.value = '';
            renderLogoPreview('');
        });
    }

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        storeSettings = {
            name:    nameInput.value.trim()    || 'WARUNG SEMBAKO',
            address: addressInput.value.trim(),
            phone:   phoneInput.value.trim(),
            logo:    pendingLogo || ''
        };
        saveStoreSettings();
        showAlert('Pengaturan toko berhasil disimpan!', 'success');
    });

    document.getElementById('btnResetSettings').addEventListener('click', async () => {
        if (!(await showConfirm('Kembalikan ke pengaturan default?\nLogo juga akan dihapus.', {
            danger: true, okText: 'Reset', title: 'Reset Pengaturan'
        }))) return;
        storeSettings = { ...defaultStoreSettings };
        saveStoreSettings();
        renderApp();
    });
};

// ============================================================
// 13. RENDER GRID PRODUK (DASHBOARD KASIR)
// ============================================================

const renderProductsGrid = (list) => {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '';

    if (list.length === 0) {
        productGrid.innerHTML = `
            <div class="empty-state-dashboard">
                <span class="material-symbols-outlined empty-state-icon">storefront</span>
                <h3 class="empty-state-title">Belum Ada Produk</h3>
                <p class="empty-state-desc">Silakan buka menu <b>Produk</b> di samping untuk menambahkan produk baru.</p>
            </div>
        `;
        return;
    }

    list.forEach(product => {
        const isOutOfStock = (Number(product.stock) || 0) <= 0;
        const card = document.createElement('div');
        card.className = 'product-card' + (isOutOfStock ? ' out-of-stock' : '');
        if (!isOutOfStock) {
            card.onclick = () => addToCart(product);
        }
        card.innerHTML = `
            <img src="${product.img || DEFAULT_PRODUCT_IMG}" alt="${product.name}">
            <h3>${product.name}</h3>
            <div class="price">${formatRupiah(product.price)}</div>
            <div class="stock-label">${isOutOfStock ? '⚠ Stok Habis' : 'Stok: ' + product.stock + ' ' + product.unit}</div>
        `;
        productGrid.appendChild(card);
    });
};

// ============================================================
// 14. RENDER KARTU PRODUK (MANAJEMEN PRODUK)
// ============================================================

const renderProductsTable = (list) => {
    const container = document.getElementById('productTableBody');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 40px;">
                Belum ada data produk. Klik "+ Tambah Produk Baru" di atas.
            </div>
        `;
        return;
    }

    list.forEach(product => {
        const card = document.createElement('div');
        card.className = 'manage-product-card';
        card.innerHTML = `
            <div class="manage-card-img">
                <img src="${product.img || DEFAULT_PRODUCT_IMG}" alt="${product.name}">
            </div>
            <div class="manage-card-body">
                <h3>${product.name}</h3>
                <div class="manage-card-meta">
                    <span class="badge">${product.category}</span>
                </div>
                <div class="manage-card-prices">
                    <div>
                        <small>Harga Modal</small>
                        <strong>${formatRupiah(product.buyPrice)}</strong>
                    </div>
                    <div>
                        <small>Harga Jual</small>
                        <strong class="sell-price">${formatRupiah(product.price)}</strong>
                    </div>
                </div>
                <div class="manage-card-footer">
                    <span class="stock">Stok: ${product.stock} ${product.unit}</span>
                    <div class="manage-card-actions">
                        <button class="btn-edit"   onclick="editProduct(${product.id})"   title="Ubah">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn-delete" onclick="deleteProduct(${product.id})" title="Hapus">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

// ============================================================
// 15. KERANJANG BELANJA (CART)
// ============================================================

// Suara bip kasir menggunakan Web Audio API
let audioCtx = null;

const playBeep = (type = 'add') => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!audioCtx) audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;

        if (type === 'add') {
            const osc    = audioCtx.createOscillator();
            const gain   = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            filter.type            = 'lowpass';
            filter.frequency.value = 2800;
            osc.type               = 'square';
            osc.frequency.setValueAtTime(1500, now);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.008);
            gain.gain.linearRampToValueAtTime(0.10, now + 0.04);
            gain.gain.linearRampToValueAtTime(0,    now + 0.09);

            osc.start(now);
            osc.stop(now + 0.1);

        } else if (type === 'error') {
            [0, 0.12].forEach((offset) => {
                const osc  = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type   = 'square';
                osc.frequency.setValueAtTime(400, now + offset);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                gain.gain.setValueAtTime(0, now + offset);
                gain.gain.linearRampToValueAtTime(0.1, now + offset + 0.01);
                gain.gain.linearRampToValueAtTime(0,   now + offset + 0.08);
                osc.start(now + offset);
                osc.stop(now + offset + 0.09);
            });
        }
    } catch (e) {
        // Diam jika browser memblokir audio
    }
};

const addToCart = (product) => {
    if (product.stock <= 0) {
        playBeep('error');
        showAlert('Stok produk habis!', 'warning');
        return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        if (existingItem.qty < product.stock) {
            existingItem.qty += 1;
            playBeep('add');
        } else {
            playBeep('error');
            showAlert('Stok tidak mencukupi!', 'warning');
            return;
        }
    } else {
        cart.push({ ...product, qty: 1 });
        playBeep('add');
    }
    updateCart();
};

const changeQty = (id, amount) => {
    const item = cart.find(item => item.id === id);
    const prod = products.find(p => p.id === id);
    if (!item) return;

    item.qty += amount;
    if (item.qty > prod.stock) {
        item.qty = prod.stock;
        showAlert('Mencapai batas stok!', 'warning');
    }
    if (item.qty <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== id);
    }
    updateCart();
};

const removeItem = (id) => {
    cart = cart.filter(item => item.id !== id);
    updateCart();
};

const updateCart = () => {
    const cartItemsDiv = document.getElementById('cartItems');
    cartItemsDiv.innerHTML = '';
    let subTotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subTotal += itemTotal;

        const cartRow = document.createElement('div');
        cartRow.className = 'cart-item';
        cartRow.innerHTML = `
            <span class="material-symbols-outlined del-btn" onclick="removeItem(${item.id})">delete</span>
            <div class="item-name">${item.name}</div>
            <div class="qty-control">
                <span class="material-symbols-outlined" onclick="changeQty(${item.id}, -1)">remove_circle</span>
                <span>${item.qty}</span>
                <span class="material-symbols-outlined" onclick="changeQty(${item.id}, 1)">add_circle</span>
            </div>
            <div class="item-price">${formatRupiah(itemTotal)}</div>
        `;
        cartItemsDiv.appendChild(cartRow);
    });

    calculateTotal(subTotal);
};

// ============================================================
// 16. KALKULASI TOTAL & KEMBALIAN
// ============================================================

let currentTotal = 0;

const calculateTotal = (subTotal) => {
    const discountPercent = document.getElementById('discountInput').value || 0;
    const discountAmount  = subTotal * (discountPercent / 100);
    const totalAmount     = subTotal - discountAmount;
    currentTotal          = totalAmount;

    document.getElementById('subTotal').innerText    = formatRupiah(subTotal);
    document.getElementById('totalAmount').innerText = formatRupiah(totalAmount);
    document.getElementById('payAmount').innerText   = formatRupiah(totalAmount);

    calculateChange();
};

const fitCashFont = (el, text) => {
    if (!el) return;
    el.textContent = text;
    const len      = String(text).replace(/\s/g, '').length;
    const isMobile = window.innerWidth <= 768;
    let size = isMobile ? 22 : 20;
    if      (len > 18) size = isMobile ? 13 : 12;
    else if (len > 15) size = isMobile ? 14 : 13;
    else if (len > 13) size = isMobile ? 15 : 14;
    else if (len > 11) size = isMobile ? 17 : 16;
    else if (len > 9)  size = isMobile ? 19 : 18;
    el.style.fontSize = size + 'px';
};

const calculateChange = () => {
    const cashInput  = document.getElementById('cashInput');
    const changeEl   = document.getElementById('changeAmount');
    const cashDisplay = document.getElementById('cashDisplay');
    if (!cashInput || !changeEl) return;

    const cash   = parseRupiah(cashInput.value);
    const change = cash - currentTotal;

    if (cashDisplay) fitCashFont(cashDisplay, formatRupiah(cash));

    if (change < 0) {
        changeEl.classList.add('negative');
        fitCashFont(changeEl, '-' + formatRupiah(Math.abs(change)));
    } else {
        changeEl.classList.remove('negative');
        fitCashFont(changeEl, formatRupiah(change));
    }
};

// ============================================================
// 17. MODAL FORM TAMBAH / EDIT PRODUK
// ============================================================

const modal       = document.getElementById('productModal');
const productForm = document.getElementById('productForm');

const updatePhotoPreview = (src) => {
    const wrap = document.getElementById('photoPreviewWrap');
    const img  = document.getElementById('photoPreview');
    if (!wrap || !img) return;

    if (src && src !== DEFAULT_PRODUCT_IMG) {
        img.src              = src;
        wrap.style.display   = 'block';
    } else {
        img.src              = '';
        wrap.style.display   = 'none';
    }
};

const clearProductPhoto = () => {
    uploadedImageBase64 = '';
    const fileInput = document.getElementById('productImgFile');
    if (fileInput) fileInput.value = '';
    updatePhotoPreview('');
};

const btnClearPhoto = document.getElementById('btnClearPhoto');
if (btnClearPhoto) btnClearPhoto.addEventListener('click', clearProductPhoto);

const calculateProfitMargin = () => {
    const buy        = parseRupiah(document.getElementById('productBuyPrice').value);
    const sell       = parseRupiah(document.getElementById('productPrice').value);
    const profit     = sell - buy;
    const percentage = buy > 0 ? ((profit / buy) * 100).toFixed(1) : 0;
    document.getElementById('marginInfo').innerText = `${formatRupiah(profit)} (${percentage}%)`;
};

const setupPriceInput = (inputId) => {
    const input = document.getElementById(inputId);
    input.addEventListener('input', (e) => {
        let raw = e.target.value.replace(/[^\d]/g, '');
        e.target.value = raw ? formatNumber(raw) : '';
        calculateProfitMargin();
    });
};

setupPriceInput('productBuyPrice');
setupPriceInput('productPrice');

const openModal = (product = null) => {
    modal.classList.add('active');
    uploadedImageBase64 = '';
    clearProductPhoto();

    if (product) {
        document.getElementById('modalTitle').innerText       = 'Ubah Produk';
        document.getElementById('productId').value            = product.id;
        document.getElementById('productName').value          = product.name;
        document.getElementById('productCategory').value      = product.category;
        document.getElementById('productBuyPrice').value      = formatNumber(product.buyPrice);
        document.getElementById('productPrice').value         = formatNumber(product.price);
        document.getElementById('productStock').value         = product.stock;
        document.getElementById('productMinStock').value      = product.minStock;
        document.getElementById('productUnit').value          = product.unit;
        uploadedImageBase64                                   = product.img || '';
        updatePhotoPreview(uploadedImageBase64);
    } else {
        document.getElementById('modalTitle').innerText = 'Tambah Produk Baru';
        productForm.reset();
        document.getElementById('productId').value = '';
        clearProductPhoto();
    }

    calculateProfitMargin();
};

const closeModal = () => {
    modal.classList.remove('active');
    if (typeof closeCameraModal === 'function') closeCameraModal();
};

document.getElementById('closeModalBtn').onclick  = closeModal;
document.getElementById('cancelModalBtn').onclick = closeModal;

productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id       = document.getElementById('productId').value;
    const name     = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const buyPrice = parseRupiah(document.getElementById('productBuyPrice').value);
    const price    = parseRupiah(document.getElementById('productPrice').value);
    const stock    = parseInt(document.getElementById('productStock').value)    || 0;
    const minStock = parseInt(document.getElementById('productMinStock').value) || 0;
    const unit     = document.getElementById('productUnit').value;
    const finalImage = uploadedImageBase64 || DEFAULT_PRODUCT_IMG;

    if (id) {
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            products[index] = { ...products[index], name, category, buyPrice, price, stock, minStock, unit, img: finalImage };
        }
    } else {
        products.push({
            id: Date.now(),
            name, category, buyPrice, price, stock, minStock, unit,
            img: finalImage
        });
    }

    saveProductsToStorage();
    closeModal();
    renderApp();
});

window.editProduct = (id) => {
    const prod = products.find(p => p.id === id);
    if (prod) openModal(prod);
};

window.deleteProduct = async (id) => {
    if (await showConfirm('Apakah Anda yakin ingin menghapus produk ini?', {
        type: 'error', danger: true, okText: 'Hapus', title: 'Hapus Produk'
    })) {
        products = products.filter(p => p.id !== id);
        saveProductsToStorage();
        renderApp();
    }
};

// ============================================================
// 18. KAMERA & UPLOAD FOTO PRODUK
// ============================================================

const imgFileInput = document.getElementById('productImgFile');
if (imgFileInput) {
    imgFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImageBase64 = event.target.result;
            updatePhotoPreview(uploadedImageBase64);
        };
        reader.readAsDataURL(file);
    });
}

let cameraStream = null;

const stopCamera = () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
    }
    const video = document.getElementById('cameraVideo');
    if (video) video.srcObject = null;
};

const closeCameraModal = () => {
    stopCamera();
    const camModal = document.getElementById('cameraModal');
    if (camModal) camModal.classList.remove('active');
};

const openCameraModal = async () => {
    const camModal = document.getElementById('cameraModal');
    const video    = document.getElementById('cameraVideo');
    const hint     = document.getElementById('cameraHint');
    if (!camModal || !video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const fallback      = document.createElement('input');
        fallback.type       = 'file';
        fallback.accept     = 'image/*';
        fallback.capture    = 'environment';
        fallback.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedImageBase64 = ev.target.result;
                updatePhotoPreview(uploadedImageBase64);
            };
            reader.readAsDataURL(file);
        });
        fallback.click();
        return;
    }

    camModal.classList.add('active');
    if (hint) hint.textContent = 'Meminta izin kamera...';

    try {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false
            });
        } catch (_) {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        video.srcObject = cameraStream;
        if (hint) hint.textContent = 'Arahkan kamera ke produk, lalu tekan Ambil Foto.';
    } catch (err) {
        console.error(err);
        if (hint) hint.textContent = 'Tidak bisa mengakses kamera. Izinkan akses kamera di browser, atau pakai Pilih File.';
        showAlert('Gagal membuka kamera.\nPastikan izin kamera diizinkan, atau gunakan Pilih File.', 'error');
        closeCameraModal();
    }
};

const capturePhotoFromCamera = () => {
    const video  = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    if (!video || !canvas || !video.srcObject) {
        showAlert('Kamera belum siap.', 'warning');
        return;
    }
    const w = video.videoWidth  || 640;
    const h = video.videoHeight || 480;
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
    updatePhotoPreview(uploadedImageBase64);
    closeCameraModal();
};

const btnTakePhoto    = document.getElementById('btnTakePhoto');
const closeCameraBtn  = document.getElementById('closeCameraBtn');
const btnCancelCamera = document.getElementById('btnCancelCamera');
const btnCapturePhoto = document.getElementById('btnCapturePhoto');

if (btnTakePhoto)    btnTakePhoto.addEventListener('click', openCameraModal);
if (closeCameraBtn)  closeCameraBtn.addEventListener('click', closeCameraModal);
if (btnCancelCamera) btnCancelCamera.addEventListener('click', closeCameraModal);
if (btnCapturePhoto) btnCapturePhoto.addEventListener('click', capturePhotoFromCamera);

// ============================================================
// 19. SIDEBAR NAVIGASI
// ============================================================

const menuBtn        = document.getElementById('menuBtn');
const sidebar        = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const overlay        = document.getElementById('overlay');

const toggleSidebar = () => {
    const isOpen = sidebar.classList.contains('active');
    if (isOpen) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
};

menuBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

const navItems = [
    { id: 'menuDashboard',  view: 'dashboard' },
    { id: 'menuProdukList', view: 'products'  },
    { id: 'menuRiwayat',    view: 'history'   },
    { id: 'menuLaporan',    view: 'laporan'   },
    { id: 'menuPengaturan', view: 'settings'  },
];

navItems.forEach(({ id, view }) => {
    document.getElementById(id).addEventListener('click', (e) => {
        e.preventDefault();
        currentView = view;
        sessionStorage.setItem('warung_current_view', view);
        setActiveMenu(id);
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        renderApp();
    });
});

document.getElementById('discountInput').addEventListener('input', updateCart);

// ============================================================
// 20. CASH PANEL & NUMPAD
// ============================================================

const cashSection = document.getElementById('cashSection');
const cashInput   = document.getElementById('cashInput');
const btnCash     = document.getElementById('btnCash');
const btnCancel   = document.getElementById('btnCancel');

let cashRaw = '';

const updateCashFromRaw = () => {
    cashInput.value = cashRaw;
    calculateChange();
};

btnCash.addEventListener('click', () => {
    const isVisible = cashSection.style.display !== 'none';
    if (isVisible) {
        cashSection.style.display = 'none';
        btnCash.classList.remove('active');
    } else {
        cashSection.style.display = 'flex';
        btnCash.classList.add('active');
    }
    cashRaw         = '';
    cashInput.value = '';
    calculateChange();
});

document.getElementById('numpad').addEventListener('click', (e) => {
    const btn = e.target.closest('.num-btn');
    if (!btn) return;

    const val = btn.dataset.val;
    if      (val === 'C')  cashRaw = '';
    else if (val === '⌫')  cashRaw = cashRaw.slice(0, -1);
    else if (cashRaw.length < 12) cashRaw += val;

    updateCashFromRaw();
});

btnCancel.addEventListener('click', async () => {
    if (cart.length === 0) return;
    if (await showConfirm('Batalkan pesanan ini?', { type: 'warning', okText: 'Batalkan', title: 'Batalkan Pesanan' })) {
        cart = [];
        updateCart();
        cashSection.style.display = 'none';
        btnCash.classList.remove('active');
        cashRaw         = '';
        cashInput.value = '';
        document.getElementById('discountInput').value = 0;
        calculateChange();
    }
});

// ============================================================
// 21. PROSES PEMBAYARAN
// ============================================================

let _paymentProcessing = false;
const processPayment = () => {
    if (_paymentProcessing) return;
    if (cart.length === 0) {
        showAlert('Keranjang masih kosong!', 'warning');
        return;
    }

    const cash         = parseRupiah(cashInput.value);
    const total        = currentTotal;
    const discountPercent = Number(document.getElementById('discountInput').value) || 0;

    const receiptItems = cart.map(item => ({
        name:  item.name,
        qty:   item.qty,
        price: item.price
    }));

    const subTotal = receiptItems.reduce((s, it) => s + (it.price * it.qty), 0);

    if (cash < total) {
        showAlert('Uang yang diterima kurang!', 'error');
        return;
    }

    _paymentProcessing = true;
    try {
        const change = cash - total;

        const saveTransaction = (payload) => {
            try {
                const latest = JSON.parse(localStorage.getItem('warung_transactions') || '[]');
                if (Array.isArray(latest)) transactions = latest;
            } catch (_) { }
            const trx = {
                id:            Date.now(),
                date:          new Date().toISOString(),
                items:         receiptItems,
                subTotal,
                discount:      discountPercent,
                total:         payload.total,
                cash:          payload.cash,
                change:        payload.change,
                paymentMethod: payload.cash != null ? 'cash' : 'direct'
            };
            transactions.push(trx);
            saveTransactionsToStorage();
            return trx;
        };

        try {
            const latestProducts = JSON.parse(localStorage.getItem('warung_products') || '[]');
            if (Array.isArray(latestProducts) && latestProducts.length) {
                products = latestProducts;
            }
        } catch (_) { }

        cart.forEach(item => {
            const prod = products.find(p => p.id === item.id);
            if (prod) prod.stock -= item.qty;
        });

        saveProductsToStorage();
        saveTransaction({ total, cash, change });
        showSuccessModal({ total, cash, change, items: receiptItems });

        cart            = [];
        cashRaw         = '';
        cashInput.value = '';
        document.getElementById('discountInput').value = 0;

        updateCart();
        cashSection.style.display = 'none';
        btnCash.classList.remove('active');
        calculateChange();
        renderApp();
    } finally {
        _paymentProcessing = false;
    }
};

// ============================================================
// 22. MODAL SUKSES & STRUK (RECEIPT)
// ============================================================

let lastReceipt = null;

const showSuccessModal = (data) => {
    lastReceipt     = data;
    const modal     = document.getElementById('successModal');
    const details   = document.getElementById('successDetails');
    const title     = modal.querySelector('.success-title');
    const checkWrap = modal.querySelector('.success-check-wrap');

    if (title)     title.textContent       = 'Pembayaran Berhasil!';
    if (checkWrap) checkWrap.style.display = '';

    let html = `<div class="detail-row"><span>Total</span><span>${formatRupiah(data.total)}</span></div>`;
    if (data.cash != null) {
        html += `
            <div class="detail-row"><span>Uang Diterima</span><span>${formatRupiah(data.cash)}</span></div>
            <div class="detail-row total-row-detail"><span>Kembalian</span><span>${formatRupiah(data.change)}</span></div>
        `;
    }
    details.innerHTML = html;

    const checkSvg = modal.querySelector('.success-checkmark');
    if (checkSvg) {
        checkSvg.style.animation = 'none';
        void checkSvg.offsetWidth;
        checkSvg.style.animation = '';
    }

    modal.classList.add('active');
};

const hideSuccessModal = () => {
    document.getElementById('successModal').classList.remove('active');
};

document.getElementById('btnSuccessOk').addEventListener('click', hideSuccessModal);

const downloadReceiptImage = async () => {
    if (!lastReceipt) return;

    const items       = lastReceipt.items || [];
    const padding     = 24;
    const width       = 320;
    const storeName   = (storeSettings.name    || 'WARUNG SEMBAKO').trim() || 'WARUNG SEMBAKO';
    const storeAddress = (storeSettings.address || '').trim();
    const storePhone  = (storeSettings.phone   || '').trim();
    const storeLogo   = storeSettings.logo     || '';

    let logoImg = null;
    if (storeLogo) {
        logoImg = await new Promise((resolve) => {
            const img  = new Image();
            img.onload  = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src     = storeLogo;
        });
    }

    const logoBlockH      = logoImg ? 56 : 0;
    const addressLines    = storeAddress ? storeAddress.split(/\n/).filter(Boolean) : [];
    const greenH          = logoImg ? 115 : 75; 
    const extraHeaderLines = addressLines.length + (storePhone ? 1 : 0) + 1;
    const headerH         = greenH + (extraHeaderLines * 16) + 30;
    
    const itemBlockH      = 40;
    const itemsH          = Math.max(items.length, 1) * itemBlockH + 20;
    const footerH         = 120;
    const height          = headerH + itemsH + footerH + padding;

    const scale  = Math.max(2, Math.min(3, Math.round(window.devicePixelRatio || 2)));
    const canvas = document.createElement('canvas');
    canvas.width  = width  * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#19a16f';
    ctx.fillRect(0, 0, width, greenH);

    let yHeader = 0;
    if (logoImg) {
        const maxLogo = 50;
        let lw = logoImg.width;
        let lh = logoImg.height;
        if (lw > maxLogo || lh > maxLogo) {
            if (lw > lh) { lh = Math.round(lh * (maxLogo / lw)); lw = maxLogo; }
            else         { lw = Math.round(lw * (maxLogo / lh)); lh = maxLogo; }
        }
        ctx.drawImage(logoImg, (width - lw) / 2, 16, lw, lh);
        yHeader = 16 + lh + 10;
    } else {
        yHeader = 24;
    }

    ctx.fillStyle  = '#ffffff';
    ctx.font       = 'bold 15px Poppins, Arial, sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(storeName.toUpperCase(), width / 2, yHeader + 12);
    
    ctx.font       = '12px Poppins, Arial, sans-serif';
    ctx.fillText("Struk Pembayaran", width / 2, yHeader + 28);

    let y = greenH + 20;

    ctx.font      = '12px Poppins, Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    addressLines.forEach(line => {
        ctx.fillText(line, width / 2, y);
        y += 16;
    });
    if (storePhone) {
        ctx.fillText(`Telp: ${storePhone}`, width / 2, y);
        y += 16;
    }
    
    y += 4;

    const now    = new Date();
    const dd     = String(now.getDate()).padStart(2, '0');
    const mm     = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy   = now.getFullYear();
    const hh     = String(now.getHours()).padStart(2, '0');
    const min    = String(now.getMinutes()).padStart(2, '0');
    const dateStr = `${dd}/${mm}/${yyyy}, ${hh}.${min}`;

    ctx.fillText(dateStr, width / 2, y);
    y += 20;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    y += 20;

    items.forEach(it => {
        const sub = (Number(it.price) || 0) * (Number(it.qty) || 0);

        ctx.font      = 'bold 12px Poppins, Arial, sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText(it.name, padding, y);
        
        ctx.font      = '12px Poppins, Arial, sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'right';
        ctx.fillText(formatRupiah(sub), width - padding, y);
        
        y += 16;

        ctx.font      = '12px Poppins, Arial, sans-serif';
        ctx.fillStyle = '#777';
        ctx.textAlign = 'left';
        ctx.fillText(`${it.qty} x ${formatRupiah(it.price)}`, padding, y);
        
        y += 24;
    });

    y -= 4;
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    y += 24;

    ctx.font      = 'bold 13px Poppins, Arial, sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('Total', padding, y);
    ctx.fillStyle = '#19a16f';
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(lastReceipt.total), width - padding, y);
    y += 24;

    if (lastReceipt.cash != null) {
        ctx.font      = '13px Poppins, Arial, sans-serif';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'left';
        ctx.fillText('Uang Diterima', padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(formatRupiah(lastReceipt.cash), width - padding, y);
        y += 22;

        ctx.font      = 'bold 13px Poppins, Arial, sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.fillText('Kembalian', padding, y);
        ctx.fillStyle = '#19a16f';
        ctx.textAlign = 'right';
        ctx.fillText(formatRupiah(lastReceipt.change), width - padding, y);
        y += 24;
    }

    ctx.fillStyle = '#999';
    ctx.font      = '11px Poppins, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Terima kasih telah berbelanja!', width / 2, height - 28);

    const link    = document.createElement('a');
    const ts      = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.download = `struk-warung-${ts}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
};

document.getElementById('btnPrintReceipt').addEventListener('click', downloadReceiptImage);

// ============================================================
// 23. FILTER & PERIODE LAPORAN
// ============================================================

// ============================================================
// 24. INISIALISASI AWAL
// ============================================================

applyStoreBranding();
setupNotifUI();

const viewToMenuId = {
    dashboard: 'menuDashboard',
    products:  'menuProdukList',
    history:   'menuRiwayat',
    laporan:   'menuLaporan',
    settings:  'menuPengaturan',
    orders:    'menuPesanan',
    archive:   'menuArsip',
};
if (typeof setActiveMenu === 'function' && viewToMenuId[currentView]) {
    setActiveMenu(viewToMenuId[currentView]);
}
renderApp();
window.renderApp = renderApp;

// ============================================================
// 25. MOBILE ENHANCEMENTS
// ============================================================

(function initMobile() {
    const isMobile = () => window.innerWidth <= 768;

    const syncPayAmountCash = () => {
        const payAmountEl   = document.getElementById('payAmount');
        const payAmountCash = document.getElementById('payAmountCash');
        if (payAmountEl && payAmountCash) {
            payAmountCash.textContent = payAmountEl.textContent;
        }
    };

    const payAmountEl = document.getElementById('payAmount');
    if (payAmountEl) {
        const obs = new MutationObserver(syncPayAmountCash);
        obs.observe(payAmountEl, { childList: true, characterData: true, subtree: true });
    }

    const handleCashPanelMobile = () => {
        const closeBtn     = document.getElementById('btnCloseCashPanel');
        const closeBtnWrap = closeBtn ? closeBtn.parentElement : null;
        if (!closeBtnWrap) return;
        closeBtnWrap.style.display = isMobile() ? 'flex' : 'none';
    };

    const btnCloseCashPanel = document.getElementById('btnCloseCashPanel');
    if (btnCloseCashPanel) {
        btnCloseCashPanel.addEventListener('click', () => {
            const cashSection = document.getElementById('cashSection');
            const btnCash     = document.getElementById('btnCash');
            if (cashSection) cashSection.style.display = 'none';
            if (btnCash)     btnCash.classList.remove('active');
        });
    }

    const btnPayFromCash = document.getElementById('btnPayFromCash');
    if (btnPayFromCash) {
        btnPayFromCash.addEventListener('click', () => processPayment());
    }

    const btnCash = document.getElementById('btnCash');
    if (btnCash) {
        btnCash.addEventListener('click', () => {
            setTimeout(() => {
                const cashSection = document.getElementById('cashSection');
                if (cashSection && cashSection.style.display !== 'none') {
                    cashSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    syncPayAmountCash();
                }
            }, 50);
        });
    }

    handleCashPanelMobile();
    window.addEventListener('resize', handleCashPanelMobile);
})();