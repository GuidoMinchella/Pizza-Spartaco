import React, { useState } from 'react'
import { apiUrl } from '../lib/api'
import LoginForm from '../components/LoginForm'

const LoginRegisterPage: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginUser = async (email: string, password: string) => {
    try {
      const resp = await fetch(apiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      if (json.ok) {
        setErrorMessage(null);
        // Su pagina standalone non c’è overlay; nessuna chiusura necessaria
      } else {
        setErrorMessage('Email o Password sbagliate');
      }
    } catch (e: any) {
      setErrorMessage('Errore di rete, riprova');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}
      aria-modal="true"
      role="dialog"
      onClick={() => { try { if (window.history.length > 1) window.history.back(); else window.location.href = '/'; } catch {} }}
    >
      <div className="w-full max-w-md mx-2 sm:mx-4" onClick={(e) => e.stopPropagation()}>
        <LoginForm onSubmit={loginUser} errorMessage={errorMessage || undefined} onClose={() => { try { if (window.history.length > 1) window.history.back(); else window.location.href = '/'; } catch {} }} />
      </div>
    </div>
  )
}

export default LoginRegisterPage
