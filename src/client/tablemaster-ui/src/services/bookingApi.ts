/**
 * Booking Service API Client (TableMaster)
 * Giao tiếp với Spring Boot backend qua endpoint /api/v1/bookings
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface BackendBooking {
  id: string;
  bookingCode: string;
  userId?: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  bookingDate: string;
  timeSlotId: string;
  guestCount: number;
  totalDeposit: number;
  status: 'PENDING_REVIEW' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'NO_SHOW';
  specialNotes?: string;
  staffNotes?: string;
  reviewedByUserId?: string;
  paymentDeadline?: string;
  checkinQrToken?: string;
  seatedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  tableIds?: string[];
  preorderItems?: Array<{
    id?: string;
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface CreateBookingRequestPayload {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  bookingDate: string;
  timeSlotId: string;
  guestCount: number;
  tableIds: string[];
  specialNotes?: string;
  totalDeposit?: number;
  preorderItems?: Array<{
    menuItemId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// UC-04: Chi tiết tình trạng khả dụng & kiểm tra BR-01 của từng bàn
export interface TableAvailabilityDto {
  tableId: string;
  tableCode: string;
  floorPlanId?: string;
  floorNumber: number;
  floorName: string;
  zoneType: string;
  minCapacity: number;
  maxCapacity: number;
  customDeposit?: number;
  shape?: string;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'OCCUPIED' | 'HELD' | 'CAPACITY_MISMATCH' | 'INACTIVE';
  statusMessage: string;
  satisfiesCapacityRule: boolean;
  isBookedInDb: boolean;
  isHeldInRedis: boolean;
  recommended: boolean;
}

export interface AvailabilitySearchParams {
  bookingDate?: string;
  timeSlotId?: string;
  shift?: 'LUNCH' | 'DINNER' | 'ALL' | string;
  adults?: number;
  children?: number;
  guestCount?: number;
  floor?: number;
  floorPlanId?: string;
  zoneType?: string;
  onlyAvailable?: boolean;
}

export interface TimeSlotAvailabilitySummary {
  timeSlotId: string;
  slotName: string;
  startTime: string;
  endTime: string;
  shift: string;
  availableTablesCount: number;
  totalTablesCount: number;
  isAvailable: boolean;
}

export interface AvailabilitySearchResponse {
  bookingDate: string;
  timeSlotId?: string;
  timeSlotName: string;
  shift?: string;
  adults: number;
  children: number;
  totalGuests: number;
  floor?: number;
  zoneType?: string;
  totalTables: number;
  availableCount: number;
  occupiedCount: number;
  heldCount: number;
  capacityMismatchCount: number;
  recommendedTableId?: string;
  recommendedTableCode?: string;
  tables: TableAvailabilityDto[];
  alternativeSlots?: TimeSlotAvailabilitySummary[];
}


// Fallback UUIDs từ Seed Data cơ sở dữ liệu
export const SEED_DATA = {
  USER_ID: 'a0000000-0000-0000-0000-000000000005', // Khách VIP
  STAFF_ID: 'a0000000-0000-0000-0000-000000000003', // Lễ tân
  TIME_SLOT_ID: 'b1000000-0000-0000-0000-000000000002', // Ca tối Giờ Vàng
  TABLES: {
    BAR_01: 'b3000000-0000-0000-0000-000000000001',
    WIN_01: 'b3000000-0000-0000-0000-000000000002',
    VIP_01: 'b3000000-0000-0000-0000-000000000003',
    OUT_01: 'b3000000-0000-0000-0000-000000000004',
    OUT_02: 'b3000000-0000-0000-0000-000000000005',
  },
  MENU_ITEM_ID: 'b5000000-0000-0000-0000-000000000001',
};

// Map ID bàn mock sang UUID tương ứng trong PostgreSQL
export const TABLE_ID_MAP: Record<string, string> = {
  'f1-t01': SEED_DATA.TABLES.BAR_01,
  'f1-t02': SEED_DATA.TABLES.WIN_01,
  'f1-t03': SEED_DATA.TABLES.VIP_01,
  'f1-t04': SEED_DATA.TABLES.OUT_01,
  'f1-t05': SEED_DATA.TABLES.OUT_02,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureUUID(val?: string, fallback: string = SEED_DATA.TABLES.WIN_01): string {
  if (!val) return fallback;
  if (UUID_REGEX.test(val)) return val;
  if (TABLE_ID_MAP[val]) return TABLE_ID_MAP[val];
  return fallback;
}

const BASE_URL = '/api/v1/bookings';

export const bookingApi = {
  /**
   * 1. Khách gửi yêu cầu đặt bàn trực tuyến
   * POST /api/v1/bookings/request
   */
  async createBooking(payload: CreateBookingRequestPayload): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': SEED_DATA.USER_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Lỗi máy chủ (${res.status})` }));
      throw new Error(err.message || 'Không thể tạo đơn đặt bàn');
    }

    return res.json();
  },

  /**
   * 2. Lấy danh sách tất cả các đơn đặt bàn
   * GET /api/v1/bookings
   */
  async getAllBookings(bookingDate?: string, status?: string): Promise<ApiResponse<BackendBooking[]>> {
    const params = new URLSearchParams();
    if (bookingDate) params.append('bookingDate', bookingDate);
    if (status) params.append('status', status);

    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Lỗi ${res.status}` }));
      throw new Error(err.message || 'Không thể tải danh sách đơn đặt bàn');
    }

    return res.json();
  },

  /**
   * 3. Xem chi tiết một đơn
   * GET /api/v1/bookings/{id}
   */
  async getBookingById(id: string): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error('Không tìm thấy đơn đặt bàn');
    return res.json();
  },

  /**
   * 3b. Khách hàng xem lịch sử các đơn đặt bàn của mình (UC-03)
   * GET /api/v1/bookings/my-bookings
   */
  async getMyBookings(userId?: string): Promise<ApiResponse<BackendBooking[]>> {
    const targetUserId = userId || SEED_DATA.USER_ID;
    const res = await fetch(`${BASE_URL}/my-bookings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': targetUserId,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Lỗi ${res.status}` }));
      throw new Error(err.message || 'Không thể tải lịch sử đơn đặt bàn');
    }

    return res.json();
  },

  /**
   * 3c. Tải hóa đơn cọc điện tử dạng PDF (UC-03)
   * GET /api/v1/bookings/{id}/invoice-pdf
   */
  async downloadInvoicePdf(bookingId: string, bookingCode: string = 'Invoice'): Promise<void> {
    const res = await fetch(`${BASE_URL}/${bookingId}/invoice-pdf`, {
      method: 'GET',
    });

    if (!res.ok) {
      throw new Error('Không thể tải hóa đơn cọc điện tử. Vui lòng thử lại sau.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${bookingCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 4. Lễ tân duyệt đơn và yêu cầu cọc
   * POST /api/v1/bookings/{id}/approve-and-request-deposit
   */
  async approveAndRequestDeposit(
    id: string,
    depositAmount: number,
    deadlineMinutes: number = 60,
    staffNotes?: string
  ): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/${id}/approve-and-request-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': SEED_DATA.STAFF_ID,
      },
      body: JSON.stringify({
        depositAmount,
        deadlineMinutes,
        staffNotes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Lỗi duyệt đơn' }));
      throw new Error(err.message || 'Lỗi duyệt đơn');
    }

    return res.json();
  },

  /**
   * 5. Lễ tân từ chối đơn
   * POST /api/v1/bookings/{id}/reject
   */
  async rejectBooking(id: string, reason: string): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': SEED_DATA.STAFF_ID,
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) throw new Error('Lỗi từ chối đơn');
    return res.json();
  },

  /**
   * 6. Quét QR Check-in đón khách vào bàn
   * POST /api/v1/bookings/check-in
   */
  async checkIn(qrToken: string): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qrToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Mã QR không hợp lệ' }));
      throw new Error(err.message || 'Check-in thất bại');
    }

    return res.json();
  },

  /**
   * 7. Hoàn tất bữa ăn sau khi thanh toán xong
   * POST /api/v1/bookings/{id}/complete
   */
  async completeBooking(id: string): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/${id}/complete`, {
      method: 'POST',
    });

    if (!res.ok) throw new Error('Không thể hoàn tất bữa ăn');
    return res.json();
  },

  /**
   * 8. Hủy đơn đặt bàn
   * POST /api/v1/bookings/{id}/cancel
   */
  async cancelBooking(id: string, reason: string): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': SEED_DATA.USER_ID,
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) throw new Error('Hủy đơn thất bại');
    return res.json();
  },

  /**
   * 9. Chuyển đổi bàn
   * POST /api/v1/bookings/{id}/transfer-table
   */
  async transferTable(id: string, sourceTableId: string, targetTableId: string, reason?: string): Promise<ApiResponse<BackendBooking>> {
    const res = await fetch(`${BASE_URL}/${id}/transfer-table`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': SEED_DATA.STAFF_ID,
      },
      body: JSON.stringify({
        sourceTableId: ensureUUID(sourceTableId),
        targetTableId: ensureUUID(targetTableId),
        reason: reason || 'Khách yêu cầu chuyển bàn',
      }),
    });

    if (!res.ok) throw new Error('Chuyển bàn thất bại');
    return res.json();
  },

  /**
   * 10. Phục vụ gọi thêm món tại bàn
   * POST /api/v1/bookings/{id}/table-orders
   */
  async addTableOrders(id: string, tableId: string, items: Array<{
    menuItemId?: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>) {
    const res = await fetch(`${BASE_URL}/${id}/table-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': SEED_DATA.STAFF_ID,
      },
      body: JSON.stringify({
        tableId: ensureUUID(tableId),
        items,
      }),
    });

    if (!res.ok) throw new Error('Gọi món thất bại');
    return res.json();
  },

  /**
   * 11. UC-04: Tra cứu Bàn trống theo Ca giờ & Số người (Availability Search Engine)
   * GET /api/v1/bookings/availability
   */
  async searchAvailability(params: AvailabilitySearchParams): Promise<ApiResponse<AvailabilitySearchResponse>> {
    const query = new URLSearchParams();
    if (params.bookingDate) query.append('bookingDate', params.bookingDate);
    if (params.timeSlotId) query.append('timeSlotId', params.timeSlotId);
    if (params.shift) query.append('shift', params.shift);
    if (params.adults !== undefined) query.append('adults', params.adults.toString());
    if (params.children !== undefined) query.append('children', params.children.toString());
    if (params.guestCount !== undefined) query.append('guestCount', params.guestCount.toString());
    if (params.floor !== undefined) query.append('floor', params.floor.toString());
    if (params.floorPlanId) query.append('floorPlanId', params.floorPlanId);
    if (params.zoneType) query.append('zoneType', params.zoneType);
    if (params.onlyAvailable !== undefined) query.append('onlyAvailable', params.onlyAvailable.toString());

    const url = `${BASE_URL}/availability?${query.toString()}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('⚠️ [bookingApi] Không thể kết nối backend /availability, sử dụng engine mô phỏng:', e);
    }

    // Fallback Client Simulation nếu backend chưa bật
    const totalGuests = (params.guestCount && params.guestCount > 0)
      ? params.guestCount
      : ((params.adults || 2) + (params.children || 0));

    const fallbackCatalog: TableAvailabilityDto[] = [
      {
        tableId: SEED_DATA.TABLES.BAR_01,
        tableCode: 'BAR-01',
        floorNumber: 1,
        floorName: 'Tầng 1 - Sảnh Vòm & Bar',
        zoneType: 'BAR_SIDE',
        minCapacity: 1,
        maxCapacity: 2,
        customDeposit: 100000,
        shape: 'CIRCLE',
        isAvailable: totalGuests >= 1 && totalGuests <= 2,
        status: (totalGuests >= 1 && totalGuests <= 2) ? 'AVAILABLE' : 'CAPACITY_MISMATCH',
        statusMessage: (totalGuests >= 1 && totalGuests <= 2)
          ? 'Bàn trống - Thỏa mãn điều kiện sức chứa (BR-01)'
          : totalGuests < 1
            ? 'Vi phạm BR-01: Đi 0 khách không thể đặt bàn'
            : `Số khách (${totalGuests}) vượt quá sức chứa tối đa của bàn (2 chỗ)`,
        satisfiesCapacityRule: totalGuests >= 1 && totalGuests <= 2,
        isBookedInDb: false,
        isHeldInRedis: false,
        recommended: totalGuests <= 2,
      },
      {
        tableId: SEED_DATA.TABLES.WIN_01,
        tableCode: 'WIN-01',
        floorNumber: 1,
        floorName: 'Tầng 1 - Sảnh Vòm & Bar',
        zoneType: 'WINDOW_VIEW',
        minCapacity: 2,
        maxCapacity: 4,
        customDeposit: 200000,
        shape: 'RECT',
        isAvailable: totalGuests >= 2 && totalGuests <= 4,
        status: (totalGuests >= 2 && totalGuests <= 4) ? 'AVAILABLE' : 'CAPACITY_MISMATCH',
        statusMessage: (totalGuests >= 2 && totalGuests <= 4)
          ? 'Bàn trống - Thỏa mãn điều kiện sức chứa (BR-01)'
          : totalGuests < 2
            ? 'Vi phạm BR-01: Đi 1 người không được đặt bàn 4 chỗ giờ cao điểm'
            : `Số khách (${totalGuests}) vượt quá sức chứa tối đa của bàn (4 chỗ)`,
        satisfiesCapacityRule: totalGuests >= 2 && totalGuests <= 4,
        isBookedInDb: false,
        isHeldInRedis: false,
        recommended: totalGuests >= 3 && totalGuests <= 4,
      },
      {
        tableId: SEED_DATA.TABLES.VIP_01,
        tableCode: 'VIP-01',
        floorNumber: 2,
        floorName: 'Tầng 2 - Phòng VIP Riêng Tư',
        zoneType: 'VIP',
        minCapacity: 6,
        maxCapacity: 12,
        customDeposit: 500000,
        shape: 'RECT',
        isAvailable: totalGuests >= 6 && totalGuests <= 12,
        status: (totalGuests >= 6 && totalGuests <= 12) ? 'AVAILABLE' : 'CAPACITY_MISMATCH',
        statusMessage: (totalGuests >= 6 && totalGuests <= 12)
          ? 'Bàn trống - Thỏa mãn điều kiện sức chứa (BR-01)'
          : totalGuests < 6
            ? `Vi phạm BR-01: Đi ${totalGuests} người không được đặt phòng VIP tối thiểu 6 chỗ trong ca cao điểm`
            : `Số khách (${totalGuests}) vượt quá sức chứa tối đa của phòng VIP (12 chỗ)`,
        satisfiesCapacityRule: totalGuests >= 6 && totalGuests <= 12,
        isBookedInDb: false,
        isHeldInRedis: false,
        recommended: totalGuests >= 6 && totalGuests <= 12,
      },
      {
        tableId: SEED_DATA.TABLES.OUT_01,
        tableCode: 'OUT-01',
        floorNumber: 3,
        floorName: 'Tầng 3 - Sky Lounge Ngoài Trời',
        zoneType: 'OUTDOOR',
        minCapacity: 2,
        maxCapacity: 4,
        customDeposit: 300000,
        shape: 'SQUARE',
        isAvailable: totalGuests >= 2 && totalGuests <= 4,
        status: (totalGuests >= 2 && totalGuests <= 4) ? 'AVAILABLE' : 'CAPACITY_MISMATCH',
        statusMessage: (totalGuests >= 2 && totalGuests <= 4)
          ? 'Bàn trống - Thỏa mãn điều kiện sức chứa (BR-01)'
          : totalGuests < 2
            ? 'Vi phạm BR-01: Đi 1 người không được đặt bàn ngoài trời 4 chỗ'
            : `Số khách (${totalGuests}) vượt quá sức chứa tối đa của bàn (4 chỗ)`,
        satisfiesCapacityRule: totalGuests >= 2 && totalGuests <= 4,
        isBookedInDb: false,
        isHeldInRedis: false,
        recommended: false,
      },
      {
        tableId: SEED_DATA.TABLES.OUT_02,
        tableCode: 'OUT-02',
        floorNumber: 3,
        floorName: 'Tầng 3 - Sky Lounge Ngoài Trời',
        zoneType: 'OUTDOOR',
        minCapacity: 4,
        maxCapacity: 6,
        customDeposit: 300000,
        shape: 'RECT',
        isAvailable: totalGuests >= 4 && totalGuests <= 6,
        status: (totalGuests >= 4 && totalGuests <= 6) ? 'AVAILABLE' : 'CAPACITY_MISMATCH',
        statusMessage: (totalGuests >= 4 && totalGuests <= 6)
          ? 'Bàn trống - Thỏa mãn điều kiện sức chứa (BR-01)'
          : totalGuests < 4
            ? `Vi phạm BR-01: Đi ${totalGuests} người không được đặt bàn ban công 6 chỗ`
            : `Số khách (${totalGuests}) vượt quá sức chứa tối đa của bàn (6 chỗ)`,
        satisfiesCapacityRule: totalGuests >= 4 && totalGuests <= 6,
        isBookedInDb: false,
        isHeldInRedis: false,
        recommended: totalGuests >= 5 && totalGuests <= 6,
      },
    ];

    const filtered = fallbackCatalog.filter((t) => {
      if (params.floor && t.floorNumber !== params.floor) return false;
      if (params.zoneType && params.zoneType !== 'ALL' && t.zoneType !== params.zoneType) return false;
      if (params.onlyAvailable && !t.isAvailable) return false;
      return true;
    });

    const availables = filtered.filter((t) => t.isAvailable);

    return {
      success: true,
      message: 'Tra cứu bàn trống thành công (Fallback Engine)',
      data: {
        bookingDate: params.bookingDate || new Date().toISOString().split('T')[0],
        timeSlotId: params.timeSlotId || SEED_DATA.TIME_SLOT_ID,
        timeSlotName: 'Ca tối Giờ Vàng (18:30 - 20:30)',
        shift: params.shift || 'DINNER',
        adults: params.adults || 2,
        children: params.children || 0,
        totalGuests,
        floor: params.floor,
        zoneType: params.zoneType,
        totalTables: filtered.length,
        availableCount: availables.length,
        occupiedCount: 0,
        heldCount: 0,
        capacityMismatchCount: filtered.filter((t) => t.status === 'CAPACITY_MISMATCH').length,
        recommendedTableId: availables.length > 0 ? availables[0].tableId : undefined,
        recommendedTableCode: availables.length > 0 ? availables[0].tableCode : undefined,
        tables: filtered,
        alternativeSlots: [
          {
            timeSlotId: 'b1000000-0000-0000-0000-000000000001',
            slotName: 'Ca trưa 1 (11:00 - 13:00)',
            startTime: '11:00:00',
            endTime: '13:00:00',
            shift: 'LUNCH',
            availableTablesCount: 5,
            totalTablesCount: 5,
            isAvailable: true,
          },
          {
            timeSlotId: 'b1000000-0000-0000-0000-000000000002',
            slotName: 'Ca tối Giờ Vàng (18:30 - 20:30)',
            startTime: '18:30:00',
            endTime: '20:30:00',
            shift: 'DINNER',
            availableTablesCount: availables.length,
            totalTablesCount: 5,
            isAvailable: availables.length > 0,
          },
        ],
      },
    };
  },

  /**
   * 12. Kiểm tra trạng thái và ràng buộc BR-01 của 1 bàn cụ thể
   * GET /api/v1/bookings/availability/check-table
   */
  async checkTableAvailability(
    tableId: string,
    bookingDate?: string,
    timeSlotId?: string,
    guestCount: number = 2
  ): Promise<ApiResponse<TableAvailabilityDto>> {
    const q = new URLSearchParams();
    q.append('tableId', ensureUUID(tableId));
    if (bookingDate) q.append('bookingDate', bookingDate);
    if (timeSlotId) q.append('timeSlotId', timeSlotId);
    q.append('guestCount', guestCount.toString());

    const res = await fetch(`${BASE_URL}/availability/check-table?${q.toString()}`);
    if (!res.ok) throw new Error('Không thể kiểm tra tình trạng bàn');
    return res.json();
  },
};

