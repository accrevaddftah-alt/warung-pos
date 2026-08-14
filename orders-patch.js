// ================================================================
// orders-patch.js — Manajemen Pesanan Online (Pembeli → Penjual)
// ================================================================
// DAFTAR SEKSI:
//   A.  Konstanta & Helper
//   B.  Notifikasi Pesanan Masuk
//   C.  Modal Pembayaran Pesanan Online
//   D.  Render Halaman Pesanan (Sisi Penjual)
//   E.  Inisialisasi (DOMContentLoaded)
// ================================================================

// ============================================================
// A. KONSTANTA & HELPER
// ============================================================

const ORDERS_KEY  = 'warung_customer_orders';
const ARCHIVE_KEY = 'warung_orders_archive';

// Gunakan shared utils jika tersedia, fallback ke definisi lokal
const ORDER_STATUS_CONFIG = (window.WarungUtils && window.WarungUtils.ORDER_STATUS_CONFIG) || {
    pending:    { label: 'Menunggu',  icon: 'schedule',     next: 'processing', nextLabel: 'Proses Sekarang', color: '#d97706' },
    processing: { label: 'Diproses', icon: 'autorenew',    next: 'ready',      nextLabel: 'Tandai Siap',    color: '#2563eb' },
    ready:      { label: 'Siap',     icon: 'inventory',    next: 'done',       nextLabel: 'Selesaikan',     color: '#059669' },
    done:       { label: 'Selesai',  icon: 'check_circle', next: null,         nextLabel: null,             color: '#19a16f' },
    cancelled:  { label: 'Dibatal',  icon: 'cancel',       next: null,         nextLabel: null,             color: '#dc3545' }
};

const ORDER_STEP_LABELS = (window.WarungUtils && window.WarungUtils.ORDER_STEP_LABELS) || ['Dikirim', 'Diproses', 'Siap', 'Selesai'];
const ORDER_STEP_ICONS  = (window.WarungUtils && window.WarungUtils.ORDER_STEP_ICONS)  || ['send', 'autorenew', 'inventory', 'check_circle'];
const ORDER_STEP_KEYS   = (window.WarungUtils && window.WarungUtils.ORDER_STEP_KEYS)   || ['pending', 'processing', 'ready', 'done'];

const getOrders  = () => JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
const saveOrders = (orders) => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    updateOrderNotif();
};

const getArchive  = () => JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
const saveArchive = (arr) => localStorage.setItem(ARCHIVE_KEY, JSON.stringify(arr));

