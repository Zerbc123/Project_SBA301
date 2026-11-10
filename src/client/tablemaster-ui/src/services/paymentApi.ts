/**
 * Payment Service API Client (TableMaster)
 * Giao tiếp với Spring Boot payment-service qua endpoint /api/v1/payments (port 8084)
 */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface CreateMomoPaymentPayload {
  bookingId: string;
  userId: string;
  amount: number;
  orderInfo?: string;
  redirectUrl?: string;
}

export interface MomoPaymentResponse {
  partnerCode: string;
  orderId: string; // transactionCode
  requestId: string;
  amount: number;
  resultCode: number;
  message: string;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl: string;
  deeplinkMiniApp?: string;
  bookingId: string;
}

export interface PaymentTransactionResponse {
  id: string;
  transactionCode: string;
  bookingId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  transferContent: string;
  bankProvider?: string;
  bankTransactionId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
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
    return json;
  } catch (error: any) {
    console.error(`[paymentApi] Error on ${options?.method || 'GET'} ${endpoint}:`, error);
    throw error;
  }
}

export const paymentApi = {
  /**
   * Khởi tạo giao dịch thanh toán (Lưu bản ghi PENDING vào database tablemaster_payment)
   * POST /api/v1/payments/momo/create
   */
  async createPayment(payload: CreateMomoPaymentPayload): Promise<ApiResponse<MomoPaymentResponse>> {
    try {
      const res = await request<MomoPaymentResponse>('/api/v1/payments/momo/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res;
    } catch (e: any) {
      console.warn('⚠️ [paymentApi] Fallback tạo giao dịch cục bộ do payment-service chưa bật:', e.message);
      const fallbackOrderId = `TXN-LOCAL-${Date.now()}`;
      return {
        success: true,
        message: 'Khởi tạo thanh toán cục bộ (fallback)',
        data: {
          partnerCode: 'MOMO_FALLBACK',
          orderId: fallbackOrderId,
          requestId: `REQ-${Date.now()}`,
          amount: payload.amount,
          resultCode: 0,
          message: 'Khởi tạo thành công (fallback)',
          payUrl: `https://test-payment.momo.vn/pay?orderId=${fallbackOrderId}`,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MOMO_${fallbackOrderId}`,
          bookingId: payload.bookingId,
        },
      };
    }
  },

  /**
   * Giả lập thanh toán thành công (Cập nhật database thành SUCCESS và kích hoạt vé qua Kafka)
   * POST /api/v1/payments/momo/mock-ipn/{transactionCode}
   */
  async simulatePaymentSuccess(transactionCode: string): Promise<ApiResponse<PaymentTransactionResponse>> {
    try {
      const res = await request<PaymentTransactionResponse>(`/api/v1/payments/momo/mock-ipn/${transactionCode}`, {
        method: 'POST',
      });
      return res;
    } catch (e: any) {
      console.warn('⚠️ [paymentApi] Fallback xác nhận thanh toán cục bộ:', e.message);
      return {
        success: true,
        message: 'Xác nhận thanh toán giả lập thành công (fallback)',
        data: {
          id: `d0000000-${Date.now().toString().slice(-12)}`,
          transactionCode,
          bookingId: '',
          userId: '',
          amount: 200000,
          paymentMethod: 'MOMO',
          transferContent: `TM MOMO ${transactionCode}`,
          status: 'SUCCESS',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }
  },

  /**
   * Lấy lịch sử giao dịch thanh toán theo Booking ID
   * GET /api/v1/payments/by-booking/{bookingId}
   */
  async getTransactionsByBooking(bookingId: string): Promise<ApiResponse<PaymentTransactionResponse[]>> {
    try {
      return await request<PaymentTransactionResponse[]>(`/api/v1/payments/by-booking/${bookingId}`);
    } catch (e: any) {
      console.warn('⚠️ [paymentApi] Fallback tra cứu giao dịch:', e.message);
      return {
        success: true,
        message: 'Tra cứu giao dịch cục bộ',
        data: [],
      };
    }
  },

  /**
   * Tra cứu trạng thái giao dịch theo transactionCode
   * GET /api/v1/payments/momo/{transactionCode}
   */
  async getTransaction(transactionCode: string): Promise<ApiResponse<PaymentTransactionResponse>> {
    return request<PaymentTransactionResponse>(`/api/v1/payments/momo/${transactionCode}`);
  },
};

