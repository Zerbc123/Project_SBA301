import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Edit3,
  X,
  Compass,
  Layers,
  Sparkles,
  Maximize2,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { FloorPlan, Table } from '../../services/restaurantApi';
import { restaurantApi } from '../../services/restaurantApi';

interface FloorPlanEditorProps {
  floorPlans: FloorPlan[];
  selectedFloorId: string;
  onSelectFloorId: (id: string) => void;
  onRefreshData: () => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({
  floorPlans,
  selectedFloorId,
  onSelectFloorId,
  onRefreshData,
  onShowToast,
}) => {
  const currentFloor = floorPlans.find((f) => f.id === selectedFloorId) || floorPlans[0];
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Dragging state
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Table Modal
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [tableFormData, setTableFormData] = useState({
    tableCode: '',
    zoneType: 'STANDARD',
    minCapacity: 2,
    maxCapacity: 4,
    customDeposit: 200000,
    shape: 'RECT' as 'RECT' | 'SQUARE' | 'CIRCLE',
    width: 90,
    height: 80,
    isActive: true,
  });

  useEffect(() => {
    if (currentFloor) {
      setTables(currentFloor.tables || []);
      setSelectedTable(null);
      setHasUnsavedChanges(false);
    }
  }, [currentFloor]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation();
    setSelectedTable(table);
    setDraggingTableId(table.id);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Calculate mouse position relative to table top-left
    const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
    const mouseY = (e.clientY - canvasRect.top) / zoomLevel;

    setDragOffset({
      x: mouseX - table.posX,
      y: mouseY - table.posY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTableId || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / zoomLevel;
    const mouseY = (e.clientY - canvasRect.top) / zoomLevel;

    let newX = mouseX - dragOffset.x;
    let newY = mouseY - dragOffset.y;

    const gridSize = currentFloor?.gridSize || 20;
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Boundary constraints
    newX = Math.max(10, Math.min(newX, (currentFloor?.widthPx || 1600) - 100));
    newY = Math.max(10, Math.min(newY, (currentFloor?.heightPx || 900) - 100));

    setTables((prev) =>
      prev.map((t) => (t.id === draggingTableId ? { ...t, posX: newX, posY: newY } : t))
    );
    setHasUnsavedChanges(true);
  };

  const handleMouseUp = () => {
    setDraggingTableId(null);
  };

  // Save all table positions
  const handleSavePositions = async () => {
    if (!currentFloor) return;
    setIsSaving(true);
    try {
      await restaurantApi.batchUpdatePositions(
        tables.map((t) => ({
          id: t.id,
          posX: t.posX,
          posY: t.posY,
          width: t.width,
          height: t.height,
          shape: t.shape,
          rotation: t.rotation,
        }))
      );
      setHasUnsavedChanges(false);
      onShowToast('Đã lưu sơ đồ và tọa độ bàn thành công!', 'success');
      await onRefreshData();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi lưu tọa độ bàn', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async () => {
    if (!currentFloor) return;
    try {
      await restaurantApi.toggleFloorPlanPublish(currentFloor.id);
      onShowToast(`Đã ${currentFloor.isPublished ? 'thu hồi xuất bản' : 'xuất bản'} sơ đồ tầng!`, 'success');
      await onRefreshData();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi đổi trạng thái xuất bản', 'error');
    }
  };

  // Open Add Table Modal
  const openAddTableModal = () => {
    setModalMode('create');
    setTableFormData({
      tableCode: `T-${(tables.length + 1).toString().padStart(2, '0')}`,
      zoneType: 'STANDARD',
      minCapacity: 2,
      maxCapacity: 4,
      customDeposit: 200000,
      shape: 'RECT',
      width: 90,
      height: 80,
      isActive: true,
    });
    setIsTableModalOpen(true);
  };

  // Open Edit Table Modal
  const openEditTableModal = (table: Table) => {
    setSelectedTable(table);
    setModalMode('edit');
    setTableFormData({
      tableCode: table.tableCode,
      zoneType: table.zoneType || 'STANDARD',
      minCapacity: table.minCapacity,
      maxCapacity: table.maxCapacity,
      customDeposit: table.customDeposit || 200000,
      shape: table.shape || 'RECT',
      width: table.width || 90,
      height: table.height || 80,
      isActive: table.isActive,
    });
    setIsTableModalOpen(true);
  };

  // Submit Table Form
  const handleSubmitTableForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFloor) return;

    if (tableFormData.minCapacity > tableFormData.maxCapacity) {
      onShowToast('Sức chứa tối thiểu không thể lớn hơn sức chứa tối đa', 'error');
      return;
    }

    try {
      if (modalMode === 'create') {
        const newTable = await restaurantApi.createTable({
          floorPlanId: currentFloor.id,
          tableCode: tableFormData.tableCode.trim(),
          zoneType: tableFormData.zoneType,
          minCapacity: tableFormData.minCapacity,
          maxCapacity: tableFormData.maxCapacity,
          customDeposit: tableFormData.customDeposit,
          shape: tableFormData.shape,
          width: tableFormData.width,
          height: tableFormData.height,
          posX: 150,
          posY: 150,
          isActive: tableFormData.isActive,
        });
        setTables((prev) => [...prev, newTable]);
        setSelectedTable(newTable);
        onShowToast(`Đã thêm bàn ${newTable.tableCode} vào sơ đồ!`, 'success');
      } else if (selectedTable) {
        const updated = await restaurantApi.updateTable(selectedTable.id, {
          floorPlanId: currentFloor.id,
          tableCode: tableFormData.tableCode.trim(),
          zoneType: tableFormData.zoneType,
          minCapacity: tableFormData.minCapacity,
          maxCapacity: tableFormData.maxCapacity,
          customDeposit: tableFormData.customDeposit,
          shape: tableFormData.shape,
          width: tableFormData.width,
          height: tableFormData.height,
          posX: selectedTable.posX,
          posY: selectedTable.posY,
          isActive: tableFormData.isActive,
        });
        setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setSelectedTable(updated);
        onShowToast(`Cập nhật thông tin bàn ${updated.tableCode} thành công!`, 'success');
      }
      setIsTableModalOpen(false);
      await onRefreshData();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi lưu thông tin bàn', 'error');
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bàn này khỏi sơ đồ mặt bằng?')) return;
    try {
      await restaurantApi.deleteTable(tableId);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      if (selectedTable?.id === tableId) setSelectedTable(null);
      onShowToast('Đã xóa bàn thành công', 'success');
      await onRefreshData();
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi khi xóa bàn', 'error');
    }
  };

  // Toggle Table Active
  const handleToggleTableActive = async (tableId: string) => {
    try {
      const updated = await restaurantApi.toggleTableActive(tableId);
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTable?.id === updated.id) setSelectedTable(updated);
      onShowToast(`Đã ${updated.isActive ? 'kích hoạt' : 'ngừng hoạt động'} bàn ${updated.tableCode}`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Lỗi thay đổi trạng thái bàn', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="bg-white border border-[#EBE5DC] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Floor Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#8C6A43] uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Layers className="w-4 h-4" />
            <span>Mặt Bằng:</span>
          </span>
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#E0D7C9]/70">
            {floorPlans.map((floor) => (
              <button
                key={floor.id}
                onClick={() => onSelectFloorId(floor.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentFloor?.id === floor.id
                    ? 'bg-gradient-to-r from-[#C4A480] to-[#B3936F] text-white shadow-2xs'
                    : 'text-[#6B5E54] hover:text-[#1C1917]'
                }`}
              >
                {floor.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Snap to grid switch */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
              snapToGrid
                ? 'bg-[#FAF4EB] border-[#C4A480] text-[#8C6A43]'
                : 'bg-white border-[#EBE5DC] text-[#78716C]'
            }`}
          >
            <span>Hít Lưới 20px:</span>
            <span className="font-bold">{snapToGrid ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Add Table Button */}
          <button
            onClick={openAddTableModal}
            className="btn-tan-outline px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Bàn Mới</span>
          </button>

          {/* Publish / Unpublish */}
          <button
            onClick={handleTogglePublish}
            className={`px-4 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer border transition-colors ${
              currentFloor?.isPublished
                ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
            }`}
          >
            {currentFloor?.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{currentFloor?.isPublished ? 'Đang Xuất Bản' : 'Bản Nháp'}</span>
          </button>

          {/* Save Layout Positions Button */}
          <button
            onClick={handleSavePositions}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-[#3D7058] to-[#2D5A44] text-white hover:brightness-105 animate-pulse'
                : 'bg-[#E8DFD1] text-[#78716C] cursor-not-allowed opacity-60'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang Lưu...' : hasUnsavedChanges ? 'Lưu Vị Trí Bàn *' : 'Đã Lưu Vị Trí'}</span>
          </button>
        </div>
      </div>

      {/* Main Floor Blueprint Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Canvas Area (Span 3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#EBE5DC] rounded-3xl p-4 shadow-sm overflow-hidden flex flex-col">
          {/* Canvas Sub-header */}
          <div className="flex items-center justify-between pb-3 px-2 border-b border-[#EBE5DC]/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3D7058] animate-ping" />
              <span className="font-serif font-bold text-[#1C1917] text-sm">{currentFloor?.name}</span>
              <span className="text-[#78716C] font-mono text-[11px]">
                ({currentFloor?.widthPx || 1600}px × {currentFloor?.heightPx || 900}px) • {tables.length} Bàn
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E0D7C9]/60">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] rounded-lg cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-[#8C6A43]">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] rounded-lg cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] rounded-lg cursor-pointer"
                title="Đặt lại zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            className="relative w-full h-[580px] overflow-auto rounded-2xl mt-3 select-none floor-blueprint-bg border border-[#E8DFD1]/80 shadow-inner"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Compass watermark */}
            <div className="absolute bottom-4 right-5 pointer-events-none opacity-20 flex flex-col items-center">
              <Compass className="w-14 h-14 text-[#8C6A43]" />
              <span className="text-[9px] font-serif font-bold text-[#8C6A43] tracking-widest mt-0.5">NORTH • BẮC</span>
            </div>

            {/* Inner Scaled Canvas */}
            <div
              ref={canvasRef}
              className="relative transition-transform duration-75 origin-top-left"
              style={{
                width: `${currentFloor?.widthPx || 1600}px`,
                height: `${currentFloor?.heightPx || 900}px`,
                transform: `scale(${zoomLevel})`,
              }}
              onClick={() => setSelectedTable(null)}
            >
              {/* Floor Landmark Decor (Panoramic glass window, Bar counter) */}
              <div className="absolute top-2 left-6 right-6 py-2 px-6 bg-gradient-to-r from-sky-100/60 via-sky-50/40 to-sky-100/60 rounded-xl border border-sky-200/80 flex items-center justify-between pointer-events-none">
                <span className="text-[11px] font-bold text-sky-800 tracking-wider uppercase font-sans">
                  ✨ Vách Kính Toàn Cảnh Panoramic • Mặt Tiền Hướng Phố
                </span>
                <span className="text-[10px] text-sky-700 bg-white/80 px-2 py-0.5 rounded-full border border-sky-300">
                  Phố Đi Bộ Nguyễn Huệ
                </span>
              </div>

              <div className="absolute left-6 top-24 bottom-24 w-16 bg-gradient-to-b from-[#2C221E] to-[#1C1917] rounded-2xl border border-amber-900/40 flex flex-col items-center justify-center p-2 text-white pointer-events-none shadow-md">
                <span
                  className="text-[10px] uppercase font-bold tracking-widest text-[#C4A480] transform -rotate-90 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  Quầy Bar & Mixology
                </span>
              </div>

              {/* Render Draggable Tables */}
              {tables.map((table) => {
                const isSelected = selectedTable?.id === table.id;
                const isDragging = draggingTableId === table.id;
                const isCircle = table.shape === 'CIRCLE';
                const isSquare = table.shape === 'SQUARE';

                return (
                  <div
                    key={table.id}
                    onMouseDown={(e) => handleMouseDown(e, table)}
                    style={{
                      left: `${table.posX}px`,
                      top: `${table.posY}px`,
                      width: `${table.width}px`,
                      height: `${table.height}px`,
                    }}
                    className={`absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-shadow select-none ${
                      isCircle
                        ? 'rounded-full'
                        : isSquare
                        ? 'rounded-2xl'
                        : 'rounded-xl'
                    } ${
                      isSelected
                        ? 'ring-4 ring-[#C4A480] shadow-xl z-30'
                        : 'shadow-md hover:shadow-lg z-20'
                    } ${
                      isDragging ? 'opacity-80 scale-105 z-40' : ''
                    } ${
                      table.isActive
                        ? table.zoneType === 'VIP'
                          ? 'bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-400 text-amber-900'
                          : table.zoneType === 'WINDOW_VIEW'
                          ? 'bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-400 text-sky-950'
                          : table.zoneType === 'OUTDOOR'
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 text-emerald-950'
                          : 'bg-white border-2 border-[#C4A480] text-[#2C221E]'
                        : 'bg-gray-100 border-2 border-dashed border-gray-400 text-gray-500 opacity-60'
                    }`}
                  >
                    {/* Table Code */}
                    <span className="font-serif font-bold text-xs leading-none">
                      {table.tableCode}
                    </span>

                    {/* Capacity badge */}
                    <span className="text-[10px] font-semibold text-[#8C6A43] mt-1 leading-none">
                      {table.minCapacity}-{table.maxCapacity} Ghế
                    </span>

                    {/* Zone small label */}
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#78716C] mt-0.5">
                      {table.zoneType === 'WINDOW_VIEW' && 'View Phố'}
                      {table.zoneType === 'VIP' && 'VIP'}
                      {table.zoneType === 'OUTDOOR' && 'Ngoài Trời'}
                      {table.zoneType === 'BAR_SIDE' && 'Cạnh Bar'}
                      {table.zoneType === 'STANDARD' && 'Chuẩn'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Inspector & Detail Panel (Span 1 col) */}
        <div className="bg-white border border-[#EBE5DC] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
              <h3 className="font-serif font-bold text-base text-[#1C1917]">
                Thông Tin Bàn
              </h3>
              <Sparkles className="w-4 h-4 text-[#C4A480]" />
            </div>

            {selectedTable ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E0D7C9]/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#8C6A43] tracking-wider block">
                        Đang Chọn
                      </span>
                      <h4 className="font-serif text-xl font-bold text-[#1C1917]">
                        Bàn {selectedTable.tableCode}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedTable.isActive
                          ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                          : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                      }`}
                    >
                      {selectedTable.isActive ? 'Đang Hoạt Động' : 'Ngừng Phục Vụ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE5DC]">
                      <span className="text-[10px] text-[#78716C] block">Sức Chứa:</span>
                      <span className="font-bold text-[#1C1917]">
                        {selectedTable.minCapacity} - {selectedTable.maxCapacity} Khách
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE5DC]">
                      <span className="text-[10px] text-[#78716C] block">Khu Vực:</span>
                      <span className="font-bold text-[#8C6A43]">{selectedTable.zoneType}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE5DC]">
                      <span className="text-[10px] text-[#78716C] block">Hình Dạng:</span>
                      <span className="font-bold text-[#1C1917]">
                        {selectedTable.shape === 'RECT' && 'Chữ Nhật'}
                        {selectedTable.shape === 'SQUARE' && 'Hình Vuông'}
                        {selectedTable.shape === 'CIRCLE' && 'Bàn Tròn'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-[#EBE5DC]">
                      <span className="text-[10px] text-[#78716C] block">Kích Thước:</span>
                      <span className="font-bold text-[#1C1917]">
                        {selectedTable.width} × {selectedTable.height}px
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#78716C] font-mono bg-white p-2 rounded-xl border border-[#EBE5DC] flex items-center justify-between">
                    <span>Tọa Độ Mặt Bằng:</span>
                    <span className="font-bold text-[#8C6A43]">
                      X: {Math.round(selectedTable.posX)}px | Y: {Math.round(selectedTable.posY)}px
                    </span>
                  </div>
                </div>

                {/* Table Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => openEditTableModal(selectedTable)}
                    className="w-full btn-tan py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh Sửa Thông Tin Bàn</span>
                  </button>

                  <button
                    onClick={() => handleToggleTableActive(selectedTable.id)}
                    className="w-full py-2 text-xs font-semibold rounded-xl border border-[#EBE5DC] hover:bg-[#FAF7F2] text-[#44403C] transition-colors cursor-pointer"
                  >
                    {selectedTable.isActive ? 'Tạm Ngừng Hoạt Động Bàn' : 'Kích Hoạt Lại Bàn'}
                  </button>

                  <button
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="w-full py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Bàn Khỏi Sơ Đồ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[#78716C] space-y-2">
                <Maximize2 className="w-8 h-8 text-[#C4A480]/60 mx-auto" />
                <p className="text-xs">Chạm vào một bàn bất kỳ trên sơ đồ để kéo thả hoặc chỉnh sửa thông số.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#EBE5DC] text-[11px] text-[#78716C]">
            💡 <span className="font-semibold text-[#8C6A43]">Mẹo:</span> Kéo thả bàn để thay đổi vị trí. Nhấn <strong>Lưu Vị Trí Bàn</strong> ở thanh công cụ để đồng bộ cơ sở dữ liệu.
          </div>
        </div>
      </div>

      {/* CREATE / EDIT TABLE MODAL */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE5DC] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
              <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                {modalMode === 'create' ? '+ Thêm Bàn Mới Vào Sơ Đồ' : `Chỉnh Sửa Bàn ${tableFormData.tableCode}`}
              </h3>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="p-1 rounded-full text-[#78716C] hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTableForm} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#2C221E] block mb-1">Mã Bàn *</label>
                <input
                  type="text"
                  required
                  value={tableFormData.tableCode}
                  onChange={(e) => setTableFormData({ ...tableFormData, tableCode: e.target.value })}
                  placeholder="VD: T-01, VIP-02, BAR-03..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2] font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Khu Vực (Zone) *</label>
                  <select
                    value={tableFormData.zoneType}
                    onChange={(e) => setTableFormData({ ...tableFormData, zoneType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                  >
                    <option value="STANDARD">Tiêu Chuẩn (Standard)</option>
                    <option value="WINDOW_VIEW">Mặt Kính View Phố (Window)</option>
                    <option value="VIP">Phòng VIP Riêng Tư</option>
                    <option value="OUTDOOR">Ngoài Trời (Outdoor)</option>
                    <option value="BAR_SIDE">Cạnh Quầy Bar</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Hình Dạng *</label>
                  <select
                    value={tableFormData.shape}
                    onChange={(e) => setTableFormData({ ...tableFormData, shape: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                  >
                    <option value="RECT">Chữ Nhật (Rectangle)</option>
                    <option value="SQUARE">Hình Vuông (Square)</option>
                    <option value="CIRCLE">Bàn Tròn (Circle)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Sức Chứa Tối Thiểu *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={tableFormData.minCapacity}
                    onChange={(e) => setTableFormData({ ...tableFormData, minCapacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Sức Chứa Tối Đa *</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={tableFormData.maxCapacity}
                    onChange={(e) => setTableFormData({ ...tableFormData, maxCapacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Chiều Rộng (px)</label>
                  <input
                    type="number"
                    min={40}
                    max={300}
                    value={tableFormData.width}
                    onChange={(e) => setTableFormData({ ...tableFormData, width: parseInt(e.target.value) || 80 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#2C221E] block mb-1">Chiều Cao (px)</label>
                  <input
                    type="number"
                    min={40}
                    max={300}
                    value={tableFormData.height}
                    onChange={(e) => setTableFormData({ ...tableFormData, height: parseInt(e.target.value) || 80 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#2C221E] block mb-1">Tiền Cọc Bàn Riêng (VNĐ)</label>
                <input
                  type="number"
                  step={50000}
                  value={tableFormData.customDeposit}
                  onChange={(e) => setTableFormData({ ...tableFormData, customDeposit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0D7C9] focus:outline-hidden focus:border-[#C4A480] bg-[#FAF7F2]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={tableFormData.isActive}
                  onChange={(e) => setTableFormData({ ...tableFormData, isActive: e.target.checked })}
                  className="rounded-sm accent-[#C4A480] w-4 h-4"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-semibold text-[#2C221E] cursor-pointer">
                  Kích hoạt bàn sẵn sàng đón khách
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EBE5DC]">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78716C] hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-tan px-6 py-2 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {modalMode === 'create' ? 'Tạo Bàn' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
