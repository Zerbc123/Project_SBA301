import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  MapPin,
  CheckCircle2,
  Heart,
  ShieldCheck,
  User,
  Phone,
  Mail,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  ArrowRight,
  Info,
  Gift,
  Building2,
  Award,
  Utensils,
  Wine,
  Flame,
  Check,
  Tag,
  ShoppingBag,
  Trash2,
  Shirt,
} from 'lucide-react';
import type { TableItem, SignatureDish, BookingDetails } from '../types';
import { SIGNATURE_DISHES } from '../data/mockData';
import { QRPaymentModal } from '../components/common/QRPaymentModal';
import { bookingApi, ensureUUID, SEED_DATA, type CreateBookingRequestPayload } from '../services/bookingApi';

const OCCASIONS = [
  { id: 'date', label: 'Hẹn hò lãng mạn', icon: Heart },
  { id: 'anniversary', label: 'Kỷ niệm ngày cưới / Yêu nhau', icon: Sparkles },
  { id: 'birthday', label: 'Tiệc sinh nhật', icon: Gift },
  { id: 'business', label: 'Tiếp đối tác / Công việc', icon: Building2 },
  { id: 'family', label: 'Tụ họp gia đình / Bạn bè', icon: Users },
];

const QUICK_TAGS = [
  'Ưu tiên bàn gần cửa sổ ngắm view phố',
  'Yêu cầu chuẩn bị nến & hoa trang trí',
  'Cần kê thêm 01 ghế ăn em bé',
  'Vị trí yên tĩnh để trao đổi công việc',
  'Dị ứng hải sản có vỏ',
  'Có khách ăn chay',
];

const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getUpcomingSaturday = (): string => {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return formatDateToISO(d);
};

const isTimeSlotPassed = (timeString: string, selectedDateISO: string): boolean => {
  const now = new Date();
  const todayISO = formatDateToISO(now);

  if (selectedDateISO < todayISO) return true; // Past date
  if (selectedDateISO > todayISO) return false; // Future date

  // If today: check hour & minute
  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;

  const slotMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return slotMinutes <= nowMinutes;
};

const LUNCH_SLOTS_15M = [
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45', '14:00'
];

const DINNER_SLOTS_15M = [
  '17:00', '17:15', '17:30', '17:45',
  '18:00', '18:15', '18:30', '18:45',
  '19:00', '19:15', '19:30', '19:45',
  '20:00', '20:15', '20:30', '20:45',
  '21:00', '21:15', '21:30', '21:45',
  '22:00', '22:15', '22:30', '22:45', '23:00'
];

const HOT_SLOTS = [
  { slot: '11:30 - 13:30', startTime: '11:30', shift: 'Bữa Trưa' },
  { slot: '12:00 - 14:00', startTime: '12:00', shift: 'Trưa Cao Điểm' },
  { slot: '18:00 - 20:00', startTime: '18:00', shift: 'Bữa Tối (Sớm)' },
  { slot: '19:00 - 21:00', startTime: '19:00', shift: '🔥 Giờ Vàng (Đẹp nhất)' },
  { slot: '19:30 - 21:30', startTime: '19:30', shift: '🔥 Cao Điểm Tối' },
  { slot: '20:00 - 22:00', startTime: '20:00', shift: 'Bữa Tối (Muộn)' },
];

