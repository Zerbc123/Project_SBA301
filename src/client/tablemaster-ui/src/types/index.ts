export type TableStatus = 'AVAILABLE' | 'HOLDING' | 'CONFIRMED' | 'SEATED' | 'CLEANING';

export type TableShape = 'rect' | 'circle';

export type FloorZone = 'WINDOW_VIEW' | 'VIP' | 'OUTDOOR' | 'STANDARD' | 'BAR_SIDE';

export interface TableItem {
  id: string;
  code: string;
  floor: 1 | 2 | 3;
  shape: TableShape;
  capacity: number;
  x: number; // percentage or px coordinate
  y: number;
  width: number;
  height: number;
  rotation?: number;
  status: TableStatus;
  zone: FloorZone;
  depositPrice: number; // in VND
  currentGuestName?: string;
  guestPhone?: string;
  seatedSince?: string; // ISO or human string e.g. "42 phút"
  bookingTime?: string;
  holdExpiresAt?: number; // timestamp in ms
  isLateNoShow?: boolean;
  revenueGenerated?: number; // for heatmap
  turnoverRate?: number; // turns per shift
}

export interface SignatureDish {
  id: string;
  name: string;
  category: 'Luxury Combo' | 'VIP Feast' | 'Steak & Main' | 'Wine & Cellar' | 'Seafood' | 'Dessert' | string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  badge?: string;
  recommendedPairing?: string;
  prepTimeMinutes?: number;
  servingSize?: string;
  comboItems?: string[];
}

export interface PreOrderItem {
  dish: SignatureDish;
  quantity: number;
}

export interface BookingDetails {
  bookingId: string;
  customerName: string;
  phone: string;
  email: string;
  partySize: number;
  floor: 1 | 2 | 3;
  tableCode: string;
  tableId: string;
  date: string;
  timeSlot: string;
  notes?: string;
  preOrders: PreOrderItem[];
  depositAmount: number;
  totalEstimatedAmount: number;
  createdAt: string;
  status: 'PENDING_DEPOSIT' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  vietqrCode: string;
}

export interface FloorMetric {
  revPASH: string;
  occupancyRate: string;
  noShowRate: string;
  monthlyDepositRevenue: string;
}

export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  status: 'PREPARING' | 'SERVED';
  category: string;
  notes?: string;
}

export interface TableOrderRecord {
  tableCode: string;
  guestName: string;
  phone?: string;
  source: 'ONLINE' | 'WALK_IN';
  guestCount: number;
  seatedAtTime: string;
  notes?: string;
  depositAmount: number;
  items: OrderItem[];
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_WAITER' | 'ROLE_HOST' | 'ROLE_CUSTOMER';
  isActive: boolean;
  loyaltyPoints?: number;
  vipTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  vipTierName?: string;
  avatarUrl?: string | null;
  dietaryPreferences?: string | null;
}

export interface LoyaltyWallet {
  userId: string;
  loyaltyPoints: number;
  vipTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  vipTierName: string;
  pointsToNextTier: number;
  depositDiscountPercent: number;
}

export interface ReviewItem {
  id: string;
  userId: string;
  customerName: string;
  customerAvatar?: string | null;
  bookingId?: string | null;
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  overallRating: number;
  comment?: string | null;
  pointsAwarded: number;
  createdAt: string;
}

export interface CreateReviewPayload {
  bookingId?: string;
  foodRating: number;
  serviceRating: number;
  ambianceRating: number;
  overallRating?: number;
  comment?: string;
}
