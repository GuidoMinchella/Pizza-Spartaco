import React, { useState } from 'react';
import { apiUrl } from '../lib/api';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void | Promise<void>;
  onNavigateRegister?: () => void;
  onNavigateForgot?: () => void;
  successMessage?: string;
  errorMessage?: string;
  onClose?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onNavigateRegister, onNavigateForgot, successMessage, errorMessage, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const startGoogleLogin = () => {
    // Reindirizza al backend che avvia l'OAuth Google
    window.location.href = apiUrl('auth/google/start');
  };
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = ((form.elements.namedItem('email') as HTMLInputElement)?.value || '').trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value || '';
    if (onSubmit) {
      onSubmit(email, password);
    } else {
      console.log('Login attempt', { email, password });
    }
  };

  const handleNavigateRegister: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (onNavigateRegister) {
      e.preventDefault();
      onNavigateRegister();
    }
  };

  return (
    <div className="login-ui login-ui--login">
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
        <div className="heading">Accedi</div>
        {!!successMessage && (
          <div className="text-sm" style={{ color: '#16a34a', marginBottom: 8, fontWeight: 600 }}>
            {successMessage}
          </div>
        )}
        <form className="form" onSubmit={handleSubmit}>
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
          <span className="forgot-password">
            <a href="/passworddimenticata" onClick={(e) => { e.preventDefault(); if (onNavigateForgot) onNavigateForgot(); else window.location.href = '/passworddimenticata'; }}>
              Password dimenticata ?
            </a>
          </span>
          {!!errorMessage && (
            <div className="text-sm" style={{ color: '#dc2626', margin: '8px 10px', fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}
          <input className="login-button" type="submit" value="Accedi" />
        </form>
        <div className="social-account-container">
          <span className="title">O accedi con</span>
          <div className="social-accounts">
            <button className="social-button google" type="button" aria-label="Sign in with Google" onClick={startGoogleLogin}>
              <img src="/googlelogo.png" alt="Google" className="social-logo" />
            </button>
          </div>
        </div>
        <div className="register-link">
          <a href="/register" onClick={handleNavigateRegister}>Non hai ancora un account? Registrati QUI</a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