interface BookingPageProps {
  tables: TableItem[];
  initialFloor?: 1 | 2 | 3;
  onUpdateTableStatus: (tableId: string, newStatus: TableItem['status']) => void;
  onAddBooking: (newBooking: BookingDetails) => void;
  rebookData?: BookingDetails | null;
  onClearRebook?: () => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  tables,
  onUpdateTableStatus,
  onAddBooking,
  rebookData,
  onClearRebook,
}) => {
  // Toast thông báo Re-book 1 chạm
  const [rebookToast, setRebookToast] = useState<string | null>(null);

  // Step 1: Time & Party
  const [showSection1, setShowSection1] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateToISO(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string>('19:00 - 21:00');
  const [isCustomTime, setIsCustomTime] = useState<boolean>(true);
  const [customArrivalTime, setCustomArrivalTime] = useState<string>('19:00');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<boolean>(false);
  const [partySize, setPartySize] = useState<number>(2);

  // Step 2: Occasion & Preferences (Ghi chú thêm)
  const [showSection2, setShowSection2] = useState<boolean>(true);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<string>('Ưu tiên bàn gần cửa sổ ngắm trọn phố Nguyễn Huệ giúp mình nhé!');

  // Step 3: Pre-orders
  const [selectedDishes, setSelectedDishes] = useState<Record<string, number>>({});
  const [showPreOrderSection, setShowPreOrderSection] = useState<boolean>(true);

  // Tự động khôi phục dữ liệu khi khách bấm "Đặt lại bàn này" (Re-book 1-Chạm)
  useEffect(() => {
    if (rebookData) {
      if (rebookData.partySize) setPartySize(rebookData.partySize);
      if (rebookData.customerName) setCustomerName(rebookData.customerName);
      if (rebookData.phone) setCustomerPhone(rebookData.phone);
      if (rebookData.email) setCustomerEmail(rebookData.email);
      if (rebookData.notes) setCustomNotes(rebookData.notes);

      if (rebookData.preOrders && rebookData.preOrders.length > 0) {
        const dishMap: Record<string, number> = {};
        rebookData.preOrders.forEach((p) => {
          if (p.dish && p.dish.id) {
            dishMap[p.dish.id] = p.quantity;
          }
        });
        setSelectedDishes(dishMap);
      }

      setRebookToast(`Đã tự động tải cấu hình bàn & món ăn cũ từ đơn ${rebookData.bookingId}. Quý khách chỉ cần chọn ngày giờ phù hợp để hoàn tất.`);
    }
  }, [rebookData]);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('ALL');
  const [expandedComboIds, setExpandedComboIds] = useState<Record<string, boolean>>({ 'combo-1': true });

  // Step 4: Policies
  const [showSection4, setShowSection4] = useState<boolean>(true);

  const toggleComboDetails = (dishId: string) => {
    setExpandedComboIds((prev) => ({ ...prev, [dishId]: !prev[dishId] }));
  };

  const handleClearAllDishes = () => {
    setSelectedDishes({});
  };

  // Customer info
  const [customerName, setCustomerName] = useState<string>('Nguyễn Trần Bảo Anh');
  const [customerPhone, setCustomerPhone] = useState<string>('0909123456');
  const [customerEmail, setCustomerEmail] = useState<string>('baoanh.nguyen@gmail.com');

  // Payment modal state
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [currentBooking, setCurrentBooking] = useState<BookingDetails | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingDetails | null>(null);
  const [backendBookingUUID, setBackendBookingUUID] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleQuickTagClick = (tag: string) => {
    if (customNotes.includes(tag)) {
      setCustomNotes((prev) =>
        prev
          .replace(tag, '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*/, '')
          .trim()
      );
    } else {
      setCustomNotes((prev) => (prev ? `${prev.trim()}, ${tag}` : tag));
    }
  };

  const handleDishQuantityChange = (dishId: string, delta: number) => {
    setSelectedDishes((prev) => {
      const current = prev[dishId] || 0;
      const next = current + delta;
      const copy = { ...prev };
      if (next <= 0) {
        delete copy[dishId];
      } else {
        copy[dishId] = next;
      }
      return copy;
    });
  };

  const dishesTotal = Object.entries(selectedDishes).reduce((sum, [dishId, qty]) => {
    const dish = SIGNATURE_DISHES.find((d) => d.id === dishId);
    return sum + (dish ? dish.price * qty : 0);
  }, 0);

  const depositRequired = 200000;
  const grandTotal = depositRequired + dishesTotal;

  // Find a matching table behind the scenes for internal reference
  const findMatchingTable = (): TableItem => {
    const matched = tables.find((t) => t.capacity >= partySize);
    return matched || tables[0];
  };

  const computeEffectiveSlot = () => {
    return isCustomTime ? customArrivalTime : selectedSlot;
  };

  const effectiveTimeSlot = computeEffectiveSlot();

  const handleOpenDepositModal = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập họ tên và số điện thoại liên hệ');
      return;
    }

    const assignedTable = findMatchingTable();
    const tableUUID = ensureUUID(assignedTable.id);

    const preOrderItems = Object.entries(selectedDishes)
      .map(([id, quantity]) => {
        const dish = SIGNATURE_DISHES.find((d) => d.id === id);
        return dish ? { dish, quantity } : null;
      })
      .filter((item): item is { dish: SignatureDish; quantity: number } => item !== null);

    const occasionText = selectedOccasion
      ? `[Dịp: ${OCCASIONS.find((o) => o.id === selectedOccasion)?.label}] `
      : '';
    const fullNotes = `${occasionText}${customNotes}`.trim();

    setIsSubmitting(true);
    let realBookingCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

    // GỌI BACKEND THẬT QUA REST API: POST /api/v1/bookings/request
    try {
      const payload: CreateBookingRequestPayload = {
        guestName: customerName,
        guestPhone: customerPhone,
        guestEmail: customerEmail || 'customer@leprimebistro.vn',
        bookingDate: selectedDate,
        timeSlotId: SEED_DATA.TIME_SLOT_ID,
        guestCount: partySize,
        tableIds: [tableUUID],
        specialNotes: fullNotes,
        totalDeposit: depositRequired,
        preorderItems: preOrderItems.map((p) => ({
          menuItemId: SEED_DATA.MENU_ITEM_ID,
          quantity: p.quantity,
          unitPrice: p.dish.price,
        })),
      };

      const res = await bookingApi.createBooking(payload);
      if (res.success && res.data) {
        realBookingCode = res.data.bookingCode;
        setBackendBookingUUID(res.data.id);
        console.log('✅ [Backend API] Đã tạo thành công đơn đặt bàn trên PostgreSQL:', res.data);
      }
    } catch (err: any) {
      console.warn('⚠️ [Backend API] Lỗi khi gửi đơn lên Backend (chuyển sang dự phòng):', err.message);
    } finally {
      setIsSubmitting(false);
    }

    const newBooking: BookingDetails = {
      bookingId: realBookingCode,
      customerName,
      phone: customerPhone,
      email: customerEmail || 'customer@leprimebistro.vn',
      partySize,
      floor: 1,
      tableCode: assignedTable.code || `Bàn ${assignedTable.id}`,
      tableId: assignedTable.id,
      date: selectedDate,
      timeSlot: effectiveTimeSlot,
      notes: fullNotes,
      preOrders: preOrderItems,
      depositAmount: depositRequired,
      totalEstimatedAmount: grandTotal,
      createdAt: 'Vừa xong',
      status: 'PENDING_DEPOSIT',
      vietqrCode: `TM ${realBookingCode}`,
    };

    setCurrentBooking(newBooking);
    setIsQRModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    if (currentBooking) {
      // GỌI BACKEND THẬT: DUYỆT ĐƠN VÀ XÁC NHẬN CỌC
      if (backendBookingUUID) {
        try {
          const res = await bookingApi.approveAndRequestDeposit(
            backendBookingUUID,
            depositRequired,
            60,
            'Khách đã thanh toán cọc thành công qua VietQR'
          );
          console.log('✅ [Backend API] Duyệt cọc đơn thành công:', res.data);
        } catch (err: any) {
          console.warn('⚠️ [Backend API] Lỗi duyệt cọc trên backend:', err.message);
        }
      }

      const confirmedBooking: BookingDetails = {
        ...currentBooking,
        status: 'CONFIRMED',
      };
      onAddBooking(confirmedBooking);
      setBookingSuccess(confirmedBooking);
      setIsQRModalOpen(false);

      // Auto update table state for host
      const matched = findMatchingTable();
      if (matched) {
        onUpdateTableStatus(matched.id, 'CONFIRMED');
      }
    }
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Re-book Notification Banner (UC-03) */}
      {rebookToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{rebookToast}</span>
          </div>
          <button
            onClick={() => {
              setRebookToast(null);
              if (onClearRebook) onClearRebook();
            }}
            className="p-1 text-amber-600 hover:text-amber-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Hero Banner - Official Restaurant Brand & Info */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A1412] via-[#261E1A] to-[#1A1412] p-8 sm:p-10 text-white shadow-2xl border border-[#3E312B]">
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-[#C4A480]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-8 bottom-4 opacity-5 pointer-events-none hidden lg:block">
          <span className="font-serif text-9xl font-bold tracking-tighter text-white">PRIME</span>
        </div>

        <div className="relative z-10 max-w-4xl space-y-4">
          {/* Brand Tags */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold text-[#E2CBB2] uppercase tracking-[0.25em] bg-[#3E312B]/90 px-3.5 py-1 rounded-full border border-[#C4A480]/30 shadow-2xs">
              Le Prime Bistro & Lounge
            </span>
            <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
              <span>⭐ Michelin Guide Selected 2024</span>
            </span>
          </div>

          {/* Restaurant Title */}
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FBF8F3]">
              Đặt Bàn Trực Tiếp Tại Nhà Hàng
            </h1>
            <p className="text-xs sm:text-sm text-[#D4C8BC] mt-1.5 max-w-2xl leading-relaxed">
              Trải nghiệm ẩm thực Pháp đương đại & Bò lên tuổi Dry-Aged thượng hạng giữa trung tâm Sài Gòn. Quý khách vui lòng chọn ngày giờ và ghi chú để nhà hàng chuẩn bị chu đáo nhất.
            </p>
          </div>

          {/* Core Restaurant Information Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#E5DACF]">
            <div className="flex items-center gap-2 bg-[#2D231E]/80 px-3 py-1.5 rounded-xl border border-[#4A3B34]">
              <MapPin className="w-3.5 h-3.5 text-[#C4A480] shrink-0" />
              <span><strong>Địa chỉ:</strong> 68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM</span>
            </div>

            <div className="flex items-center gap-2 bg-[#2D231E]/80 px-3 py-1.5 rounded-xl border border-[#4A3B34]">
              <Clock className="w-3.5 h-3.5 text-[#C4A480] shrink-0" />
              <span><strong>Giờ mở cửa:</strong> 10:30 – 23:00 (Hàng ngày)</span>
            </div>

            <div className="flex items-center gap-2 bg-[#2D231E]/80 px-3 py-1.5 rounded-xl border border-[#4A3B34]">
              <Phone className="w-3.5 h-3.5 text-[#C4A480] shrink-0" />
              <span><strong>Hotline:</strong> 028 3822 8899 • 0909 123 456</span>
            </div>
          </div>
        </div>

        {/* Value Highlights Footer */}
        <div className="mt-6 pt-5 border-t border-[#3E312B] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#E5DACF]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C4A480]/20 flex items-center justify-center text-[#C4A480] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Giữ Chỗ Cam Kết 100%</p>
              <p className="text-[11px] text-[#A8988B]">Bàn luôn sẵn sàng đúng giờ hẹn</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C4A480]/20 flex items-center justify-center text-[#C4A480] shrink-0">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Ưu Tiên Vị Trí Đẹp Theo Ghi Chú</p>
              <p className="text-[11px] text-[#A8988B]">Ghi chú view ngắm cảnh, dịp kỷ niệm</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C4A480]/20 flex items-center justify-center text-[#C4A480] shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">Bảo Mật Thông Tin Tuyệt Đối</p>
              <p className="text-[11px] text-[#A8988B]">Trải nghiệm riêng tư và đẳng cấp</p>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION BANNER IF JUST BOOKED */}
      <AnimatePresence>
        {bookingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-6 bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-3xl shadow-md text-[#166534] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-[#14532D]">
                  Đặt Bàn Thành Công! Mã đặt chỗ: #{bookingSuccess.bookingId}
                </h3>
                <p className="text-xs sm:text-sm text-[#15803D]">
                  Cảm ơn quý khách <strong>{bookingSuccess.customerName}</strong>. Bàn tại <strong>{bookingSuccess.tableCode}</strong> vào ngày <strong>{bookingSuccess.date} ({bookingSuccess.timeSlot})</strong> cho <strong>{bookingSuccess.partySize} khách</strong> đã được xác nhận.
                </p>
              </div>
            </div>
            <button
              onClick={() => setBookingSuccess(null)}
              className="px-5 py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              Đặt Thêm Bàn Mới
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN RESERVATION WORKFLOW (2-COLUMN MODERN LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (7 COLS): STEP 1, 2, 3 SELECTIONS */}
        <div className="lg:col-span-8 space-y-8">
          {/* STEP 1: DATE, TIME & PARTY SIZE */}
          <section className="bg-white border border-[#E8DFD1] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1] flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  01
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-[#2C221E]">
                      Thời Gian & Số Lượng Thực Khách
                    </h2>
                    {!showSection1 && (
                      <span className="text-[11px] font-semibold text-[#8C6A43] bg-[#FAF4EB] px-2.5 py-0.5 rounded-full border border-[#E8DFD1]">
                        {partySize} Khách • {selectedDate} • {effectiveTimeSlot}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#78716C]">
                    Chọn ngày hẹn, khung giờ dùng bữa và số lượng khách
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSection1(!showSection1)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF4EB] cursor-pointer transition-colors shrink-0"
                title={showSection1 ? 'Thu gọn mục 01' : 'Mở rộng mục 01'}
              >
                {showSection1 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {showSection1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* Quick Party Size Picker */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#C4A480]" />
                        <span>Số lượng khách (Tối thiểu 2 khách):</span>
                      </label>
                      <span className="text-[10px] font-bold text-[#8C6A43] bg-[#FAF4EB] px-2 py-0.5 rounded-md border border-[#E8DFD1]">
                        ⚠️ Chỉ nhận từ 2 khách trở lên
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { size: 2, label: '2 Khách (Tối thiểu)', sub: 'Hẹn hò, Đôi bạn' },
                        { size: 4, label: '3 - 4 Khách', sub: 'Gia đình nhỏ' },
                        { size: 6, label: '5 - 6 Khách', sub: 'Nhóm bạn thân' },
                        { size: 8, label: '7 - 8 Khách', sub: 'Tiệc họp mặt' },
                        { size: 12, label: '9 - 12+ Khách', sub: 'Tiệc lớn / VIP' },
                      ].map((item) => {
                        const isSelected = partySize === item.size;
                        return (
                          <button
                            key={item.size}
                            type="button"
                            onClick={() => setPartySize(item.size)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#FAF4EB] to-[#F3ECE0] border-[#C4A480] shadow-2xs ring-2 ring-[#C4A480]/30'
                                : 'bg-white border-[#E8DFD1] hover:border-[#C4A480]/60 hover:bg-[#FAF7F2]'
                            }`}
                          >
                            <p className={`text-xs font-bold ${isSelected ? 'text-[#8C6A43]' : 'text-[#2C221E]'}`}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-[#78716C] mt-0.5">{item.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Time Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    {/* Date Selection */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#C4A480]" />
                        <span>Ngày dùng bữa:</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-2xl px-4 py-3 text-xs font-bold text-[#2C221E] focus:outline-none focus:border-[#C4A480] cursor-pointer"
                        />
                      </div>
                      {/* Quick Date Shortcuts */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { label: 'Hôm nay', value: formatDateToISO(new Date()) },
                          { label: 'Ngày mai', value: formatDateToISO(new Date(Date.now() + 86400000)) },
                          { label: 'Cuối tuần này', value: getUpcomingSaturday() },
                        ].map((d) => (
                          <button
                            key={d.label}
                            type="button"
                            onClick={() => setSelectedDate(d.value)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              selectedDate === d.value
                                ? 'bg-[#8C6A43] text-white border-[#8C6A43]'
                                : 'bg-[#FAF7F2] text-[#6B5E54] border-[#E8DFD1] hover:bg-[#F3ECE0]'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection Trigger & Expandable Slot Panel */}
                    <div className="space-y-3 relative">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#C4A480]" />
                          <span>Khung giờ dùng bữa:</span>
                        </span>
                        <span className="text-[11px] text-[#8C6A43] font-semibold">
                          {isTimePickerOpen ? 'Đang chọn khung giờ' : 'Bấm để đổi giờ'}
                        </span>
                      </label>

                      {/* Main Compact Time Display / Trigger Card */}
                      <div
                        onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                        className="p-3.5 sm:p-4 bg-gradient-to-r from-[#FAF7F2] to-[#F3ECE0] border-2 border-[#C4A480] hover:border-[#8C6A43] rounded-2xl cursor-pointer transition-all shadow-xs hover:shadow-md group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[#8C6A43] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-serif text-lg sm:text-xl font-bold text-[#2C221E]">
                                {effectiveTimeSlot}
                              </span>
                              <span className="text-[10px] font-bold text-[#8C6A43] bg-white px-2 py-0.5 rounded-full border border-[#E8DFD1]">
                                {parseInt((isCustomTime ? customArrivalTime : selectedSlot).split(':')[0], 10) < 16 ? '☀️ Ca Trưa' : '🌙 Ca Tối'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6B5E54] mt-0.5">
                              Giờ dùng bữa: <strong>{effectiveTimeSlot}</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3.5 py-2 rounded-xl bg-white border border-[#E8DFD1] text-xs font-bold text-[#8C6A43] group-hover:bg-[#8C6A43] group-hover:text-white transition-all flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{isTimePickerOpen ? 'Đóng Bảng' : 'Đổi Giờ'}</span>
                          {isTimePickerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Time Picker Modal / Panel */}
                      <AnimatePresence>
                        {isTimePickerOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -8 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="bg-[#FAF7F2] border-2 border-[#C4A480]/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl overflow-hidden"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD1]">
                              <span className="text-xs font-bold text-[#2C221E]">
                                Chọn khung giờ dự kiến đến nhà hàng:
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsTimePickerOpen(false)}
                                className="text-xs font-semibold text-[#78716C] hover:text-[#2C221E] px-2 py-1 rounded-lg hover:bg-white transition-colors"
                              >
                                ✕ Đóng
                              </button>
                            </div>

                            {/* Section 1: Quick Hot Slots Pills */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-[#8C6A43] uppercase tracking-wider block">
                                🔥 Khung Giờ Gợi Ý Nhanh:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {HOT_SLOTS.map((t) => {
                                  const isPassed = isTimeSlotPassed(t.startTime, selectedDate);
                                  const isSelected = !isCustomTime && selectedSlot === t.slot;
                                  return (
                                    <button
                                      key={t.slot}
                                      type="button"
                                      disabled={isPassed}
                                      onClick={() => {
                                        setSelectedSlot(t.slot);
                                        setIsCustomTime(false);
                                        setIsTimePickerOpen(false);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs transition-all border ${
                                        isPassed
                                          ? 'bg-[#EDE7DE] text-[#A8A199] border-[#E0D7CB] cursor-not-allowed opacity-50 line-through'
                                          : isSelected
                                          ? 'bg-[#8C6A43] text-white border-[#8C6A43] font-bold shadow-2xs'
                                          : 'bg-white text-[#2C221E] border-[#E8DFD1] hover:border-[#C4A480] hover:bg-[#FAF4EB] font-medium cursor-pointer'
                                      }`}
                                    >
                                      <span>{t.startTime}</span>
                                      <span className={`text-[10px] ml-1.5 ${isPassed ? 'text-[#A8A199]' : isSelected ? 'text-amber-100' : 'text-[#8C6A43]'}`}>
                                        {isPassed ? '(Đã qua)' : `(${t.shift})`}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Section 2: 15-Minute Grid Lunch Shift */}
                            <div className="space-y-2 pt-2 border-t border-[#E8DFD1]">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-wider">
                                  ☀️ Ca Trưa (11:00 - 14:00)
                                </span>
                                <span className="text-[10px] text-[#78716C]">Nhận khách muộn nhất 14:00</span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
                                {LUNCH_SLOTS_15M.map((time) => {
                                  const isPassed = isTimeSlotPassed(time, selectedDate);
                                  const isSelected = isCustomTime && customArrivalTime === time;
                                  return (
                                    <button
                                      key={time}
                                      type="button"
                                      disabled={isPassed}
                                      onClick={() => {
                                        setCustomArrivalTime(time);
                                        setIsCustomTime(true);
                                        setIsTimePickerOpen(false);
                                      }}
                                      title={isPassed ? 'Khung giờ này đã trôi qua trong hôm nay' : `Chọn giờ đến lúc ${time}`}
                                      className={`py-2 px-1 text-center rounded-xl text-xs transition-all border ${
                                        isPassed
                                          ? 'bg-[#EDE7DE] text-[#A8A199] border-[#E0D7CB] cursor-not-allowed opacity-50 line-through select-none'
                                          : isSelected
                                          ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white font-bold border-transparent shadow-xs ring-2 ring-[#C4A480]/30 cursor-pointer'
                                          : 'bg-white text-[#2C221E] border-[#E8DFD1] hover:border-[#C4A480] hover:bg-[#FAF4EB] font-medium cursor-pointer'
                                      }`}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Section 3: 15-Minute Grid Dinner Shift */}
                            <div className="space-y-2 pt-2 border-t border-[#E8DFD1]">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-wider">
                                  🌙 Ca Tối & Night Lounge (17:00 - 23:00)
                                </span>
                                <span className="text-[10px] text-[#78716C]">Đóng cửa lúc 23:00</span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-7 gap-1.5">
                                {DINNER_SLOTS_15M.map((time) => {
                                  const isPassed = isTimeSlotPassed(time, selectedDate);
                                  const isSelected = isCustomTime && customArrivalTime === time;
                                  return (
                                    <button
                                      key={time}
                                      type="button"
                                      disabled={isPassed}
                                      onClick={() => {
                                        setCustomArrivalTime(time);
                                        setIsCustomTime(true);
                                        setIsTimePickerOpen(false);
                                      }}
                                      title={isPassed ? 'Khung giờ này đã trôi qua trong hôm nay' : `Chọn giờ đến lúc ${time}`}
                                      className={`py-2 px-1 text-center rounded-xl text-xs transition-all border ${
                                        isPassed
                                          ? 'bg-[#EDE7DE] text-[#A8A199] border-[#E0D7CB] cursor-not-allowed opacity-50 line-through select-none'
                                          : isSelected
                                          ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white font-bold border-transparent shadow-xs ring-2 ring-[#C4A480]/30 cursor-pointer'
                                          : 'bg-white text-[#2C221E] border-[#E8DFD1] hover:border-[#C4A480] hover:bg-[#FAF4EB] font-medium cursor-pointer'
                                      }`}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 2: GHI CHÚ THÊM */}
          <section className="bg-white border border-[#E8DFD1] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1] flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  02
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-[#2C221E]">
                      Ghi Chú Thêm
                    </h2>
                    {!showSection2 && customNotes && (
                      <span className="text-[11px] font-medium text-[#8C6A43] bg-[#FAF4EB] px-2.5 py-0.5 rounded-full border border-[#E8DFD1] max-w-xs truncate">
                        {customNotes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#78716C]">
                    Lễ tân sẽ chuẩn bị và ưu tiên sắp xếp bàn theo ghi chú và mong muốn của quý khách
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSection2(!showSection2)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF4EB] cursor-pointer transition-colors shrink-0"
                title={showSection2 ? 'Thu gọn mục 02' : 'Mở rộng mục 02'}
              >
                {showSection2 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {showSection2 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* Optional Occasion Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center justify-between">
                      <span>Dịp dùng bữa của quý khách:</span>
                      <span className="text-[10px] text-[#8C6A43] font-semibold bg-[#FAF4EB] px-2 py-0.5 rounded-md border border-[#E8DFD1]">
                        Gợi ý • Không bắt buộc
                      </span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {OCCASIONS.map((occ) => {
                        const Icon = occ.icon;
                        const isSelected = selectedOccasion === occ.id;
                        return (
                          <button
                            key={occ.id}
                            type="button"
                            onClick={() => setSelectedOccasion(selectedOccasion === occ.id ? null : occ.id)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-[#FAF4EB] border-[#C4A480] text-[#8C6A43] font-bold ring-2 ring-[#C4A480]/20 shadow-2xs'
                                : 'bg-[#FAF7F2] border-[#E8DFD1] text-[#2C221E] hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#8C6A43]' : 'text-[#78716C]'}`} />
                              <span className="text-xs truncate">{occ.label}</span>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-[#8C6A43] shrink-0">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ghi chú thêm (Quick Chips & Freeform Text) */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center justify-between">
                      <span>Ghi chú thêm:</span>
                      <span className="text-[11px] text-[#78716C] font-normal">Tùy chọn</span>
                    </label>

                    {/* Quick Tags */}
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => {
                        const isChecked = customNotes.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleQuickTagClick(tag)}
                            className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isChecked
                                ? 'bg-[#8C6A43] text-white border-[#8C6A43] shadow-2xs font-semibold'
                                : 'bg-[#FAF7F2] text-[#6B5E54] border-[#E8DFD1] hover:border-[#C4A480]'
                            }`}
                          >
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Freeform Notes Area */}
                    <div className="relative">
                      <FileText className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3.5" />
                      <textarea
                        rows={3}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Ví dụ: Ưu tiên bàn nhìn góc phố đẹp, chuẩn bị thêm 1 đĩa bánh sinh nhật nhỏ tặng bạn gái..."
                        className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-2xl pl-10 pr-4 py-3 text-xs font-medium text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                      />
                    </div>
                    <p className="text-[11px] text-[#78716C] italic flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#C4A480] shrink-0" />
                      <span>Nhà hàng luôn lưu tâm từng yêu cầu và sẽ hướng dẫn quý khách tới bàn tương ứng ngay khi bước vào sảnh.</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 3: PRE-ORDER SIGNATURE COMBOS & MENU (OPTIONAL EXPANDABLE) */}
          <section className="bg-white border border-[#E8DFD1] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            {/* Accordion / Header Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8DFD1]">
              <div className="flex items-start sm:items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1] flex items-center justify-center font-bold text-xs font-mono shrink-0 mt-0.5 sm:mt-0">
                  03
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-[#2C221E]">
                      Đặt Trước Món Ăn & Rượu Vang Signature
                    </h2>
                    <span className="text-[10px] font-bold text-[#8C6A43] bg-[#FAF4EB] px-2.5 py-0.5 rounded-full border border-[#E8DFD1]">
                      Tùy chọn • Không bắt buộc
                    </span>
                  </div>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Bếp trưởng chuẩn bị tẩm ướp & nướng nhiệt độ vàng, phục vụ ngay khi quý khách nhập tiệc.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {Object.keys(selectedDishes).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllDishes}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa món đã chọn</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPreOrderSection(!showPreOrderSection)}
                  className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF4EB] cursor-pointer transition-colors"
                  title={showPreOrderSection ? 'Thu gọn thực đơn' : 'Mở rộng thực đơn'}
                >
                  {showPreOrderSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showPreOrderSection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5 overflow-hidden"
                >
                  {/* Category Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1]">
                    {[
                      { id: 'ALL', label: 'Tất Cả', icon: Utensils, count: SIGNATURE_DISHES.length },
                      { id: 'Set Menu & Combo', label: '🌟 Set Menu & Combo', icon: Sparkles, count: SIGNATURE_DISHES.filter(d => d.category === 'Set Menu & Combo').length },
                      { id: 'Bò Dry-Aged & Món Chính', label: '🥩 Bò Dry-Aged & Mains', icon: Flame, count: SIGNATURE_DISHES.filter(d => d.category === 'Bò Dry-Aged & Món Chính').length },
                      { id: 'Rượu Vang & Champagne', label: '🍷 Vang Grand Cru', icon: Wine, count: SIGNATURE_DISHES.filter(d => d.category === 'Rượu Vang & Champagne').length },
                      { id: 'Khai Vị & Tráng Miệng', label: '🍰 Khai Vị & Tráng Miệng', icon: Award, count: SIGNATURE_DISHES.filter(d => d.category === 'Khai Vị & Tráng Miệng').length },
                    ].map((cat) => {
                      const isSelected = selectedMenuCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedMenuCategory(cat.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#8C6A43] text-white shadow-xs font-bold ring-2 ring-[#8C6A43]/20'
                              : 'bg-white text-[#6B5E54] hover:text-[#2C221E] hover:bg-[#FAF4EB] border border-[#E8DFD1]/80'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1]'
                            }`}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dishes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SIGNATURE_DISHES
                      .filter((dish) => selectedMenuCategory === 'ALL' || dish.category === selectedMenuCategory)
                      .map((dish) => {
                        const qty = selectedDishes[dish.id] || 0;
                        const hasComboItems = Boolean(dish.comboItems && dish.comboItems.length > 0);
                        const isComboExpanded = Boolean(expandedComboIds[dish.id]);
                        const discountAmount = dish.originalPrice ? dish.originalPrice - dish.price : 0;

                        return (
                          <div
                            key={dish.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                              qty > 0
                                ? 'bg-[#FAF4EB] border-[#C4A480] shadow-md ring-2 ring-[#C4A480]/30'
                                : 'bg-[#FAF7F2]/60 border-[#E8DFD1] hover:bg-white hover:border-[#C4A480]/60 hover:shadow-2xs'
                            }`}
                          >
                            {/* Top row: Badge & Image + Info */}
                            <div>
                              <div className="flex gap-3.5 items-start">
                                {/* Dish Image */}
                                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-[#E8DFD1] shadow-2xs">
                                  <img
                                    src={dish.image}
                                    alt={dish.name}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                  />
                                  {dish.badge && (
                                    <span className="absolute bottom-1 left-1 right-1 bg-[#1A1412]/80 backdrop-blur-xs text-[#EAD8C3] text-[9px] font-bold px-1.5 py-0.5 rounded-md text-center truncate border border-[#C4A480]/30">
                                      {dish.badge}
                                    </span>
                                  )}
                                </div>

                                {/* Title, Category & Serving Size */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-[#8C6A43] uppercase tracking-wider">
                                      {dish.category}
                                    </span>
                                    {dish.prepTimeMinutes && (
                                      <span className="text-[10px] text-[#78716C] flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5 text-[#C4A480]" />
                                        {dish.prepTimeMinutes}p
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-serif text-sm font-bold text-[#2C221E] leading-snug line-clamp-2">
                                    {dish.name}
                                  </h4>

                                  {dish.servingSize && (
                                    <p className="text-[10px] font-medium text-[#8C6A43] bg-[#FAF4EB] inline-block px-2 py-0.5 rounded-md border border-[#E8DFD1]">
                                      {dish.servingSize}
                                    </p>
                                  )}

                                  <p className="text-[11px] text-[#78716C] line-clamp-2 leading-relaxed">
                                    {dish.description}
                                  </p>
                                </div>
                              </div>

                              {/* Combo Items Preview if Applicable */}
                              {hasComboItems && (
                                <div className="mt-3 pt-2.5 border-t border-[#E8DFD1]/80">
                                  <button
                                    type="button"
                                    onClick={() => toggleComboDetails(dish.id)}
                                    className="text-[11px] font-bold text-[#8C6A43] hover:text-[#2C221E] flex items-center justify-between w-full cursor-pointer py-0.5"
                                  >
                                    <span className="flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-[#C4A480]" />
                                      <span>Xem thực đơn set gồm {dish.comboItems?.length} món</span>
                                    </span>
                                    <span className="text-[10px] font-mono">
                                      {isComboExpanded ? '▲ Thu gọn' : '▼ Chi tiết'}
                                    </span>
                                  </button>

                                  {isComboExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="space-y-1 mt-2 bg-white/80 p-2.5 rounded-xl border border-[#E8DFD1]"
                                    >
                                      {dish.comboItems?.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-1.5 text-[10px] text-[#594D43]">
                                          <Check className="w-3 h-3 text-[#16A34A] shrink-0 mt-0.5" />
                                          <span>{item}</span>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Bottom Row: Price & Quantity Stepper */}
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E8DFD1]/80">
                              <div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm sm:text-base font-mono font-bold text-[#8C6A43]">
                                    {new Intl.NumberFormat('vi-VN').format(dish.price)} đ
                                  </span>
                                  {dish.originalPrice && (
                                    <span className="text-[11px] font-mono text-[#A8A199] line-through">
                                      {new Intl.NumberFormat('vi-VN').format(dish.originalPrice)} đ
                                    </span>
                                  )}
                                </div>
                                {discountAmount > 0 && (
                                  <span className="text-[9px] font-semibold text-emerald-700 flex items-center gap-0.5">
                                    <Tag className="w-2.5 h-2.5" />
                                    Tiết kiệm {new Intl.NumberFormat('vi-VN').format(discountAmount)} đ
                                  </span>
                                )}
                              </div>

                              {/* Stepper Buttons */}
                              <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl border border-[#E8DFD1] shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleDishQuantityChange(dish.id, -1)}
                                  disabled={qty === 0}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF7F2] disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold font-mono w-5 text-center text-[#2C221E]">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDishQuantityChange(dish.id, 1)}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[#8C6A43] hover:bg-[#FAF4EB] bg-[#FAF7F2] border border-[#E8DFD1] cursor-pointer transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Pre-order Selected Dishes Summary Banner */}
                  {Object.keys(selectedDishes).length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-[#FAF4EB] via-[#F5ECE0] to-[#FAF4EB] border border-[#C4A480] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#8C6A43] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2C221E]">
                            Đã chọn {Object.values(selectedDishes).reduce((a, b) => a + b, 0)} phần món đặt trước
                          </p>
                          <p className="text-[11px] text-[#78716C]">
                            Tiền cọc món (100%): <strong className="text-[#8C6A43] font-mono">{new Intl.NumberFormat('vi-VN').format(dishesTotal)} đ</strong> (Cọc 100% để Bếp trưởng tẩm ướp & lên lửa trước khi khách đến)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#8C6A43] font-medium bg-white px-2.5 py-1 rounded-lg border border-[#E8DFD1]">
                          ✨ Bếp Trưởng Lên Lửa Chuẩn Bị
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 4: RESTAURANT POLICIES & TERMS */}
          <section className="bg-white border border-[#E8DFD1] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1] flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  04
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-[#2C221E]">
                      Quy Định & Chính Sách Đặt Bàn Online
                    </h2>
                    <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Giữ bàn 30p • Hoàn cọc linh hoạt
                    </span>
                  </div>
                  <p className="text-xs text-[#78716C]">
                    Các quy chuẩn phục vụ, thời gian giữ bàn 30 phút và chính sách cọc món ăn tại LE PRIME BISTRO
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSection4(!showSection4)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF4EB] cursor-pointer transition-colors shrink-0"
                title={showSection4 ? 'Thu gọn quy định' : 'Mở rộng quy định'}
              >
                {showSection4 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {showSection4 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Policy 0: Số lượng khách tối thiểu */}
                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#C4A480]/60 space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#8C6A43] text-white flex items-center justify-center shadow-2xs shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[#2C221E]">Số Lượng Khách: Chỉ Nhận Từ 2 Khách Trở Lên</h4>
                          <span className="text-[10px] font-bold text-[#8C6A43] bg-white px-2 py-0.5 rounded-md border border-[#E8DFD1]">
                            Quy chuẩn phục vụ
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#78716C] leading-relaxed">
                        Hệ thống đặt bàn trực tuyến <strong>chỉ áp dụng nhận đặt chỗ cho nhóm từ 2 khách trở lên</strong> nhằm chuẩn bị trọn vẹn không gian bài trí tiêu chuẩn và set up bàn tiệc fine dining chu đáo nhất. Quý khách đi một mình (solo dining) vui lòng liên hệ Hotline trực tiếp để nhà hàng ưu tiên hỗ trợ sắp xếp vị trí tại quầy Bar Lounge.
                      </p>
                    </div>

                    {/* Policy 1: Thời gian giữ bàn */}
                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DFD1] flex items-center justify-center shadow-2xs shrink-0">
                          <Clock className="w-4 h-4 text-[#8C6A43]" />
                        </div>
                        <h4 className="font-bold text-xs text-[#2C221E]">Thời Gian Giữ Bàn (30 Phút)</h4>
                      </div>
                      <p className="text-[11px] text-[#78716C] leading-relaxed">
                        Nhà hàng cam kết ưu tiên giữ bàn tối đa <strong>30 phút</strong> so với giờ hẹn đã đặt. Quý khách vui lòng gọi Hotline thông báo trước nếu đến muộn để nhà hàng bảo lưu vị trí bàn đẹp nhất.
                      </p>
                    </div>

                    {/* Policy 2: Chính sách hoàn cọc phân tầng chống đặt ảo */}
                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DFD1] flex items-center justify-center shadow-2xs shrink-0">
                          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                        </div>
                        <h4 className="font-bold text-xs text-[#2C221E]">Chính Sách Cọc Bàn & Cọc Món (100%)</h4>
                      </div>
                      <div className="text-[11px] text-[#594D43] space-y-1 leading-relaxed">
                        <p>• <strong>Cọc món đặt trước (100%):</strong> Do món ăn & bò Dry-Aged được Bếp trưởng chế biến trước giờ hẹn, quý khách cần cọc 100% tiền món để tránh hủy đơn gây lãng phí nguyên liệu.</p>
                        <p>• <strong>Hủy trước 24 giờ:</strong> Hoàn trả <strong>100%</strong> toàn bộ tiền cọc (bàn + món đặt trước).</p>
                        <p>• <strong>Hủy từ 6h – 24h:</strong> Hoàn trả <strong>50%</strong> tiền cọc (khấu trừ 50% chi phí chuẩn bị và giữ chỗ bàn).</p>
                        <p>• <strong>Hủy dưới 6h / Vắng mặt:</strong> <strong>Không hoàn cọc</strong> (bù đắp chi phí món đã chế biến & slot bàn).</p>
                      </div>
                    </div>

                    {/* Policy 3: Trang phục */}
                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DFD1] flex items-center justify-center shadow-2xs shrink-0">
                          <Shirt className="w-4 h-4 text-[#8C6A43]" />
                        </div>
                        <h4 className="font-bold text-xs text-[#2C221E]">Quy Chuẩn Trang Phục (Dress Code)</h4>
                      </div>
                      <p className="text-[11px] text-[#78716C] leading-relaxed">
                        Khuyến khích phong cách <strong>Smart Casual / Lịch sự</strong> (quần dài, áo sơ mi/polo hoặc đầm dạ tiệc thanh lịch; hạn chế áo ba lỗ và dép xỏ ngón).
                      </p>
                    </div>

                    {/* Policy 4: Rượu ngoài & Bánh kem */}
                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DFD1] flex items-center justify-center shadow-2xs shrink-0">
                          <Wine className="w-4 h-4 text-[#8C6A43]" />
                        </div>
                        <h4 className="font-bold text-xs text-[#2C221E]">Đồ Uống Mang Ngoài & Món Đặt Trước</h4>
                      </div>
                      <p className="text-[11px] text-[#78716C] leading-relaxed">
                        Món bò Dry-Aged & Set Menu được bếp trưởng chuẩn bị trước 4 tiếng. Miễn phí giữ lạnh & phục vụ bánh kem sinh nhật; áp dụng phí mở rượu ngoài theo menu.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAF4EB] border border-[#E8DFD1] rounded-2xl flex items-center gap-3 text-xs text-[#6B5E54]">
                    <Info className="w-4 h-4 text-[#8C6A43] shrink-0" />
                    <span>
                      Sau khi quét mã VietQR và đặt cọc thành công, tin nhắn SMS & mã đặt chỗ sẽ được gửi tự động đến quý khách.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* RIGHT COLUMN (5 COLS): STICKY BOOKING SUMMARY & CONTACT FORM */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white border-2 border-[#C4A480]/60 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            {/* Header */}
            <div className="pb-4 border-b border-[#E8DFD1]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] block">
                Thông Tin Xác Nhận Đặt Bàn
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#2C221E] mt-0.5">
                Tóm Tắt Đặt Chỗ
              </h3>
            </div>

            {/* Selected Summary Card */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8DFD1] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#78716C] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C4A480]" />
                  <span>Ngày hẹn:</span>
                </span>
                <span className="font-bold text-[#2C221E]">{selectedDate}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#78716C] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C4A480]" />
                  <span>Khung giờ:</span>
                </span>
                <span className="font-bold text-[#2C221E]">{effectiveTimeSlot}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#78716C] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C4A480]" />
                  <span>Số lượng:</span>
                </span>
                <span className="font-bold text-[#2C221E]">{partySize} Khách</span>
              </div>

              {selectedOccasion && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E8DFD1]">
                  <span className="text-[#78716C] flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#C4A480]" />
                    <span>Dịp đặc biệt:</span>
                  </span>
                  <span className="font-bold text-[#8C6A43]">
                    {OCCASIONS.find((o) => o.id === selectedOccasion)?.label}
                  </span>
                </div>
              )}

              {Object.keys(selectedDishes).length > 0 && (
                <div className="pt-2 border-t border-[#E8DFD1] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#8C6A43] uppercase tracking-wider block">
                    Món ăn đặt trước:
                  </span>
                  {Object.entries(selectedDishes).map(([id, qty]) => {
                    const dish = SIGNATURE_DISHES.find((d) => d.id === id);
                    if (!dish) return null;
                    return (
                      <div key={id} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#594D43] truncate pr-2">
                          <strong className="text-[#8C6A43] font-mono">{qty}x</strong> {dish.name}
                        </span>
                        <span className="font-mono text-[#2C221E] shrink-0 font-semibold">
                          {new Intl.NumberFormat('vi-VN').format(dish.price * qty)} đ
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Inputs Form */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] block">
                Thông tin người đặt:
              </label>

              <div className="relative">
                <User className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Họ và tên quý khách *"
                  className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                />
              </div>

              <div className="relative">
                <Phone className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại nhận mã QR *"
                  className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                />
              </div>

              <div className="relative">
                <Mail className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email nhận xác nhận (tùy chọn)"
                  className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                />
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 pt-4 border-t border-[#E8DFD1] text-xs">
              <div className="flex justify-between items-center text-[#6B5E54]">
                <span>Tiền cọc giữ bàn (Le Prime):</span>
                <span className="font-bold text-[#2C221E]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(depositRequired)}
                </span>
              </div>

              {dishesTotal > 0 && (
                <div className="flex justify-between items-center text-[#6B5E54]">
                  <span>Tiền cọc món ăn đặt trước (100%):</span>
                  <span className="font-bold text-[#8C6A43] font-mono">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dishesTotal)}
                  </span>
                </div>
              )}

              <div className="p-3.5 bg-[#FAF4EB] rounded-2xl border border-[#E8DFD1] flex justify-between items-center text-xs font-bold pt-2.5">
                <span className="text-[#2C221E]">Tổng Tiền Cọc Thanh Toán (VietQR):</span>
                <span className="font-serif text-base text-[#8C6A43]">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grandTotal)}
                </span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleOpenDepositModal}
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-[#C4A480] to-[#B3936F] hover:brightness-105 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Đang gửi yêu cầu tới máy chủ...' : 'Xác Nhận Đặt Bàn & Giữ Chỗ VietQR'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-[#78716C] text-center space-y-1">
              <p className="flex items-center justify-center gap-1 text-[#3D7058] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hoàn cọc 100% nếu hủy trước 24 giờ</span>
              </p>
              <p>Mã đặt chỗ và hướng dẫn sẽ được gửi qua tin nhắn / Zalo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* VietQR Payment Modal */}
      <QRPaymentModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        booking={currentBooking}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
