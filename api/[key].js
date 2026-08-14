import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ALLOWED_KEYS = [
  'warung_products',
  'warung_transactions',
  'warung_settings',
  'warung_customer_orders'
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { key } = req.query;

  if (!ALLOWED_KEYS.includes(key)) {
    return res.status(403).json({ error: 'Forbidden: Invalid endpoint key' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from(key).select('*').order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const payload = req.body;
      const now = new Date().toISOString();
      const dataToUpsert = Array.isArray(payload)
        ? payload.map(item => ({ ...item, updated_at: now }))
        : { ...payload, updated_at: now };
      const { data, error } = await supabase
        .from(key).upsert(dataToUpsert).select();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}