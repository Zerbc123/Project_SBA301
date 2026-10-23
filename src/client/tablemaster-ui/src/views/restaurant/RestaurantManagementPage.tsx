import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  Layers,
  UtensilsCrossed,
  Calendar,
  Grid,
  Edit,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  CreditCard,
  Coffee,
} from 'lucide-react';
import {
  restaurantApi,
  type RestaurantProfile,
  type TimeSlot,
  type FloorPlan,
  type Table,
  type MenuCategory,
  type MenuItem,
  type BlackoutDate,
} from '../../services/restaurantApi';
import { FloorPlanEditor } from './FloorPlanEditor';

export type RestaurantTab =
  | 'overview'
  | 'floor-plans'
  | 'floor-editor'
  | 'tables'
  | 'time-slots'
  | 'menu'
  | 'special-dates';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export const RestaurantManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RestaurantTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  // Data states
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);

  // Selected floor for editor
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');

  // Search & Filters
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [filterFloorId, setFilterFloorId] = useState<string>('ALL');
  const [filterMenuCatId, setFilterMenuCatId] = useState<string>('ALL');

  // Modals
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [floorForm, setFloorForm] = useState({ id: '', floorNumber: 1, name: '', widthPx: 1600, heightPx: 900, gridSize: 20 });

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({ id: '', slotName: '', startTime: '11:00:00', endTime: '13:00:00', maxCapacity: 40, isActive: true });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', name: '', displayOrder: 1, isActive: true });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    id: '',
    categoryId: '',
    name: '',
    description: '',
    price: 150000,
    imageUrl: '',
    isPreorderAvailable: true,
    isActive: true,
  });

  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({
    id: '',
    eventDate: new Date().toISOString().slice(0, 10),
    eventName: '',
    isClosed: false,
    customDepositAmount: 300000,
    requireSpecialMenu: false,
    note: '',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

  // Load all master data from backend
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [profData, slotsData, floorsData, tablesData, catsData, itemsData, bDatesData] =
        await Promise.all([
          restaurantApi.getProfile().catch(() => null),
          restaurantApi.getTimeSlots(false).catch(() => []),
          restaurantApi.getFloorPlans(false, true).catch(() => []),
          restaurantApi.getTables(undefined, false).catch(() => []),
          restaurantApi.getMenuCategories(false, true).catch(() => []),
          restaurantApi.getMenuItems(undefined, false, false).catch(() => []),
          restaurantApi.getBlackoutDates().catch(() => []),
        ]);

      if (profData) setProfile(profData);
      setTimeSlots(slotsData);
      setFloorPlans(floorsData);
      setTables(tablesData);
      setCategories(catsData);
      setMenuItems(itemsData);
      setBlackoutDates(bDatesData);

      if (floorsData.length > 0 && !selectedFloorId) {
        setSelectedFloorId(floorsData[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải dữ liệu từ máy chủ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Update Profile Form Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const updated = await restaurantApi.updateProfile(profile);
      setProfile(updated);
      showToast('Cập nhật hồ sơ nhà hàng thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật hồ sơ', 'error');
    }
  };

  // Floor Plan Form Submit
  const handleSaveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (floorForm.id) {
        await restaurantApi.updateFloorPlan(floorForm.id, floorForm);
        showToast('Cập nhật thông tin sơ đồ tầng thành công!', 'success');
      } else {
        await restaurantApi.createFloorPlan(floorForm);
        showToast('Thêm sơ đồ tầng mới thành công!', 'success');
      }
      setIsFloorModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu sơ đồ tầng', 'error');
    }
  };

  const handleDeleteFloor = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sơ đồ tầng này? Tất cả các bàn thuộc tầng cũng sẽ bị xóa.')) return;
    try {
      await restaurantApi.deleteFloorPlan(id);
      showToast('Đã xóa sơ đồ tầng thành công', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa tầng', 'error');
    }
  };

  // Time Slot Form Submit
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slotForm.startTime >= slotForm.endTime) {
      showToast('Giờ bắt đầu phải nhỏ hơn giờ kết thúc!', 'error');
      return;
    }
    try {
      if (slotForm.id) {
        await restaurantApi.updateTimeSlot(slotForm.id, slotForm);
        showToast('Cập nhật ca trực thành công!', 'success');
      } else {
        await restaurantApi.createTimeSlot(slotForm);
        showToast('Tạo ca trực mới thành công!', 'success');
      }
      setIsSlotModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu ca trực', 'error');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khung giờ này?')) return;
    try {
      await restaurantApi.deleteTimeSlot(id);
      showToast('Đã xóa khung giờ', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa ca trực', 'error');
    }
  };

  const handleToggleSlot = async (id: string) => {
    try {
      await restaurantApi.toggleTimeSlot(id);
      showToast('Đổi trạng thái ca trực thành công', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi đổi trạng thái', 'error');
    }
  };

  // Category Submit
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await restaurantApi.updateMenuCategory(catForm.id, catForm);
        showToast('Cập nhật danh mục thành công!', 'success');
      } else {
        await restaurantApi.createMenuCategory(catForm);
        showToast('Thêm danh mục mới thành công!', 'success');
      }
      setIsCategoryModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu danh mục', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      await restaurantApi.deleteMenuCategory(id);
      showToast('Đã xóa danh mục món', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa danh mục', 'error');
    }
  };

  // Menu Item Submit
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.categoryId) {
      showToast('Vui lòng chọn danh mục cho món ăn!', 'error');
      return;
    }
    try {
      if (itemForm.id) {
        await restaurantApi.updateMenuItem(itemForm.id, itemForm);
        showToast('Cập nhật món ăn thành công!', 'success');
      } else {
        await restaurantApi.createMenuItem(itemForm);
        showToast('Thêm món ăn mới thành công!', 'success');
      }
      setIsItemModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu món ăn', 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa món ăn này?')) return;
    try {
      await restaurantApi.deleteMenuItem(id);
      showToast('Đã xóa món ăn', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa món', 'error');
    }
  };

  // Blackout Date Submit
  const handleSaveBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (blackoutForm.id) {
        await restaurantApi.updateBlackoutDate(blackoutForm.id, blackoutForm);
        showToast('Cập nhật ngày đặc biệt thành công!', 'success');
      } else {
        await restaurantApi.createBlackoutDate(blackoutForm);
        showToast('Thêm ngày lễ/đặc biệt thành công!', 'success');
      }
      setIsBlackoutModalOpen(false);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu ngày đặc biệt', 'error');
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ngày lễ này?')) return;
    try {
      await restaurantApi.deleteBlackoutDate(id);
      showToast('Đã xóa ngày lễ', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa ngày lễ', 'error');
    }
  };

  // Filtered tables for Tables Tab
  const filteredTables = tables.filter((t) => {
    const matchesSearch = t.tableCode.toLowerCase().includes(searchTableQuery.toLowerCase());
    const matchesFloor = filterFloorId === 'ALL' || t.floorPlanId === filterFloorId;
    return matchesSearch && matchesFloor;
  });

  // Filtered items for Menu Tab
  const filteredMenuItems = menuItems.filter((i) => {
    return filterMenuCatId === 'ALL' || i.categoryId === filterMenuCatId;
  });

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex bg-[#FAF7F2] overflow-x-hidden selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-[#1C1917] text-white border-[#C4A480]/60'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#C4A480]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* DOCKED EXECUTIVE SIDEBAR */}
      <aside className="w-64 sm:w-72 shrink-0 bg-[#FBF8F3] text-[#2C221E] min-h-[calc(100vh-80px)] p-6 flex flex-col justify-between border-r border-[#E8DFD1] select-none shadow-xs">
        <div className="space-y-6">
          <div className="pb-4 border-b border-[#E8DFD1]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] block mb-1">
              TableMaster Core Engine
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2C221E] tracking-tight">
              Restaurant & Floor Studio
            </h2>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] px-2 block mb-1">
              Phân Hệ Nghiệp Vụ
            </span>

            {/* Tab 1: Overview & Profile */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4" />
                <span>Hồ Sơ Nhà Hàng</span>
              </div>
            </button>

            {/* Tab 2: Floor Plans */}
            <button
              onClick={() => setActiveTab('floor-plans')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'floor-plans'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Sơ Đồ Mặt Bằng</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'floor-plans' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                {floorPlans.length}
              </span>
            </button>

            {/* Tab 3: Interactive Floor Editor */}
            <button
              onClick={() => setActiveTab('floor-editor')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'floor-editor'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Grid className="w-4 h-4" />
                <span>Trình Vẽ Sơ Đồ 2D</span>
              </div>
              <span className="text-[10px] bg-[#3D7058] text-white px-2 py-0.5 rounded-full font-bold">
                Kéo Thả
              </span>
            </button>

            {/* Tab 4: Table Inventory */}
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Coffee className="w-4 h-4" />
                <span>Quản Lý Danh Sách Bàn</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'tables' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                {tables.length}
              </span>
            </button>

            {/* Tab 5: Time Slots */}
            <button
              onClick={() => setActiveTab('time-slots')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'time-slots'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>Khung Giờ & Ca Trực</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'time-slots' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                {timeSlots.length}
              </span>
            </button>

            {/* Tab 6: Menu Management */}
            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="w-4 h-4" />
                <span>Thực Đơn & Đặt Trước</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'menu' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                {menuItems.length}
              </span>
            </button>

            {/* Tab 7: Blackout Dates */}
            <button
              onClick={() => setActiveTab('special-dates')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'special-dates'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-sm font-bold'
                  : 'text-[#6B5E54] hover:bg-[#F3ECE0] hover:text-[#2C221E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                <span>Ngày Lễ & Blackout Dates</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'special-dates' ? 'bg-white text-[#8C6A43]' : 'bg-[#EFE7DC] text-[#78716C]'
              }`}>
                {blackoutDates.length}
              </span>
            </button>
          </div>
        </div>

        {/* Sync Status Footer */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#EBE5DC] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-[#78716C]">Trạng Thái API:</span>
            <span className="text-[#3D7058] flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#3D7058] animate-pulse" />
              Port 8082 Kết Nối
            </span>
          </div>
          <button
            onClick={loadAllData}
            className="w-full text-left text-[10px] text-[#8C6A43] hover:underline flex items-center gap-1 pt-1 cursor-pointer font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Tải lại dữ liệu đồng bộ</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 space-y-8 overflow-x-hidden">
        {/* Top Header Command Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EBE5DC]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.2em] bg-[#FAF4EB] px-2.5 py-0.5 rounded-full border border-[#E0D7C9]/60">
                Restaurant & Floor Management
              </span>
              <span className="text-xs font-semibold text-[#3D7058] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3D7058]" />
                <span>Microservices Architecture</span>
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
              {activeTab === 'overview' && 'Hồ Sơ Nhà Hàng & Thiết Lập Cọc'}
              {activeTab === 'floor-plans' && 'Danh Sách Sơ Đồ Mặt Bằng & Tầng'}
              {activeTab === 'floor-editor' && 'Trình Biên Tập Sơ Đồ 2D Tương Tác'}
              {activeTab === 'tables' && 'Quản Lý Danh Sách & Thuộc Tính Bàn'}
              {activeTab === 'time-slots' && 'Quản Lý Khung Giờ & Công Suất Ca Trực'}
              {activeTab === 'menu' && 'Quản Lý Thực Đơn & Danh Mục Món Ăn'}
              {activeTab === 'special-dates' && 'Cấu Hình Ngày Lễ & Blackout Dates'}
            </h1>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F2] border border-[#C4A480]/40 rounded-xl text-xs text-[#8C6A43] font-semibold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đồng bộ dữ liệu...</span>
            </div>
          )}
        </div>

        {/* TAB 1: RESTAURANT PROFILE & OVERVIEW */}
        {activeTab === 'overview' && profile && (
          <div className="space-y-8">
            {/* Top Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Tổng Số Tầng Mặt Bằng</span>
                <div className="text-2xl font-serif font-bold text-[#1C1917] mt-1">{floorPlans.length} Tầng</div>
                <span className="text-[10px] text-[#3D7058] font-semibold mt-1 block">100% Đã xuất bản</span>
              </div>

              <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Tổng Số Bàn Đang Quản Lý</span>
                <div className="text-2xl font-serif font-bold text-[#8C6A43] mt-1">{tables.length} Bàn</div>
                <span className="text-[10px] text-[#78716C] font-semibold mt-1 block">
                  {tables.filter((t) => t.isActive).length} bàn đang mở phục vụ
                </span>
              </div>

              <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Món Ăn & Thức Uống</span>
                <div className="text-2xl font-serif font-bold text-[#1C1917] mt-1">{menuItems.length} Món</div>
                <span className="text-[10px] text-[#8C6A43] font-semibold mt-1 block">
                  {menuItems.filter((i) => i.isPreorderAvailable).length} món cho phép đặt trước
                </span>
              </div>

              <div className="bg-white border border-[#E8DFD1] rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Tiền Cọc Tiêu Chuẩn</span>
                <div className="text-2xl font-serif font-bold text-[#3D7058] mt-1">
                  {new Intl.NumberFormat('vi-VN').format(profile.defaultDepositAmount)} đ
                </div>
                <span className="text-[10px] text-[#78716C] font-semibold mt-1 block">Khóa bàn tự động 5:00</span>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="bg-white border border-[#EBE5DC] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EBE5DC]">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                    Thông Tin Cơ Bản Của Nhà Hàng
                  </h3>
                  <p className="text-xs text-[#78716C]">Thông tin này hiển thị trên hóa đơn, trang đặt bàn và mã VietQR</p>
                </div>
                <button
                  type="submit"
                  className="btn-tan px-6 py-2.5 text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Hồ Sơ Nhà Hàng</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Tên Nhà Hàng *</label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Số Hotline *</label>
                  <input
                    type="text"
                    required
                    value={profile.hotline}
                    onChange={(e) => setProfile({ ...profile, hotline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Email Liên Hệ *</label>
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Địa Chỉ Mặt Bằng *</label>
                  <input
                    type="text"
                    required
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Giờ Mở Cửa Hàng Ngày *</label>
                  <input
                    type="time"
                    step={1}
                    required
                    value={profile.openingTime}
                    onChange={(e) => setProfile({ ...profile, openingTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Giờ Đóng Cửa Hàng Ngày *</label>
                  <input
                    type="time"
                    step={1}
                    required
                    value={profile.closingTime}
                    onChange={(e) => setProfile({ ...profile, closingTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C221E] block mb-1">Mô Tả / Giới Thiệu Phong Cách Ẩm Thực</label>
                <textarea
                  rows={3}
                  value={profile.description || ''}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>

              {/* Financial & Banking Settings */}
              <div className="pt-6 border-t border-[#EBE5DC]">
                <h4 className="font-serif text-base font-bold text-[#1C1917] mb-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#8C6A43]" />
                  <span>Cấu Hình Tài Khoản Ngân Hàng VietQR & Tiền Cọc</span>
                </h4>
                <p className="text-xs text-[#78716C] mb-4">
                  Dữ liệu dùng để sinh mã VietQR động trực tiếp tới tài khoản doanh nghiệp
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div>
                    <label className="font-bold text-[#2C221E] block mb-1">Tên Ngân Hàng *</label>
                    <input
                      type="text"
                      required
                      value={profile.bankName}
                      onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#2C221E] block mb-1">Mã BIN Ngân Hàng (6 số) *</label>
                    <input
                      type="text"
                      required
                      value={profile.bankBin}
                      onChange={(e) => setProfile({ ...profile, bankBin: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#2C221E] block mb-1">Số Tài Khoản Ngân Hàng *</label>
                    <input
                      type="text"
                      required
                      value={profile.bankAccountNo}
                      onChange={(e) => setProfile({ ...profile, bankAccountNo: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#2C221E] block mb-1">Tên Chủ Tài Khoản Doanh Nghiệp *</label>
                    <input
                      type="text"
                      required
                      value={profile.bankAccountHolder}
                      onChange={(e) => setProfile({ ...profile, bankAccountHolder: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#2C221E] block mb-1">Mức Tiền Cọc Mặc Định (VNĐ) *</label>
                    <input
                      type="number"
                      step={50000}
                      required
                      value={profile.defaultDepositAmount}
                      onChange={(e) => setProfile({ ...profile, defaultDepositAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono font-bold text-[#8C6A43]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#2C221E] block mb-1">Thời Gian Giữ Chỗ Tạm Thời (Giây) *</label>
                    <input
                      type="number"
                      min={30}
                      required
                      value={profile.holdTimeoutSeconds}
                      onChange={(e) => setProfile({ ...profile, holdTimeoutSeconds: parseInt(e.target.value) || 300 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: FLOOR PLANS MANAGEMENT */}
        {activeTab === 'floor-plans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                  Danh Sách Sơ Đồ Tầng & Không Gian
                </h3>
                <p className="text-xs text-[#78716C]">Quản lý các tầng phục vụ của nhà hàng</p>
              </div>

              <button
                onClick={() => {
                  setFloorForm({ id: '', floorNumber: floorPlans.length + 1, name: `Tầng ${floorPlans.length + 1}`, widthPx: 1600, heightPx: 900, gridSize: 20 });
                  setIsFloorModalOpen(true);
                }}
                className="btn-tan px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Tầng Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {floorPlans.map((floor) => (
                <div
                  key={floor.id}
                  className="bg-white border border-[#EBE5DC] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#C4A480] transition-colors group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#8C6A43] font-serif font-bold text-sm flex items-center justify-center border border-[#E0D7C9]">
                        {floor.floorNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          floor.isPublished
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                        }`}
                      >
                        {floor.isPublished ? 'Đã Xuất Bản' : 'Bản Nháp'}
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-[#1C1917]">
                      {floor.name}
                    </h4>

                    <div className="text-xs text-[#78716C] space-y-1">
                      <p>Kích thước canvas: <strong>{floor.widthPx} × {floor.heightPx}px</strong></p>
                      <p>Lưới tọa độ: <strong>{floor.gridSize}px</strong></p>
                      <p>Số bàn hiện có: <strong>{floor.tables?.length || 0} bàn</strong></p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EBE5DC] flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFloorId(floor.id);
                        setActiveTab('floor-editor');
                      }}
                      className="flex-1 btn-tan py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Vẽ Sơ Đồ 2D</span>
                    </button>

                    <button
                      onClick={() => {
                        setFloorForm({
                          id: floor.id,
                          floorNumber: floor.floorNumber,
                          name: floor.name,
                          widthPx: floor.widthPx,
                          heightPx: floor.heightPx,
                          gridSize: floor.gridSize,
                        });
                        setIsFloorModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-[#78716C] hover:bg-[#FAF7F2] border border-[#E0D7C9] cursor-pointer"
                      title="Sửa cấu hình tầng"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteFloor(floor.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      title="Xóa tầng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INTERACTIVE FLOOR EDITOR */}
        {activeTab === 'floor-editor' && (
          <FloorPlanEditor
            floorPlans={floorPlans}
            selectedFloorId={selectedFloorId}
            onSelectFloorId={setSelectedFloorId}
            onRefreshData={loadAllData}
            onShowToast={showToast}
          />
        )}

        {/* TAB 4: TABLE INVENTORY LIST */}
        {activeTab === 'tables' && (
          <div className="bg-white border border-[#EBE5DC] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE5DC]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                  Danh Sách Toàn Bộ Bàn Ăn
                </h3>
                <p className="text-xs text-[#78716C]">Quản lý chi tiết sức chứa, loại bàn và tiền cọc từng vị trí</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-48 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm mã bàn..."
                    value={searchTableQuery}
                    onChange={(e) => setSearchTableQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                  />
                </div>

                <select
                  value={filterFloorId}
                  onChange={(e) => setFilterFloorId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-semibold text-[#6B5E54]"
                >
                  <option value="ALL">Tất Cả Tầng ({tables.length})</option>
                  {floorPlans.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table list */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EBE5DC] text-[#78716C] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Mã Bàn</th>
                    <th className="py-3 px-3">Tầng Mặt Bằng</th>
                    <th className="py-3 px-3">Khu Vực</th>
                    <th className="py-3 px-3">Sức Chứa (Min - Max)</th>
                    <th className="py-3 px-3">Hình Dạng</th>
                    <th className="py-3 px-3">Kích Thước</th>
                    <th className="py-3 px-3">Tiền Cọc Riêng</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {filteredTables.map((t) => {
                    const floorName = floorPlans.find((f) => f.id === t.floorPlanId)?.name || 'Chưa gán';
                    return (
                      <tr key={t.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-[#8C6A43] text-sm">{t.tableCode}</td>
                        <td className="py-3.5 px-3 font-medium text-[#1C1917]">{floorName}</td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4EB] border border-[#E0D7C9] text-[#8C6A43]">
                            {t.zoneType}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#1C1917]">{t.minCapacity} - {t.maxCapacity} Khách</td>
                        <td className="py-3.5 px-3">
                          {t.shape === 'RECT' && 'Chữ Nhật'}
                          {t.shape === 'SQUARE' && 'Hình Vuông'}
                          {t.shape === 'CIRCLE' && 'Bàn Tròn'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-[#78716C]">{t.width} × {t.height}px</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#3D7058]">
                          {t.customDeposit ? `${new Intl.NumberFormat('vi-VN').format(t.customDeposit)} đ` : 'Mặc định'}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.isActive
                                ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                                : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                            }`}
                          >
                            {t.isActive ? 'Hoạt Động' : 'Ngừng'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={async () => {
                              try {
                                await restaurantApi.toggleTableActive(t.id);
                                showToast('Đổi trạng thái bàn thành công', 'success');
                                await loadAllData();
                              } catch (err: any) {
                                showToast(err.message || 'Lỗi đổi trạng thái bàn', 'error');
                              }
                            }}
                            className="text-[#8C6A43] hover:underline font-semibold text-[11px] mr-3 cursor-pointer"
                          >
                            {t.isActive ? 'Tắt' : 'Bật'}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Xóa bàn ${t.tableCode}?`)) return;
                              try {
                                await restaurantApi.deleteTable(t.id);
                                showToast('Đã xóa bàn', 'success');
                                await loadAllData();
                              } catch (err: any) {
                                showToast(err.message || 'Lỗi khi xóa bàn', 'error');
                              }
                            }}
                            className="text-rose-600 hover:underline font-semibold text-[11px] cursor-pointer"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TIME SLOTS */}
        {activeTab === 'time-slots' && (
          <div className="bg-white border border-[#EBE5DC] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE5DC]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                  Khung Giờ & Phân Bổ Công Suất Ca Trực
                </h3>
                <p className="text-xs text-[#78716C]">Thiết lập giờ mở đón khách & giới hạn công suất tránh quá tải bếp</p>
              </div>

              <button
                onClick={() => {
                  setSlotForm({ id: '', slotName: '', startTime: '11:00:00', endTime: '13:00:00', maxCapacity: 40, isActive: true });
                  setIsSlotModalOpen(true);
                }}
                className="btn-tan px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Ca Trực Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {timeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E0D7C9]/80 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-base text-[#1C1917]">{slot.slotName}</span>
                      <button
                        onClick={() => handleToggleSlot(slot.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                          slot.isActive
                            ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                        }`}
                      >
                        {slot.isActive ? 'Đang Mở Đặt' : 'Tạm Đóng'}
                      </button>
                    </div>

                    <div className="text-xs text-[#78716C] space-y-1">
                      <p className="font-mono font-bold text-sm text-[#8C6A43]">
                        ⏰ {slot.startTime} — {slot.endTime}
                      </p>
                      <p>Công suất tối đa: <strong className="text-[#1C1917]">{slot.maxCapacity} khách</strong></p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EBE5DC] flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSlotForm({
                          id: slot.id,
                          slotName: slot.slotName,
                          startTime: slot.startTime,
                          endTime: slot.endTime,
                          maxCapacity: slot.maxCapacity,
                          isActive: slot.isActive,
                        });
                        setIsSlotModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-[#78716C] hover:bg-white border border-[#E0D7C9] cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: MENU & CATEGORIES */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Categories Bar */}
            <div className="bg-white border border-[#EBE5DC] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#8C6A43] uppercase tracking-wider mr-2">Danh Mục:</span>
                <button
                  onClick={() => setFilterMenuCatId('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterMenuCatId === 'ALL'
                      ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                      : 'bg-[#FAF7F2] text-[#6B5E54] hover:text-[#1C1917]'
                  }`}
                >
                  Tất Cả ({menuItems.length})
                </button>
                {categories.map((cat) => (
                  <div key={cat.id} className="inline-flex items-center gap-1 group">
                    <button
                      onClick={() => setFilterMenuCatId(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterMenuCatId === cat.id
                          ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                          : 'bg-[#FAF7F2] text-[#6B5E54] hover:text-[#1C1917]'
                      }`}
                    >
                      {cat.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.id);
                      }}
                      title="Xóa danh mục này"
                      className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCatForm({ id: '', name: '', displayOrder: categories.length + 1, isActive: true });
                    setIsCategoryModalOpen(true);
                  }}
                  className="btn-tan-outline px-3.5 py-1.5 text-xs font-bold cursor-pointer"
                >
                  + Danh Mục
                </button>

                <button
                  onClick={() => {
                    setItemForm({
                      id: '',
                      categoryId: categories[0]?.id || '',
                      name: '',
                      description: '',
                      price: 250000,
                      imageUrl: '',
                      isPreorderAvailable: true,
                      isActive: true,
                    });
                    setIsItemModalOpen(true);
                  }}
                  className="btn-tan px-4 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Món Ăn</span>
                </button>
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#EBE5DC] rounded-3xl overflow-hidden shadow-xs hover:border-[#C4A480] transition-colors flex flex-col justify-between"
                >
                  <div>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-[#FAF7F2] flex items-center justify-center text-[#8C6A43]">
                        <UtensilsCrossed className="w-8 h-8 opacity-40" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-[#8C6A43] tracking-wider">
                          {item.categoryName || 'Món Ăn'}
                        </span>
                        {item.isPreorderAvailable && (
                          <span className="text-[9px] font-bold bg-[#FAF4EB] text-[#8C6A43] px-2 py-0.5 rounded-full border border-[#E0D7C9]">
                            Cho Phép Cọc Trước
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif font-bold text-sm text-[#1C1917] leading-snug line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-[#78716C] line-clamp-2 leading-relaxed">
                        {item.description || 'Hương vị tinh tế tiêu chuẩn Michelin'}
                      </p>
                      <div className="text-base font-serif font-bold text-[#8C6A43] pt-1">
                        {new Intl.NumberFormat('vi-VN').format(item.price)} đ
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-[#EBE5DC] flex items-center justify-between text-xs">
                    <button
                      onClick={async () => {
                        try {
                          await restaurantApi.toggleMenuItem(item.id);
                          showToast('Đổi trạng thái món ăn thành công', 'success');
                          await loadAllData();
                        } catch (err: any) {
                          showToast(err.message || 'Lỗi đổi trạng thái', 'error');
                        }
                      }}
                      className="text-[11px] font-bold text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                    >
                      {item.isActive ? 'Tạm Ngưng' : 'Mở Lại'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setItemForm({
                            id: item.id,
                            categoryId: item.categoryId,
                            name: item.name,
                            description: item.description || '',
                            price: item.price,
                            imageUrl: item.imageUrl || '',
                            isPreorderAvailable: item.isPreorderAvailable,
                            isActive: item.isActive,
                          });
                          setIsItemModalOpen(true);
                        }}
                        className="p-1 text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: BLACKOUT & SPECIAL DATES */}
        {activeTab === 'special-dates' && (
          <div className="bg-white border border-[#EBE5DC] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE5DC]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">
                  Cấu Hình Ngày Lễ & Blackout Dates (UC-30)
                </h3>
                <p className="text-xs text-[#78716C]">
                  Tự động tăng tiền cọc vào các ngày cao điểm (Valentine, Giáng Sinh) hoặc chặn đặt bàn khi bảo dưỡng quán
                </p>
              </div>

              <button
                onClick={() => {
                  setBlackoutForm({
                    id: '',
                    eventDate: new Date().toISOString().slice(0, 10),
                    eventName: '',
                    isClosed: false,
                    customDepositAmount: 500000,
                    requireSpecialMenu: false,
                    note: '',
                  });
                  setIsBlackoutModalOpen(true);
                }}
                className="btn-tan px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Ngày Đặc Biệt</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {blackoutDates.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E0D7C9]/80 flex items-center justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-white px-2.5 py-0.5 rounded-full border border-[#E0D7C9] text-[#8C6A43]">
                        📅 {item.eventDate}
                      </span>
                      {item.isClosed ? (
                        <span className="text-[10px] font-bold bg-[#FEF2F2] text-[#991B1B] px-2 py-0.5 rounded-full border border-[#FECACA]">
                          Đóng Cửa / Bảo Dưỡng
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                          Mở Đặt Có Phụ Thu
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-base text-[#1C1917]">{item.eventName}</h4>
                    {item.note && <p className="text-xs text-[#78716C]">{item.note}</p>}

                    {item.customDepositAmount && (
                      <p className="text-xs font-mono font-bold text-[#8C6A43]">
                        Tiền cọc ngày lễ: {new Intl.NumberFormat('vi-VN').format(item.customDepositAmount)} đ
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBlackoutForm({
                          id: item.id,
                          eventDate: item.eventDate,
                          eventName: item.eventName,
                          isClosed: item.isClosed,
                          customDepositAmount: item.customDepositAmount || 0,
                          requireSpecialMenu: item.requireSpecialMenu,
                          note: item.note || '',
                        });
                        setIsBlackoutModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-[#78716C] hover:bg-white border border-[#E0D7C9] cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlackout(item.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FLOOR PLAN MODAL */}
      {isFloorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE5DC] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">
              {floorForm.id ? 'Sửa Sơ Đồ Tầng' : '+ Thêm Sơ Đồ Tầng Mới'}
            </h3>
            <form onSubmit={handleSaveFloor} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Số Tầng (Thứ tự) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={floorForm.floorNumber}
                  onChange={(e) => setFloorForm({ ...floorForm, floorNumber: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Tên Tầng / Khu Vực *</label>
                <input
                  type="text"
                  required
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                  placeholder="VD: Tầng 1 - Sảnh Vòm & Bar"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Chiều Rộng (px)</label>
                  <input
                    type="number"
                    value={floorForm.widthPx}
                    onChange={(e) => setFloorForm({ ...floorForm, widthPx: parseInt(e.target.value) || 1600 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Chiều Cao (px)</label>
                  <input
                    type="number"
                    value={floorForm.heightPx}
                    onChange={(e) => setFloorForm({ ...floorForm, heightPx: parseInt(e.target.value) || 900 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                <button
                  type="button"
                  onClick={() => setIsFloorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#78716C]"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-tan px-5 py-2 font-bold cursor-pointer">
                  Lưu Sơ Đồ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIME SLOT MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE5DC] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">
              {slotForm.id ? 'Sửa Khung Giờ Ca Trực' : '+ Thêm Khung Giờ Mới'}
            </h3>
            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Tên Khung Giờ *</label>
                <input
                  type="text"
                  required
                  value={slotForm.slotName}
                  onChange={(e) => setSlotForm({ ...slotForm, slotName: e.target.value })}
                  placeholder="VD: Ca tối Giờ Vàng (18:30 - 20:30)"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Giờ Bắt Đầu *</label>
                  <input
                    type="time"
                    step={1}
                    required
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Giờ Kết Thúc *</label>
                  <input
                    type="time"
                    step={1}
                    required
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Công Suất Tối Đa Ca (Khách) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={slotForm.maxCapacity}
                  onChange={(e) => setSlotForm({ ...slotForm, maxCapacity: parseInt(e.target.value) || 40 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#78716C]"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-tan px-5 py-2 font-bold cursor-pointer">
                  Lưu Khung Giờ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE5DC] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">
              {catForm.id ? 'Sửa Danh Mục' : '+ Thêm Danh Mục Món'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Tên Danh Mục *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="VD: Steak Bò Thượng Hạng"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Thứ Tự Hiển Thị</label>
                <input
                  type="number"
                  value={catForm.displayOrder}
                  onChange={(e) => setCatForm({ ...catForm, displayOrder: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#78716C]"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-tan px-5 py-2 font-bold cursor-pointer">
                  Lưu Danh Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EBE5DC] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">
              {itemForm.id ? 'Chỉnh Sửa Món Ăn' : '+ Thêm Món Ăn Mới'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Danh Mục Món *</label>
                <select
                  value={itemForm.categoryId}
                  onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Tên Món Ăn *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="VD: Thăn Bò Wagyu A5 Miyazaki 250g"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Giá Bán (VNĐ) *</label>
                <input
                  type="number"
                  step={10000}
                  required
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono font-bold text-[#8C6A43]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Link Ảnh Minh Họa</label>
                <input
                  type="text"
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Mô Tả Hương Vị & Thành Phần</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="preorderCheck"
                  checked={itemForm.isPreorderAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isPreorderAvailable: e.target.checked })}
                  className="rounded-sm accent-[#C4A480] w-4 h-4"
                />
                <label htmlFor="preorderCheck" className="font-semibold cursor-pointer">
                  Cho phép khách đặt trước khi đặt cọc bàn trực tuyến
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#78716C]"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-tan px-5 py-2 font-bold cursor-pointer">
                  Lưu Món Ăn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLACKOUT DATE MODAL */}
      {isBlackoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE5DC] space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">
              {blackoutForm.id ? 'Sửa Ngày Đặc Biệt' : '+ Cấu Hình Ngày Đặc Biệt (UC-30)'}
            </h3>
            <form onSubmit={handleSaveBlackout} className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1">Ngày Diễn Ra *</label>
                <input
                  type="date"
                  required
                  value={blackoutForm.eventDate}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, eventDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Tên Dịp Lễ / Sự Kiện *</label>
                <input
                  type="text"
                  required
                  value={blackoutForm.eventName}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, eventName: e.target.value })}
                  placeholder="VD: Ngày Valentine 14/02"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Mức Cọc Tùy Chỉnh (VNĐ)</label>
                <input
                  type="number"
                  step={50000}
                  value={blackoutForm.customDepositAmount}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, customDepositAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2] font-mono font-bold text-[#8C6A43]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Ghi Chú Phụ Thu</label>
                <input
                  type="text"
                  value={blackoutForm.note}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, note: e.target.value })}
                  placeholder="VD: Bắt buộc chọn set menu đặc biệt"
                  className="w-full px-3 py-2 rounded-xl border border-[#E0D7C9] bg-[#FAF7F2]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isClosedCheck"
                  checked={blackoutForm.isClosed}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, isClosed: e.target.checked })}
                  className="rounded-sm accent-rose-600 w-4 h-4"
                />
                <label htmlFor="isClosedCheck" className="font-semibold text-rose-800 cursor-pointer">
                  Đóng cửa hoàn toàn / Bảo trì nhà hàng (Chặn đặt bàn)
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBE5DC]">
                <button
                  type="button"
                  onClick={() => setIsBlackoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#78716C]"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-tan px-5 py-2 font-bold cursor-pointer">
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
