import React, { useState, useEffect, useMemo } from 'react';
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
  Gift,
  Building2,
  Award,
  Utensils,
  Wine,
  Flame,
  Check,
  ShoppingBag,
  Trash2,
  Shirt,
  Move3d,
  Sun,
  Moon,
  Star,
} from 'lucide-react';
import type { TableItem, SignatureDish, BookingDetails } from '../types';
import { SIGNATURE_DISHES } from '../data/mockData';
import { QRPaymentModal } from '../components/common/QRPaymentModal';
import { AvailabilitySearchEngine } from '../components/booking/AvailabilitySearchEngine';
import { FloorPlanCanvas } from '../components/floor/FloorPlanCanvas';
import { SpatialFloor3D } from '../components/floor/SpatialFloor3D';
import {
  bookingApi,
  ensureUUID,
  SEED_DATA,
  type CreateBookingRequestPayload,
  type TableAvailabilityDto,
} from '../services/bookingApi';

const OCCASIONS = [
  { id: 'date', label: 'Hẹn hò lãng mạn', icon: Heart, desc: 'Bàn nến ấm cúng, view lãng mạn' },
  { id: 'anniversary', label: 'Kỷ niệm ngày cưới / Yêu nhau', icon: Sparkles, desc: 'Setup hoa hồng & chúc mừng' },
  { id: 'birthday', label: 'Tiệc sinh nhật', icon: Gift, desc: 'Tặng đĩa bánh sinh nhật nhỏ' },
  { id: 'business', label: 'Tiếp đối tác / Công việc', icon: Building2, desc: 'Yên tĩnh, trang trọng & riêng tư' },
  { id: 'family', label: 'Tụ họp gia đình / Bạn bè', icon: Users, desc: 'Không gian rộng rãi, ấm cúng' },
];

const QUICK_TAGS = [
  'Ưu tiên bàn gần cửa sổ ngắm view phố',
  'Yêu cầu chuẩn bị nến & hoa trang trí',
  'Cần kê thêm 01 ghế ăn em bé',
  'Vị trí yên tĩnh để trao đổi công việc',
  'Dị ứng hải sản có vỏ',
  'Có khách dùng món chay',
  'Tặng đĩa bánh kem nhỏ mừng sinh nhật',
];

const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

const LUNCH_SLOTS = [
  { time: '11:00', label: 'Trưa sớm', hot: false },
  { time: '11:30', label: 'Trưa phổ biến', hot: false },
  { time: '12:00', label: 'Cao điểm trưa', hot: true },
  { time: '12:30', label: 'Trưa thoải mái', hot: false },
  { time: '13:00', label: 'Trưa muộn', hot: false },
  { time: '13:30', label: 'Cuối ca trưa', hot: false },
];

