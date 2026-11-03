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

  useEffect(() => {
    bookingApi
      .getAllBookings()
      .then((res: any) => {
        if (res.success && Array.isArray(res.data)) {
          console.log('✅ [App] Đã kết nối với Backend Spring Boot (8083)! Có', res.data.length, 'đơn trong DB');
          if (res.data.length > 0) {
            const mapped: BookingDetails[] = res.data.map((b: BackendBooking) => ({
              bookingId: b.bookingCode || b.id.substring(0, 8),
              bookingCode: b.bookingCode,
              backendUUID: b.id,
              customerName: b.guestName,
              phone: b.guestPhone,
              email: b.guestEmail,
              partySize: b.guestCount,
              floor: (b.targetFloor as any) || 1,
              tableCode: b.tableIds && b.tableIds.length > 0 ? `Bàn VIP` : (b.targetFloor === 3 ? 'Rooftop Tầng 3' : 'Sảnh'),
              tableId: b.tableIds && b.tableIds.length > 0 ? b.tableIds[0] : 'f1-t01',
              date: b.bookingDate,
              timeSlot: '19:00 - 21:00',
              notes: b.specialNotes,
              occasion: b.occasion,
              dietaryNotes: b.dietaryNotes,
              babyChairCount: b.babyChairCount,
              candleSetup: b.candleSetup,
              preOrders: [],
              depositAmount: Number(b.totalDeposit) || 0,
              totalEstimatedAmount: Number(b.totalDeposit) || 0,
              createdAt: b.createdAt ? new Date(b.createdAt).toLocaleTimeString('vi-VN') : 'Hôm nay',
              status: b.status === 'EVENT_INQUIRY'
                ? 'EVENT_INQUIRY'
                : b.status === 'CONFIRMED' || b.status === 'SEATED'
                ? 'CONFIRMED'
                : 'PENDING_DEPOSIT',
              vietqrCode: `TM ${b.bookingCode}`,
              eventType: b.eventType,
              targetFloor: b.targetFloor,
              companyName: b.companyName,
              estimatedBudget: b.estimatedBudget ? Number(b.estimatedBudget) : undefined,
              stageAudioRequired: b.stageAudioRequired,
              decorationRequired: b.decorationRequired,
              callbackDeadline: b.callbackDeadline,
              managerCallStatus: b.managerCallStatus,
              consultationNotes: b.consultationNotes,
            }));
            setBookings((prev) => {
              const existingCodes = new Set(mapped.map((m) => m.bookingId));
              return [...mapped, ...prev.filter((p) => !existingCodes.has(p.bookingId))];
            });
          }
        }
      })
      .catch((err: any) => {
        console.warn('⚠️ [App] Chưa thể kết nối Backend:', err);
      });
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
                    prev.map((b) => (b.bookingId === updated.bookingId ? updated : b))
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
                <li>• Tầng 1: Grand Bistro & Quầy Mixology</li>
                <li>• Tầng 2: Salon Tiệc VIP & Wine Cellar</li>
                <li>• Tầng 3: Sky Terrace Rooftop hoàng hôn</li>
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
