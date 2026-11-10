import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  History,
  QrCode,
  RotateCcw,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import type { BookingDetails, AuthUser } from '../../types';
import { SIGNATURE_DISHES } from '../../data/mockData';
import { bookingApi, type BackendBooking, SEED_DATA } from '../../services/bookingApi';
import { ETicketModal } from '../booking/ETicketModal';
import { QRPaymentModal } from './QRPaymentModal';
import { CreditCard, PhoneCall } from 'lucide-react';

interface BookingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  localBookings?: BookingDetails[];
  onRebook: (booking: BookingDetails) => void;
}

type TabType = 'all' | 'upcoming' | 'past';

export const BookingHistoryModal: React.FC<BookingHistoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  localBookings = [],
  onRebook,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [bookingsList, setBookingsList] = useState<BookingDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State cho Ticket QR Modal xem lại vé check-in
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<BookingDetails | null>(null);
  const [payingBooking, setPayingBooking] = useState<BookingDetails | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const targetUserId = currentUser?.id || SEED_DATA.USER_ID;
    bookingApi
      .getMyBookings(targetUserId)
      .then((res) => {
        const userLocals = currentUser
          ? localBookings.filter(
              (local) =>
                (currentUser.phone && local.phone === currentUser.phone) ||
                (currentUser.email && local.email === currentUser.email)
            )
          : localBookings;

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: BookingDetails[] = res.data.map((b: BackendBooking) => ({
            bookingId: b.bookingCode || b.id.substring(0, 8),
            bookingCode: b.bookingCode,
            customerName: b.guestName,
            phone: b.guestPhone,
            email: b.guestEmail,
            partySize: b.guestCount,
            floor: 1,
            tableCode: b.tableIds && b.tableIds.length > 0 ? `Bàn VIP (${b.tableIds[0].substring(0, 4)})` : 'Sảnh Chính',
            tableId: b.tableIds && b.tableIds.length > 0 ? b.tableIds[0] : 'f1-t01',
            date: b.bookingDate,
            timeSlot: '19:00 - 21:00',
            notes: b.specialNotes,
            preOrders: b.preorderItems
              ? b.preorderItems.map((item) => {
                  const dish = SIGNATURE_DISHES.find((d) => d.id === item.menuItemId || d.name === item.itemName) || {
                    id: item.menuItemId,
                    name: item.itemName || 'Món Signature Đặt Trước',
                    category: 'Steak & Main',
                    price: item.unitPrice || 0,
                    description: item.notes || '',
                    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
                  };
                  return {
                    dish: {
                      ...dish,
                      name: item.itemName || dish.name,
                      price: item.unitPrice || dish.price,
                    },
                    quantity: item.quantity,
                    preparationNotes: item.notes || '',
                  };
                })
              : [],
            depositAmount: Number(b.totalDeposit) || 0,
            totalEstimatedAmount: Number(b.totalDeposit) || 0,
            createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN') : 'Hôm nay',
            status: b.status === 'CONFIRMED' || b.status === 'SEATED' ? 'CONFIRMED' : (b.status as any),
            vietqrCode: `TM ${b.bookingCode}`,
            checkinQrToken: b.checkinQrToken,
            backendUUID: b.id,
            rawStatus: b.status,
          }));

          const existingCodes = new Set(mapped.map((m) => m.bookingCode || m.bookingId));
          const merged = [...mapped];
          userLocals.forEach((local) => {
            const code = local.bookingCode || local.bookingId;
            if (!existingCodes.has(code)) {
              merged.push(local);
            }
          });

          setBookingsList(merged);
        } else {
          setBookingsList(userLocals);
        }
      })
      .catch((err) => {
        console.warn('⚠️ Lỗi khi tải lịch sử đơn từ Backend:', err);
        const userLocals = currentUser
          ? localBookings.filter(
              (local) =>
                (currentUser.phone && local.phone === currentUser.phone) ||
                (currentUser.email && local.email === currentUser.email)
            )
          : localBookings;
        setBookingsList(userLocals);
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentUser, localBookings]);

  if (!isOpen) return null;

  // Lọc danh sách theo tab
  const filteredBookings = bookingsList.filter((b) => {
    const rawStatus = (b as any).rawStatus || (b.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_DEPOSIT');
    const isUpcoming = ['PENDING_REVIEW', 'AWAITING_PAYMENT', 'CONFIRMED', 'PENDING_DEPOSIT'].includes(rawStatus);

    if (activeTab === 'upcoming') return isUpcoming;
    if (activeTab === 'past') return !isUpcoming;
    return true;
  });

  // Xử lý tải PDF hóa đơn
  const handleDownloadInvoice = async (booking: BookingDetails) => {
    const targetId = (booking as any).backendUUID || booking.bookingId;
    setDownloadingId(booking.bookingId);
    try {
      await bookingApi.downloadInvoicePdf(targetId, booking.bookingId);
      showToast(`✅ Đã tải file PDF Hóa đơn cọc điện tử cho đơn ${booking.bookingId}`);
    } catch (err: any) {
      console.warn('Backend download failed, falling back to simulated print view:', err);
      // Fallback: Mở trang in hóa đơn client-side
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hóa Đơn Cọc - ${booking.bookingId}</title>
              <style>
                body { font-family: serif; padding: 40px; color: #1C1917; background: #FFF; }
                h1 { color: #8C6A43; margin-bottom: 4px; font-size: 24px; }
                .sub { color: #78716C; font-size: 13px; margin-bottom: 24px; border-bottom: 2px solid #8C6A43; padding-bottom: 12px; }
                .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #E8DFD1; padding: 10px; text-align: left; font-size: 13px; }
                th { background: #FAF4EB; color: #8C6A43; }
                .total { text-align: right; font-weight: bold; font-size: 16px; color: #8C6A43; }
                .policy { margin-top: 30px; font-size: 12px; color: #78716C; line-height: 1.5; border: 1px dashed #C4A480; padding: 12px; border-radius: 8px; }
              </style>
            </head>
            <body>
              <h1>LE PRIME BISTRO & LOUNGE</h1>
              <div class="sub">68 Đại lộ Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh | Hotline: 028 3822 8899</div>
              <h2>HÓA ĐƠN XÁC NHẬN TIỀN CỌC ĐIỆN TỬ (E-DEPOSIT RECEIPT)</h2>
              <div class="meta">
                <div>
                  <strong>Mã Đơn:</strong> ${booking.bookingId}<br/>
                  <strong>Khách Hàng:</strong> ${booking.customerName}<br/>
                  <strong>Số Điện Thoại:</strong> ${booking.phone}<br/>
                </div>
                <div>
                  <strong>Ngày Dùng Bữa:</strong> ${booking.date}<br/>
                  <strong>Ca Giờ:</strong> ${booking.timeSlot}<br/>
                  <strong>Số Khách:</strong> ${booking.partySize} người<br/>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Khoản Mục</th>
                    <th>Số Lượng</th>
                    <th>Đơn Giá</th>
                    <th>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tiền cọc giữ bàn (${booking.tableCode})</td>
                    <td>1</td>
                    <td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.depositAmount)}</td>
                    <td>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.depositAmount)}</td>
                  </tr>
                  <tr>
                    <td colspan="3" class="total">TỔNG TIỀN CỌC ĐÃ THANH TOÁN (VIETQR):</td>
                    <td class="total">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.depositAmount)}</td>
                  </tr>
                </tbody>
              </table>
              <div class="policy">
                <strong>Chính sách hoàn cọc (BR-04):</strong> Hoàn 100% nếu hủy trước 24 giờ. Số tiền cọc này sẽ được trừ trực tiếp vào hóa đơn thanh toán bữa ăn tại bàn.
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
      showToast(`📄 Đã mở bản in Hóa đơn cọc điện tử cho đơn ${booking.bookingId}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Xử lý Re-book 1 chạm
  const handleRebookClick = (booking: BookingDetails) => {
    onRebook(booking);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-[#FAF8F5] rounded-3xl shadow-2xl border border-[#E8DFD1] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E8DFD1] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2ECE1] border border-[#E8DFD1] flex items-center justify-center text-[#8C6A43]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-bold text-[#1C1917]">
                    Lịch Sử Đặt Bàn & Hóa Đơn Cọc
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1]">
                    UC-03 E-Invoices
                  </span>
                </div>
                <p className="text-xs text-[#78716C]">
                  Tra cứu danh sách đơn quá khứ & hiện tại, tải hóa đơn cọc PDF, lấy mã QR vé check-in
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F2ECE1] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Message Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between"
              >
                <span>{toastMessage}</span>
                <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Tabs */}
          <div className="px-6 pt-4 border-b border-[#E8DFD1] bg-white flex items-center gap-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'border-[#8C6A43] text-[#1C1917]'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Tất Cả ({bookingsList.length})
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'border-[#8C6A43] text-[#1C1917]'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Đang Chờ & Sắp Tới
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'past'
                  ? 'border-[#8C6A43] text-[#1C1917]'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Lịch Sử Hoàn Tất
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-[#78716C]">
                <div className="w-8 h-8 mx-auto mb-3 border-2 border-[#8C6A43] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải lịch sử đặt bàn từ hệ thống...</span>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="py-16 text-center text-[#78716C] space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#F2ECE1] flex items-center justify-center text-[#8C6A43]">
                  <UtensilsCrossed className="w-8 h-8 opacity-60" />
                </div>
                <h4 className="font-serif font-bold text-base text-[#1C1917]">
                  Chưa có đơn đặt bàn nào
                </h4>
                <p className="text-xs max-w-sm mx-auto text-[#78716C]">
                  Quý khách chưa có đơn đặt bàn nào trong danh mục này. Hãy đặt bàn ngay để thưởng thức ẩm thực tại Le Prime Bistro.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredBookings.map((b) => {
                  const rawStatus = (b as any).rawStatus || (b.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_DEPOSIT');
                  const isConfirmed = rawStatus === 'CONFIRMED' || rawStatus === 'SEATED';
                  const isCompleted = rawStatus === 'COMPLETED';

                  return (
                    <div
                      key={b.bookingId}
                      className="bg-white rounded-2xl border border-[#E8DFD1] p-5 shadow-xs hover:border-[#C4A480] transition-all space-y-4"
                    >
                      {/* Top Row: Code, Status, Date */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F2ECE1]">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-[#8C6A43] bg-[#FAF4EB] px-2.5 py-1 rounded-lg border border-[#E8DFD1]">
                            {b.bookingId}
                          </span>
                          {(() => {
                            if (isConfirmed) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>ĐÃ XÁC NHẬN CỌC</span>
                                </span>
                              );
                            }
                            if (isCompleted) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" />
                                  <span>ĐÃ DÙNG BỮA XONG</span>
                                </span>
                              );
                            }
                            if (rawStatus === 'AWAITING_PAYMENT') {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                  <span>ĐÃ DUYỆT - CHỜ THANH TOÁN CỌC</span>
                                </span>
                              );
                            }
                            if (rawStatus === 'PENDING_REVIEW' || rawStatus === 'EVENT_INQUIRY') {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                  <span>CHỜ LỄ TÂN GỌI TƯ VẤN (SLA 15 PHÚT)</span>
                                </span>
                              );
                            }
                            return (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>CHỜ XỬ LÝ</span>
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#78716C]">
                          <span className="flex items-center gap-1 font-medium text-[#1C1917]">
                            <Calendar className="w-3.5 h-3.5 text-[#8C6A43]" />
                            {b.date}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-[#1C1917]">
                            <Clock className="w-3.5 h-3.5 text-[#8C6A43]" />
                            {b.timeSlot}
                          </span>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#F2ECE1] space-y-1">
                          <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">
                            Thông Tin Khách
                          </span>
                          <span className="font-bold text-[#1C1917] block truncate">{b.customerName}</span>
                          <span className="text-[#78716C] block font-mono">{b.phone}</span>
                        </div>

                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#F2ECE1] space-y-1">
                          <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">
                            Bàn & Số Lượng Khách
                          </span>
                          <span className="font-bold text-[#1C1917] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#8C6A43]" />
                            {b.partySize} Khách • {b.tableCode}
                          </span>
                          <span className="text-[#78716C] block truncate">
                            {b.notes || 'Không có ghi chú thêm'}
                          </span>
                        </div>

                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#F2ECE1] space-y-1">
                          <span className="text-[10px] text-[#78716C] uppercase font-bold tracking-wider block">
                            Tiền Cọc VietQR Đã Nhận
                          </span>
                          <span className="font-serif font-bold text-base text-[#8C6A43] block">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.depositAmount)}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Đã cọc VietQR 100%
                          </span>
                        </div>

                        {/* Pre-order Signature Dishes (UC-07) */}
                        {b.preOrders && b.preOrders.length > 0 && (
                          <div className="p-3 bg-[#FAF4EB]/80 rounded-xl border border-[#E8DFD1] space-y-1.5 sm:col-span-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#8C6A43] uppercase font-bold tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#8C6A43]" />
                                Món Ăn Signature Đặt Trước ({b.preOrders.reduce((s, p) => s + p.quantity, 0)} phần):
                              </span>
                              <span className="text-[10px] text-[#8C6A43] font-bold font-mono">
                                Cọc món: {new Intl.NumberFormat('vi-VN').format(b.preOrders.reduce((s, p) => s + p.dish.price * p.quantity, 0))} đ
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {b.preOrders.map((p, idx) => (
                                <div key={idx} className="bg-white p-2.5 rounded-lg border border-[#F2ECE1] space-y-0.5 shadow-2xs">
                                  <div className="flex justify-between items-center font-bold text-[#1C1917] text-xs">
                                    <span>{p.quantity}x {p.dish.name}</span>
                                    <span className="font-mono text-[#8C6A43]">{new Intl.NumberFormat('vi-VN').format(p.dish.price * p.quantity)} đ</span>
                                  </div>
                                  {p.preparationNotes && (
                                    <p className="text-[10px] text-[#78716C] italic leading-tight">↳ Yêu cầu: {p.preparationNotes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: 3 Tính năng trọng tâm UC-03 */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        {/* 1. Xem vé QR check-in & Nút Thanh Toán Cọc */}
                        <div className="flex flex-wrap items-center gap-2">
                          {(rawStatus === 'AWAITING_PAYMENT' || rawStatus === 'PENDING_DEPOSIT') && (
                            <button
                              onClick={() => setPayingBooking(b)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 animate-pulse"
                            >
                              <CreditCard className="w-4 h-4 text-amber-200" />
                              <span>💳 Thanh Toán Cọc (VietQR / MoMo)</span>
                            </button>
                          )}

                          {(rawStatus === 'PENDING_REVIEW' || rawStatus === 'EVENT_INQUIRY') && (
                            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-1.5">
                              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                              <span>Lễ tân đang chuẩn bị gọi tư vấn & gửi link cọc</span>
                            </div>
                          )}

                          {isConfirmed && (
                            <button
                              onClick={() => setSelectedTicketBooking(b)}
                              className="px-3.5 py-2 rounded-xl bg-[#FAF4EB] hover:bg-[#F2ECE1] border border-[#E8DFD1] text-[#8C6A43] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            >
                              <QrCode className="w-4 h-4 text-[#8C6A43]" />
                              <span>Xem Vé QR Check-in</span>
                            </button>
                          )}

                          {/* 2. Tải hóa đơn cọc điện tử PDF */}
                          <button
                            onClick={() => handleDownloadInvoice(b)}
                            disabled={downloadingId === b.bookingId}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E8DFD1] text-[#1C1917] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 disabled:opacity-60"
                          >
                            {downloadingId === b.bookingId ? (
                              <div className="w-3.5 h-3.5 border-2 border-[#8C6A43] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 text-[#8C6A43]" />
                            )}
                            <span>Tải Hóa Đơn PDF</span>
                          </button>
                        </div>

                        {/* 3. Đặt lại bàn cũ 1-chạm (Re-book) */}
                        <button
                          onClick={() => handleRebookClick(b)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C4A480] to-[#8C6A43] hover:brightness-105 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Đặt Lại Bàn Này (Re-book 1-Chạm)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-6 py-4 border-t border-[#E8DFD1] bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-[#78716C]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3D7058]" />
              <span>Chính sách cọc BR-04: Hoàn tiền 100% nếu hủy trước giờ hẹn trên 24 giờ.</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F2ECE1] text-[#1C1917] font-semibold hover:bg-[#E8DFD1] transition-colors cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </motion.div>
      </div>

      {/* ==================== VÉ ĐIỆN TỬ DYNAMIC QR CODE CHECK-IN (UC-12) ==================== */}
      <ETicketModal
        isOpen={!!selectedTicketBooking}
        onClose={() => setSelectedTicketBooking(null)}
        bookingIdOrCode={(selectedTicketBooking as any)?.backendUUID || selectedTicketBooking?.bookingId}
        initialBookingDetails={selectedTicketBooking}
      />
      {/* ==================== POPUP THANH TOÁN CỌC VIETQR / MOMO ==================== */}
      <QRPaymentModal
        isOpen={!!payingBooking}
        onClose={() => setPayingBooking(null)}
        booking={payingBooking}
        onPaymentSuccess={() => {
          if (payingBooking) {
            setBookingsList((prev) =>
              prev.map((bk) =>
                bk.bookingId === payingBooking.bookingId
                  ? { ...bk, status: 'CONFIRMED', rawStatus: 'CONFIRMED' }
                  : bk
              )
            );
            showToast(`🎉 Đã thanh toán cọc thành công cho đơn ${payingBooking.bookingId}!`);
            const updated = { ...payingBooking, status: 'CONFIRMED' as const, rawStatus: 'CONFIRMED' };
            setPayingBooking(null);
            setSelectedTicketBooking(updated);
          }
        }}
      />
    </AnimatePresence>
  );
};

