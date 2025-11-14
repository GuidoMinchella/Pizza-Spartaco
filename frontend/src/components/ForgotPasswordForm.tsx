import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { apiUrl } from '../lib/api';

interface ForgotPasswordFormProps {
  onClose?: () => void;
  onResetCompleted?: (message: string) => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onClose, onResetCompleted }) => {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proceedEmailStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normEmail = (email || '').trim().toLowerCase();
    if (!normEmail) {
      setError('Inserisci una email valida');
      return;
    }

    // Verifica che l'email sia associata ad un account reale
    try {
      const resp = await fetch(apiUrl(`auth/user?email=${encodeURIComponent(normEmail)}`));
      const json = await resp.json();
      if (!json?.ok || !json?.user) {
        setError('Questa email non è associata ad alcun account');
        return;
      }
    } catch (e: any) {
      setError(e.message || 'Errore di rete durante la verifica email');
      return;
    }

    // Invia email di recupero con codice OTP
    if (!isSupabaseConfigured || !supabase) {
      setError('Recupero password non disponibile: configura Supabase');
      return;
    }
    try {
      setSubmitting(true);
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normEmail, {
        redirectTo: `${window.location.origin}/passworddimenticata`,
      });
      if (resetErr) {
        setError(resetErr.message);
        setSubmitting(false);
        return;
      }
      setStep('otp');
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Errore durante l’invio del codice');
      setSubmitting(false);
    }
  };

  const proceedVerifyStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase non è configurato');
      return;
    }
    const token = (code || '').trim();
    if (!token) {
      setError('Inserisci il codice OTP');
      return;
    }
    try {
      setSubmitting(true);
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' as any });
      if (verifyError) {
        setError(verifyError.message);
        setSubmitting(false);
        return;
      }
      setStep('reset');
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Errore durante la verifica del codice');
      setSubmitting(false);
    }
  };

  const proceedResetStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwd = newPassword;
    const confirm = confirmPassword;
    if (!pwd || pwd.length < 6) {
      setError('La nuova password deve avere almeno 6 caratteri');
      return;
    }
    if (pwd !== confirm) {
      setError('Le password non coincidono');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase non è configurato');
      return;
    }
    try {
      setSubmitting(true);
      // Aggiorna la password nell’Auth di Supabase (hash gestito automaticamente)
      const { error: updateErr } = await supabase.auth.updateUser({ password: pwd });
      if (updateErr) {
        setError(updateErr.message);
        setSubmitting(false);
        return;
      }
      // Aggiorna anche la password hash nella tabella applicativa via backend
      try {
        const resp = await fetch(apiUrl('auth/change_password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: pwd }),
        });
        const json = await resp.json();
        if (!json.ok) {
          // Continua comunque: la password su Supabase Auth è stata aggiornata.
          // Probabile backend non aggiornato o server da riavviare.
          console.warn('Aggiornamento DB applicativo non riuscito:', json.error);
        }
      } catch (e: any) {
        // Continua comunque: mostriamo la card di successo e il login.
        console.warn('Errore rete durante update DB applicativo:', e?.message || e);
      }

      // Tutto ok: torna alla card di accesso con messaggio di successo
      if (onResetCompleted) onResetCompleted('password cambiata con successo');
      setSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Errore durante l’aggiornamento della password');
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
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) setError(err.message);
      else alert('Nuovo codice inviato alla tua email. Usa l’ultimo codice ricevuto.');
    } catch (e: any) {
      setError(e.message || 'Errore nel reinvio del codice');
    }
  };

  return (
    <div className="login-ui">
      {step === 'email' ? (
        <div className="container">
          <div className="heading">Password dimenticata</div>
          <form className="form" onSubmit={proceedEmailStep}>
            <div className="text-sm" style={{ color: '#333', marginTop: 8 }}>
              Hai dimenticato la tua password? Inserisci l'email del tuo account
            </div>
            <input
              required
              className="input"
              type="email"
              name="email"
              id="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!!error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            <input className="login-button" type="submit" value={submitting ? 'Invio...' : 'Procedi'} disabled={submitting} />
          </form>
        </div>
      ) : step === 'otp' ? (
        <div className="container">
          <div className="heading">Inserisci codice OTP</div>
          <form className="form" onSubmit={proceedVerifyStep}>
            <div className="text-sm" style={{ color: '#333', marginTop: 8 }}>
              Abbiamo inviato un codice OTP alla tua email, inseriscilo qui sotto
            </div>
            <input
              required
              className="input"
              type="text"
              name="code"
              id="code"
              placeholder="Codice OTP"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {!!error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            <input className="login-button" type="submit" value={submitting ? 'Verifico...' : 'Procedi'} disabled={submitting} />
          </form>
          <div className="register-link" style={{ marginTop: 10 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); resendCode(); }}>Non hai ricevuto il codice? Reinvia</a>
          </div>
        </div>
      ) : (
        <div className="container">
          <div className="heading">Imposta nuova password</div>
          <form className="form" onSubmit={proceedResetStep}>
            <div className="password-field">
              <input
                required
                className="input password-input"
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                id="newPassword"
                placeholder="Inserisci nuova password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showNewPassword ? 'Nascondi password' : 'Mostra password'}
                onClick={() => setShowNewPassword((v) => !v)}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="password-field">
              <input
                required
                className="input password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Conferma nuova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                onClick={() => setShowConfirmPassword((v) => !v)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!!error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            <input className="login-button" type="submit" value={submitting ? 'Aggiorno...' : 'Procedi'} disabled={submitting} />
          </form>
        </div>
      )}
    </div>
  );
};

export default ForgotPasswordForm;