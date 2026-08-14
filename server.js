const http = require('http');
const path = require('path');
const fs   = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://smqybzogvcpjjldvutsq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PORT = process.env.PORT || 5500;

const ALLOWED_KEYS = new Set([
    'warung_products',
    'warung_transactions',
    'warung_settings',
    'warung_customer_orders',
]);

const MIME = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.json': 'application/json',
};

const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const sendJSON = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify(data));
};

const readBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
    const pathname = (req.url || '/').split('?')[0];
    const method   = req.method;

    if (method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    // GET /api/:key
    if (method === 'GET' && pathname.startsWith('/api/')) {
        const key = pathname.slice(5);
        if (!ALLOWED_KEYS.has(key)) return sendJSON(res, 400, { ok: false, error: 'Invalid key' });

        const { data, error } = await supabase
            .from(key)
            .select('data')
            .order('id', { ascending: true })
            .limit(1)
            .single();

        if (error) return sendJSON(res, 200, { ok: true, data: key === 'warung_settings' ? {} : [] });
        return sendJSON(res, 200, { ok: true, data: data.data });
    }

        // POST /api/:key
    if (method === 'POST' && pathname.startsWith('/api/')) {
        const key = pathname.slice(5);
        if (!ALLOWED_KEYS.has(key)) {
            return sendJSON(res, 400, { ok: false, error: 'Invalid key' });
        }

        try {
            const body = await readBody(req);
            const payload = (body && Object.prototype.hasOwnProperty.call(body, 'data'))
                ? body.data
                : body;

            // Ambil 1 row pertama (id GENERATED ALWAYS — jangan di-set manual)
            const { data: existing, error: fetchErr } = await supabase
                .from(key)
                .select('id, data, updated_at')
                .order('id', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (fetchErr) {
                console.error('[POST fetch]', key, fetchErr.message);
                return sendJSON(res, 500, { ok: false, error: fetchErr.message });
            }

            if (!existing || existing.id == null) {
                console.error('[POST] tabel kosong:', key);
                return sendJSON(res, 500, {
                    ok: false,
                    error: `Tabel ${key} belum punya row. Insert 1 baris manual di Supabase.`,
                });
            }

            const now = new Date().toISOString();
            const { data: updated, error: updateErr } = await supabase
                .from(key)
                .update({ data: payload, updated_at: now })
                .eq('id', existing.id)
                .select('id, data, updated_at')
                .maybeSingle();

            if (updateErr) {
                console.error('[POST update]', key, updateErr.message);
                return sendJSON(res, 500, { ok: false, error: updateErr.message });
            }

            return sendJSON(res, 200, {
                ok: true,
                data: (updated && updated.data !== undefined) ? updated.data : payload,
            });
        } catch (err) {
            console.error('[POST] unexpected', key, err);
            return sendJSON(res, 500, { ok: false, error: err.message || 'Server error' });
        }
    }

    // Static files
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain', ...corsHeaders });
            res.end('File tidak ditemukan: ' + pathname);
            return;
        }
        res.writeHead(200, { 'Content-Type': mimeType, ...corsHeaders });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 Server berjalan di port ${PORT}`);
    console.log(`   Penjual : http://localhost:${PORT}`);
    console.log(`   Pembeli : http://localhost:${PORT}/customer.html\n`);
});