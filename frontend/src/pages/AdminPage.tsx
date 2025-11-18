import React, { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/api';
import { Users, Utensils, ShoppingBag, RefreshCw, AlertCircle, Home, ChevronDown, ChevronUp, Clock, CreditCard, Truck, Package, Plus, Pencil, Trash2, X, BarChart2 } from 'lucide-react';
import '../components/DotSpinner.css';
import '../components/FileUpload.css';

interface AdminPageProps {
  userId: string;
  isAdmin: boolean;
  onNavigate: (page: string) => void;
}

type AdminUser = { id: string; created_at: string; first_name: string; last_name: string; email: string };
type AdminDish = { id: string; name: string; description: string | null; category: string | null; price_pinsa: number; price_tonda: number; price_pala: number; image: string | null; allergens?: string[] };
type AdminOrderItem = { product_id: string; product_name: string; size: string; quantity: number; extras: { name: string; price: number }[]; unit_price: number; total_price: number };
type AdminOrder = {
  id: string; created_at: string; user_id: string | null; user_first_name: string | null; user_last_name: string | null; user_email: string | null;
  phone: string; mode: 'delivery' | 'pickup' | string; address: string | null; cap: string | null; staircase: string | null; floor: string | null; buzzer: string | null;
  delivery_time: string | null; pickup_name: string | null; pickup_time: string | null; notes_rider: string | null; payment_method: string | null; subtotal: number | null; delivery_fee: number | null; total: number | null; discount?: number | null; total_paid?: number | null;
  items: AdminOrderItem[];
};

const AdminPage: React.FC<AdminPageProps> = ({ userId, isAdmin, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [dishes, setDishes] = useState<AdminDish[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'dishes' | 'stats'>('orders');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Stato gestione piatti (form inline)
  const [showDishForm, setShowDishForm] = useState(false);
  const [editingDish, setEditingDish] = useState<AdminDish | null>(null);
  const [dishFormError, setDishFormError] = useState<string | null>(null);
  const [dishFormLoading, setDishFormLoading] = useState(false);
  const [dishForm, setDishForm] = useState<{ name: string; description: string; category: string; price_pinsa: string; price_tonda: string; price_pala: string; image: string; allergens: string[] }>({
    name: '',
    description: '',
    category: '',
    price_pinsa: '',
    price_tonda: '',
    price_pala: '',
    image: '',
    allergens: [],
  });
  const [deleteTarget, setDeleteTarget] = useState<AdminDish | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Componente spinner riutilizzabile
  const DotSpinner: React.FC<{ className?: string; size?: string; color?: string }> = ({ className, size = '2.0rem', color = '#183153' }) => {
    const style = {} as React.CSSProperties;
    (style as any)['--uib-size'] = size;
    (style as any)['--uib-color'] = color;
    return (
      <div className={`dot-spinner ${className || ''}`} style={style} aria-label="Caricamento" role="status">
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
        <div className="dot-spinner__dot"></div>
      </div>
    );
  };
  
  // Helpers ordini: ordinamento decrescente per data e separazione tra Oggi e Cronologia
  const ordersSorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta;
    });
  }, [orders]);

  const isToday = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const todayOrders = useMemo(() => ordersSorted.filter((o) => isToday(o.created_at)), [ordersSorted]);
  const historyOrders = useMemo(() => ordersSorted.filter((o) => !isToday(o.created_at)), [ordersSorted]);

  const currency = useMemo(() => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }), []);
  const sizeToLabel = (s: string) => (s === 'slice' ? 'Pinsa' : s === 'half' ? 'Tonda' : s === 'full' ? 'Pala' : '');
  const formatDateTime = (iso: string) => {
    try { return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch { return iso; }
  };
  const formatDate = (iso: string) => {
    try { return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(iso)); } catch { return iso; }
  };
  const formatTime = (iso: string) => {
    try { return new Intl.DateTimeFormat('it-IT', { timeStyle: 'short' }).format(new Date(iso)); } catch { return iso; }
  };

  // Statistiche: ricavi e utenti
  const sumPaid = (o: AdminOrder) => Number(o.total_paid ?? o.total ?? 0);
  const startOfWeek = (ref: Date) => {
    const d = new Date(ref);
    const day = (d.getDay() + 6) % 7; // Lun=0 ... Dom=6
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const isThisWeek = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return startOfWeek(d).getTime() === startOfWeek(now).getTime();
  };
  const isThisMonth = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const revenueToday = useMemo(() => todayOrders.reduce((sum, o) => sum + sumPaid(o), 0), [todayOrders]);
  const revenueWeek = useMemo(() => orders.reduce((sum, o) => sum + (isThisWeek(o.created_at) ? sumPaid(o) : 0), 0), [orders]);
  const revenueMonth = useMemo(() => orders.reduce((sum, o) => sum + (isThisMonth(o.created_at) ? sumPaid(o) : 0), 0), [orders]);
  const deliveryOrdersAllCount = useMemo(() => orders.filter((o) => (o.mode || '').toLowerCase() === 'delivery').length, [orders]);
  const pickupOrdersAllCount = useMemo(() => orders.filter((o) => (o.mode || '').toLowerCase() === 'pickup').length, [orders]);
  const pickupOrdersTodayCount = useMemo(() => todayOrders.filter((o) => (o.mode || '').toLowerCase() === 'pickup').length, [todayOrders]);
  const deliveryOrdersTodayCount = useMemo(() => todayOrders.filter((o) => (o.mode || '').toLowerCase() === 'delivery').length, [todayOrders]);
  const newUsersToday = useMemo(() => users.filter((u) => isToday(u.created_at)).length, [users]);
  const habitualUsersCount = useMemo(() => {
    const cnt = new Map<string, number>();
    for (const o of orders) {
      if (!o.user_id) continue;
      cnt.set(o.user_id, (cnt.get(o.user_id) || 0) + 1);
    }
    let acc = 0;
    for (const v of cnt.values()) if (v > 1) acc++;
    return acc;
  }, [orders]);
  const topDishesMonth = useMemo(() => {
    const tally = new Map<string, number>();
    for (const o of orders) {
      if (!isThisMonth(o.created_at)) continue;
      for (const it of o.items || []) {
        const key = it.product_name || it.product_id;
        const q = Number(it.quantity || 0);
        tally.set(key, (tally.get(key) || 0) + q);
      }
    }
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  const fetchOverview = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(apiUrl(`admin/overview?user_id=${encodeURIComponent(userId)}`));
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || 'Accesso negato o errore server');
      }
      setUsers(Array.isArray(json.users) ? json.users : []);
      setDishes(Array.isArray(json.dishes) ? json.dishes : []);
      setOrders(Array.isArray(json.orders) ? json.orders : []);
    } catch (e: any) {
      setError(e?.message || 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Helpers form piatto
  const openCreateDish = () => {
    setEditingDish(null);
    setDishForm({ name: '', description: '', category: '', price_pinsa: '', price_tonda: '', price_pala: '', image: '', allergens: [] });
    setDishFormError(null);
    setShowDishForm(true);
  };
  const openEditDish = (d: AdminDish) => {
    setEditingDish(d);
    setDishForm({
      name: d.name || '',
      description: d.description || '',
      category: d.category || '',
      price_pinsa: d.price_pinsa != null ? String(d.price_pinsa) : '',
      price_tonda: d.price_tonda != null ? String(d.price_tonda) : '',
      price_pala: d.price_pala != null ? String(d.price_pala) : '',
      image: d.image || '',
      allergens: Array.isArray(d.allergens) ? d.allergens : [],
    });
    setDishFormError(null);
    setShowDishForm(true);
  };
  const closeDishForm = () => {
    setShowDishForm(false);
    setEditingDish(null);
    setDishFormError(null);
  };
  const onDishFormChange = (field: keyof typeof dishForm, value: string) => {
    setDishForm((prev) => ({ ...prev, [field]: value }));
  };
  const toggleDishAllergen = (id: string) => {
    setDishForm((prev) => {
      const has = prev.allergens.includes(id);
      return { ...prev, allergens: has ? prev.allergens.filter((a) => a !== id) : [...prev.allergens, id] };
    });
  };
  const onDishImageSelected = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setDishFormError('Seleziona un file immagine valido.');
      return;
    }
    try {
      setDishFormError(null);
      setDishFormLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(apiUrl(`admin/dishes/upload-image?user_id=${encodeURIComponent(userId)}`), {
        method: 'POST',
        body: formData,
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || 'Errore upload immagine');
      }
      const url: string = json.url || json.secure_url || '';
      setDishForm((prev) => ({ ...prev, image: url }));
    } catch (e: any) {
      setDishFormError(e?.message || 'Errore upload immagine');
    } finally {
      setDishFormLoading(false);
    }
  };
  const clearDishImage = () => {
    setDishForm((prev) => ({ ...prev, image: '' }));
  };
  const submitDishForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDishFormError(null);
      if (!dishForm.name || dishForm.name.trim().length < 2) {
        setDishFormError('Inserisci un nome valido (min 2 caratteri).');
        return;
      }
      const toNum = (v: string) => {
        if (!v || v.trim() === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      setDishFormLoading(true);
      const payload = {
        name: dishForm.name.trim(),
        description: dishForm.description.trim() || null,
        category: dishForm.category.trim() || null,
        price_pinsa: toNum(dishForm.price_pinsa),
        price_tonda: toNum(dishForm.price_tonda),
        price_pala: toNum(dishForm.price_pala),
        image: dishForm.image.trim() || null,
        allergens: Array.isArray(dishForm.allergens) ? dishForm.allergens : [],
      };
      let resp: Response;
      if (editingDish) {
        resp = await fetch(apiUrl(`admin/dishes/${encodeURIComponent(editingDish.id)}?user_id=${encodeURIComponent(userId)}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch(apiUrl(`admin/dishes?user_id=${encodeURIComponent(userId)}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || 'Errore salvataggio piatto');
      }
      await fetchOverview();
      closeDishForm();
    } catch (e: any) {
      setDishFormError(e?.message || 'Errore sconosciuto');
    } finally {
      setDishFormLoading(false);
    }
  };
  const confirmDeleteDish = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteError(null);
      setDeleteLoading(true);
      const resp = await fetch(apiUrl(`admin/dishes/${encodeURIComponent(deleteTarget.id)}?user_id=${encodeURIComponent(userId)}`), { method: 'DELETE' });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || 'Errore eliminazione piatto');
      }
      await fetchOverview();
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e?.message || 'Errore eliminazione');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchOverview();
  }, [userId, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-start justify-center p-6">
        <div className="w-full max-w-3xl bg-black border border-neutral-gray-800 rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-primary-orange" /> Pannello Admin
            </h1>
            <button
              className="px-3 py-2 rounded-lg bg-neutral-gray-800 text-white hover:bg-neutral-gray-700 flex items-center gap-2"
              onClick={() => onNavigate('areapersonale')}
            >
              <Home className="w-4 h-4" /> Area Personale
            </button>
          </div>
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <div className="font-medium">Accesso negato</div>
              <div className="text-sm">Questa sezione è riservata all’amministratore.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-start justify-center px-2 py-6 md:px-6">
        <div className="w-full max-w-6xl md:bg-black md:border md:border-neutral-gray-800 md:rounded-2xl md:shadow-soft md:p-6 p-2">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-primary-orange" /> Pannello Admin
          </h1>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-2 rounded-lg bg-neutral-gray-800 text-white hover:bg-neutral-gray-700 flex items-center gap-2"
              onClick={fetchOverview}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {loading && <DotSpinner size="1.6rem" color="#ffffff" />}
            <button
              className="px-3 py-2 rounded-lg bg-neutral-gray-800 text-white hover:bg-neutral-gray-700 flex items-center gap-2"
              onClick={() => onNavigate('areapersonale')}
            >
              <Home className="w-4 h-4" /> Area Personale
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <div className="font-medium">Errore</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Panoramica sintetica con pulsanti-tab */}
        {/* Mobile: 4 quadrati piccoli su una sola riga */}
        <div className="mt-2 md:hidden">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition ${activeTab === 'orders' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white text-black ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
              onClick={() => setActiveTab('orders')}
              aria-pressed={activeTab === 'orders'}
            >
              <ShoppingBag className="w-7 h-7" />
              <div className="text-xs leading-tight whitespace-nowrap">Ordini</div>
              <div className="text-sm font-semibold">{orders.length}</div>
            </button>
            <button
              type="button"
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition ${activeTab === 'users' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white text-black ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
              onClick={() => setActiveTab('users')}
              aria-pressed={activeTab === 'users'}
            >
              <Users className="w-7 h-7" />
              <div className="text-xs leading-tight whitespace-nowrap">Utenti</div>
              <div className="text-sm font-semibold">{users.length}</div>
            </button>
            <button
              type="button"
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition ${activeTab === 'dishes' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white text-black ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
              onClick={() => setActiveTab('dishes')}
              aria-pressed={activeTab === 'dishes'}
            >
              <Utensils className="w-7 h-7" />
              <div className="text-xs leading-tight whitespace-nowrap">Piatti</div>
              <div className="text-sm font-semibold">{dishes.length}</div>
            </button>
            <button
              type="button"
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center transition ${activeTab === 'stats' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white text-black ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
              onClick={() => setActiveTab('stats')}
              aria-pressed={activeTab === 'stats'}
            >
              <BarChart2 className="w-7 h-7" />
              <div className="text-xs leading-tight whitespace-nowrap">Statistiche</div>
              <div className="text-sm font-semibold">{currency.format(revenueToday)}</div>
            </button>
          </div>
        </div>

        {/* Desktop: griglia 4 colonne con card centrati */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 mt-4">
          <button
            type="button"
            className={`rounded-xl p-6 text-center transition ${activeTab === 'orders' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
            onClick={() => setActiveTab('orders')}
            aria-pressed={activeTab === 'orders'}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-black">
              <ShoppingBag className="w-6 h-6" />
              <div className="text-sm">Ordini</div>
              <div className="text-3xl font-bold">{orders.length}</div>
            </div>
          </button>
          <button
            type="button"
            className={`rounded-xl p-6 text-center transition ${activeTab === 'users' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
            onClick={() => setActiveTab('users')}
            aria-pressed={activeTab === 'users'}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-black">
              <Users className="w-6 h-6" />
              <div className="text-sm">Utenti</div>
              <div className="text-3xl font-bold">{users.length}</div>
            </div>
          </button>
          <button
            type="button"
            className={`rounded-xl p-6 text-center transition ${activeTab === 'dishes' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
            onClick={() => setActiveTab('dishes')}
            aria-pressed={activeTab === 'dishes'}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-black">
              <Utensils className="w-6 h-6" />
              <div className="text-sm">Piatti</div>
              <div className="text-3xl font-bold">{dishes.length}</div>
            </div>
          </button>
          <button
            type="button"
            className={`rounded-xl p-6 text-center transition ${activeTab === 'stats' ? 'bg-primary-orange text-white hover:opacity-90' : 'bg-white ring-1 ring-transparent hover:ring-neutral-gray-300'}`}
            onClick={() => setActiveTab('stats')}
            aria-pressed={activeTab === 'stats'}
          >
            <div className="flex flex-col items-center justify-center gap-2 text-black">
              <BarChart2 className="w-6 h-6" />
              <div className="text-sm">Statistiche</div>
              <div className="text-3xl font-bold">{currency.format(revenueToday)}</div>
            </div>
          </button>
        </div>

        {activeTab === 'orders' && (
          <>
            {/* Pannello Oggi */}
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-white mb-3">Oggi</h2>
              {todayOrders.length === 0 ? (
                <div className="rounded-xl bg-white text-neutral-gray-700 p-5">Nessun ordine oggi</div>
              ) : (
                <div className="rounded-xl bg-white text-black divide-y divide-neutral-gray-200">
                  {todayOrders.map((o) => {
                    const isOpen = !!expanded[o.id];
                    return (
                      <div key={o.id} className="p-4 overflow-hidden break-words">
                        {/* Preview cliccabile */}
                        <button
                          type="button"
                          className="w-full flex items-start justify-between gap-4 text-left break-words relative"
                          onClick={() => setExpanded((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                          aria-expanded={isOpen}
                        >
                          <div className="flex flex-col gap-1">
                            {/* Giorno + Orario di consegna/ritiro */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-gray-800">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">{formatDate(o.created_at)}</span>
                              <span className="font-semibold">{o.mode === 'delivery' ? 'Orario di consegna:' : 'Orario di ritiro:'}</span>
                              <span className="font-semibold">{(o.mode === 'delivery' ? o.delivery_time : o.pickup_time) || '-'}</span>
                            </div>
                            {/* ID ordine tra data/ora e domicilio/asporto */}
                            <div className="flex items-center gap-2 text-xs text-neutral-gray-800">
                              <span className="font-semibold">ID</span>
                              <span className="font-mono whitespace-nowrap">{o.id}</span>
                            </div>
                            {/* Domicilio/Asporto con icona */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-gray-800">
                              {o.mode === 'delivery' ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                              <span className="font-semibold">{o.mode === 'delivery' ? 'Domicilio' : 'Asporto'}</span>
                            </div>
                            {/* Metodo di pagamento con icona dal checkout */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-gray-800">
                              {o.payment_method === 'online' ? (
                                <img src="/carta.svg" alt="Pagamento online con carta" className="w-5 h-5" />
                              ) : o.payment_method === 'cash' ? (
                                <img src="/contanti.svg" alt="Pagamento in contanti" className="w-5 h-5" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                              <span className="font-semibold">
                                {o.payment_method
                                  ? o.payment_method === 'online'
                                    ? 'Online'
                                    : o.payment_method === 'cash'
                                    ? 'Contanti'
                                    : o.payment_method
                                  : o.mode === 'pickup'
                                  ? 'Pagamento al ritiro'
                                  : 'Pagamento alla consegna'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm md:text-base font-semibold">{currency.format(Number((o.total_paid ?? o.total) || 0))}</div>
                            {isOpen ? <ChevronUp className="w-5 h-5 hidden md:block" /> : <ChevronDown className="w-5 h-5 hidden md:block" />}
                          </div>
                          {/* Chevron mobile in basso a destra (uguale al PC) */}
                          <ChevronDown className={`md:hidden absolute bottom-2 right-2 w-5 h-5 text-neutral-gray-700 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
                        </button>

                        {/* Dettagli espansi */}
                        <div
                          className={`overflow-hidden transform-gpu origin-bottom transition-all duration-500 ease-in-out ${isOpen ? 'mt-3 opacity-100 translate-y-0 max-h-[70vh] pointer-events-auto' : 'mt-0 opacity-0 translate-y-2 max-h-0 pointer-events-none'}`}
                          aria-hidden={!isOpen}
                        >
                          <div className="bg-neutral-gray-100 rounded-lg p-4 break-words">
                            <div className="grid md:grid-cols-3 gap-4">
                              {/* Dati cliente */}
                              <div>
                                <h3 className="text-sm md:text-base font-semibold mb-2">Dati cliente</h3>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Nome:</span> {o.user_first_name || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Cognome:</span> {o.user_last_name || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Telefono:</span> {o.phone || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Email:</span> {o.user_email || '-'}</div>
                              </div>

                              {/* Dati Ordine */}
                              <div>
                                <h3 className="text-sm md:text-base font-semibold mb-2">Dati Ordine</h3>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">ID</span> {o.id}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Via:</span> {o.address || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">CAP:</span> {o.cap || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Scala:</span> {o.staircase || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Piano:</span> {o.floor || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Citofono:</span> {o.buzzer || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Orario di consegna/ritiro:</span> {(o.mode === 'delivery' ? o.delivery_time : o.pickup_time) || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Metodo di consegna:</span> {o.mode === 'delivery' ? 'Consegna' : 'Asporto'}</div>
                              <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Metodo di pagamento:</span> {o.payment_method || (o.mode === 'pickup' ? 'Pagamento al ritiro' : 'Pagamento alla consegna')}</div>
                              {o.notes_rider && (
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Note per il rider:</span> {o.notes_rider}</div>
                              )}
                              </div>

                              {/* Dati prodotti */}
                              <div>
                                <h3 className="text-sm md:text-base font-semibold mb-2">Dati prodotti</h3>
                                <ul className="text-xs md:text-sm space-y-1">
                                  {o.items && o.items.length > 0 ? (
                                    o.items.map((it, idx) => (
                                      <li key={`${o.id}-${idx}`} className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium">{it.product_name}</div>
                                          {sizeToLabel(it.size) ? (
                                            <div className="text-neutral-gray-700">Tipologia: {sizeToLabel(it.size)} • Quantità: {it.quantity}</div>
                                          ) : (
                                            <div className="text-neutral-gray-700">Quantità: {it.quantity}</div>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div>Unitario: {currency.format(Number(it.unit_price || 0))}</div>
                                          <div className="font-semibold">Totale: {currency.format(Number(it.total_price || 0))}</div>
                                        </div>
                                      </li>
                                    ))
                                  ) : (
                                    <li>-</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                            {/* Totali ordine */}
                            <div className="mt-3 border-t pt-3 text-xs md:text-sm">
                              <div className="flex items-center justify-between"><span>Subtotale</span><span>{currency.format(Number(o.subtotal || 0))}</span></div>
                              {o.delivery_fee !== null && (
                                <div className="flex items-center justify-between"><span>Consegna</span><span>{currency.format(Number(o.delivery_fee || 0))}</span></div>
                              )}
                              {o?.discount && Number(o.discount) > 0 && (
                                <div className="flex items-center justify-between text-green-700"><span>Sconto</span><span>-{currency.format(Number(o.discount || 0))}</span></div>
                              )}
                              <div className="flex items-center justify-between font-semibold text-sm md:text-base mt-1"><span>Totale</span><span>{currency.format(Number(o.total || 0))}</span></div>
                              <div className="flex items-center justify-between font-semibold text-sm md:text-base mt-1"><span>Totale pagato</span><span>{currency.format(Number((o.total_paid ?? o.total) || 0))}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Cronologia ordini */}
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-white mb-3">Cronologia ordini</h2>
              {historyOrders.length === 0 ? (
                <div className="rounded-xl bg-white text-neutral-gray-700 p-5">Nessun ordine passato</div>
              ) : (
                <div className="rounded-xl bg-white text-black divide-y divide-neutral-gray-200">
                  {historyOrders.map((o) => {
                    const isOpen = !!expanded[o.id];
                    return (
                      <div key={o.id} className="p-4 overflow-hidden break-words">
                        {/* Preview cliccabile */}
                        <button
                          type="button"
                          className="w-full flex items-start justify-between gap-4 text-left break-words relative"
                          onClick={() => setExpanded((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                          aria-expanded={isOpen}
                        >
                          <div className="flex flex-col gap-1">
                            {/* Giorno + Orario di consegna/ritiro */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-gray-800">
                              <Clock className="w-4 h-4" />
                              <span className="font-semibold">{formatDate(o.created_at)}</span>
                              <span className="font-semibold">{o.mode === 'delivery' ? 'Orario di consegna:' : 'Orario di ritiro:'}</span>
                              <span className="font-semibold">{(o.mode === 'delivery' ? o.delivery_time : o.pickup_time) || '-'}</span>
                            </div>
                            {/* ID ordine tra data/ora e domicilio/asporto */}
                            <div className="flex items-center gap-2 text-xs text-neutral-gray-800">
                              <span className="font-semibold">ID</span>
                              <span className="font-mono whitespace-nowrap">{o.id}</span>
                            </div>
                            {/* Domicilio/Asporto con icona */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-gray-800">
                              {o.mode === 'delivery' ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                              <span className="font-semibold">{o.mode === 'delivery' ? 'Domicilio' : 'Asporto'}</span>
                            </div>
                            {/* Metodo di pagamento con icona dal checkout */}
                            <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-gray-800">
                              {o.payment_method === 'online' ? (
                                <img src="/carta.svg" alt="Pagamento online con carta" className="w-5 h-5" />
                              ) : o.payment_method === 'cash' ? (
                                <img src="/contanti.svg" alt="Pagamento in contanti" className="w-5 h-5" />
                              ) : (
                                <CreditCard className="w-4 h-4" />
                              )}
                              <span className="font-semibold">
                                {o.payment_method
                                  ? o.payment_method === 'online'
                                    ? 'Online'
                                    : o.payment_method === 'cash'
                                    ? 'Contanti'
                                    : o.payment_method
                                  : o.mode === 'pickup'
                                  ? 'Pagamento al ritiro'
                                  : 'Pagamento alla consegna'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm md:text-base font-semibold">{currency.format(Number((o.total_paid ?? o.total) || 0))}</div>
                            {isOpen ? <ChevronUp className="w-5 h-5 hidden md:block" /> : <ChevronDown className="w-5 h-5 hidden md:block" />}
                          </div>
                          {/* Chevron mobile in basso a destra (uguale al PC) */}
                          <ChevronDown className={`md:hidden absolute bottom-2 right-2 w-5 h-5 text-neutral-gray-700 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
                        </button>

                        {/* Dettagli espansi */}
                        <div
                          className={`overflow-hidden transform-gpu origin-bottom transition-all duration-500 ease-in-out ${isOpen ? 'mt-3 opacity-100 translate-y-0 max-h-[70vh] pointer-events-auto' : 'mt-0 opacity-0 translate-y-2 max-h-0 pointer-events-none'}`}
                          aria-hidden={!isOpen}
                        >
                          <div className="bg-neutral-gray-100 rounded-lg p-4 break-words">
                            <div className="grid md:grid-cols-3 gap-4">
                              {/* Dati cliente */}
                              <div>
                                <h3 className="text-sm md:text-base font-semibold mb-2">Dati cliente</h3>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Nome:</span> {o.user_first_name || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Cognome:</span> {o.user_last_name || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Telefono:</span> {o.phone || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Email:</span> {o.user_email || '-'}</div>
                              </div>

                              {/* Dati Ordine */}
                              <div>
                                <h3 className="text-sm md:text-base font-semibold mb-2">Dati Ordine</h3>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Via:</span> {o.address || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">CAP:</span> {o.cap || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Scala:</span> {o.staircase || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Piano:</span> {o.floor || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Citofono:</span> {o.buzzer || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Orario di consegna/ritiro:</span> {(o.mode === 'delivery' ? o.delivery_time : o.pickup_time) || '-'}</div>
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Metodo di consegna:</span> {o.mode === 'delivery' ? 'Consegna' : 'Asporto'}</div>
                              <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Metodo di pagamento:</span> {o.payment_method || (o.mode === 'pickup' ? 'Pagamento al ritiro' : 'Pagamento alla consegna')}</div>
                              {o.notes_rider && (
                                <div className="text-xs md:text-sm"><span className="text-neutral-gray-700">Note per il rider:</span> {o.notes_rider}</div>
                              )}
                              </div>

                              {/* Dati prodotti */}
                              <div>
                                <h3 className="text-sm md:text-base font-semibold mb-2">Dati prodotti</h3>
                                <ul className="text-xs md:text-sm space-y-1">
                                  {o.items && o.items.length > 0 ? (
                                    o.items.map((it, idx) => (
                                      <li key={`${o.id}-${idx}`} className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium">{it.product_name}</div>
                                          {sizeToLabel(it.size) ? (
                                            <div className="text-neutral-gray-700">Tipologia: {sizeToLabel(it.size)} • Quantità: {it.quantity}</div>
                                          ) : (
                                            <div className="text-neutral-gray-700">Quantità: {it.quantity}</div>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div>Unitario: {currency.format(Number(it.unit_price || 0))}</div>
                                          <div className="font-semibold">Totale: {currency.format(Number(it.total_price || 0))}</div>
                                        </div>
                                      </li>
                                    ))
                                  ) : (
                                    <li>-</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                            {/* Totali ordine */}
                            <div className="mt-3 border-t pt-3 text-xs md:text-sm">
                              <div className="flex items-center justify-between"><span>Subtotale</span><span>{currency.format(Number(o.subtotal || 0))}</span></div>
                              {o.delivery_fee !== null && (
                                <div className="flex items-center justify-between"><span>Consegna</span><span>{currency.format(Number(o.delivery_fee || 0))}</span></div>
                              )}
                              {o?.discount && Number(o.discount) > 0 && (
                                <div className="flex items-center justify-between text-green-700"><span>Sconto</span><span>-{currency.format(Number(o.discount || 0))}</span></div>
                              )}
                              <div className="flex items-center justify-between font-semibold text-sm md:text-base mt-1"><span>Totale</span><span>{currency.format(Number(o.total || 0))}</span></div>
                              <div className="flex items-center justify-between font-semibold text-sm md:text-base mt-1"><span>Totale pagato</span><span>{currency.format(Number((o.total_paid ?? o.total) || 0))}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'dishes' && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-white">Piatti</h2>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-primary-orange text-white hover:opacity-90 flex items-center gap-2"
                onClick={openCreateDish}
              >
                <Plus className="w-4 h-4" /> Aggiungi nuovo piatto
              </button>
            </div>
            {/* Griglia card piatti */}
            {dishes.length === 0 ? (
              <div className="rounded-xl bg-white text-neutral-gray-700 p-5">Nessun piatto presente</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dishes.map((d) => (
                  <div key={d.id} className="rounded-xl text-black p-4 border border-neutral-gray-200 shadow-soft md:bg-white">
                    {/* Raffigurazione mobile come card del Menu */}
                    <div className={`md:hidden menu-card ${!d.image ? 'no-image' : ''}`}>
                      {d.image ? (
                        <div className="image_container">
                          <img src={d.image} alt={d.name} className="image" loading="lazy" />
                        </div>
                      ) : null}
                      <div className="content">
                        <div className="title-row">
                          <div className="title"><span>{d.name}</span></div>
                        </div>
                        {d.description && (
                          <div className="size"><span className="opacity-80">{d.description}</span></div>
                        )}
                    {Array.isArray(d.allergens) && d.allergens.length > 0 && (
                      <div className="size">
                        <span>Allergeni</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {d.allergens.map((a) => (
                            <img key={a} src={`/allergeni/${a}.png`} alt={a} className="w-5 h-5" />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Azioni mobile sotto la descrizione */}
                    <div className="mt-3 flex items-center gap-2 md:hidden">
                      <button type="button" className="px-2 py-1 rounded-md bg-neutral-gray-200 hover:bg-neutral-gray-300 flex items-center gap-1" onClick={() => openEditDish(d)}>
                        <Pencil className="w-4 h-4" /> Modifica
                      </button>
                      <button type="button" className="px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1" onClick={() => setDeleteTarget(d)}>
                        <Trash2 className="w-4 h-4" /> Elimina
                      </button>
                    </div>
                  </div>
                </div>

                    {/* Raffigurazione desktop originale */}
                    {d.image ? (
                      <img src={d.image} alt={d.name} className="w-full h-32 object-cover rounded-lg mb-3 hidden md:block" />
                    ) : (
                      <div className="w-full h-32 rounded-lg mb-3 bg-neutral-gray-100 flex items-center justify-center text-neutral-gray-600 text-sm hidden md:flex">
                        Nessuna immagine
                      </div>
                    )}

                    {/* Informazioni e azioni */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="hidden md:block">
                        <div className="text-base font-semibold">{d.name}</div>
                        <div className="text-sm text-neutral-gray-700">{d.category || '-'}</div>
                        {Array.isArray(d.allergens) && d.allergens.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {d.allergens.map((a) => (
                              <img key={a} src={`/allergeni/${a}.png`} alt={a} className="w-4 h-4" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="hidden md:flex items-center gap-2">
                        <button type="button" className="px-2 py-1 rounded-md bg-neutral-gray-200 hover:bg-neutral-gray-300 flex items-center gap-1" onClick={() => openEditDish(d)}>
                          <Pencil className="w-4 h-4" /> Modifica
                        </button>
                        <button type="button" className="px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1" onClick={() => setDeleteTarget(d)}>
                          <Trash2 className="w-4 h-4" /> Elimina
                        </button>
                      </div>
                    </div>

                    {/* Prezzi */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-md bg-neutral-gray-100 p-2 text-right">
                        <div className="text-neutral-gray-700">Pinsa</div>
                        <div className="font-semibold">{d.price_pinsa != null ? currency.format(Number(d.price_pinsa || 0)) : '-'}</div>
                      </div>
                      <div className="rounded-md bg-neutral-gray-100 p-2 text-right">
                        <div className="text-neutral-gray-700">Tonda</div>
                        <div className="font-semibold">{d.price_tonda != null ? currency.format(Number(d.price_tonda || 0)) : '-'}</div>
                      </div>
                      <div className="rounded-md bg-neutral-gray-100 p-2 text-right">
                        <div className="text-neutral-gray-700">Pala</div>
                        <div className="font-semibold">{d.price_pala != null ? currency.format(Number(d.price_pala || 0)) : '-'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-3">Utenti</h2>
            <div className="rounded-xl bg-white text-black overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-gray-100 text-neutral-gray-800">
                  <tr>
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">Cognome</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Creato il</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{u.first_name}</td>
                      <td className="p-3">{u.last_name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{formatDateTime(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'stats' && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-3">Statistiche</h2>
            {/* Conteggi ordini: sempre e oggi (ordine richiesto) */}
            <h3 className="text-lg font-semibold text-white mb-2">ordini</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Ordini <span className="font-bold">domicilio</span> (sempre)</div>
                <div className="text-2xl font-bold">{deliveryOrdersAllCount}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Ordini <span className="font-bold">domicilio</span> (oggi)</div>
                <div className="text-2xl font-bold">{deliveryOrdersTodayCount}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Ordini <span className="font-bold">asporto</span> (sempre)</div>
                <div className="text-2xl font-bold">{pickupOrdersAllCount}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Ordini <span className="font-bold">asporto</span> (oggi)</div>
                <div className="text-2xl font-bold">{pickupOrdersTodayCount}</div>
              </div>
            </div>

            {/* Ricavi */}
            <h3 className="text-lg font-semibold text-white mb-2">guadagno</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Guadagno del giorno</div>
                <div className="text-2xl font-bold">{currency.format(revenueToday)}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Guadagno della settimana</div>
                <div className="text-2xl font-bold">{currency.format(revenueWeek)}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Guadagno del mese</div>
                <div className="text-2xl font-bold">{currency.format(revenueMonth)}</div>
              </div>
            </div>

            {/* Utenti */}
            <h3 className="text-lg font-semibold text-white mb-2 mt-4">utenti</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Utenti totali</div>
                <div className="text-2xl font-bold">{users.length}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Nuovi utenti oggi</div>
                <div className="text-2xl font-bold">{newUsersToday}</div>
              </div>
              <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                <div className="text-sm text-neutral-gray-700">Utenti abituali (≥ 2 ordini)</div>
                <div className="text-2xl font-bold">{habitualUsersCount}</div>
              </div>
            </div>

            {/* Piatti più ordinati del mese */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-2">Piatti più ordinati (mese corrente)</h3>
              {topDishesMonth.length === 0 ? (
                <div className="rounded-xl bg-white text-neutral-gray-700 p-5">Nessun ordine nel mese</div>
              ) : (
                <div className="rounded-xl bg-white text-black p-4 border border-neutral-gray-200">
                  <ul className="divide-y divide-neutral-gray-200">
                    {topDishesMonth.map(([name, qty]) => (
                      <li key={name} className="py-2 flex items-center justify-between">
                        <span className="font-medium">{name}</span>
                        <span className="text-neutral-gray-800">× {qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Overlay form piatto: sopra la pagina */}
      {showDishForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}
          aria-modal="true"
          role="dialog"
          onClick={closeDishForm}
        >
          <div className="w-[90%] max-w-lg mx-4 rounded-2xl bg-white text-black border border-neutral-gray-200 shadow-soft max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{editingDish ? 'Modifica piatto' : 'Nuovo piatto'}</h3>
                {dishFormLoading && <DotSpinner size="1.8rem" />}
              </div>
              <button type="button" className="text-neutral-gray-700 hover:text-black" onClick={closeDishForm}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {dishFormError && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-3 text-sm">{dishFormError}</div>
              )}
              <form onSubmit={submitDishForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-gray-700 mb-1">Nome *</label>
                  <input value={dishForm.name} onChange={(e) => onDishFormChange('name', e.target.value)} className="w-full rounded-lg border border-neutral-gray-300 p-2" placeholder="Nome piatto" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-gray-700 mb-1">Categoria</label>
                  <input value={dishForm.category} onChange={(e) => onDishFormChange('category', e.target.value)} className="w-full rounded-lg border border-neutral-gray-300 p-2" placeholder="Categoria" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-gray-700 mb-1">Descrizione</label>
                  <textarea value={dishForm.description} onChange={(e) => onDishFormChange('description', e.target.value)} className="w-full rounded-lg border border-neutral-gray-300 p-2" placeholder="Descrizione" rows={3}></textarea>
                </div>
                <div>
                  <label className="block text-sm text-neutral-gray-700 mb-1">Prezzo Pinsa (€)</label>
                  <input type="number" step="0.01" value={dishForm.price_pinsa} onChange={(e) => onDishFormChange('price_pinsa', e.target.value)} className="w-full rounded-lg border border-neutral-gray-300 p-2" placeholder="es. 7.50" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-gray-700 mb-1">Prezzo Tonda (€)</label>
                  <input type="number" step="0.01" value={dishForm.price_tonda} onChange={(e) => onDishFormChange('price_tonda', e.target.value)} className="w-full rounded-lg border border-neutral-gray-300 p-2" placeholder="es. 8.00" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-gray-700 mb-1">Prezzo Pala (€)</label>
                  <input type="number" step="0.01" value={dishForm.price_pala} onChange={(e) => onDishFormChange('price_pala', e.target.value)} className="w-full rounded-lg border border-neutral-gray-300 p-2" placeholder="es. 18.00" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-gray-700 mb-1">Immagine</label>
                  {dishForm.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-neutral-gray-300">
                      <img src={dishForm.image} alt="Anteprima immagine piatto" className="w-full h-40 object-cover" />
                      <button type="button" className="absolute top-2 right-2 p-2 rounded-lg bg-white/80 hover:bg-white shadow-soft" onClick={clearDishImage} aria-label="Rimuovi immagine">
                        <X className="w-5 h-5 text-neutral-gray-700" />
                      </button>
                    </div>
                  ) : (
                    <form className="file-upload-form" onSubmit={(e) => e.preventDefault()}>
                      <label className="file-upload-label" htmlFor="dish-file">
                        <div className="file-upload-design">
                          <svg height="1em" viewBox="0 0 640 512" aria-hidden="true" focusable="false">
                            <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-217c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l39-39V392c0 13.3 10.7 24 24 24s24-10.7 24-24V257.9l39 39c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-80-80c-9.4-9.4-24.6-9.4-33.9 0l-80 80z"></path>
                          </svg>
                          <p>Drag and Drop</p>
                          <p>or</p>
                          <span className="browse-button">Browse file</span>
                        </div>
                        <input type="file" id="dish-file" accept="image/*" onChange={(e) => onDishImageSelected(e.target.files)} disabled={dishFormLoading} />
                      </label>
                    </form>
                  )}
                </div>
                {/* Sezione allergeni */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-neutral-gray-700 mb-1">Allergeni</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALLERGENS.map(({ id, label }) => {
                      const checked = dishForm.allergens.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2 rounded-lg border border-neutral-gray-300 p-2 cursor-pointer hover:bg-neutral-gray-50">
                          <input type="checkbox" checked={checked} onChange={() => toggleDishAllergen(id)} className="w-4 h-4" />
                          <img src={`/allergeni/${id}.png`} alt={label} className="w-5 h-5" />
                          <span className="text-sm">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center gap-2 mt-2">
                  <button type="submit" disabled={dishFormLoading} className="px-3 py-2 rounded-lg bg-primary-orange text-white hover:opacity-90 disabled:opacity-60">
                    {editingDish ? 'Salva modifiche' : 'Crea piatto'}
                  </button>
                  <button type="button" className="px-3 py-2 rounded-lg bg-neutral-gray-200 text-black hover:bg-neutral-gray-300" onClick={closeDishForm}>Annulla</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Overlay conferma eliminazione */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(128, 128, 128, 0.5)' }}
          aria-modal="true"
          role="dialog"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="w-[90%] max-w-md mx-4 rounded-2xl bg-white text-black border border-neutral-gray-200 shadow-soft max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-red-700">Conferma eliminazione</h3>
                {deleteLoading && <DotSpinner size="1.8rem" />}
              </div>
              <button type="button" className="text-neutral-gray-700 hover:text-black" onClick={() => setDeleteTarget(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-neutral-gray-800 mb-3">Stai per eliminare il piatto:</p>
              <div className="rounded-md bg-neutral-gray-100 p-3 mb-3">
                <div className="font-semibold">{deleteTarget.name}</div>
                <div className="text-sm text-neutral-gray-700">{deleteTarget.category || '-'}</div>
              </div>
              {deleteError && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-3 text-sm">{deleteError}</div>
              )}
              <div className="flex items-center gap-2">
                <button type="button" disabled={deleteLoading} onClick={confirmDeleteDish} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">Conferma eliminazione</button>
                <button type="button" className="px-3 py-2 rounded-lg bg-neutral-gray-200 text-black hover:bg-neutral-gray-300" onClick={() => setDeleteTarget(null)}>Annulla</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
  // Definizioni allergeni disponibili (id corrisponde al nome file sotto /allergeni)
  const ALLERGENS: { id: string; label: string }[] = [
    { id: 'arachidi', label: 'Arachidi' },
    { id: 'crostacei', label: 'Crostacei' },
    { id: 'glutine', label: 'Glutine' },
    { id: 'latte', label: 'Latte' },
    { id: 'lupini', label: 'Lupini' },
    { id: 'molluschi', label: 'Molluschi' },
    { id: 'pesce', label: 'Pesce' },
    { id: 'fruttaaguscio', label: 'Frutta a guscio' },
    { id: 'sedano', label: 'Sedano' },
    { id: 'semidisesamo', label: 'Semi di sesamo' },
    { id: 'senape', label: 'Senape' },
    { id: 'soia', label: 'Soia' },
    { id: 'solfiti', label: 'Solfiti' },
    { id: 'uova', label: 'Uova' },
  ];
