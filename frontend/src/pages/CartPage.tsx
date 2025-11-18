import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, PaymentRequestButtonElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { apiUrl } from '../lib/api';

// Inizializza Stripe con la chiave pubblicabile dal .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Wrapper Elements per fornire contesto Stripe
const StripeElementsWrapper: React.FC<{ clientSecret: string; children: React.ReactNode }> = ({ clientSecret, children }) => {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      {children}
    </Elements>
  );
};

// Sezione di checkout Stripe con PaymentElement e conferma
const StripeCheckoutSection: React.FC<{
  processing: boolean;
  setProcessing: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  onSuccess: () => Promise<void> | void;
  clientSecret: string;
  amountCents: number;
}> = ({ processing, setProcessing, error, setError, onSuccess, clientSecret, amountCents }) => {
  const stripe = useStripe();
  const elements = useElements();

  // Payment Request (Apple Pay / Google Pay) setup
  const [pr, setPr] = useState<any>(null);
  const [prReady, setPrReady] = useState(false);

  useEffect(() => {
    if (!stripe || !amountCents || amountCents <= 0) return;
    const paymentRequest = stripe.paymentRequest({
      country: 'IT',
      currency: 'eur',
      total: { label: 'Pizzeria Spartaco', amount: amountCents },
      requestPayerName: true,
      requestPayerEmail: true,
    });
    paymentRequest.canMakePayment().then((result) => {
      if (result) {
        setPr(paymentRequest);
        setPrReady(true);
      } else {
        setPr(null);
        setPrReady(false);
      }
    });
  }, [stripe, amountCents]);

  useEffect(() => {
    if (!pr || !stripe || !clientSecret) return;
    const handler = async (ev: any) => {
      setProcessing(true);
      setError(null);
      try {
        // Con Payment Request Button confermiamo il PaymentIntent usando confirmCardPayment
        // passando l'id del payment method ricevuto dall'evento.
        const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: ev.paymentMethod.id,
          }
        );
        if (confirmErr) {
          ev.complete('fail');
          setError(confirmErr.message || 'Pagamento non riuscito');
        } else {
          ev.complete('success');
          if (paymentIntent && paymentIntent.status === 'succeeded') {
            await onSuccess();
          }
        }
      } catch (e: any) {
        ev.complete('fail');
        setError(e?.message || 'Errore durante il pagamento');
      } finally {
        setProcessing(false);
      }
    };
    pr.on('paymentmethod', handler);
    return () => {
      try { pr.off('paymentmethod', handler); } catch (_) {}
    };
  }, [pr, stripe, clientSecret, onSuccess, setProcessing, setError]);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    try {
      const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (stripeErr) {
        setError(stripeErr.message || 'Pagamento non riuscito');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await onSuccess();
      } else {
        setError('Pagamento non completato');
      }
    } catch (e: any) {
      setError(e?.message || 'Errore durante il pagamento');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {prReady && pr && (
        <div>
          <PaymentRequestButtonElement
            options={{
              paymentRequest: pr,
              style: { paymentRequestButton: { theme: 'dark', height: '48px' } },
            }}
          />
        </div>
      )}
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={handlePay} disabled={processing || !stripe || !elements}>
          {processing ? 'Elaborazione…' : 'Paga ora'}
        </button>
      </div>
    </div>
  );
};
import { Trash2, Plus, Minus, ShoppingBag, Truck, Package, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
// import LoadingForm from '../components/LoadingForm'; // non utilizzato
// Rimosso Autocomplete: input semplice

interface CartPageProps {
  onNavigate: (page: string) => void;
  onOpenRegisterModal?: () => void;
  isLoggedIn?: boolean;
}

const CartPage: React.FC<CartPageProps> = ({ onNavigate, onOpenRegisterModal, isLoggedIn }) => {
  const {
    items,
    deliveryInfo,
    setDeliveryInfo,
    removeItem,
    updateQuantity,
    getSubtotal,
    getDeliveryFee,
    getTotal,
    clearCart,
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [address, setAddress] = useState('');
  const [cap, setCap] = useState('');
  const [floor, setFloor] = useState('');
  const [buzzer, setBuzzer] = useState('');
  const [staircase, setStaircase] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  // Messaggio di errore globale per campi obbligatori non compilati (domicilio)
  const [requiredFieldsError, setRequiredFieldsError] = useState<string | null>(null);
  // Tastierino numerico asporto rimosso (non necessario nel nuovo percorso)
  // Passo corrente del checkout (1: Consegna, 2: Pagamento, 3: Riepilogo)
  const [checkoutStep, setCheckoutStep] = useState(1);
  // Flag di tentativo submit per mostrare errori/asterischi
  const [deliveryAttempted, setDeliveryAttempted] = useState(false);
  const [pickupAttempted, setPickupAttempted] = useState(false);
  // Metodo di pagamento selezionato nello step 2
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | ''>('');
  // Stripe: stato pannello e intent
  const [showStripePanel, setShowStripePanel] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeProcessing, setStripeProcessing] = useState(false);
  const [stripePaidSuccess, setStripePaidSuccess] = useState(false);
  // Flag per validazione metodo di pagamento nello step 2 (domicilio)
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  // Vista unica: mostra la sezione "Riepilogo ordine" su richiesta
  const [showReview, setShowReview] = useState(false);
  // Stato conferma ordine
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // Loading transitorio prima di passare alla pagina successiva
  const [transitionLoading, setTransitionLoading] = useState(false);
  // Riepilogo ultimo ordine confermato (per la card di successo)
  const [lastOrder, setLastOrder] = useState<null | {
    id: number | string | null;
    items: Array<{
      product_id: number | string;
      product_name: string;
      size: 'slice' | 'half' | 'full' | '' | string;
      quantity: number;
      extras: Array<{ id: number | string; name: string; price: number }>;
      unit_price: number;
      total_price: number;
    }>;
    subtotal: number;
    delivery_fee: number;
    discount: number;
    total: number;
    total_paid: number;
    mode: 'delivery' | 'pickup' | string;
    address: string | null;
    cap: string | null;
    staircase: string | null;
    floor: string | null;
    buzzer: string | null;
    email: string | null;
    delivery_time: string | null;
    pickup_name: string | null;
    pickup_time: string | null;
    payment_method: 'cash' | 'online' | '' | string | null;
    email_sent?: boolean;
  }>(null);
  // Rimosso progressRef: niente più scroll automatico tra step

  // Orari di fallback: dalle 19:00 alle 22:00 ogni 20 minuti
  const DEFAULT_TIME_SLOTS = [
    '19:00',
    '19:20',
    '19:40',
    '20:00',
    '20:20',
    '20:40',
    '21:00',
    '21:20',
    '21:40',
    '22:00',
  ];
  // Slot dinamici dal backend (Supabase)
  const [deliverySlots, setDeliverySlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [pickupSlots, setPickupSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Mantieni gli slot "raw" (non filtrati) per poterli ri-filtrare al variare dell'orario corrente
  const [deliverySlotsRaw, setDeliverySlotsRaw] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [pickupSlotsRaw, setPickupSlotsRaw] = useState<string[]>(DEFAULT_TIME_SLOTS);

  // Helpers per filtrare gli slot a partire da (ora corrente + 20 minuti)
  const toMinutes = (hhmm: string): number => {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    const m = hhmm.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
    if (!m) return 0;
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return h * 60 + min;
  };
  const getThresholdMinutes = (): number => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 20 * 60 * 1000);
    return threshold.getHours() * 60 + threshold.getMinutes();
  };
  const filterSlotsForCurrentTime = (slots: string[]): string[] => {
    const t = getThresholdMinutes();
    return (Array.isArray(slots) ? slots : DEFAULT_TIME_SLOTS).filter((s) => toMinutes(s) >= t);
  };

  const handlePromoCode = () => {
    if (promoCode.toLowerCase() === 'spartaco20') {
      setPromoApplied(true);
    }
  };

  const getSizeLabel = (size: 'slice' | 'half' | 'full' | '' | string) => {
    switch (size) {
      case 'slice':
        return 'Pinsa';
      case 'half':
        return 'Tonda';
      case 'full':
        return 'Pala';
      // Se già arriva l'etichetta umana dal backend/email, restituisci così com'è
      case 'Pinsa':
      case 'Tonda':
      case 'Pala':
        return String(size);
      default:
        return '';
    }
  };

  const getItemPrice = (item: typeof items[0]) => {
    const hasSize = item.size === 'slice' || item.size === 'half' || item.size === 'full';
    const basePrice = hasSize
      ? (item.size === 'slice'
          ? item.product.pricePerSlice
          : item.size === 'half'
          ? item.product.priceHalfTray
          : item.product.priceFullTray)
      : (item.product.pricePerSlice || item.product.priceHalfTray || item.product.priceFullTray);
    const extrasPrice = item.extras.reduce((sum, extra) => sum + extra.price, 0);
    return (basePrice + extrasPrice) * item.quantity;
  };

  const minimumOrder = 12;
  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const isMinimumReached = subtotal >= minimumOrder;

  // Sconto primo ordine: 10% sul totale
  const discountFirstOrder = isLoggedIn && isFirstOrder ? Number((total * 0.10).toFixed(2)) : 0;
  const totalPaid = Number((total - discountFirstOrder).toFixed(2));

  // Validazioni form step 1
  const phoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 7;
  const isCapValid = /^\d{5}$/.test(cap.trim());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutEmail.trim());
  // CAP consentiti per la consegna a domicilio
  const ALLOWED_CAPS = ['00174', '00175', '00173', '00172', '00178', '00169'];
  const isCapAllowed = ALLOWED_CAPS.includes(cap.trim());
  const isAddressValid = address.trim().length > 0;
  const isBuzzerValid = buzzer.trim().length > 0;
  const isDeliveryTimeValid = deliveryTime.trim().length > 0;
  const isDeliveryFormValid =
    isAddressValid && isCapValid && isCapAllowed && isBuzzerValid && isDeliveryTimeValid && isPhoneValid && isEmailValid;
  const pickupPhoneDigits = pickupPhone.replace(/\D/g, '');
  const isPickupPhoneValid = pickupPhoneDigits.length > 9;
  const isPickupFormValid =
    pickupName.trim().length > 0 && selectedTime.trim().length > 0 && isPickupPhoneValid && isEmailValid;

  // Recupero dinamico degli slot disponibili per oggi (consegna e asporto)
  useEffect(() => {
    let cancelled = false;
    const fetchSlots = async (mode: 'delivery' | 'pickup') => {
      try {
        const resp = await fetch(apiUrl(`timeslots?mode=${mode}`));
        const json = await resp.json();
        if (!resp.ok || json?.ok === false) {
          throw new Error(json?.error || 'Impossibile recuperare gli orari disponibili');
        }
        const slotsFetched: string[] = Array.isArray(json.availableSlots) ? json.availableSlots : DEFAULT_TIME_SLOTS;
        const filtered = filterSlotsForCurrentTime(slotsFetched);
        if (cancelled) return;
        if (mode === 'delivery') {
          setDeliverySlotsRaw(slotsFetched);
          setDeliverySlots(filtered.length ? filtered : []);
          if (deliveryTime && !filtered.includes(deliveryTime)) setDeliveryTime('');
        } else {
          setPickupSlotsRaw(slotsFetched);
          setPickupSlots(filtered.length ? filtered : []);
          if (selectedTime && !filtered.includes(selectedTime)) setSelectedTime('');
        }
        setSlotsError(filtered.length === 0 ? 'Nessun orario disponibile per oggi' : null);
      } catch (e: any) {
        if (cancelled) return;
        setSlotsError(e?.message || 'Non è stato possibile caricare gli orari disponibili.');
        // Fallback
        const filtered = filterSlotsForCurrentTime(DEFAULT_TIME_SLOTS);
        setDeliverySlotsRaw(DEFAULT_TIME_SLOTS);
        setPickupSlotsRaw(DEFAULT_TIME_SLOTS);
        setDeliverySlots(filtered);
        setPickupSlots(filtered);
      }
    };
    fetchSlots('delivery');
    fetchSlots('pickup');
    return () => {
      cancelled = true;
    };
  }, []);

  // Aggiorna automaticamente il filtro degli slot ogni minuto in base all'orario corrente
  useEffect(() => {
    const updateFiltered = () => {
      const d = filterSlotsForCurrentTime(deliverySlotsRaw);
      const p = filterSlotsForCurrentTime(pickupSlotsRaw);
      setDeliverySlots(d);
      setPickupSlots(p);
      // Se l'orario selezionato non è più valido, azzera
      if (deliveryTime && !d.includes(deliveryTime)) setDeliveryTime('');
      if (selectedTime && !p.includes(selectedTime)) setSelectedTime('');
    };
    updateFiltered();
    const id = setInterval(updateFiltered, 60 * 1000);
    return () => clearInterval(id);
  }, [deliverySlotsRaw, pickupSlotsRaw]);

  // Handler per avanzare allo step 2 con validazione e messaggi
  const handleDeliveryContinue = () => {
    setDeliveryAttempted(true);
    if (!isDeliveryFormValid) return;
    // Flusso unico: lasciare la scelta del pagamento e poi Procedi
  };

  const handlePickupContinue = () => {
    setPickupAttempted(true);
    if (!isPickupFormValid) return;
    // Flusso unico: passa alla sezione riepilogo con il bottone Procedi
  };

  // Tastierino numerico per telefono (asporto)
  // Funzioni tastierino numerico asporto rimosse

  const handlePaymentContinue = async () => {
    setPaymentAttempted(true);
    // Pulisci errori globali precedenti
    setRequiredFieldsError(null);
    // Se siamo in domicilio, valida i campi obbligatori della sezione "Modalità di consegna"
    if (deliveryInfo.type === 'delivery') {
      setDeliveryAttempted(true);
      if (!isDeliveryFormValid) {
        // Mostra messaggio rosso e non proseguire
        setRequiredFieldsError('Compila tutti i campi obbligatori');
        return;
      }
      // Per il domicilio è obbligatorio selezionare un metodo di pagamento
      if (!paymentMethod) {
        return;
      }
    }
    // Se siamo in asporto, valida i campi obbligatori della card Asporto
    if (deliveryInfo.type === 'pickup') {
      setPickupAttempted(true);
      if (!isPickupFormValid) {
        setRequiredFieldsError('Compila tutti i campi obbligatori');
        return;
      }
      // In asporto, se l'utente non ha scelto pagamento online, può proseguire senza selezionare metodo
      // quindi non forziamo paymentMethod qui.
    }
    // Se l'utente ha scelto pagamento online, mostra pannello Stripe nello step 2
    // Avvia loading transitorio
    setTransitionLoading(true);
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 1500));

    if (deliveryInfo.type === 'delivery' && paymentMethod === 'online') {
      try {
        // Calcolo importo in centesimi usando totalPaid (totale - sconto primo ordine)
        const amountCents = Math.round(totalPaid * 100);
        const currentUser = (() => {
          try {
            const raw = localStorage.getItem('currentUser');
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();
        const resp = await fetch(apiUrl('payments/create-intent'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountCents, currency: 'eur', receipt_email: currentUser?.email || undefined, metadata: { mode: deliveryInfo.type } }),
        });
        const json = await resp.json();
        if (!resp.ok || !json?.ok) {
          throw new Error(json?.error || 'Errore creazione pagamento');
        }
        setStripeClientSecret(json.clientSecret);
        setStripeError(null);
        await delayPromise; // attende 1,5s prima di passare al pannello Stripe
        setShowStripePanel(true);
      } catch (e: any) {
        setStripeError(e?.message || 'Errore avvio pagamento');
        setShowStripePanel(false);
      } finally {
        setTransitionLoading(false);
      }
      return; // resta allo step 2 con pannello Stripe
    }
    // Altrimenti, dopo il delay mostra il riepilogo sull'unica vista (showReview)
    await delayPromise;
    setTransitionLoading(false);
    setShowReview(true);
  };

  const confirmOrder = async () => {
    if (submittingOrder) return;
    setOrderError(null);
    setSubmittingOrder(true);
    const startTs = Date.now();
    try {
      const currentUser = (() => {
        try {
          const raw = localStorage.getItem('currentUser');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      const itemsPayload = items.map((item) => {
        const hasSize = item.size === 'slice' || item.size === 'half' || item.size === 'full';
        const basePrice = hasSize
          ? (item.size === 'slice'
              ? item.product.pricePerSlice
              : item.size === 'half'
              ? item.product.priceHalfTray
              : item.product.priceFullTray)
          : (item.product.pricePerSlice || item.product.priceHalfTray || item.product.priceFullTray);
        const extrasPrice = item.extras.reduce((sum, e) => sum + e.price, 0);
        const unitPrice = basePrice + extrasPrice;
        const totalPrice = unitPrice * item.quantity;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          // Invia in Supabase/email l'etichetta umana (Pinsa/Tonda/Pala)
          size: hasSize ? getSizeLabel(item.size) : '',
          quantity: item.quantity,
          extras: item.extras.map((e) => ({ id: e.id, name: e.name, price: e.price })),
          unit_price: Number(unitPrice.toFixed(2)),
          total_price: Number(totalPrice.toFixed(2)),
        };
      });

      const payload = {
        user_id: currentUser?.id || null,
        user_first_name: currentUser?.first_name || null,
        user_last_name: currentUser?.last_name || null,
        user_email: checkoutEmail || currentUser?.email || null,
        phone: deliveryInfo.type === 'delivery' ? phone : pickupPhone,
        mode: deliveryInfo.type,
        address: deliveryInfo.type === 'delivery' ? address : null,
        cap: deliveryInfo.type === 'delivery' ? cap : null,
        staircase: deliveryInfo.type === 'delivery' ? staircase : null,
        floor: deliveryInfo.type === 'delivery' ? floor : null,
        buzzer: deliveryInfo.type === 'delivery' ? buzzer : null,
        delivery_time: deliveryInfo.type === 'delivery' ? deliveryTime : null,
        pickup_name: deliveryInfo.type === 'pickup' ? pickupName : null,
        pickup_time: deliveryInfo.type === 'pickup' ? selectedTime : null,
        notes_rider: notes || null,
        payment_method: deliveryInfo.type === 'delivery' ? paymentMethod : null,
        subtotal: Number(subtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total: Number(getTotal().toFixed(2)),
        items: itemsPayload,
      };

      const resp = await fetch(apiUrl('orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) {
        if (resp.status === 409) {
          // Slot non disponibile: ricarica gli slot per riflettere l'aggiornamento
          try {
            const mode = deliveryInfo.type === 'delivery' ? 'delivery' : 'pickup';
            const r = await fetch(apiUrl(`timeslots?mode=${mode}`));
            const j = await r.json();
            if (r.ok && Array.isArray(j.availableSlots)) {
              const raw = j.availableSlots as string[];
              const filtered = filterSlotsForCurrentTime(raw);
              if (mode === 'delivery') {
                setDeliverySlotsRaw(raw);
                setDeliverySlots(filtered);
              } else {
                setPickupSlotsRaw(raw);
                setPickupSlots(filtered);
              }
            }
          } catch {}
          throw new Error(json?.error || 'L\'orario selezionato non è disponibile.');
        }
        throw new Error(json?.error || 'Errore invio ordine');
      }

      // Salva riepilogo ordine per la card di successo
      const computedDiscount = typeof json?.discount === 'number'
        ? Number(json.discount.toFixed(2))
        : Number((isFirstOrder ? subtotal * 0.1 : 0).toFixed(2));
      const computedPaid = typeof json?.total_paid === 'number'
        ? Number(json.total_paid.toFixed(2))
        : Number((subtotal + deliveryFee - (isFirstOrder ? subtotal * 0.1 : 0)).toFixed(2));

      setLastOrder({
        id: (json?.orderId as any) ?? null,
        items: itemsPayload,
        subtotal: Number(subtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        discount: computedDiscount,
        total: Number(getTotal().toFixed(2)),
        total_paid: computedPaid,
        mode: deliveryInfo.type,
        address: deliveryInfo.type === 'delivery' ? (address || null) : null,
        cap: deliveryInfo.type === 'delivery' ? (cap || null) : null,
        staircase: deliveryInfo.type === 'delivery' ? (staircase || null) : null,
        floor: deliveryInfo.type === 'delivery' ? (floor || null) : null,
        buzzer: deliveryInfo.type === 'delivery' ? (buzzer || null) : null,
        email: checkoutEmail || currentUser?.email || null,
        delivery_time: deliveryInfo.type === 'delivery' ? (deliveryTime || null) : null,
        pickup_name: deliveryInfo.type === 'pickup' ? (pickupName || null) : null,
        pickup_time: deliveryInfo.type === 'pickup' ? (selectedTime || null) : null,
        payment_method: deliveryInfo.type === 'delivery' ? (paymentMethod || null) : null,
        email_sent: !!json?.email_sent,
      });

      // Svuota carrello e resetta stati dopo successo
      clearCart();
      setOrderConfirmed(true);
      // Chiudi e pulisci Stripe
      setShowStripePanel(false);
      setStripeClientSecret(null);
      setStripeError(null);
      setStripeProcessing(false);
      // Reset form e checkout
      setPromoCode('');
      setPromoApplied(false);
      setIsFirstOrder(false);
      setAddress('');
      setCap('');
      setFloor('');
      setBuzzer('');
      setStaircase('');
      setPhone('');
      setNotes('');
      setSelectedTime('');
      setDeliveryTime('');
      setPickupName('');
      setPickupPhone('');
      setCheckoutEmail('');
      // Rimosso reset errore tastierino asporto
      setPaymentMethod('');
      setPaymentAttempted(false);
      setDeliveryInfo({ type: 'delivery' });
    } catch (e: any) {
      setOrderError(e?.message || 'Errore sconosciuto nell\'invio dell\'ordine');
    } finally {
      // Garantisce una durata minima del loading di 2 secondi
      const elapsed = Date.now() - startTs;
      const remaining = 2000 - elapsed;
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
      setSubmittingOrder(false);
    }
  };

  // Rimosso scroll automatico tra step: flusso unico senza step 2

  // Determina se l'utente sta effettuando il primo ordine (per sconto 10%)
  useEffect(() => {
    const currentUser = (() => {
      try {
        const raw = localStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    if (!isLoggedIn || !currentUser?.id) {
      setIsFirstOrder(false);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(apiUrl(`orders?user_id=${currentUser.id}`));
        const json = await resp.json();
        if (json?.ok) {
          setIsFirstOrder((json.orders || []).length === 0);
        } else {
          setIsFirstOrder(false);
        }
      } catch {
        setIsFirstOrder(false);
      }
    })();
  }, [isLoggedIn]);

  if (items.length === 0 && !orderConfirmed) {
    return (
      <div className="pt-20 min-h-screen bg-neutral-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-neutral-gray-300 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-neutral-black mb-4">
            Il tuo carrello è vuoto
          </h2>
          <p className="text-lg text-neutral-gray-600 mb-8">
            Aggiungi qualche deliziosa pizza per iniziare!
          </p>
          <button onClick={() => onNavigate('menu')} className="btn-primary">
            Vai al menù
          </button>
        </div>
      </div>
    );
  }

  // Durante l'invio, mostra SOLO il messaggio di invio e nient'altro
  if (submittingOrder && !orderConfirmed) {
    return (
      <div className="pt-20 min-h-screen bg-neutral-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-black">Stiamo inviando il tuo ordine...</h2>
          <p className="mt-2 text-neutral-gray-700">Attendere qualche istante</p>
        </div>
      </div>
    );
  }

  // Vista Stripe a pagina pulita: mostra solo la card di pagamento online
  if (showStripePanel && stripeClientSecret && !orderConfirmed && !submittingOrder) {
    return (
      <div className="pt-20 min-h-screen bg-neutral-gray-50">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="card w-full p-6 bg-white border border-neutral-gray-300 relative z-10 overflow-visible isolate">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-neutral-black">Pagamento online</h2>
                <button
                  className="px-3 py-2 rounded-md bg-black text-white font-semibold hover:bg-neutral-black"
                  onClick={async () => {
                    setTransitionLoading(true);
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    setShowStripePanel(false);
                    setTransitionLoading(false);
                  }}
                >
                  Indietro
                </button>
              </div>
              {transitionLoading && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 border-4 border-neutral-gray-300 border-t-neutral-black rounded-full animate-spin"></div>
                    <p className="text-neutral-black font-semibold">Caricamento…</p>
                  </div>
                </div>
              )}
              <div className="mb-5 rounded-lg border-2 border-neutral-gray-300 bg-neutral-gray-50 p-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-neutral-black font-semibold text-lg md:text-xl">Totale da pagare</span>
                  <span className="text-neutral-black font-bold text-2xl md:text-3xl">€{totalPaid.toFixed(2)}</span>
                </div>
                <div className="mt-2 text-sm text-neutral-gray-700">
                  Subtotale €{subtotal.toFixed(2)} {deliveryInfo.type === 'delivery' ? `• Consegna €${deliveryFee.toFixed(2)}` : ''} {discountFirstOrder > 0 ? `• Sconto -€${discountFirstOrder.toFixed(2)}` : ''}
                </div>
              </div>
              {stripeProcessing && (
                <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-sm">
                  Pagamento in corso…
                </div>
              )}
              {!stripeProcessing && stripePaidSuccess && (
                <div className="mb-3 rounded-md bg-green-50 border border-green-200 text-green-800 px-3 py-2 text-sm">
                  Pagamento riuscito
                </div>
              )}
              <StripeElementsWrapper clientSecret={stripeClientSecret}>
                <StripeCheckoutSection
                  processing={stripeProcessing}
                  setProcessing={setStripeProcessing}
                  error={stripeError}
                  setError={setStripeError}
                  clientSecret={stripeClientSecret}
                  amountCents={Math.round(totalPaid * 100)}
                  onSuccess={async () => {
                    await confirmOrder();
                    setShowStripePanel(false);
                  }}
                />
              </StripeElementsWrapper>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-0 min-h-screen bg-neutral-gray-50 overflow-x-hidden">
      {transitionLoading && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 border-4 border-neutral-gray-300 border-t-neutral-black rounded-full animate-spin"></div>
            <p className="text-neutral-black font-semibold">Caricamento…</p>
          </div>
        </div>
      )}
      {/* Hero full-width con sfondo nero che parte dall’alto */}
      <section className="bg-black text-white py-28 md:py-16">
        <div className="container-custom">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Carrello</h1>
          <p className="text-xl text-neutral-gray-300">
            Rivedi il tuo ordine e completa l'acquisto
          </p>
        </div>
      </section>

      <div className="container-custom py-8">
        <div className="flex justify-center">
          <div className="w-full max-w-3xl space-y-6">

            {/* Riepilogo ordine - sopra la modalità di consegna */}
            {/* Mostra le card principali solo se NON siamo in review, NON stiamo inviando e l'ordine non è confermato */}
            {(!showReview && !submittingOrder && !orderConfirmed) && (
              <>
            <div className="card w-full mx-auto p-4 md:p-6">
              <h2 className="text-2xl font-bold text-neutral-black mb-4">I tuoi articoli</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-neutral-black mb-2">I tuoi articoli ({items.length})</h3>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {typeof item.product.image === 'string' && item.product.image.trim() !== '' && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="text-neutral-black font-medium truncate">
                            {item.product.name}{item.size ? ` • ${getSizeLabel(item.size)}` : ''}
                          </div>
                          <div className="text-neutral-black font-semibold whitespace-nowrap ml-3">
                            €{getItemPrice(item).toFixed(2)}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            aria-label="Diminuisci quantità"
                            className="btn-icon text-neutral-black hover:text-neutral-black"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-medium text-neutral-black">
                            {item.quantity}
                          </span>
                          <button
                            aria-label="Aumenta quantità"
                            className="btn-icon text-neutral-black hover:text-neutral-black"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            aria-label="Rimuovi articolo"
                            className="btn-icon text-red-600 hover:text-red-700"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-2">
                <div className="flex justify-between text-neutral-gray-700">
                  <span>Subtotale</span>
                  <span className="font-medium">€{subtotal.toFixed(2)}</span>
                </div>

                {deliveryInfo.type === 'delivery' && (
                  <div className="flex justify-between text-neutral-gray-700">
                    <span>Consegna</span>
                    <span className="font-medium">€1,50</span>
                  </div>
                )}
                <div className="pt-4 border-t border-neutral-gray-200">
                  <div className="flex justify-between text-xl font-bold text-neutral-black">
                    <span>Totale</span>
                    <span>€{(
                      subtotal + (deliveryInfo.type === 'delivery' ? 1.5 : 0) - (discountFirstOrder > 0 ? discountFirstOrder : 0)
                    ).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modalità di consegna - spostata sotto */}
            <div className="card w-full mx-auto p-4 md:p-6">
              {/* Percorso checkout rimosso: pagina unica senza step */}

              {items.length > 0 && !isLoggedIn && (
                <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-3">
                  <img src="/sconto.svg" alt="Sconto 10%" className="h-[6rem] sm:h-20 w-auto mx-auto sm:mx-0" />
                  <div className="rounded-xl border border-neutral-gray-200 bg-white px-4 py-4 w-full sm:flex-1 flex items-center sm:items-center sm:gap-4">
                    <p className="text-neutral-black text-sm sm:text-base leading-normal break-words text-center sm:text-left">
                      <span className="font-semibold">Aspetta!! Prima di ordinare</span>{' '}
                      <button
                        type="button"
                        onClick={onOpenRegisterModal}
                        className="inline-flex items-center h-10 sm:h-12 px-3 rounded-md bg-primary-orange text-white hover:bg-primary-orange/90 ml-1"
                      >
                        Registrati
                      </button>{' '}
                      <span className="font-semibold">e ottieni uno sconto del 10%</span>
                    </p>
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-neutral-black mb-6">
                {showStripePanel
                  ? 'Pagamento'
                  : orderConfirmed
                  ? 'Ordine Confermato'
                  : 'Modalità di consegna'}
              </h2>

              {checkoutStep === 1 ? (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setDeliveryInfo({ ...deliveryInfo, type: 'delivery' })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    deliveryInfo.type === 'delivery'
                      ? 'border-primary-orange bg-primary-orange/5'
                      : 'border-neutral-gray-300 hover:border-neutral-gray-400'
                  }`}
                >
                  <Truck
                    className={`w-8 h-8 mb-3 mx-auto ${
                      deliveryInfo.type === 'delivery'
                        ? 'text-primary-orange'
                        : 'text-neutral-gray-400'
                    }`}
                  />
                  <p className="font-semibold text-neutral-black">A Domicilio</p>
                  <p className="text-sm text-neutral-gray-600 mt-1">20 minuti</p>
                </button>

                <button
                  onClick={() => setDeliveryInfo({ ...deliveryInfo, type: 'pickup' })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    deliveryInfo.type === 'pickup'
                      ? 'border-primary-orange bg-primary-orange/5'
                      : 'border-neutral-gray-300 hover:border-neutral-gray-400'
                  }`}
                >
                  <Package
                    className={`w-8 h-8 mb-3 mx-auto ${
                      deliveryInfo.type === 'pickup'
                        ? 'text-primary-orange'
                        : 'text-neutral-gray-400'
                    }`}
                  />
                  <p className="font-semibold text-neutral-black">Asporto</p>
                  <p className="text-sm text-neutral-gray-600 mt-1">15-20 minuti</p>
                </button>
              </div>

              {deliveryInfo.type === 'delivery' ? (
                <div className="space-y-6">
                  {/* Gruppo: Indirizzo */}
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-black mb-2">Indirizzo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                          Indirizzo {deliveryAttempted && !isAddressValid && (
                            <span className="text-red-600 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Via, numero civico"
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                          CAP {deliveryAttempted && !isCapValid && (
                            <span className="text-red-600 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\\d{5}"
                          value={cap}
                          onChange={(e) => setCap(e.target.value)}
                          placeholder="es. 00100"
                          className="input-field"
                          required
                        />
                        {/* Messaggio per CAP non serviti */}
                        {isCapValid && !isCapAllowed && (
                          <p className="text-sm text-red-600 mt-2">
                            Ci dispiace, i nostri rider non arrivano fino a voi. Puoi venire a ritirare direttamente al locale il tuo ordine
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-neutral-black mb-2">Istruzioni per il corriere</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                        Piano
                      </label>
                      <input
                        type="text"
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        placeholder="es. 3"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                        Citofono {deliveryAttempted && !isBuzzerValid && (
                          <span className="text-red-600 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={buzzer}
                        onChange={(e) => setBuzzer(e.target.value)}
                        placeholder="es. Rossi / Int. 3"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                        Scala
                      </label>
                      <input
                        type="text"
                        value={staircase}
                        onChange={(e) => setStaircase(e.target.value)}
                        placeholder="es. A / B"
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Orario di consegna */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                      Orario di consegna {deliveryAttempted && !isDeliveryTimeValid && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </label>
                    <select
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">Seleziona un orario</option>
                      {deliverySlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-neutral-gray-600 mt-2">
                      Gli orari disponibili corrispondono all'orario del locale.
                    </p>
                    {slotsError && (
                      <p className="text-sm text-amber-700 mt-2">{slotsError}</p>
                    )}
                  </div>

                    {/* Numero di telefono */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                        Numero di telefono {deliveryAttempted && !isPhoneValid && (
                          <span className="text-red-600 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="es. 333 1234567"
                        className="input-field"
                        required
                      />
                      {/* Email */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                          Email {deliveryAttempted && !isEmailValid && (
                            <span className="text-red-600 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type="email"
                          value={checkoutEmail}
                          onChange={(e) => setCheckoutEmail(e.target.value)}
                          placeholder="es. mario.rossi@email.com"
                          className="input-field"
                          required
                        />
                        <p className="text-sm text-neutral-gray-600 mt-2">
                          Invieremo il riepilogo del tuo ordine a questa mail
                        </p>
                      </div>
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                      Note per il rider
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Eventuali istruzioni per la consegna"
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>

                  {!isMinimumReached && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">
                          Ordine minimo non raggiunto
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          Mancano €{(minimumOrder - subtotal).toFixed(2)} per raggiungere
                          l'ordine minimo di €{minimumOrder.toFixed(2)} per la consegna.
                        </p>
                      </div>
                    </div>
                  )}

                  {isMinimumReached && (
                    <></>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                      Nome {pickupAttempted && !pickupName.trim() && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={pickupName}
                      onChange={(e) => setPickupName(e.target.value)}
                      placeholder="es. Mario Rossi"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                      Numero di telefono {pickupAttempted && !isPickupPhoneValid && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={pickupPhone}
                      onChange={(e) => setPickupPhone(e.target.value)}
                      placeholder="es. 333 1234567"
                      className="input-field"
                      required
                    />
                    {/* Email */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                        Email {pickupAttempted && !isEmailValid && (
                          <span className="text-red-600 ml-1">*</span>
                        )}
                      </label>
                      <input
                        type="email"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        placeholder="es. mario.rossi@email.com"
                        className="input-field"
                        required
                      />
                      <p className="text-sm text-neutral-gray-600 mt-2">
                        Invieremo il riepilogo del tuo ordine a questa mail
                      </p>
                    </div>
                    {/* Rimosso overlay tastierino numerico per telefono asporto */}
                  </div>
                  <label className="block text-sm font-medium text-neutral-gray-700 mb-2">
                    Orario di ritiro {pickupAttempted && !isPickupFormValid && (
                      <span className="text-red-600 ml-1">*</span>
                    )}
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Seleziona un orario</option>
                    {pickupSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-neutral-gray-600 mt-2">
                    Indirizzo ritiro: Viale Spartaco, 73, 00174 Roma RM
                  </p>
                  <div className="pt-4"></div>
                </div>
              )}
              </>
              ) : (
                <>
                  {deliveryInfo.type === 'pickup' ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-neutral-black">Dettagli ordine</h3>
                        <div className="mt-3 space-y-2">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-neutral-black">
                                  <span>
                                    {item.product.name}
                                    {item.size ? ` • ${getSizeLabel(item.size)}` : ''}
                                    {item.extras?.length ? ` • +${item.extras.length} extra` : ''}
                                    {` × ${item.quantity}`}
                                  </span>
                              <span className="font-semibold">€{getItemPrice(item).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-neutral-gray-200">
                        <div className="flex justify-between text-xl font-bold text-neutral-black">
                          <span>Totale</span>
                          <span>€{getTotal().toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-gray-800">
                        <div className="p-3 rounded-lg bg-neutral-gray-50">
                          <span className="block text-sm text-neutral-gray-600">Nome</span>
                          <span className="font-medium text-neutral-black">{pickupName || '-'}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-gray-50">
                          <span className="block text-sm text-neutral-gray-600">Orario di ritiro</span>
                          <span className="font-medium text-neutral-black">{selectedTime || '-'}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-neutral-gray-50">
                          <span className="block text-sm text-neutral-gray-600">Numero di telefono</span>
                          <span className="font-medium text-neutral-black">{pickupPhone || '-'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between gap-2 pt-2">
                        <button className="btn-outline w-1/2" onClick={() => setCheckoutStep(1)}>
                          Indietro
                        </button>
                        <button className="btn-primary w-1/2" onClick={confirmOrder} disabled={submittingOrder}>
                          Conferma
                        </button>
                      </div>
                      {orderError && (
                        <p className="text-sm text-red-600 mt-2">{orderError}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {checkoutStep === 2 ? (
                        <>
                          {!showStripePanel && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                              className={`p-6 rounded-xl border-2 transition-all ${
                                paymentMethod === 'cash'
                                  ? 'border-primary-orange bg-primary-orange/5 text-primary-orange'
                                  : 'border-neutral-gray-300 hover:border-neutral-gray-400 text-neutral-black'
                              }`}
                              onClick={() => { setPaymentMethod('cash'); setShowStripePanel(false); }}
                            >
                              Contanti
                              <img
                                src="/contanti.svg"
                                alt="Pagamento in contanti"
                                className="w-12 h-12 mx-auto mt-2"
                              />
                            </button>
                            <button
                              className={`p-6 rounded-xl border-2 transition-all ${
                                paymentMethod === 'online'
                                  ? 'border-primary-orange bg-primary-orange/5 text-primary-orange'
                                  : 'border-neutral-gray-300 hover:border-neutral-gray-400 text-neutral-black'
                              }`}
                              onClick={() => { setPaymentMethod('online'); /* pannello verrà mostrato al click su Continua */ }}
                            >
                              Online paga Ora
                              <img
                                src="/carta.svg"
                                alt="Pagamento online con carta"
                                className="w-12 h-12 mx-auto mt-2"
                              />
                            </button>
                          </div>
                          )}
                          {!showStripePanel && (
                            <>
                              <div className="flex justify-between gap-2 pt-4">
                                <button className="btn-outline w-1/2" onClick={() => setCheckoutStep(1)}>
                                  Indietro
                                </button>
                                {paymentMethod === 'online' ? (
                                  <button className="btn-primary w-1/2" onClick={handlePaymentContinue}>
                                    Procedi
                                  </button>
                                ) : (
                                  // Mostra "Continua" solo se NON è domicilio (quindi Asporto)
                                  deliveryInfo.type !== 'delivery' ? (
                                    <button className="btn-primary w-1/2" onClick={handlePaymentContinue}>
                                      Continua
                                    </button>
                                  ) : null
                                )}
                              </div>
                          {paymentAttempted && !paymentMethod && (
                            <p className="text-sm text-red-600 mt-2">
                              Seleziona un metodo di pagamento prima di procedere
                            </p>
                          )}
                          {requiredFieldsError && (
                            <p className="text-sm text-red-600 mt-2">{requiredFieldsError}</p>
                          )}
                            </>
                          )}
                          {/* Stripe inline rimosso: ora la vista Stripe è a pagina pulita */}
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-xl font-bold text-neutral-black">
                              {orderConfirmed ? 'Riepilogo ordine' : 'Dettagli ordine'}
                            </h3>
                            <div className="mt-3 space-y-2">
                              {orderConfirmed && lastOrder ? (
                                <div className="max-h-56 overflow-y-auto border border-neutral-gray-200 rounded-md">
                                  <ul className="divide-y divide-neutral-gray-200">
                                    {lastOrder.items.map((it, idx) => (
                                      <li key={idx} className="p-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>
                                            {it.product_name} {getSizeLabel(it.size)} ×{it.quantity}
                                          </span>
                                          <span className="font-semibold">€ {it.total_price.toFixed(2)}</span>
                                        </div>
                                        {it.extras.length > 0 && (
                                          <div className="text-xs text-neutral-gray-600 mt-1">
                                            Extra: {it.extras.map((e) => e.name).join(', ')}
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-neutral-black">
                                    <span>
                                      {item.product.name}
                                      {item.size ? ` • ${item.size}` : ''}
                                      {item.extras?.length ? ` • +${item.extras.length} extra` : ''}
                                      {` × ${item.quantity}`}
                                    </span>
                                    <span className="font-semibold">€{getItemPrice(item).toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          {orderConfirmed && lastOrder ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-neutral-gray-700">
                                <span>Subtotale</span>
                                <span className="font-medium">€{lastOrder.subtotal.toFixed(2)}</span>
                              </div>
                              {lastOrder.mode === 'delivery' ? (
                                <div className="flex justify-between text-neutral-gray-700">
                                  <span>Consegna</span>
                                  <span className="font-medium">€{lastOrder.delivery_fee.toFixed(2)}</span>
                                </div>
                              ) : null}
                              {lastOrder.discount > 0 ? (
                                <div className="flex justify-between text-green-600">
                                  <span>Sconto</span>
                                  <span className="font-medium">-€{lastOrder.discount.toFixed(2)}</span>
                                </div>
                              ) : null}
                              <div className="pt-3 border-t border-neutral-gray-200">
                                <div className="flex justify-between text-xl font-bold text-neutral-black">
                                  <span>Totale</span>
                                  <span>€{lastOrder.total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-neutral-gray-700 mt-1">
                                  <span>Pagato</span>
                                  <span className="font-medium">€{lastOrder.total_paid.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between text-neutral-gray-700">
                                <span>Subtotale</span>
                                <span className="font-medium">€{subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-neutral-gray-700">
                                <span>Consegna</span>
                                <span className="font-medium">
                                  {deliveryFee === 0 ? 'Gratis' : `€${deliveryFee.toFixed(2)}`}
                                </span>
                              </div>

                              {promoApplied && (
                                <div className="flex justify-between text-green-600">
                                  <span>Sconto promo</span>
                                  <span className="font-medium">-€5.00</span>
                                </div>
                              )}

                              {discountFirstOrder > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Sconto primo ordine (10%)</span>
                                  <span className="font-medium">-€{discountFirstOrder.toFixed(2)}</span>
                                </div>
                              )}

                              <div className="pt-3 border-t border-neutral-gray-200">
                                {discountFirstOrder > 0 ? (
                                  <>
                                    <div className="flex justify-between text-xl font-bold text-neutral-black">
                                      <span>Totale</span>
                                      <span className="line-through text-neutral-gray-500">€{total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-neutral-black mt-1">
                                      <span>Totale scontato</span>
                                      <span>€{totalPaid.toFixed(2)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex justify-between text-xl font-bold text-neutral-black">
                                    <span>Totale</span>
                                    <span>€{total.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {!orderConfirmed && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-gray-800">
                              <div className="p-3 rounded-lg bg-neutral-gray-50">
                                <span className="block text-sm text-neutral-gray-600">Indirizzo</span>
                                <span className="font-medium text-neutral-black">{address || '-'}</span>
                              </div>
                              {staircase && staircase.trim().length > 0 && (
                                <div className="p-3 rounded-lg bg-neutral-gray-50">
                                  <span className="block text-sm text-neutral-gray-600">Scala</span>
                                  <span className="font-medium text-neutral-black">{staircase}</span>
                                </div>
                              )}
                              {floor && floor.trim().length > 0 && (
                                <div className="p-3 rounded-lg bg-neutral-gray-50">
                                  <span className="block text-sm text-neutral-gray-600">Piano</span>
                                  <span className="font-medium text-neutral-black">{floor}</span>
                                </div>
                              )}
                              <div className="p-3 rounded-lg bg-neutral-gray-50">
                                <span className="block text-sm text-neutral-gray-600">CAP</span>
                                <span className="font-medium text-neutral-black">{cap || '-'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-neutral-gray-50">
                                <span className="block text-sm text-neutral-gray-600">Citofono</span>
                                <span className="font-medium text-neutral-black">{buzzer || '-'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-neutral-gray-50">
                                <span className="block text-sm text-neutral-gray-600">Numero di telefono</span>
                                <span className="font-medium text-neutral-black">{phone || '-'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-neutral-gray-50">
                                <span className="block text-sm text-neutral-gray-600">Orario di consegna</span>
                                <span className="font-medium text-neutral-black">{deliveryTime || '-'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-neutral-gray-50">
                                <span className="block text-sm text-neutral-gray-600">Metodo di pagamento</span>
                                <span className="font-medium text-neutral-black">{paymentMethod === 'cash' ? 'Contanti' : paymentMethod === 'online' ? 'Online' : '-'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-neutral-gray-50 sm:col-span-2">
                                <span className="block text-sm text-neutral-gray-600">Note per il rider</span>
                                <span className="font-medium text-neutral-black">{notes || '-'}</span>
                              </div>
                            </div>
                          )}
                          {orderConfirmed && lastOrder ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-gray-800">
                              {lastOrder.mode === 'delivery' ? (
                                <>
                                  {lastOrder.address ? (
                                    <div className="p-3 rounded-lg bg-neutral-gray-50">
                                      <span className="block text-sm text-neutral-gray-600">Indirizzo</span>
                                      <span className="font-medium text-neutral-black">{lastOrder.address}</span>
                                    </div>
                                  ) : null}
                                  {lastOrder.cap ? (
                                    <div className="p-3 rounded-lg bg-neutral-gray-50">
                                      <span className="block text-sm text-neutral-gray-600">CAP</span>
                                      <span className="font-medium text-neutral-black">{lastOrder.cap}</span>
                                    </div>
                                  ) : null}
                                  {lastOrder.delivery_time ? (
                                    <div className="p-3 rounded-lg bg-neutral-gray-50">
                                      <span className="block text-sm text-neutral-gray-600">Consegna</span>
                                      <span className="font-medium text-neutral-black">{lastOrder.delivery_time}</span>
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  {lastOrder.pickup_name ? (
                                    <div className="p-3 rounded-lg bg-neutral-gray-50">
                                      <span className="block text-sm text-neutral-gray-600">Ritiro</span>
                                      <span className="font-medium text-neutral-black">{lastOrder.pickup_name}</span>
                                    </div>
                                  ) : null}
                                  {lastOrder.pickup_time ? (
                                    <div className="p-3 rounded-lg bg-neutral-gray-50">
                                      <span className="block text-sm text-neutral-gray-600">Orario</span>
                                      <span className="font-medium text-neutral-black">{lastOrder.pickup_time}</span>
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          ) : null}
                          {!orderConfirmed ? (
                            <>
                              <div className="flex justify-between gap-2 pt-2">
                                <button className="btn-outline w-1/2" onClick={() => setShowReview(false)}>
                                  Indietro
                                </button>
                                <button className="btn-primary w-1/2" onClick={confirmOrder} disabled={submittingOrder}>
                                  Conferma
                                </button>
                              </div>
                              {orderError && (
                                <p className="text-sm text-red-600 mt-2">{orderError}</p>
                              )}
                            </>
                          ) : (
                            <div className="pt-2">
                              <p className="text-sm text-neutral-gray-700">
                                Puoi monitorare lo stato dalla pagina
                                <button
                                  className="inline-flex items-center ml-2 px-2.5 py-1 rounded-md bg-primary-orange text-white font-semibold text-sm"
                                  onClick={() => onNavigate('areapersonale')}
                                >
                                  Area Personale
                                </button>
                              </p>
                              {lastOrder?.email && lastOrder.email_sent ? (
                                <p className="text-sm text-neutral-gray-700 mt-2">
                                  Abbiamo inviato il riepilogo del tuo ordine alla mail {lastOrder.email}
                                </p>
                              ) : null}
                              <div className="mt-4">
                                <button
                                  className="w-full px-3 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-neutral-black"
                                  onClick={() => onNavigate('home')}
                                >
                                  Torna alla Home
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
              </>
            )}

            {/* Metodo di pagamento: visibile solo per Domicilio e non in review */}
            {!orderConfirmed && deliveryInfo.type === 'delivery' && !showReview && (
              <div className="card w-full mx-auto p-4 md:p-6">
                <h2 className="text-2xl font-bold text-neutral-black mb-4">Metodo di pagamento</h2>

                {!showStripePanel && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      className={`p-6 rounded-xl border-2 transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-primary-orange bg-primary-orange/5 text-primary-orange'
                          : 'border-neutral-gray-300 hover:border-neutral-gray-400 text-neutral-black'
                      }`}
                      onClick={() => { setPaymentMethod('cash'); setShowStripePanel(false); }}
                    >
                      Contanti alla consegna
                      <img
                        src="/contanti.svg"
                        alt="Pagamento in contanti"
                        className="w-12 h-12 mx-auto mt-2"
                      />
                    </button>
                    <button
                      className={`p-6 rounded-xl border-2 transition-all ${
                        paymentMethod === 'online'
                          ? 'border-primary-orange bg-primary-orange/5 text-primary-orange'
                          : 'border-neutral-gray-300 hover:border-neutral-gray-400 text-neutral-black'
                      }`}
                      disabled
                      onClick={() => { setPaymentMethod('online'); }}
                    >
                       termporaneomente fuori servizio
                      <img
                        src="/carta.svg"
                        alt="Pagamento online con carta"
                        className="w-12 h-12 mx-auto mt-2"
                      />
                    </button>
                  </div>
                )}

                {paymentAttempted && !paymentMethod && (
                  <p className="text-sm text-red-600 mt-2">
                    Seleziona un metodo di pagamento prima di procedere
                  </p>
                )}
                {requiredFieldsError && (
                  <p className="text-sm text-red-600 mt-2">{requiredFieldsError}</p>
                )}

                {/* Stripe inline rimosso: ora la vista Stripe è a pagina pulita */}
              </div>
            )}

            {/* Pulsante finale per accedere al riepilogo */}
            {!orderConfirmed && !submittingOrder && !showReview && (
              <div className="pt-2">
                <button className="btn-primary w-full" onClick={handlePaymentContinue}>
                  Procedi
                </button>
              </div>
            )}


            {showReview && !orderConfirmed && (
              <div className="card w-full mx-auto p-4 md:p-6">
                <h2 className="text-2xl font-bold text-neutral-black mb-4">Riepilogo ordine</h2>
               

              <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-black mb-2">I tuoi articoli ({items.length})</h3>
                    <div className="mt-1 space-y-2">
                      {orderConfirmed && lastOrder ? (
                        <div className="max-h-56 overflow-y-auto border border-neutral-gray-200 rounded-md">
                          <ul className="divide-y divide-neutral-gray-200">
                            {lastOrder.items.map((it, idx) => (
                              <li key={idx} className="p-2 text-sm">
                                <div className="flex justify-between">
                                  <span>
                                    {it.product_name} {getSizeLabel(it.size)} ×{it.quantity}
                                  </span>
                                  <span className="font-semibold">€ {it.total_price.toFixed(2)}</span>
                                </div>
                                {it.extras.length > 0 && (
                                  <div className="text-xs text-neutral-gray-600 mt-1">
                                    Extra: {it.extras.map((e) => e.name).join(', ')}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        items.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            {typeof item.product.image === 'string' && item.product.image.trim() !== '' && (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <div className="text-neutral-black font-medium truncate">
                                  {item.product.name}{item.size ? ` • ${getSizeLabel(item.size)}` : ''} × {item.quantity}
                                </div>
                                <div className="text-neutral-black font-semibold whitespace-nowrap ml-3">
                                  €{getItemPrice(item).toFixed(2)}
                                </div>
                              </div>
                              {item.extras && item.extras.length > 0 && (
                                <div className="mt-1 text-sm text-neutral-gray-600">
                                  Extra: {item.extras.map((e: any) => e.name).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {orderConfirmed && lastOrder ? (
                      <>
                        <div className="flex justify-between text-neutral-gray-700">
                          <span>Subtotale</span>
                          <span className="font-medium">€{lastOrder.subtotal.toFixed(2)}</span>
                        </div>
                        {lastOrder.mode === 'delivery' && (
                          <div className="flex justify-between text-neutral-gray-700">
                            <span>Consegna</span>
                            <span className="font-medium">€{lastOrder.delivery_fee.toFixed(2)}</span>
                          </div>
                        )}
                        {lastOrder.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Sconto</span>
                            <span className="font-medium">-€{lastOrder.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-neutral-gray-200">
                          <div className="flex justify-between text-xl font-bold text-neutral-black">
                            <span>Totale</span>
                            <span>€{lastOrder.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-neutral-gray-700">
                          <span>Subtotale</span>
                          <span className="font-medium">€{subtotal.toFixed(2)}</span>
                        </div>
                        {deliveryInfo.type === 'delivery' && (
                          <div className="flex justify-between text-neutral-gray-700">
                            <span>Consegna</span>
                            <span className="font-medium">{deliveryFee === 0 ? 'Gratis' : `€${deliveryFee.toFixed(2)}`}</span>
                          </div>
                        )}
                        {discountFirstOrder > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Sconto primo ordine (10%)</span>
                            <span className="font-medium">-€{discountFirstOrder.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="pt-3 border-t border-neutral-gray-200">
                          <div className="flex justify-between text-xl font-bold text-neutral-black">
                            <span>Totale</span>
                            <span>€{(discountFirstOrder > 0 ? totalPaid : total).toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {orderConfirmed && lastOrder ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-gray-800">
                      {lastOrder.mode === 'delivery' ? (
                        <>
                          {lastOrder.address && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">Indirizzo</span>
                              <span className="font-medium text-neutral-black">{lastOrder.address}</span>
                            </div>
                          )}
                          {lastOrder.cap && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">CAP</span>
                              <span className="font-medium text-neutral-black">{lastOrder.cap}</span>
                            </div>
                          )}
                          {lastOrder.delivery_time && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">Consegna</span>
                              <span className="font-medium text-neutral-black">{lastOrder.delivery_time}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {lastOrder.pickup_name && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">Nome</span>
                              <span className="font-medium text-neutral-black">{lastOrder.pickup_name}</span>
                            </div>
                          )}
                          {lastOrder.pickup_time && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">Orario di ritiro</span>
                              <span className="font-medium text-neutral-black">{lastOrder.pickup_time}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}

                  {/* Dati consegna/ritiro completi, solo lettura */}
                  {!orderConfirmed && (
                    <div className="mt-4">
                      {deliveryInfo.type === 'delivery' && (
                        <div className="mb-1 text-neutral-black">
                          <span className="font-semibold">Modalità di consegna:</span>
                          <span className="ml-1">A domicilio</span>
                        </div>
                      )}
                      {deliveryInfo.type === 'pickup' && (
                        <div className="mb-1 text-neutral-black">
                          <span className="font-semibold">Modalità di consegna:</span>
                          <span className="ml-1">Da asporto</span>
                        </div>
                      )}
                      <h3 className="text-lg font-semibold text-neutral-black mb-2">
                        {deliveryInfo.type === 'delivery' ? 'Dati di consegna' : 'Dati di ritiro'}
                      </h3>
                      {deliveryInfo.type === 'delivery' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-gray-800">
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Indirizzo</span>
                            <span className="font-medium text-neutral-black">{address || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">CAP</span>
                            <span className="font-medium text-neutral-black">{cap || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Citofono</span>
                            <span className="font-medium text-neutral-black">{buzzer || '-'}</span>
                          </div>
                          {staircase && staircase.trim().length > 0 && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">Scala</span>
                              <span className="font-medium text-neutral-black">{staircase}</span>
                            </div>
                          )}
                          {floor && floor.trim().length > 0 && (
                            <div className="p-3 rounded-lg bg-neutral-gray-50">
                              <span className="block text-sm text-neutral-gray-600">Piano</span>
                              <span className="font-medium text-neutral-black">{floor}</span>
                            </div>
                          )}
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Numero di telefono</span>
                            <span className="font-medium text-neutral-black">{phone || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Email</span>
                            <span className="font-medium text-neutral-black">{checkoutEmail || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Orario di consegna</span>
                            <span className="font-medium text-neutral-black">{deliveryTime || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50 sm:col-span-2">
                            <span className="block text-sm text-neutral-gray-600">Note per il rider</span>
                            <span className="font-medium text-neutral-black">{notes || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50 sm:col-span-2">
                            <span className="block text-sm text-neutral-gray-600">Metodo di pagamento</span>
                            <span className="font-medium text-neutral-black">{paymentMethod === 'cash' ? 'Contanti' : paymentMethod === 'online' ? 'Online' : '-'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-gray-800">
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Nome</span>
                            <span className="font-medium text-neutral-black">{pickupName || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Numero di telefono</span>
                            <span className="font-medium text-neutral-black">{pickupPhone || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Email</span>
                            <span className="font-medium text-neutral-black">{checkoutEmail || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50">
                            <span className="block text-sm text-neutral-gray-600">Orario di ritiro</span>
                            <span className="font-medium text-neutral-black">{selectedTime || '-'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-neutral-gray-50 sm:col-span-2">
                            <span className="block text-sm text-neutral-gray-600">Indirizzo ritiro</span>
                            <span className="font-medium text-neutral-black">Viale Spartaco, 73, 00174 Roma RM</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  {/* Pulsanti: Indietro e Invia ordine */}
                  {!orderConfirmed && (
                    <div className="pt-3 flex gap-2">
                      <button className="btn-outline w-1/2" onClick={() => setShowReview(false)}>
                        Indietro
                      </button>
                      <button
                        className="btn-primary w-1/2"
                        onClick={async () => { setShowReview(false); await confirmOrder(); }}
                        disabled={submittingOrder}
                      >
                        Invia ordine
                      </button>
                    </div>
                  )}
              </div>
            )}

            {/* Card di successo: titolo centrato, sfondo bianco, bordi neri, simbolo V verde */}
            {orderConfirmed && (
              <div className="card w-full mx-auto p-6 bg-white border-2 border-black text-neutral-black">
                <h2 className="text-3xl font-extrabold text-center">Ordine confermato</h2>
                <div className="mt-4 flex justify-center">
                  <img src="/conferma.svg" alt="Conferma" className="w-24 h-24" />
                </div>
                <p className="mt-4 text-center">Abbiamo preso in carico il tuo ordine correttamente.</p>
                {lastOrder?.email && lastOrder.email_sent ? (
                  <p className="mt-2 text-center">Ti abbiamo inviato il riepilogo alla mail <span className="font-semibold">{lastOrder.email}</span>.</p>
                ) : (
                  <p className="mt-2 text-center">Ti invieremo una email con il riepilogo dell'ordine.</p>
                )}
                <p className="mt-3 text-center">Se ti sei registrato, puoi visualizzare il tuo ordine da Area Personale.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    className="px-3 py-2.5 rounded-lg bg-white text-primary-orange font-semibold hover:bg-white/90 border border-primary-orange"
                    onClick={() => onNavigate('areapersonale')}
                  >
                    Area Personale
                  </button>
                  <button
                    className="px-3 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-neutral-black"
                    onClick={() => onNavigate('home')}
                  >
                    Torna alla Home
                  </button>
                </div>
              </div>
            )}

          </div>

          
      </div>
      </div>
      {/* Rimosso overlay: uso la card sopra per lo stato invio */}

      
    </div>
  );
};

export default CartPage;
