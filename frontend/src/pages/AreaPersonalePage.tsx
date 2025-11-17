import React, { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../lib/api';
import { ChevronDown, ChevronUp, Clock, CreditCard, ShoppingBag } from 'lucide-react';

interface AreaPersonalePageProps {
  userId: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

type OrderItem = {
  product_id: string;
  product_name: string;
  size: 'slice' | 'half' | 'full' | string;
  quantity: number;
  extras: { id?: string; name: string; price: number }[];
  unit_price: number;
  total_price: number;
};

  type Order = {
    id: string;
    created_at: string;
    user_id: string | null;
    phone: string;
    mode: 'delivery' | 'pickup' | string;
    address: string | null;
    cap: string | null;
    staircase: string | null;
    floor: string | null;
    buzzer: string | null;
    delivery_time: string | null;
    pickup_name: string | null;
    pickup_time: string | null;
    notes_rider: string | null;
    payment_method: string | null;
    subtotal: number | null;
    delivery_fee: number | null;
    total: number | null;
    discount?: number | null;
    total_paid?: number | null;
    items: OrderItem[];
  };

const AreaPersonalePage: React.FC<AreaPersonalePageProps> = ({ userId, onNavigate, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; first_name: string; last_name: string; email: string; is_admin?: boolean } | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const currency = useMemo(() => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }), []);
  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  };
  const sizeToLabel = (s: string) => (s === 'slice' ? 'Pinsa' : s === 'half' ? 'Tonda' : s === 'full' ? 'Pala' : '');

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        // Utente non autenticato: gestiamo il messaggio direttamente in UI
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(apiUrl(`auth/user?id=${encodeURIComponent(userId)}`));
        const json = await resp.json();
        if (json.ok) {
          setUser(json.user);
        } else {
          setError(json.error || 'Impossibile caricare i dati utente');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const resp = await fetch(apiUrl(`orders?user_id=${encodeURIComponent(userId)}`));
        const json = await resp.json();
        if (json.ok) {
          setOrders(Array.isArray(json.orders) ? json.orders : []);
        } else {
          setOrdersError(json.error || 'Impossibile caricare lo storico ordini');
        }
      } catch (e: any) {
        setOrdersError(e.message);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [userId]);

  const isAdmin = !!user?.is_admin;

  return (
    <div className="min-h-[60vh] flex items-start justify-center px-3 py-6 md:p-6">
      <div className="w-full md:max-w-4xl md:bg-black md:border md:border-neutral-gray-800 md:rounded-2xl md:shadow-soft px-1 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-white">Area Personale</h1>
        <div className="flex items-center gap-2">
          {user && isAdmin && (
            <button
              className="px-3 py-2 rounded-lg bg-primary-orange text-white hover:opacity-90"
              onClick={() => onNavigate('admin')}
            >
              Pannello Admin
            </button>
          )}
          {user && (
            <button
              className="px-3 py-2 rounded-lg bg-white text-black hover:bg-neutral-gray-100"
              onClick={onLogout}
            >
              Logout
            </button>
          )}
          <button
            className="px-3 py-2 rounded-lg bg-neutral-gray-800 text-white hover:bg-neutral-gray-700"
            onClick={() => onNavigate('home')}
          >
            Home
            </button>
          </div>
        </div>
        {(!userId) && (
          <div className="text-white text-center py-10">
            <p className="text-lg">
              Non ti sei ancora <span className="font-bold">registrato</span> o non hai effettuato l'<span className="font-bold">accesso</span>.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                className="px-5 py-2 rounded-md bg-white text-black border border-black hover:bg-neutral-gray-100"
                onClick={() => onNavigate('register')}
              >
                Registrati
              </button>
              <button
                className="px-5 py-2 rounded-md bg-white text-black border border-black hover:bg-neutral-gray-100"
                onClick={() => onNavigate('loginregister')}
              >
                Accedi
              </button>
            </div>
          </div>
        )}
        {loading && <p className="text-white">Caricamento dati...</p>}
        {!!error && userId && (
          <div className="text-red-400">{error}</div>
        )}
        {!loading && !error && user && (
          <div className="space-y-6">
            {/* Dati utente */}
            <div className="rounded-xl bg-white text-black p-6 -mx-1 md:mx-0">
              <div className="mb-3">
                <div className="text-sm text-neutral-gray-700">Nome</div>
                <div className="text-lg font-medium">{user.first_name}</div>
              </div>
              <div className="mb-3">
                <div className="text-sm text-neutral-gray-700">Cognome</div>
                <div className="text-lg font-medium">{user.last_name}</div>
              </div>
              <div className="mb-1">
                <div className="text-sm text-neutral-gray-700">Email</div>
                <div className="text-lg font-medium">{user.email}</div>
              </div>
            </div>

            {/* Storico ordini */}
            <div className="rounded-xl bg-white text-black p-6 -mx-1 md:mx-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Storico ordini
                </h2>
              </div>

              {ordersLoading && <p>Caricamento ordini...</p>}
              {ordersError && <div className="text-red-600">{ordersError}</div>}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <p>Nessun ordine trovato.</p>
              )}

              {!ordersLoading && !ordersError && orders.length > 0 && (
                <div className="divide-y-2 divide-neutral-gray-300">
                  {orders.map((o) => {
                    const isOpen = !!expanded[o.id];
                    const itemsCount = o.items?.reduce((sum: number, it: OrderItem) => sum + (it.quantity || 0), 0) || 0;
                    return (
                      <div key={o.id} className="py-3">
                        {/* Riga preview (mobile e desktop separati) */}
                        <button
                          className="w-full text-left flex items-start justify-between gap-4"
                          onClick={() => setExpanded((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                        >
                          {/* Mobile layout: elementi su righe separate, pagamento e prezzo sulla stessa riga */}
                          <div className="md:hidden w-full">
                            <div className="text-sm text-neutral-gray-700 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{formatDateTime(o.created_at)}</span>
                            </div>
                            <div className="text-sm text-neutral-gray-700">Ordine: <span className="font-mono break-all">{o.id}</span></div>
                            <div className="text-sm text-neutral-gray-700">Modalità: <span className="font-medium">{o.mode === 'delivery' ? 'Consegna' : 'Asporto'}</span></div>
                            <div className="text-sm text-neutral-gray-700">Articoli: <span className="font-medium">{itemsCount}</span></div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="text-sm text-neutral-gray-700 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                <span>{o.payment_method ? o.payment_method : (o.mode === 'pickup' ? 'Pagamento al ritiro' : 'Pagamento alla consegna')}</span>
                              </div>
                              {o?.discount && Number(o.discount) > 0 ? (
                                <div className="text-base font-semibold flex items-center gap-2">
                                  <span className="line-through text-neutral-gray-500">{currency.format(Number(o.total || 0))}</span>
                                  <span className="text-green-700">{currency.format(Number((o.total_paid ?? o.total) || 0))}</span>
                                </div>
                              ) : (
                                <div className="text-base font-semibold">{currency.format(Number((o.total_paid ?? o.total) || 0))}</div>
                              )}
                            </div>
                          </div>

                          {/* Icona chevron su mobile */}
                          <div className="md:hidden flex items-center ml-2">
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>

                          {/* Desktop layout: struttura originale */}
                          <div className="hidden md:flex md:items-center md:gap-6">
                            <div className="text-sm text-neutral-gray-700 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{formatDateTime(o.created_at)}</span>
                            </div>
                            <div className="text-sm text-neutral-gray-700">Ordine: <span className="font-mono break-all">{o.id}</span></div>
                            <div className="text-sm text-neutral-gray-700">Modalità: <span className="font-medium">{o.mode === 'delivery' ? 'Consegna' : 'Asporto'}</span></div>
                            <div className="text-sm text-neutral-gray-700">Articoli: <span className="font-medium">{itemsCount}</span></div>
                            <div className="text-sm text-neutral-gray-700 flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              <span>{o.payment_method ? o.payment_method : (o.mode === 'pickup' ? 'Pagamento al ritiro' : 'Pagamento alla consegna')}</span>
                            </div>
                          </div>
                          <div className="hidden md:flex items-center gap-4">
                            {o?.discount && Number(o.discount) > 0 ? (
                              <div className="text-base font-semibold flex items-center gap-2">
                                <span className="line-through text-neutral-gray-500">{currency.format(Number(o.total || 0))}</span>
                                <span className="text-green-700">{currency.format(Number((o.total_paid ?? o.total) || 0))}</span>
                              </div>
                            ) : (
                              <div className="text-base font-semibold">{currency.format(Number((o.total_paid ?? o.total) || 0))}</div>
                            )}
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </button>

                        {/* Sezione dettagli con transizione a tendina dal basso */}
                        <div
                          className={`overflow-hidden transform-gpu origin-bottom transition-all duration-500 ease-in-out ${
                            isOpen ? 'mt-3 opacity-100 translate-y-0 max-h-[70vh] pointer-events-auto' : 'mt-0 opacity-0 translate-y-2 max-h-0 pointer-events-none'
                          }`}
                          aria-hidden={!isOpen}
                        >
                          <div className="bg-neutral-gray-100 rounded-lg p-4 -mx-2 md:mx-0">
                            <div className="grid md:grid-cols-3 gap-4">
                              {/* Riepilogo logistica */}
                              <div className="space-y-1 text-sm">
                                <div className="font-semibold">Dettagli ordine</div>
                                <div>
                                  <span className="text-neutral-gray-700">Modalità:</span> {o.mode === 'delivery' ? 'Consegna' : 'Asporto'}
                                </div>
                                {o.mode === 'delivery' ? (
                                  <div className="space-y-1">
                                    <div><span className="text-neutral-gray-700">Indirizzo:</span> {o.address || '-'}{o.cap ? `, ${o.cap}` : ''}</div>
                                    <div><span className="text-neutral-gray-700">Citofono:</span> {o.buzzer || '-'}</div>
                                    <div><span className="text-neutral-gray-700">Scala/Piano:</span> {[o.staircase, o.floor].filter(Boolean).join(' / ') || '-'}</div>
                                    <div><span className="text-neutral-gray-700">Orario consegna:</span> {o.delivery_time || '-'}</div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div><span className="text-neutral-gray-700">Nome ritiro:</span> {o.pickup_name || '-'}</div>
                                    <div><span className="text-neutral-gray-700">Orario ritiro:</span> {o.pickup_time || '-'}</div>
                                  </div>
                                )}
                                <div><span className="text-neutral-gray-700">Telefono:</span> {o.phone}</div>
                                {o.notes_rider && (
                                  <div><span className="text-neutral-gray-700">Note:</span> {o.notes_rider}</div>
                                )}
                              </div>

                              {/* Articoli */}
                              <div className="md:col-span-2">
                                <div className="font-semibold mb-2">Articoli</div>
                                <div className="space-y-3">
                                  {o.items?.map((it, idx) => (
                                    <div key={`${o.id}-${idx}`} className="bg-white rounded-md p-3 border border-neutral-gray-200">
                                      <div className="flex items-start justify-between gap-4">
                                        <div>
                                          <div className="font-medium">{it.product_name}</div>
                                          <div className="text-sm text-neutral-gray-700">{sizeToLabel(it.size) ? `${sizeToLabel(it.size)} · ` : ''}x{it.quantity}</div>
                                          {it.extras && it.extras.length > 0 && (
                                            <div className="text-xs text-neutral-gray-600 mt-1">
                                              Extra: {it.extras.map((e) => `${e.name} (${currency.format(Number(e.price || 0))})`).join(', ')}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm text-neutral-gray-700">Unitario: {currency.format(Number(it.unit_price || 0))}</div>
                                          <div className="font-semibold">Totale: {currency.format(Number(it.total_price || 0))}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Totali */}
                                <div className="mt-4 border-t pt-3 text-sm">
                                  <div className="flex items-center justify-between"><span>Subtotale</span><span>{currency.format(Number(o.subtotal || 0))}</span></div>
                                  {o.delivery_fee !== null && (
                                    <div className="flex items-center justify-between"><span>Consegna</span><span>{currency.format(Number(o.delivery_fee || 0))}</span></div>
                                  )}
                                  {o?.discount && Number(o.discount) > 0 && (
                                    <div className="flex items-center justify-between text-green-700"><span>Sconto</span><span>-{currency.format(Number(o.discount || 0))}</span></div>
                                  )}
                                  <div className="flex items-center justify-between font-semibold text-base mt-1"><span>Totale</span><span>{currency.format(Number((o.total_paid ?? o.total) || 0))}</span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaPersonalePage;
