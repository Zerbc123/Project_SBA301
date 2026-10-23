import type { AuthUser } from '../types';
import { authStorage } from './authStorage';

export interface AdminUserItem extends AuthUser {
  hasPassword?: boolean;
  createdAt?: string;
}

export const authApi = {
  // Get all users with filters (Staff, Registered, Guest Diners)
  getAllUsers: async (role = 'ALL', userType = 'ALL', search = ''): Promise<AdminUserItem[]> => {
    const params = new URLSearchParams();
    if (role && role !== 'ALL') params.append('role', role);
    if (userType && userType !== 'ALL') params.append('userType', userType);
    if (search && search.trim()) params.append('search', search.trim());

    const token = authStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/auth/admin/users?${params.toString()}`, { headers });
    if (!res.ok) {
      throw new Error(`Lỗi tải danh sách người dùng (${res.status})`);
    }
    return res.json();
  },

  // Toggle user active status (Lock / Unlock)
  toggleUserStatus: async (userId: string): Promise<AdminUserItem> => {
    const token = authStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/auth/admin/users/${userId}/toggle-status`, {
      method: 'PUT',
      headers,
    });
    if (!res.ok) {
      throw new Error('Lỗi thay đổi trạng thái tài khoản');
    }
    return res.json();
  },

  // Adjust loyalty points manually
  adjustLoyaltyPoints: async (userId: string, pointsDelta: number, reason: string): Promise<any> => {
    const token = authStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/auth/admin/users/${userId}/adjust-loyalty`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pointsDelta, reason }),
    });
    if (!res.ok) {
      throw new Error('Lỗi điều chỉnh điểm VIP');
    }
    return res.json();
  },

  // Set password for guest diner to upgrade to full member
  setPassword: async (userId: string, newPassword: string): Promise<AdminUserItem> => {
    const token = authStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/auth/admin/users/${userId}/set-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi cấp mật khẩu');
    }
    return res.json();
  },

  // Sync guest diner from booking info
  syncGuestBooking: async (name: string, phone: string, email?: string): Promise<AdminUserItem> => {
    const token = authStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/v1/auth/admin/users/sync-guest', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, phone, email }),
    });
    if (!res.ok) {
      throw new Error('Lỗi đồng bộ khách đặt trực tiếp');
    }
    return res.json();
  },
};
