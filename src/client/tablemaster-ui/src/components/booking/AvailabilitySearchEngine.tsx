import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Sparkles,
  MapPin,
  AlertTriangle,
  Lock,
  Layers,
  Compass,
  Check,
  Building2,
  RefreshCw,
  Info,
  ShieldAlert,
  ArrowRight,
  Sun,
  Moon,
  Baby,
  UserCheck,
} from 'lucide-react';
import {
  bookingApi,
  type TableAvailabilityDto,
  type AvailabilitySearchResponse,
  type AvailabilitySearchParams,
  SEED_DATA,
} from '../../services/bookingApi';

interface AvailabilitySearchEngineProps {
  initialDate?: string;
  initialSlotId?: string;
  initialPartySize?: number;
  initialFloor?: number;
  onSelectTable?: (table: TableAvailabilityDto, bookingParams: {
    date: string;
    timeSlotId?: string;
    shift: string;
    adults: number;
    children: number;
    totalGuests: number;
    floor: number;
  }) => void;
  selectedTableId?: string | null;
}

export const AvailabilitySearchEngine: React.FC<AvailabilitySearchEngineProps> = ({
  initialDate,
  initialSlotId,
  initialPartySize = 2,
  initialFloor,
  onSelectTable,
  selectedTableId,
}) => {
  // 1. Search Filters State
  const [selectedDate, setSelectedDate] = useState<string>(
    () => initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedShift, setSelectedShift] = useState<'DINNER' | 'LUNCH' | 'ALL'>('DINNER');
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(
    initialSlotId || SEED_DATA.TIME_SLOT_ID
  );
  const [adults, setAdults] = useState<number>(() => Math.max(1, initialPartySize >= 2 ? initialPartySize : 2));
  const [children, setChildren] = useState<number>(0);
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>(initialFloor);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

  // 2. Data State
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<AvailabilitySearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalGuests = useMemo(() => adults + children, [adults, children]);

  // Execute Search
  const fetchAvailability = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: AvailabilitySearchParams = {
        bookingDate: selectedDate,
        timeSlotId: selectedSlotId,
        shift: selectedShift,
        adults,
        children,
        guestCount: totalGuests,
        floor: selectedFloor,
        zoneType: selectedZone !== 'ALL' ? selectedZone : undefined,
        onlyAvailable,
      };

      const res = await bookingApi.searchAvailability(params);
      if (res && res.success && res.data) {
        setSearchResponse(res.data);
      } else {
        setErrorMsg('Không thể nhận kết quả từ hệ thống tra cứu');
      }
    } catch (err: any) {
      console.error('Error fetching availability:', err);
      setErrorMsg(err.message || 'Lỗi tra cứu bàn trống');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on filter changes with debounce
  useEffect(() => {
    fetchAvailability();
  }, [selectedDate, selectedShift, selectedSlotId, adults, children, selectedFloor, selectedZone, onlyAvailable]);

  // Quick date helpers
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getTomorrowISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const getWeekendISO = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const tables = searchResponse?.tables || [];

  return (
    <div className="bg-gradient-to-b from-[#FFFFFF] to-[#FAF7F2] border-2 border-[#E8DFD1] rounded-3xl p-5 sm:p-7 shadow-lg space-y-6">
      {/* Header Badge & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E8DFD1]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.2em] bg-[#FAF4EB] px-3 py-1 rounded-full border border-[#C4A480]/40 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C4A480]" />
              <span>UC-04: Availability Search Engine</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              BR-01 Enforcement Active
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-[#2C221E] tracking-tight">
            Tra Cứu Bàn Trống Theo Ca Giờ & Số Khách
          </h3>
          <p className="text-xs text-[#78716C] leading-relaxed">
            Hệ thống quét trực tiếp PostgreSQL & Redis Cache, kiểm tra ràng buộc sức chứa Min/Max (BR-01) và tự động loại trừ các bàn đã có đơn đặt.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAvailability}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-[#FAF7F2] hover:bg-[#FAF4EB] border border-[#E8DFD1] text-[#8C6A43] hover:text-[#2C221E] text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          title="Làm mới trạng thái bàn trống"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Đang quét...' : 'Cập nhật lại'}</span>
        </button>
      </div>

      {/* SMART FILTERS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        {/* 1. Date Picker (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C4A480]" />
              <span>Ngày Dùng Bữa:</span>
            </span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-white border border-[#E8DFD1] rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#2C221E] focus:outline-none focus:border-[#C4A480] shadow-2xs cursor-pointer"
          />
          {/* Date Shortcuts */}
          <div className="flex gap-1.5 pt-0.5">
            {[
              { label: 'Hôm nay', val: getTodayISO() },
              { label: 'Ngày mai', val: getTomorrowISO() },
              { label: 'Cuối tuần', val: getWeekendISO() },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setSelectedDate(d.val)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer border ${
                  selectedDate === d.val
                    ? 'bg-[#8C6A43] text-white border-[#8C6A43]'
                    : 'bg-[#FAF7F2] text-[#6B5E54] border-[#E8DFD1] hover:bg-[#FAF4EB]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Khung Ca (Trưa / Tối / Giờ Vàng) (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C4A480]" />
              <span>Khung Ca Giờ:</span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedShift('LUNCH');
                setSelectedSlotId(undefined);
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                selectedShift === 'LUNCH'
                  ? 'bg-[#8C6A43] text-white border-[#8C6A43] shadow-xs ring-1 ring-[#8C6A43]/30'
                  : 'bg-white text-[#6B5E54] border-[#E8DFD1] hover:bg-[#FAF4EB]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>☀️ Ca Trưa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedShift('DINNER');
                setSelectedSlotId(SEED_DATA.TIME_SLOT_ID);
              }}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                selectedShift === 'DINNER'
                  ? 'bg-gradient-to-r from-[#8C6A43] to-[#735332] text-white border-[#8C6A43] shadow-xs ring-1 ring-[#8C6A43]/30'
                  : 'bg-white text-[#6B5E54] border-[#E8DFD1] hover:bg-[#FAF4EB]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>🌙 Ca Tối VIP</span>
            </button>
          </div>
          <p className="text-[10px] text-[#78716C] italic">
            {selectedShift === 'LUNCH' ? 'Khung giờ: 11:00 - 13:30' : 'Khung giờ vàng: 18:30 - 20:30'}
          </p>
        </div>

        {/* 3. Số Khách: Người Lớn & Trẻ Em (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#C4A480]" />
              <span>Số Thực Khách:</span>
            </label>
            <span className="text-[11px] font-bold text-[#8C6A43] bg-[#FAF4EB] px-2 py-0.5 rounded-md border border-[#E8DFD1]">
              Tổng: {totalGuests} Khách
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Adults Stepper */}
            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#8C6A43]" />
                <span className="text-[11px] text-[#6B5E54] font-medium">Lớn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                  className="w-5 h-5 rounded-md bg-[#FAF7F2] hover:bg-[#E8DFD1] text-[#2C221E] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs text-[#2C221E] min-w-4 text-center">
                  {adults}
                </span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => prev + 1)}
                  className="w-5 h-5 rounded-md bg-[#FAF7F2] hover:bg-[#E8DFD1] text-[#2C221E] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Children Stepper */}
            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Baby className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] text-[#6B5E54] font-medium">Trẻ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                  className="w-5 h-5 rounded-md bg-[#FAF7F2] hover:bg-[#E8DFD1] text-[#2C221E] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  -
                </button>
                <span className="font-mono font-bold text-xs text-[#2C221E] min-w-4 text-center">
                  {children}
                </span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => prev + 1)}
                  className="w-5 h-5 rounded-md bg-[#FAF7F2] hover:bg-[#E8DFD1] text-[#2C221E] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-[#78716C] italic">Trẻ em tính vào tổng sức chứa (BR-01)</p>
        </div>

        {/* 4. Bộ Lọc Tầng (Floor) (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#C4A480]" />
              <span>Chọn Tầng:</span>
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: undefined, label: 'Tất cả' },
              { id: 1, label: 'Tầng 1' },
              { id: 2, label: 'Tầng 2' },
              { id: 3, label: 'Tầng 3' },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setSelectedFloor(f.id)}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                  selectedFloor === f.id
                    ? 'bg-[#8C6A43] text-white border-[#8C6A43] shadow-xs'
                    : 'bg-white text-[#6B5E54] border-[#E8DFD1] hover:bg-[#FAF4EB]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#78716C] truncate">
            {selectedFloor === 1
              ? 'Tầng 1: Sảnh Chính & Bar'
              : selectedFloor === 2
                ? 'Tầng 2: Phòng VIP Riêng Tư'
                : selectedFloor === 3
                  ? 'Tầng 3: Sky Lounge Ngoài Trời'
                  : 'Toàn bộ 3 tầng không gian'}
          </p>
        </div>
      </div>

      {/* SECONDARY FILTER BAR: ZONE TYPE & ONLY-AVAILABLE TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8DFD1]/80">
        {/* Zone Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-wider mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#C4A480]" />
            <span>Khu vực:</span>
          </span>
          {[
            { id: 'ALL', label: 'Tất cả khu vực' },
            { id: 'WINDOW_VIEW', label: '🪟 View Cửa Sổ' },
            { id: 'VIP', label: '👑 Phòng VIP' },
            { id: 'OUTDOOR', label: '🌿 Ban Công Ngoài Trời' },
            { id: 'BAR_SIDE', label: '🍸 Quầy Bar' },
          ].map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedZone(z.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                selectedZone === z.id
                  ? 'bg-[#2C221E] text-white border-[#2C221E] font-bold shadow-2xs'
                  : 'bg-white text-[#6B5E54] border-[#E8DFD1] hover:bg-[#FAF4EB]'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* Only Available Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#2C221E] font-medium bg-white px-3 py-1.5 rounded-xl border border-[#E8DFD1] hover:border-[#C4A480] transition-colors">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
            className="w-4 h-4 text-[#8C6A43] rounded-sm focus:ring-[#C4A480] cursor-pointer"
          />
          <span>Chỉ hiện bàn trống khả dụng</span>
        </label>
      </div>

      {/* BR-01 BUSINESS RULE CALLOUT BANNER */}
      <div className="p-3.5 bg-gradient-to-r from-amber-50/90 via-[#FAF4EB] to-amber-50/90 rounded-2xl border border-amber-300/80 flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
        <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 leading-relaxed">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-amber-900">Quy tắc nghiệp vụ BR-01 (Capacity Enforcement):</span>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-amber-300 text-amber-800 font-bold">
              Min_Capacity ≤ {totalGuests} Khách ≤ Max_Capacity
            </span>
          </div>
          <p className="text-[11px] text-amber-800/90">
            Khách không được chọn bàn có <code>min_capacity &gt; số khách đi thực tế</code> trong ca cao điểm (ví dụ: Đi 2 người không được chọn phòng VIP 6-12 chỗ để tránh lãng phí diện tích sàn).
          </p>
        </div>
      </div>

      {/* STATS OVERVIEW STRIP */}
      {searchResponse && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">Bàn Trống Sẵn Sàng</p>
              <p className="font-serif text-xl font-bold text-emerald-700">{searchResponse.availableCount}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-800">Đã Kín Chỗ (DB)</p>
              <p className="font-serif text-xl font-bold text-rose-700">{searchResponse.occupiedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              ✕
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-800">Đang Giữ 5p (Redis)</p>
              <p className="font-serif text-xl font-bold text-amber-700">{searchResponse.heldCount}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-stone-100 border border-stone-300 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-stone-700">Vi Phạm BR-01</p>
              <p className="font-serif text-xl font-bold text-stone-700">{searchResponse.capacityMismatchCount}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* ERROR MESSAGE IF ANY */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RESULTS: TABLE AVAILABILITY CARDS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B5E54] flex items-center gap-2">
            <span>Danh Sách Bàn Ăn Khả Dụng ({tables.length} bàn phù hợp bộ lọc):</span>
            {loading && <span className="text-[10px] text-[#8C6A43] animate-pulse">Đang tải...</span>}
          </h4>
          {searchResponse?.recommendedTableCode && (
            <span className="text-[11px] font-bold text-[#8C6A43] bg-[#FAF4EB] px-2.5 py-1 rounded-full border border-[#C4A480] flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#C4A480]" />
              <span>Gợi ý tốt nhất: Bàn {searchResponse.recommendedTableCode}</span>
            </span>
          )}
        </div>

        {tables.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E8DFD1] space-y-3">
            <Building2 className="w-10 h-10 text-[#C4A480] mx-auto opacity-70" />
            <h5 className="font-serif text-base font-bold text-[#2C221E]">
              Không tìm thấy bàn phù hợp với tiêu chí
            </h5>
            <p className="text-xs text-[#78716C] max-w-md mx-auto">
              Tất cả các bàn tại khung ca này có thể đã kín chỗ hoặc không thỏa mãn ràng buộc sức chứa cho {totalGuests} khách. Quý khách vui lòng thử chọn tầng khác hoặc chuyển sang khung ca giờ kế bên.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tables.map((table) => {
              const isSelected = selectedTableId === table.tableId;
              const isRecommended = table.recommended;

              // Color styles according to status
              let cardBg = 'bg-white border-[#E8DFD1]';
              let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
              let badgeLabel = 'Không khả dụng';

              if (table.status === 'AVAILABLE') {
                cardBg = isSelected
                  ? 'bg-gradient-to-br from-emerald-50 to-[#FAF4EB] border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                  : 'bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-md';
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                badgeLabel = '🟢 Trống • Sẵn Sàng';
              } else if (table.status === 'OCCUPIED') {
                cardBg = 'bg-[#FAF7F2]/60 border-rose-200 opacity-75';
                badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                badgeLabel = '🔴 Đã Kín Chỗ';
              } else if (table.status === 'HELD') {
                cardBg = 'bg-amber-50/50 border-amber-300 opacity-80';
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                badgeLabel = '🟡 Đang Giữ Chỗ (5p)';
              } else if (table.status === 'CAPACITY_MISMATCH') {
                cardBg = 'bg-stone-50/70 border-stone-300 opacity-75';
                badgeColor = 'bg-stone-200 text-stone-700 border-stone-300';
                badgeLabel = '⚠️ Vi Phạm BR-01';
              }

              return (
                <div
                  key={table.tableId}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${cardBg}`}
                >
                  {/* Top recommended banner */}
                  {isRecommended && table.isAvailable && (
                    <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-600 to-[#8C6A43] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Tối Ưu Chỗ Ngồi</span>
                    </div>
                  )}

                  {/* Header: Table Code & Floor/Zone */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-serif text-lg font-bold text-[#2C221E]">
                            Bàn {table.tableCode}
                          </h5>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                              Đã chọn ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#78716C] mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#C4A480] shrink-0" />
                          <span>{table.floorName || `Tầng ${table.floorNumber}`}</span>
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    {/* Zone & Capacity Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <span className="bg-[#FAF4EB] text-[#8C6A43] px-2 py-0.5 rounded-md font-semibold border border-[#E8DFD1]">
                        Khu vực: {table.zoneType}
                      </span>
                      <span className="bg-white text-[#2C221E] px-2 py-0.5 rounded-md font-mono font-bold border border-[#E8DFD1] flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#C4A480]" />
                        <span>Sức chứa: {table.minCapacity} - {table.maxCapacity} chỗ</span>
                      </span>
                    </div>

                    {/* Status message details */}
                    <div className="pt-2 border-t border-[#E8DFD1]/60">
                      <p className={`text-[11px] leading-snug ${
                        table.isAvailable
                          ? 'text-emerald-700 font-medium'
                          : table.status === 'CAPACITY_MISMATCH'
                            ? 'text-amber-800'
                            : 'text-[#78716C]'
                      }`}>
                        {table.statusMessage}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3 mt-3 border-t border-[#E8DFD1]/60 flex items-center justify-between">
                    <div className="text-[10px] text-[#78716C]">
                      {table.customDeposit ? (
                        <span>Cọc bàn: <strong className="font-mono text-[#2C221E]">{new Intl.NumberFormat('vi-VN').format(table.customDeposit)} đ</strong></span>
                      ) : (
                        <span>Cọc tiêu chuẩn 200k</span>
                      )}
                    </div>

                    {table.isAvailable ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectTable) {
                            onSelectTable(table, {
                              date: selectedDate,
                              timeSlotId: selectedSlotId,
                              shift: selectedShift,
                              adults,
                              children,
                              totalGuests,
                              floor: table.floorNumber,
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-[#8C6A43] hover:bg-[#735332] text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đang Chọn</span>
                          </>
                        ) : (
                          <>
                            <span>Chọn Bàn Này</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-lg">
                        Không Thể Chọn
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ALTERNATIVE SLOTS SUGGESTION (IF APPLICABLE) */}
      {searchResponse?.alternativeSlots && searchResponse.alternativeSlots.length > 0 && (
        <div className="pt-4 border-t border-[#E8DFD1] space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C6A43] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C4A480]" />
            <span>Tình Trạng Bàn Trống Ở Các Ca Giờ Khác Cùng Ngày:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {searchResponse.alternativeSlots.map((slot) => {
              const isCurrent = slot.timeSlotId === selectedSlotId;
              return (
                <button
                  key={slot.timeSlotId}
                  type="button"
                  onClick={() => {
                    setSelectedSlotId(slot.timeSlotId);
                    setSelectedShift(slot.shift as any);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    isCurrent
                      ? 'bg-[#FAF4EB] border-[#C4A480] ring-1 ring-[#C4A480]'
                      : 'bg-white border-[#E8DFD1] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${slot.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="text-xs font-bold text-[#2C221E]">{slot.slotName}</p>
                    <p className="text-[10px] text-[#78716C]">
                      {slot.availableTablesCount > 0 ? (
                        <span className="text-emerald-700 font-semibold">{slot.availableTablesCount} bàn trống</span>
                      ) : (
                        <span className="text-rose-600">Đã kín bàn</span>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
