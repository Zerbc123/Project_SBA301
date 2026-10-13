import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Flame,
  Crown,
  Award,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Wallet,
  Users,
  ArrowUpRight,
  Send,
} from 'lucide-react';

export type AnalyticsSubTab = 'revenue' | 'heatmap' | 'vip' | 'simulator';

interface TableStatItem {
  tableCode: string;
  zone: string;
  reservations: number;
  cancelCount: number;
  revenue: number;
  heatScore: number;
  heatLevel: 'HOT' | 'WARM' | 'NORMAL' | 'COOL';
  colorHex: string;
}

interface VipCustomerItem {
  id: string;
  fullName: string;
  phone: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  visits: number;
  spent: number;
  avgParty: number;
  zone: string;
  lastVisit: string;
}

export const AnalyticsBiSection: React.FC = () => {
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('revenue');
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '30days'>('today');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // 1. Shift & Revenue KPI State
  const [kpiMetrics, setKpiMetrics] = useState({
    todayRevenue: 124500000,
    depositCollected: 18400000,
    avgSpendPerGuest: 876000,
    guestCount: 142,
    revpash: 385000,
    occupancyRate: 88.2,
    noShowRate: 5.2,
    penaltyIncome: 400000,
  });

  // 2. Table Heatmap State
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [tableStats, setTableStats] = useState<TableStatItem[]>([
    { tableCode: 'VIP-01', zone: 'PRIVATE_VIP', reservations: 32, cancelCount: 0, revenue: 135000000, heatScore: 98.5, heatLevel: 'HOT', colorHex: '#EF4444' },
    { tableCode: 'VIP-02', zone: 'PRIVATE_VIP', reservations: 26, cancelCount: 1, revenue: 105000000, heatScore: 88.0, heatLevel: 'HOT', colorHex: '#EF4444' },
    { tableCode: 'OUT-01', zone: 'OUTDOOR', reservations: 46, cancelCount: 2, revenue: 92000000, heatScore: 92.4, heatLevel: 'HOT', colorHex: '#EF4444' },
    { tableCode: 'OUT-02', zone: 'OUTDOOR', reservations: 40, cancelCount: 1, revenue: 79000000, heatScore: 81.5, heatLevel: 'HOT', colorHex: '#EF4444' },
    { tableCode: 'WIN-01', zone: 'WINDOW_VIEW', reservations: 38, cancelCount: 1, revenue: 68000000, heatScore: 74.0, heatLevel: 'WARM', colorHex: '#F59E0B' },
    { tableCode: 'BAR-01', zone: 'BAR_COUNTER', reservations: 35, cancelCount: 3, revenue: 42000000, heatScore: 58.2, heatLevel: 'WARM', colorHex: '#F59E0B' },
    { tableCode: 'STD-01', zone: 'STANDARD', reservations: 20, cancelCount: 2, revenue: 31000000, heatScore: 42.0, heatLevel: 'NORMAL', colorHex: '#10B981' },
    { tableCode: 'STD-02', zone: 'STANDARD', reservations: 15, cancelCount: 4, revenue: 22000000, heatScore: 24.5, heatLevel: 'COOL', colorHex: '#3B82F6' },
  ]);

  // 3. VIP Customer Insights State
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [vipCustomers, setVipCustomers] = useState<VipCustomerItem[]>([
    { id: '1', fullName: 'Trần Thị Bích Ngọc', phone: '+84912345678', tier: 'PLATINUM', visits: 15, spent: 68000000, avgParty: 5.5, zone: 'PRIVATE_VIP', lastVisit: 'Hôm qua' },
    { id: '2', fullName: 'Nguyễn Văn An', phone: '+84901234567', tier: 'GOLD', visits: 8, spent: 29500000, avgParty: 4.0, zone: 'OUTDOOR', lastVisit: '24/10/2026' },
    { id: '3', fullName: 'Đặng Hoàng Nam', phone: '+84911223344', tier: 'GOLD', visits: 7, spent: 24100000, avgParty: 4.2, zone: 'WINDOW_VIEW', lastVisit: '23/10/2026' },
    { id: '4', fullName: 'Lê Hoàng Cường', phone: '+84987654321', tier: 'SILVER', visits: 5, spent: 12400000, avgParty: 2.8, zone: 'BAR_COUNTER', lastVisit: '21/10/2026' },
    { id: '5', fullName: 'Phạm Thu Dung', phone: '+84933221100', tier: 'BRONZE', visits: 2, spent: 3800000, avgParty: 2.0, zone: 'STANDARD', lastVisit: '18/10/2026' },
  ]);

  // Try fetching live data from Spring Boot Backend (Port 8085)
  const fetchLiveData = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8085/api/v1/analytics/overview');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBackendConnected(true);
          setStatusMessage('Đã kết nối và đồng bộ dữ liệu thời gian thực từ Spring Boot (Port 8085)');

          // Update Heatmap if available
          if (json.data.topHotTables && json.data.topHotTables.length > 0) {
            setTableStats(
              json.data.topHotTables.map((t: any) => ({
                tableCode: t.tableCode,
                zone: t.zoneType,
                reservations: t.totalReservations,
                cancelCount: t.cancelCount,
                revenue: Number(t.totalRevenueGenerated),
                heatScore: t.heatScore,
                heatLevel: t.heatLevel,
                colorHex: t.colorHex,
              }))
            );
          }

          // Update VIP if available
          if (json.data.topVipCustomers && json.data.topVipCustomers.length > 0) {
            setVipCustomers(
              json.data.topVipCustomers.map((v: any) => ({
                id: v.id,
                fullName: v.fullName,
                phone: v.phoneNumber,
                tier: v.loyaltyTier,
                visits: v.totalVisits,
                spent: Number(v.totalSpent),
                avgParty: v.averagePartySize,
                zone: v.favoriteZone,
                lastVisit: v.lastVisitDate || 'Gần đây',
              }))
            );
          }
        }
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  // Simulator Triggers
  const handleSimulate = async (type: 'meal' | 'deposit' | 'noshow') => {
    if (type === 'meal') {
      const foodBill = 3500000;
      setKpiMetrics((prev) => ({
        ...prev,
        todayRevenue: prev.todayRevenue + foodBill,
        guestCount: prev.guestCount + 4,
        revpash: Math.round((prev.todayRevenue + foodBill) / (40 * 8)),
      }));

      // Update OUT-01
      setTableStats((prev) =>
        prev.map((t) =>
          t.tableCode === 'OUT-01'
            ? { ...t, reservations: t.reservations + 1, revenue: t.revenue + foodBill }
            : t
        )
      );

      // Update VIP Nguyễn Văn An
      setVipCustomers((prev) =>
        prev.map((v) =>
          v.fullName.includes('Nguyễn Văn An')
            ? { ...v, visits: v.visits + 1, spent: v.spent + foodBill, tier: 'GOLD' }
            : v
        )
      );

      setStatusMessage('⚡ Đã giả lập: Khách ăn xong thanh toán hóa đơn 3.500.000 đ (Bàn OUT-01, khách Nguyễn Văn An)');

      try {
        await fetch('http://localhost:8085/api/v1/analytics/test-simulator/simulate-booking-completed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: 'sim-' + Date.now(),
            customerName: 'Nguyễn Văn An',
            phoneNumber: '+84901234567',
            tableCode: 'OUT-01',
            zoneType: 'OUTDOOR',
            foodBill: 3500000,
            guestCount: 4,
          }),
        });
      } catch {
        // Backend offline, UI state already updated
      }
    } else if (type === 'deposit') {
      const deposit = 500000;
      setKpiMetrics((prev) => ({
        ...prev,
        depositCollected: prev.depositCollected + deposit,
      }));
      setStatusMessage('⚡ Đã giả lập: Khách cọc tiền thành công qua VietQR (+500.000 đ)');
    } else if (type === 'noshow') {
      const penalty = 200000;
      setKpiMetrics((prev) => {
        const newRev = prev.todayRevenue + penalty;
        return {
          ...prev,
          todayRevenue: newRev,
          penaltyIncome: (prev.penaltyIncome || 400000) + penalty,
          noShowRate: Number((prev.noShowRate + 0.4).toFixed(1)),
          revpash: Math.round(newRev / (40 * 8)),
        };
      });
      setStatusMessage('⚡ Đã giả lập: Khách bùng hẹn (No-Show). Tiền cọc 200.000 đ được phạt sung công quỹ và ĐÃ CỘNG VÀO TỔNG DOANH THU CA!');

      try {
        await fetch('http://localhost:8085/api/v1/analytics/test-simulator/simulate-no-show', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: 'sim-noshow-' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            slotId: 'b1000000-0000-0000-0000-000000000002',
            slotName: 'Ca tối Giờ Vàng (18:30 - 20:30)',
            penaltyAmount: 200000,
          }),
        });
      } catch {
        // Backend offline, UI state already updated
      }
    }
  };

  const filteredTables = selectedZone === 'ALL'
    ? tableStats
    : tableStats.filter((t) => t.zone === selectedZone);

  const filteredVips = selectedTier === 'ALL'
    ? vipCustomers
    : vipCustomers.filter((v) => v.tier === selectedTier);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. TOP HEADER & CONNECTION STATUS BANNER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FBF8F3] via-white to-[#F9F5EE] border border-[#E8DFD1] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#C4A480] to-[#8C6A43] text-white flex items-center justify-center shadow-md shadow-[#C4A480]/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif font-bold text-base text-[#2C221E]">
                Báo Cáo Doanh Thu Ca & Analytics BI Engine
              </h3>
              {backendConnected ? (
                <span className="text-[10px] bg-[#3D7058] text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live Sync (Spring Boot 8085)
                </span>
              ) : (
                <span className="text-[10px] bg-[#C4A480] text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Mock Real-Time Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[#78716C] mt-0.5 font-sans">
              Hệ thống tổng hợp chỉ số RevPASH, Heatmap bàn 2D thời gian thực và xếp hạng khách VIP kết nối với Kafka.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchLiveData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E8DFD1] text-[#2C221E] hover:border-[#C4A480] transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#8C6A43] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Đồng Bộ 8085'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage('')}
            className="text-[10px] uppercase font-bold text-[#2E7D32] hover:underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 2. SUB-TABS NAVIGATION (4 PHÂN HỆ) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8DFD1] pb-3">
        <button
          onClick={() => setSubTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'revenue'
              ? 'bg-[#2C221E] text-white shadow-sm'
              : 'text-[#78716C] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. Doanh Thu Ca & RevPASH</span>
        </button>

        <button
          onClick={() => setSubTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'heatmap'
              ? 'bg-[#2C221E] text-white shadow-sm'
              : 'text-[#78716C] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
          }`}
        >
          <Flame className="w-4 h-4 text-[#EF4444]" />
          <span>2. Bản Đồ Nhiệt Bàn Ăn (2D Heatmap)</span>
        </button>

        <button
          onClick={() => setSubTab('vip')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'vip'
              ? 'bg-[#2C221E] text-white shadow-sm'
              : 'text-[#78716C] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
          }`}
        >
          <Crown className="w-4 h-4 text-[#F59E0B]" />
          <span>3. Khách Hàng VIP & CRM (4 Hạng)</span>
        </button>

        <button
          onClick={() => setSubTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'simulator'
              ? 'bg-[#2C221E] text-white shadow-sm'
              : 'text-[#78716C] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#8C6A43]" />
          <span>4. Mô Phỏng Sự Kiện Kafka</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DOANH THU CA & REVPASH                                  */}
      {/* ============================================================== */}
      {subTab === 'revenue' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E8DFD1] shadow-2xs">
              <button
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframe === 'today'
                    ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                    : 'text-[#78716C] hover:text-[#2C221E]'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setTimeframe('7days')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframe === '7days'
                    ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                    : 'text-[#78716C] hover:text-[#2C221E]'
                }`}
              >
                7 Ngày qua
              </button>
              <button
                onClick={() => setTimeframe('30days')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeframe === '30days'
                    ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                    : 'text-[#78716C] hover:text-[#2C221E]'
                }`}
              >
                30 Ngày qua
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs hover:border-[#C4A480] transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Tổng Doanh Thu Ca</span>
                <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#8C6A43] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#2C221E] mt-2">
                {new Intl.NumberFormat('vi-VN').format(
                  timeframe === 'today' ? kpiMetrics.todayRevenue : timeframe === '7days' ? 842000000 : 3450000000
                )}{' '}
                đ
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#3D7058] mt-2">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+22.8% so với cùng kỳ</span>
              </div>
              <div className="text-[11px] text-[#78716C] mt-2 pt-2 border-t border-[#F3ECE0] flex items-center justify-between">
                <span>Trong đó phạt bùng cọc:</span>
                <span className="font-bold text-[#EF4444]">
                  +{new Intl.NumberFormat('vi-VN').format(kpiMetrics.penaltyIncome)} đ
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs hover:border-[#C4A480] transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Tiền Cọc VietQR Đã Nhận</span>
                <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#8C6A43] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#8C6A43] mt-2">
                {new Intl.NumberFormat('vi-VN').format(
                  timeframe === 'today' ? kpiMetrics.depositCollected : timeframe === '7days' ? 128000000 : 512000000
                )}{' '}
                đ
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#3D7058] mt-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Khóa giữ bàn tự động</span>
              </div>
              <div className="text-[11px] text-[#78716C] mt-2 pt-2 border-t border-[#F3ECE0] flex items-center justify-between">
                <span>Tỷ lệ bùng cọc (No-Show):</span>
                <span className="font-bold text-[#D97706]">{kpiMetrics.noShowRate}%</span>
              </div>
            </div>

            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs hover:border-[#C4A480] transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Chi Tiêu Trung Bình / Khách</span>
                <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#8C6A43] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#2C221E] mt-2">
                {new Intl.NumberFormat('vi-VN').format(kpiMetrics.avgSpendPerGuest)} đ
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#78716C] mt-2">
                <span>{kpiMetrics.guestCount} Lượt khách phục vụ</span>
              </div>
            </div>

            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs hover:border-[#C4A480] transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Chỉ Số Vàng RevPASH</span>
                <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#8C6A43] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#8C6A43] mt-2">
                {new Intl.NumberFormat('vi-VN').format(kpiMetrics.revpash)} đ
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#3D7058] mt-2">
                <Flame className="w-3.5 h-3.5 text-[#C4A480]" />
                <span>Lấp đầy sàn {kpiMetrics.occupancyRate}%</span>
              </div>
            </div>
          </div>

          {/* Timeline Bar Chart */}
          <div className="bg-white border border-[#E8DFD1] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E8DFD1]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43]">
                  Phân Tích Dòng Tiền Giờ Cao Điểm
                </span>
                <h3 className="font-serif text-xl font-bold text-[#2C221E] tracking-tight mt-0.5">
                  Biểu Đồ Doanh Thu & Công Suất Bàn Theo Khung Giờ
                </h3>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-8 pb-2 px-2 border-b border-[#E8DFD1]">
              {[
                { time: '11:00', amount: '6.2M', height: '20%', peak: false },
                { time: '12:00', amount: '14.8M', height: '48%', peak: true },
                { time: '13:00', amount: '11.2M', height: '36%', peak: false },
                { time: '14:00', amount: '3.5M', height: '12%', peak: false },
                { time: '17:00', amount: '7.2M', height: '23%', peak: false },
                { time: '18:00', amount: '21.5M', height: '68%', peak: true },
                { time: '19:00', amount: '31.5M', height: '100%', peak: true },
                { time: '20:00', amount: '19.8M', height: '63%', peak: true },
                { time: '21:00', amount: '4.8M', height: '15%', peak: false },
                { time: '22:00', amount: '2.8M', height: '9%', peak: false },
                { time: '23:00', amount: '1.2M', height: '4%', peak: false },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#2C221E] text-white text-[10px] font-bold px-2 py-1 rounded-md mb-2 shadow-md pointer-events-none whitespace-nowrap">
                    {bar.amount} ({bar.time})
                  </div>
                  <div
                    style={{ height: bar.height }}
                    className={`w-full max-w-[48px] rounded-t-lg transition-all duration-500 group-hover:brightness-110 ${
                      bar.peak
                        ? 'bg-gradient-to-t from-[#B3936F] via-[#C4A480] to-[#D8B994] shadow-xs'
                        : 'bg-[#EFE7DC]'
                    }`}
                  />
                  <span className="text-[11px] font-semibold text-[#78716C] mt-2 group-hover:text-[#2C221E]">
                    {bar.time}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-[#78716C] pt-1">
              <span>* Đỉnh cao điểm đặt bàn ăn tối bùng nổ từ 18:00 đến 20:00 (đạt 100% sảnh).</span>
              <span className="font-semibold text-[#8C6A43]">Peak Revenue: 31.5M/Giờ</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BẢN ĐỒ NHIỆT BÀN ĂN (2D HEATMAP & XẾP HẠNG BÀN HOT)       */}
      {/* ============================================================== */}
      {subTab === 'heatmap' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-[#E8DFD1] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43]">
                Spatial Popularity Intelligence
              </span>
              <h3 className="font-serif text-xl font-bold text-[#2C221E] mt-0.5">
                Bản Đồ Nhiệt Bàn Ăn 2D & Tần Suất Đặt Chỗ
              </h3>
              <p className="text-xs text-[#78716C] mt-1 font-sans">
                Đo lường mức độ đắt khách theo từng tọa độ bàn ăn giúp tối ưu giá cọc và quy hoạch lại các góc bàn ít khách.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8DFD1] text-xs font-semibold">
              <span className="text-[#78716C] text-[11px] font-bold uppercase">Thang nhiệt:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="text-[#2C221E]">HOT (≥75%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="text-[#2C221E]">WARM (50-74%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="text-[#2C221E]">NORMAL (25-49%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                <span className="text-[#2C221E]">COOL (&lt;25%)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['ALL', 'PRIVATE_VIP', 'OUTDOOR', 'WINDOW_VIEW', 'BAR_COUNTER', 'STANDARD'].map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedZone === zone
                    ? 'bg-[#8C6A43] text-white shadow-xs'
                    : 'bg-white border border-[#E8DFD1] text-[#78716C] hover:border-[#8C6A43]'
                }`}
              >
                {zone === 'ALL' && 'Tất Cả Khu Vực'}
                {zone === 'PRIVATE_VIP' && 'Phòng VIP Độc Quyền'}
                {zone === 'OUTDOOR' && 'Sân Vườn (Outdoor)'}
                {zone === 'WINDOW_VIEW' && 'View Cửa Sổ (Window)'}
                {zone === 'BAR_COUNTER' && 'Quầy Bar'}
                {zone === 'STANDARD' && 'Khu Tiêu Chuẩn'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTables.map((tbl) => (
              <div
                key={tbl.tableCode}
                className="bg-white border rounded-2xl p-5 shadow-xs transition-all hover:shadow-md relative overflow-hidden group"
                style={{ borderColor: tbl.colorHex + '40' }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: tbl.colorHex }}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xl font-serif font-black text-[#2C221E] group-hover:text-[#8C6A43] transition-colors">
                      {tbl.tableCode}
                    </span>
                    <span className="block text-[10px] font-semibold text-[#78716C] uppercase tracking-wider mt-0.5">
                      {tbl.zone}
                    </span>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs flex items-center gap-1"
                    style={{ backgroundColor: tbl.colorHex }}
                  >
                    {tbl.heatLevel === 'HOT' && <Flame className="w-3 h-3" />}
                    <span>{tbl.heatLevel}</span>
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-[#78716C]">
                    <span>Heat Score</span>
                    <span className="font-bold text-[#2C221E]">{tbl.heatScore}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#FAF7F2] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${tbl.heatScore}%`, backgroundColor: tbl.colorHex }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F5EFE6] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#78716C] block">Lượt đặt thành công</span>
                    <span className="font-bold text-[#2C221E]">{tbl.reservations} lượt</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#78716C] block">Tổng doanh thu</span>
                    <span className="font-bold font-serif text-[#8C6A43]">
                      {(tbl.revenue / 1000000).toFixed(1)}M đ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KHÁCH HÀNG VIP & PHÂN HẠNG THÀNH VIÊN (CRM) */}
      {subTab === 'vip' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-300">Hạng VVIP</span>
                <Crown className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="text-2xl font-serif font-black mt-2 text-cyan-200">PLATINUM</div>
              <span className="text-[10px] text-slate-400 mt-1 block">Chi tiêu &gt; 20M hoặc &gt; 10 lần ghé</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D97706] to-[#B45309] text-white shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-100">Hạng VIP</span>
                <Award className="w-4 h-4 text-amber-200" />
              </div>
              <div className="text-2xl font-serif font-black mt-2 text-amber-50">GOLD</div>
              <span className="text-[10px] text-amber-200 mt-1 block">Chi tiêu 10M - 20M (6-10 lần)</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#64748B] to-[#475569] text-white shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-200">Thân Thiết</span>
                <Award className="w-4 h-4 text-slate-200" />
              </div>
              <div className="text-2xl font-serif font-black mt-2 text-white">SILVER</div>
              <span className="text-[10px] text-slate-300 mt-1 block">Chi tiêu 5M - 10M (3-5 lần)</span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#B45309]/80 to-[#78350F] text-white shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-200">Thành Viên Mới</span>
                <Users className="w-4 h-4 text-amber-200" />
              </div>
              <div className="text-2xl font-serif font-black mt-2 text-amber-100">BRONZE</div>
              <span className="text-[10px] text-amber-200 mt-1 block">Khách mới ghé (1-2 lần)</span>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {['ALL', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedTier === tier
                      ? 'bg-[#8C6A43] text-white shadow-xs'
                      : 'bg-white border border-[#E8DFD1] text-[#78716C] hover:border-[#8C6A43]'
                  }`}
                >
                  {tier === 'ALL' ? 'Tất Cả Thành Viên' : tier}
                </button>
              ))}
            </div>

            <span className="text-xs text-[#78716C] font-semibold">
              Hiển thị {filteredVips.length} hồ sơ khách hàng
            </span>
          </div>

          <div className="bg-white border border-[#E8DFD1] rounded-2xl p-6 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DFD1] text-[#78716C] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Khách Hàng VIP</th>
                  <th className="py-3 px-3">Số Điện Thoại</th>
                  <th className="py-3 px-3 text-center">Hạng Thành Viên</th>
                  <th className="py-3 px-3 text-center">Số Lần Ghé</th>
                  <th className="py-3 px-3">Tổng Chi Tiêu</th>
                  <th className="py-3 px-3 text-center">Quy Mô Bàn TB</th>
                  <th className="py-3 px-3">Khu Vực Thích Nhất</th>
                  <th className="py-3 px-3 text-right">Lần Ghé Gần Nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF7F2]">
                {filteredVips.map((vip) => (
                  <tr key={vip.id} className="hover:bg-[#FBF8F3] transition-colors">
                    <td className="py-3.5 px-3 font-serif font-bold text-[#2C221E] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#8C6A43] flex items-center justify-center font-sans font-bold text-xs border border-[#E8DFD1]">
                        {vip.fullName.charAt(0)}
                      </div>
                      <span>{vip.fullName}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#78716C]">{vip.phone}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          vip.tier === 'PLATINUM'
                            ? 'bg-slate-900 text-cyan-300'
                            : vip.tier === 'GOLD'
                            ? 'bg-amber-100 text-amber-800'
                            : vip.tier === 'SILVER'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {vip.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-[#2C221E]">{vip.visits} lần</td>
                    <td className="py-3.5 px-3 font-serif font-bold text-[#8C6A43]">
                      {new Intl.NumberFormat('vi-VN').format(vip.spent)} đ
                    </td>
                    <td className="py-3.5 px-3 text-center text-[#78716C] font-semibold">{vip.avgParty} khách</td>
                    <td className="py-3.5 px-3">
                      <span className="text-[11px] font-semibold text-[#3D7058] bg-[#3D7058]/10 px-2 py-0.5 rounded-md">
                        {vip.zone}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-medium text-[#78716C]">{vip.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MÔ PHỎNG SỰ KIỆN KAFKA */}
      {subTab === 'simulator' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-[#E8DFD1] shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43]">
              Kafka Event-Driven Simulator
            </span>
            <h3 className="font-serif text-xl font-bold text-[#2C221E] mt-0.5">
              Kiểm Thử Tự Động Đồng Bộ Dữ Liệu Ngầm
            </h3>
            <p className="text-xs text-[#78716C] mt-1 font-sans">
              Bấm các nút dưới đây để giả lập việc các Microservice khác (Booking, Payment) gửi Event qua Kafka và quan sát số liệu trên Dashboard tự động cập nhật ngay lập tức.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C221E]">
                    <Send className="w-4 h-4 text-[#8C6A43]" />
                    <span>BookingCompletedEvent</span>
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-1">
                    Khách ăn xong thanh toán bill 3.500.000 đ tại bàn OUT-01. Hệ thống tự cộng doanh thu, tính lại RevPASH và thăng hạng khách VIP.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate('meal')}
                  className="w-full py-2 px-3 rounded-lg bg-[#8C6A43] text-white text-xs font-bold hover:bg-[#735534] transition-colors cursor-pointer shadow-2xs"
                >
                  Bắn Event: Khách Trả Bill 3.5M
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C221E]">
                    <Send className="w-4 h-4 text-[#3D7058]" />
                    <span>DepositPaidSuccessEvent</span>
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-1">
                    Webhook ngân hàng báo khách chuyển cọc 500.000 đ qua VietQR. Tự động tăng quỹ tiền cọc giữ bàn của ca.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate('deposit')}
                  className="w-full py-2 px-3 rounded-lg bg-[#3D7058] text-white text-xs font-bold hover:bg-[#2D5341] transition-colors cursor-pointer shadow-2xs"
                >
                  Bắn Event: Cọc VietQR +500K
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C221E]">
                    <Send className="w-4 h-4 text-[#EF4444]" />
                    <span>NoShowReportedEvent</span>
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-1">
                    Khách quá hẹn 15 phút không đến. Bàn tự giải phóng, tiền cọc 200.000 đ được phạt sung công quỹ và cộng trực tiếp vào Tổng Doanh Thu Ca.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate('noshow')}
                  className="w-full py-2 px-3 rounded-lg bg-[#EF4444] text-white text-xs font-bold hover:bg-[#DC2626] transition-colors cursor-pointer shadow-2xs"
                >
                  Bắn Event: Khách Bùng Hẹn (No-Show)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
