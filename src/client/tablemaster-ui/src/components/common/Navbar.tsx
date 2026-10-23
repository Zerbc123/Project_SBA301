import { Calendar, LayoutDashboard, Shield, Compass, LogIn, LogOut, Building2, Star, History } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-40 w-full bg-[#FBF8F3]/95 backdrop-blur-md border-b border-[#E8DFD1] transition-all">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo - LE PRIME BISTRO & LOUNGE */}
        <div
          onClick={() => onNavigate('landing')}
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
              Bistro & Lounge • Saigon
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#44403C]">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-all py-1.5 cursor-pointer ${
              currentView === 'landing'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Trang Chủ
          </button>
          <button
            onClick={() => onNavigate('booking')}
            className={`transition-all py-1.5 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'booking'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#C4A480]" />
            <span>Đặt Bàn</span>
          </button>
          <button
            onClick={() => onNavigate('host')}
            className={`transition-all py-1.5 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'host'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Shield className="w-4 h-4 text-[#C4A480]" />
            <span>Thu Ngân (Staff)</span>
          </button>
          <button
            onClick={() => onNavigate('waiter')}
            className={`transition-all py-1.5 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'waiter'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <span className="text-sm">📱</span>
            <span>App Phục Vụ</span>
          </button>
          <button
            onClick={() => onNavigate('restaurant')}
            className={`transition-all py-1.5 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'restaurant'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#C4A480]" />
            <span>Quản Lý Nhà Hàng</span>
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`transition-all py-1.5 flex items-center gap-1.5 cursor-pointer ${
              currentView === 'admin'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C4A480]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#C4A480]" />
            <span>Dashboard</span>
          </button>
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="transition-all py-1.5 flex items-center gap-1.5 cursor-pointer text-[#78716C] hover:text-[#1C1917]"
            >
              <History className="w-4 h-4 text-[#C4A480]" />
              <span>Lịch Sử Đơn & Cọc</span>
            </button>
          )}
        </nav>

        {/* Right CTA Button & Auth */}
        <div className="flex items-center gap-3">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              title="Xem Lịch sử Đơn, Hóa đơn Cọc & Mã Vé QR"
              className="px-3.5 py-2.5 rounded-full border border-[#E8DFD1] bg-white hover:bg-[#FAF7F2] text-[#8C6A43] text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
            >
              <History className="w-4 h-4 text-[#8C6A43]" />
              <span className="hidden sm:inline">Lịch Sử & Cọc</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('booking')}
            className="btn-tan px-5 py-2.5 text-xs font-semibold shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Compass className="w-4 h-4" />
            <span>Đặt Bàn Ngay</span>
          </button>

          {onOpenReview && (
            <button
              onClick={onOpenReview}
              title="Đánh giá chất lượng phục vụ & nhận +50 điểm loyalty"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition"
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Đánh Giá</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-200/90 text-amber-900 text-[9px] font-bold">+50đ</span>
            </button>
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
                    <span className="text-[9px] font-mono text-[#8C6A43] font-semibold leading-none">
                      {currentUser.role.replace('ROLE_', '')}
                    </span>
                    {currentUser.vipTier && (
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
