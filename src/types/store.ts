import type { RecolorMode } from '../lib/recolorProduct';

export type ProductCategory =
  | 'T-Shirts'
  | 'Hoodies'
  | 'Shoes'
  | 'Bags'
  | 'Caps'
  | 'Pants & Gear';

export interface ProductVariant {
  colorName: string;
  colorHex: string;
  imageUrl: string;
  imageFilter?: string;
  recolorHex?: string;
  recolorMode?: RecolorMode;
  stock: number;
  sizeStock?: Record<string, number>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  subCategory: string;
  artisanMaterial: string;
  price: number;
  description: string;
  sizes: string[];
  variants: ProductVariant[];
  defaultImage: string;
  featured: boolean;
  badge: string;
  totalStock: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  id: string;
  userId?: string;
  productId: string;
  productName: string;
  category: string;
  colorName: string;
  colorHex: string;
  imageUrl: string;
  imageFilter?: string;
  recolorHex?: string;
  recolorMode?: RecolorMode;
  size: string;
  price: number;
  quantity: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderItem {
  productId: string;
  productName: string;
  category?: string;
  colorName: string;
  colorHex?: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl: string;
  recolorHex?: string;
  recolorMode?: RecolorMode;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'COD' | 'GCash' | 'Maya' | 'Card' | 'Bank Transfer';

export type PaymentStatus =
  | 'Pay on Delivery'
  | 'Awaiting Payment'
  | 'Pending Verification'
  | 'Paid';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentChannel?: string;
  paymentReference?: string;
  gatewaySessionId?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'customer' | 'admin';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const ADMIN_EMAIL = 'tedjustinegantong@gmail.com';

export const FIELD_LIMITS = {
  NAME_MAX: 140,
  DESC_MAX: 1000,
  ADDRESS_MAX: 300,
  CITY_MAX: 80,
  PHONE_MAX: 40,
  CUSTOMER_NAME_MAX: 100,
} as const;

export const FREE_SHIPPING_THRESHOLD = 1999;
export const STANDARD_SHIPPING_FEE = 85;
