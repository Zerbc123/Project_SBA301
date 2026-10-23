import React from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles, Clock, Lock } from 'lucide-react';
import type { TableItem } from '../../types';


interface TableNodeProps {
  table: TableItem;
  isSelected?: boolean;
  onSelect?: (table: TableItem) => void;
  showTooltip?: boolean;
  interactive?: boolean;
  isHeatmapMode?: boolean;
}

export const TableNode: React.FC<TableNodeProps> = ({
  table,
  isSelected = false,
  onSelect,
  interactive = true,
  isHeatmapMode = false,
}) => {
  const isCircle = table.shape === 'circle';

  // Status-based color config
  const getStatusStyles = () => {
    if (isHeatmapMode) {
      // Heatmap mode: gradient from soft emerald to deep red based on revenue
      const rev = table.revenueGenerated || 2000000;
      if (rev > 15000000) return 'bg-rose-600 text-white border-rose-800 shadow-rose-500/50';
      if (rev > 8000000) return 'bg-amber-500 text-white border-amber-700 shadow-amber-500/40';
      if (rev > 4000000) return 'bg-emerald-500 text-white border-emerald-700 shadow-emerald-500/30';
      return 'bg-blue-400 text-white border-blue-600 shadow-blue-400/20';
    }

    switch (table.status) {
      case 'AVAILABLE':
        return isSelected
          ? 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50 text-amber-950 border-amber-500 ring-4 ring-amber-400/50 shadow-xl shadow-amber-500/25 scale-105 z-20'
          : 'bg-emerald-50 text-emerald-800 border-emerald-400 hover:border-emerald-600 hover:bg-emerald-100/80 shadow-sm';
      case 'HOLDING':
        return 'bg-amber-50 text-amber-800 border-amber-400 shadow-md ring-2 ring-amber-400/50';
      case 'CONFIRMED':
        return 'bg-rose-50 text-rose-800 border-rose-300 cursor-not-allowed opacity-90';
      case 'SEATED':
        return 'bg-blue-50 text-blue-800 border-blue-400 cursor-default';
      case 'CLEANING':
        return 'bg-slate-100 text-slate-700 border-slate-300 cursor-default';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-300';
    }
  };

  const getStatusDot = () => {
    switch (table.status) {
      case 'AVAILABLE':
        return 'bg-emerald-500';
      case 'HOLDING':
        return 'bg-amber-500';
      case 'CONFIRMED':
        return 'bg-rose-500';
      case 'SEATED':
        return 'bg-blue-500';
      case 'CLEANING':
        return 'bg-slate-400';
      default:
        return 'bg-gray-400';
    }
  };

  const handleClick = () => {
    if (!interactive) return;
    if (onSelect) onSelect(table);
  };

  // Generate chair markers around perimeter
  const renderChairs = () => {
    const chairs = [];
    const count = table.capacity;

    if (isCircle) {
      const radius = (table.width / 2) + 10;
      for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
        const cx = table.width / 2 + radius * Math.cos(angle);
        const cy = table.height / 2 + radius * Math.sin(angle);
        chairs.push(
          <div
            key={i}
            className="absolute w-3.5 h-3.5 rounded-full bg-amber-900/20 border border-amber-900/30 shadow-xs pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all"
            style={{ left: `${cx}px`, top: `${cy}px` }}
          />
        );
      }
    } else {
      // Rectangular table: distribute chairs on top & bottom or sides
      const topCount = Math.ceil(count / 2);
      const bottomCount = Math.floor(count / 2);

      for (let i = 0; i < topCount; i++) {
        const leftPercent = ((i + 1) / (topCount + 1)) * 100;
        chairs.push(
          <div
            key={`top-${i}`}
            className="absolute w-3.5 h-3 rounded-t-sm bg-amber-900/20 border border-amber-900/30 pointer-events-none -translate-x-1/2 -top-2.5"
            style={{ left: `${leftPercent}%` }}
          />
        );
      }
      for (let i = 0; i < bottomCount; i++) {
        const leftPercent = ((i + 1) / (bottomCount + 1)) * 100;
        chairs.push(
          <div
            key={`bottom-${i}`}
            className="absolute w-3.5 h-3 rounded-b-sm bg-amber-900/20 border border-amber-900/30 pointer-events-none -translate-x-1/2 -bottom-2.5"
            style={{ left: `${leftPercent}%` }}
          />
        );
      }
    }
    return chairs;
  };

  return (
    <div
      onClick={handleClick}
      className={`absolute group select-none transition-transform duration-200 ${
        interactive ? 'cursor-pointer active:scale-95' : ''
      }`}
      style={{
        left: `${table.x}px`,
        top: `${table.y}px`,
        width: `${table.width}px`,
        height: `${table.height}px`,
      }}
    >
      {/* Chairs around table */}
      {!isHeatmapMode && renderChairs()}

      {/* Pulsing ring when holding */}
      {table.status === 'HOLDING' && (
        <div
          className={`absolute inset-[-6px] rounded-${
            isCircle ? 'full' : '2xl'
          } border-2 border-amber-500/60 pulse-ring pointer-events-none`}
        />
      )}

      {/* Floating 5-min timer chip when holding */}
      {table.status === 'HOLDING' && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-20 animate-bounce">
          <Clock className="w-2.5 h-2.5" />
          <span>04:59</span>
        </div>
      )}

      {/* Selected Indicator Glow & Badge */}
      {isSelected && (
        <>
          <div
            className={`absolute -inset-1 rounded-${
              isCircle ? 'full' : '2xl'
            } bg-amber-500/25 blur-sm pointer-events-none animate-pulse`}
          />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-1 z-30 animate-bounce">
            <Sparkles className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
            <span>Bạn Chọn</span>
          </div>
        </>
      )}

      {/* Main Table Body */}
      <motion.div
        whileHover={interactive ? { scale: 1.04 } : undefined}
        className={`relative w-full h-full flex flex-col items-center justify-center border-2 shadow-sm transition-all duration-200 ${
          isCircle ? 'rounded-full' : 'rounded-2xl'
        } ${getStatusStyles()}`}
      >
        {/* Table Code */}
        <div className="flex items-center gap-1">
          <span className="font-serif font-bold text-xs sm:text-sm tracking-wide">
            {table.code}
          </span>
          {table.zone === 'VIP' && (
            <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
          )}
        </div>

        {/* Capacity / Status Info */}
        <div className="flex items-center gap-1 mt-0.5 text-[10px] font-medium opacity-90">
          <Users className="w-2.5 h-2.5" />
          <span>{table.capacity} Ghế</span>
        </div>

        {/* Status Dot */}
        <div
          className={`w-2 h-2 rounded-full mt-1 ${getStatusDot()} shadow-xs`}
        />

        {/* Locked icon for confirmed/occupied */}
        {table.status === 'CONFIRMED' && (
          <div className="absolute top-1 right-1 text-rose-500/80">
            <Lock className="w-2.5 h-2.5" />
          </div>
        )}
      </motion.div>

      {/* Hover Tooltip Card */}
      <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none transition-all">
        <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs py-2 px-3 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap min-w-[140px]">
          <div className="font-serif font-bold text-amber-300 flex items-center justify-between gap-2">
            <span>Bàn {table.code}</span>
            <span className="text-[10px] uppercase font-sans tracking-wider bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
              {table.zone}
            </span>
          </div>
          <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
            <span>Sức chứa:</span>
            <span className="font-semibold text-white">{table.capacity} khách</span>
          </div>
          <div className="text-[11px] text-slate-300 flex items-center justify-between">
            <span>Cọc giữ chỗ:</span>
            <span className="font-semibold text-amber-400 font-mono">
              {new Intl.NumberFormat('vi-VN').format(table.depositPrice)} đ
            </span>
          </div>
          {table.currentGuestName && (
            <div className="text-[10px] text-emerald-400 mt-1 pt-1 border-t border-slate-800">
              Khách: {table.currentGuestName}
            </div>
          )}
        </div>
        {/* Tooltip arrow */}
        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700" />
      </div>
    </div>
  );
};