const formatRupiahO = (window.WarungUtils && window.WarungUtils.formatRupiah)
    ? window.WarungUtils.formatRupiah
    : (n => 'Rp ' + Math.floor(Number(n)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'));

// Shared escape dari utils.js (dimuat sebelum orders-patch.js)
const escapeHtmlO = window.WarungUtils.escapeHtml;

const formatOrderDate = (iso) => new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

// ============================================================
// B. NOTIFIKASI PESANAN MASUK
// ============================================================

const getPendingOrderCount = () => getOrders().filter(o => o.status === 'pending').length;

const updateOrderNotif = () => {
    const count = getPendingOrderCount();
    const label = count > 99 ? '99+' : String(count);
    const badge = document.getElementById('orderNotifBadge');
    if (badge) { badge.textContent = label; badge.classList.toggle('is-hidden', count <= 0); }
    const menuBadge = document.getElementById('menuOrderBadge');
    if (menuBadge) { menuBadge.textContent = count > 9 ? '9+' : String(count); menuBadge.classList.toggle('is-hidden', count <= 0); }
};

const closeSidebarSafe = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
};

// Dengarkan perubahan data dari sync.js (CustomEvent)
window.addEventListener('warung-data-changed', (e) => {
    if (e.detail && e.detail.key === ORDERS_KEY) {
        updateOrderNotif();
        if (typeof currentView !== 'undefined' && currentView === 'orders') {
            if (typeof window.renderApp === 'function') window.renderApp();
        }
    }
});
// Tetap dengarkan native storage (tab lain di device yang sama)
window.addEventListener('storage', (e) => {
    if (e.key === ORDERS_KEY) {
        updateOrderNotif();
        if (typeof currentView !== 'undefined' && currentView === 'orders') {
            if (typeof window.renderApp === 'function') window.renderApp();
        }
    }
});

// ============================================================
// C. MODAL PEMBAYARAN PESANAN ONLINE (saat "Selesaikan")
// ============================================================

let _opmOrderTotal = 0;
let _opmCurrentOid = null;
let opmCashRaw = ''; // Penampung angka mentah dari numpad

// Inject modal kas pesanan ke DOM (sekali saja)
const injectOrderPayModal = () => {
    if (document.getElementById('orderPayModal')) return;
    const el = document.createElement('div');
    el.id = 'orderPayModal';
    el.className = 'order-pay-modal';

    el.innerHTML = `
      <div class="order-pay-box">
        <h3 class="order-pay-title">Konfirmasi Pembayaran</h3>
        <p id="opmOrderId" class="order-pay-id"></p>

        <div class="order-pay-summary">
          <div id="opmItems" class="order-pay-items"></div>
          <div class="order-pay-total-row">
            <span class="order-pay-total-label">Total</span>
            <span id="opmTotal" class="order-pay-total-val"></span>
          </div>
        </div>

        <div class="order-pay-cash-wrap">
            <label class="order-pay-cash-label" for="opmCashDisplay">Uang Diterima (Rp)</label>
            <div id="opmCashDisplay" class="order-pay-cash-display">Rp 0</div>
        </div>

        <div class="numpad order-pay-numpad" id="opmNumpad">
            <button type="button" class="num-btn" data-val="1">1</button>
            <button type="button" class="num-btn" data-val="2">2</button>
            <button type="button" class="num-btn" data-val="3">3</button>
            <button type="button" class="num-btn" data-val="4">4</button>
            <button type="button" class="num-btn" data-val="5">5</button>
            <button type="button" class="num-btn" data-val="6">6</button>
            <button type="button" class="num-btn" data-val="7">7</button>
            <button type="button" class="num-btn" data-val="8">8</button>
            <button type="button" class="num-btn" data-val="9">9</button>
            <button type="button" class="num-btn num-clear" data-val="C">C</button>
            <button type="button" class="num-btn" data-val="0">0</button>
            <button type="button" class="num-btn num-back" data-val="⌫">⌫</button>
        </div>

        <div class="order-pay-change-row">
          <span class="order-pay-change-label">Kembalian</span>
          <span id="opmChange" class="order-pay-change-val">Rp 0</span>
        </div>

        <div class="order-pay-actions">
          <button type="button" id="opmCancel" class="order-pay-btn-cancel">Batal</button>
          <button type="button" id="opmConfirm" class="order-pay-btn-confirm">✓ Konfirmasi Selesai</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    // Event penutupan modal (toggle class, bukan inline style presentation)
    document.getElementById('opmCancel').onclick = () => { el.classList.remove('is-open'); };
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('is-open'); });

    // Event klik Numpad untuk logic input
    document.getElementById('opmNumpad').addEventListener('click', (e) => {
        const btn = e.target.closest('.num-btn');
        if (!btn) return;

        const val = btn.dataset.val;
        if (val === 'C') {
            opmCashRaw = '';
        } else if (val === '⌫') {
            opmCashRaw = opmCashRaw.slice(0, -1);
        } else if (opmCashRaw.length < 12) {
            // Cegah angka nol ganda di awal
            if (opmCashRaw === '0' && val === '0') return;
            if (opmCashRaw === '0' && val !== '0') opmCashRaw = val;
            else opmCashRaw += val;
        }

        // Tampilkan format Rupiahnya langsung
        document.getElementById('opmCashDisplay').textContent = opmCashRaw ? formatRupiahO(opmCashRaw) : 'Rp 0';
        recalcOpmChange();
    });
};

// Kalkulasi kembalian
const recalcOpmChange = () => {
    const cash   = Number(opmCashRaw) || 0;
    const change = cash - _opmOrderTotal;
    const el     = document.getElementById('opmChange');
    
    el.textContent  = formatRupiahO(Math.max(0, change));
    
    // Ubah warna teks jika minus (uang kurang)
    el.classList.toggle('is-negative', change < 0);
    document.getElementById('opmConfirm').disabled = change < 0;
    document.getElementById('opmConfirm').classList.toggle('is-disabled', change < 0);
};

const openOrderPayModal = (order) => {
    injectOrderPayModal();
    _opmOrderTotal  = order.total;
    _opmCurrentOid  = order.id;

    // Reset isi form saat dibuka
    opmCashRaw = '';
    document.getElementById('opmOrderId').textContent = order.id + ' · ' + formatOrderDate(order.date);
    document.getElementById('opmTotal').textContent   = formatRupiahO(order.total);
    document.getElementById('opmCashDisplay').textContent = 'Rp 0';
    document.getElementById('opmChange').textContent  = 'Rp 0';
    document.getElementById('opmChange').classList.remove('is-negative');
    document.getElementById('opmConfirm').disabled    = false;
    document.getElementById('opmConfirm').classList.remove('is-disabled');

    document.getElementById('opmItems').innerHTML =
        (order.items || []).map(it =>
            `${it.name} ×${it.qty} = ${formatRupiahO(it.price * it.qty)}`
        ).join('<br>');

    document.getElementById('orderPayModal').classList.add('is-open');

    // Konfirmasi selesai
    document.getElementById('opmConfirm').onclick = () => {
        const cash   = Number(opmCashRaw) || 0;
        const change = cash - _opmOrderTotal;
        if (cash < _opmOrderTotal) {
            document.getElementById('opmChange').textContent = '⚠ Uang kurang!';
            document.getElementById('opmChange').classList.add('is-negative');
            return;
        }

        // 1. Kurangi stok produk
        const orders = getOrders();
        const idx    = orders.findIndex(o => o.id === _opmCurrentOid);
        if (idx !== -1) {
            orders[idx].status   = 'done';
            orders[idx].paidCash = cash;
            orders[idx].change   = change;
            orders[idx].paidAt   = new Date().toISOString();

            // Kurangi stok
            (orders[idx].items || []).forEach(it => {
                const prod = products.find(p => p.id == it.id);
                if (prod) {
                    prod.stock = Math.max(0, (Number(prod.stock) || 0) - (Number(it.qty) || 0));
                }
            });
            saveProductsToStorage();

            // Catat ke transaksi penjualan
            const trxItems = (orders[idx].items || []).map(it => ({
                name: it.name, qty: it.qty, price: it.price
            }));
            const subTotal = trxItems.reduce((s,it) => s + it.price*it.qty, 0);
            const trx = {
                id:            Date.now(),
                date:          new Date().toISOString(),
                items:         trxItems,
                subTotal,
                discount:      0,
                total:         _opmOrderTotal,
                cash,
                change,
                paymentMethod: 'cash',
                fromOrder:     _opmCurrentOid,
                buyerName:     orders[idx].buyerName || ''
            };
            transactions.push(trx);
            saveTransactionsToStorage();

            saveOrders(orders);
        }

        document.getElementById('orderPayModal').classList.remove('is-open');

        // Tampilkan struk
        showSuccessModal({
            total: _opmOrderTotal,
            cash,
            change,
            items: (orders[idx] || {}).items || [],
            buyerName: (orders[idx] || {}).buyerName || ''
        });
        const modal = document.getElementById('successModal');
        if (modal) modal.classList.add('active');

        // Re-render panel pesanan
        const activeTab = document.querySelector('.o-tab.active');
        const filter    = activeTab ? activeTab.dataset.ofilter : 'all';
        const wrap      = document.getElementById('ordersListWrap');
        if (wrap) { wrap.innerHTML = renderOrderCards(filter, getOrders()); bindOrderActions(); }

        updateRestockNotif();
        renderApp();
    };
};

// ============================================================
// D. RENDER PANEL PESANAN (di halaman penjual)
// ============================================================

const renderOrdersPanel = () => {
    const mainPanel  = document.getElementById('mainPanelContent');
    const rightPanel = document.getElementById('rightPanel');
    const cashPanel  = document.getElementById('cashSection');
    closeSidebarSafe();
    const btnCashEl = document.getElementById('btnCash');
    if (btnCashEl) btnCashEl.classList.remove('active');

    const orders = getOrders();
    const tabs = [
        { key: 'all',        label: 'Semua'     },
        { key: 'pending',    label: 'Menunggu'  },
        { key: 'processing', label: 'Diproses'  },
        { key: 'ready',      label: 'Siap'      },
        { key: 'done',       label: 'Selesai'   },
    ];

    mainPanel.innerHTML = `
        <div class="orders-header">
            <div>
                <h2>Pesanan Pembeli</h2>
                <p class="history-subtitle">Kelola pesanan yang masuk dari halaman pembeli</p>
            </div>
            <a href="customer.html" target="_blank" class="btn-open-customer">
                <span class="material-symbols-outlined">open_in_new</span>
                Buka Halaman Pembeli
            </a>
        </div>
        <div class="product-divider"></div>
        <div class="orders-filter-tabs" id="ordersFilterTabs">
            ${tabs.map(t => {
                const cnt = t.key === 'all' ? orders.length : orders.filter(o => o.status === t.key).length;
                return `<button class="o-tab ${t.key === 'all' ? 'active' : ''}" data-ofilter="${t.key}">
                    ${t.label}${cnt > 0 ? `<span class="o-tab-cnt">${cnt}</span>` : ''}
                </button>`;
            }).join('')}
        </div>
        <div class="orders-list" id="ordersListWrap">
            ${renderOrderCards('all', orders)}
        </div>
    `;

    document.querySelectorAll('.o-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.o-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const wrap = document.getElementById('ordersListWrap');
            if (wrap) { wrap.innerHTML = renderOrderCards(btn.dataset.ofilter, getOrders()); bindOrderActions(); }
        });
    });

    bindOrderActions();
};

const renderOrderCards = (filter, orders) => {
    let list = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (list.length === 0) {
        return `<div class="orders-empty">
            <span class="material-symbols-outlined">receipt_long</span>
            <p>Tidak ada pesanan ${filter === 'all' ? '' : 'dengan status ini'}.</p>
        </div>`;
    }

    return list.map(o => {
        const cfg     = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG.pending;
        const curStep = ORDER_STEP_KEYS.indexOf(o.status);

        const stepperHTML = o.status === 'cancelled'
            ? `<div class="order-cancelled-msg"><span class="material-symbols-outlined icon-sm">cancel</span>Pesanan dibatalkan</div>`
            : `<div class="order-stepper">
                ${ORDER_STEP_LABELS.map((lbl, i) => {
                    const cls = i < curStep ? 'done' : i === curStep ? 'active' : '';
                    return `<div class="o-step ${cls}">
                        <div class="o-dot"><span class="material-symbols-outlined">${ORDER_STEP_ICONS[i]}</span></div>
                        <div class="o-step-lbl">${lbl}</div>
                    </div>`;
                }).join('')}
               </div>`;

        const itemsHTML = (o.items || []).map(it =>
            `<div class="o-item-row">
                <img src="${it.img || 'Food.png'}" class="o-item-img" alt="${it.name}" onerror="this.src='Food.png'">
                <div class="o-item-info">
                    <span class="o-item-name">${it.name}</span>
                    <span class="o-item-sub">${it.qty} ${it.unit||'Pcs'} × ${formatRupiahO(it.price)}</span>
                </div>
                <span class="o-item-total">${formatRupiahO(it.price * it.qty)}</span>
            </div>`
        ).join('');

        // Tombol aksi: "Selesaikan" dari ready → buka modal kas
        const actionBtn = cfg.next
            ? `<button class="btn-order-action" data-oid="${o.id}" data-next="${cfg.next}">${cfg.nextLabel}</button>`
            : (o.status === 'ready'
                ? `<button class="btn-order-finish" data-oid="${o.id}">Selesaikan</button>`
                : '');

        const cancelBtn = (o.status === 'pending' || o.status === 'processing')
            ? `<button class="btn-order-cancel" data-oid="${o.id}">Batalkan</button>`
            : '';

        // Tombol hapus hanya jika cancelled
        const deleteBtn = o.status === 'cancelled'
            ? `<button class="btn-order-delete" data-oid="${o.id}" title="Hapus pesanan ini">
                <span class="material-symbols-outlined icon-md">delete</span> Hapus
               </button>`
            : '';

        // Tombol arsip: untuk pesanan selesai atau dibatalkan
        const archiveBtn = (o.status === 'done' || o.status === 'cancelled')
            ? `<button class="btn-order-archive" data-oid="${o.id}" title="Arsipkan pesanan">
                <span class="material-symbols-outlined icon-md">archive</span> Arsip
               </button>`
            : '';

        const buyerInfo = o.buyerName
            ? `<span class="o-buyer-name"><span class="material-symbols-outlined icon-person">person</span> ${escapeHtmlO(o.buyerName)}</span>`
            : '';

        return `<div class="order-seller-card" id="ocard-${o.id}">
            <div class="order-seller-head">
                <div>
                    <span class="o-id">${o.id}</span>
                    <span class="o-date">${formatOrderDate(o.date)}</span>
                    ${buyerInfo}
                </div>
                <span class="o-status-badge" style="--status-color:${cfg.color}">
                    <span class="material-symbols-outlined icon-xs">${cfg.icon}</span>
                    ${cfg.label}
                </span>
            </div>
            ${stepperHTML}
            <div class="o-items">${itemsHTML}</div>
            ${o.note ? `<div class="o-note">📝 Catatan: ${escapeHtmlO(o.note)}</div>` : ''}
            <div class="o-footer">
                <div class="o-total">
                    <span>Total</span>
                    <strong>${formatRupiahO(o.total)}</strong>
                </div>
                <div class="o-actions">
                    ${deleteBtn}
                    ${cancelBtn}
                    ${archiveBtn}
                    ${actionBtn}
                </div>
            </div>
        </div>`;
    }).join('');
};

const bindOrderActions = () => {
    // Advance status (pending→processing, processing→ready)
    document.querySelectorAll('.btn-order-action').forEach(btn => {
        btn.addEventListener('click', async () => {
            const oid  = btn.dataset.oid;
            const next = btn.dataset.next;

            // Jika next === 'done', buka modal pembayaran
            if (next === 'done') {
                const orders = getOrders();
                const order  = orders.find(o => o.id === oid);
                if (order) openOrderPayModal(order);
                return;
            }

            const cfg = ORDER_STATUS_CONFIG[next];
            const confirmed = await showConfirm(
                `Ubah status pesanan ini menjadi "${cfg.label}"?`,
                { title: 'Konfirmasi', okText: 'Ya', cancelText: 'Batal' }
            );
            if (!confirmed) return;

            const orders = getOrders();
            const idx    = orders.findIndex(o => o.id === oid);
            if (idx === -1) return;
            orders[idx].status = next;
            saveOrders(orders);

            const activeTab = document.querySelector('.o-tab.active');
            const filter    = activeTab ? activeTab.dataset.ofilter : 'all';
            const wrap      = document.getElementById('ordersListWrap');
            if (wrap) { wrap.innerHTML = renderOrderCards(filter, getOrders()); bindOrderActions(); }
        });
    });

    // Selesaikan (dari status ready)
    document.querySelectorAll('.btn-order-finish').forEach(btn => {
        btn.addEventListener('click', () => {
            const oid    = btn.dataset.oid;
            const orders = getOrders();
            const order  = orders.find(o => o.id === oid);
            if (order) openOrderPayModal(order);
        });
    });

    // Batalkan
    document.querySelectorAll('.btn-order-cancel').forEach(btn => {
        btn.addEventListener('click', async () => {
            const oid = btn.dataset.oid;
            const confirmed = await showConfirm(
                'Batalkan pesanan ini?',
                { type: 'warning', title: 'Batalkan Pesanan', okText: 'Batalkan', cancelText: 'Tidak', danger: true }
            );
            if (!confirmed) return;

            const orders = getOrders();
            const idx = orders.findIndex(o => o.id === oid);
            if (idx === -1) return;
            orders[idx].status = 'cancelled';
            saveOrders(orders);

            const activeTab = document.querySelector('.o-tab.active');
            const filter = activeTab ? activeTab.dataset.ofilter : 'all';
            const wrap = document.getElementById('ordersListWrap');
            if (wrap) { wrap.innerHTML = renderOrderCards(filter, getOrders()); bindOrderActions(); }
        });
    });

    // Hapus pesanan (hanya yang cancelled)
    document.querySelectorAll('.btn-order-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const oid = btn.dataset.oid;
            const confirmed = await showConfirm(
                'Hapus pesanan ini permanen dari daftar?',
                { type: 'error', title: 'Hapus Pesanan', okText: 'Hapus', cancelText: 'Batal', danger: true }
            );
            if (!confirmed) return;

            let orders = getOrders();
            orders = orders.filter(o => o.id !== oid);
            saveOrders(orders);

            const activeTab = document.querySelector('.o-tab.active');
            const filter = activeTab ? activeTab.dataset.ofilter : 'all';
            const wrap = document.getElementById('ordersListWrap');
            if (wrap) { wrap.innerHTML = renderOrderCards(filter, getOrders()); bindOrderActions(); }
        });
    });
    // Arsipkan pesanan (done/cancelled)
    document.querySelectorAll('.btn-order-archive').forEach(btn => {
        btn.addEventListener('click', async () => {
            const oid = btn.dataset.oid;
            const confirmed = await showConfirm(
                'Arsipkan pesanan ini? Pesanan akan dipindah ke menu Arsip.',
                { title: 'Arsipkan Pesanan', okText: 'Arsipkan', cancelText: 'Batal' }
            );
            if (!confirmed) return;

            let orders  = getOrders();
            const order = orders.find(o => o.id === oid);
            if (!order) return;

            // Pindah ke arsip
            const archive = getArchive();
            archive.unshift({ ...order, archivedAt: new Date().toISOString() });
            saveArchive(archive);

            // Hapus dari daftar aktif
            orders = orders.filter(o => o.id !== oid);
            saveOrders(orders);

            // Update badge arsip
            updateArchiveBadge();

            const activeTab = document.querySelector('.o-tab.active');
            const filter = activeTab ? activeTab.dataset.ofilter : 'all';
            const wrap = document.getElementById('ordersListWrap');
            if (wrap) { wrap.innerHTML = renderOrderCards(filter, getOrders()); bindOrderActions(); }
        });
    });
};
// ============================================================
// E. HALAMAN ARSIP PESANAN
// ============================================================

const updateArchiveBadge = () => {
    const count = getArchive().length;
    const badge = document.getElementById('archiveNotifBadge');
    if (badge) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.classList.toggle('is-hidden', count <= 0);
    }
};

const renderArchivePanel = () => {
    const mainPanel  = document.getElementById('mainPanelContent');
    const rightPanel = document.getElementById('rightPanel');
    const cashPanel  = document.getElementById('cashSection');
    closeSidebarSafe();
    document.body.dataset.view = 'orders';

    const archive = getArchive();
    const cardsHTML = archive.length === 0
        ? `<div class="orders-empty">
               <span class="material-symbols-outlined">inventory_2</span>
               <p>Belum ada pesanan yang diarsip.</p>
           </div>`
        : archive.map(o => {
            const cfg = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG.done;
            const archivedDate = o.archivedAt
                ? new Date(o.archivedAt).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                : '-';
            const itemsHTML = (o.items || []).map(it =>
                `<div class="o-item-row">
                    <img src="${it.img||'Food.png'}" class="o-item-img" alt="${it.name}" onerror="this.src='Food.png'">
                    <div class="o-item-info">
                        <span class="o-item-name">${it.name}</span>
                        <span class="o-item-sub">${it.qty} ${it.unit||'Pcs'} × ${formatRupiahO(it.price)}</span>
                    </div>
                    <span class="o-item-total">${formatRupiahO(it.price * it.qty)}</span>
                </div>`
            ).join('');
            const buyerInfo = o.buyerName
                ? `<span class="o-buyer-name"><span class="material-symbols-outlined icon-person">person</span> ${escapeHtmlO(o.buyerName)}</span>`
                : '';
            return `<div class="order-seller-card" id="arc-${o.id}">
                <div class="order-seller-head">
                    <div>
                        <span class="o-id">${o.id}</span>
                        <span class="o-date">${formatOrderDate(o.date)}</span>
                        ${buyerInfo}
                        <span class="o-archived-label">📦 Diarsip: ${archivedDate}</span>
                    </div>
                    <span class="o-status-badge" style="--status-color:${cfg.color}">
                        <span class="material-symbols-outlined icon-xs">${cfg.icon}</span>
                        ${cfg.label}
                    </span>
                </div>
                <div class="o-items">${itemsHTML}</div>
                ${o.note ? `<div class="o-note">📝 ${escapeHtmlO(o.note)}</div>` : ''}
                <div class="o-footer">
                    <div class="o-total"><span>Total</span><strong>${formatRupiahO(o.total)}</strong></div>
                    <div class="o-actions">
                        <button class="btn-archive-delete" data-aid="${o.id}">
                            <span class="material-symbols-outlined icon-md">delete</span> Hapus Arsip
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

    mainPanel.innerHTML = `
        <div class="orders-header">
            <div>
                <h2>Arsip Pesanan</h2>
                <p class="history-subtitle">Pesanan yang telah diarsipkan (${archive.length} pesanan)</p>
            </div>
        </div>
        <div class="product-divider"></div>
        <div class="orders-list" id="archiveListWrap">${cardsHTML}</div>
    `;

    document.querySelectorAll('.btn-archive-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const aid = btn.dataset.aid;
            const confirmed = await showConfirm(
                'Hapus arsip ini permanen?',
                { type: 'error', title: 'Hapus Arsip', okText: 'Hapus', cancelText: 'Batal', danger: true }
            );
            if (!confirmed) return;
            saveArchive(getArchive().filter(o => o.id !== aid));
            updateArchiveBadge();
            renderArchivePanel();
        });
    });
};

