import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiUrl } from '../lib/api';
import { Star, Clock, Flame, MapPin, ArrowRight, CheckCircle, Mail, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

type Dish = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price_pinsa: number | null;
  price_tonda: number | null;
  price_pala: number | null;
  image: string | null;
};

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [logoDropped, setLogoDropped] = useState(false);
  const [heroEntered, setHeroEntered] = useState(false);
  const [bannerEntered, setBannerEntered] = useState(false);
  const [sedeIndex, setSedeIndex] = useState(0);
  const sediPanels = [
    {
      title: 'Pizza Spartaco',
      description: 'La nostra sede storica: qualità e tradizione ogni giorno.',
    },
    {
      title: 'Pinsa Spartaco',
      description: 'La nuova apertura: stessa eccellenza, accoglienza moderna e servizi rapidi.',
    },
  ];

  const [displaySedeIndex, setDisplaySedeIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const [enteringIndex, setEnteringIndex] = useState<number | null>(null);
  const [exitingTranslate, setExitingTranslate] = useState(0);
  const [enteringTranslate, setEnteringTranslate] = useState(100);
  const [isAnimatingSede, setIsAnimatingSede] = useState(false);
  const [sidePhase, setSidePhase] = useState<'idle' | 'exit' | 'enter-from' | 'enter-to'>('idle');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Animazioni di ingresso per la sezione subito dopo la Hero
  const [passionReveal, setPassionReveal] = useState(false);
  const [certReveal, setCertReveal] = useState(false);
  const [imageReveal, setImageReveal] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const target = sectionRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Attiva le transizioni quando la sezione entra in viewport
            setPassionReveal(true);
            setTimeout(() => setCertReveal(true), 240);
            setTimeout(() => setImageReveal(true), 480);
            observer.disconnect();
            break;
          }
        }
      },
      { root: null, threshold: 0.25 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Animazione on-view per galleria 4 immagini
  const gallery4Ref = useRef<HTMLDivElement | null>(null);
  const [gallery4Reveal, setGallery4Reveal] = useState(false);
  useEffect(() => {
    const target = gallery4Ref.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setGallery4Reveal(true);
          observer.disconnect();
        }
      },
      // Attiva quando ~50% dell'elemento è visibile in viewport
      { root: null, threshold: 0.5 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Animazione on-view per sezione 6 immagini (pop da puntino) per singola immagine
  const grid6ItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [grid6ItemReveal, setGrid6ItemReveal] = useState<boolean[]>(new Array(6).fill(false));
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    grid6ItemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setGrid6ItemReveal((prev) => {
              if (prev[idx]) return prev;
              const next = [...prev];
              next[idx] = true;
              return next;
            });
            observer.disconnect();
          }
        },
        // Trigger quando ~30% dell'immagine è visibile in viewport
        { root: null, threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Animazione on-view per "Esplora il menu"
  const menuSectionRef = useRef<HTMLDivElement | null>(null);
  const [menuHeadingReveal, setMenuHeadingReveal] = useState(false);
  const [menuCarouselReveal, setMenuCarouselReveal] = useState(false);
  const [menuButtonReveal, setMenuButtonReveal] = useState(false);
  useEffect(() => {
    const target = menuSectionRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMenuHeadingReveal(true);
          setTimeout(() => setMenuCarouselReveal(true), 180);
          setTimeout(() => setMenuButtonReveal(true), 360);
          observer.disconnect();
        }
      },
      // Attiva quando ~50% della sezione è visibile in viewport
      { root: null, threshold: 0.5 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Animazione on-view per "Le nostre sedi"
  const sediSectionRef = useRef<HTMLDivElement | null>(null);
  const [sediTitleReveal, setSediTitleReveal] = useState(false);
  const [sediCard1Reveal, setSediCard1Reveal] = useState(false);
  const [sediCard2Reveal, setSediCard2Reveal] = useState(false);
  useEffect(() => {
    const target = sediSectionRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSediTitleReveal(true);
          setTimeout(() => setSediCard1Reveal(true), 180);
          setTimeout(() => setSediCard2Reveal(true), 360);
          observer.disconnect();
        }
      },
      { root: null, threshold: 0.5 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Dishes da Supabase per alimentare il carosello
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        setLoadingDishes(true);
        setLoadError(null);
        const res = await fetch(apiUrl('menu'));
        const json = await res.json();
        if (!res.ok || json?.error) {
          const msg = json?.error?.message || json?.error || 'Errore nel caricamento del menù';
          throw new Error(msg);
        }
        const items = Array.isArray(json?.items) ? json.items : [];
        setDishes(items);
      } catch (e: any) {
        setLoadError(e?.message || 'Errore sconosciuto');
      } finally {
        setLoadingDishes(false);
      }
    };
    fetchDishes();
  }, []);

  const adaptedProducts = useMemo(() => {
    const adapt = (d: Dish) => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      category: d.category as any,
      image: d.image || '/menu1.jpg',
      pricePerSlice: d.price_pinsa ?? 0,
      priceHalfTray: d.price_tonda ?? 0,
      priceFullTray: d.price_pala ?? 0,
      isVegetarian: false,
      isSpicy: false,
      allergens: [],
      extras: [],
    });
    return dishes.map(adapt);
  }, [dishes]);

  // Refs e stato per indicatore nero nel selettore sedi
  const selectorRef = useRef<HTMLDivElement>(null);
  const btnPizzaRef = useRef<HTMLButtonElement>(null);
  const btnPinsaRef = useRef<HTMLButtonElement>(null);
  const [indicatorDims, setIndicatorDims] = useState<{ left: number; width: number; height: number; top: number }>({ left: 0, width: 0, height: 0, top: 0 });
  useEffect(() => {
    const update = () => {
      const container = selectorRef.current;
      const btn = displaySedeIndex === 0 ? btnPizzaRef.current : btnPinsaRef.current;
      if (!container || !btn) return;
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setIndicatorDims({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
        height: btnRect.height,
        top: btnRect.top - containerRect.top,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [displaySedeIndex]);

  const switchSede = (target: number) => {
    if (target === displaySedeIndex) return;
    const direction = target > displaySedeIndex ? 'left' : 'right';
    setSedeIndex(target);
    setExitingIndex(displaySedeIndex);
    setEnteringIndex(target);
    setExitingTranslate(0);
    setEnteringTranslate(direction === 'left' ? 100 : -100);
    setIsAnimatingSede(true);
    setSidePhase('exit');
    requestAnimationFrame(() => {
      setExitingTranslate(direction === 'left' ? -100 : 100);
      setEnteringTranslate(0);
    });
    setTimeout(() => {
      setDisplaySedeIndex(target);
      setIsAnimatingSede(false);
      setExitingIndex(null);
      setEnteringIndex(null);
      setSidePhase('enter-from');
      requestAnimationFrame(() => setSidePhase('enter-to'));
      setTimeout(() => setSidePhase('idle'), 500);
    }, 500);
  };

  const topProducts = useMemo(() => {
    // Semplice selezione: primi 5 non-bevande
    const nonDrinks = adaptedProducts.filter((p) => p.category !== 'bevande');
    return nonDrinks.slice(0, 5);
  }, [adaptedProducts]);
  const desiredCount = 5;
  const carouselProducts = (() => {
    const base = topProducts.slice(0, desiredCount);
    if (base.length > 0 && base.length < desiredCount) {
      const last = base[base.length - 1];
      while (base.length < desiredCount) {
        base.push(last);
      }
    }
    return base;
  })();
  const [topCarouselIndex, setTopCarouselIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [cardWidth, setCardWidth] = useState(280);
  const GAP_PX = 24; // gap-6
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1024) setVisibleCount(3);
      else if (w >= 768) setVisibleCount(2);
      else setVisibleCount(1);

      // Larghezza card responsive: più piccola su mobile
      if (w < 768) setCardWidth(200);
      else if (w < 1024) setCardWidth(260);
      else setCardWidth(280);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const maxIndex = Math.max(0, carouselProducts.length - visibleCount);
  const offset = topCarouselIndex * (cardWidth + GAP_PX);
  const isDesktop = visibleCount >= 3;

  // Immagine hero: desktop vs mobile
  const heroBgUrl = isDesktop ? "/galleria/herohomepc.jpeg" : "/galleria/herohomemobile.jpeg";

  // Recensioni (20 card)
  const reviews = [
    { name: "Claudio M", date: "Ultima modifica: un anno fa", rating: 5, description: "Ci sono passato qualche giorno fa ad assaggiare e a prendere il volantino. Stasera ho fatto un ordine di consegna a domicilio. Per farla serve un ordine minimo…Altro" },
    { name: "Diego Dominici", date: "un anno fa", rating: 5, description: "Scoperta questa pizzeria per caso. La signora che ci ha servito è stata veramente gentile. Abbiamo preso un po' di tutto dal bancone. Impasto fragrante e…Altro" },
    { name: "Fosco", date: "2 anni fa", rating: 5, description: "Pizza perfetta leggerissima e molto digeribile personale gentilissimo ambiente carino e prezzi onesti .…Altro" },
    { name: "Luca P", date: "un anno fa", rating: 5, description: "Pizzeria che sforna una pinsa romana da urlo. Possibile anche prendere pizze tonde sempre alla roman, belle sottili. Materie prime di qualità e vasta scelta di…Altro" },
    { name: "Mauro Boccarossa", date: "9 mesi fa", rating: 5, description: "Complimenti pizzeria scoperta per caso con just eat pizza digeribile e scrocchiarella come piace a me..... pizza romana e bassa anche i supplì buonissimi super conditi e non col sugo secco e anemico complimenti…Altro" },
    { name: "anna rita paoletti", date: "2 anni fa", rating: 1, description: "Buonasera, ormai sono anni che siamo clienti fissi, abbiamo sempre apprezzato la qualità della vostra pinza, ma ieri ci avete davvero delusi…Altro" },
    { name: "Manuela Troiani", date: "2 anni fa", rating: 5, description: "Pinsa S P E T T A C O L A R E! Alveolatura bellissima. Friabile, leggera e ben condita.…Altro" },
    { name: "andrea mastrorilli", date: "3 anni fa", rating: 1, description: "Esperienza sgradevole, mai più! Dopo aver atteso inutilmente consegna a domicilio per un'ora mi sono dovuto recare al locale dove mi è stato riservato un…Altro" },
    { name: "Stefania Mercuri", date: "Ultima modifica: 2 mesi fa", rating: 5, description: "Ottima pinsa, personale gentile la migliore in zona, tornerò sicuramente a pranzo esperienza ottiima bravi…Altro" },
    { name: "Roberto Asoli", date: "4 anni fa", rating: 5, description: "Il suggerimento per chi vuole andare è vai... mangia, assapora i gusti, soddisfa il tuo palato e ..tornerai per riassaggiare quei sapori o farti attrarre da…Altro" },
    { name: "Giada Perugia", date: "2 anni fa", rating: 5, description: "Pinsa tonda romana veramente buonissima fina e digeribile, fritti qualcosa di assurdo abbiamo preso il gusto amatriciana e semplice buonissimi. Torneremo sicuramente a mangiare complimenti allo staff…Altro" },
    { name: "Gianni Anna", date: "6 anni fa", rating: 2, description: "E' la terza volta che è capitato,Sabato sera mi sono recato in negozio per acquistare delle pizze mi è stato risposto che non era possibile acquistarle il…Altro" },
    { name: "Luigi Mercuri", date: "un anno fa", rating: 5, description: "Abbiamo ordinato due tonde romane fina e croccante molto buona, fritti eccezionali. Super consigliato torneremo presto. Ragazzi gentili e professionali…Altro" },
    { name: "Simona Ciri", date: "5 anni fa", rating: 5, description: "La loro pinsa è davvero ottima, leggera e friabile, gli ingredienti sono tutti buoni e se dovesse avanzare anche il giorno dopo basta una scaldata e ritorna…Altro" },
    { name: "Vinx dam", date: "2 anni fa", rating: 3, description: "Premetto che la pizza è buona, e tutti i fritti, però non tollero quando si sbagliano gli ordini quando dovreste solo leggerle. Perchè poi una volta consegnate...saluti e baci.…Altro" },
    { name: "Antonio Pietrafusa", date: "8 anni fa", rating: 5, description: "Raramente si può apprezzare un ampia vastità di tipi di pizza associati ad un elevata qualità dei suoi componenti e lavorazione che la rendono leggera e…Altro" },
    { name: "luca di gio", date: "5 anni fa", rating: 5, description: "Impasto pinsa egregio... Leggerissima... Anche se ne prendi una dal gusto pesante non ti rimane sullo stomaco per niente... Prezzo nella media leggermente ma di po più alti però ne vale la pena mangi bene spendi bene... Top straconsigliato" },
    { name: "Valerio D'Amico", date: "4 anni fa", rating: 5, description: "Il mio delivery di zona preferito. Ottima pinza, sempre cordiali, e prezzi contenuti.…Altro" },
    { name: "zio tony", date: "7 anni fa", rating: 5, description: "Ho appena mangiato in questa pinseria. Ho preso un pezzo pomodorini e bufala, un pezzo mortadella e stracciatella e un supplì. Tutto davvero ottimo, specialmente il supplì che mi hanno detto essere fatto in casa." },
    { name: "Luciano Dusi", date: "10 mesi fa", rating: 5, description: "Tutto da paura! La tonda romana fantastica . I migliori in zona…Altro" },
  ];

  // Mostra solo recensioni con 3 o più stelle
  const reviewsFiltered = reviews.filter((r) => r.rating >= 3);

  const getSedeImage = (idx: number | null) => (idx === 0 ? '/img.webp' : '/img1.jpg');
  const getSedeAddress = (idx: number | null) => (idx === 0 ? 'Viale Spartaco, 73, 00174 Roma RM' : 'Largo Andrea Berardi, 21, 00173 Roma RM');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterSubmitted(true);
    setEmail('');
    setTimeout(() => setNewsletterSubmitted(false), 3000);
  };

  useEffect(() => {
    const t1 = setTimeout(() => setLogoDropped(true), 150);
    const t2 = setTimeout(() => setHeroEntered(true), 250);
    const t3 = setTimeout(() => setBannerEntered(true), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);


  return (
    <div>
      <section
          className="relative overflow-hidden h-[85vh] md:h-screen bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('${heroBgUrl}')`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className={`absolute left-0 md:left-[10%] bottom-[20%] z-20 p-6 sm:p-8 md:p-10 transition-all duration-700 ease-out ${heroEntered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`} style={{ fontFamily: 'Roboto Slab, serif' }}>
            <h1 className="text-left font-extrabold leading-tight tracking-tight text-4xl sm:text-5xl md:text-7xl">
              <span className="text-white">Pizza </span>
              <span className="text-white">Spartaco</span>
            </h1>
            <h2 className="mt-3 sm:mt-4 text-left text-lg sm:text-xl md:text-3xl font-bold text-white">
              La vera pizza <span className="text-white">Romana</span>
            </h2>
            <div className="mt-5 sm:mt-7 flex items-center gap-5 sm:gap-7">
              <button
                type="button"
                onClick={() => onNavigate('menu')}
                className="px-5 sm:px-7 md:px-9 py-2.5 sm:py-3.5 md:py-5 bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base font-extrabold rounded-lg shadow-2xl transition-colors"
              >
                Menu
              </button>
              <div className="flex items-center gap-3 text-white/90 text-sm sm:text-base">
                <span className="font-semibold text-white">Google</span>
                <div className="flex items-center gap-1" aria-label="Valutazione 4,4 su 5">
                  <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                  <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <span className="text-white">4,4/5</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-white/90 text-sm sm:text-base">Viale Spartaco, 73, 00174 Roma RM</p>
            </div>
          </div>
        </section>


        <div className="relative">
          <img
            src="/sconto.svg"
            alt="Sconto 10%"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-16 md:h-20 lg:h-24 w-auto pointer-events-none select-none z-30"
          />
          <section className="bg-white">
            <div className="w-full overflow-x-hidden py-2 md:py-3">
              <div className="marquee" aria-label="Promo 10%">
              <div className="marquee-group">
                   <span className="px-10 text-neutral-black font-extrabold uppercase leading-none tracking-wide text-2xl sm:text-3xl md:text-4xl">
                     Non perderti il 10% di sconto sul primo ordine, registrati e ricevi subito l'offerta.
                   </span>
                 </div>
              <div className="marquee-group" aria-hidden="true">
                   <span className="px-10 text-neutral-black font-extrabold uppercase leading-none tracking-wide text-2xl sm:text-3xl md:text-4xl">
                     Non perderti il 10% di sconto sul primo ordine, registrati e ricevi subito l'offerta.
                   </span>
                 </div>
              </div>
            </div>
          </section>
        </div>

      <section className="section-padding relative bg-black">
        <div ref={sectionRef} className="container-custom relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 md:gap-y-1 items-stretch">
            {/* Blocco 1: titolo + primo paragrafo */}
            <div className={`will-change-transform transform transition-all duration-700 ease-out ${passionReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
                La nostra <span className="text-primary-orange">passione</span>
              </h2>
              <div className="h-1 w-24 bg-primary-orange mb-6"></div>
              <p className="text-white/85 text-lg leading-relaxed mb-6 md:mb-0">
                Da Pizzeria Spartaco, la nostra storia nasce nel cuore del quartiere <span className="font-bold">Appio Claudio</span>, a <span className="font-bold">Roma</span>, dove tradizione e gusto si incontrano ogni giorno. La nostra passione è la <span className="font-bold">vera pizza romana</span>, quella autentica, <span className="font-bold">sottile e croccante</span>, preparata con <span className="font-bold">ingredienti selezionati</span> e con un impasto lavorato secondo i <span className="font-bold">metodi artigianali</span>.
              </p>
            </div>

            {/* Blocco 2: immagine (secondo in verticale, a destra su desktop) */}
            <div className={`relative md:row-span-2 will-change-transform transform transition-all duration-700 ease-out ${imageReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <img src="/img1.jpg" alt="Le nostre sedi" className="w-full h-64 sm:h-80 md:h-full object-cover rounded-2xl shadow-soft" />
            </div>

            {/* Blocco 3: certificazione + paragrafo + conclusione */}
            <div className={`will-change-transform transform transition-all duration-700 ease-out ${certReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Pizza Romana <span className="text-primary-orange">Certificata</span>
              </h3>
              <p className="text-white/85 text-lg leading-relaxed mb-3">
                Siamo <span className="font-bold">certificati Pizza Romana</span>, un <span className="font-bold">riconoscimento</span> che celebra il nostro impegno nel mantenere viva la <span className="font-bold">cultura gastronomica della Capitale</span>. Ogni pizza che sforniamo racconta la nostra <span className="font-bold">dedizione</span>, il rispetto per la <span className="font-bold">materia prima</span> e l’amore per un’<span className="font-bold">arte</span> che ci accompagna da generazioni.
              </p>
              <p className="text-white/90 text-lg leading-relaxed">
                Alla Pizzeria Spartaco non serviamo solo pizza: serviamo Roma, nel suo sapore più autentico.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Sezione galleria full-width con 4 immagini quadrate */}
      <section className="bg-neutral-black">
        <div ref={gallery4Ref} className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            { src: '/galleriahome/1.webp', title: 'Impasti artigianali', description: 'Lavorati a mano ogni giorno con cura e passione, i nostri impasti garantiscono leggerezza, fragranza e un gusto autentico.' },
            { src: '/galleria/ingredienti.jpeg', title: 'Ingredienti selezionati', description: 'Solo materie prime di alta qualità, scelte con attenzione per offrire sapori genuini e un’esperienza unica ad ogni morso.' },
            { src: '/galleriahome/3.webp', title: 'Cottura perfetta', description: 'Cotte al punto giusto per una crosta croccante e un cuore morbido, le nostre pizze raggiungono l’equilibrio ideale tra gusto e consistenza.' },
            { src: '/galleriahome/4.webp', title: 'Tradizione romana', description: 'Rispettiamo le ricette e le tecniche della vera scuola romana, portando in tavola tutto il sapore della nostra storia culinaria.' },
          ].map((item, i) => (
            <div
              key={i}
              className={`will-change-transform transform transition-all duration-700 ease-out ${gallery4Reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={gallery4Reveal ? { transitionDelay: `${i * 150}ms` } : undefined}
            >
              <div className="aspect-square w-full relative overflow-hidden">
                <img src={item.src} alt={item.title} className="w-full h-full object-cover" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-black/70 to-black"></div>
              </div>
              <div className="px-4 py-3">
                <h3 className="text-white font-bold text-lg">{item.title}</h3>
                <p className="text-white/80 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      

      <section className="section-padding bg-neutral-black">
        <div ref={menuSectionRef} className="container-custom">
          <div className={`text-center mb-12 transform transition-all duration-700 ease-out ${menuHeadingReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
               <span className="text-orange-500">Esplora </span> il menu
            </h2>
          </div>

          <div className={`relative px-4 md:px-8 lg:px-12 transform transition-all duration-700 ease-out ${menuCarouselReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={menuCarouselReveal ? { transitionDelay: '150ms' } : undefined}>
            <div className="overflow-x-auto lg:overflow-hidden">
              <div className="flex gap-4 md:gap-6 transition-transform duration-300 ease-out" style={isDesktop ? { transform: `translateX(-${offset}px)` } : undefined}>
                {carouselProducts.map((product, idx) => (
                  <div key={`${product.id}-${idx}`} className="flex-shrink-0" style={{ width: cardWidth }}>
                    <ProductCard
                      product={product}
                      sizeLabels={{ slice: 'Pinsa', half: 'Tonda', full: 'Pala' }}
                      sizeActiveColor="black"
                      compact
                      hideDescription
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Frecce di navigazione solo su desktop */}
            <button
              type="button"
              aria-label="Scorri a sinistra"
              onClick={() => setTopCarouselIndex((i) => Math.max(0, i - 1))}
              disabled={topCarouselIndex === 0}
              className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white text-neutral-black rounded-full shadow-soft p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Scorri a destra"
              onClick={() => setTopCarouselIndex((i) => Math.min(maxIndex, i + 1))}
              disabled={topCarouselIndex >= maxIndex}
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white text-neutral-black rounded-full shadow-soft p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {/* Fine carosello */}

          <div className={`mt-8 flex justify-center transform transition-all duration-700 ease-out ${menuButtonReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={menuButtonReveal ? { transitionDelay: '300ms' } : undefined}>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="inline-flex items-center gap-2 mx-auto px-6 py-3 rounded-lg bg-primary-orange text-white font-semibold shadow-soft transition-colors duration-300 hover:bg-orange-600"
            >
              <span className="relative z-10">Tutto il menu</span>
              <ArrowRight className="w-5 h-5 relative z-10" />
            </button>
          </div>
          </div>
        </section>

        {/* Sezione foto 2x3 — dopo "Esplora il menu" */}
        <section className="bg-neutral-black mt-24 md:mt-32 mb-12 md:mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              '/sezionefotohome/img1.jpeg',
              '/sezionefotohome/img3.webp',
              '/sezionefotohome/img2.jpeg',
              '/sezionefotohome/img3.jpg',
              '/sezionefotohome/img3.jpeg',
              '/sezionefotohome/img1.webp',
            ].map((src, i) => (
              <div key={i} className="w-full">
                <div
                  ref={(el) => (grid6ItemRefs.current[i] = el)}
                  className={`w-full overflow-hidden h-95 md:h-auto md:aspect-square will-change-transform transform origin-center transition-all duration-600 ease-out ${grid6ItemReveal[i] ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
                  style={grid6ItemReveal[i] ? { transitionDelay: `${i * 120}ms` } : undefined}
                >
                  <img src={src} alt={`Sezione foto home ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        </section>

        

      {/* Sezione: Le nostre sedi (nuova) */}
      <section className="section-padding bg-black">
        <div ref={sediSectionRef} className="container-custom">
          <div className={`text-center mb-16 md:mb-20 transform transition-all duration-700 ease-out ${sediTitleReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Le nostre <span className="text-orange-500">sedi</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className={`flex justify-center transform transition-all duration-700 ease-out ${sediCard1Reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="h-auto md:h-[640px] min-h-[520px] md:min-h-0" style={{ width: '100%', maxWidth: '560px', background: 'rgb(223, 225, 235)', borderRadius: '50px', boxShadow: 'rgba(0, 0, 0, 0.17) 0px -23px 25px 0px inset, rgba(0, 0, 0, 0.15) 0px -36px 30px 0px inset, rgba(0, 0, 0, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px' }}>
                <div className="h-full w-full p-6 md:p-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-neutral-black mb-2">Pizza Spartaco</h3>
                  <p className="text-neutral-black font-medium mb-2">Viale Spartaco, 73, 00174 Roma RM</p>
                  <p className="hidden md:block text-neutral-gray-700 leading-relaxed">Nasce nel cuore della capitale, il nostro primo locale. Nel quartiere Appio Claudio portiamo in tavola la migliore espressione della pizza romana.</p>
            <div className="mt-6 h-72 md:h-80">
                    <iframe
                      title="Mappa Pizza Spartaco"
                      src="https://www.google.com/maps?q=Viale+Spartaco,+73,+00174+Roma+RM&output=embed"
                      className="w-full h-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      style={{ border: 0 }}
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
            <div className={`flex justify-center transform transition-all duration-700 ease-out ${sediCard2Reveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="h-auto md:h-[640px] min-h-[520px] md:min-h-0" style={{ width: '100%', maxWidth: '560px', background: 'rgb(223, 225, 235)', borderRadius: '50px', boxShadow: 'rgba(0, 0, 0, 0.17) 0px -23px 25px 0px inset, rgba(0, 0, 0, 0.15) 0px -36px 30px 0px inset, rgba(0, 0, 0, 0.1) 0px -79px 40px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px' }}>
                <div className="h-full w-full p-6 md:p-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-neutral-black mb-2">Pinsa Spartaco</h3>
                  <p className="text-neutral-black font-medium mb-2">Largo Andrea Berardi, 21, 00173 Roma Italia</p>
                  <p className="hidden md:block text-neutral-gray-700 leading-relaxed">Nasce nel quartiere Romanina il secondo locale, un posto dove abbiamo voluto riportare i sapori e la passione per la pizza romana. Offriamo anche qui servizio di delivery.</p>
            <div className="mt-6 h-72 md:h-80">
                    <iframe
                      title="Mappa Pinsa Spartaco"
                      src="https://www.google.com/maps?q=Largo+Andrea+Berardi,+21,+00173+Roma+Italia&output=embed"
                      className="w-full h-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      style={{ border: 0 }}
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sezione: Domande frequenti (FAQ) — una sola aperta alla volta */}
      <section className="section-padding bg-black">
        <div className="container-custom text-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3">
                <img src="/domande.svg" alt="Domande frequenti" className="w-8 h-8 md:w-10 md:h-10" />
                <h2 className="text-3xl md:text-4xl font-bold">Domande Frequenti</h2>
              </div>
              <p className="text-white/80 mt-3">
                Una risposta veloce a tutte le domande più gettonate dai nostri clienti. Se hai altre domande o dubbi non esitare a contattarci
              </p>
            </div>
            <ul className="divide-y divide-white divide-y-[0.5px]">
            {[
              { q: 'Da quale locale si ordina sul sito?', a: 'Da questo sito Web potete ordinare dal locale "Pizza Spartaco" in Viale Spartaco 73, 00174.' },
              { q: 'Quali metodi di pagamento accettati?', a: 'Abbiamo pagamento alla consegna o con carta da sito.' },
              { q: 'Quali modalità offrite per ordinare?', a: 'Offriamo ordini a Domicilio o Take Away.' },
              { q: 'In quale zone di Roma spedite?', a: 'Ricopriamo i seguenti CAP nella zona di Roma sud: 00169, 00172, 00173, 00174, 00175, 00178.' },
              { q: 'Quanto costa la spedizione?', a: "La spedizione costa 1,50, registrandoti puoi sfruttare il 10% di sconto sull'ordine di qualsiasi cifra." },
            ].map((item, idx) => (
              <li key={idx} className="py-4">
                <button
                  type="button"
                  className="w-full text-left font-semibold flex items-center justify-between text-white text-lg md:text-xl"
                  aria-expanded={activeFaq === idx}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${activeFaq === idx ? 'rotate-90' : 'rotate-0'}`} />
                </button>
                {activeFaq === idx && (
                  <div className="mt-2 leading-relaxed text-white/80 text-base md:text-lg">{item.a}</div>
                )}
              </li>
            ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sezione: Recensioni dei nostri clienti */}
      <section className="section-padding bg-neutral-black">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white">Cosa dicono i nostri clienti</h2>
          </div>

          {/* Riga 1: scorre verso destra (reverse) */}
          
                    <div className="relative w-screen left-1/2 -translate-x-1/2">
          <div className="relative overflow-hidden px-3">
          <div className="marquee marquee-reverse gap-3">
            <div className="marquee-group gap-3">
              {reviewsFiltered.slice(0, 10).map((r, i) => (
                <div key={`r1-${i}`} className="card w-[300px] md:w-[320px] p-4 md:p-5 min-h-[170px] md:min-h-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-black">{r.name}</span>
                    <span className="text-sm text-neutral-gray-500">{r.date}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-gray-300'}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-neutral-gray-700 text-sm leading-5 h-10 whitespace-normal" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
                </div>
              ))}
            </div>
            {/* Duplicazione per loop continuo */}
            <div className="marquee-group gap-3">
              {reviewsFiltered.slice(0, 10).map((r, i) => (
                <div key={`r1b-${i}`} className="card w-[300px] md:w-[320px] p-4 md:p-5 min-h-[170px] md:min-h-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-black">{r.name}</span>
                    <span className="text-sm text-neutral-gray-500">{r.date}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-gray-300'}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-neutral-gray-700 text-sm leading-5 h-10 whitespace-normal" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
                </div>
              ))}
            </div>
          </div>
          </div>
                      {/* Sfumature laterali */}
                      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-28 md:w-32 bg-gradient-to-r from-neutral-black to-transparent z-10"></div>
                      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-28 md:w-32 bg-gradient-to-l from-neutral-black to-transparent z-10"></div>
          </div>
          
          {/* Riga 2: scorre verso sinistra (default) */}
          
                    <div className="mt-8 relative w-screen left-1/2 -translate-x-1/2">
          <div className="relative overflow-hidden px-3">
          <div className="marquee gap-3">
            <div className="marquee-group gap-3">
              {reviewsFiltered.slice(10).map((r, i) => (
                <div key={`r2-${i}`} className="card w-[300px] md:w-[320px] p-4 md:p-5 min-h-[170px] md:min-h-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-black">{r.name}</span>
                    <span className="text-sm text-neutral-gray-500">{r.date}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-gray-300'}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-neutral-gray-700 text-sm leading-5 h-10 whitespace-normal" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
                </div>
              ))}
            </div>
            {/* Duplicazione per loop continuo */}
            <div className="marquee-group gap-3">
              {reviewsFiltered.slice(10).map((r, i) => (
                <div key={`r2b-${i}`} className="card w-[300px] md:w-[320px] p-4 md:p-5 min-h-[170px] md:min-h-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-black">{r.name}</span>
                    <span className="text-sm text-neutral-gray-500">{r.date}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-gray-300'}`} />
                    ))}
                  </div>
                  <p className="mt-2 text-neutral-gray-700 text-sm leading-5 h-10 whitespace-normal" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
                </div>
              ))}
            </div>
          </div>
          </div>
                      {/* Sfumature laterali */}
                      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-28 md:w-32 bg-gradient-to-r from-neutral-black to-transparent z-10"></div>
                      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-28 md:w-32 bg-gradient-to-l from-neutral-black to-transparent z-10"></div>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6">
            <a
              href="https://www.google.com/search?sca_esv=254941356981cfe9&rlz=1C1FHFK_enIT1120IT1120&sxsrf=AE3TifMdxV3gRKNeCqVMs6NfFtNNI52ZoA:1761406521338&si=AMgyJEtREmoPL4P1I5IDCfuA8gybfVI2d5Uj7QMwYCZHKDZ-E90NQKo2ZlxRoKUaJ8tl5B38i8e3SS-f9mtJksGdBInT_kjUJlW00y22zZHNoylnMV6Mr9xh9QdMSCuoYPvmIuPDLlfzYvfyY2dJ9t8LLqHvcdy1AA%3D%3D&q=Pizza+Spartaco+Recensioni&sa=X&ved=2ahUKEwj_s4nQ1r-QAxXQhv0HHaF1IjEQ0bkNegQINhAE&biw=1536&bih=695&dpr=1.25"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 md:px-5 md:py-3 rounded-lg bg-white text-neutral-black border border-yellow-400 font-semibold shadow-soft hover:bg-neutral-gray-50 transition-colors text-sm md:text-base"
              aria-label="Apri tutte le recensioni su Google"
            >
              Tutte le recensioni
            </a>
            <div className="flex items-center gap-1 md:gap-2 text-white text-sm md:text-base">
              <span className="font-semibold text-sm md:text-base">Google</span>
              <span>4.4/5</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
