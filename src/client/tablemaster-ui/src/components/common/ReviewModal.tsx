import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Utensils,
  HeartHandshake,
  Eye,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  LogIn,
  Send,
} from 'lucide-react';
import type { AuthUser, ReviewItem } from '../../types';

interface ReviewModalProps {
  isOpen: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onReviewSubmitted: (review: ReviewItem, updatedPoints: number) => void;
  onOpenLogin: () => void;
  defaultBookingId?: string;
}

const RATING_DESCRIPTIONS: Record<string, string[]> = {
  food: ['', 'Chưa đạt kỳ vọng', 'Bình thường', 'Khá ngon miệng', 'Rất ngon & chuẩn vị', 'Đỉnh cao ẩm thực Pháp'],
  service: ['', 'Chưa chu đáo', 'Tạm ổn', 'Phục vụ nhiệt tình', 'Rất chuyên nghiệp', 'Chu đáo & Đẳng cấp'],
  ambiance: ['', 'Khá ồn ào', 'Bình thường', 'Không gian ấm cúng', 'Sang trọng & View đẹp', 'Không gian tuyệt mỹ độc bản'],
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  user,
  onClose,
  onReviewSubmitted,
  onOpenLogin,
  defaultBookingId,
}) => {
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [ambianceRating, setAmbianceRating] = useState(5);
  const [comment, setComment] = useState('');
  const [bookingId, setBookingId] = useState(defaultBookingId || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStarClick = (category: 'food' | 'service' | 'ambiance', val: number) => {
    if (category === 'food') setFoodRating(val);
    else if (category === 'service') setServiceRating(val);
    else setAmbianceRating(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để gửi đánh giá và nhận +50 điểm tích lũy.');
      return;
    }

    const accessToken = localStorage.getItem('tm_access_token');
    if (!accessToken) {
      setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        foodRating,
        serviceRating,
        ambianceRating,
        comment: comment.trim() || undefined,
      };

      if (bookingId.trim()) {
        payload.bookingId = bookingId.trim();
      }

      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || `Gửi đánh giá thất bại (${res.status})`);
      }

      const newPoints = (user.loyaltyPoints ?? 0) + (data.pointsAwarded || 50);
      const updatedUser = {
        ...user,
        loyaltyPoints: newPoints,
      };
      localStorage.setItem('tm_user', JSON.stringify(updatedUser));

      setSuccessMsg('Cảm ơn bạn! Đã nhận được +50 điểm tích lũy thành viên.');
      onReviewSubmitted(data as ReviewItem, newPoints);

      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRow = (
    label: string,
    icon: React.ReactNode,
    category: 'food' | 'service' | 'ambiance',
    currentVal: number
  ) => {
    return (
      <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            {icon}
            <span>{label}</span>
          </div>
          <span className="text-[11px] font-medium text-amber-300">
            {RATING_DESCRIPTIONS[category][currentVal]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(category, star)}
              className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= currentVal
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                    : 'text-stone-600 hover:text-stone-400'
                }`}
              />
            </button>
          ))}
          <span className="ml-auto text-xs font-mono font-bold text-[#C4A480]">{currentVal} / 5</span>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#1C1917] border border-[#C4A480]/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-200 z-10"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>UC-14 • Khảo Sát CSAT Sau Bữa Ăn</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-100">
              Đánh Giá Trải Nghiệm Ẩm Thực
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Ý kiến quý giá của bạn giúp Le Prime Bistro không ngừng nâng cao chất lượng dịch vụ.
            </p>
          </div>

          {/* Loyalty Reward Banner */}
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border border-[#C4A480]/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                ⭐
              </div>
              <div>
                <div className="text-xs font-bold text-amber-200">Tặng +50 Điểm Tích Lũy Thành Viên</div>
                <div className="text-[10px] text-stone-400">Tự động cộng vào ví Loyalty sau khi hoàn thành</div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#C4A480] bg-amber-950/80 px-2 py-1 rounded-lg border border-amber-800/40">
              +50 pts
            </span>
          </div>

          {!user ? (
            <div className="text-center py-6 px-4 bg-stone-900/60 rounded-2xl border border-stone-800">
              <p className="text-sm text-stone-300 mb-3">
                Vui lòng đăng nhập để gửi đánh giá và nhận ngay <strong className="text-amber-400">+50 điểm</strong> vào ví thành viên của bạn.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C4A480] to-[#8C6A43] hover:from-[#d5b591] hover:to-[#9c764e] text-stone-950 font-bold text-xs tracking-wide shadow-lg inline-flex items-center gap-2 cursor-pointer active:scale-95 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập Ngay</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {renderStarRow('Món Ăn & Rượu Vang', <Utensils className="w-4 h-4 text-amber-400" />, 'food', foodRating)}
              {renderStarRow('Thái Độ Phục Vụ', <HeartHandshake className="w-4 h-4 text-rose-400" />, 'service', serviceRating)}
              {renderStarRow('Không Gian & Tầm View Bàn', <Eye className="w-4 h-4 text-cyan-400" />, 'ambiance', ambianceRating)}

              {/* Nhận xét tự do */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Nhận xét &amp; Góp ý trải nghiệm
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Hương vị món ăn, độ chín bít tết, sự tận tình của nhân viên hoặc cảm giác khi ngồi tại bàn..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition resize-none"
                />
                <div className="text-[10px] text-stone-500 text-right mt-0.5">{comment.length}/1000</div>
              </div>

              {/* Mã đơn đặt bàn (tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Mã Đơn Đặt Bàn (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="Ví dụ: BK-1024 hoặc để trống"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C4A480] to-[#8C6A43] hover:from-[#d5b591] hover:to-[#9c764e] text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-[#8C6A43]/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Đang gửi đánh giá...' : 'Gửi Đánh Giá & Nhận 50 Điểm'}</span>
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
