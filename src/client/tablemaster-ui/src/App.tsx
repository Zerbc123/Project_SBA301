import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { Navbar } from './components/common/Navbar';
import type { ActiveView } from './components/common/Navbar';
import { LoginModal } from './components/common/LoginModal';
import { ProfileModal } from './components/common/ProfileModal';
import { ReviewModal } from './components/common/ReviewModal';
import { BookingHistoryModal } from './components/common/BookingHistoryModal';
import { QRPaymentModal } from './components/common/QRPaymentModal';
import { LandingPage } from './views/LandingPage';
import { BookingPage } from './views/BookingPage';
import { HostTabletPage } from './views/HostTabletPage';
import { WaitstaffMobilePage } from './views/WaitstaffMobilePage';
import { KitchenKdsPage } from './views/KitchenKdsPage';
import { AdminStudioPage } from './views/AdminStudioPage';
import { RestaurantManagementPage } from './views/restaurant/RestaurantManagementPage';
import { INITIAL_TABLES, INITIAL_BOOKINGS, INITIAL_TABLE_ORDERS } from './data/mockData';
import type { TableItem, TableStatus, BookingDetails, TableOrderRecord, AuthUser } from './types';
import { bookingApi, type BackendBooking, SEED_DATA } from './services/bookingApi';
import { PrivateBanquetModal } from './components/booking/PrivateBanquetModal';
import { authStorage } from './services/authStorage';

function getDefaultViewForRole(role?: string): ActiveView {
  if (!role) return 'landing';
  const r = role.toUpperCase();
  if (r.includes('ADMIN') || r.includes('MANAGER')) return 'admin';
  if (r.includes('HOST')) return 'host';
  if (r.includes('WAITER')) return 'waiter';
  if (r.includes('CHEF') || r.includes('KITCHEN')) return 'kds';
  return 'landing';
}

