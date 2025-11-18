import React, { useState } from 'react';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { apiUrl } from '../lib/api';

interface RegisterFormProps {
  onSubmit?: (data: { firstName: string; lastName: string; email: string; password: string }) => void;
  onNavigateLogin?: () => void;
  onClose?: () => void;
  onNavigateMenu?: () => void;
  onAutoLogin?: (email: string, password: string) => Promise<void> | void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, onNavigateLogin, onClose, onNavigateMenu, onAutoLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [formData, setFormData] = useState<{ firstName: string; lastName: string; email: string; password: string }>({ firstName: '', lastName: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateError = (msg: string): string => {
    const m = msg || '';
    if (/Token has expired|is invalid/i.test(m)) {
      return 'Il codice è scaduto o non è valido. Premi "Reinvia" per ottenere un nuovo codice e riprova.';
    }
    if (/Password should be at least 6 characters/i.test(m)) {
      return 'La password deve contenere almeno 6 caratteri.';
    }
    if (/New password should be different/i.test(m)) {
      return 'La nuova password deve essere diversa da quella attuale.';
    }
    if (/rate limit|too many requests/i.test(m)) {
      return 'Troppi tentativi. Attendi qualche minuto prima di riprovare.';
    }
    // Default: mostra messaggio originale ma in contesto italiano
    return m;
  };
  const [emailExists, setEmailExists] = useState(false);

  // Di default mostra la card di registrazione; la card OTP appare solo dopo invio.

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setEmailExists(false);
    const form = e.currentTarget;
    const firstName = (form.elements.namedItem('firstName') as HTMLInputElement)?.value;
    const lastName = (form.elements.namedItem('lastName') as HTMLInputElement)?.value;
    const emailRaw = ((form.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
    const email = emailRaw.toLowerCase();
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;
    const payload = { firstName, lastName, email, password };

    // Validazione: la password deve avere almeno 6 caratteri
    if (!password || password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      return;
    }

    // Pre-check: verifica se email è già registrata nella tabella applicativa via backend
    try {
      const resp = await fetch(apiUrl(`auth/user?email=${encodeURIComponent(email)}`));
      if (resp.ok) {
        const json = await resp.json();
        if (json?.ok && json?.user) {
          // Email già associata ad un account: mostra messaggio e non procedere con OTP
          setEmailExists(true);
          return;
        }
      }
    } catch {}

    // Avvia flusso di OTP con Supabase: nessun fallback, richiediamo OTP obbligatorio
    if (!isSupabaseConfigured || !supabase) {
      setError('Verifica OTP non disponibile: configura Supabase (URL e ANON KEY)');
      return;
    }
    try {
      setSubmitting(true);
      // Invia OTP via email e crea utente se non esiste
      const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (otpError) {
        setError(otpError.message);
        setSubmitting(false);
        return;
      }
      // Mostra card di verifica codice e persisti stato
      setFormData(payload);
      setStep('verify');
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
      setSubmitting(false);
    }
  };

  const handleVerifyCode: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase non è configurato');
      return;
    }
    try {
      setSubmitting(true);
      const token = (code || '').trim();
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({ email: formData.email, token, type: 'email' });
      if (verifyError) {
        const msg = translateError(verifyError.message);
        // Se il token è scaduto/non valido, inviamo automaticamente un nuovo codice
        if (/scaduto|non è valido/i.test(msg)) {
          try {
            const { error: otpError } = await supabase.auth.signInWithOtp({ email: formData.email, options: { shouldCreateUser: true } });
            if (!otpError) {
              setError('Il codice precedente non è valido. Ti abbiamo inviato un nuovo codice via email. Inserisci il nuovo codice e riprova.');
            } else {
              setError(translateError(otpError.message));
            }
          } catch (e: any) {
            setError(e?.message ? translateError(e.message) : 'Errore nel reinvio del codice');
          }
        } else {
          setError(msg);
        }
        setSubmitting(false);
        return;
      }
      // Imposta la password dopo verifica OTP (utente autenticato)
      const { error: updateError } = await supabase.auth.updateUser({ password: formData.password });
      if (updateError) {
        const msg = updateError.message || '';
        // Se la password è già uguale, ignoriamo l'errore e proseguiamo (utente già configurato)
        if (/New password should be different/i.test(msg)) {
          // Non bloccare il flusso: la password è già impostata correttamente
        } else {
          setError(translateError(msg));
          setSubmitting(false);
          return;
        }
      }
      // Dopo verifica OTP riuscita, crea l’utente nella tabella applicativa tramite backend
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Fallback: chiama direttamente il backend se non fornito via props
        try {
          const resp = await fetch(apiUrl('auth/register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          const json = await resp.json();
          if (!json.ok) throw new Error(json.error || 'Operazione fallita');
          alert('Registrazione completata');
        } catch (e: any) {
          setError(e.message || 'Errore durante la creazione utente');
          setSubmitting(false);
          return;
        }
      }
      // Accesso automatico: autentica l’utente appena creato, senza chiudere l’overlay
      if (onAutoLogin) {
        try {
          await onAutoLogin(formData.email, formData.password);
        } catch (e: any) {
          setError(e?.message || 'Accesso automatico non riuscito');
          setSubmitting(false);
          return;
        }
      }
      // Mostra card finale di benvenuto con bottone Chiudi
      setStep('success');
      setSubmitting(false);
    } catch (err: any) {
      setError(translateError(err.message || 'Errore durante la verifica'));
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase non è configurato');
      return;
    }
    try {
      // Reinvia il codice OTP inviando nuovamente la richiesta OTP via email.
      // Un nuovo invio invalida automaticamente quello precedente.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: { shouldCreateUser: true },
      });
      if (otpError) setError(translateError(otpError.message));
      else alert('Nuovo codice inviato alla tua email. Usa l’ultimo codice.');
    } catch (err: any) {
      setError(translateError(err.message || 'Errore nel reinvio del codice'));
    }
  };

