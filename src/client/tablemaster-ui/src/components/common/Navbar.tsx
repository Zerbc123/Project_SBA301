import React from 'react';
import {
  Calendar,
  LayoutDashboard,
  Shield,
  Compass,
  LogIn,
  LogOut,
  Building2,
  Star,
  History,
  Smartphone,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import type { AuthUser } from '../../types';

export type ActiveView = 'landing' | 'booking' | 'host' | 'waiter' | 'admin' | 'restaurant';

interface NavbarProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  currentUser?: AuthUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onOpenReview?: () => void;
  onOpenHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenProfile,
  onOpenReview,
  onOpenHistory,
}) => {
  const role = currentUser?.role?.toUpperCase() || '';
  const isAdminOrManager = role.includes('ADMIN') || role.includes('MANAGER');
  const isHost = role.includes('HOST');
  const isWaiter = role.includes('WAITER');
  const isStaff = isAdminOrManager || isHost || isWaiter;

  // Determine default staff portal view
  const staffPortalView: ActiveView = isAdminOrManager ? 'admin' : isHost ? 'host' : 'waiter';
  const isViewingGuestArea = currentView === 'landing' || currentView === 'booking';

  const getRoleBadge = () => {
    if (role.includes('ADMIN')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
          ADMIN
        </span>
      );
    }
    if (role.includes('MANAGER')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
          QUẢN LÝ
        </span>
      );
    }
    if (role.includes('HOST')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
          TIẾP TÂN
        </span>
      );
    }
    if (role.includes('WAITER')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
          PHỤC VỤ
        </span>
      );
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FBF8F3]/95 backdrop-blur-md border-b border-[#E8DFD1] transition-all">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo - LE PRIME BISTRO & LOUNGE */}
        <div
          onClick={() => onNavigate(isStaff ? staffPortalView : 'landing')}
          className="flex items-center gap-3.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A480] to-[#8C6A43] text-white flex items-center justify-center font-serif text-xl font-bold shadow-xs group-hover:scale-105 transition-transform border border-[#E8DFD1]">
            P
          </div>
          <div>
            <span className="font-serif text-xl font-bold tracking-wider text-[#1C1917] group-hover:text-[#8C6A43] transition-colors block leading-tight">
              LE PRIME
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#78716C] font-sans font-semibold block">
              {isStaff ? 'Hệ Thống Điều Hành Nội Bộ' : 'Bistro & Lounge • Saigon'}
            </span>
          </div>
        </div>

        {/* Center Nav Links - CLEAN & FILTERED BY ROLE */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4 text-sm font-medium text-[#44403C]">
          {/* STAFF: ADMIN / MANAGER */}
          {isAdminOrManager && (
            <>
              <button
                onClick={() => onNavigate('admin')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#C4A480]" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => onNavigate('restaurant')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'restaurant'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#C4A480]" />
                <span>Quản Lý Nhà Hàng & Bàn</span>
              </button>
              <button
                onClick={() => onNavigate('host')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'host'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Shield className="w-4 h-4 text-[#C4A480]" />
                <span>Tiếp Tân & Bàn Live</span>
              </button>
              <button
                onClick={() => onNavigate('waiter')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'waiter'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#C4A480]" />
                <span>App Phục Vụ</span>
              </button>
            </>
          )}

          {/* STAFF: HOST ONLY */}
          {!isAdminOrManager && isHost && (
            <>
              <button
                onClick={() => onNavigate('host')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'host'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Shield className="w-4 h-4 text-[#C4A480]" />
                <span>Tiếp Tân & Bàn Live</span>
              </button>
              {onOpenHistory && (
                <button
                  onClick={onOpenHistory}
                  className="transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]"
                >
                  <History className="w-4 h-4 text-[#C4A480]" />
                  <span>Tra Cứu Đơn & Cọc</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('waiter')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'waiter'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#C4A480]" />
                <span>App Phục Vụ</span>
              </button>
            </>
          )}

          {/* STAFF: WAITER ONLY */}
          {!isAdminOrManager && !isHost && isWaiter && (
            <>
              <button
                onClick={() => onNavigate('waiter')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'waiter'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#C4A480]" />
                <span>App Phục Vụ (Order & Bàn)</span>
              </button>
              <button
                onClick={() => onNavigate('host')}
                className={`transition-all py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'host'
                    ? 'bg-[#EFE8DD] text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
                }`}
              >
                <Shield className="w-4 h-4 text-[#C4A480]" />
                <span>Danh Sách Bàn</span>
              </button>
            </>
          )}

          {/* GUEST / CUSTOMER NAV (Only shown when not staff) */}
          {!isStaff && (
            <>
              <button
                onClick={() => onNavigate('landing')}
                className={`transition-all py-1.5 px-3 cursor-pointer ${
                  currentView === 'landing'
                    ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Trang Chủ
              </button>
              <button
                onClick={() => onNavigate('booking')}
                className={`transition-all py-1.5 px-3 flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'booking'
                    ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                <Calendar className="w-4 h-4 text-[#C4A480]" />
                <span>Đặt Bàn</span>
              </button>
              {currentUser && onOpenHistory && (
                <button
                  onClick={onOpenHistory}
                  className="transition-all py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-[#78716C] hover:text-[#1C1917]"
                >
                  <History className="w-4 h-4 text-[#C4A480]" />
                  <span>Lịch Sử Đặt Bàn</span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* Right CTA Button & Auth */}
        <div className="flex items-center gap-3">
          {/* STAFF: Switch between Staff Portal and Guest View */}
          {isStaff && (
            <>
              {isViewingGuestArea ? (
                <button
                  onClick={() => onNavigate(staffPortalView)}
                  title="Quay lại không gian làm việc nội bộ"
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Về Không Gian Quản Trị</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('landing')}
                  title="Mở giao diện khách hàng để kiểm tra trải nghiệm đặt bàn"
                  className="px-3.5 py-2 rounded-full border border-[#E8DFD1] bg-white hover:bg-[#FAF7F2] text-[#8C6A43] text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-[#8C6A43]" />
                  <span className="hidden sm:inline">Xem Trang Khách</span>
                </button>
              )}
            </>
          )}

          {/* GUEST / CUSTOMER ACTIONS */}
          {!isStaff && (
            <>
              {onOpenReview && (
                <button
                  onClick={onOpenReview}
                  title="Đánh giá chất lượng phục vụ & nhận +50 điểm loyalty"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Đánh Giá</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-200/90 text-amber-900 text-[9px] font-bold">+50đ</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('booking')}
                className="btn-tan px-5 py-2.5 text-xs font-semibold shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Compass className="w-4 h-4" />
                <span>Đặt Bàn Ngay</span>
              </button>
            </>
          )}

          {/* User Auth Section */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E8DFD1]">
              <div
                onClick={onOpenProfile}
                title="Hồ sơ cá nhân"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F2ECE1] border border-[#E8DFD1] cursor-pointer hover:bg-[#EBE3D3] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#8C6A43] text-white flex items-center justify-center text-xs font-bold font-serif">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-[#1C1917] leading-tight truncate max-w-[120px]">
                    {currentUser.fullName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getRoleBadge() || (
                      <span className="text-[9px] font-mono text-[#8C6A43] font-semibold leading-none">
                        {currentUser.role.replace('ROLE_', '')}
                      </span>
                    )}
                    {currentUser.vipTier && !isStaff && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        currentUser.vipTier === 'DIAMOND' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' :
                        currentUser.vipTier === 'GOLD' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        currentUser.vipTier === 'SILVER' ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        'bg-orange-100 text-orange-800 border border-orange-300'
                      }`}>
                        {currentUser.vipTierName || currentUser.vipTier}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 rounded-full hover:bg-red-50 text-stone-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2.5 rounded-full border border-[#C4A480] bg-white hover:bg-[#FAF7F2] text-[#8C6A43] text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