export function App() {
  // Authentication state (using sessionStorage so tokens wipe completely when browser/tab is closed)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return authStorage.getUser();
  });

  const [currentView, setCurrentView] = useState<ActiveView>(() => {
    const user = authStorage.getUser();
    return getDefaultViewForRole(user?.role);
  });
  const [targetFloor, setTargetFloor] = useState<1 | 2 | 3>(1);
  const [tables, setTables] = useState<TableItem[]>(INITIAL_TABLES);
  const [bookings, setBookings] = useState<BookingDetails[]>(INITIAL_BOOKINGS);
  const [tableOrders, setTableOrders] = useState<Record<string, TableOrderRecord>>(INITIAL_TABLE_ORDERS);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [directPayBooking, setDirectPayBooking] = useState<BookingDetails | null>(null);

  // Tự động mở cổng thanh toán MoMo / VietQR cho đúng ID đơn khi khách click link từ Email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingParam = params.get('bookingId');
    const actionParam = params.get('action');

    if (actionParam === 'pay-deposit' || bookingParam) {
      const targetCode = (bookingParam || '').trim();
      console.log('🔗 [URL Direct Link] Mở cổng thanh toán cọc từ Email cho đơn:', targetCode);

      if (targetCode) {
        bookingApi
          .getBookingById(targetCode)
          .then((res) => {
            if (res.success && res.data) {
              const mapped = mapBackendBooking(res.data);
              // Nếu đơn đã cọc (CONFIRMED), đang ăn (SEATED) hoặc đã hoàn tất (COMPLETED) -> không mở lại popup cọc
              if (
                mapped.status === 'CONFIRMED' ||
                mapped.status === 'SEATED' ||
                mapped.status === 'COMPLETED'
              ) {
                console.log('ℹ️ [URL Direct Link] Đơn này đã cọc hoặc đã hoàn tất, tự động dọn URL param.');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
              }
              setDirectPayBooking(mapped);
              console.log('✅ [URL Direct Link] Đã lấy thành công đơn từ DB:', mapped);
            } else {
              fallbackDirectPay(targetCode);
            }
          })
          .catch(() => {
            fallbackDirectPay(targetCode);
          });
      } else {
        setIsHistoryModalOpen(true);
      }
    }
  }, []);

  const fallbackDirectPay = (targetCode: string) => {
    const found = bookings.find(
      (b) => b.bookingCode === targetCode || b.bookingId === targetCode || b.backendUUID === targetCode
    );
    if (found) {
      if (found.status === 'CONFIRMED' || found.status === 'SEATED' || found.status === 'COMPLETED') {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      setDirectPayBooking(found);
    } else {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };
  const [isBanquetModalOpen, setIsBanquetModalOpen] = useState<boolean>(false);
  const [rebookData, setRebookData] = useState<BookingDetails | null>(null);

  // Auto-verify token validity & blacklist/revocation status with backend on startup
  useEffect(() => {
    // Automatically wipe legacy localStorage tokens
    localStorage.removeItem('tm_user');
    localStorage.removeItem('tm_access_token');
    localStorage.removeItem('tm_refresh_token');

    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      if (currentUser) {
        authStorage.clear();
        setCurrentUser(null);
        setCurrentView('landing');
      }
      return;
    }

    // Call /api/v1/auth/me to verify token with auth-service & Redis blacklist
    fetch('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        if (res.ok) {
          const freshUser = await res.json();
          setCurrentUser(freshUser);
          authStorage.setUser(freshUser);
        } else {
          // Token is invalid, expired, revoked in Redis, or DB was wiped
          console.warn('⚠️ [Auth] Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi/hết hạn. Tự động dọn dẹp...');
          authStorage.clear();
          setCurrentUser(null);
          setCurrentView('landing');
        }
      })
      .catch((err) => {
        console.warn('⚠️ [Auth] Không thể kết nối tới backend để xác thực token:', err);
      });
  }, []);

  const [newBookingAlert, setNewBookingAlert] = useState<{ code: string; name: string; guests: number } | null>(null);

  // Bản đồ đối chiếu Table UUID PostgreSQL sang id & code bàn của sơ đồ sảnh
  const UUID_TO_TABLE_INFO: Record<string, { id: string; code: string; floor: 1 | 2 | 3 }> = {
    'b3000000-0000-0000-0000-000000000001': { id: 'f1-t01', code: 'T-01', floor: 1 },
    'b3000000-0000-0000-0000-000000000002': { id: 'f1-t02', code: 'T-02', floor: 1 },
    'b3000000-0000-0000-0000-000000000003': { id: 'f2-v01', code: 'VIP-01', floor: 2 },
    'b3000000-0000-0000-0000-000000000004': { id: 'f1-t04', code: 'T-04', floor: 1 },
    'b3000000-0000-0000-0000-000000000005': { id: 'f1-t05', code: 'T-05', floor: 1 },
    'b3000000-0000-0000-0000-000000000006': { id: 'f1-t06', code: 'T-06', floor: 1 },
    'b3000000-0000-0000-0000-000000000007': { id: 'f1-t07', code: 'T-07', floor: 1 },
  };

  // Helper map từ BackendBooking sang BookingDetails chuẩn hóa
  const mapBackendBooking = (b: BackendBooking): BookingDetails => {
    const rawTableId = b.tableIds && b.tableIds.length > 0 ? b.tableIds[0] : '';
    const resolvedTable = rawTableId ? UUID_TO_TABLE_INFO[rawTableId] : null;
    const tableId = resolvedTable ? resolvedTable.id : (rawTableId || 'f1-t01');
    const tableCode = resolvedTable ? resolvedTable.code : (b.targetFloor === 3 ? 'Khu Sky Rooftop' : (b.targetFloor === 2 ? 'Khu Salon VIP' : 'Bàn T-01'));
    const floor = resolvedTable ? resolvedTable.floor : ((b.targetFloor as any) || 1);

    let arrivalTime = '19:00 - 21:00';
    if (b.specialNotes) {
      const match = b.specialNotes.match(/\[Giờ đến:\s*([^\]]+)\]/);
      if (match) arrivalTime = match[1].trim();
    }

    return {
      bookingId: b.bookingCode || b.id.substring(0, 8),
      bookingCode: b.bookingCode,
      backendUUID: b.id,
      customerName: b.guestName,
      phone: b.guestPhone,
      email: b.guestEmail,
      partySize: b.guestCount,
      floor,
      tableCode,
      tableId,
      date: b.bookingDate,
      timeSlot: arrivalTime,
      notes: b.specialNotes,
      occasion: b.occasion,
      dietaryNotes: b.dietaryNotes,
      babyChairCount: b.babyChairCount,
      candleSetup: b.candleSetup,
      preOrders: [],
      depositAmount: Number(b.totalDeposit) || 0,
      totalEstimatedAmount: Number(b.totalDeposit) || 0,
      createdAt: b.createdAt ? new Date(b.createdAt).toLocaleTimeString('vi-VN') : 'Hôm nay',
      status: b.status as any,
      rawStatus: b.status,
      vietqrCode: `TM ${b.bookingCode}`,
      eventType: b.eventType,
      targetFloor: b.targetFloor,
      companyName: b.companyName,
      estimatedBudget: b.estimatedBudget ? Number(b.estimatedBudget) : undefined,
      stageAudioRequired: b.stageAudioRequired,
      decorationRequired: b.decorationRequired,
      callbackDeadline: b.callbackDeadline,
      managerCallStatus: b.managerCallStatus as any,
      consultationNotes: b.consultationNotes,
    };
  };

  // Cơ chế Tự Động Quét Đơn Mới (Auto-Polling Scanner mỗi 4 giây) - Không cần F5 lại trang
  useEffect(() => {
    let isMounted = true;

    const pollBookings = async (isInitial = false) => {
      try {
        const res = await bookingApi.getAllBookings();
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map(mapBackendBooking);

          // 1. Cập nhật state danh sách đơn đặt bàn (Bookings)
          setBookings((prev) => {
            if (!isInitial && prev.length > 0) {
              const prevCodes = new Set(prev.map((p) => p.bookingCode || p.bookingId || p.backendUUID));
              // Tìm các đơn mới ở trạng thái chờ tư vấn PENDING_REVIEW hoặc EVENT_INQUIRY
              const freshOrders = mapped.filter(
                (m) =>
                  !prevCodes.has(m.bookingCode || m.bookingId || m.backendUUID) &&
                  (m.status === 'PENDING_REVIEW' || m.status === 'EVENT_INQUIRY')
              );

              if (freshOrders.length > 0) {
                const newest = freshOrders[0];
                setNewBookingAlert({
                  code: newest.bookingCode || newest.bookingId,
                  name: newest.customerName,
                  guests: newest.partySize,
                });
                setTimeout(() => setNewBookingAlert(null), 8000);
              }
            }

            // Bảo toàn các đơn mới tạo cục bộ (PENDING_REVIEW vừa tạo) nếu DB chưa kịp nạp
            const mappedCodes = new Set(mapped.map((m) => m.bookingCode || m.bookingId || m.backendUUID));
            const recentLocalBookings = prev.filter(
              (p) =>
                !mappedCodes.has(p.bookingCode || p.bookingId || p.backendUUID) &&
                p.createdAt === 'Vừa xong'
            );

            return [...recentLocalBookings, ...mapped];
          });

          // 2. Tự động đồng bộ trạng thái các BÀN (Tables) trên sơ đồ mặt bằng từ các đơn CONFIRMED / SEATED
          setTables((prevTables) => {
            let hasChanged = false;
            const updated = prevTables.map((tbl) => {
              // Tìm đơn active mới nhất khớp với bàn này
              const activeBooking = mapped.find(
                (bk) =>
                  (bk.tableId === tbl.id || bk.tableCode === tbl.code) &&
                  (bk.status === 'CONFIRMED' || bk.status === 'SEATED')
              );

              if (activeBooking) {
                const targetStatus = activeBooking.status === 'SEATED' ? 'SEATED' : 'CONFIRMED';
                if (
                  tbl.status !== targetStatus ||
                  tbl.currentGuestName !== activeBooking.customerName ||
                  (tbl as any).bookingCode !== activeBooking.bookingCode
                ) {
                  hasChanged = true;
                  return {
                    ...tbl,
                    status: targetStatus as TableStatus,
                    currentGuestName: activeBooking.customerName,
                    guestPhone: activeBooking.phone,
                    arrivalSlot: activeBooking.timeSlot,
                    depositAmount: activeBooking.depositAmount,
                    bookingCode: activeBooking.bookingCode || activeBooking.bookingId,
                  } as any;
                }
              } else if (tbl.status === 'SEATED' || tbl.status === 'CONFIRMED') {
                // Đơn đã COMPLETED hoặc CANCELLED trong DB -> giải phóng bàn về AVAILABLE
                const completedBooking = mapped.find(
                  (bk) =>
                    (bk.tableId === tbl.id || bk.tableCode === tbl.code) &&
                    (bk.status === 'COMPLETED' || bk.status === 'CANCELLED')
                );
                if (
                  completedBooking &&
                  (tbl as any).bookingCode === (completedBooking.bookingCode || completedBooking.bookingId)
                ) {
                  hasChanged = true;
                  return {
                    ...tbl,
                    status: 'AVAILABLE' as TableStatus,
                    currentGuestName: undefined,
                    guestPhone: undefined,
                    bookingCode: undefined,
                  };
                }
              }
              return tbl;
            });
            return hasChanged ? updated : prevTables;
          });

          // 3. Tự động đồng bộ các món đã gọi (Table Orders) từ PostgreSQL cho các bàn đang SEATED
          const seatedBookings = mapped.filter((bk) => bk.status === 'SEATED');
          const seatedTableIds = new Set(seatedBookings.map((sb) => sb.tableId || 'f1-t01'));

          // Dọn dẹp tableOrders của các bàn đã hoàn tất (không còn SEATED)
          setTableOrders((prevOrders) => {
            let orderChanged = false;
            const updated = { ...prevOrders };
            for (const tableId of Object.keys(updated)) {
              if (updated[tableId]?.source === 'ONLINE' && !seatedTableIds.has(tableId)) {
                delete updated[tableId];
                orderChanged = true;
              }
            }
            return orderChanged ? updated : prevOrders;
          });
          for (const sbk of seatedBookings) {
            const bId = sbk.backendUUID || sbk.bookingId;
            if (bId) {
              bookingApi.getTableOrders(bId).then((res) => {
                if (res.success && res.data && res.data.length > 0) {
                  const targetTableId = sbk.tableId || 'f1-t01';
                  setTableOrders((prevOrders) => {
                    const current = prevOrders[targetTableId] || {
                      tableCode: sbk.tableCode || 'T-01',
                      guestName: sbk.customerName || 'Khách Tại Bàn',
                      source: 'ONLINE',
                      guestCount: sbk.partySize || 2,
                      seatedAtTime: 'Đang dùng bữa',
                      depositAmount: sbk.depositAmount || 200000,
                      items: [],
                    };

                    const loadedItems = res.data.map((it) => ({
                      dishId: it.menuItemId || it.id,
                      name: it.itemName,
                      price: Number(it.unitPrice),
                      quantity: it.quantity,
                      status: (it.status === 'SERVED' ? 'SERVED' : 'PREPARING') as 'PREPARING' | 'SERVED',
                      category: 'Món gọi thêm',
                      notes: it.notes || '',
                    }));

                    return {
                      ...prevOrders,
                      [targetTableId]: {
                        ...current,
                        guestName: sbk.customerName,
                        depositAmount: sbk.depositAmount || current.depositAmount,
                        items: loadedItems,
                      },
                    };
                  });
                }
              }).catch(() => {});
            }
          }
        }
      } catch (err: any) {
        if (isInitial) console.warn('⚠️ [App Polling] Chưa thể kết nối Backend:', err);
      }
    };

    // Quét ngay lần đầu
    pollBookings(true);

    // Chu kỳ quét tự động mỗi 4000ms (4 giây)
    const intervalId = setInterval(() => {
      pollBookings(false);
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const handleLogout = async () => {
    const refreshToken = authStorage.getRefreshToken();
    const accessToken = authStorage.getAccessToken();
    try {
      if (refreshToken || accessToken) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      authStorage.clear();
      setCurrentUser(null);
      setCurrentView('landing');
    }
  };

  const handleNavigate = (view: ActiveView, floor?: 1 | 2 | 3) => {
    // Role protection for internal staff portals
    const staffViews: ActiveView[] = ['admin', 'restaurant', 'host', 'waiter'];
    if (staffViews.includes(view)) {
      const r = currentUser?.role?.toUpperCase() || '';
      const isStaff = r.includes('ADMIN') || r.includes('MANAGER') || r.includes('HOST') || r.includes('WAITER');
      if (!isStaff) {
        setIsLoginModalOpen(true);
        return;
      }
    }

    if (floor) {
      setTargetFloor(floor);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateTableStatus = (
    tableId: string,
    newStatus: TableStatus,
    guestName?: string
  ) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          return {
            ...t,
            status: newStatus,
            currentGuestName: newStatus === 'AVAILABLE' ? (guestName || undefined) : (guestName !== undefined ? guestName : t.currentGuestName),
            isLateNoShow: false,
          };
        }
        return t;
      })
    );
  };

  const handleAddBooking = (newBooking: BookingDetails) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

  const handleAddItemsToTable = async (
    tableId: string,
    newItems: { dishId: string; name: string; price: number; quantity: number; notes?: string; category: string }[]
  ) => {
    // If table is currently AVAILABLE, automatically transition it to SEATED
    const targetTable = tables.find((t) => t.id === tableId);
    if (targetTable && targetTable.status === 'AVAILABLE') {
      handleUpdateTableStatus(tableId, 'SEATED', 'Khách Tại Bàn');
    }

    // 1. Cập nhật state in-memory ngay lập tức
    setTableOrders((prev) => {
      const current = prev[tableId] || {
        tableCode: targetTable?.code || 'Bàn',
        guestName: targetTable?.currentGuestName || 'Khách Tại Bàn',
        source: 'WALK_IN',
        guestCount: targetTable?.capacity || 2,
        seatedAtTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        depositAmount: 0,
        items: [],
      };

      const existingItems = [...current.items];

      newItems.forEach((newItem) => {
        const matchIdx = existingItems.findIndex((i) => i.dishId === newItem.dishId);
        if (matchIdx >= 0) {
          existingItems[matchIdx] = {
            ...existingItems[matchIdx],
            quantity: existingItems[matchIdx].quantity + newItem.quantity,
            notes: newItem.notes || existingItems[matchIdx].notes,
          };
        } else {
          existingItems.push({
            dishId: newItem.dishId,
            name: newItem.name,
            price: newItem.price,
            quantity: newItem.quantity,
            status: 'PREPARING',
            category: newItem.category,
            notes: newItem.notes,
          });
        }
      });

      return {
        ...prev,
        [tableId]: {
          ...current,
          items: existingItems,
        },
      };
    });

    // 2. Gửi API thật xuống backend booking-service (UC-31 Mobile Waitstaff Orders)
    try {
      const activeBooking = bookings.find(
        (b) => b.tableId === tableId || (targetTable && b.tableCode === targetTable.code)
      );
      const bookingTargetId = activeBooking?.backendUUID || activeBooking?.bookingId || SEED_DATA.BOOKING_ID;

      await bookingApi.addTableOrders(
        bookingTargetId,
        tableId,
        newItems.map((i) => ({
          menuItemId: i.dishId,
          itemName: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          notes: i.notes,
        }))
      );
      console.log('✅ [App] Đã đồng bộ order món từ Waitstaff Mobile xuống backend booking-service (8083)');
    } catch (err) {
      console.warn('⚠️ [App] Chưa thể đồng bộ order món với backend:', err);
    }
  };

  const handleTransferTable = async (sourceTableId: string, targetTableId: string) => {
    const sourceTable = tables.find((t) => t.id === sourceTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    const sourceOrder = tableOrders[sourceTableId];

    // Update tables state: target becomes SEATED with source's guest, source becomes AVAILABLE
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === targetTableId) {
          return {
            ...t,
            status: 'SEATED',
            currentGuestName: sourceTable.currentGuestName || 'Khách Chuyển Bàn',
            guestPhone: sourceTable.guestPhone,
          };
        }
        if (t.id === sourceTableId) {
          return {
            ...t,
            status: 'AVAILABLE',
            currentGuestName: undefined,
            guestPhone: undefined,
          };
        }
        return t;
      })
    );

    // Update tableOrders
    setTableOrders((prev) => {
      const copy = { ...prev };
      if (sourceOrder) {
        copy[targetTableId] = {
          ...sourceOrder,
          tableCode: targetTable.code,
        };
        delete copy[sourceTableId];
      }
      return copy;
    });

    // Đồng bộ chuyển bàn xuống backend booking-service (UC-19)
    try {
      const activeBooking = bookings.find((b) => b.tableId === sourceTableId);
      const bookingTargetId = activeBooking?.backendUUID || activeBooking?.bookingId || SEED_DATA.BOOKING_ID;
      await bookingApi.transferTable(
        bookingTargetId,
        sourceTableId,
        targetTableId,
        `Chuyển từ ${sourceTable.code} sang ${targetTable.code}`
      );
      console.log('✅ [App] Đã đồng bộ chuyển bàn xuống backend booking-service (8083)');
    } catch (err) {
      console.warn('⚠️ [App] Chưa thể đồng bộ chuyển bàn với backend:', err);
    }
  };

  const handleMergeTables = async (sourceTableId: string, targetTableId: string) => {
    const sourceTable = tables.find((t) => t.id === sourceTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!sourceTable || !targetTable) return;

    const sourceOrder = tableOrders[sourceTableId];
    const targetOrder = tableOrders[targetTableId];

    // Free up source table
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTableId) {
          return {
            ...t,
            status: 'AVAILABLE',
            currentGuestName: undefined,
            guestPhone: undefined,
          };
        }
        if (t.id === targetTableId && t.status === 'AVAILABLE') {
          return {
            ...t,
            status: 'SEATED',
            currentGuestName: sourceTable.currentGuestName || 'Khách Ghép Bàn',
          };
        }
        return t;
      })
    );

    // Merge items & deposit
    setTableOrders((prev) => {
      const copy = { ...prev };
      const mergedItems = targetOrder ? [...targetOrder.items] : [];

      if (sourceOrder) {
        sourceOrder.items.forEach((sItem) => {
          const matchIdx = mergedItems.findIndex((m) => m.dishId === sItem.dishId);
          if (matchIdx >= 0) {
            mergedItems[matchIdx] = {
              ...mergedItems[matchIdx],
              quantity: mergedItems[matchIdx].quantity + sItem.quantity,
            };
          } else {
            mergedItems.push(sItem);
          }
        });

        copy[targetTableId] = {
          tableCode: targetTable.code,
          guestName: targetOrder?.guestName || sourceOrder.guestName || 'Bàn Ghép',
          source: targetOrder?.source || sourceOrder.source || 'WALK_IN',
          guestCount: (targetOrder?.guestCount || targetTable.capacity) + (sourceOrder.guestCount || sourceTable.capacity),
          seatedAtTime: targetOrder?.seatedAtTime || sourceOrder.seatedAtTime || 'Đang dùng bữa',
          notes: `${targetOrder?.notes || ''} [Ghép từ ${sourceTable.code}: ${sourceOrder.notes || ''}]`.trim(),
          depositAmount: (targetOrder?.depositAmount || 0) + (sourceOrder.depositAmount || 0),
          items: mergedItems,
        };

        delete copy[sourceTableId];
      }

      return copy;
    });

    // Đồng bộ gộp bàn (UC-20 Smart Table Merging)
    try {
      const activeBooking = bookings.find((b) => b.tableId === sourceTableId);
      const bookingTargetId = activeBooking?.backendUUID || activeBooking?.bookingId || SEED_DATA.BOOKING_ID;
      await bookingApi.transferTable(
        bookingTargetId,
        sourceTableId,
        targetTableId,
        `Gộp món từ ${sourceTable.code} sang ${targetTable.code}`
      );
      console.log('✅ [App] Đã đồng bộ gộp bàn xuống backend booking-service (8083)');
    } catch (err) {
      console.warn('⚠️ [App] Chưa thể đồng bộ gộp bàn với backend:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#0F172A] selection:bg-amber-100 selection:text-amber-900">
            {/* Toast thông báo đơn đặt bàn mới tự động (Auto-Polling SLA 15 phút) */}
      <AnimatePresence>
        {newBookingAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 max-w-md p-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-2xl border-2 border-amber-400/80 flex items-start gap-3 backdrop-blur-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-lg shrink-0 animate-bounce">
              🛎️
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                  ⚡ ĐƠN MỚI CẦN GỌI GẤP
                </span>
                <span className="text-[10px] text-slate-300 font-mono">SLA 15 Phút</span>
              </div>
              <p className="text-xs font-bold text-white">
                Khách: <span className="text-amber-200">{newBookingAlert.name}</span> (#{newBookingAlert.code})
              </p>
              <p className="text-[11px] text-slate-300">
                Quy mô: <strong>{newBookingAlert.guests} khách</strong>. Đã tự động cập nhật vào danh sách Lễ tân!
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewBookingAlert(null);
                  handleNavigate('host');
                }}
                className="mt-1 text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
              >
                👉 Mở Màn Hình Lễ Tân Gọi Ngay
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewBookingAlert(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Luxury Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenReview={() => setIsReviewModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />

      {/* Main View Transition Container */}
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {currentView === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage
                onNavigate={handleNavigate}
                onOpenBanquetModal={() => setIsBanquetModalOpen(true)}
              />
            </motion.div>
          )}

          {currentView === 'booking' && (
            <motion.div
              key="booking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <BookingPage
                tables={tables}
                initialFloor={targetFloor}
                onUpdateTableStatus={handleUpdateTableStatus}
                onAddBooking={handleAddBooking}
                rebookData={rebookData}
                onClearRebook={() => setRebookData(null)}
                onOpenBanquetModal={() => setIsBanquetModalOpen(true)}
              />
            </motion.div>
          )}

          {currentView === 'host' && (
            <motion.div
              key="host"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HostTabletPage
                tables={tables}
                bookings={bookings}
                tableOrders={tableOrders}
                setTableOrders={setTableOrders}
                onUpdateTableStatus={handleUpdateTableStatus}
                onTransferTable={handleTransferTable}
                onMergeTables={handleMergeTables}
                onNavigateToWaiter={() => handleNavigate('waiter')}
                onNavigateToKds={() => handleNavigate('kds')}
                onUpdateBooking={(updated) => {
                  setBookings((prev) =>
                    prev.map((b) =>
                      b.bookingId === updated.bookingId ||
                      (b.bookingCode && b.bookingCode === updated.bookingCode) ||
                      (b.backendUUID && b.backendUUID === updated.backendUUID)
                        ? updated
                        : b
                    )
                  );
                }}
              />
            </motion.div>
          )}

          {currentView === 'kds' && (
            <motion.div
              key="kds"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <KitchenKdsPage
                tables={tables}
                bookings={bookings}
                tableOrders={tableOrders}
                setTableOrders={setTableOrders}
                onNavigateToHost={() => handleNavigate('host')}
              />
            </motion.div>
          )}

          {currentView === 'waiter' && (
            <motion.div
              key="waiter"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <WaitstaffMobilePage
                tables={tables}
                tableOrders={tableOrders}
                currentUser={currentUser}
                onAddItemsToTable={handleAddItemsToTable}
                onTransferTable={handleTransferTable}
                onMergeTables={handleMergeTables}
                onNavigateToHost={() => handleNavigate('host')}
              />
            </motion.div>
          )}

          {currentView === 'restaurant' && (
            <motion.div
              key="restaurant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RestaurantManagementPage />
            </motion.div>
          )}

          {currentView === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AdminStudioPage
                tables={tables}
                bookings={bookings}
                onUpdateTables={setTables}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Luxury Editorial Footer matching video aesthetic */}
      <footer className="bg-white border-t border-[#EBE5DC] pt-14 pb-10 mt-16 text-[#44403C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#EBE5DC]">
            {/* Brand column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C4A480] to-[#8C6A43] text-white flex items-center justify-center font-serif font-bold text-sm">
                  P
                </div>
                <span className="font-serif font-bold text-lg text-[#1C1917]">LE PRIME BISTRO & LOUNGE</span>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed">
                Nhà hàng ẩm thực Pháp đương đại, Bò lên tuổi Dry-Aged thượng hạng & Hầm rượu vang Grand Cru tại trung tâm Sài Gòn.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#8C6A43] font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#3D7058]" />
                <span>Đặt cọc VietQR trực tiếp • Xác nhận 100%</span>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#1C1917]">Địa Chỉ & Hotline</h4>
              <p className="flex items-start gap-2 text-[#78716C]">
                <MapPin className="w-4 h-4 text-[#C4A480] shrink-0 mt-0.5" />
                <span>68 Đại lộ Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</span>
              </p>
              <p className="flex items-center gap-2 text-[#78716C]">
                <Phone className="w-4 h-4 text-[#C4A480] shrink-0" />
                <span className="font-mono font-bold text-[#1C1917]">028 3822 8899 • 0909 123 456</span>
              </p>
            </div>

            {/* Dining lounges */}
            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#1C1917]">Không Gian Ẩm Thực</h4>
              <ul className="space-y-1 text-[#78716C]">
                <li>• Khu Grand Bistro: Bàn Cửa Sổ & Quầy Bar Mixology</li>
                <li>• Khu Salon VIP: Phòng Tiệc Riêng Tư & Wine Cellar</li>
                <li>• Khu Sky Terrace: Sân Vườn Ngoài Trời Hoàng Hôn</li>
              </ul>
            </div>

            {/* Portals */}
            <div className="space-y-2 text-xs">
              <h4 className="font-serif font-bold text-sm text-[#1C1917]">Cổng Điều Phối Nội Bộ</h4>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleNavigate('host')}
                  className="w-full py-2 px-3 bg-[#FAF7F2] hover:bg-[#F2ECE1] rounded-xl text-left font-semibold text-[#1C1917] flex justify-between items-center transition-colors cursor-pointer"
                >
                  <span>Tablet Lễ Tân (Host Portal)</span>
                  <span className="text-[10px] text-[#3D7058] font-bold">Live</span>
                </button>
                <button
                  onClick={() => handleNavigate('kds')}
                  className="w-full py-2 px-3 bg-[#FAF7F2] hover:bg-[#F2ECE1] rounded-xl text-left font-semibold text-[#1C1917] flex justify-between items-center transition-colors cursor-pointer"
                >
                  <span>Màn Hình Bếp (KDS Ticket Board)</span>
                  <span className="text-[10px] text-amber-600 font-bold">Kitchen</span>
                </button>
                <button
                  onClick={() => handleNavigate('admin')}
                  className="w-full py-2 px-3 bg-[#FAF7F2] hover:bg-[#F2ECE1] rounded-xl text-left font-semibold text-[#1C1917] flex justify-between items-center transition-colors cursor-pointer"
                >
                  <span>Quản Lý Sơ Đồ & Thống Kê</span>
                  <span className="text-[10px] text-[#C4A480] font-bold">Stats</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#78716C] gap-2">
            <p>© 2026 LE PRIME BISTRO & LOUNGE. All rights reserved.</p>
            <p>Michelin Selected Standard • Haute Gastronomy Saigon</p>
          </div>
        </div>
      </footer>

      {/* Authentication Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const targetView = getDefaultViewForRole(user.role);
          setCurrentView(targetView);
        }}
      />

      {/* Profile & Dietary Preferences Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        user={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(user) => setCurrentUser(user)}
      />

      {/* Post-dining Review & Rating Modal (UC-14) */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        user={currentUser}
        onClose={() => setIsReviewModalOpen(false)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onReviewSubmitted={(_review, updatedPoints) => {
          if (currentUser) {
            setCurrentUser({
              ...currentUser,
              loyaltyPoints: updatedPoints,
            });
          }
        }}
      />

      {/* Booking History, E-Invoices & QR Pass Modal (UC-03) */}
      <BookingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        currentUser={currentUser}
        localBookings={bookings}
        onRebook={(booking) => {
          setRebookData(booking);
          handleNavigate('booking');
        }}
      />

      {/* CỔNG THANH TOÁN CỌC TRỰC TIẾP TỪ EMAIL (MOMO / VIETQR) */}
      <QRPaymentModal
        isOpen={!!directPayBooking}
        onClose={() => {
          setDirectPayBooking(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
        booking={directPayBooking}
        initialTab="MOMO"
        onPaymentSuccess={() => {
          if (directPayBooking) {
            const targetCode = directPayBooking.bookingCode || directPayBooking.bookingId;
            setBookings((prev) =>
              prev.map((b) =>
                b.bookingCode === targetCode ||
                b.bookingId === targetCode ||
                b.backendUUID === directPayBooking.backendUUID
                  ? { ...b, status: 'CONFIRMED' as const, rawStatus: 'CONFIRMED' }
                  : b
              )
            );
          }
          setDirectPayBooking(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />

      {/* Private Banquet & Floor Buyout Modal (UC-10) */}
      <PrivateBanquetModal
        isOpen={isBanquetModalOpen}
        onClose={() => setIsBanquetModalOpen(false)}
        onSuccess={(newInquiry) => {
          setBookings((prev) => [newInquiry, ...prev]);
        }}
      />
    </div>
  );
}

export default App;
