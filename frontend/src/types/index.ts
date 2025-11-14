export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'classiche' | 'gourmet' | 'bianche' | 'veg' | 'dolci' | 'bevande';
  image: string;
  pricePerSlice: number;
  priceHalfTray: number;
  priceFullTray: number;
  isVegetarian: boolean;
  isSpicy: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  allergens: string[];
  extras?: ProductExtra[];
}

export interface ProductExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  product: Product;
  size: 'slice' | 'half' | 'full' | '';
  quantity: number;
  extras: ProductExtra[];
  notes: string;
}

export interface DeliveryInfo {
  type: 'delivery' | 'pickup';
  address?: string;
  floor?: string;
  buzzer?: string;
  notes?: string;
  timeSlot?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface Testimonial {
  name: string;
  rating: number;
  comment: string;
  date: string;
}
