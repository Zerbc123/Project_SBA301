// Frontend API Client for Restaurant & Floor Service

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
}

export interface RestaurantProfile {
  id: string;
  name: string;
  hotline: string;
  email: string;
  address: string;
  description: string;
  coverImageUrl?: string;
  openingTime: string;
  closingTime: string;
  isActive: boolean;
  bankBin: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  defaultDepositAmount: number;
  cancellationGraceHours: number;
  holdTimeoutSeconds: number;
  updatedAt?: string;
}

export interface TimeSlot {
  id: string;
  slotName: string;
  startTime: string; // HH:mm:ss
  endTime: string;
  maxCapacity: number;
  isActive: boolean;
  createdAt?: string;
}

export interface FloorPlan {
  id: string;
  floorNumber: number;
  name: string;
  widthPx: number;
  heightPx: number;
  gridSize: number;
  layoutMetadata: string;
  isPublished: boolean;
  updatedAt?: string;
  tables?: Table[];
}

export interface Table {
  id: string;
  floorPlanId: string;
  tableCode: string;
  zoneType: string;
  minCapacity: number;
  maxCapacity: number;
  customDeposit?: number;
  isActive: boolean;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  shape: 'RECT' | 'SQUARE' | 'CIRCLE';
  updatedAt?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isPreorderAvailable: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface BlackoutDate {
  id: string;
  eventDate: string; // YYYY-MM-DD
  eventName: string;
  isClosed: boolean;
  customDepositAmount?: number;
  requireSpecialMenu: boolean;
  note?: string;
  createdAt?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const json: ApiResponse<T> = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }
    return json.data;
  } catch (error: any) {
    console.error(`API Error on [${options?.method || 'GET'}] ${endpoint}:`, error);
    throw error;
  }
}

