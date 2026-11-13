import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Building2,
  CheckCircle2,
  Mic,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { bookingApi } from '../../services/bookingApi';
import type { BookingDetails } from '../../types';

interface PrivateBanquetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBooking: BookingDetails) => void;
}

export const PrivateBanquetModal: React.FC<PrivateBanquetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Form State
  const [eventType, setEventType] = useState<string>('COMPANY_PARTY');
  const [companyName, setCompanyName] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState<string>('18:30 - 22:30');
  const [guestCount, setGuestCount] = useState<number>(35);
  const [targetFloor, setTargetFloor] = useState<number>(3); // 3: Rooftop, 2: VIP, 1: Bistro
  const [estimatedBudget, setEstimatedBudget] = useState<number>(45000000);
  const [stageAudioRequired, setStageAudioRequired] = useState<boolean>(true);
  const [decorationRequired, setDecorationRequired] = useState<boolean>(true);
  const [menuPreference, setMenuPreference] = useState<string>('SET_MENU_5_COURSES');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Submit & Feedback State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<{
    bookingCode: string;
    callbackDeadline: string;
  } | null>(null);

  // 15-Minute Countdown Timer for submitted state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins

  useEffect(() => {
    if (!submittedBooking) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submittedBooking]);

  if (!isOpen) return null;

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!guestName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên người đại diện');
      return;
    }
    if (!guestPhone.trim() || !/^(0|\+84)[0-9]{9,10}$/.test(guestPhone.trim())) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (10 số)');
      return;
    }
    if (!guestEmail.trim() || !guestEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập email hợp lệ để nhận báo giá');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim(),
        companyName: companyName.trim() || undefined,
        bookingDate,
        preferredTime,
        guestCount,
        eventType,
        targetFloor,
        estimatedBudget,
        stageAudioRequired,
        decorationRequired,
        menuPreference,
        specialNotes: specialNotes.trim() || undefined,
      };

      const res = await bookingApi.createEventInquiry(payload);
      if (res.success && res.data) {
        setSubmittedBooking({
          bookingCode: res.data.bookingCode || 'EV2610260001',
          callbackDeadline: res.data.callbackDeadline || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });

        // Convert to client BookingDetails and notify parent
        if (onSuccess) {
          const clientBooking: BookingDetails = {
            bookingId: res.data.bookingCode || 'EV2610260001',
            customerName: guestName,
            phone: guestPhone,
            email: guestEmail,
            companyName: companyName || undefined,
            partySize: guestCount,
            floor: targetFloor as 1 | 2 | 3,
            tableCode: targetFloor === 3 ? 'ROOFTOP-FULL' : targetFloor === 2 ? 'VIP-SALON-ALL' : 'GRAND-BISTRO',
            tableId: `floor-${targetFloor}-event`,
            date: bookingDate,
            timeSlot: preferredTime,
            eventType,
            targetFloor,
            estimatedBudget,
            stageAudioRequired,
            decorationRequired,
            callbackDeadline: res.data.callbackDeadline,
            managerCallStatus: 'PENDING_CALL',
            notes: specialNotes || 'Đơn tiệc sự kiện đoàn đông / bao trọn tầng (UC-10)',
            preOrders: [],
            depositAmount: 0,
            totalEstimatedAmount: estimatedBudget,
            createdAt: 'Vừa tạo',
            status: 'EVENT_INQUIRY',
            vietqrCode: `TM ${res.data.bookingCode}`,
          };
          onSuccess(clientBooking);
        }
      } else {
        throw new Error(res.message || 'Không thể gửi đơn đặt tiệc');
      }
    } catch (err: any) {
      console.error('Lỗi gửi đơn sự kiện:', err);
      setErrorMsg(err.message || 'Không thể gửi đơn đặt tiệc sự kiện. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2C221E] via-[#3D2E28] to-[#2C221E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C4A480] to-[#8C6A43] text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4A480] font-mono">
                  Private Dining & Banquet • UC-10
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold">
                  ⚡ Tư vấn 15 phút
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                Đặt Tiệc Sự Kiện & Bao Trọn Tầng
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {submittedBooking ? (
            /* SUCCESS CONFIRMATION & 15-MINUTE SLA TIMER */
            <div className="py-6 px-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <span className="text-xs font-mono font-bold text-[#8C6A43] bg-[#FAF4EB] px-3 py-1 rounded-full border border-[#C4A480]">
                  Mã Yêu Cầu Sự Kiện: {submittedBooking.bookingCode}
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#2C221E]">
                  Đã Tiếp Nhận Yêu Cầu Đặt Tiệc Sự Kiện!
                </h3>
                <p className="text-xs text-[#78716C] leading-relaxed">
                  Yêu cầu của quý khách đã được chuyển thẳng đến <strong>Quản lý ca trực sảnh (Shift Manager)</strong> của Le Prime Bistro. Chuyên viên sự kiện sẽ gọi trực tiếp qua số <strong>{guestPhone}</strong> để tư vấn concept và gửi menu báo giá.
                </p>
              </div>

              {/* 15-Minute Countdown Box */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#FAF7F2] to-[#FAF4EB] border-2 border-[#C4A480] max-w-md mx-auto shadow-sm space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#8C6A43] uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Cam Kết Thời Gian Phản Hồi (SLA)</span>
                </div>
                <div className="font-mono text-4xl sm:text-5xl font-black text-[#2C221E] tracking-tight">
                  {formatTimer(secondsRemaining)}
                </div>
                <p className="text-[11px] text-[#78716C]">
                  Quản lý ca cam kết liên hệ tư vấn trực tiếp trong vòng <strong>15 phút</strong>.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Hoàn Tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <span>⚠️ {errorMsg}</span>
                </div>
              )}

              {/* 1. Chọn loại hình sự kiện */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-[#2C221E] uppercase tracking-wider block">
                  1. Mục Đích & Loại Hình Sự Kiện:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'COMPANY_PARTY', label: 'Tiệc Doanh Nghiệp / Year End', icon: '🏢' },
                    { id: 'ROOFTOP_BUYOUT', label: 'Bao Trọn Khu Sky Rooftop', icon: '🌆' },
                    { id: 'BIRTHDAY_GALA', label: 'Sinh Nhật Thượng Đỉnh', icon: '🎂' },
                    { id: 'WORKSHOP', label: 'Hội Thảo / Workshop / Họp Báo', icon: '🎤' },
                    { id: 'WEDDING_BANQUET', label: 'Tiệc Cưới / Đính Hôn Riêng Tư', icon: '💍' },
                    { id: 'GALA_DINNER', label: 'Gala Dinner & Tri Ân', icon: '🥂' },
                  ].map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setEventType(evt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        eventType === evt.id
                          ? 'bg-[#FAF4EB] border-[#8C6A43] shadow-xs ring-1 ring-[#8C6A43]'
                          : 'bg-[#FAF7F2] border-[#E8DFD1] hover:bg-white'
                      }`}
                    >
                      <span className="text-xl">{evt.icon}</span>
                      <span className="text-xs font-bold text-[#2C221E] leading-snug">
                        {evt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Chọn Tầng Bao Trọn & Số Lượng Khách */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFD1]">
                <label className="text-xs font-bold text-[#2C221E] uppercase tracking-wider block">
                  2. Chọn Không Gian / Phân Khu Tổ Chức Tiệc:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      floor: 3,
                      title: 'Khu Sky Lounge Rooftop',
                      capacity: '40 - 70 khách',
                      desc: 'Tầm nhìn Panorama hoàng hôn & đêm Sài Gòn, ban công lộng gió.',
                      badge: 'Hot nhất tiệc đêm',
                    },
                    {
                      floor: 2,
                      title: 'Khu Salon VIP & Wine Cellar',
                      capacity: '20 - 45 khách',
                      desc: 'Không gian ấm cúng, acoustic cách âm riêng biệt, tủ rượu Grand Cru.',
                      badge: 'Riêng tư tối thượng',
                    },
                    {
                      floor: 1,
                      title: 'Khu Grand Bistro & Bar',
                      capacity: '60 - 100 khách',
                      desc: 'Không gian tráng lệ, quầy Mixology trung tâm, diện tích lớn nhất.',
                      badge: 'Quy mô tiệc lớn',
                    },
                  ].map((f) => (
                    <div
                      key={f.floor}
                      onClick={() => setTargetFloor(f.floor)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        targetFloor === f.floor
                          ? 'bg-[#FAF4EB] border-[#8C6A43] shadow-xs ring-1 ring-[#8C6A43]'
                          : 'bg-[#FAF7F2] border-[#E8DFD1] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2C221E]">{f.title}</span>
                        <span className="text-[9px] font-bold text-[#8C6A43] bg-white px-2 py-0.5 rounded border border-[#E8DFD1]">
                          {f.badge}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#8C6A43]">{f.capacity}</p>
                      <p className="text-[10px] text-[#78716C] leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Stepper số khách */}
                <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#2C221E] block">
                      Số lượng thực khách ước tính:
                    </span>
                    <span className="text-[11px] text-[#78716C]">
                      (Tiệc sự kiện nhận từ 20 đến 100+ khách)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGuestCount(Math.max(15, guestCount - 5))}
                      className="w-9 h-9 rounded-xl bg-white border border-[#E8DFD1] text-[#2C221E] font-bold text-sm hover:bg-[#FAF4EB] cursor-pointer"
                    >
                      -5
                    </button>
                    <span className="font-mono text-xl font-bold text-[#8C6A43] w-16 text-center">
                      {guestCount} <span className="text-xs font-normal text-[#78716C]">người</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuestCount(Math.min(150, guestCount + 5))}
                      className="w-9 h-9 rounded-xl bg-white border border-[#E8DFD1] text-[#2C221E] font-bold text-sm hover:bg-[#FAF4EB] cursor-pointer"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Ngân sách & Gói Ẩm Thực */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFD1]">
                <label className="text-xs font-bold text-[#2C221E] uppercase tracking-wider block">
                  3. Ngân Sách Dự Kiến & Gói Ẩm Thực:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { amount: 25000000, label: '25.000.000 đ', sub: '~800k / khách' },
                    { amount: 45000000, label: '45.000.000 đ', sub: '~1.2tr / khách' },
                    { amount: 75000000, label: '75.000.000 đ', sub: '~1.8tr / khách' },
                    { amount: 120000000, label: '120.000.000 đ+', sub: 'VIP Đẳng cấp' },
                  ].map((b) => (
                    <button
                      key={b.amount}
                      type="button"
                      onClick={() => setEstimatedBudget(b.amount)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        estimatedBudget === b.amount
                          ? 'bg-[#8C6A43] text-white border-[#8C6A43] shadow-xs'
                          : 'bg-[#FAF7F2] text-[#44403C] border-[#E8DFD1] hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold block">{b.label}</span>
                      <span className={`text-[10px] block ${estimatedBudget === b.amount ? 'text-amber-200' : 'text-[#78716C]'}`}>
                        {b.sub}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { id: 'SET_MENU_5_COURSES', label: 'Set Menu 5 Món Cao Cấp', desc: 'Phục vụ từng đĩa theo tiêu chuẩn Pháp' },
                    { id: 'BUFFET_FRENCH', label: 'Buffet Âu - Á Thượng Hạng', desc: 'Đầy đủ quầy đồ nguội, hải sản & món nóng' },
                    { id: 'COCKTAIL_CANAPE', label: 'Tiệc Đứng Cocktail & Canapé', desc: 'Giao lưu năng động, rượu vang & finger food' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMenuPreference(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        menuPreference === m.id
                          ? 'bg-[#FAF4EB] border-[#8C6A43] ring-1 ring-[#8C6A43]'
                          : 'bg-[#FAF7F2] border-[#E8DFD1] hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-[#2C221E] block">{m.label}</span>
                      <span className="text-[10px] text-[#78716C] block mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Yêu Cầu Kỹ Thuật & Hỗ Trợ Sự Kiện */}
              <div className="space-y-2.5 pt-2 border-t border-[#E8DFD1]">
                <label className="text-xs font-bold text-[#2C221E] uppercase tracking-wider block">
                  4. Yêu Cầu Kỹ Thuật & Dịch Vụ Đi Kèm:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={stageAudioRequired}
                      onChange={(e) => setStageAudioRequired(e.target.checked)}
                      className="w-4 h-4 accent-[#8C6A43] rounded"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#2C221E] flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-[#8C6A43]" />
                        <span>Hệ thống âm thanh & 2 Micro không dây</span>
                      </span>
                      <span className="text-[10px] text-[#78716C]">Hỗ trợ phát biểu, MC & nhạc nền sự kiện</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={decorationRequired}
                      onChange={(e) => setDecorationRequired(e.target.checked)}
                      className="w-4 h-4 accent-[#8C6A43] rounded"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#2C221E] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                        <span>Setup hoa tươi bàn tiệc & Backdrop</span>
                      </span>
                      <span className="text-[10px] text-[#78716C]">Thiết kế theo tone màu thương hiệu / chủ tiệc</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. Thông Tin Người Đại Diện & Ngày Giờ */}
              <div className="space-y-3 pt-2 border-t border-[#E8DFD1]">
                <label className="text-xs font-bold text-[#2C221E] uppercase tracking-wider block">
                  5. Thông Tin Người Đại Diện & Thời Gian:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                      Họ và tên người liên hệ *:
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="VD: Trần Hoàng Nam"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                      Tên công ty / Doanh nghiệp (nếu có):
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="VD: Tập đoàn Công nghệ TechCorp VN"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                      Số điện thoại nhận tư vấn (15 phút) *:
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="VD: 0909888999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                      Email nhận Brochure & Báo Giá *:
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="VD: nam.tran@company.vn"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                      Ngày dự kiến tổ chức *:
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                      Khung giờ tiệc mong muốn:
                    </label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white"
                    >
                      <option value="11:30 - 14:30">Tiệc Trưa (11:30 - 14:30)</option>
                      <option value="17:00 - 20:00">Tiệc Hoàng Hôn (17:00 - 20:00)</option>
                      <option value="18:30 - 22:30">Tiệc Tối Gala (18:30 - 22:30)</option>
                      <option value="Bao trọn cả ngày">Bao trọn nguyên ngày (10:00 - 23:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#44403C] block mb-1">
                    Ghi chú chi tiết thêm:
                  </label>
                  <textarea
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    rows={2}
                    placeholder="VD: Cần tháp ly Champagne khui tiệc, có tiệc sinh nhật sếp tròn 40 tuổi, cần chiếu video clip kỷ niệm..."
                    className="w-full p-3 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480] focus:bg-white leading-relaxed"
                  />
                </div>
              </div>

              {/* Bottom Submit Action */}
              <div className="pt-4 border-t border-[#E8DFD1] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#8C6A43] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cam kết Quản lý ca gọi tư vấn trực tiếp trong 15 phút</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-2xl border border-[#E8DFD1] text-xs font-semibold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[#8C6A43] hover:bg-[#735534] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Đang gửi yêu cầu...</span>
                    ) : (
                      <>
                        <span>Gửi Yêu Cầu & Nhận Tư Vấn (15 Phút)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