// Daftarkan view ke router utama (tanpa meng-override window.renderApp)
if (typeof window.registerView === 'function') {
    window.registerView('orders', () => {
        document.body.dataset.view = 'orders';
            closeSidebarSafe();
        renderOrdersPanel();
        if (typeof setActiveMenu === 'function') setActiveMenu('menuPesanan');
        updateOrderNotif();
        if (typeof updateRestockNotif === 'function') updateRestockNotif();
    });
    window.registerView('archive', () => {
        document.body.dataset.view = 'orders';
            closeSidebarSafe();
        renderArchivePanel();
        if (typeof setActiveMenu === 'function') setActiveMenu('menuArsip');
        if (typeof updateRestockNotif === 'function') updateRestockNotif();
    });
} else {
    console.warn('[orders-patch] registerView tidak tersedia — pastikan script.js dimuat lebih dulu');
}

// ============================================================
// F. INISIALISASI
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Badge di tombol hamburger
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn && !document.getElementById('menuOrderBadge')) {
        const wrap = document.createElement('span');
        wrap.className = 'menu-btn-wrap';
        if (!menuBtn.parentElement || !menuBtn.parentElement.classList.contains('menu-btn-wrap')) {
            menuBtn.parentNode.insertBefore(wrap, menuBtn);
            wrap.appendChild(menuBtn);
        }
        const host = menuBtn.parentElement.classList.contains('menu-btn-wrap') ? menuBtn.parentElement : wrap;
        const menuBadge = document.createElement('span');
        menuBadge.id = 'menuOrderBadge';
        menuBadge.className = 'menu-order-badge';
        menuBadge.classList.add('is-hidden');
        host.appendChild(menuBadge);
    }

    // Tambah menu Pesanan di sidebar
    const menuLaporan = document.getElementById('menuLaporan');
    if (menuLaporan && !document.getElementById('menuPesanan')) {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" id="menuPesanan">
                <span class="material-symbols-outlined">receipt_long</span>
                Pesanan Masuk
                <span class="sidebar-order-badge is-hidden" id="orderNotifBadge">0</span>
            </a>`;
        menuLaporan.parentElement.insertAdjacentElement('afterend', li);
    }

    // Tambah menu Arsip di sidebar (setelah Pesanan Masuk)
    if (!document.getElementById('menuArsip')) {
        const menuPesananEl = document.getElementById('menuPesanan');
        if (menuPesananEl) {
            const liArsip = document.createElement('li');
            liArsip.innerHTML = `
                <a href="#" id="menuArsip">
                    <span class="material-symbols-outlined">inventory_2</span>
                    Arsip Pesanan
                    <span class="sidebar-order-badge archive-badge is-hidden" id="archiveNotifBadge">0</span>
                </a>`;
            menuPesananEl.parentElement.insertAdjacentElement('afterend', liArsip);
        }
    }

    const menuPesanan = document.getElementById('menuPesanan');
    if (menuPesanan) {
        menuPesanan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentView = 'orders';
            sessionStorage.setItem('warung_current_view', 'orders'); // simpan posisi
            
            // Panggil langsung status aktif menu
            if (typeof window.setActiveMenu === 'function') {
                window.setActiveMenu('menuPesanan');
            }
            
            closeSidebarSafe();
            window.renderApp();
        });
    }

    const menuArsip = document.getElementById('menuArsip');
    if (menuArsip) {
        menuArsip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentView = 'archive';
            sessionStorage.setItem('warung_current_view', 'archive');
            if (typeof window.setActiveMenu === 'function') window.setActiveMenu('menuArsip');
            closeSidebarSafe();
            window.renderApp();
        });
    }

    updateOrderNotif();
    updateArchiveBadge();

    // Setelah data server selesai di-load, refresh badge lagi
    // (mencegah badge 0 karena update terlalu awal sebelum __syncReady)
    if (window.__syncReady && typeof window.__syncReady.then === 'function') {
        window.__syncReady.then(() => {
            updateOrderNotif();
            updateArchiveBadge();
        }).catch(() => {});
    }

    // Restore halaman pesanan/arsip jika refresh saat di sini
    const savedView = sessionStorage.getItem('warung_current_view');
    if (savedView === 'orders') {
        currentView = 'orders';
        window.renderApp();
        if (typeof window.setActiveMenu === 'function') window.setActiveMenu('menuPesanan');
    } else if (savedView === 'archive') {
        currentView = 'archive';
        window.renderApp();
        if (typeof window.setActiveMenu === 'function') window.setActiveMenu('menuArsip');
    }

});