const DINNER_SLOTS = [
  { time: '17:30', label: 'Hoàng hôn', hot: false },
  { time: '18:00', label: 'Bữa tối sớm', hot: false },
  { time: '18:30', label: 'Đầu giờ tối', hot: false },
  { time: '19:00', label: '🔥 Giờ vàng đẹp nhất', hot: true },
  { time: '19:30', label: '🔥 Cao điểm tiệc', hot: true },
  { time: '20:00', label: 'Tối lãng mạn', hot: false },
  { time: '20:30', label: 'Dạ tiệc muộn', hot: false },
  { time: '21:00', label: 'Night Lounge', hot: false },
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
  initialFloor = 1,
  onUpdateTableStatus,
  onAddBooking,
  rebookData,
  onClearRebook,
}) => {
  // Toast thông báo Re-book 1 chạm
  const [rebookToast, setRebookToast] = useState<string | null>(null);

  // Stepper tracker for active section highlighting
  const [activeStep, setActiveStep] = useState<number>(1);

  // Step 1: Time & Party
  const [showSection1, setShowSection1] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateToISO(new Date()));
  const [selectedShift, setSelectedShift] = useState<'DINNER' | 'LUNCH'>('DINNER');
  const [selectedSlot, setSelectedSlot] = useState<string>('19:00');
  const [partySize, setPartySize] = useState<number>(2);

  // Step 2: Interactive Floor & Availability Search
  const [showSection2, setShowSection2] = useState<boolean>(true);
  const [currentFloor, setCurrentFloor] = useState<1 | 2 | 3>(initialFloor);
  const [floorViewMode, setFloorViewMode] = useState<'floor2d' | 'floor3d' | 'cards'>('floor2d');
  const [selectedTable, setSelectedTable] = useState<TableAvailabilityDto | null>(null);

  // Step 3: Occasion & Preferences
  const [showSection3, setShowSection3] = useState<boolean>(true);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>('date');
  const [customNotes, setCustomNotes] = useState<string>('Ưu tiên bàn gần cửa sổ ngắm trọn phố Nguyễn Huệ giúp mình nhé!');

  // Step 4: Pre-orders
  const [showSection4, setShowSection4] = useState<boolean>(true);
  const [selectedDishes, setSelectedDishes] = useState<Record<string, number>>({});
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('ALL');
  const [expandedComboIds, setExpandedComboIds] = useState<Record<string, boolean>>({ 'combo-1': true });

  // Step 5: Policies
  const [showSection5, setShowSection5] = useState<boolean>(true);

  // Customer Contact Info
  const [customerName, setCustomerName] = useState<string>('Nguyễn Trần Bảo Anh');
  const [customerPhone, setCustomerPhone] = useState<string>('0909123456');
  const [customerEmail, setCustomerEmail] = useState<string>('baoanh.nguyen@gmail.com');

  // Payment modal state
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [currentBooking, setCurrentBooking] = useState<BookingDetails | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingDetails | null>(null);
  const [backendBookingUUID, setBackendBookingUUID] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Generate 7 upcoming days for horizontal date selector
  const upcomingDays = useMemo(() => {
    const list = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = formatDateToISO(d);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      list.push({
        iso,
        dayName: isToday ? 'Hôm nay' : isTomorrow ? 'Ngày mai' : dayNames[d.getDay()],
        dayNum: d.getDate(),
        month: d.getMonth() + 1,
        fullLabel: `${dayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    return list;
  }, []);

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

      setRebookToast(`Đã tự động tải cấu hình bàn & món ăn cũ từ đơn #${rebookData.bookingId}. Quý khách chỉ cần chọn ngày giờ phù hợp để hoàn tất.`);
    }
  }, [rebookData]);

  const toggleComboDetails = (dishId: string) => {
    setExpandedComboIds((prev) => ({ ...prev, [dishId]: !prev[dishId] }));
  };

  const handleClearAllDishes = () => {
    setSelectedDishes({});
  };

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

  // Find table from TableItem list
  const findMatchingTable = (): TableItem => {
    if (selectedTable) {
      const match = tables.find((t) => t.id === selectedTable.tableId || t.code === selectedTable.tableCode);
      if (match) return match;
    }
    const matched = tables.find((t) => t.capacity >= partySize && t.floor === currentFloor && t.status === 'AVAILABLE');
    return matched || tables[0];
  };

  const activeTableItem = useMemo(() => {
    if (selectedTable) {
      return tables.find((t) => t.id === selectedTable.tableId || t.code === selectedTable.tableCode) || null;
    }
    return null;
  }, [tables, selectedTable]);

  // Handle table selection directly on 2D / 3D Floor Canvas
  const handleSelectTableFromFloor = (table: TableItem) => {
    if (table.status !== 'AVAILABLE') return;

    const dto: TableAvailabilityDto = {
      tableId: table.id,
      tableCode: table.code,
      floorNumber: table.floor,
      floorName: table.floor === 1
        ? 'Tầng 1 - Sảnh Vòm & Bar'
        : table.floor === 2
        ? 'Tầng 2 - Phòng VIP Riêng Tư'
        : 'Tầng 3 - Sky Lounge Ngoài Trời',
      zoneType: table.zone,
      minCapacity: Math.max(1, table.capacity - 2),
      maxCapacity: table.capacity,
      customDeposit: table.depositPrice || 200000,
      shape: table.shape,
      isAvailable: true,
      status: 'AVAILABLE',
      statusMessage: `Bàn ${table.code} đang trống và sẵn sàng giữ chỗ`,
      satisfiesCapacityRule: partySize <= table.capacity,
      isBookedInDb: false,
      isHeldInRedis: false,
      recommended: false,
    };
    setSelectedTable(dto);
  };

  const depositRequired = selectedTable?.customDeposit ? Number(selectedTable.customDeposit) : 200000;
  const grandTotal = depositRequired + dishesTotal;
  const effectiveTimeSlot = `${selectedSlot} - ${parseInt(selectedSlot.split(':')[0], 10) + 2}:${selectedSlot.split(':')[1]}`;

  // Floor descriptions
  const floorDescriptions: Record<1 | 2 | 3, { name: string; tag: string; view: string }> = {
    1: {
      name: 'Tầng 1: Sảnh Chính & View Phố Nguyễn Huệ',
      tag: '14 Bàn • Cửa kính Panoramic',
      view: 'Ngắm trọn đại lộ Nguyễn Huệ lung linh, cạnh Sân khấu Acoustic và Quầy Bar mở',
    },
    2: {
      name: 'Tầng 2: Phòng Tiệc VIP & Hầm Rượu Vang',
      tag: '3 Phòng VIP • Riêng tư tuyệt đối',
      view: 'Không gian cách âm cao cấp, hầm rượu Bordeaux Grand Cru, phục vụ riêng',
    },
    3: {
      name: 'Tầng 3: Sky Lounge Rooftop Ngoài Trời',
      tag: '5 Bàn • Tầm nhìn toàn cảnh 360°',
      view: 'Không gian ban công lộng gió, ngắm hoàng hôn và phố đêm Sài Gòn từ trên cao',
    },
  };

  const handleOpenDepositModal = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập họ tên và số điện thoại liên hệ để nhận mã xác nhận VietQR');
      return;
    }

    const assignedTable = findMatchingTable();
    const tableUUID = selectedTable ? selectedTable.tableId : ensureUUID(assignedTable.id);
    const tableCode = selectedTable
      ? `Bàn ${selectedTable.tableCode}`
      : (assignedTable.code || `Bàn ${assignedTable.id}`);
    const tableFloor = (selectedTable?.floorNumber as 1 | 2 | 3) || currentFloor;

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
      console.warn('⚠️ [Backend API] Gửi đơn sang chế độ Client Standalone:', err.message);
    } finally {
      setIsSubmitting(false);
    }

    const newBooking: BookingDetails = {
      bookingId: realBookingCode,
      customerName,
      phone: customerPhone,
      email: customerEmail || 'customer@leprimebistro.vn',
      partySize,
      floor: tableFloor,
      tableCode: tableCode,
      tableId: tableUUID,
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

      const matched = findMatchingTable();
      if (matched) {
        onUpdateTableStatus(matched.id, 'CONFIRMED');
      }
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Re-book Notification Banner */}
      {rebookToast && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-orange-500/10 border-2 border-amber-400 flex items-center justify-between text-xs text-amber-950 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-amber-900">Re-book 1-Chạm Thông Minh</p>
              <p className="text-amber-800/90">{rebookToast}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setRebookToast(null);
              if (onClearRebook) onClearRebook();
            }}
            className="p-1.5 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. CINEMATIC LUXURY HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#140F0D] via-[#1E1714] to-[#0F0B09] p-8 sm:p-10 text-white shadow-2xl border border-amber-900/40">
        {/* Ambient Gold Glows */}
        <div className="absolute -right-20 -top-20 w-[450px] h-[450px] bg-gradient-to-bl from-amber-500/20 via-amber-700/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-24 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Badges Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-[0.25em] bg-amber-950/80 px-3.5 py-1.5 rounded-full border border-amber-500/40 shadow-sm flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Michelin Guide Selected 2024</span>
              </span>
              <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/70 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Table Map • WebSocket Đồng Bộ Thời Gian Thực</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-amber-200/80 font-mono">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Redis Redlock Chống Trùng Bàn</span>
            </div>
          </div>

          {/* Restaurant Title & Subtitle */}
          <div className="max-w-4xl space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Đặt Bàn & Giữ Chỗ Trực Quan <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">Sơ Đồ 2D / 3D</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-3xl leading-relaxed">
              Trải nghiệm ẩm thực Pháp đương đại & Bò lên tuổi Dry-Aged thượng hạng giữa trung tâm Sài Gòn. Tự tay chọn góc ngồi ngắm đại lộ Nguyễn Huệ hoặc phòng riêng kín đáo qua mặt bằng trực tiếp.
            </p>
          </div>

          {/* Quick Info Strip */}
          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-stone-200">
            <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur px-3.5 py-2 rounded-xl border border-stone-800">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span><strong>Địa chỉ:</strong> 68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur px-3.5 py-2 rounded-xl border border-stone-800">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span><strong>Giờ mở cửa:</strong> 10:30 – 23:00 (Hàng ngày)</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur px-3.5 py-2 rounded-xl border border-stone-800">
              <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span><strong>Hotline:</strong> 028 3822 8899 • 0909 123 456</span>
            </div>
          </div>

          {/* 4-Step Interactive Progress Stepper */}
          <div className="pt-4 border-t border-stone-800/80 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { num: '01', title: 'Thời Gian & Khách', sub: `${partySize} Khách • ${selectedSlot}` },
              { num: '02', title: 'Sơ Đồ & Chọn Bàn', sub: selectedTable ? `Bàn ${selectedTable.tableCode}` : 'Chưa chọn bàn' },
              { num: '03', title: 'Ghi Chú & Dịp Tiệc', sub: selectedOccasion ? OCCASIONS.find(o => o.id === selectedOccasion)?.label : 'Tùy chọn' },
              { num: '04', title: 'Xác Nhận & VietQR', sub: 'Cọc giữ chỗ 100%' },
            ].map((step, idx) => {
              const stepIndex = idx + 1;
              const isCurrent = activeStep === stepIndex;
              const isPast = activeStep > stepIndex;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(stepIndex)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isCurrent
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                      : isPast
                      ? 'bg-stone-900/80 border-emerald-500/50 text-stone-300'
                      : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950'
                      : isPast
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400'
                  }`}>
                    {isPast ? <Check className="w-4 h-4" /> : step.num}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isCurrent ? 'text-amber-300' : 'text-stone-200'}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate">{step.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Success banner if booking created */}
      <AnimatePresence>
        {bookingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-3xl shadow-xl text-emerald-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-xl font-bold text-emerald-900">
                    Đặt Bàn Thành Công! Mã Chỗ: #{bookingSuccess.bookingId}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    Đã Khóa Chỗ Hệ Thống
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800">
                  Cảm ơn quý khách <strong>{bookingSuccess.customerName}</strong>. Vị trí <strong>{bookingSuccess.tableCode}</strong> vào ngày <strong>{bookingSuccess.date} ({bookingSuccess.timeSlot})</strong> cho <strong>{bookingSuccess.partySize} thực khách</strong> đã được giữ chỗ.
                </p>
              </div>
            </div>
            <button
              onClick={() => setBookingSuccess(null)}
              className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer shadow-md active:scale-95"
            >
              Đặt Thêm Bàn Mới
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN RESERVATION WORKFLOW (2-COLUMN MODERN LUXURY LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (8 COLS): STEPS 1, 2, 3, 4, 5 */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* STEP 1: THỜI GIAN & SỐ LƯỢNG THỰC KHÁCH */}
          <section className="bg-white border-2 border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-all hover:border-amber-400/60">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/30 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  01
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      Thời Gian & Số Lượng Thực Khách
                    </h2>
                    {!showSection1 && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {partySize} Khách • {selectedDate} • {selectedSlot}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    Chọn ngày hẹn, khung giờ vàng dùng bữa và số lượng khách
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSection1(!showSection1)}
                className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer transition-colors shrink-0"
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
                  {/* Party Size Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-600" />
                        <span>Số lượng khách dùng bữa (Tối thiểu 2 khách):</span>
                      </label>
                      <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                        <button
                          type="button"
                          onClick={() => setPartySize((p) => Math.max(2, p - 1))}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs"
                          title="Giảm 1 khách"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-xs text-stone-900 min-w-8 text-center">
                          {partySize} Khách
                        </span>
                        <button
                          type="button"
                          onClick={() => setPartySize((p) => Math.min(20, p + 1))}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs"
                          title="Tăng 1 khách"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Party Size Preset Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { size: 2, label: '2 Khách', icon: '👫', sub: 'Hẹn hò, Đôi bạn' },
                        { size: 4, label: '3 - 4 Khách', icon: '👨‍👩‍👧‍👦', sub: 'Gia đình nhỏ' },
                        { size: 6, label: '5 - 6 Khách', icon: '🥂', sub: 'Nhóm bạn thân' },
                        { size: 8, label: '7 - 8 Khách', icon: '🍷', sub: 'Tiệc liên hoan' },
                        { size: 12, label: '9 - 12+ Khách', icon: '👑', sub: 'Tiệc VIP / Họp mặt' },
                      ].map((item) => {
                        const isSelected = partySize === item.size;
                        return (
                          <button
                            key={item.size}
                            type="button"
                            onClick={() => setPartySize(item.size)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-gradient-to-b from-amber-50 to-amber-100/60 border-amber-500 shadow-sm ring-2 ring-amber-400/40'
                                : 'bg-stone-50/60 border-stone-200 hover:border-amber-400 hover:bg-white'
                            }`}
                          >
                            <span className="text-base sm:text-lg block mb-1">{item.icon}</span>
                            <p className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-stone-800'}`}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-stone-500 mt-0.5">{item.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date Strip & Calendar Picker */}
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>Chọn ngày dùng bữa:</span>
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
                        title="Chọn ngày khác trên lịch"
                      />
                    </div>

                    {/* 7-Day Horizontal Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {upcomingDays.map((d) => {
                        const isSelected = selectedDate === d.iso;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDate(d.iso)}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-600 font-bold shadow-md ring-2 ring-amber-400/40 scale-102'
                                : 'bg-stone-50 border-stone-200 hover:border-amber-400 hover:bg-white text-stone-800'
                            }`}
                          >
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-amber-100' : 'text-stone-500'}`}>
                              {d.dayName}
                            </span>
                            <span className="font-serif text-lg sm:text-xl font-bold mt-0.5">
                              {d.dayNum}
                            </span>
                            <span className={`text-[10px] ${isSelected ? 'text-amber-200' : 'text-stone-400'}`}>
                              Th.{d.month}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shift & Time Slots Selector */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Khung ca & Giờ đón khách:</span>
                      </label>
                      {/* Shift Switcher */}
                      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl border border-stone-200 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShift('LUNCH');
                            setSelectedSlot('12:00');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedShift === 'LUNCH'
                              ? 'bg-white text-amber-900 shadow-xs border border-stone-200'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Ca Trưa (11:00 - 14:00)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShift('DINNER');
                            setSelectedSlot('19:00');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedShift === 'DINNER'
                              ? 'bg-white text-amber-900 shadow-xs border border-stone-200'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Ca Tối (17:30 - 22:30)</span>
                        </button>
                      </div>
                    </div>

                    {/* Time Slot Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {(selectedShift === 'DINNER' ? DINNER_SLOTS : LUNCH_SLOTS).map((slotItem) => {
                        const isPassed = isTimeSlotPassed(slotItem.time, selectedDate);
                        const isSelected = selectedSlot === slotItem.time;
                        return (
                          <button
                            key={slotItem.time}
                            type="button"
                            disabled={isPassed}
                            onClick={() => setSelectedSlot(slotItem.time)}
                            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                              isPassed
                                ? 'bg-stone-100 text-stone-400 border-stone-200 opacity-50 line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold border-amber-600 shadow-md ring-2 ring-amber-400/40 scale-102'
                                : 'bg-white text-stone-800 border-stone-200 hover:border-amber-400 hover:bg-stone-50'
                            }`}
                          >
                            <span className="font-serif text-sm sm:text-base font-bold">
                              {slotItem.time}
                            </span>
                            <span className={`text-[10px] mt-0.5 truncate max-w-full ${isSelected ? 'text-amber-100' : 'text-stone-500'}`}>
                              {isPassed ? 'Đã qua' : slotItem.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 2: SƠ ĐỒ MẶT BẰNG 2D / 3D & CHỌN BÀN THỜI GIAN THỰC */}
          <section className="bg-white border-2 border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-all hover:border-amber-400/60">
            {/* Header with Step number & Floor Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/30 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  02
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      Sơ Đồ Bàn 2D / 3D Trực Quan (Live Floor Map)
                    </h2>
                    {selectedTable ? (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Đã chọn: Bàn {selectedTable.tableCode} ({selectedTable.floorName})</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Click chọn bàn yêu thích trên sơ đồ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    Khám phá không gian 3 tầng, xem vị trí cửa sổ, quầy bar và chọn bàn trực tiếp
                  </p>
                </div>
              </div>

              {/* View Switcher Controls */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setFloorViewMode('floor2d')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    floorViewMode === 'floor2d'
                      ? 'bg-white text-amber-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sơ Đồ 2D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFloorViewMode('floor3d')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    floorViewMode === 'floor3d'
                      ? 'bg-white text-amber-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Move3d className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Không Gian 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFloorViewMode('cards')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    floorViewMode === 'cards'
                      ? 'bg-white text-amber-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tra Cứu Nâng Cao</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowSection2(!showSection2)}
                className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer transition-colors shrink-0 self-end lg:self-auto"
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50 p-2 rounded-2xl border border-stone-200">
              <div className="grid grid-cols-3 gap-2 flex-1">
                {[
                  { floor: 1 as const, label: 'Tầng 1: Sảnh Chính', sub: 'View Nguyễn Huệ', icon: '🏛️' },
                  { floor: 2 as const, label: 'Tầng 2: Phòng VIP', sub: 'Hầm Rượu Bordeaux', icon: '🍷' },
                  { floor: 3 as const, label: 'Tầng 3: Sky Lounge', sub: 'Ban Công Rooftop', icon: '🌆' },
                ].map((f) => {
                  const isCurrent = currentFloor === f.floor;
                  return (
                    <button
                      key={f.floor}
                      type="button"
                      onClick={() => setCurrentFloor(f.floor)}
                      className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border flex items-center gap-2.5 ${
                        isCurrent
                          ? 'bg-white border-amber-400 text-stone-900 shadow-sm ring-1 ring-amber-400/40 font-bold'
                          : 'bg-transparent border-transparent hover:bg-white/60 text-stone-600'
                      }`}
                    >
                      <span className="text-lg">{f.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs truncate">{f.label}</p>
                        <p className="text-[10px] text-stone-400 truncate">{f.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend Pill */}
              <div className="hidden xl:flex items-center gap-3 text-[11px] font-semibold text-stone-600 px-3 py-1.5 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                  <span>Trống</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Giữ 5p</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Đã kín</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Bạn chọn</span>
                </div>
              </div>
            </div>

            {/* Current Floor Highlight Bar */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-50 to-transparent rounded-2xl border border-amber-300/60 flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{floorDescriptions[currentFloor].name}</strong> — {floorDescriptions[currentFloor].view}
                </span>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-bold text-amber-800 font-mono">
                {floorDescriptions[currentFloor].tag}
              </span>
            </div>

            {/* Interactive Canvas or Smart Cards View */}
            <div className="pt-1">
              {floorViewMode === 'floor2d' && (
                <div className="space-y-4">
                  <FloorPlanCanvas
                    floorNumber={currentFloor}
                    tables={tables}
                    selectedTable={activeTableItem}
                    onSelectTable={handleSelectTableFromFloor}
                  />
                  <p className="text-[11px] text-stone-500 text-center italic">
                    💡 <strong>Mẹo:</strong> Click trực tiếp vào bàn xanh để giữ chỗ. Dùng chuột phóng to/thu nhỏ hoặc cuộn để xem góc nhìn thuận tiện nhất.
                  </p>
                </div>
              )}

              {floorViewMode === 'floor3d' && (
                <div className="space-y-4">
                  <SpatialFloor3D
                    floorNumber={currentFloor}
                    tables={tables}
                    selectedTable={activeTableItem}
                    onSelectTable={handleSelectTableFromFloor}
                    viewMode="3d"
                    onToggleViewMode={() => setFloorViewMode('floor2d')}
                  />
                </div>
              )}

              {floorViewMode === 'cards' && (
                <AvailabilitySearchEngine
                  initialDate={selectedDate}
                  initialPartySize={partySize}
                  initialFloor={currentFloor}
                  selectedTableId={selectedTable?.tableId}
                  onSelectTable={(table, params) => {
                    setSelectedTable(table);
                    setSelectedDate(params.date);
                    setPartySize(params.totalGuests);
                    if (table.floorNumber === 1 || table.floorNumber === 2 || table.floorNumber === 3) {
                      setCurrentFloor(table.floorNumber as 1 | 2 | 3);
                    }
                  }}
                />
              )}
            </div>

            {/* SELECTED TABLE SPOTLIGHT CARD */}
            {selectedTable && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-gradient-to-r from-amber-500/15 via-white to-amber-500/10 border-2 border-amber-400 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex flex-col items-center justify-center font-serif font-black shadow-md shrink-0">
                    <span className="text-[10px] tracking-widest font-sans uppercase">BÀN</span>
                    <span className="text-base leading-none">{selectedTable.tableCode}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-lg font-bold text-stone-900">
                        Bàn {selectedTable.tableCode} • {selectedTable.floorName}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        🟢 Đang Được Chọn
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">
                      Sức chứa: <strong>{selectedTable.minCapacity} – {selectedTable.maxCapacity} khách</strong> • Khu vực: <strong>{selectedTable.zoneType}</strong>
                    </p>
                    <p className="text-[11px] text-amber-800">
                      {selectedTable.zoneType === 'WINDOW_VIEW'
                        ? '🪟 Bàn sát cửa kính lớn, ngắm trọn vẹn phố đi bộ Nguyễn Huệ lung linh về đêm'
                        : selectedTable.zoneType === 'VIP'
                        ? '👑 Phòng VIP riêng tư, cách âm cao cấp kèm phục vụ chuyên biệt'
                        : selectedTable.zoneType === 'OUTDOOR'
                        ? '🌿 Ban công Sky Lounge thoáng đãng ngắm toàn cảnh thành phố'
                        : '🍸 Cạnh quầy Bar & Bếp mở, thưởng thức cocktail pha chế trực tiếp'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Tiền cọc giữ bàn:</span>
                    <span className="font-serif text-base font-bold text-amber-700">
                      {new Intl.NumberFormat('vi-VN').format(depositRequired)} đ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Bỏ chọn bàn này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>

          {/* STEP 3: DỊP TIỆC & GHI CHÚ CHU ĐÁO */}
          <section className="bg-white border-2 border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-all hover:border-amber-400/60">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/30 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  03
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      Dịp Dùng Bữa & Ghi Chú Chu Đáo
                    </h2>
                    {selectedOccasion && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {OCCASIONS.find(o => o.id === selectedOccasion)?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">
                    Nhà hàng sẽ chuẩn bị bài trí nến, hoa hoặc hỗ trợ vị trí đặc biệt theo mong muốn
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSection3(!showSection3)}
                className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer transition-colors shrink-0"
              >
                {showSection3 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {showSection3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* Occasion Cards */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                      <span>Dịp dùng bữa của quý khách:</span>
                      <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Gợi ý setup riêng
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {OCCASIONS.map((occ) => {
                        const Icon = occ.icon;
                        const isSelected = selectedOccasion === occ.id;
                        return (
                          <button
                            key={occ.id}
                            type="button"
                            onClick={() => setSelectedOccasion(selectedOccasion === occ.id ? null : occ.id)}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                                : 'bg-stone-50/70 border-stone-200 hover:border-amber-400 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-stone-600 border border-stone-200'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-950' : 'text-stone-800'}`}>
                                  {occ.label}
                                </p>
                                <p className="text-[10px] text-stone-500 truncate">{occ.desc}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-xs font-bold text-amber-600 shrink-0">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Chips & Custom Notes */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                      <span>Yêu cầu nhanh & Ghi chú thêm:</span>
                      <span className="text-[11px] text-stone-400">Click chọn nhanh</span>
                    </label>

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
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-semibold'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-amber-400 hover:bg-white'
                            }`}
                          >
                            <span>{isChecked ? '✓' : '+'}</span>
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <FileText className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                      <textarea
                        rows={3}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Ví dụ: Ưu tiên bàn góc nhìn đẹp, chuẩn bị thêm 1 đĩa bánh sinh nhật nhỏ tặng bạn gái..."
                        className="w-full bg-stone-50/70 border border-stone-300 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 4: THỰC ĐƠN SIGNATURE & RƯỢU VANG (PRE-ORDER) */}
          <section className="bg-white border-2 border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 transition-all hover:border-amber-400/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div className="flex items-start sm:items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/30 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  04
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      Đặt Trước Món Ăn & Rượu Vang Signature
                    </h2>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Tùy chọn • Bếp trưởng chuẩn bị trước
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Bò lên tuổi Dry-Aged & Set Menu được tẩm ướp chuẩn bị trước, phục vụ nóng hổi khi quý khách vừa đến
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {Object.keys(selectedDishes).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllDishes}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa món đã chọn</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSection4(!showSection4)}
                  className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer transition-colors"
                >
                  {showSection4 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showSection4 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5 overflow-hidden"
                >
                  {/* Category Tabs */}
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400/40'
                              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                          }`}>
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
                        const isSelected = qty > 0;
                        const isExpanded = !!expandedComboIds[dish.id];

                        return (
                          <div
                            key={dish.id}
                            className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border-amber-400 shadow-md ring-1 ring-amber-400/30'
                                : 'bg-white border-stone-200 hover:border-amber-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex gap-3.5">
                              {/* Dish Image */}
                              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200">
                                <img
                                  src={dish.image}
                                  alt={dish.name}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                  loading="lazy"
                                />
                                {dish.badge && (
                                  <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shadow-xs">
                                    {dish.badge}
                                  </div>
                                )}
                              </div>

                              {/* Dish Info */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-start justify-between gap-1">
                                  <h4 className="font-serif text-sm font-bold text-stone-900 leading-snug">
                                    {dish.name}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                                  {dish.description}
                                </p>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <span className="font-serif text-sm font-bold text-amber-700">
                                    {new Intl.NumberFormat('vi-VN').format(dish.price)} đ
                                  </span>
                                  {dish.prepTimeMinutes && (
                                    <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" /> {dish.prepTimeMinutes} phút
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Combo courses preview if combo */}
                            {dish.comboItems && dish.comboItems.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-stone-200 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => toggleComboDetails(dish.id)}
                                  className="text-amber-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Ẩn các món trong set' : 'Xem các món trong set menu'}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {isExpanded && (
                                  <ul className="mt-1.5 space-y-0.5 text-stone-600 pl-3 list-disc">
                                    {dish.comboItems.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {/* Stepper Footer */}
                            <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
                              <span className="text-[10px] text-stone-500">
                                {isSelected ? (
                                  <strong className="text-amber-700 font-mono">
                                    Thành tiền: {new Intl.NumberFormat('vi-VN').format(dish.price * qty)} đ
                                  </strong>
                                ) : (
                                  <span>Thêm vào tiệc</span>
                                )}
                              </span>

                              <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                                {qty > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDishQuantityChange(dish.id, -1)}
                                      className="w-6 h-6 rounded-lg bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-bold text-xs text-stone-900 min-w-6 text-center">
                                      {qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDishQuantityChange(dish.id, 1)}
                                      className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold flex items-center justify-center cursor-pointer shadow-xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDishQuantityChange(dish.id, 1)}
                                    className="px-3 py-1 rounded-lg bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-900 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                  >
                                    <Plus className="w-3 h-3 text-amber-600" />
                                    <span>Chọn món</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Summary Cart Pill */}
                  {Object.keys(selectedDishes).length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-500/10 rounded-2xl border border-amber-300 flex items-center justify-between text-xs text-amber-950 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">
                            Đã chọn {Object.values(selectedDishes).reduce((a, b) => a + b, 0)} phần món đặt trước
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Tiền cọc món (100%): <strong className="text-amber-800 font-mono">{new Intl.NumberFormat('vi-VN').format(dishesTotal)} đ</strong> (Chuẩn bị nguyên liệu & nướng trước)
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 bg-white px-3 py-1 rounded-xl border border-amber-300">
                        Bếp Trưởng Lên Lửa Sớm
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* STEP 5: QUY ĐỊNH & CHÍNH SÁCH ĐẶT BÀN */}
          <section className="bg-white border-2 border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-all hover:border-amber-400/60">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/30 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  05
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-xl font-bold text-stone-900">
                      Quy Định & Chính Sách An Tâm Đặt Bàn
                    </h2>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Giữ bàn 30p • Hoàn cọc 100% trước 24h
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Quy chuẩn phục vụ chuẩn Michelin và chính sách hoàn hủy cọc tại Le Prime Bistro
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSection5(!showSection5)}
                className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer transition-colors shrink-0"
              >
                {showSection5 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {showSection5 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-600 overflow-hidden"
                >
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-stone-900 font-bold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h4>Thời Gian Giữ Bàn (30 Phút)</h4>
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-500">
                      Nhà hàng cam kết giữ chỗ đúng <strong>30 phút</strong> so với giờ hẹn. Quý khách vui lòng gọi Hotline nếu đến muộn để bảo lưu bàn đẹp.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-stone-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h4>Chính Sách Hoàn Cọc Linh Hoạt</h4>
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-500">
                      Hủy trước <strong>24 giờ</strong>: Hoàn 100% tiền cọc. Hủy từ <strong>6h – 24h</strong>: Hoàn 50%. Dưới 6h không hoàn cọc do món đã chế biến.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-stone-900 font-bold">
                      <Shirt className="w-4 h-4 text-amber-600" />
                      <h4>Trang Phục (Smart Casual)</h4>
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-500">
                      Khuyến khích phong cách thanh lịch, lịch sự (quần dài, sơ mi, đầm tiệc; hạn chế áo ba lỗ & dép xỏ ngón).
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-stone-900 font-bold">
                      <Wine className="w-4 h-4 text-amber-600" />
                      <h4>Bánh Sinh Nhật & Rượu Ngoài</h4>
                    </div>
                    <p className="text-[11px] leading-relaxed text-stone-500">
                      Miễn phí bảo quản bánh sinh nhật; áp dụng phí mở rượu ngoài (corkage fee) theo biểu giá menu nhà hàng.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* RIGHT COLUMN (4 COLS): LUXURY VIP CONCIERGE RESERVATION PASS */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div className="bg-gradient-to-b from-[#1E1714] to-[#120E0C] text-white border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Ambient Gold Radial Glow */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Ticket Header & Crest */}
            <div className="pb-4 border-b border-amber-900/60 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-amber-400 block">
                  VIP Concierge Pass
                </span>
                <h3 className="font-serif text-2xl font-black text-white mt-0.5">
                  Phiếu Đặt Chỗ
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif font-black text-lg">
                P
              </div>
            </div>

            {/* Perforated Divider Visual Effect */}
            <div className="relative py-1">
              <div className="border-t-2 border-dashed border-stone-700 w-full" />
              <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FAF7F2]" />
              <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FAF7F2]" />
            </div>

            {/* Summary Details Grid */}
            <div className="bg-stone-900/80 rounded-2xl p-4 border border-stone-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ngày hẹn:</span>
                </span>
                <span className="font-bold text-white">{selectedDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Khung giờ:</span>
                </span>
                <span className="font-bold text-amber-300">{effectiveTimeSlot}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Số lượng khách:</span>
                </span>
                <span className="font-bold text-white">{partySize} Khách</span>
              </div>

              {/* Table assignment */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vị trí bàn:</span>
                </span>
                <span className="font-bold text-right">
                  {selectedTable ? (
                    <span className="text-amber-300 font-mono">
                      Bàn {selectedTable.tableCode} ({selectedTable.floorName})
                    </span>
                  ) : (
                    <span className="text-stone-400 italic font-normal">
                      Hệ thống tự động chọn vị trí tối ưu
                    </span>
                  )}
                </span>
              </div>

              {selectedOccasion && (
                <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Dịp tiệc:</span>
                  </span>
                  <span className="font-bold text-amber-200">
                    {OCCASIONS.find(o => o.id === selectedOccasion)?.label}
                  </span>
                </div>
              )}

              {/* Pre-order summary */}
              {Object.keys(selectedDishes).length > 0 && (
                <div className="pt-2 border-t border-stone-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    Món ăn đặt trước:
                  </span>
                  {Object.entries(selectedDishes).map(([id, qty]) => {
                    const dish = SIGNATURE_DISHES.find(d => d.id === id);
                    if (!dish) return null;
                    return (
                      <div key={id} className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-300 truncate pr-2">
                          <strong className="text-amber-400 font-mono">{qty}x</strong> {dish.name}
                        </span>
                        <span className="font-mono text-stone-200 shrink-0">
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-300 block">
                Thông tin người đặt bàn:
              </label>

              <div className="relative">
                <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Họ và tên quý khách *"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 placeholder-stone-500"
                />
              </div>

              <div className="relative">
                <Phone className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại nhận mã QR *"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 placeholder-stone-500"
                />
              </div>

              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email nhận hóa đơn (tùy chọn)"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 placeholder-stone-500"
                />
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 pt-3 border-t border-stone-800 text-xs">
              <div className="flex justify-between items-center text-stone-300">
                <span>Tiền cọc giữ bàn:</span>
                <span className="font-bold text-white font-mono">
                  {new Intl.NumberFormat('vi-VN').format(depositRequired)} đ
                </span>
              </div>

              {dishesTotal > 0 && (
                <div className="flex justify-between items-center text-stone-300">
                  <span>Tiền cọc món ăn (100%):</span>
                  <span className="font-bold text-amber-300 font-mono">
                    {new Intl.NumberFormat('vi-VN').format(dishesTotal)} đ
                  </span>
                </div>
              )}

              {/* Grand Total Box */}
              <div className="p-4 bg-gradient-to-r from-amber-950/80 to-amber-900/60 rounded-2xl border border-amber-500/40 flex justify-between items-center text-xs font-bold pt-3 shadow-md">
                <span className="text-amber-200">Tổng Cọc VietQR:</span>
                <span className="font-serif text-lg font-black text-amber-300">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grandTotal)}
                </span>
              </div>
            </div>

            {/* High Impact Glowing CTA Button */}
            <button
              type="button"
              onClick={handleOpenDepositModal}
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer transition-all active:scale-98 disabled:opacity-60 relative overflow-hidden group"
            >
              {/* Shimmer sweep effect */}
              <div className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out pointer-events-none" />
              <span>{isSubmitting ? 'Đang gửi tới máy chủ...' : 'Xác Nhận Giữ Bàn & Quét Mã VietQR'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Reassurance text */}
            <div className="text-[11px] text-stone-400 text-center space-y-1">
              <p className="flex items-center justify-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hoàn cọc 100% nếu hủy trước 24 giờ</span>
              </p>
              <p className="text-[10px] text-stone-500">Mã đặt chỗ và hướng dẫn sẽ được gửi qua SMS / Zalo.</p>
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