  return (
    <div className="login-ui">
      {step === 'form' ? (
        <div className="container" style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => { try { if (onClose) onClose(); else if (window.history.length > 1) window.history.back(); else window.location.href = '/'; } catch {} }}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <ChevronLeft size={16} color="#9ca3af" />
          </button>
          <div className="heading">Registrati</div>
          <form className="form" onSubmit={handleSubmit}>
            <input required className="input" type="text" name="firstName" id="firstName" placeholder="Nome" />
            <input required className="input" type="text" name="lastName" id="lastName" placeholder="Cognome" />
            <input required className="input" type="email" name="email" id="email" placeholder="E-mail" />
            <div className="password-field">
              <input
                required
                className="input password-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                placeholder="Password"
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!!error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            {emailExists && (
              <div className="text-sm" style={{ marginTop: 8, color: 'red' }}>
                Questa mail è gia associata ad un account, utilizzane una nuova oppure{' '}
                <a
                  href="/loginregister"
                  style={{ color: '#1d4ed8', textDecoration: 'underline' }}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigateLogin) onNavigateLogin();
                    else window.location.href = '/loginregister';
                  }}
                >
                  Accedi QUI
                </a>
              </div>
            )}
            <input className="login-button" type="submit" value={submitting ? 'Invio...' : 'Registrati'} disabled={submitting} />
          </form>
        </div>
      ) : step === 'verify' ? (
        <div className="container" style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label=""
            onClick={() => setStep('form')}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <ChevronLeft size={16} color="#9ca3af" />
            <span>Indietro</span>
          </button>
          <div className="heading">Codice di verifica</div>
          <form className="form" onSubmit={handleVerifyCode}>
            <div className="text-sm" style={{ color: '#333', marginTop: 8 }}>
              Ti abbiamo inviato un codice di verifica alla tua email, inseriscilo qui per procedere con la registrazione
            </div>
            <input
              required
              className="input"
              type="text"
              name="code"
              id="code"
              placeholder="Inserisci il codice"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {!!error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            <input className="login-button" type="submit" value={submitting ? 'Verifico...' : 'Verifica codice'} disabled={submitting} />
          </form>
          <div className="register-link" style={{ marginTop: 10 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); resendCode(); }}>Non hai ricevuto il codice? Reinvia</a>
          </div>
        </div>
      ) : (
        <div className="container">
          <div className="heading">Registrazione avvenuta con successo</div>
          <div className="text-sm" style={{ color: '#333', marginTop: 8 }}>
            Hai ottenuto correttamente il tuo sconto del 10%, vai al menu e crea il tuo primo ordine!!
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '1px solid #000000',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                if (onNavigateMenu) onNavigateMenu();
                else window.location.href = '/menu';
              }}
            >
              Vai al menu
            </button>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                border: '1px solid #000000',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                if (onClose) onClose();
                else window.location.href = '/';
              }}
            >
              Continua
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
