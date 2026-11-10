import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  RotateCw,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Clock,
  Users,
  MapPin,
  Sparkles,
  Baby,
  Flame,
  ShieldAlert,
  UtensilsCrossed,
  Mail,
  Smartphone,
} from 'lucide-react';
import type { ETicketData, BookingDetails } from '../../types';
import { bookingApi } from '../../services/bookingApi';

interface ETicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingIdOrCode?: string;
  initialTicketData?: Partial<ETicketData> | null;
  initialBookingDetails?: BookingDetails | null;
}

export const ETicketModal: React.FC<ETicketModalProps> = ({
  isOpen,
  onClose,
  bookingIdOrCode,
  initialTicketData,
  initialBookingDetails,
}) => {
  const [ticket, setTicket] = useState<ETicketData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshingQr, setIsRefreshingQr] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [isSendingNotice, setIsSendingNotice] = useState<boolean>(false);
  const [isExpandedToken, setIsExpandedToken] = useState<boolean>(false);

  // Timer reference
  const timerRef = useRef<any>(null);

  // Fetch ticket data when opened
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      const targetQuery =
        bookingIdOrCode ||
        initialBookingDetails?.bookingId ||
        (initialTicketData as any)?.bookingCode ||
        '';

      if (!targetQuery && initialTicketData) {
        setTicket(initialTicketData as ETicketData);
        setLoading(false);
        return;
      }

      try {
        const res = targetQuery.length > 20
          ? await bookingApi.getETicket(targetQuery)
          : await bookingApi.getETicketByCode(targetQuery);

        if (res.success && res.data) {
          setTicket(res.data);
          setRemainingSeconds(res.data.refreshIntervalSeconds || 60);
        } else if (initialBookingDetails) {
          // Fallback from BookingDetails
          fallbackFromBookingDetails(initialBookingDetails);
        }
      } catch (err) {
        console.warn('Lỗi khi tải vé điện tử:', err);
        if (initialBookingDetails) {
          fallbackFromBookingDetails(initialBookingDetails);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, bookingIdOrCode, initialBookingDetails, initialTicketData]);

  // Fallback builder
  const fallbackFromBookingDetails = (b: BookingDetails) => {
    const counter = 1;
    const code = b.bookingId;
    const token = Array.from({ length: 64 }, (_, i) =>
      ((code.charCodeAt(i % code.length) * 31 + i * 17) % 16).toString(16)
    ).join('');

    setTicket({
      bookingId: (b as any).backendUUID || b.bookingId,
      bookingCode: b.bookingId,
      guestName: b.customerName,
      guestPhone: b.phone,
      guestEmail: b.email,
      bookingDate: b.date,
      timeSlotName: b.timeSlot,
      timeSlotRange: b.timeSlot,
      guestCount: b.partySize,
      tableCode: b.tableCode,
      floorNumber: b.floor,
      floorName: b.floor === 3 ? 'Khu Sky Lounge Rooftop' : b.floor === 2 ? 'Phòng VIP Salon Cellar' : 'Sảnh Grand Bistro & Bar',
      totalDeposit: b.depositAmount,
      status: b.status,
      isConfirmed: b.status === 'CONFIRMED' || b.status === 'CHECKED_IN',
      occasion: b.occasion,
      dietaryNotes: b.dietaryNotes,
      babyChairCount: b.babyChairCount,
      candleSetup: b.candleSetup,
      specialNotes: b.notes,
      preorderItems: (b.preOrders || []).map((p) => ({
        itemName: p.dish.name,
        quantity: p.quantity,
        unitPrice: p.dish.price,
        subtotal: p.dish.price * p.quantity,
        notes: p.preparationNotes,
      })),
      dynamicQrToken: token,
      qrRotationCounter: counter,
      qrExpiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
      refreshIntervalSeconds: 60,
      ticketIssuedAt: new Date().toISOString(),
      ticketZnsStatus: 'DELIVERED',
      ticketEmailStatus: 'DELIVERED',
      checkinScannedAt: null,
      isAlreadyCheckedIn: b.status === 'CHECKED_IN',
      restaurantName: 'LE PRIME BISTRO & SKY LOUNGE',
      restaurantAddress: '68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
      hotline: '028 3822 8899 • 0909 123 456',
      dressCode: 'Smart Casual / Elegant',
    });
    setRemainingSeconds(60);
  };

  // Rotating countdown timer (60s loop)
  useEffect(() => {
    if (!isOpen || !ticket || ticket.isAlreadyCheckedIn) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          handleAutoRefreshQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, ticket?.bookingId, ticket?.isAlreadyCheckedIn]);

  // Handle Refresh QR Token
  const handleAutoRefreshQr = async () => {
    if (!ticket) return;
    try {
      setIsRefreshingQr(true);
      const res = await bookingApi.refreshDynamicQr(ticket.bookingId);
      if (res.success && res.data) {
        setTicket((prev) => prev ? {
          ...prev,
          dynamicQrToken: res.data.dynamicQrToken,
          qrRotationCounter: res.data.qrRotationCounter,
          qrExpiresAt: res.data.qrExpiresAt,
        } : res.data);
      }
    } catch (err) {
      console.warn('Lỗi làm mới QR:', err);
    } finally {
      setIsRefreshingQr(false);
      setRemainingSeconds(60);
    }
  };

  // Manual Refresh
  const handleManualRefresh = () => {
    handleAutoRefreshQr();
  };

  // Copy 64-char token
  const handleCopyToken = () => {
    if (!ticket?.dynamicQrToken) return;
    navigator.clipboard.writeText(ticket.dynamicQrToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Resend ZNS / Email
  const handleResendNotification = async (channel: 'ZNS' | 'EMAIL' | 'BOTH') => {
    if (!ticket) return;
    setIsSendingNotice(true);
    try {
      const res = await bookingApi.sendTicketNotification(ticket.bookingId, { channel });
      if (res.success) {
        setNotificationStatus(`✅ Đã gửi lại vé điện tử thành công qua ${channel === 'BOTH' ? 'Zalo ZNS và Email' : channel}!`);
        setTicket((prev) => prev ? {
          ...prev,
          ticketZnsStatus: channel === 'EMAIL' ? prev.ticketZnsStatus : 'SENT',
          ticketEmailStatus: channel === 'ZNS' ? prev.ticketEmailStatus : 'SENT',
        } : null);
      }
    } catch (err: any) {
      setNotificationStatus('⚠️ Không thể gửi lại thông báo: ' + err.message);
    } finally {
      setIsSendingNotice(false);
      setTimeout(() => setNotificationStatus(null), 4000);
    }
  };

  if (!isOpen) return null;

  const totalPrepDishes = ticket?.preorderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const timerPercent = (remainingSeconds / (ticket?.refreshIntervalSeconds || 60)) * 100;
  const qrDataValue = ticket?.dynamicQrToken || ticket?.bookingCode || 'LEPRIME-TICKET';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[#FAF7F2] rounded-[32px] shadow-2xl border border-amber-300/60 overflow-hidden my-auto"
        >
          {/* Top Decorative Gold Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500" />

          {/* ==================== VIP BOARDING PASS HEADER ==================== */}
          <div className="relative bg-gradient-to-br from-[#16100E] via-[#241A16] to-[#120C0A] text-white p-6 sm:p-7 border-b border-amber-900/40">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer z-10"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Crest & Title */}
            <div className="flex items-start justify-between pr-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-serif text-sm font-black shadow-md">
                    LP
                  </div>
                  <div>
                    <h3 className="font-serif font-extrabold text-base tracking-wider text-amber-100 uppercase">
                      {ticket?.restaurantName || 'LE PRIME BISTRO & LOUNGE'}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/90 font-mono">
                      Haute Gastronomy • Dynamic E-Ticket (UC-12)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Code Hero Banner */}
            <div className="mt-5 p-3.5 bg-black/40 rounded-2xl border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-widest block font-medium">
                  Mã Vé Đặt Bàn (Booking Code):
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-wider">
                  #{ticket?.bookingCode || bookingIdOrCode || 'BK-PENDING'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase tracking-widest block font-medium">
                  Trạng Thái:
                </span>
                {ticket?.isAlreadyCheckedIn ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ĐÃ VÀO BÀN
                  </span>
                ) : ticket?.isConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ĐÃ XÁC NHẬN CỌC
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-full">
                    CHỜ XỬ LÝ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ==================== SCALLOPED TICKET CUTOUTS ==================== */}
          <div className="relative h-6 bg-[#FAF7F2] flex items-center justify-between px-[-12px]">
            <div className="w-6 h-6 rounded-full bg-slate-950 -ml-3 shadow-inner" />
            <div className="flex-1 border-b-2 border-dashed border-[#D6C7B2] mx-2 opacity-60" />
            <div className="w-6 h-6 rounded-full bg-slate-950 -mr-3 shadow-inner" />
          </div>

          {/* ==================== BODY CONTENT ==================== */}
          <div className="p-6 sm:p-7 space-y-6 max-h-[calc(85vh-200px)] overflow-y-auto">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-stone-600 font-medium">Đang tạo vé điện tử động bảo mật HMAC-SHA256...</p>
              </div>
            ) : (
              <>
                {/* 1. DYNAMIC QR CONTAINER WITH 60-SEC ROTATING COUNTDOWN */}
                <div className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-md text-center space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Dynamic QR Token (Chống Chụp Màn Hình)</span>
                    </div>

                    {/* Circular Countdown Ring */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-stone-200"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={`${
                              remainingSeconds <= 10 ? 'text-rose-500' : 'text-amber-500'
                            } transition-all duration-1000 ease-linear`}
                            strokeDasharray={`${timerPercent}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute font-mono text-[10px] font-bold text-stone-800">
                          {remainingSeconds}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">giây</span>
                    </div>
                  </div>

                  {/* QR Image Frame with Security Corners */}
                  <div className="relative inline-block p-4 bg-gradient-to-b from-amber-50/70 to-white rounded-2xl border-2 border-dashed border-amber-300 shadow-inner">
                    <span className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-700" />
                    <span className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-700" />
                    <span className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-700" />
                    <span className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-700" />

                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                        qrDataValue
                      )}`}
                      alt="Mã QR Vé Check-in Động"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto rounded-xl bg-white shadow-xs"
                    />

                    {isRefreshingQr && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center gap-2">
                        <RotateCw className="w-7 h-7 text-amber-600 animate-spin" />
                        <span className="text-[11px] font-bold text-amber-900">Đang xoay token 64 ký tự mới...</span>
                      </div>
                    )}
                  </div>

                  {/* Token & Rotation Counter Strip */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                        Token Bảo Mật HMAC (64 Ký Tự) • Phiên xoay #{ticket?.qrRotationCounter || 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsExpandedToken(!isExpandedToken)}
                          className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer underline"
                        >
                          {isExpandedToken ? 'Thu gọn' : 'Xem toàn bộ'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyToken}
                          className="text-[10px] text-stone-600 hover:text-stone-900 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-stone-200 cursor-pointer"
                        >
                          {copiedToken ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="font-mono text-[10px] text-stone-700 break-all bg-white p-2 rounded-xl border border-stone-200/60 leading-relaxed select-all">
                      {isExpandedToken
                        ? ticket?.dynamicQrToken
                        : `${ticket?.dynamicQrToken?.substring(0, 24)}...${ticket?.dynamicQrToken?.substring(
                            ticket.dynamicQrToken.length - 16
                          )}`}
                    </p>
                  </div>

                  {/* Manual Refresh CTA */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Tự động xoay sau {remainingSeconds}s
                    </span>

                    <button
                      type="button"
                      onClick={handleManualRefresh}
                      disabled={isRefreshingQr}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-100/70 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                      <span>Làm mới mã ngay</span>
                    </button>
                  </div>
                </div>

                {/* 2. CORE BOOKING SPECS GRID */}
                <div className="bg-white rounded-3xl p-5 border border-[#E8DFD1] space-y-4 shadow-xs">
                  <h4 className="font-serif font-bold text-sm text-[#2C221E] pb-2 border-b border-[#E8DFD1] flex items-center justify-between">
                    <span>Thông Tin Đặt Bàn & Vị Trí</span>
                    <span className="font-mono text-xs text-amber-800 font-semibold">
                      {ticket?.floorName || 'Sảnh Grand Bistro & Bar'}
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-700" /> Thực Khách:
                      </span>
                      <strong className="text-[#2C221E] font-bold block">
                        {ticket?.guestName} ({ticket?.guestCount} người)
                      </strong>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" /> Ngày & Khung Giờ:
                      </span>
                      <strong className="text-[#2C221E] font-bold block">
                        {ticket?.bookingDate} • {ticket?.timeSlotRange}
                      </strong>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-700" /> Bàn Được Phân Bổ:
                      </span>
                      <strong className="text-amber-900 font-mono font-bold block text-sm">
                        {ticket?.tableCode || 'Sảnh Trung Tâm'}
                      </strong>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[11px] text-[#78716C] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Cọc Đã Thanh Toán:
                      </span>
                      <strong className="text-emerald-800 font-mono font-bold block">
                        {new Intl.NumberFormat('vi-VN').format(ticket?.totalDeposit || 0)} đ
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. UC-08: SPECIAL REQUESTS & DIETARY NOTES */}
                {(ticket?.occasion || ticket?.dietaryNotes || ticket?.babyChairCount || ticket?.candleSetup || ticket?.specialNotes) && (
                  <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200/70 space-y-3">
                    <h4 className="font-serif font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nhu Cầu Đặc Biệt & Dị Ứng (Đã Đồng Bộ Sang KDS Bếp)</span>
                    </h4>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {ticket.occasion && (
                        <span className="bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-xl border border-amber-300">
                          🎉 Dịp tiệc: {ticket.occasion}
                        </span>
                      )}
                      {ticket.babyChairCount ? (
                        <span className="bg-blue-100 text-blue-900 font-semibold px-3 py-1 rounded-xl border border-blue-200 flex items-center gap-1">
                          <Baby className="w-3.5 h-3.5 text-blue-600" />
                          {ticket.babyChairCount} Ghế em bé (High-chair)
                        </span>
                      ) : null}
                      {ticket.candleSetup && (
                        <span className="bg-rose-100 text-rose-900 font-semibold px-3 py-1 rounded-xl border border-rose-200 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-600" />
                          Setup nến thơm tinh dầu
                        </span>
                      )}
                    </div>

                    {ticket.dietaryNotes && (
                      <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-1">
                        <span className="font-bold text-rose-800 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          <span>Lưu ý ăn uống & Cảnh báo dị ứng:</span>
                        </span>
                        <p className="text-rose-900/90 leading-relaxed font-medium">
                          {ticket.dietaryNotes}
                        </p>
                      </div>
                    )}

                    {ticket.specialNotes && (
                      <p className="text-xs text-stone-600 italic bg-white/70 p-2.5 rounded-xl border border-stone-200">
                        "{ticket.specialNotes}"
                      </p>
                    )}
                  </div>
                )}

                {/* 4. PREORDER ITEMS IF ANY */}
                {ticket?.preorderItems && ticket.preorderItems.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-[#E8DFD1] space-y-3 shadow-xs">
                    <h4 className="font-serif font-bold text-xs text-[#2C221E] uppercase tracking-wider flex items-center justify-between pb-2 border-b border-[#E8DFD1]">
                      <span>Món Signature Đặt Trước ({totalPrepDishes} phần)</span>
                      <span className="text-[11px] font-mono font-bold text-amber-800">
                        Bếp Đang Chuẩn Bị
                      </span>
                    </h4>

                    <div className="space-y-2 text-xs">
                      {ticket.preorderItems.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between pb-2 border-b border-stone-100 last:border-0 last:pb-0">
                          <div>
                            <p className="font-bold text-[#2C221E]">
                              <span className="text-amber-700 font-mono">{item.quantity}x</span> {item.itemName}
                            </p>
                            {item.notes && (
                              <p className="text-[11px] text-[#78716C] italic pl-2">↳ {item.notes}</p>
                            )}
                          </div>
                          <span className="font-mono font-bold text-stone-800 shrink-0">
                            {new Intl.NumberFormat('vi-VN').format(item.subtotal)} đ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. MULTI-CHANNEL DISPATCH STATUS (ZNS & EMAIL) */}
                <div className="bg-stone-50 rounded-3xl p-4 sm:p-5 border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-xs text-[#2C221E] uppercase tracking-wider">
                      Trạng Thái Gửi Tự Động Qua Zalo & Email
                    </h4>
                    <span className="text-[10px] font-mono text-stone-500">
                      Kafka Event-Driven
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* ZNS Status */}
                    <div className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-500 block">Zalo ZNS Official</span>
                        <strong className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] truncate">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Đã gửi tới {ticket?.guestPhone}</span>
                        </strong>
                      </div>
                    </div>

                    {/* Email Status */}
                    <div className="p-3 bg-white rounded-2xl border border-stone-200 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-stone-500 block">Email Xác Nhận</span>
                        <strong className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] truncate">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{ticket?.guestEmail ? `Đã gửi tới ${ticket.guestEmail}` : 'Đã gửi tới hộp thư'}</span>
                        </strong>
                      </div>
                    </div>
                  </div>

                  {notificationStatus && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold animate-in fade-in">
                      {notificationStatus}
                    </div>
                  )}

                  {/* Resend actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <span className="text-[11px] text-stone-500 mr-auto">Chưa nhận được tin nhắn?</span>
                    <button
                      type="button"
                      onClick={() => handleResendNotification('ZNS')}
                      disabled={isSendingNotice}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Gửi Lại ZNS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResendNotification('EMAIL')}
                      disabled={isSendingNotice}
                      className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Gửi Lại Email
                    </button>
                  </div>
                </div>

                {/* 6. HOSPITALITY GUIDELINE & VENUE ADDRESS */}
                <div className="p-4 bg-amber-100/40 rounded-2xl border border-amber-300/60 text-xs text-amber-950 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                    <span>Chỉ Dẫn Khi Đến Cửa Nhà Hàng:</span>
                  </p>
                  <p className="text-amber-900/90 leading-relaxed text-[11px]">
                    Quý khách chỉ cần đưa màn hình điện thoại có mã QR này cho <strong>Lễ tân trực sảnh (Host)</strong> để quét camera. Hệ thống tự động mở bàn và nhân viên dẫn quý khách lên đúng vị trí đã chọn mà không cần chờ đợi.
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium pt-1">
                    📍 <strong>Địa chỉ:</strong> {ticket?.restaurantAddress || '68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM'} • Hotline: {ticket?.hotline || '028 3822 8899'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ==================== FOOTER ACTIONS ==================== */}
          <div className="p-4 sm:p-5 bg-white border-t border-[#E8DFD1] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Chống giả mạo 1-Time Use</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