export const restaurantApi = {
  // RESTAURANT PROFILE
  getProfile: () => request<RestaurantProfile>('/api/v1/restaurant/profile'),
  updateProfile: (data: Partial<RestaurantProfile>) =>
    request<RestaurantProfile>('/api/v1/restaurant/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // TIME SLOTS
  getTimeSlots: (activeOnly = false) =>
    request<TimeSlot[]>(`/api/v1/restaurant/time-slots?activeOnly=${activeOnly}`),
  getTimeSlotById: (id: string) => request<TimeSlot>(`/api/v1/restaurant/time-slots/${id}`),
  createTimeSlot: (data: Partial<TimeSlot>) =>
    request<TimeSlot>('/api/v1/restaurant/time-slots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTimeSlot: (id: string, data: Partial<TimeSlot>) =>
    request<TimeSlot>(`/api/v1/restaurant/time-slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleTimeSlot: (id: string) =>
    request<TimeSlot>(`/api/v1/restaurant/time-slots/${id}/toggle`, {
      method: 'PATCH',
    }),
  deleteTimeSlot: (id: string) =>
    request<void>(`/api/v1/restaurant/time-slots/${id}`, {
      method: 'DELETE',
    }),

  // FLOOR PLANS
  getFloorPlans: (publishedOnly = false, includeTables = true) =>
    request<FloorPlan[]>(`/api/v1/restaurant/floor-plans?publishedOnly=${publishedOnly}&includeTables=${includeTables}`),
  getFloorPlanById: (id: string, includeTables = true) =>
    request<FloorPlan>(`/api/v1/restaurant/floor-plans/${id}?includeTables=${includeTables}`),
  getFloorPlanByNumber: (floorNumber: number, includeTables = true) =>
    request<FloorPlan>(`/api/v1/restaurant/floor-plans/number/${floorNumber}?includeTables=${includeTables}`),
  createFloorPlan: (data: Partial<FloorPlan>) =>
    request<FloorPlan>('/api/v1/restaurant/floor-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFloorPlan: (id: string, data: Partial<FloorPlan>) =>
    request<FloorPlan>(`/api/v1/restaurant/floor-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateLayoutMetadata: (id: string, layoutMetadata: string) =>
    request<FloorPlan>(`/api/v1/restaurant/floor-plans/${id}/layout`, {
      method: 'PATCH',
      body: JSON.stringify({ layoutMetadata }),
    }),
  toggleFloorPlanPublish: (id: string) =>
    request<FloorPlan>(`/api/v1/restaurant/floor-plans/${id}/publish`, {
      method: 'PATCH',
    }),
  deleteFloorPlan: (id: string) =>
    request<void>(`/api/v1/restaurant/floor-plans/${id}`, {
      method: 'DELETE',
    }),

  // TABLES
  getTables: (floorPlanId?: string, activeOnly = false) => {
    const q = new URLSearchParams();
    if (floorPlanId) q.append('floorPlanId', floorPlanId);
    if (activeOnly) q.append('activeOnly', 'true');
    const qs = q.toString();
    return request<Table[]>(`/api/v1/restaurant/tables${qs ? '?' + qs : ''}`);
  },
  getTableById: (id: string) => request<Table>(`/api/v1/restaurant/tables/${id}`),
  createTable: (data: Partial<Table>) =>
    request<Table>('/api/v1/restaurant/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTable: (id: string, data: Partial<Table>) =>
    request<Table>(`/api/v1/restaurant/tables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  batchUpdatePositions: (tables: Partial<Table>[]) =>
    request<Table[]>('/api/v1/restaurant/tables/batch-positions', {
      method: 'PUT',
      body: JSON.stringify(tables),
    }),
  toggleTableActive: (id: string) =>
    request<Table>(`/api/v1/restaurant/tables/${id}/toggle`, {
      method: 'PATCH',
    }),
  deleteTable: (id: string) =>
    request<void>(`/api/v1/restaurant/tables/${id}`, {
      method: 'DELETE',
    }),

  // MENU CATEGORIES
  getMenuCategories: (activeOnly = false, includeItems = true) =>
    request<MenuCategory[]>(`/api/v1/restaurant/menu/categories?activeOnly=${activeOnly}&includeItems=${includeItems}`),
  createMenuCategory: (data: Partial<MenuCategory>) =>
    request<MenuCategory>('/api/v1/restaurant/menu/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMenuCategory: (id: string, data: Partial<MenuCategory>) =>
    request<MenuCategory>(`/api/v1/restaurant/menu/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleMenuCategory: (id: string) =>
    request<MenuCategory>(`/api/v1/restaurant/menu/categories/${id}/toggle`, {
      method: 'PATCH',
    }),
  deleteMenuCategory: (id: string) =>
    request<void>(`/api/v1/restaurant/menu/categories/${id}`, {
      method: 'DELETE',
    }),

  // MENU ITEMS
  getMenuItems: (categoryId?: string, activeOnly = false, preorderOnly = false) => {
    const q = new URLSearchParams();
    if (categoryId) q.append('categoryId', categoryId);
    if (activeOnly) q.append('activeOnly', 'true');
    if (preorderOnly) q.append('preorderOnly', 'true');
    const qs = q.toString();
    return request<MenuItem[]>(`/api/v1/restaurant/menu/items${qs ? '?' + qs : ''}`);
  },
  createMenuItem: (data: Partial<MenuItem>) =>
    request<MenuItem>('/api/v1/restaurant/menu/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMenuItem: (id: string, data: Partial<MenuItem>) =>
    request<MenuItem>(`/api/v1/restaurant/menu/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleMenuItem: (id: string) =>
    request<MenuItem>(`/api/v1/restaurant/menu/items/${id}/toggle`, {
      method: 'PATCH',
    }),
  deleteMenuItem: (id: string) =>
    request<void>(`/api/v1/restaurant/menu/items/${id}`, {
      method: 'DELETE',
    }),

  // BLACKOUT DATES
  getBlackoutDates: () => request<BlackoutDate[]>('/api/v1/restaurant/blackout-dates'),
  createBlackoutDate: (data: Partial<BlackoutDate>) =>
    request<BlackoutDate>('/api/v1/restaurant/blackout-dates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBlackoutDate: (id: string, data: Partial<BlackoutDate>) =>
    request<BlackoutDate>(`/api/v1/restaurant/blackout-dates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBlackoutDate: (id: string) =>
    request<void>(`/api/v1/restaurant/blackout-dates/${id}`, {
      method: 'DELETE',
    }),
};
