const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin, isSupabaseConfigured } = require('../supabaseClient');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const cloudinary = require('../cloudinary');

// Helper per verificare se l'utente chiamante è admin (usa flag is_admin nel DB)
async function ensureAdmin(db, userId) {
  if (!userId) return { ok: false, error: 'user_id mancante' };
  const { data, error } = await db
    .from('users')
    .select('id, email, first_name, last_name, is_admin')
    .eq('id', String(userId))
    .single();
  if (error || !data) return { ok: false, error: 'Utente non trovato' };
  if (!data.is_admin) {
    return { ok: false, error: 'Non autorizzato' };
  }
  return { ok: true, user: data };
}

// GET /admin/overview?user_id=<uuid> - riepilogo completo: utenti, piatti, ordini con articoli
router.get('/admin/overview', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(200).json({ ok: true, users: [], dishes: [], orders: [], message: 'Supabase non configurato' });
    }
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(200).json({ ok: true, users: [], dishes: [], orders: [], message: 'Client Supabase non disponibile' });
    }

    const { user_id } = req.query || {};
    const check = await ensureAdmin(db, user_id);
    if (!check.ok) {
      return res.status(403).json({ ok: false, error: check.error });
    }

    // Utenti
    const { data: users, error: usersErr } = await db
      .from('users')
      .select('id, created_at, first_name, last_name, email')
      .order('created_at', { ascending: false });
    if (usersErr) return res.status(500).json({ ok: false, error: usersErr.message });

    // Piatti
    const { data: dishes, error: dishesErr } = await db
      .from('dishes')
      .select('id, name, description, category, price_pinsa, price_tonda, price_pala, image, allergens')
      .order('name', { ascending: true });
    if (dishesErr) return res.status(500).json({ ok: false, error: dishesErr.message });

    // Ordini
    const { data: orders, error: ordersErr } = await db
      .from('orders')
      .select(
        [
          'id',
          'created_at',
          'user_id',
          'user_first_name',
          'user_last_name',
          'user_email',
          'phone',
          'mode',
          'address',
          'cap',
          'staircase',
          'floor',
          'buzzer',
          'delivery_time',
          'pickup_name',
          'pickup_time',
          'notes_rider',
          'payment_method',
          'subtotal',
          'delivery_fee',
          'total',
          'discount',
          'total_paid',
        ].join(', ')
      )
      .order('created_at', { ascending: false });
    if (ordersErr) return res.status(500).json({ ok: false, error: ordersErr.message });

    let itemsByOrder = {};
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const { data: items, error: itemsErr } = await db
        .from('order_items')
        .select('order_id, product_id, product_name, size, quantity, extras, unit_price, total_price')
        .in('order_id', orderIds);
      if (itemsErr) return res.status(500).json({ ok: false, error: itemsErr.message });
      for (const it of items || []) {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push({
          product_id: it.product_id,
          product_name: it.product_name,
          size: it.size,
          quantity: it.quantity,
          extras: Array.isArray(it.extras) ? it.extras : [],
          unit_price: it.unit_price,
          total_price: it.total_price,
        });
      }
    }

    const ordersWithItems = (orders || []).map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }));

    return res.json({ ok: true, users: users || [], dishes: dishes || [], orders: ordersWithItems });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// CREA nuovo piatto: POST /admin/dishes?user_id=<uuid>
router.post('/admin/dishes', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ ok: false, error: 'Client Supabase non disponibile' });
    }

    const { user_id } = req.query || {};
    const check = await ensureAdmin(db, user_id);
    if (!check.ok) {
      return res.status(403).json({ ok: false, error: check.error });
    }

    const payload = req.body || {};
    const { name, description, category, price_pinsa, price_tonda, price_pala, image, allergens } = payload;
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Nome piatto obbligatorio' });
    }

    const numOrNull = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };

    const row = {
      name: String(name).trim(),
      description: description || null,
      category: category || null,
      price_pinsa: numOrNull(price_pinsa),
      price_tonda: numOrNull(price_tonda),
      price_pala: numOrNull(price_pala),
      image: image || null,
      allergens: Array.isArray(allergens) ? allergens.map((a) => String(a)) : [],
    };

    const { data: created, error } = await db
      .from('dishes')
      .insert(row)
      .select('id, name, description, category, price_pinsa, price_tonda, price_pala, image, allergens')
      .single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(201).json({ ok: true, dish: created });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// UPLOAD immagine piatto -> Cloudinary: POST /admin/dishes/upload-image?user_id=<uuid>
router.post('/admin/dishes/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ ok: false, error: 'Client Supabase non disponibile' });
    }

    const { user_id } = req.query || {};
    const check = await ensureAdmin(db, user_id);
    if (!check.ok) {
      return res.status(403).json({ ok: false, error: check.error });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ ok: false, error: 'Cloudinary non configurato (manca CLOUDINARY_* in .env)' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: 'Nessun file caricato' });
    }

    const folder = process.env.CLOUDINARY_FOLDER || 'pizzeria-spartaco/dishes';

    // Upload stream verso Cloudinary usando il buffer in memoria
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          return res.status(500).json({ ok: false, error: error.message });
        }
        return res.status(201).json({
          ok: true,
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    uploadStream.end(file.buffer);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// MODIFICA piatto: PATCH /admin/dishes/:id?user_id=<uuid>
router.patch('/admin/dishes/:id', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ ok: false, error: 'Client Supabase non disponibile' });
    }

    const { id } = req.params || {};
    const { user_id } = req.query || {};
    if (!id) return res.status(400).json({ ok: false, error: 'ID piatto mancante' });

    const check = await ensureAdmin(db, user_id);
    if (!check.ok) {
      return res.status(403).json({ ok: false, error: check.error });
    }

    const { name, description, category, price_pinsa, price_tonda, price_pala, image, allergens } = req.body || {};
    const numOrNull = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };

    const updateRow = {};
    if (name !== undefined) {
      if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ ok: false, error: 'Nome piatto non valido' });
      }
      updateRow.name = String(name).trim();
    }
    if (description !== undefined) updateRow.description = description || null;
    if (category !== undefined) updateRow.category = category || null;
    if (price_pinsa !== undefined) updateRow.price_pinsa = numOrNull(price_pinsa);
    if (price_tonda !== undefined) updateRow.price_tonda = numOrNull(price_tonda);
    if (price_pala !== undefined) updateRow.price_pala = numOrNull(price_pala);
    if (image !== undefined) updateRow.image = image || null;
    if (allergens !== undefined) updateRow.allergens = Array.isArray(allergens) ? allergens.map((a) => String(a)) : [];

    if (Object.keys(updateRow).length === 0) {
      return res.status(400).json({ ok: false, error: 'Nessun campo da aggiornare' });
    }

    const { data: updated, error } = await db
      .from('dishes')
      .update(updateRow)
      .eq('id', id)
      .select('id, name, description, category, price_pinsa, price_tonda, price_pala, image, allergens')
      .single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!updated) return res.status(404).json({ ok: false, error: 'Piatto non trovato' });
    return res.json({ ok: true, dish: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ELIMINA piatto: DELETE /admin/dishes/:id?user_id=<uuid>
router.delete('/admin/dishes/:id', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }
    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(500).json({ ok: false, error: 'Client Supabase non disponibile' });
    }

    const { id } = req.params || {};
    const { user_id } = req.query || {};
    if (!id) return res.status(400).json({ ok: false, error: 'ID piatto mancante' });

    const check = await ensureAdmin(db, user_id);
    if (!check.ok) {
      return res.status(403).json({ ok: false, error: check.error });
    }

    const { error } = await db.from('dishes').delete().eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;