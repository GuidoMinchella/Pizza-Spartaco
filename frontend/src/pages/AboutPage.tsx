import React, { useEffect, useRef, useState } from 'react';

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const [scrollY, setScrollY] = useState(0);
  const [titleReveal, setTitleReveal] = useState(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const leftCardRef = useRef<HTMLDivElement | null>(null);
  const [leftCardReveal, setLeftCardReveal] = useState(false);
  const rightSectionRef = useRef<HTMLDivElement | null>(null);
  const [rightTitleReveal, setRightTitleReveal] = useState(false);
  const [rightParagraphReveal, setRightParagraphReveal] = useState(false);
  const [rightImageReveal, setRightImageReveal] = useState(false);
  const percheSectionRef = useRef<HTMLDivElement | null>(null);
  const [percheTitleReveal, setPercheTitleReveal] = useState(false);
  const [percheFirstParagraphReveal, setPercheFirstParagraphReveal] = useState(false);
  const [percheFirstImageReveal, setPercheFirstImageReveal] = useState(false);
  const [percheButtonReveal, setPercheButtonReveal] = useState(false);
  const [percheSecondTextReveal, setPercheSecondTextReveal] = useState(false);
  const [percheSecondImageReveal, setPercheSecondImageReveal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY || window.pageYOffset);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animazione "dal basso verso l'alto" per il titolo "La nostra storia"
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTitleReveal(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Card di Luca: avvia transizione quando la top raggiunge il 30% dell'altezza viewport
  useEffect(() => {
    const check = () => {
      const el = leftCardRef.current;
      if (!el || leftCardReveal) return;
      const top = el.getBoundingClientRect().top;
      const trigger = window.innerHeight * 0.3;
      if (top <= trigger) {
        setLeftCardReveal(true);
        window.removeEventListener('scroll', check as EventListener);
        window.removeEventListener('resize', check as EventListener);
      }
    };
    window.addEventListener('scroll', check as EventListener, { passive: true });
    window.addEventListener('resize', check as EventListener);
    // check immediato per gestire il caso in cui sia già visibile alla giusta posizione
    check();
    return () => {
      window.removeEventListener('scroll', check as EventListener);
      window.removeEventListener('resize', check as EventListener);
    };
  }, [leftCardReveal]);

  // Colonna destra: trigger al 30% viewport, attiva in sequenza (titolo -> paragrafo -> immagine)
  useEffect(() => {
    const check = () => {
      const el = rightSectionRef.current;
      if (!el || rightImageReveal) return; // usa il terzo come guard finale
      const top = el.getBoundingClientRect().top;
      const trigger = window.innerHeight * 0.3;
      if (top <= trigger) {
        setRightTitleReveal(true);
        setTimeout(() => setRightParagraphReveal(true), 150);
        setTimeout(() => setRightImageReveal(true), 300);
        window.removeEventListener('scroll', check as EventListener);
        window.removeEventListener('resize', check as EventListener);
      }
    };
    window.addEventListener('scroll', check as EventListener, { passive: true });
    window.addEventListener('resize', check as EventListener);
    check();
    return () => {
      window.removeEventListener('scroll', check as EventListener);
      window.removeEventListener('resize', check as EventListener);
    };
  }, [rightImageReveal]);

  // "Perche sceglierci" - trigger al 30% dal bordo inferiore, sequenza specifica
  useEffect(() => {
    const check = () => {
      const el = percheSectionRef.current;
      if (!el || percheSecondImageReveal) return;
      const top = el.getBoundingClientRect().top;
      const triggerFromBottom = window.innerHeight * 0.7; // 30% dal bordo inferiore
      if (top <= triggerFromBottom) {
        setPercheTitleReveal(true);
        setTimeout(() => setPercheFirstParagraphReveal(true), 150);
        setTimeout(() => setPercheFirstImageReveal(true), 300);
        setTimeout(() => setPercheButtonReveal(true), 450);
        setTimeout(() => setPercheSecondTextReveal(true), 600);
        setTimeout(() => setPercheSecondImageReveal(true), 750);
        window.removeEventListener('scroll', check as EventListener);
        window.removeEventListener('resize', check as EventListener);
      }
    };
    window.addEventListener('scroll', check as EventListener, { passive: true });
    window.addEventListener('resize', check as EventListener);
    check();
    return () => {
      window.removeEventListener('scroll', check as EventListener);
      window.removeEventListener('resize', check as EventListener);
    };
  }, [percheSecondImageReveal]);

  // Sfondo che scorre più lentamente della pagina
  const speed = 0.35;
  const translateY = -scrollY * speed;

  return (
    <div>
      {/* Hero isolata in un contenitore dedicato */}
      <section className="relative isolate min-h-[85vh] overflow-hidden">
        <div
          className="absolute left-0 right-0 z-0"
          style={{
            top: '-10vh',
            height: 'calc(100% + 20vh)',
            backgroundImage:
              (typeof window !== 'undefined' && window.innerWidth >= 768)
                ? "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('/sfondo1.webp')"
                : "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('/img.png')",
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transform: `translate3d(0, ${translateY}px, 0) scale(1.4)`,
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        />
    
        <div className="relative z-10 h-[85vh] flex items-center justify-center text-center">
          <h1
            ref={titleRef}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white will-change-transform will-change-opacity"
            style={{
              transform: titleReveal ? 'translateY(0)' : 'translateY(28px)',
              opacity: titleReveal ? 1 : 0,
              transition:
                'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
              backfaceVisibility: 'hidden',
            }}
          >
            La nostra <span className="text-primary-orange">storia</span>
          </h1>
        </div>
      </section>
    
      {/* Sezione nera sotto la Hero, sopra qualsiasi sfondo della Hero */}
      <section className="relative z-10 bg-black pt-16 pb-16">
        <div className="container-custom grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
          {/* Card sinistra con bordi laterali più ampi, altezza maggiore e larghezza ridotta */}
          <div
            ref={leftCardRef}
            className="rounded-xl bg-[#0E0E0E] p-6 md:p-8 text-white shadow-xl shadow-black/50 border border-white/10 w-full md:w-[420px] max-w-[420px] md:justify-self-start h-full"
          >
              <img
                src="/img1.jpg"
                alt="Pizzaiolo"
                className="w-full h-80 object-cover will-change-transform will-change-opacity"
                style={{
                  transform: leftCardReveal ? 'translateY(0)' : 'translateY(28px)',
                  opacity: leftCardReveal ? 1 : 0,
                  transition:
                    'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                  backfaceVisibility: 'hidden',
                }}
              />
              <div
                className="p-5 space-y-4 will-change-transform will-change-opacity"
                style={{
                  transform: leftCardReveal ? 'translateY(0)' : 'translateY(28px)',
                  opacity: leftCardReveal ? 1 : 0,
                  transition:
                    'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                  backfaceVisibility: 'hidden',
                }}
              >
                {/* Titolo con riga arancione verticale alta quanto il titolo e 'Luca' in arancione */}
                <div className="flex items-start gap-3">
                  <span className="self-stretch w-[3px] bg-primary-orange"></span>
                  <h3 className="text-white text-xl md:text-2xl font-semibold m-0">
                    <span className="text-primary-orange">Luca</span> — pizzaiolo e proprietario
                  </h3>
                </div>
                {/* Descrizione con riga grigia alta quanto la descrizione e keywords in grassetto */}
                <div className="flex items-start gap-3">
                  <span className="self-stretch w-[3px] bg-gray-400"></span>
                  <p className="text-white text-base md:text-lg leading-relaxed m-0">
                    <span className="font-semibold">Luca</span> è <span className="font-semibold">pizzaiolo certificato</span> e <span className="font-semibold">proprietario</span> di <span className="font-semibold">Pizza Spartaco</span>, l'amore e la passione per la <span className="font-semibold">pizza romana</span> si uniscono per portare nei vostri piatti le <span className="font-semibold">migliori pizze</span>
                  </p>
                </div>
              </div>
          </div>

          {/* Colonna destra con titolo e descrizione */}
          <div
            ref={rightSectionRef}
            className="text-white md:max-w-[720px] flex flex-col justify-center h-full"
          >
            <h2
              className="text-3xl md:text-4xl font-bold mb-6 will-change-transform will-change-opacity"
              style={{
                transform: rightTitleReveal ? 'translateY(0)' : 'translateY(28px)',
                opacity: rightTitleReveal ? 1 : 0,
                transition:
                  'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                backfaceVisibility: 'hidden',
              }}
            >
              Chi <span className="text-primary-orange">siamo</span>
            </h2>
            <div
              className="space-y-4 text-lg leading-relaxed will-change-transform will-change-opacity"
              style={{
                transform: rightParagraphReveal ? 'translateY(0)' : 'translateY(28px)',
                opacity: rightParagraphReveal ? 1 : 0,
                transition:
                  'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                backfaceVisibility: 'hidden',
              }}
            >
              <p>
                Siamo amanti della <span className="font-semibold">buona pizza</span> e della <span className="font-semibold">tradizione romana</span>. Ogni giorno uniamo <span className="font-semibold">passione</span>, <span className="font-semibold">ingredienti genuini</span> e <span className="font-semibold">lavorazioni artigianali</span> per offrire un’<span className="font-semibold">esperienza autentica</span>, fatta di <span className="font-semibold">sapori semplici</span> ma <span className="font-semibold">indimenticabili</span>.
              </p>
              <p>
                Crediamo nella <span className="font-semibold">qualità</span>, nella <span className="font-semibold">cura dei dettagli</span> e nel <span className="font-semibold">piacere di condividere</span> un momento di gusto con chi ami. Da noi trovi il <span className="font-semibold">vero spirito di Roma</span>: <span className="font-semibold">accogliente</span>, <span className="font-semibold">sincero</span> e <span className="font-semibold">pieno di sapore</span>.
              </p>
            </div>
            {/* Immagine sotto il paragrafo "Chi siamo" con sfumatura nera verticale */}
            <div
              className="mt-6 w-full overflow-hidden relative will-change-transform will-change-opacity"
              style={{
                transform: rightImageReveal ? 'scale(1) translateY(0)' : 'scale(0.98) translateY(28px)',
                opacity: rightImageReveal ? 1 : 0,
                transition:
                  'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                backfaceVisibility: 'hidden',
              }}
            >
              <img src="/galleria/img.webp" alt="Chi siamo" className="w-full h-64 md:h-80 object-cover" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/60 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>


       
      
       {/* Sezione: Perche sceglierci (pannello 70% width) */}
       <section className="relative z-10 bg-black py-16">
         <div
           ref={percheSectionRef}
           className="relative mx-auto w-full md:w-[70vw] md:border md:border-gray-700 bg-black text-white px-4 md:p-8"
         >
           <h2
             className="text-3xl md:text-4xl font-bold text-center mb-10 will-change-transform will-change-opacity"
             style={{
               transform: percheTitleReveal ? 'translateY(0)' : 'translateY(28px)',
               opacity: percheTitleReveal ? 1 : 0,
               transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
               backfaceVisibility: 'hidden',
             }}
           >
             Perche sceglierci
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-10">
              <div>
                <img
                  src="/img1.jpeg"
                  alt="Perche Sceglierci 1"
                  className="w-full h-48 md:h-60 object-cover will-change-transform will-change-opacity"
                  style={{
                    transform: percheFirstImageReveal ? 'translateY(0)' : 'translateY(28px)',
                    opacity: percheFirstImageReveal ? 1 : 0,
                    transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                    backfaceVisibility: 'hidden',
                  }}
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">Passione per la pizza</h3>
                <p
                  className="text-white/85 text-lg leading-relaxed will-change-transform will-change-opacity"
                  style={{
                    transform: percheFirstParagraphReveal ? 'translateY(0)' : 'translateY(28px)',
                    opacity: percheFirstParagraphReveal ? 1 : 0,
                    transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  Ogni pizza nasce da un amore autentico per l’arte bianca: impasti curati, ingredienti di qualità e tanta dedizione in ogni fase, dal forno alla tavola.
                </p>
              </div>
            </div>
            <div className="flex justify-center mb-10">
               <button
                 type="button"
                 onClick={() => onNavigate('menu')}
                 className="relative inline-flex items-center px-6 py-3 bg-black text-white rounded-tl-md rounded-br-md group will-change-transform will-change-opacity"
                 style={{
                   transform: percheButtonReveal ? 'translateY(0)' : 'translateY(28px)',
                   opacity: percheButtonReveal ? 1 : 0,
                   transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                   backfaceVisibility: 'hidden',
                 }}
               >
                 <span className="relative z-10">Scopri il menu</span>
                 <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="none">
                    {/* Angoli visibili a riposo: top-left e bottom-right */}
                    <path d="M 0 4 A 4 4 0 0 1 4 0" className="stroke-white fill-none" />
                    <path d="M 100 36 A 4 4 0 0 1 96 40" className="stroke-white fill-none" />
                    {/* Bordo completo animato su hover (si disegna in senso orario) */}
                    <path
                      d="M 4 0 H 100 V 36 A 4 4 0 0 1 96 40 H 0 V 4 A 4 4 0 0 1 4 0 Z"
                      pathLength="100"
                      className="stroke-white fill-none opacity-0 group-hover:opacity-100 transition-all duration-700 ease-linear [stroke-dasharray:100] [stroke-dashoffset:100] group-hover:[stroke-dashoffset:0]"
                    />
                  </svg>
               </button>
             </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <div className="md:order-2">
               <img
                 src="/img.jpeg"
                 alt="Perche Sceglierci 2"
                 className="w-full h-48 md:h-60 object-cover will-change-transform will-change-opacity"
                 style={{
                   transform: percheSecondImageReveal ? 'translateY(0)' : 'translateY(28px)',
                   opacity: percheSecondImageReveal ? 1 : 0,
                   transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                   backfaceVisibility: 'hidden',
                 }}
               />
             </div>
             <div
               className="md:order-1 will-change-transform will-change-opacity"
               style={{
                 transform: percheSecondTextReveal ? 'translateY(0)' : 'translateY(28px)',
                 opacity: percheSecondTextReveal ? 1 : 0,
                 transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease-out',
                 backfaceVisibility: 'hidden',
               }}
             >
               <h3 className="text-2xl font-semibold mb-2">Cura per i particolari</h3>
               <p className="text-white/85 text-lg leading-relaxed">Dall’impasto alla presentazione, nulla è lasciato al caso. Ogni dettaglio è pensato per offrire un’esperienza unica, fatta di equilibrio, gusto e attenzione artigianale.</p>
             </div>
           </div>
         </div>
       </section>

       {/* Sezione: Abbiamo due sedi */}
       <section className="section-padding bg-black">
       <div className="container-custom">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-10">Abbiamo due sedi</h2>
          <div className="relative">
            <div aria-hidden="true" className="hidden md:block pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[12px]"
              style={{
                 backgroundImage: "linear-gradient(45deg,#ffffff 25%,transparent 25%),linear-gradient(-45deg,#ffffff 25%,transparent 25%),linear-gradient(45deg,#000000 75%,transparent 75%),linear-gradient(-45deg,#000000 75%,transparent 75%)",
                 backgroundSize: "12px 12px",
                 backgroundPosition: "0 0, 0 6px, 6px -6px, 6px 0",
                 WebkitMaskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
                 maskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
                 opacity: 0.9
               }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-4 text-white">
                <h3 className="text-2xl font-bold text-center">Pizza Spartaco</h3>
                <p className="text-white/85"> Indirizzo: Viale Spartaco, 73, 00174 Roma RM</p>
                <p className="text-white/80">Nasce nel cuore della capitale, il nostro primo locale. Nel quartiere Appio Claudio portiamo in tavola la migliore espressione della pizza romana</p>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <iframe title="Mappa Pizza Spartaco" src="https://www.google.com/maps?q=Viale+Spartaco,+73,+00174+Roma+RM&output=embed" width="100%" height="300" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
              </div>
              {/* Separatore orizzontale visibile solo su mobile */}
              <div
                aria-hidden="true"
                className="block md:hidden h-[12px] w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,#ffffff 25%,transparent 25%),linear-gradient(-45deg,#ffffff 25%,transparent 25%),linear-gradient(45deg,#000000 75%,transparent 75%),linear-gradient(-45deg,#000000 75%,transparent 75%)",
                  backgroundSize: "12px 12px",
                  backgroundPosition: "0 0, 0 6px, 6px -6px, 6px 0",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                  maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                  opacity: 0.9
                }}
              />
              <div className="space-y-4 text-white">
                <h3 className="text-2xl font-bold text-center">Pinsa Spartaco</h3>
                <p className="text-white/85">Largo Andrea Berardi, 21, 00173 Roma Italia</p>
                <p className="text-white/80">Nasce nel quartiere Romanina il secondo locale, un posto dove abbiamo voluto riportare i sapori e la passione per la pizza romana. Offriamo anche qui servizio di delivery.</p>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <iframe title="Mappa Pinsa Spartaco" src="https://www.google.com/maps?q=Largo+Andrea+Berardi,+21,+00173+Roma+Italia&output=embed" width="100%" height="300" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

     </div>
   );
 };
 
 export default AboutPage;
