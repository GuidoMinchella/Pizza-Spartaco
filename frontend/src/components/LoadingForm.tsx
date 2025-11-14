import React from 'react';
import './DotSpinner.css';

interface LoadingFormProps {
  title?: string;
  subtitle?: string;
}

const LoadingForm: React.FC<LoadingFormProps> = ({
  title = 'Conferma ordine in corso...',
  subtitle = 'Per favore attendi qualche istante',
}) => {
  const spinnerStyle: React.CSSProperties = {
    // Ingrandisce lo spinner
    ['--uib-size' as any]: '4.5rem',
    ['--uib-color' as any]: '#ff7300',
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-[92%] max-w-xl mx-4 rounded-2xl bg-white text-neutral-black border border-neutral-gray-200 shadow-soft p-8 md:p-10 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="dot-spinner" style={spinnerStyle} aria-label="Caricamento" role="status">
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
            <div className="dot-spinner__dot" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
        <p className="text-base md:text-lg text-neutral-gray-700">{subtitle}</p>
      </div>
    </div>
  );
};

export default LoadingForm;