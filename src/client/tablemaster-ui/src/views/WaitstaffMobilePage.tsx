import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Send,
  Trash2,
  Smartphone,
  ChevronRight,
  ArrowRightLeft,
  Merge,
  Utensils,
  Edit3,
  Loader2,
} from 'lucide-react';
import type { TableItem, TableOrderRecord, AuthUser } from '../types';
import { SIGNATURE_DISHES } from '../data/mockData';
import { restaurantApi } from '../services/restaurantApi';

interface WaitstaffMobilePageProps {
  tables: TableItem[];
  tableOrders: Record<string, TableOrderRecord>;
  currentUser?: AuthUser | null;
  onAddItemsToTable: (
    tableId: string,
    items: { dishId: string; name: string; price: number; quantity: number; notes?: string; category: string }[]
  ) => Promise<void> | void;
  onTransferTable?: (sourceTableId: string, targetTableId: string) => Promise<void> | void;
  onMergeTables?: (sourceTableId: string, targetTableId: string) => Promise<void> | void;
  onNavigateToHost?: () => void;
}

export const WaitstaffMobilePage: React.FC<WaitstaffMobilePageProps> = ({
  tables,
  tableOrders,
  currentUser,
  onAddItemsToTable,
  onTransferTable,
  onMergeTables,
  onNavigateToHost,
}) => {
  // Find first active or available table as default
  const [selectedTableId, setSelectedTableId] = useState<string>(() => {
    const active = tables.find((t) => t.status === 'SEATED');
    return active ? active.id : tables[0].id;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Dynamic dishes loaded from restaurant-service backend (with mockData fallback)
  const [dishesList, setDishesList] = useState<typeof SIGNATURE_DISHES>(SIGNATURE_DISHES);
  const [categoryTabs, setCategoryTabs] = useState<{ id: string; label: string }[]>([
    { id: 'ALL', label: 'Tất Cả' },
    { id: 'Set Menu & Combo', label: '🌟 Set Combo' },
    { id: 'Bò Dry-Aged & Món Chính', label: '🥩 Bò & Steak' },
    { id: 'Rượu Vang & Champagne', label: '🍷 Rượu Vang' },
    { id: 'Khai Vị & Tráng Miệng', label: '🍰 Tráng Miệng' },
  ]);
  const [isBackendMenuConnected, setIsBackendMenuConnected] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load menu thật từ Backend restaurant-service (cổng 8082 - UC-29)
  useEffect(() => {
    let active = true;
    restaurantApi
      .getMenuItems(undefined, true)
      .then((items) => {
        if (!active) return;
        if (Array.isArray(items) && items.length > 0) {
          setIsBackendMenuConnected(true);
          const mapped = items.map((it) => ({
            id: it.id,
            name: it.name,
            vietnameseName: it.name,
            price: Number(it.price) || 50000,
            category: it.categoryName || 'Món Chính',
            description: it.description || '',
            image: it.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300',
            preOrderOnly: !it.isPreorderAvailable,
            signatureBadge: 'Đặc Sản',
          }));
          setDishesList(mapped);

          const uniqueCats = Array.from(new Set(items.map((i) => i.categoryName).filter(Boolean)));
          if (uniqueCats.length > 0) {
            setCategoryTabs([
              { id: 'ALL', label: 'Tất Cả' },
              ...uniqueCats.map((cat) => ({ id: cat!, label: cat! })),
            ]);
          }
        }
      })
      .catch((err) => {
        console.warn('⚠️ [WaitstaffMobile] Dùng menu fallback do backend menu chưa bật:', err?.message || err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Pending cart for this table before sending
  const [pendingCart, setPendingCart] = useState<Record<string, { quantity: number; notes: string }>>({});

  // Mobile Table Transfer & Merge Modal states
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');

  // Custom Item Modal state
  const [isCustomDishModalOpen, setIsCustomDishModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('50000');
  const [customNotes, setCustomNotes] = useState('');

  // Success Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentTable = tables.find((t) => t.id === selectedTableId) || tables[0];
  const existingOrder = tableOrders[selectedTableId];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Cart helper functions
  const handleAddToCart = (dishId: string) => {
    setPendingCart((prev) => ({
      ...prev,
      [dishId]: {
        quantity: (prev[dishId]?.quantity || 0) + 1,
        notes: prev[dishId]?.notes || '',
      },
    }));
  };

  const handleUpdateCartQty = (dishId: string, delta: number) => {
    setPendingCart((prev) => {
      const current = prev[dishId];
      if (!current) return prev;
      const nextQty = current.quantity + delta;
      const copy = { ...prev };
      if (nextQty <= 0) {
        delete copy[dishId];
      } else {
        copy[dishId] = { ...current, quantity: nextQty };
      }
      return copy;
    });
  };

  const handleUpdateDishNote = (dishId: string, note: string) => {
    setPendingCart((prev) => ({
      ...prev,
      [dishId]: {
        ...prev[dishId],
        notes: note,
      },
    }));
  };

  const handleClearCart = () => {
    setPendingCart({});
  };

  const pendingItemsArray = Object.entries(pendingCart)
    .map(([dishId, { quantity, notes }]) => {
      const dish = dishesList.find((d) => d.id === dishId) || SIGNATURE_DISHES.find((d) => d.id === dishId);
      return dish ? { dish, quantity, notes } : null;
    })
    .filter((item): item is { dish: typeof SIGNATURE_DISHES[0]; quantity: number; notes: string } => item !== null);

  const pendingItemsCount = pendingItemsArray.reduce((sum, i) => sum + i.quantity, 0);
  const pendingTotal = pendingItemsArray.reduce((sum, i) => sum + i.dish.price * i.quantity, 0);

  const handleSendOrderToCashier = async () => {
    if (pendingItemsArray.length === 0 || isSubmitting) return;

    const itemsToSend = pendingItemsArray.map((item) => ({
      dishId: item.dish.id,
      name: item.dish.name,
      price: item.dish.price,
      quantity: item.quantity,
      notes: item.notes,
      category: item.dish.category,
    }));

    setIsSubmitting(true);
    try {
      await onAddItemsToTable(selectedTableId, itemsToSend);
      showToast(`Đã gửi ${pendingItemsCount} món của bàn ${currentTable.code} về Quầy Thu Ngân & Bếp!`);
      setPendingCart({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomDish = async () => {
    if (!customName.trim() || isSubmitting) return;
    const priceNum = parseInt(customPrice.replace(/\D/g, ''), 10) || 0;

    setIsSubmitting(true);
    try {
      await onAddItemsToTable(selectedTableId, [
        {
          dishId: `custom-mobile-${Date.now()}`,
          name: customName.trim(),
          price: priceNum,
          quantity: 1,
          notes: customNotes.trim(),
          category: 'Món Nhập Riêng',
        },
      ]);

      setCustomName('');
      setCustomPrice('50000');
      setCustomNotes('');
      setIsCustomDishModalOpen(false);
      showToast(`Đã thêm món riêng vào bàn ${currentTable.code}!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferTargetId || !onTransferTable || isSubmitting) return;
    const targetTable = tables.find((t) => t.id === transferTargetId);
    if (!targetTable) return;

    setIsSubmitting(true);
    try {
      await onTransferTable(currentTable.id, transferTargetId);
      showToast(`Đã chuyển toàn bộ hóa đơn từ ${currentTable.code} sang ${targetTable.code}`);
      setSelectedTableId(transferTargetId);
      setIsTransferModalOpen(false);
      setTransferTargetId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergeTargetId || !onMergeTables || isSubmitting) return;
    const targetTable = tables.find((t) => t.id === mergeTargetId);
    if (!targetTable) return;

    setIsSubmitting(true);
    try {
      await onMergeTables(currentTable.id, mergeTargetId);
      showToast(`Đã gộp món từ bàn ${currentTable.code} vào bàn ${targetTable.code}`);
      setSelectedTableId(mergeTargetId);
      setIsMergeModalOpen(false);
      setMergeTargetId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Existing order total calculation
  const existingItemsTotal = existingOrder
    ? existingOrder.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#1F1916] py-6 px-3 sm:px-6 flex flex-col items-center justify-start relative">
      {/* Mobile Device Mockup Frame */}
      <div className="w-full max-w-md bg-[#FAF7F2] rounded-[36px] border-4 border-[#3A2E28] shadow-2xl overflow-hidden flex flex-col min-h-[820px] relative">
        {/* Device Top Speaker Bar */}
        <div className="bg-[#2C221E] px-6 pt-3 pb-2 flex items-center justify-between text-white/80 text-[11px] font-mono select-none">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-[#C4A480]" />
            <span className="font-bold text-[#E8DFD1]">Waiter POS Mobile</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isBackendMenuConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={`text-[10px] ${isBackendMenuConnected ? 'text-emerald-300 font-bold' : 'text-amber-300'}`}>
              {isBackendMenuConnected ? 'Đã nối BE (8082/8083)' : 'Chế độ Demo Cục Bộ'}
            </span>
          </div>
        </div>

        {/* Staff Header */}
        <div className="bg-[#2C221E] px-5 pb-3 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#C4A480] font-mono font-bold">
                Phục Vụ Trực Bàn • {currentUser?.role || 'WAITER'}
              </p>
              <h2 className="font-serif text-base font-bold text-[#FDFBF7]">
                {currentUser?.fullName || currentUser?.email || 'Nguyễn Văn Nam'} • {currentUser?.phone || 'Ca Trực'}
              </h2>
            </div>
            {onNavigateToHost && (
              <button
                type="button"
                onClick={onNavigateToHost}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#E8DFD1] text-[10px] font-bold border border-white/20 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Màn Thu Ngân</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Table Selector Horizontal Carousel */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                Chọn Bàn Đang Phục Vụ:
              </span>
              <span className="text-[10px] text-[#C4A480] font-mono">
                {tables.filter((t) => t.status === 'SEATED').length} bàn đang ăn
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {tables.map((table) => {
                const isSelected = table.id === selectedTableId;
                const isSeated = table.status === 'SEATED';
                const isConfirmed = table.status === 'CONFIRMED';
                const order = tableOrders[table.id];

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      setSelectedTableId(table.id);
                      setPendingCart({});
                    }}
                    className={`px-3 py-2 rounded-2xl shrink-0 text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#C4A480] to-[#8C6A43] text-white border-white/40 shadow-sm font-bold scale-105'
                        : isSeated
                        ? 'bg-white/10 text-amber-200 border-amber-500/30 hover:bg-white/20'
                        : isConfirmed
                        ? 'bg-white/10 text-blue-200 border-blue-400/30'
                        : 'bg-white/5 text-stone-400 border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-serif text-xs font-bold">{table.code}</span>
                      {order && order.items.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="text-[9px] mt-0.5 font-mono">
                      {isSeated ? '🟠 Đang ăn' : isConfirmed ? '🔵 Đã cọc' : '🟢 Trống'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Table Active Info & Table Action Tools */}
        <div className="bg-gradient-to-r from-[#FAF4EB] via-[#F5ECE0] to-[#FAF4EB] px-4 py-2.5 border-b border-[#E8DFD1] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-xl bg-[#8C6A43] text-white font-serif font-bold text-xs whitespace-nowrap">
                {currentTable.code}
              </div>
              <div>
                <p className="font-bold text-[#2C221E] text-xs leading-none">
                  {existingOrder?.guestName || currentTable.currentGuestName || 'Khách Tại Bàn'}
                </p>
                <p className="text-[10px] text-[#78716C] mt-0.5">
                  {currentTable.capacity} khách • Bill hiện tại:{' '}
                  <span className="font-bold font-mono text-[#8C6A43]">
                    {new Intl.NumberFormat('vi-VN').format(existingItemsTotal)} đ
                  </span>
                </p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              currentTable.status === 'SEATED'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : currentTable.status === 'CONFIRMED'
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}>
              {currentTable.status === 'SEATED' ? 'Đang Dùng Bữa' : currentTable.status === 'CONFIRMED' ? 'Đã Cọc Trước' : 'Bàn Trống'}
            </span>
          </div>

          {/* Quick Action Bar for Floor Operations: Transfer / Merge / Custom Item */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#E8DFD1]/60">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex-1 py-1 px-2 rounded-xl bg-white hover:bg-stone-50 border border-[#D5C7B5] text-[#5C4A3E] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
              <span>Chuyển Bàn</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMergeModalOpen(true)}
              className="flex-1 py-1 px-2 rounded-xl bg-white hover:bg-stone-50 border border-[#D5C7B5] text-[#5C4A3E] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Merge className="w-3 h-3 text-amber-600" />
              <span>Ghép Bàn</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomDishModalOpen(true)}
              className="flex-1 py-1 px-2 rounded-xl bg-white hover:bg-stone-50 border border-[#D5C7B5] text-[#8C6A43] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3 text-[#8C6A43]" />
              <span>+ Nhập Món Riêng</span>
            </button>
          </div>
        </div>

        {/* Success Toast Banner */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white p-3 text-xs flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <p className="font-bold text-xs">{toastMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Menu Search & Category Tabs */}
        <div className="p-3 bg-white border-b border-[#E8DFD1] space-y-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm món ăn, rượu vang..."
              className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
            />
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {categoryTabs.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#8C6A43] text-white shadow-2xs'
                    : 'bg-[#FAF7F2] text-[#6B5E54] border border-[#E8DFD1] hover:bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Dishes List for Waiter to Tap and Add */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1 max-h-[360px]">
          {/* If table has existing served items, show an accordion/summary */}
          {existingOrder && existingOrder.items.length > 0 && (
            <div className="bg-[#FAF4EB] border border-[#E8DFD1] rounded-2xl p-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[#8C6A43] font-bold">
                <span className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Món đang phục vụ ({existingOrder.items.length} món)</span>
                </span>
                <span className="font-mono text-[11px]">
                  {new Intl.NumberFormat('vi-VN').format(existingItemsTotal)} đ
                </span>
              </div>
              <div className="text-[10px] text-[#78716C] divide-y divide-[#E8DFD1]/50">
                {existingOrder.items.slice(0, 3).map((it, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span className="truncate">{it.name} x{it.quantity}</span>
                    <span className="font-mono">{new Intl.NumberFormat('vi-VN').format(it.price * it.quantity)} đ</span>
                  </div>
                ))}
                {existingOrder.items.length > 3 && (
                  <p className="text-[9px] text-[#8C6A43] pt-0.5 italic">
                    + thêm {existingOrder.items.length - 3} món khác...
                  </p>
                )}
              </div>
            </div>
          )}

          {dishesList
            .filter(
              (dish) =>
                (selectedCategory === 'ALL' || dish.category === selectedCategory) &&
                dish.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((dish) => {
              const inCart = pendingCart[dish.id]?.quantity || 0;

              return (
                <div
                  key={dish.id}
                  className={`p-2.5 rounded-2xl border transition-all flex gap-3 items-center ${
                    inCart > 0
                      ? 'bg-[#FAF4EB] border-[#C4A480] shadow-2xs ring-1 ring-[#C4A480]/40'
                      : 'bg-white border-[#E8DFD1] hover:border-[#C4A480]/50'
                  }`}
                >
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-16 h-16 rounded-xl object-cover border border-[#E8DFD1] shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#2C221E] truncate">{dish.name}</p>
                    <p className="text-[11px] font-mono font-bold text-[#8C6A43] mt-0.5">
                      {new Intl.NumberFormat('vi-VN').format(dish.price)} đ
                    </p>
                    <span className="text-[9px] text-[#78716C] block truncate">{dish.servingSize || dish.category}</span>

                    {/* Note input if added to cart */}
                    {inCart > 0 && (
                      <input
                        type="text"
                        value={pendingCart[dish.id]?.notes || ''}
                        onChange={(e) => handleUpdateDishNote(dish.id, e.target.value)}
                        placeholder="Ghi chú bếp (VD: Medium Rare, ít cay...)"
                        className="w-full mt-1.5 bg-white border border-[#E8DFD1] rounded-lg px-2 py-0.5 text-[10px] text-[#2C221E] placeholder:text-stone-400 focus:outline-none focus:border-[#C4A480]"
                      />
                    )}
                  </div>

                  {/* Add / Stepper */}
                  <div className="shrink-0">
                    {inCart === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(dish.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#8C6A43] text-[#8C6A43] hover:text-white border border-[#E8DFD1] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chọn</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-white px-1.5 py-1 rounded-xl border border-[#C4A480]">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(dish.id, -1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF7F2] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold font-mono w-4 text-center text-[#2C221E]">
                          {inCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(dish.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#8C6A43] hover:bg-[#FAF4EB] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Bottom Floating Order Tray / Submit Button */}
        <div className="p-3.5 bg-white border-t border-[#E8DFD1] space-y-2.5 shrink-0">
          {pendingItemsCount > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#2C221E] flex items-center gap-1">
                  <span>Món mới ({currentTable.code}):</span>
                  <span className="text-[#8C6A43]">({pendingItemsCount} phần)</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa hết</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSendOrderToCashier}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#8C6A43] to-[#735534] hover:from-[#735534] hover:to-[#5E4428] disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center justify-between px-4 cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2">
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Đang gửi order...' : 'Gửi Order Về Thu Ngân & Bếp'}</span>
                </div>
                <span className="font-mono text-sm font-bold bg-white/20 px-2 py-0.5 rounded-lg">
                  {new Intl.NumberFormat('vi-VN').format(pendingTotal)} đ
                </span>
              </button>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-[#78716C] flex items-center justify-center gap-1">
              <span>Chạm <strong>Chọn</strong> để thêm món hoặc dùng nút <strong>Chuyển / Ghép bàn</strong> ở trên</span>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MODAL: CHUYỂN BÀN */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl border border-[#D5C7B5] w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DFD1] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#2C221E] text-base">Chuyển Bàn</h3>
                  <p className="text-[11px] text-[#78716C]">Chuyển khách & hóa đơn từ {currentTable.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#2C221E] block">
                Chọn bàn đích để chuyển tới:
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {tables
                  .filter((t) => t.id !== currentTable.id)
                  .map((t) => {
                    const isAvail = t.status === 'AVAILABLE';
                    const isSelected = transferTargetId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTransferTargetId(t.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 font-bold'
                            : isAvail
                            ? 'bg-white border-[#E8DFD1] text-[#2C221E] hover:border-indigo-400'
                            : 'bg-stone-100 border-stone-200 text-stone-400'
                        }`}
                      >
                        <div className="font-bold text-xs">{t.code}</div>
                        <div className="text-[9px] mt-0.5 font-mono">
                          {isAvail ? '🟢 Trống' : '🟠 Đang ngồi'}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white border border-[#D5C7B5] text-[#5C4A3E] text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={!transferTargetId}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer transition-colors ${
                  transferTargetId
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-stone-400 cursor-not-allowed'
                }`}
              >
                Xác Nhận Chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MODAL: GHÉP BÀN */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl border border-[#D5C7B5] w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DFD1] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Merge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#2C221E] text-base">Ghép Bàn / Gộp Bill</h3>
                  <p className="text-[11px] text-[#78716C]">Gộp món {currentTable.code} vào bàn khác</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#2C221E] block">
                Chọn bàn nhận bill gộp chung:
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {tables
                  .filter((t) => t.id !== currentTable.id)
                  .map((t) => {
                    const isSeated = t.status === 'SEATED';
                    const isSelected = mergeTargetId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMergeTargetId(t.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-700 text-white border-amber-800 font-bold'
                            : isSeated
                            ? 'bg-white border-[#E8DFD1] text-[#2C221E] hover:border-amber-500'
                            : 'bg-stone-100 border-stone-200 text-stone-500'
                        }`}
                      >
                        <div className="font-bold text-xs">{t.code}</div>
                        <div className="text-[9px] mt-0.5 font-mono">
                          {isSeated ? '🟠 Đang ăn' : '🟢 Bàn trống'}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white border border-[#D5C7B5] text-[#5C4A3E] text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={!mergeTargetId}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer transition-colors ${
                  mergeTargetId
                    ? 'bg-[#8C6A43] hover:bg-[#735534]'
                    : 'bg-stone-400 cursor-not-allowed'
                }`}
              >
                Xác Nhận Ghép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MODAL: TỰ NHẬP MÓN RIÊNG */}
      {isCustomDishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl border border-[#D5C7B5] w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DFD1] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#8C6A43]/10 text-[#8C6A43]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#2C221E] text-base">Nhập Món / Phụ Thu Riêng</h3>
                  <p className="text-[11px] text-[#78716C]">Thêm món ngoài menu cho bàn {currentTable.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomDishModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#2C221E] block mb-1">
                  Tên món / Thức uống:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="VD: Nước suối San Pellegrino, Rượu khách mang..."
                  className="w-full bg-white border border-[#D5C7B5] rounded-xl px-3 py-2 text-xs text-[#2C221E] focus:outline-none focus:border-[#8C6A43]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2C221E] block mb-1">
                  Giá tiền (VNĐ):
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-white border border-[#D5C7B5] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#8C6A43] focus:outline-none focus:border-[#8C6A43]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2C221E] block mb-1">
                  Ghi chú cho Bếp / Bar:
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="VD: Ướp lạnh, rót tại bàn..."
                  className="w-full bg-white border border-[#D5C7B5] rounded-xl px-3 py-2 text-xs text-[#2C221E] focus:outline-none focus:border-[#8C6A43]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomDishModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white border border-[#D5C7B5] text-[#5C4A3E] text-xs font-bold hover:bg-stone-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddCustomDish}
                disabled={!customName.trim()}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer transition-colors ${
                  customName.trim()
                    ? 'bg-[#8C6A43] hover:bg-[#735534]'
                    : 'bg-stone-400 cursor-not-allowed'
                }`}
              >
                Thêm Vào Bàn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
