import React from 'react';
import { apiUrl } from '../lib/api';
import RegisterForm from '../components/RegisterForm';

const RegisterPage: React.FC = () => {
  const registerUser = async (payload: { firstName: string; lastName: string; email: string; password: string }) => {
    try {
      const resp = await fetch(apiUrl('auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (json.ok) {
        alert('Registrazione completata');
        // Pagina standalone: non c’è overlay da chiudere
      } else {
        alert(`Errore registrazione: ${json.error || 'Operazione fallita'}`);
      }
    } catch (e: any) {
      alert(`Errore di rete: ${e.message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <RegisterForm onSubmit={registerUser} onClose={() => { window.location.href = '/' }} />
      </div>
    </div>
  );
};

export default RegisterPage;