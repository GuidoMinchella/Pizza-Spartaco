import React, { useState } from 'react';
import { Plus, Flame, Leaf, Sparkles, TrendingUp, ShoppingCart } from 'lucide-react';
import { Product, CartItem, ProductExtra } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  showFullDetails?: boolean;
  sizeLabels?: { slice: string; half: string; full: string };
  sizeActiveColor?: 'orange' | 'black';
  compact?: boolean;
  hideDescription?: boolean;
  insetImage?: boolean;
  variant?: 'default' | 'menu';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, showFullDetails = false, sizeLabels = { slice: 'Pinsa', half: 'Tonda', full: 'Pala' }, sizeActiveColor = 'orange', compact = false, hideDescription = false, insetImage = false, variant = 'default' }) => {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<'slice' | 'half' | 'full'>('slice');
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
  const [showToast, setShowToast] = useState(false);

  const getPrice = () => {
    // Se la tipologia non è disponibile (bevande o nessuna misura attiva), usa il primo prezzo disponibile
    if (product.category === 'bevande' || (!canSlice && !canHalf && !canFull)) {
      return product.pricePerSlice || product.priceHalfTray || product.priceFullTray;
    }
    switch (selectedSize) {
      case 'slice':
        return product.pricePerSlice;
      case 'half':
        return product.priceHalfTray;
      case 'full':
        return product.priceFullTray;
    }
  };
  const canSlice = (product.pricePerSlice ?? 0) > 0;
  const canHalf = (product.priceHalfTray ?? 0) > 0;
  const canFull = (product.priceFullTray ?? 0) > 0;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Se la tipologia non è mostrata nella card (bevande o nessuna misura disponibile), salva size vuoto
    const sizeToStore: '' | 'slice' | 'half' | 'full' =
      product.category === 'bevande' || (!canSlice && !canHalf && !canFull) ? '' : selectedSize;

    const item: CartItem = {
      product,
      size: sizeToStore,
      quantity,
      extras: selectedExtras,
      notes: '',
    };
    try {
      const startBtn = e.currentTarget as HTMLElement;
      const cartBtn = document.getElementById('navbar-cart-button');

      if (startBtn && cartBtn) {
        const startRect = startBtn.getBoundingClientRect();
        const endRect = cartBtn.getBoundingClientRect();

        const size = 18;
        const plane = document.createElement('div');
        plane.style.position = 'fixed';
        plane.style.left = `${startRect.left + startRect.width / 2 - size / 2}px`;
        plane.style.top = `${startRect.top + startRect.height / 2 - size / 2}px`;
        plane.style.width = `${size}px`;
        plane.style.height = `${size}px`;
        plane.style.zIndex = '9999';
        plane.style.pointerEvents = 'none';
        plane.style.transform = 'translate(0, 0)';

        const tri = document.createElement('div');
        tri.style.width = '0';
        tri.style.height = '0';
        tri.style.borderLeft = `${size / 2}px solid transparent`;
        tri.style.borderRight = `${size / 2}px solid transparent`;
        tri.style.borderBottom = `${size}px solid #ff7300`;
        tri.style.transform = 'rotate(-20deg)';
        tri.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))';

        plane.appendChild(tri);
        document.body.appendChild(plane);

        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;
        const dx = endX - startX;
        const dy = endY - startY;

        const animation = plane.animate(
          [
            { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
            { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.05) rotate(-10deg)`, opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.9)`, opacity: 0.9 },
          ],
          { duration: 800, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );

        animation.onfinish = () => {
          plane.remove();
          addItem(item);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        };
      } else {
        // Fallback: aggiorna subito il carrello se non troviamo gli elementi
        addItem(item);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    } catch {
      addItem(item);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const activeSizeClasses = sizeActiveColor === 'black'
    ? 'bg-neutral-black text-white border-neutral-black'
    : 'bg-primary-orange text-white border-primary-orange';
  
  // Variante stile "menu" basata sul CSS fornito (scoped su .menu-card)
  if (variant === 'menu') {
    return (
      <div className="menu-card">
        <div className="image_container">
          <img src={product.image} alt={product.name} className="image" loading="lazy" />
        </div>
        <div className="content">
          <div className="title-row">
            <div className="title"><span>{product.name}</span></div>
            {/* Prezzo in alto a destra su mobile; su desktop resta nella sezione action */}
            <div className="price-top sm:hidden">€{(getPrice() * quantity).toFixed(2)}</div>
          </div>

          {!hideDescription && product.description && (
            <div className="size"><span className="opacity-80">{product.description}</span></div>
          )}

          {Array.isArray(product.allergens) && product.allergens.length > 0 && (
            <div className="size">
              <span>Allergeni</span>
              <div className="flex flex-wrap items-center gap-2">
                {product.allergens.map((a) => (
                  <img key={a} src={`/allergeni/${a}.png`} alt={a} className="w-5 h-5" />
                ))}
              </div>
            </div>
          )}

          {product.category !== 'bevande' && (
            <div className="size">
              <span>Dimensione</span>
              <ul className="list-size">
                <li className="item-list">
                  <button
                    className={`item-list-button ${selectedSize === 'slice' ? 'item-list-button-active' : ''}`}
                    onClick={() => canSlice && setSelectedSize('slice')}
                  >
                    {sizeLabels.slice}
                  </button>
                </li>
                <li className="item-list">
                  <button
                    className={`item-list-button ${selectedSize === 'half' ? 'item-list-button-active' : ''}`}
                    onClick={() => canHalf && setSelectedSize('half')}
                  >
                    {sizeLabels.half}
                  </button>
                </li>
                <li className="item-list">
                  <button
                    className={`item-list-button ${selectedSize === 'full' ? 'item-list-button-active' : ''}`}
                    onClick={() => canFull && setSelectedSize('full')}
                  >
                    {sizeLabels.full}
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Selettore quantità su mobile; rimosso pulsante rapido "+" */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#18181b] text-white border border-[#18181b] rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-1 hover:bg-[#202022] transition-colors"
                aria-label="Diminuisci quantità"
              >
                −
              </button>
              <span className="px-4 py-1 font-medium" aria-live="polite">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-1 hover:bg-[#202022] transition-colors"
                aria-label="Aumenta quantità"
              >
                +
              </button>
            </div>
          </div>

          {/* Pulsante carrello visibile su mobile e desktop; prezzo desktop nella sezione action */}
          <div className="action">
            <div className="price hidden sm:block"><span>€{(getPrice() * quantity).toFixed(2)}</span></div>
            <button className="cart-button flex" onClick={handleAddToCart}>
              <span>Aggiungi al carrello</span>
            </button>
          </div>
        </div>

        {showToast && (
          <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
            <div className="mt-16 bg-green-600 text-white px-6 py-3 rounded-lg shadow-soft-lg animate-navbar-toast">
              Aggiunto al carrello!
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="card group hover:shadow-soft-lg transition-all duration-300">
      <div className={insetImage ? "relative overflow-hidden bg-white pt-4 px-4 pb-0 rounded-t-2xl" : "relative overflow-hidden"}>
        <img
          src={product.image}
          alt={product.name}
          className={`w-full ${insetImage ? (compact ? 'h-24' : 'h-36') : (compact ? 'h-36' : 'h-48')} object-cover group-hover:scale-105 transition-transform duration-500 ${insetImage ? 'rounded-t-2xl' : ''}`}
          loading="lazy"
        />


      </div>

      <div className={compact ? "p-4" : "p-5"}>
        <h3 className={compact ? "text-lg font-bold text-neutral-black mb-2" : "text-xl font-bold text-neutral-black mb-2"}>{product.name}</h3>
        {!hideDescription && product.description && (
          <p className="text-sm text-neutral-gray-600 mb-4 line-clamp-2">
            {product.description}
          </p>
        )}

        {Array.isArray(product.allergens) && product.allergens.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {product.allergens.map((a) => (
              <img key={a} src={`/allergeni/${a}.png`} alt={a} className="w-4 h-4" />
            ))}
          </div>
        )}

        {product.category !== 'bevande' && (
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => canSlice && setSelectedSize('slice')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                  selectedSize === 'slice'
                    ? activeSizeClasses
                    : 'bg-white text-neutral-gray-700 border-neutral-gray-300 hover:border-neutral-gray-400'
                }`}
              >
                {sizeLabels.slice}
              </button>
              <button
                onClick={() => canHalf && setSelectedSize('half')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                  selectedSize === 'half'
                    ? activeSizeClasses
                    : 'bg-white text-neutral-gray-700 border-neutral-gray-300 hover:border-neutral-gray-400'
                }`}
              >
                {sizeLabels.half}
              </button>
              <button
                onClick={() => canFull && setSelectedSize('full')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                  selectedSize === 'full'
                    ? activeSizeClasses
                    : 'bg-white text-neutral-gray-700 border-neutral-gray-300 hover:border-neutral-gray-400'
                }`}
              >
                {sizeLabels.full}
              </button>
            </div>
          </div>
        )}


        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-neutral-black">
            €{(getPrice() * quantity).toFixed(2)}
          </span>
          <div className="flex items-center bg-white text-neutral-black border border-neutral-gray-300 rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-1 text-neutral-black hover:bg-neutral-gray-100 transition-colors"
              aria-label="Diminuisci quantità"
            >
              −
            </button>
            <span className="px-4 py-1 font-medium text-neutral-black" aria-live="polite">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-1 text-neutral-black hover:bg-neutral-gray-100 transition-colors"
              aria-label="Aumenta quantità"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full flex items-center justify-center space-x-2 bg-neutral-black text-white rounded-lg py-3 hover:bg-neutral-black/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Aggiungi al carrello</span>
        </button>
      </div>

      {showToast && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
          <div className="mt-16 bg-green-600 text-white px-6 py-3 rounded-lg shadow-soft-lg animate-navbar-toast">
            Aggiunto al carrello!
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
