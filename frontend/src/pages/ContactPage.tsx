import React, { useEffect, useState, useRef } from 'react';

const ContactPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);
  // Animazioni: titolo Contatti (bottom-to-top) e riquadri pop-up (scale)
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const leftCardRef = useRef<HTMLDivElement | null>(null);
  const rightCardRef = useRef<HTMLDivElement | null>(null);
  const [titleShown, setTitleShown] = useState(false);
  const [leftShown, setLeftShown] = useState(false);
  const [rightShown, setRightShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || window.pageYOffset);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mostra elementi quando entrano in viewport (30%), con fallback
  useEffect(() => {
    const options = { threshold: 0.3 };
    if (typeof window === 'undefined' || typeof (window as any).IntersectionObserver === 'undefined') {
      setTitleShown(true);
      return;
    }
    const obsTitle = new IntersectionObserver((entries: any[]) => {
      entries.forEach((entry: any) => { if (entry.isIntersecting) setTitleShown(true); });
    }, options);
    if (titleRef.current) obsTitle.observe(titleRef.current);
    return () => {
      obsTitle.disconnect();
    };
  }, []);

  // Trigger dei pannelli solo quando il loro top entra nella fascia
  // a 30% dal bordo inferiore dello schermo (cioè al 70% dell'altezza da cima viewport)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewportHeight = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
    const triggerLine = viewportHeight * 0.7; // 30% dal fondo

    const check = (el: HTMLElement | null, setter: (v: boolean) => void) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Attiva quando l'elemento è visibile e il suo top è nella fascia inferiore (>= 70% viewport)
      if (rect.top >= triggerLine && rect.top <= viewportHeight) {
        setter(true);
      }
    };

    check(leftCardRef.current, setLeftShown);
    check(rightCardRef.current, setRightShown);
  }, [scrollY]);

  // Sfondo che scorre più lentamente della pagina
  const speed = 0.35;
  const translateY = -scrollY * speed;

  return (
    <div>
      {/* Hero: 50% dello schermo, sfondo parallax + overlay nero */}
      <section className="relative isolate h-[50vh] overflow-hidden">
        <div
          className="absolute left-0 right-0 z-0"
          style={{
            top: '-10vh',
            height: 'calc(100% + 20vh)',
            backgroundImage: "linear-gradient(rgba(0,0,0,0.50), rgba(0,0,0,0.50)), url('/sfondohero.jpg')",
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transform: `translate3d(0, ${translateY}px, 0) scale(1.3)`,
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        />
        <div className="relative z-10 h-[50vh] flex items-center justify-center">
          <h1
            ref={titleRef}
            className="text-5xl md:text-6xl font-bold text-white"
            style={{
              transform: titleShown ? 'translateY(0)' : 'translateY(28px)',
              opacity: titleShown ? 1 : 0,
              transition: 'transform 700ms ease, opacity 700ms ease',
              willChange: 'transform, opacity',
            }}
          >
            Contatti
          </h1>
        </div>
      </section>

      {/* Sezione con due pannelli */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Pannello sinistro: contenitore grigio con mappa */}
            <div className="space-y-6">
              <div
                ref={leftCardRef}
                className="bg-neutral-gray-100 p-6 md:p-8"
                style={{
                  transform: leftShown ? 'scale(1)' : 'scale(0.2)',
                  opacity: leftShown ? 1 : 0,
                  transition: 'transform 600ms ease-out, opacity 600ms ease-out',
                  transformOrigin: 'center',
                  willChange: 'transform, opacity',
                }}
              >
                <h1
                  className="text-4xl md:text-5xl font-bold text-neutral-black text-center mb-8"
                  style={{
                    transform: leftShown ? 'translateY(0)' : 'translateY(16px)',
                    opacity: leftShown ? 1 : 0,
                    transition: 'transform 600ms ease 120ms, opacity 600ms ease 120ms',
                    willChange: 'transform, opacity',
                  }}
                >
                  Puoi contattarci
                </h1>
                <div
                  className="space-y-4"
                  style={{
                    transform: leftShown ? 'translateY(0)' : 'translateY(16px)',
                    opacity: leftShown ? 1 : 0,
                    transition: 'transform 600ms ease 240ms, opacity 600ms ease 240ms',
                    willChange: 'transform, opacity',
                  }}
                >
                  <p className="text-xl leading-relaxed text-neutral-gray-800"><span className="font-semibold">Indirizzo</span>: Viale Spartaco, 73, 00174 Roma RM</p>
                  <p className="text-xl leading-relaxed text-neutral-gray-800"><span className="font-semibold">Telefono</span>: 380 904 5366</p>
                  <p className="text-xl leading-relaxed text-neutral-gray-800"><span className="font-semibold">Email</span>: ordini@pizzaspartaco.it</p>
                </div>
                <div
                  className="mt-6"
                  style={{
                    transform: leftShown ? 'translateY(0)' : 'translateY(16px)',
                    opacity: leftShown ? 1 : 0,
                    transition: 'transform 600ms ease 360ms, opacity 600ms ease 360ms',
                    willChange: 'transform, opacity',
                  }}
                >
                  <iframe title="Mappa Pizza Spartaco" src="https://www.google.com/maps?q=Viale+Spartaco,+73,+00174+Roma+RM&output=embed" width="100%" height="300" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
              </div>
            </div>

            {/* Pannello destro: orari */}
            <div className="md:-ml-16 z-10 md:mt-32 lg:mt-40">
              <div
                ref={rightCardRef}
                className="bg-black p-6 md:p-8 md:w-3/4 text-white overflow-hidden md:max-h-[420px]"
                style={{
                  transform: rightShown ? 'scale(1)' : 'scale(0.2)',
                  opacity: rightShown ? 1 : 0,
                  transition: 'transform 600ms ease-out, opacity 600ms ease-out',
                  transformOrigin: 'center',
                  willChange: 'transform, opacity',
                }}
              >
                <h2
                  className="text-3xl font-bold text-white/80 mb-6"
                  style={{
                    transform: rightShown ? 'translateY(0)' : 'translateY(16px)',
                    opacity: rightShown ? 1 : 0,
                    transition: 'transform 600ms ease 120ms, opacity 600ms ease 120ms',
                    willChange: 'transform, opacity',
                  }}
                >
                  Orari
                </h2>
                <ul
                  className="space-y-2 text-white/80"
                  style={{
                    transform: rightShown ? 'translateY(0)' : 'translateY(16px)',
                    opacity: rightShown ? 1 : 0,
                    transition: 'transform 600ms ease 240ms, opacity 600ms ease 240ms',
                    willChange: 'transform, opacity',
                  }}
                >
                  <li className="flex justify-between"><span>domenica</span><span>17–22</span></li>
                  <li className="flex justify-between"><span>lunedì</span><span>Chiuso</span></li>
                  <li className="flex justify-between"><span>martedì</span><span>11–15, 17–22</span></li>
                  <li className="flex justify-between"><span>mercoledì</span><span>11–15, 17–22</span></li>
                  <li className="flex justify-between"><span>giovedì</span><span>11–15, 17–22</span></li>
                  <li className="flex justify-between"><span>venerdì</span><span>11–15, 17–22</span></li>
                  <li className="flex justify-between"><span>sabato</span><span>17–22</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
