import React, { useState, useMemo, useEffect, useRef } from 'react';
import { apiUrl } from '../lib/api';
import { Search, Filter, X, ShoppingCart } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';

interface MenuPageProps {
  onNavigate: (page: string) => void;
}

const MenuPage: React.FC<MenuPageProps> = ({ onNavigate }) => {
  // Categoria attiva: di default "Tutte" mostra l'intero menù
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const { getTotalItems, getSubtotal } = useCart();

  type Dish = {
    id: string;
    name: string;
    description: string;
    category: string;
    price_pinsa: number | null;
    price_tonda: number | null;
    price_pala: number | null;
    image: string | null;
    allergens?: string[];
  };

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animazioni: titolo, sottotitolo e sidebar categorie
  const menuTitleRef = useRef<HTMLHeadingElement | null>(null);
  const menuSubtitleRef = useRef<HTMLParagraphElement | null>(null);
  const [menuTitleShown, setMenuTitleShown] = useState(false);
  const [menuSubtitleShown, setMenuSubtitleShown] = useState(false);
  const [sidebarShown, setSidebarShown] = useState(false);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(apiUrl('menu'));
        const json = await res.json();
        if (!res.ok || json?.error) {
          const msg = json?.error?.message || json?.error || 'Errore nel caricamento del menù';
          throw new Error(msg);
        }
        const items = Array.isArray(json?.items) ? json.items : [];
        setDishes(items);
      } catch (e: any) {
        setError(e?.message || 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };
    fetchDishes();
  }, []);

  // IntersectionObserver per mostrare titolo/sottotitolo/colonna categorie al 30%
  useEffect(() => {
    const options = { threshold: 0.3 };
    // Fallback: se IntersectionObserver non esiste, mostra subito.
    if (typeof window === 'undefined' || typeof (window as any).IntersectionObserver === 'undefined') {
      setMenuTitleShown(true);
      setMenuSubtitleShown(true);
      return;
    }
    const onTitle = (entries: any[]) => {
      entries.forEach((entry: any) => {
        if (entry.isIntersecting) setMenuTitleShown(true);
      });
    };
    const onSubtitle = (entries: any[]) => {
      entries.forEach((entry: any) => {
        if (entry.isIntersecting) setMenuSubtitleShown(true);
      });
    };
    const obsTitle = new IntersectionObserver(onTitle, options);
    const obsSubtitle = new IntersectionObserver(onSubtitle, options);
    if (menuTitleRef.current) obsTitle.observe(menuTitleRef.current);
    if (menuSubtitleRef.current) obsSubtitle.observe(menuSubtitleRef.current);
    return () => {
      obsTitle.disconnect();
      obsSubtitle.disconnect();
    };
  }, []);

  // Sidebar: anima i pulsanti quando le categorie sono disponibili,
  // garantendo la transizione dal basso verso l'alto.
  useEffect(() => {
    const id = requestAnimationFrame(() => setSidebarShown(true));
    return () => cancelAnimationFrame(id);
  }, [dishes.length]);

  // Chiudi la modale con ESC quando aperta
  useEffect(() => {
    if (!showLegend) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLegend(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showLegend]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach((d) => { if (d.category) set.add(d.category); });
    const list = Array.from(set);
    return [{ id: 'all', label: 'Tutte' }, ...list.map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))];
  }, [dishes]);

  const filteredProducts = useMemo(() => {
    // Adatta i piatti in formato Product per usare ProductCard e il carrello
    const adapt = (d: Dish) => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      category: (d.category as any),
      image: d.image || '/menu1.jpg',
      // Mappatura diretta dei prezzi per corrispondere esattamente alle colonne Supabase
      // Pinsa → slice, Tonda → half, Pala → full
      pricePerSlice: d.price_pinsa ?? 0,
      priceHalfTray: d.price_tonda ?? 0,
      priceFullTray: d.price_pala ?? 0,
      isVegetarian: false,
      isSpicy: false,
      allergens: Array.isArray(d.allergens) ? d.allergens : [],
      extras: [],
    });

    const products = dishes.map(adapt);
    // Non filtriamo per categoria: mostriamo sempre tutte le sezioni;
    // filtriamo solo per ricerca.
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [dishes, searchQuery]);

  // Rimozione refs e logica di scroll; usiamo solo filtro per categoria al click

  // Inizializza/assicurati che la categoria attiva sia impostata (default: "all")
  useEffect(() => {
    setActiveCategory((prev) => prev || 'all');
  }, [categories]);

  // Nessun aggiornamento basato sullo scroll: l'utente sceglie la categoria al click

  const selectCategory = (id: string) => {
    setActiveCategory(id);
  };

  return (
    <div className="pt-20 min-h-screen bg-neutral-black">
      <div className="relative text-white py-12 md:py-16" style={{ backgroundImage: 'url(/menu1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div aria-hidden="true" className="absolute inset-0 bg-black/50 pointer-events-none"></div>
        <div className="container-custom relative z-10">
          <h1
            ref={menuTitleRef}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{
              transform: menuTitleShown ? 'translateY(0)' : 'translateY(28px)',
              opacity: menuTitleShown ? 1 : 0,
              transition: 'transform 700ms ease, opacity 700ms ease',
              willChange: 'transform, opacity',
            }}
          >
            Il nostro <span className="text-orange-500">menu</span>
          </h1>
          <p
            ref={menuSubtitleRef}
            className="text-xl text-white/90"
            style={{
              transform: menuSubtitleShown ? 'translateY(0)' : 'translateY(28px)',
              opacity: menuSubtitleShown ? 1 : 0,
              transition: 'transform 700ms ease 150ms, opacity 700ms ease 150ms',
              willChange: 'transform, opacity',
            }}
          >
            Scegli cosa gustare e ordina subito : Delivery, Take Away o al banco
          </p>
        </div>
      </div>



      <div className="py-8">
        {/* Desktop: sidebar categorie viene renderizzata più sotto insieme ai prodotti */}

        {/* Mobile: categorie orizzontali sotto hero (manteniamo comportamento attuale) */}
        <div className="container-custom flex overflow-x-auto gap-3 mb-8 pb-2 md:hidden">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => selectCategory(category.id)}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? 'bg-neutral-gray-800 text-white'
                  : 'bg-neutral-black text-white hover:bg-neutral-gray-900'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Mobile: pulsante legenda a destra */}
        <div className="container-custom mb-6 md:hidden flex justify-end">
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            aria-expanded={showLegend}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-yellow-600 text-black border-2 border-black border-dashed hover:bg-yellow-500 transition-colors"
          >
            <span className="font-semibold">legenda allergeni</span>
          </button>
        </div>

        {/* Modale overlay: Leggenda allergeni */}
        {showLegend && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowLegend(false)}
          >
            <div aria-hidden="true" className="absolute inset-0 bg-black/50"></div>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="legend-title"
              className="relative z-10 w-[92%] max-w-2xl rounded-xl bg-white text-black p-5 border-2 border-black border-dashed shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 id="legend-title" className="text-lg font-semibold">Leggenda allergeni</h3>
                <button
                  type="button"
                  aria-label="Chiudi"
                  onClick={() => setShowLegend(false)}
                  className="p-2 rounded hover:bg-neutral-gray-100"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
              <p className="text-sm text-neutral-gray-700 mb-4">
                Indicazioni sugli allergeni presenti nei prodotti. Contattaci per informazioni dettagliate.
              </p>
              <div className="max-h-[60vh] overflow-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'glutine', label: 'Glutine', icon: 'glutine.png', desc: 'Cereali con glutine (grano, segale, orzo, farro).' },
                    { id: 'arachidi', label: 'Arachidi', icon: 'arachidi.png', desc: 'Arachidi e prodotti derivati.' },
                    { id: 'fruttaaguscio', label: 'Frutta a guscio', icon: 'fruttaaguscio.png', desc: 'Mandorle, nocciole, noci, pistacchi, ecc.' },
                    { id: 'latte', label: 'Latte', icon: 'latte.png', desc: 'Latte e derivati (lattosio).' },
                    { id: 'lupini', label: 'Lupini', icon: 'lupini.png', desc: 'Lupini e prodotti derivati.' },
                    { id: 'molluschi', label: 'Molluschi', icon: 'molluschi.png', desc: 'Molluschi e prodotti derivati.' },
                    { id: 'pesce', label: 'Pesce', icon: 'pesce.png', desc: 'Pesce e prodotti derivati.' },
                    { id: 'sedano', label: 'Sedano', icon: 'sedano.png', desc: 'Sedano e prodotti derivati.' },
                    { id: 'semidisesamo', label: 'Semi di sesamo', icon: 'semidisesamo.png', desc: 'Semi di sesamo e derivati.' },
                    { id: 'senape', label: 'Senape', icon: 'senape.png', desc: 'Senape e prodotti derivati.' },
                    { id: 'soia', label: 'Soia', icon: 'soia.png', desc: 'Soia e prodotti derivati.' },
                    { id: 'solfiti', label: 'Solfiti', icon: 'solfiti.png', desc: 'Anidride solforosa e solfiti ≥10 mg/kg.' },
                    { id: 'uova', label: 'Uova', icon: 'uova.png', desc: 'Uova e prodotti derivati.' },
                    { id: 'crostacei', label: 'Crostacei', icon: 'crostacei.png', desc: 'Crostacei e prodotti derivati.' },
                  ].map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <img src={`/allergeni/${a.icon}`} alt={a.label} className="w-8 h-8 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold">{a.label}</div>
                        <div className="text-xs text-neutral-gray-700">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <p className="text-xl text-white">Caricamento menù...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-xl text-red-500">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-neutral-gray-600">
              Nessun prodotto trovato. Prova a modificare i filtri.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop: griglia con sidebar sinistra e contenuto a destra */}
            <div className="hidden md:grid md:grid-cols-[280px_1fr] md:gap-6">
              <aside className="sticky top-20 bg-neutral-black rounded-r-lg p-2 self-start">
                <div className="flex flex-col gap-1">
                  {categories.map((category, idx) => (
                    <button
                      key={category.id}
                      onClick={() => selectCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        activeCategory === category.id
                          ? 'bg-neutral-gray-800 text-white'
                          : 'bg-neutral-black text-white hover:bg-neutral-gray-900'
                      }`}
                      style={{
                        transform: sidebarShown ? 'translateX(0)' : 'translateX(-12px)',
                        opacity: 1,
                        transition: 'transform 600ms ease',
                        transitionDelay: sidebarShown ? `${(categories.length - idx - 1) * 120}ms` : '0ms',
                        willChange: 'transform',
                      }}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </aside>
              <div>
                {/* Desktop: pulsante legenda a destra */}
                <div className="flex justify-end mb-6">
                  <button
                    type="button"
                    onClick={() => setShowLegend((v) => !v)}
                    aria-expanded={showLegend}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-yellow-600 text-black border-2 border-black border-dashed hover:bg-yellow-500 transition-colors"
                  >
                    <span className="font-semibold">legenda allergeni</span>
                  </button>
                </div>
                {activeCategory === 'all'
                  ? (
                    categories.filter(c => c.id !== 'all').map((cat) => {
                      const productsInCat = filteredProducts.filter((p) => p.category === cat.id);
                      if (productsInCat.length === 0) return null;
                      return (
                        <div key={cat.id} className="mb-10">
                          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{cat.label}</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {productsInCat.map((product) => (
                              <ProductCard key={product.id} product={product} showFullDetails compact variant="menu" sizeLabels={{ slice: 'Pinsa', half: 'Tonda', full: 'Pala' }} />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )
                  : (
                    (() => {
                      const activeCat = categories.find((c) => c.id === activeCategory);
                      const productsInCat = filteredProducts.filter((p) => p.category === activeCategory);
                      if (!activeCat || productsInCat.length === 0) return null;
                      return (
                        <div className="mb-10">
                          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{activeCat.label}</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {productsInCat.map((product) => (
                              <ProductCard key={product.id} product={product} showFullDetails compact variant="menu" sizeLabels={{ slice: 'Pinsa', half: 'Tonda', full: 'Pala' }} />
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  )}
              </div>
            </div>

            {/* Mobile: contenuto senza sidebar */}
            <div className="md:hidden">
              {activeCategory === 'all'
                ? (
                  categories.filter(c => c.id !== 'all').map((cat) => {
                    const productsInCat = filteredProducts.filter((p) => p.category === cat.id);
                    if (productsInCat.length === 0) return null;
                    return (
                      <div key={cat.id} className="mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">{cat.label}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {productsInCat.map((product) => (
                            <ProductCard key={product.id} product={product} showFullDetails compact variant="menu" sizeLabels={{ slice: 'Pinsa', half: 'Tonda', full: 'Pala' }} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )
                : (
                  (() => {
                    const activeCat = categories.find((c) => c.id === activeCategory);
                    const productsInCat = filteredProducts.filter((p) => p.category === activeCategory);
                    if (!activeCat || productsInCat.length === 0) return null;
                    return (
                      <div className="mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-6">{activeCat.label}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {productsInCat.map((product) => (
                            <ProductCard key={product.id} product={product} showFullDetails compact variant="menu" sizeLabels={{ slice: 'Pinsa', half: 'Tonda', full: 'Pala' }} />
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
            </div>
          </>
        )}
      </div>

      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-gray-200 shadow-soft-lg z-40">
          <div className="container-custom py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-gray-600">
                  {getTotalItems()} {getTotalItems() === 1 ? 'articolo' : 'articoli'}
                </p>
                <p className="text-2xl font-bold text-neutral-black">
                  €{getSubtotal().toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => onNavigate('cart')}
                className="btn-primary flex items-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Vai al carrello</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
