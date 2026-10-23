import { AnalyticsBiSection } from '../components/analytics/AnalyticsBiSection';
import React, { useState, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  Flame,
  CheckCircle2,
  UtensilsCrossed,
  CalendarCheck,
  Wallet,
  Users,
  CreditCard,
  UserCheck,
  UserX,
  KeyRound,
  Sparkles,
  RefreshCw,
  Shield,
  Phone,
  Award,
} from 'lucide-react';
import type { TableItem, BookingDetails } from '../types';
import { authApi, type AdminUserItem } from '../services/authApi';

interface AdminStudioPageProps {
  tables: TableItem[];
  bookings: BookingDetails[];
  onUpdateTables: (newTables: TableItem[]) => void;
}

export type SidebarTab = 'booking' | 'cashflow' | 'staff' | 'users' | 'menu' | 'analytics';

export const AdminStudioPage: React.FC<AdminStudioPageProps> = ({
  tables,
  bookings,
  onUpdateTables,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('booking');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CONFIRMED' | 'CHECKED_IN' | 'PENDING_DEPOSIT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatrixFloor, setSelectedMatrixFloor] = useState<1 | 2 | 3>(1);

  // User Management State (Auth Module & Seamless Guest Diners)
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSegment, setUserSegment] = useState<'ALL' | 'GUEST' | 'REGISTERED' | 'STAFF'>('ALL');
  const [userSearchText, setUserSearchText] = useState('');
  const [adjustPointsModalUser, setAdjustPointsModalUser] = useState<AdminUserItem | null>(null);
  const [adjustPointsValue, setAdjustPointsValue] = useState<number>(50);
  const [adjustPointsReason, setAdjustPointsReason] = useState<string>('Thưởng điểm tri ân thực khách');
  const [setPasswordModalUser, setSetPasswordModalUser] = useState<AdminUserItem | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState<string>('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const typeParam = userSegment === 'ALL' ? undefined : userSegment;
      const data = await authApi.getAllUsers(undefined, typeParam, userSearchText || undefined);
      setUsersList(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userSegment]);

  const handleToggleStatus = async (user: AdminUserItem) => {
    try {
      const updated = await authApi.toggleUserStatus(user.id);
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleAdjustPointsSubmit = async () => {
    if (!adjustPointsModalUser) return;
    try {
      const updated = await authApi.adjustLoyaltyPoints(
        adjustPointsModalUser.id,
        adjustPointsValue,
        adjustPointsReason
      );
      setUsersList((prev) => prev.map((u) => (u.id === adjustPointsModalUser.id ? updated : u)));
      setAdjustPointsModalUser(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi điều chỉnh điểm');
    }
  };

  const handleSetPasswordSubmit = async () => {
    if (!setPasswordModalUser || !newPasswordValue) return;
    try {
      const updated = await authApi.setPassword(setPasswordModalUser.id, newPasswordValue);
      setUsersList((prev) => prev.map((u) => (u.id === setPasswordModalUser.id ? updated : u)));
      setSetPasswordModalUser(null);
      setNewPasswordValue('');
      alert('Đã cấp mật khẩu tài khoản thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi thiết lập mật khẩu');
    }
  };

  const handleSyncDiners = async () => {
    try {
      setSyncFeedback('Đang đồng bộ thực khách từ danh sách đặt bàn...');
      let syncedCount = 0;
      for (const b of bookings) {
        if (b.customerName && b.phone) {
          await authApi.syncGuestBooking(b.customerName, b.phone, `${b.phone}@guest.tablemaster.vn`);
          syncedCount++;
        }
      }
      setSyncFeedback(`Đã đồng bộ ${syncedCount} thực khách từ hệ thống đặt bàn thành công!`);
      setTimeout(() => setSyncFeedback(null), 4000);
      fetchUsers();
    } catch (err: any) {
      setSyncFeedback('Lỗi đồng bộ: ' + (err.message || 'Thất bại'));
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Status handler for real-time table state updates
  const handleTableStatusChange = (tableId: string, newStatus: TableItem['status'], guestName?: string) => {
    if (onUpdateTables) {
      onUpdateTables(
        tables.map((t) => {
          if (t.id === tableId) {
            return {
              ...t,
              status: newStatus,
              currentGuestName:
                guestName !== undefined
                  ? guestName
                  : newStatus === 'AVAILABLE'
                  ? undefined
                  : t.currentGuestName,
              seatedSince: newStatus === 'SEATED' ? (t.seatedSince || 'Vừa vào bàn') : t.seatedSince,
            };
          }
          return t;
        })
      );
    }
  };

  // Export CSV function
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,BookingID,Customer,Phone,Floor,Table,Deposit,Date,Status\n' +
      bookings
        .map(
          (b) =>
            `${b.bookingId},"${b.customerName}",${b.phone},Tầng ${b.floor},${b.tableCode},${b.depositAmount},${b.date},${b.status}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TableMaster_Reservations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter bookings based on search & status pill
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      b.tableCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    return b.status === filterStatus;
  });

  // Calculate totals
  const totalSecuredDeposits = bookings.reduce((sum, b) => sum + b.depositAmount, 0);
  const totalEstShiftRevenue = 48500000;

  // Staff roster sample data
  const staffList = [
    { id: 'st-1', name: 'Angeleter', role: 'Head Manager', zone: 'Sảnh Nguyễn Huệ (Tầng 1)', status: 'ON_SHIFT', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
    { id: 'st-2', name: 'James Le', role: 'Captain Service', zone: 'VIP Cellar (Tầng 2)', status: 'ON_SHIFT', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' },
    { id: 'st-3', name: 'Sophie Trần', role: 'Hostess Greeter', zone: 'Quầy Reception Sảnh Chính', status: 'ON_SHIFT', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' },
    { id: 'st-4', name: 'Antoine Nguyễn', role: 'Head Sommelier', zone: 'Quầy Bar Mixology', status: 'ON_SHIFT', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
  ];

  // Cash flow log sample data
  const cashflowLogs = [
    { id: 'tx-8829', bookingId: 'BK-8829', customer: 'Nguyễn Trần Bảo Anh', amount: 300000, time: '18:15:20', bank: 'Vietcombank • 998822', status: 'SUCCESS' },
    { id: 'tx-8830', bookingId: 'BK-8830', customer: 'Trần Đăng Khoa', amount: 500000, time: '18:24:45', bank: 'Techcombank • 112233', status: 'SUCCESS' },
    { id: 'tx-8831', bookingId: 'BK-8831', customer: 'Lê Thu Trang (VIP)', amount: 500000, time: '18:40:10', bank: 'MBBank • 887766', status: 'SUCCESS' },
    { id: 'tx-8832', bookingId: 'BK-8832', customer: 'Phạm Hoàng Nam', amount: 200000, time: '19:02:15', bank: 'ACB • 334455', status: 'SUCCESS' },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex bg-[#FAF7F2] overflow-x-hidden">
      {/* 100% FULL-BLEED DOCKED LEFT SIDEBAR (CHAMPAGNE IVORY & COGNAC GOLD) */}
      <aside className="w-64 sm:w-72 shrink-0 bg-[#FBF8F3] text-[#2C221E] min-h-[calc(100vh-80px)] p-6 flex flex-col justify-between border-r border-[#E8DFD1] select-none shadow-xs">
        <div className="space-y-6">
          {/* Sidebar Brand Header */}
          <div className="pb-4 border-b border-[#E8DFD1]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] block mb-1">
              TableMaster Management
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2C221E] tracking-tight">
              Executive Studio Hub
            </h2>
          </div>

          {/* Navigation Menu */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] px-2 block mb-1">
              Phân Hệ Quản Lý
            </span>

            {/* Tab 1: Booking Management */}
            <button
              onClick={() => setActiveTab('booking')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'booking'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4" />
                <span>Quản Lý Booking</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'booking' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                {bookings.length}
              </span>
            </button>

            {/* Tab 2: Cash Flow Management */}
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'cashflow'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4" />
                <span>Dòng Tiền & Cọc VietQR</span>
              </div>
            </button>

            {/* Tab 3: Staff Management */}
            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Nhân Viên & Ca Trực</span>
              </div>
              <span className="text-[10px] bg-[#3D7058] text-white px-2 py-0.5 rounded-full font-bold">
                4 Trực
              </span>
            </button>

            {/* Tab 3.5: User & Diner Management (Auth & Direct Guest Diners) */}
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                <span>Khách Hàng & Users</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'users' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                Auth
              </span>
            </button>

            {/* Tab 4: Combo & Menu Management */}
            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-md font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="w-4 h-4" />
                <span>Thực Đơn & Combo</span>
              </div>
            </button>

            {/* Tab 5: Reports & Analytics */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-md font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" />
                <span>Báo Cáo Doanh Thu Ca</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* FULL-WIDTH MAIN CONTENT AREA */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 space-y-8 overflow-x-hidden">
        {/* Top Command Bar & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EBE5DC]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.2em] bg-[#FAF4EB] px-2.5 py-0.5 rounded-full border border-[#E0D7C9]/60">
                Executive Management Portal
              </span>
              <span className="text-xs font-semibold text-[#3D7058] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3D7058] animate-pulse" />
                <span>Hệ thống trực tuyến thời gian thực</span>
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
              {activeTab === 'booking' && 'Quản Lý Booking & Đặt Bàn'}
              {activeTab === 'cashflow' && 'Quản Lý Dòng Tiền & Cọc VietQR'}
              {activeTab === 'staff' && 'Quản Lý Nhân Viên & Phân Ca Trực'}
              {activeTab === 'users' && 'Quản Lý Người Dùng & Thực Khách Đặt Trực Tiếp'}
              {activeTab === 'menu' && 'Quản Lý Thực Đơn & Hiệu Suất Combo'}
              {activeTab === 'analytics' && 'Báo Cáo Analytics & Doanh Thu Ca'}
            </h1>
          </div>

          {/* Search Box & Export CSV */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64 sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên khách, SĐT, mã đặt bàn..."
                className="w-full bg-white border border-[#EBE5DC] rounded-full pl-9 pr-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C4A480] shadow-2xs"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="btn-tan-outline px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Báo Cáo CSV</span>
            </button>

            {/* Manager Avatar */}
            <div className="flex items-center gap-3 pl-3 border-l border-[#EBE5DC]">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Manager Avatar"
                className="w-9 h-9 rounded-full object-cover border-2 border-[#C4A480]"
              />
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-[#1C1917] block leading-tight">Angeleter</span>
                <span className="text-[10px] text-[#8C6A43] font-semibold">Head Manager</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: QUẢN LÝ BOOKING & ĐẶT BÀN */}
        {activeTab === 'booking' && (
          <div className="space-y-6">
            {/* Top 3 Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#78716C] uppercase">Tổng Đặt Bàn Ca Tối</span>
                <div className="text-2xl font-serif font-bold text-[#1C1917]">{bookings.length} Lượt</div>
                <span className="text-[10px] font-semibold text-[#3D7058]">28/34 Bàn Đã Khóa</span>
              </div>
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#78716C] uppercase">Tiền Cọc Đã Thu</span>
                <div className="text-2xl font-serif font-bold text-[#8C6A43]">
                  {new Intl.NumberFormat('vi-VN').format(totalSecuredDeposits)} đ
                </div>
                <span className="text-[10px] font-semibold text-[#3D7058]">100% Cọc VietQR</span>
              </div>
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-[#78716C] uppercase">Tỷ Lệ Check-in Đúng Giờ</span>
                <div className="text-2xl font-serif font-bold text-[#3D7058]">96.8%</div>
                <span className="text-[10px] text-[#78716C]">Giảm 92% tỷ lệ no-show</span>
              </div>
            </div>

            {/* REAL-TIME FLOOR TABLE STATUS MATRIX (SƠ ĐỒ TRẠNG THÁI BÀN THỜI GIAN THỰC THEO TẦNG) */}
            <div className="bg-white border border-[#E8DFD1] rounded-2xl p-6 shadow-xs space-y-6">
              {/* Header & Floor Switcher */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8DFD1]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] bg-[#FBF8F3] px-2.5 py-0.5 rounded-full border border-[#E8DFD1]">
                      Sơ Đồ Mặt Bằng Thời Gian Thực
                    </span>
                    <span className="text-xs font-semibold text-[#3D7058] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#3D7058] animate-pulse" />
                      <span>Live Syncing</span>
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#2C221E] tracking-tight">
                    Trạng Thái Chi Tiết Bàn Cho Từng Tầng (Realtime Floor Matrix)
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Hiển thị trạng thái realtime: Bàn trống, Khách đã đặt/đã cọc, Khách đang dùng bữa & Bàn chờ dọn dẹp
                  </p>
                </div>

                {/* Floor Selection Tabs */}
                <div className="flex flex-wrap items-center gap-2 bg-[#FBF8F3] p-1.5 rounded-xl border border-[#E8DFD1]">
                  <button
                    onClick={() => setSelectedMatrixFloor(1)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                      selectedMatrixFloor === 1
                        ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                        : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
                    }`}
                  >
                    <span>Tầng 1 (Sảnh Nguyễn Huệ)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      selectedMatrixFloor === 1 ? 'bg-white/20 text-white' : 'bg-[#EFE7DC] text-[#8C6A43]'
                    }`}>
                      {tables.filter(t => t.floor === 1).length} Bàn
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedMatrixFloor(2)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                      selectedMatrixFloor === 2
                        ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                        : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
                    }`}
                  >
                    <span>Tầng 2 (VIP Cellar)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      selectedMatrixFloor === 2 ? 'bg-white/20 text-white' : 'bg-[#EFE7DC] text-[#8C6A43]'
                    }`}>
                      {tables.filter(t => t.floor === 2).length} Bàn
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedMatrixFloor(3)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                      selectedMatrixFloor === 3
                        ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                        : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
                    }`}
                  >
                    <span>Tầng 3 (Sky Terrace)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      selectedMatrixFloor === 3 ? 'bg-white/20 text-white' : 'bg-[#EFE7DC] text-[#8C6A43]'
                    }`}>
                      {tables.filter(t => t.floor === 3).length} Bàn
                    </span>
                  </button>
                </div>
              </div>

              {/* Status Legend & Realtime Counts Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {/* Available */}
                <div className="p-3 rounded-xl bg-[#F4F9F5] border border-[#D1E7DD] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#2D6A4F] font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2D6A4F]" />
                    <span>🟢 Bàn Trống</span>
                  </div>
                  <span className="font-serif font-bold text-base text-[#2D6A4F]">
                    {tables.filter(t => t.floor === selectedMatrixFloor && t.status === 'AVAILABLE').length}
                  </span>
                </div>

                {/* Confirmed / Booked */}
                <div className="p-3 rounded-xl bg-[#FDF8F3] border border-[#F5E5D3] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#8C6A43] font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C4A480]" />
                    <span>🔵 Đã Đặt / Đã Cọc</span>
                  </div>
                  <span className="font-serif font-bold text-base text-[#8C6A43]">
                    {tables.filter(t => t.floor === selectedMatrixFloor && t.status === 'CONFIRMED').length}
                  </span>
                </div>

                {/* Seated / In Use */}
                <div className="p-3 rounded-xl bg-[#F0F4FF] border border-[#D0E1FD] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#1E40AF] font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                    <span>🟣 Đang Dùng Bữa</span>
                  </div>
                  <span className="font-serif font-bold text-base text-[#1E40AF]">
                    {tables.filter(t => t.floor === selectedMatrixFloor && t.status === 'SEATED').length}
                  </span>
                </div>

                {/* Holding */}
                <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#B45309] font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span>🟡 Chờ Cọc</span>
                  </div>
                  <span className="font-serif font-bold text-base text-[#B45309]">
                    {tables.filter(t => t.floor === selectedMatrixFloor && t.status === 'HOLDING').length}
                  </span>
                </div>

                {/* Cleaning */}
                <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#BE123C] font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                    <span>🟠 Cần Dọn Dẹp</span>
                  </div>
                  <span className="font-serif font-bold text-base text-[#BE123C]">
                    {tables.filter(t => t.floor === selectedMatrixFloor && t.status === 'CLEANING').length}
                  </span>
                </div>
              </div>

              {/* Real-Time Table Cards Grid for Selected Floor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables
                  .filter((t) => t.floor === selectedMatrixFloor)
                  .map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${
                        t.status === 'AVAILABLE'
                          ? 'bg-[#FDFBF8] border-[#E8DFD1] hover:border-[#C4A480]'
                          : t.status === 'CONFIRMED'
                          ? 'bg-[#FBF6EE] border-[#D8C6B0] shadow-2xs'
                          : t.status === 'SEATED'
                          ? 'bg-[#F0F5FF] border-[#BFDBFE] shadow-2xs'
                          : t.status === 'HOLDING'
                          ? 'bg-[#FFFDF5] border-[#FDE68A]'
                          : 'bg-[#FFF1F2] border-[#FECDD3]'
                      }`}
                    >
                      {/* Table Header: Code & Capacity */}
                      <div className="flex items-center justify-between border-b border-[#E8DFD1]/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-serif font-bold text-sm text-white ${
                            t.status === 'AVAILABLE'
                              ? 'bg-[#3D7058]'
                              : t.status === 'CONFIRMED'
                              ? 'bg-[#C4A480]'
                              : t.status === 'SEATED'
                              ? 'bg-[#2563EB]'
                              : t.status === 'HOLDING'
                              ? 'bg-[#D97706]'
                              : 'bg-[#E11D48]'
                          }`}>
                            {t.code}
                          </div>
                          <div>
                            <h4 className="font-serif font-bold text-sm text-[#2C221E] leading-tight">
                              Bàn {t.code}
                            </h4>
                            <span className="text-[10px] text-[#78716C] font-semibold block">
                              Tầng {t.floor} • {t.capacity} Ghế ({t.shape === 'rect' ? 'Bàn Chữ Nhật' : 'Bàn Tròn'})
                            </span>
                          </div>
                        </div>

                        {/* Zone tag */}
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-[#E8DFD1] text-[#8C6A43]">
                          {t.zone === 'WINDOW_VIEW' && 'View Phố'}
                          {t.zone === 'VIP' && 'Khu VIP'}
                          {t.zone === 'OUTDOOR' && 'Sân Vườn'}
                          {t.zone === 'BAR_SIDE' && 'Cạnh Bar'}
                          {t.zone === 'STANDARD' && 'Tiêu Chuẩn'}
                        </span>
                      </div>

                      {/* Status Content Body */}
                      <div className="space-y-2 py-1 flex-1">
                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          {t.status === 'AVAILABLE' && (
                            <span className="text-[10px] font-bold bg-[#2D6A4F]/10 text-[#2D6A4F] px-2.5 py-0.5 rounded-full border border-[#2D6A4F]/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                              TRỐNG • SẴN SÀNG
                            </span>
                          )}
                          {t.status === 'CONFIRMED' && (
                            <span className="text-[10px] font-bold bg-[#C4A480]/15 text-[#8C6A43] px-2.5 py-0.5 rounded-full border border-[#C4A480]/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C4A480]" />
                              ĐÃ CỌC VIETQR • ĐÃ ĐẶT
                            </span>
                          )}
                          {t.status === 'SEATED' && (
                            <span className="text-[10px] font-bold bg-[#2563EB]/10 text-[#1E40AF] px-2.5 py-0.5 rounded-full border border-[#2563EB]/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping" />
                              KHÁCH ĐANG DÙNG BỮA
                            </span>
                          )}
                          {t.status === 'HOLDING' && (
                            <span className="text-[10px] font-bold bg-[#F59E0B]/15 text-[#B45309] px-2.5 py-0.5 rounded-full border border-[#F59E0B]/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                              CHỜ XÁC NHẬN CỌC
                            </span>
                          )}
                          {t.status === 'CLEANING' && (
                            <span className="text-[10px] font-bold bg-[#E11D48]/10 text-[#BE123C] px-2.5 py-0.5 rounded-full border border-[#E11D48]/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                              CẦN DỌN DẸP BÀN
                            </span>
                          )}
                        </div>

                        {/* Guest & Reservation Details */}
                        {t.status === 'AVAILABLE' && (
                          <p className="text-[11px] text-[#78716C] leading-snug">
                            Bàn trống hoàn toàn. Sẵn sàng gán khách vãng lai hoặc khóa cọc online.
                          </p>
                        )}

                        {t.status === 'CONFIRMED' && (
                          <div className="space-y-1 text-xs bg-white/80 p-2.5 rounded-xl border border-[#E8DFD1]/70 font-sans">
                            <div className="font-serif font-bold text-[#2C221E] flex items-center gap-1.5">
                              <span>👤 {t.currentGuestName || 'Ông Đặng Hoàng Nam'}</span>
                            </div>
                            <div className="text-[11px] text-[#8C6A43] font-semibold flex items-center justify-between">
                              <span>⏰ Hẹn: {t.bookingTime || '19:00'}</span>
                              <span className="text-[#3D7058]">Đã cọc {new Intl.NumberFormat('vi-VN').format(t.depositPrice)}đ</span>
                            </div>
                            {t.guestPhone && (
                              <div className="text-[10px] text-[#78716C] font-mono">
                                📞 SĐT: {t.guestPhone}
                              </div>
                            )}
                          </div>
                        )}

                        {t.status === 'SEATED' && (
                          <div className="space-y-1 text-xs bg-white/90 p-2.5 rounded-xl border border-[#BFDBFE] font-sans">
                            <div className="font-serif font-bold text-[#1E40AF] flex items-center gap-1.5">
                              <span>👤 {t.currentGuestName || 'Bà Lê Thu Trang (VIP)'}</span>
                            </div>
                            <div className="text-[11px] text-[#2563EB] font-semibold flex items-center justify-between">
                              <span>⏱️ Đã ngồi: {t.seatedSince || '35 phút'}</span>
                              <span>Ca Tối</span>
                            </div>
                            <div className="text-[10px] text-[#3D7058] font-bold">
                              ✓ Đã gọi món Wagyu Combo Set
                            </div>
                          </div>
                        )}

                        {t.status === 'HOLDING' && (
                          <div className="space-y-1 text-xs bg-white/90 p-2.5 rounded-xl border border-[#FDE68A] font-sans">
                            <div className="font-serif font-bold text-[#B45309]">
                              👤 {t.currentGuestName || 'Khách đang quẹt VietQR'}
                            </div>
                            <div className="text-[11px] text-[#78716C]">
                              Khóa giữ bàn tạm thời trong 5:00
                            </div>
                          </div>
                        )}

                        {t.status === 'CLEANING' && (
                          <div className="space-y-1 text-xs bg-white/90 p-2.5 rounded-xl border border-[#FECDD3] font-sans">
                            <div className="font-serif font-bold text-[#BE123C]">
                              🧹 Khách vừa trả bàn
                            </div>
                            <div className="text-[11px] text-[#78716C]">
                              Nhân viên sảnh đang dọn dẹp mặt bàn
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Realtime Control Action Buttons */}
                      <div className="pt-2 border-t border-[#E8DFD1]/60 flex items-center gap-1.5">
                        {t.status === 'AVAILABLE' && (
                          <>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'SEATED', 'Khách Vãng Lai')}
                              className="flex-1 py-1.5 px-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              + Khách Nhận Bàn
                            </button>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'CONFIRMED', 'Khách Đặt Trực Tiếp')}
                              className="py-1.5 px-2.5 bg-[#FAF7F2] hover:bg-[#EFE7DC] text-[#8C6A43] text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-[#E8DFD1]"
                            >
                              Gán Đặt
                            </button>
                          </>
                        )}

                        {t.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'SEATED')}
                              className="flex-1 py-1.5 px-2 bg-gradient-to-r from-[#C4A480] to-[#B3936F] hover:brightness-105 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              ✓ Check-in Vào Bàn
                            </button>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                              className="py-1.5 px-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#78716C] text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-[#E8DFD1]"
                            >
                              Hủy/Trống
                            </button>
                          </>
                        )}

                        {t.status === 'SEATED' && (
                          <>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'CLEANING')}
                              className="flex-1 py-1.5 px-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              💳 Thanh Toán → Dọn Bàn
                            </button>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                              className="py-1.5 px-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#78716C] text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-[#E8DFD1]"
                            >
                              Trả Trống
                            </button>
                          </>
                        )}

                        {t.status === 'HOLDING' && (
                          <>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'CONFIRMED')}
                              className="flex-1 py-1.5 px-2 bg-[#D97706] hover:bg-[#B45309] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Xác Nhận Cọc
                            </button>
                            <button
                              onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                              className="py-1.5 px-2 bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#78716C] text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-[#E8DFD1]"
                            >
                              Hủy Giữ
                            </button>
                          </>
                        )}

                        {t.status === 'CLEANING' && (
                          <button
                            onClick={() => handleTableStatusChange(t.id, 'AVAILABLE')}
                            className="w-full py-1.5 px-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                          >
                            ✨ Đã Dọn Xong → Chuyển Trống
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="bg-white border border-[#EBE5DC] rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE5DC]">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                    Danh Sách Khách Hàng Đặt Bàn
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Đối soát tiền cọc & trạng thái check-in thời gian thực
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-full border border-[#E0D7C9]/60">
                  <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                      filterStatus === 'ALL'
                        ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                        : 'text-[#78716C] hover:text-[#8C6A43]'
                    }`}
                  >
                    Tất Cả ({bookings.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('CONFIRMED')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                      filterStatus === 'CONFIRMED'
                        ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                        : 'text-[#78716C] hover:text-[#8C6A43]'
                    }`}
                  >
                    Đã Cọc
                  </button>
                  <button
                    onClick={() => setFilterStatus('CHECKED_IN')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                      filterStatus === 'CHECKED_IN'
                        ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                        : 'text-[#78716C] hover:text-[#8C6A43]'
                    }`}
                  >
                    Check-in
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EBE5DC] text-[#78716C] uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Mã Vé</th>
                      <th className="py-3 px-3">Khách Hàng</th>
                      <th className="py-3 px-3">Vị Trí Bàn</th>
                      <th className="py-3 px-3">Số Khách</th>
                      <th className="py-3 px-3">Giờ Hẹn</th>
                      <th className="py-3 px-3">Tiền Cọc VietQR</th>
                      <th className="py-3 px-3 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                    {filteredBookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-[#8C6A43]">{b.bookingId}</td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-[#1C1917] block">{b.customerName}</span>
                          <span className="text-[10px] text-[#78716C] font-mono">{b.phone}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-serif font-bold text-[#1C1917] block">{b.tableCode}</span>
                          <span className="text-[10px] text-[#8C6A43] font-medium">Tầng {b.floor}</span>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-[#1C1917]">{b.partySize} Khách</td>
                        <td className="py-3.5 px-3 text-[#78716C]">{b.timeSlot}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#8C6A43]">
                          {new Intl.NumberFormat('vi-VN').format(b.depositAmount)} đ
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                            <span>Đã Cọc VietQR</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ DÒNG TIỀN & CỌC VIETQR */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs font-bold text-[#78716C] uppercase">Tổng Tiền Cọc Đã Thu</span>
                <div className="text-2xl font-serif font-bold text-[#8C6A43]">
                  {new Intl.NumberFormat('vi-VN').format(totalSecuredDeposits)} đ
                </div>
                <span className="text-[10px] font-semibold text-[#3D7058]">100% Giao dịch thành công</span>
              </div>

              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs font-bold text-[#78716C] uppercase">Doanh Thu Dự Kiến Ca</span>
                <div className="text-2xl font-serif font-bold text-[#1C1917]">
                  {new Intl.NumberFormat('vi-VN').format(totalEstShiftRevenue)} đ
                </div>
                <span className="text-[10px] font-semibold text-[#8C6A43]">+18.4% so với ca trước</span>
              </div>

              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-2">
                <span className="text-xs font-bold text-[#78716C] uppercase">Tỷ Lệ Xác Thực VietQR</span>
                <div className="text-2xl font-serif font-bold text-[#3D7058]">98.5%</div>
                <span className="text-[10px] font-semibold text-[#78716C]">Tự động đối soát ngân hàng</span>
              </div>
            </div>

            <div className="bg-white border border-[#EBE5DC] rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
                <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                  Lịch Sử Giao Dịch Cọc VietQR Trực Tiếp
                </h3>
                <CreditCard className="w-4 h-4 text-[#C4A480]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EBE5DC] text-[#78716C] uppercase text-[10px]">
                      <th className="py-2.5 px-3">Thời Gian</th>
                      <th className="py-2.5 px-3">Mã Booking</th>
                      <th className="py-2.5 px-3">Khách Hàng</th>
                      <th className="py-2.5 px-3">Ngân Hàng / Mã Giao Dịch</th>
                      <th className="py-2.5 px-3">Số Tiền</th>
                      <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF7F2]">
                    {cashflowLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-3 px-3 text-[#78716C] font-mono">{log.time}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#8C6A43]">{log.bookingId}</td>
                        <td className="py-3 px-3 font-semibold text-[#1C1917]">{log.customer}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#44403C]">{log.bank}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#1C1917]">
                          {new Intl.NumberFormat('vi-VN').format(log.amount)} đ
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                            Đã Đối Soát
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUẢN LÝ NHÂN VIÊN & CA TRỰC */}
        {activeTab === 'staff' && (
          <div className="bg-white border border-[#EBE5DC] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE5DC]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                  Phân Công Nhân Sự Ca Tối (18:00 - 23:00)
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">Danh sách nhân sự đang trực ca & phụ trách sảnh</p>
              </div>
              <button className="btn-tan px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <ShieldCheck className="w-4 h-4" />
                <span>Điểm Danh Ca</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {staffList.map((st) => (
                <div key={st.id} className="p-4 rounded-xl border border-[#EBE5DC] bg-[#FAF7F2] flex items-center gap-4">
                  <img src={st.avatar} alt={st.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#C4A480]" />
                  <div className="space-y-0.5">
                    <h4 className="font-serif font-bold text-sm text-[#1C1917]">{st.name}</h4>
                    <span className="text-[11px] font-semibold text-[#8C6A43] block">{st.role}</span>
                    <span className="text-[10px] text-[#78716C] block">{st.zone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3.5: QUẢN LÝ NGƯỜI DÙNG & KHÁCH ĐẶT TRỰC TIẾP (AUTH & GUEST DINERS) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Sync Feedback Toast */}
            {syncFeedback && (
              <div className="p-4 rounded-xl bg-[#FAF4EB] border border-[#C4A480] text-[#8C6A43] text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8C6A43]" />
                  <span>{syncFeedback}</span>
                </div>
              </div>
            )}

            {/* Top Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Users */}
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block">
                    Tổng Thực Khách & Users
                  </span>
                  <div className="text-2xl font-serif font-bold text-[#1C1917] mt-1">
                    {usersList.length}
                  </div>
                  <span className="text-[10px] text-[#8C6A43] font-semibold mt-0.5 block">
                    Toàn bộ hồ sơ trong cơ sở dữ liệu
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EBE5DC] flex items-center justify-between p-2 text-[#8C6A43]">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Seamless Guest Diners */}
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider block">
                    Khách Đặt Trực Tiếp (SĐT)
                  </span>
                  <div className="text-2xl font-serif font-bold text-[#B45309] mt-1">
                    {usersList.filter((u) => !u.hasPassword).length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">
                    Chưa đăng ký mật khẩu (Seamless)
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#B45309]">
                  <Phone className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: VIP Registered Members */}
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#15803D] uppercase tracking-wider block">
                    Thành Viên Đã Đăng Ký
                  </span>
                  <div className="text-2xl font-serif font-bold text-[#15803D] mt-1">
                    {usersList.filter((u) => u.hasPassword && u.role === 'ROLE_CUSTOMER').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">
                    Đã có mật khẩu & tích lũy VIP
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#15803D]">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Staff & Internal Roles */}
              <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#4338CA] uppercase tracking-wider block">
                    Nhân Sự & Ban Quản Lý
                  </span>
                  <div className="text-2xl font-serif font-bold text-[#4338CA] mt-1">
                    {usersList.filter((u) => u.role !== 'ROLE_CUSTOMER').length}
                  </div>
                  <span className="text-[10px] text-[#78716C] mt-0.5 block">
                    Admin / Manager / Host / Waiter
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-[#4338CA]">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter segments & Actions Bar */}
            <div className="bg-white border border-[#EBE5DC] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EBE5DC]">
                {/* Segment buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setUserSegment('ALL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      userSegment === 'ALL'
                        ? 'bg-[#2C221E] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] border border-[#EBE5DC]'
                    }`}
                  >
                    Tất Cả ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserSegment('GUEST')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      userSegment === 'GUEST'
                        ? 'bg-[#B45309] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#B45309] hover:bg-[#FEF3C7] border border-[#FDE68A]'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Khách Đặt Trực Tiếp (Seamless)</span>
                  </button>
                  <button
                    onClick={() => setUserSegment('REGISTERED')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      userSegment === 'REGISTERED'
                        ? 'bg-[#15803D] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0]'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Thành Viên Đã Đăng Ký</span>
                  </button>
                  <button
                    onClick={() => setUserSegment('STAFF')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      userSegment === 'STAFF'
                        ? 'bg-[#4338CA] text-white shadow-xs'
                        : 'bg-[#FAF7F2] text-[#4338CA] hover:bg-[#EEF2FF] border border-[#E0E7FF]'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Nhân Viên & Quản Lý</span>
                  </button>
                </div>

                {/* Right controls: Search + Sync Diners + Refresh */}
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      placeholder="Tìm theo tên, SĐT, email..."
                      className="bg-[#FAF7F2] border border-[#EBE5DC] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C4A480] w-52 sm:w-60"
                    />
                  </div>

                  <button
                    onClick={fetchUsers}
                    title="Làm mới danh sách"
                    className="p-2 rounded-xl border border-[#EBE5DC] bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#78716C] cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUsersLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleSyncDiners}
                    className="btn-gold px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                    title="Đồng bộ khách đặt bàn trực tiếp vào cơ sở dữ liệu Auth"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đồng Bộ Khách Đặt Bàn</span>
                  </button>
                </div>
              </div>

              {/* Table of Users */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBE5DC] text-[10px] font-bold text-[#78716C] uppercase tracking-wider bg-[#FAF7F2]/60">
                      <th className="py-3 px-4">Thực Khách / Người Dùng</th>
                      <th className="py-3 px-4">Phân Loại Khách</th>
                      <th className="py-3 px-4">Số Điện Thoại & Email</th>
                      <th className="py-3 px-4 text-center">Hạng VIP & Điểm</th>
                      <th className="py-3 px-4">Khẩu Vị & Sở Thích</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE5DC] text-xs">
                    {isUsersLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#78716C]">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C4A480] mb-2" />
                          <span>Đang tải danh sách người dùng...</span>
                        </td>
                      </tr>
                    ) : usersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#78716C]">
                          <Users className="w-8 h-8 text-[#C4A480] mx-auto mb-2 opacity-60" />
                          <p className="font-semibold text-sm text-[#1C1917]">Chưa có người dùng nào phù hợp</p>
                          <p className="text-xs text-[#78716C] mt-1">
                            Nhấn nút &ldquo;Đồng Bộ Khách Đặt Bàn&rdquo; ở góc trên để nạp khách hàng từ đơn đặt bàn.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      usersList.map((user) => {
                        const isGuest = !user.hasPassword && user.role === 'ROLE_CUSTOMER';
                        const isRegistered = user.hasPassword && user.role === 'ROLE_CUSTOMER';
                        const isStaff = user.role !== 'ROLE_CUSTOMER';
                        const pts = user.loyaltyPoints ?? 0;

                        const tierBadge =
                          pts >= 1000
                            ? { label: 'Kim Cương (Diamond)', bg: 'bg-purple-100 text-purple-700 border-purple-200' }
                            : pts >= 500
                            ? { label: 'Vàng (Gold VIP)', bg: 'bg-amber-100 text-amber-800 border-amber-200' }
                            : pts >= 200
                            ? { label: 'Bạc (Silver)', bg: 'bg-slate-100 text-slate-700 border-slate-200' }
                            : { label: 'Tiêu Chuẩn (Standard)', bg: 'bg-[#FAF7F2] text-[#78716C] border-[#EBE5DC]' };

                        return (
                          <tr key={user.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                            {/* User Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#FAF4EB] border border-[#E0D7C9] flex items-center justify-center font-bold text-xs text-[#8C6A43] shrink-0">
                                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <div className="font-semibold text-[#1C1917]">{user.fullName || 'Khách Vãng Lai'}</div>
                                  <div className="text-[10px] text-[#78716C]">ID: {user.id.slice(0, 8)}...</div>
                                </div>
                              </div>
                            </td>

                            {/* Classification Badge */}
                            <td className="py-3.5 px-4">
                              {isGuest && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                                  <Phone className="w-3 h-3" />
                                  <span>Đặt Nhanh Qua SĐT</span>
                                </span>
                              )}
                              {isRegistered && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                                  <Award className="w-3 h-3" />
                                  <span>Thành Viên Đã Đăng Ký</span>
                                </span>
                              )}
                              {isStaff && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EEF2FF] text-[#4338CA] border border-[#E0E7FF]">
                                  <Shield className="w-3 h-3" />
                                  <span>{user.role.replace('ROLE_', '')}</span>
                                </span>
                              )}
                            </td>

                            {/* Contact Info */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-[#1C1917]">{user.phone || '—'}</div>
                              <div className="text-[10px] text-[#78716C]">{user.email}</div>
                            </td>

                            {/* Loyalty Points & VIP Tier */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="font-serif font-bold text-sm text-[#8C6A43]">
                                {pts.toLocaleString()} <span className="text-[10px]">pts</span>
                              </div>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold border mt-0.5 ${tierBadge.bg}`}
                              >
                                {tierBadge.label}
                              </span>
                            </td>

                            {/* Dietary Preferences */}
                            <td className="py-3.5 px-4 max-w-[180px]">
                              {user.dietaryPreferences ? (
                                <span className="text-[11px] text-[#2C221E] bg-[#FAF4EB] px-2 py-0.5 rounded border border-[#E0D7C9] line-clamp-2">
                                  {user.dietaryPreferences}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#A8A29E] italic">Chưa có ghi chú</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  user.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {user.isActive ? 'Hoạt Động' : 'Đã Khóa'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Button: Adjust points */}
                                <button
                                  onClick={() => {
                                    setAdjustPointsModalUser(user);
                                    setAdjustPointsValue(50);
                                  }}
                                  title="Thưởng / Trừ Điểm Tích Lũy"
                                  className="p-1.5 rounded-lg border border-[#EBE5DC] bg-white hover:bg-[#FAF7F2] text-[#8C6A43] hover:text-[#735431] cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>

                                {/* Button: Set password for guests */}
                                {isGuest && (
                                  <button
                                    onClick={() => {
                                      setSetPasswordModalUser(user);
                                      setNewPasswordValue('');
                                    }}
                                    title="Cấp mật khẩu để nâng cấp thành tài khoản VIP đầy đủ"
                                    className="p-1.5 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] cursor-pointer"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Button: Toggle lock status */}
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                  className={`p-1.5 rounded-lg border cursor-pointer ${
                                    user.isActive
                                      ? 'border-[#EBE5DC] bg-white hover:bg-rose-50 text-[#78716C] hover:text-rose-600'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL 1: Điều chỉnh điểm thưởng / tích lũy */}
            {adjustPointsModalUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#EBE5DC] shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#8C6A43]" />
                      <h3 className="font-serif font-bold text-base text-[#1C1917]">
                        Điều Chỉnh Điểm Tích Lũy
                      </h3>
                    </div>
                    <button
                      onClick={() => setAdjustPointsModalUser(null)}
                      className="text-[#78716C] hover:text-[#1C1917] text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[#78716C] block">Khách hàng:</span>
                      <strong className="text-sm text-[#1C1917]">{adjustPointsModalUser.fullName}</strong>
                      <span className="text-[#78716C] text-[11px] block">
                        Điểm hiện tại: {adjustPointsModalUser.loyaltyPoints} pts
                      </span>
                    </div>

                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">
                        Số điểm thay đổi (+ cộng thêm, - trừ bớt):
                      </label>
                      <input
                        type="number"
                        value={adjustPointsValue}
                        onChange={(e) => setAdjustPointsValue(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#FAF7F2] border border-[#EBE5DC] rounded-xl px-3 py-2 text-sm text-[#1C1917] font-semibold focus:outline-none focus:border-[#C4A480]"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">
                        Lý do điều chỉnh (sẽ ghi vào lịch sử audit):
                      </label>
                      <input
                        type="text"
                        value={adjustPointsReason}
                        onChange={(e) => setAdjustPointsReason(e.target.value)}
                        placeholder="VD: Tri ân khách VIP, hoàn điểm dịch vụ..."
                        className="w-full bg-[#FAF7F2] border border-[#EBE5DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C4A480]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                    <button
                      onClick={() => setAdjustPointsModalUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      onClick={handleAdjustPointsSubmit}
                      className="btn-gold px-4 py-2 text-xs font-semibold cursor-pointer active:scale-95"
                    >
                      Xác Nhận Cập Nhật
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 2: Cấp mật khẩu cho khách đặt trực tiếp */}
            {setPasswordModalUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#EBE5DC] shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-[#8C6A43]" />
                      <h3 className="font-serif font-bold text-base text-[#1C1917]">
                        Cấp Mật Khẩu Tài Khoản VIP
                      </h3>
                    </div>
                    <button
                      onClick={() => setSetPasswordModalUser(null)}
                      className="text-[#78716C] hover:text-[#1C1917] text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <p className="text-[#78716C] leading-relaxed">
                      Khách hàng <strong>{setPasswordModalUser.fullName}</strong> ({setPasswordModalUser.phone})
                      đã đặt bàn trực tiếp. Thiết lập mật khẩu sẽ chuyển đổi khách thành <strong>Thành Viên VIP Chính Thức</strong>,
                      cho phép khách đăng nhập và tra cứu lịch sử đặt bàn.
                    </p>

                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">
                        Mật khẩu khởi tạo:
                      </label>
                      <input
                        type="password"
                        value={newPasswordValue}
                        onChange={(e) => setNewPasswordValue(e.target.value)}
                        placeholder="Nhập tối thiểu 6 ký tự..."
                        className="w-full bg-[#FAF7F2] border border-[#EBE5DC] rounded-xl px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#C4A480]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                    <button
                      onClick={() => setSetPasswordModalUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      onClick={handleSetPasswordSubmit}
                      disabled={!newPasswordValue || newPasswordValue.length < 6}
                      className="btn-gold px-4 py-2 text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      Cấp Mật Khẩu & Kích Hoạt
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: QUẢN LÝ THỰC ĐƠN & COMBO */}
        {activeTab === 'menu' && (
          <div className="bg-white border border-[#EBE5DC] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE5DC]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                  Báo Cáo Hiệu Suất Combo & Thực Đơn Bán Chạy
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">Thống kê doanh số các bộ Combo ca tối</p>
              </div>
              <Flame className="w-5 h-5 text-[#C4A480]" />
            </div>

            <div className="space-y-4">
              {/* Combo 1 */}
              <div className="p-4 rounded-xl border border-[#EBE5DC] bg-[#FAF7F2] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&q=80" alt="Combo 1" className="w-16 h-12 rounded-lg object-cover" />
                  <div>
                    <span className="text-[10px] font-bold text-[#8C6A43] uppercase tracking-wider block">SET 2 KHÁCH</span>
                    <h4 className="font-serif font-bold text-sm text-[#1C1917]">Imperial Wagyu & Grand Cru Feast</h4>
                    <span className="text-xs font-semibold text-[#8C6A43]">3.850.000 đ</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-serif font-bold text-[#1C1917]">12 Set</span>
                  <span className="text-[10px] text-[#78716C] block">Doanh Thu: 46.2M</span>
                </div>
              </div>

              {/* Combo 2 */}
              <div className="p-4 rounded-xl border border-[#EBE5DC] bg-[#FAF7F2] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=150&q=80" alt="Combo 2" className="w-16 h-12 rounded-lg object-cover" />
                  <div>
                    <span className="text-[10px] font-bold text-[#8C6A43] uppercase tracking-wider block">PARTY 4-6 KHÁCH</span>
                    <h4 className="font-serif font-bold text-sm text-[#1C1917]">Royal Tomahawk & Truffle Party</h4>
                    <span className="text-xs font-semibold text-[#8C6A43]">5.900.000 đ</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-serif font-bold text-[#1C1917]">8 Set</span>
                  <span className="text-[10px] text-[#78716C] block">Doanh Thu: 47.2M</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BÁO CÁO DOANH THU CA & ANALYTICS SỐ LIỆU (TÍCH HỢP BIỂU ĐỒ & MOCK DATA READY FOR DB) */}{activeTab === 'analytics' && (
          <AnalyticsBiSection />
        )}
            </main>
    </div>
  );
};
