import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenLoginModal?: () => void;
  isLoggedIn?: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, onOpenLoginModal, isLoggedIn }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { getTotalItems } = useCart();
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastValidIdRef = useRef<string>('home');
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, visible: false });

  const updateIndicator = () => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    // Se la pagina corrente non ha un elemento di navigazione associato,
    // mantieni l'ultima posizione valida (es. resta sulla voce precedente)
    const targetId = itemRefs.current[currentPage] ? currentPage : lastValidIdRef.current;
    const btnEl = itemRefs.current[targetId!];
    if (!btnEl) return;

    const navRect = containerEl.getBoundingClientRect();
    const rect = btnEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Se il target è nascosto (es. elemento "hidden" su mobile), mantieni l'ultima posizione valida
    if (w < 2 || h < 2) return;

    // Allineamento: calcolo relativo al container senza sottrarre padding
    const cs = window.getComputedStyle(containerEl);
    const paddingLeft = parseFloat(cs.paddingLeft || '0');
    const paddingTop = parseFloat(cs.paddingTop || '0');

    setIndicator({
      left: rect.left - navRect.left,
      top: rect.top - navRect.top,
      width: w,
      height: h,
      visible: true,
    });
    lastValidIdRef.current = targetId!;
  };

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      updateIndicator();
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentPage, isLoggedIn]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Ricalcolo automatico quando cambia la dimensione del container (es. caricamento font)
  useEffect(() => {
    if (containerRef.current) {
      const ro = new ResizeObserver(() => updateIndicator());
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, []);

  // Allineamento iniziale dopo il caricamento dei font e della pagina
  useEffect(() => {
    const updateOnLoad = () => updateIndicator();
    window.addEventListener('load', updateOnLoad);
    if ((document as any).fonts && (document as any).fonts.ready) {
      (document as any).fonts.ready.then(() => updateIndicator());
    }
    return () => {
      window.removeEventListener('load', updateOnLoad);
    };
  }, []);

  // Chiusura del menu mobile al click fuori dal menu
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (!isMobileMenuOpen) return;
      const dropEl = dropdownRef.current;
      const toggleEl = mobileMenuButtonRef.current;
      const targetNode = e.target as Node;
      // Ignora i clic all'interno del dropdown o sul pulsante hamburger/X
      if ((dropEl && dropEl.contains(targetNode)) || (toggleEl && toggleEl.contains(targetNode))) {
        return;
      }
      setIsMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMobileMenuOpen]);
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'menu', label: 'Menù' },
    { id: 'about', label: 'Chi Siamo' },
    { id: 'contact', label: 'Contatti' },
  ];

  return (
    <header className="fixed top-6 left-0 right-0 z-50 flex justify-center md:justify-end px-4 md:px-0">
      {/* Rettangolo orizzontale con bordi arrotondati */}
      <div ref={containerRef} className="bg-black rounded-2xl shadow-soft border border-neutral-gray-800 flex items-center px-4 py-2 md:px-6 md:py-3 relative">
        {indicator.visible && (
          <div
            className="hidden md:block absolute rounded-xl bg-white shadow-soft transition-all duration-300 ease-out z-0 pointer-events-none"
            style={{ left: indicator.left, top: indicator.top, width: indicator.width, height: indicator.height }}
          />
        )}
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center hover:opacity-80 transition-opacity relative z-10"
          aria-label="Vai alla Home"
        >
          <img src="/logo1.png" alt="Pizza Spartaco" className="h-16 w-auto" />
        </button>

        {/* Linea verticale */}
        <div className="hidden md:block w-px h-10 bg-white mx-6"></div>

        {/* Pulsanti di navigazione */}
        <nav ref={navRef} className="hidden md:flex relative items-center space-x-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              ref={(el) => { itemRefs.current[item.id] = el; }}
              onClick={() => onNavigate(item.id)}
              className={`relative z-10 px-4 py-2 font-medium transition-colors ${
                currentPage === item.id
                  ? 'text-[#ff7300]'
                  : 'text-white hover:text-[#ff7300]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Azioni a destra: carrello + hamburger mobile */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onNavigate('cart')}
            ref={(el) => { itemRefs.current['cart'] = el; }}
            id="navbar-cart-button"
            className="relative p-2 rounded-lg transition-colors z-10"
            aria-label="Apri carrello"
          >
            <ShoppingCart className={`w-6 h-6 ${currentPage === 'cart' ? 'text-[#ff7300]' : 'text-white'}`} />
            {getTotalItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary-orange text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {getTotalItems()}
              </span>
            )}
          </button>

          {isLoggedIn ? (
            <button
              onClick={() => onNavigate('areapersonale')}
              ref={(el) => { itemRefs.current['areapersonale'] = el; }}
              className={`px-3 py-2 rounded-lg transition-colors relative z-10 whitespace-nowrap ${currentPage === 'areapersonale' ? 'text-[#ff7300]' : 'text-white'}`}
              aria-label="Vai all'Area Personale"
            >
              Area Personale
            </button>
          ) : (
            <button
              onClick={() => (onOpenLoginModal ? onOpenLoginModal() : onNavigate('loginregister'))}
              ref={(el) => { itemRefs.current['loginregister'] = el; }}
              className="p-2 rounded-lg transition-colors relative z-10"
              aria-label="Accedi o registrati"
            >
              <img src="/accesso.svg" alt="Accesso" className={`w-6 h-6 ${currentPage === 'loginregister' ? 'filter invert-[42%] sepia-[88%] saturate-[7474%] hue-rotate-[358deg] brightness-[99%] contrast-[96%]' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-neutral-gray-800 rounded-lg transition-colors focus:outline-none"
            aria-label="Apri menu"
            aria-expanded={isMobileMenuOpen}
            ref={mobileMenuButtonRef}
          >
            <div className="relative w-6 h-6">
              <span
                className={`absolute left-0 right-0 h-0.5 bg-white transition-transform duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-[3px]'
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-0.5 bg-white transition-all duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'top-1/2 -translate-y-1/2 opacity-0 scale-x-0' : 'top-1/2 -translate-y-1/2 opacity-100 scale-x-100'
                }`}
              />
              <span
                className={`absolute left-0 right-0 h-0.5 bg-white transition-transform duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-[3px]'
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Dropdown mobile attaccato al rettangolo con animazione a tendina */}
      <div
        ref={dropdownRef}
        className={`absolute top-full left-1/2 -translate-x-1/2 md:right-0 md:left-auto md:translate-x-0 mt-2 bg-black border border-neutral-gray-800 rounded-xl shadow-soft w-64 overflow-hidden transform-gpu origin-top transition-all duration-500 ease-in-out ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0 max-h-[60vh] pointer-events-auto' : 'opacity-0 -translate-y-2 max-h-0 pointer-events-none'
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <nav className="flex flex-col space-y-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`text-left px-4 py-[10px] rounded-lg font-medium transition-colors ${
                currentPage === item.id
                  ? 'text-[#ff7300]'
                  : 'text-white hover:text-[#ff7300]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
