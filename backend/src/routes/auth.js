const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase, supabaseAdmin, isSupabaseConfigured } = require('../supabaseClient');

// Usa il client admin se disponibile per bypassare RLS nelle scritture
const db = supabaseAdmin || supabase;

// Helper: risposta errore coerente
function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

router.post('/auth/register', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const { firstName, lastName, email, password } = req.body || {};
    if (!firstName || !lastName || !email || !password) {
      return badRequest(res, 'Tutti i campi sono obbligatori');
    }

    // Normalizza email (trim + lowercase) per evitare problemi di confronto
    const normEmail = String(email).trim().toLowerCase();

    // Verifica se esiste già utente con stessa email
    const { data: existing, error: findErr } = await db
      .from('users')
      .select('id')
      .eq('email', normEmail)
      .limit(1);

    if (findErr) {
      return res.status(500).json({ ok: false, error: findErr.message });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ ok: false, error: 'Email già registrata' });
    }

    // Hash della password
    const password_hash = await bcrypt.hash(password, 10);

    // Inserimento nel DB (usa snake_case per le colonne)
    const { data, error } = await db
      .from('users')
      .insert({ first_name: firstName, last_name: lastName, email: normEmail, password_hash })
      .select('id, first_name, last_name, email, is_admin')
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, user: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return badRequest(res, 'Email e password sono obbligatorie');
    }

    // Normalizza email per confronto case-insensitive
    const normEmail = String(email).trim().toLowerCase();

    const { data: user, error: fetchErr } = await db
      .from('users')
      .select('id, first_name, last_name, email, password_hash, is_admin')
      .eq('email', normEmail)
      .single();

    if (fetchErr) {
      // Se non trovato, Supabase potrebbe restituire errore; gestiamo come credenziali invalide
      return res.status(401).json({ ok: false, error: 'Credenziali non valide' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Fallback: se l'hash nel DB è fuori sync, verifica contro Supabase Auth e sincronizza
      try {
        if (supabase) {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: normEmail,
            password: String(password),
          });
          if (!authErr && authData && authData.user) {
            // Password valida su Supabase: aggiorna hash nel DB applicativo e consenti login
            try {
              const newHash = await bcrypt.hash(String(password), 10);
              await db.from('users').update({ password_hash: newHash }).eq('id', user.id);
            } catch (syncErr) {
              // Ignora eventuali errori di sincronizzazione (RLS o altro)
            }
            const { id, first_name, last_name, email: userEmail, is_admin } = user;
            return res.json({ ok: true, user: { id, first_name, last_name, email: userEmail, is_admin } });
          }
        }
      } catch (e) {
        // Ignora errori del fallback e prosegui con risposta standard
      }
      return res.status(401).json({ ok: false, error: 'Credenziali non valide' });
    }

    // Per semplicità, ritorniamo i dati base dell’utente (senza token al momento)
    const { id, first_name, last_name, email: userEmail, is_admin } = user;
    return res.json({ ok: true, user: { id, first_name, last_name, email: userEmail, is_admin } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Cambia la password dell'utente nella tabella applicativa (public.users)
// POST /auth/change_password { email: string, newPassword: string }
router.post('/auth/change_password', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return badRequest(res, 'Email e nuova password sono obbligatorie');
    }

    const normEmail = String(email).trim().toLowerCase();

    const { data: user, error: fetchErr } = await db
      .from('users')
      .select('id')
      .eq('email', normEmail)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ ok: false, error: 'Utente non trovato' });
    }

    const password_hash = await bcrypt.hash(String(newPassword), 10);
    const { error: updErr } = await db
      .from('users')
      .update({ password_hash })
      .eq('id', user.id);

    if (updErr) {
      return res.status(500).json({ ok: false, error: updErr.message });
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Recupera dati utente dal DB (Supabase) in modo dinamico
// GET /auth/user?id=<uuid> oppure /auth/user?email=<email>
router.get('/auth/user', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const { id, email } = req.query || {};
    if (!id && !email) {
      return badRequest(res, 'Fornisci id o email');
    }

    let query = db.from('users').select('id, first_name, last_name, email, is_admin').limit(1);
    if (id) {
      query = query.eq('id', id);
    } else if (email) {
      const normEmail = String(email).trim().toLowerCase();
      query = query.eq('email', normEmail);
    }

    const { data, error } = await query.single();
    if (error) {
      return res.status(404).json({ ok: false, error: 'Utente non trovato' });
    }
    return res.json({ ok: true, user: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Avvio OAuth Google: reindirizza alla pagina di login Google gestita da Supabase
router.get('/auth/google/start', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const redirectTo = `${backendBase}/auth/google/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'email profile',
      },
    });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (data && data.url) {
      return res.redirect(data.url);
    }
    return res.status(500).json({ ok: false, error: 'URL di autorizzazione non disponibile' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Callback OAuth Google: scambia il codice per una sessione e sincronizza l'utente nel DB
router.get('/auth/google/callback', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !supabase || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const redirectTo = `${backendBase}/auth/google/callback`;

    const { code, error: oauthError } = req.query || {};
    if (oauthError) {
      return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent(String(oauthError))}`);
    }
    if (!code) {
      return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent('Codice OAuth mancante')}`);
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession({ code: String(code), redirectTo });
    if (error) {
      return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent(error.message)}`);
    }

    const supaUser = data && data.user ? data.user : null;
    const email = (supaUser && supaUser.email ? String(supaUser.email) : '').trim().toLowerCase();
    const meta = (supaUser && supaUser.user_metadata) ? supaUser.user_metadata : {};
    let firstName = meta.given_name || meta.name || meta.full_name || 'Utente';
    let lastName = meta.family_name || '';
    if (!lastName && typeof meta.name === 'string') {
      const parts = String(meta.name).trim().split(' ');
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    } else if (!lastName && typeof meta.full_name === 'string') {
      const parts = String(meta.full_name).trim().split(' ');
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    }

    if (!email) {
      return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent('Email non disponibile da Google')}`);
    }

    // Cerca utente per email
    const { data: existing, error: findErr } = await db
      .from('users')
      .select('id, email')
      .eq('email', email)
      .limit(1);

    if (findErr) {
      return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent(findErr.message)}`);
    }

    let userId = null;
    if (existing && existing.length > 0) {
      userId = existing[0].id;
    } else {
      // Crea utente con password placeholder (richiesta dal vincolo NOT NULL).
      // Usa insert con onConflict + ignoreDuplicates per evitare errori di race.
      const password_hash = await bcrypt.hash('oauth_google_placeholder', 10);
      const { data: createdRows, error: insertErr } = await db
        .from('users')
        .insert(
          { first_name: firstName || 'Utente', last_name: lastName || 'Google', email, password_hash },
          { onConflict: 'email', ignoreDuplicates: true }
        )
        .select('id');

      if (insertErr) {
        return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent(insertErr.message)}`);
      }

      if (createdRows && createdRows.length > 0) {
        userId = createdRows[0].id;
      } else {
        // Se l'inserimento è stato ignorato (duplicato), recupera l'id esistente
        const { data: refetch, error: refetchErr } = await db
          .from('users')
          .select('id')
          .eq('email', email)
          .limit(1);
        if (refetchErr || !refetch || refetch.length === 0) {
          const msg = refetchErr ? refetchErr.message : 'Impossibile recuperare utente dopo inserimento';
          return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent(msg)}`);
        }
        userId = refetch[0].id;
      }
    }

    // Reindirizza alla Home con query id per permettere al frontend di fare fetch profilo in modo robusto
    const target = `${frontendBase}/?googleLogin=1&id=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`;
    return res.redirect(target);
  } catch (e) {
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendBase}/?googleLogin=0&error=${encodeURIComponent(e.message)}`);
  }
});

// Fallback: completa login Google usando l'access_token nel fragment (#) della URL
// POST /auth/google/complete { access_token: string }
router.post('/auth/google/complete', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !supabase || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const { access_token } = req.body || {};
    if (!access_token) {
      return badRequest(res, 'access_token mancante');
    }

    // Recupera utente da Supabase partendo dal token
    const { data: userData, error: userErr } = await supabase.auth.getUser(String(access_token));
    if (userErr) {
      return res.status(400).json({ ok: false, error: `Token non valido: ${userErr.message}` });
    }

    const supaUser = userData?.user || null;
    const email = (supaUser && supaUser.email ? String(supaUser.email) : '').trim().toLowerCase();
    const meta = (supaUser && supaUser.user_metadata) ? supaUser.user_metadata : {};
    let firstName = meta.given_name || meta.name || meta.full_name || 'Utente';
    let lastName = meta.family_name || '';
    if (!lastName && typeof meta.name === 'string') {
      const parts = String(meta.name).trim().split(' ');
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    } else if (!lastName && typeof meta.full_name === 'string') {
      const parts = String(meta.full_name).trim().split(' ');
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    }

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email non disponibile' });
    }

    // Trova o crea l'utente nella tabella public.users
    const { data: existing, error: findErr } = await db
      .from('users')
      .select('id, email')
      .eq('email', email)
      .limit(1);
    if (findErr) {
      return res.status(500).json({ ok: false, error: findErr.message });
    }

    let userId = null;
    if (existing && existing.length > 0) {
      userId = existing[0].id;
    } else {
      const password_hash = await bcrypt.hash('oauth_google_placeholder', 10);
      const { data: createdRows, error: insertErr } = await db
        .from('users')
        .insert(
          { first_name: firstName || 'Utente', last_name: lastName || 'Google', email, password_hash },
          { onConflict: 'email', ignoreDuplicates: true }
        )
        .select('id');
      if (insertErr) {
        return res.status(500).json({ ok: false, error: insertErr.message });
      }
      if (createdRows && createdRows.length > 0) {
        userId = createdRows[0].id;
      } else {
        const { data: refetch, error: refetchErr } = await db
          .from('users')
          .select('id')
          .eq('email', email)
          .limit(1);
        if (refetchErr || !refetch || refetch.length === 0) {
          const msg = refetchErr ? refetchErr.message : 'Impossibile recuperare utente dopo inserimento';
          return res.status(500).json({ ok: false, error: msg });
        }
        userId = refetch[0].id;
      }
    }

    // Ritorna i dati base dell'utente al frontend
    const { data: userRow, error: rowErr } = await db
      .from('users')
      .select('id, first_name, last_name, email, is_admin')
      .eq('id', userId)
      .single();
    if (rowErr) {
      return res.status(500).json({ ok: false, error: rowErr.message });
    }
    return res.json({ ok: true, user: userRow });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;