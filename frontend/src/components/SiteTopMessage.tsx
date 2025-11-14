import React, { useEffect, useState } from 'react';

interface SiteTopMessageProps {
  onOpenRegister: () => void;
}

const SiteTopMessage: React.FC<SiteTopMessageProps> = ({ onOpenRegister }) => {
  const [visible, setVisible] = useState(false);
  const [enter, setEnter] = useState(false);
  const [closingPhase, setClosingPhase] = useState<'idle' | 'nudge' | 'exit'>('idle');
  const [topPx, setTopPx] = useState<number>(72); // fallback

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      if (header) {
        const rect = header.getBoundingClientRect();
        // Posiziona subito sotto la navbar (bordo inferiore dell'header)
        setTopPx(rect.bottom);
      }
    };
    // Misura all'avvio e su resize/scorrimento (il header è fixed)
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure);
    // Mostra il messaggio dopo 3 secondi dall'accesso alla pagina
    let enterTimer: number | undefined;
    const showTimer = window.setTimeout(() => {
      setVisible(true);
      // Piccolo delay per consentire la transizione da fuori schermo a posizione
      enterTimer = window.setTimeout(() => setEnter(true), 30);
    }, 3000);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      clearTimeout(showTimer);
      if (enterTimer) clearTimeout(enterTimer);
    };
  }, []);

  if (!visible) return null;

  const motionClass =
    closingPhase === 'idle'
      ? enter
        ? 'opacity-100 translate-x-0'
        : 'opacity-0 -translate-x-full'
      : closingPhase === 'nudge'
      ? 'opacity-100 translate-x-2'
      : 'opacity-0 -translate-x-full';

  const durationClass = closingPhase === 'exit' ? 'duration-800' : 'duration-500';

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setClosingPhase('nudge');
    // Rallenta il nudge e l'uscita
    setTimeout(() => setClosingPhase('exit'), 240);
    setTimeout(() => setVisible(false), 950);
  };

  return (
    <div
      className={`fixed z-[60] transition-transform transition-opacity ${durationClass} ease-out will-change-transform ${motionClass} left-3 right-3 sm:left-4 sm:right-auto`}
      style={{ top: topPx }}
      aria-live="polite"
    >
      {/* From Uiverse.io by seyed-mohsen-mousavi (adattato a React/Tailwind) */}
      <div className="flex flex-col gap-2 w-[92%] sm:w-80 mx-auto text-[10px] sm:text-xs">
        <div
          className="info-alert cursor-pointer flex items-center justify-between w-full min-h-[2.5rem] sm:min-h-[3rem] rounded-lg bg-black px-3 py-1 sm:py-1.5 overflow-hidden"
          role="button"
          onClick={() => {
            setVisible(false);
            onOpenRegister();
          }}
        >
          <div className="flex gap-2 sm:gap-3 items-center">
            <img
              src="/sconto.svg"
              alt="Sconto"
              className="h-[2.2rem] w-[2.2rem] sm:h-[2.6rem] sm:w-[2.6rem] object-contain transform origin-center scale-[2.50] sm:scale-[2.80]"
            />
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-semibold text-sm sm:text-base leading-tight whitespace-normal break-words">Registrati e ottieni uno Sconto del 10% su qualsiasi ordine</p>
              <p className="text-gray-400 text-[11px] sm:text-xs whitespace-normal break-words">Clicca per aprire la registrazione</p>
            </div>
          </div>
          <button
            className="text-gray-300 hover:bg-white/10 p-1 rounded-md transition-colors ease-linear"
            aria-label="Chiudi messaggio"
            onClick={(e) => handleClose(e)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteTopMessage;