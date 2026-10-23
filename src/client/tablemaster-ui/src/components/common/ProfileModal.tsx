import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Image as ImageIcon, Utensils, ShieldAlert, CheckCircle2, Star, Crown } from 'lucide-react';
import type { AuthUser, LoyaltyWallet } from '../../types';
import { authStorage } from '../../services/authStorage';

interface ProfileModalProps {
  isOpen: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onProfileUpdated: (user: AuthUser) => void;
}

const QUICK_TAGS = [
  'Dị ứng hải sản',
  'Dị ứng đậu phộng',
  'Không dung nạp gluten',
  'Dị ứng sữa bò',
  'Ăn chay',
  'Eat-clean',
  'Không ăn cay',
  'Thích vang đỏ',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [dietary, setDietary] = useState('');
  const [wallet, setWallet] = useState<LoyaltyWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
      setDietary(user.dietaryPreferences ?? '');
      setErrorMsg(null);
      setSuccessMsg(null);

      const accessToken = authStorage.getAccessToken();
      if (accessToken) {
        fetch('/api/v1/auth/loyalty', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) setWallet(data);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const addTag = (tag: string) => {
    if (dietary.includes(tag)) return;
    setDietary((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Họ và tên không được để trống.');
      return;
    }
    if (dietary.length > 1000) {
      setErrorMsg('Ghi chú sở thích không được vượt quá 1000 ký tự.');
      return;
    }

    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          avatarUrl: avatarUrl.trim(),
          dietaryPreferences: dietary.trim(),
        }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(data.message || 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        }
        throw new Error(data.message || data.error || `Cập nhật thất bại (${response.status}).`);
      }

      authStorage.setUser(data as AuthUser);
      onProfileUpdated(data as AuthUser);
      setSuccessMsg('Đã lưu hồ sơ của bạn.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm cursor-pointer"
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

          <h2 className="font-serif text-xl font-bold text-amber-100 mb-1">Hồ Sơ &amp; Sở Thích Ẩm Thực</h2>
          <p className="text-[11px] text-stone-400 mb-4">
            {user.email} • {user.phone}
          </p>

          {/* VIP & Loyalty Wallet Card */}
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-[#C4A480]/30 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    (wallet?.vipTier || user.vipTier) === 'DIAMOND'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                      : (wallet?.vipTier || user.vipTier) === 'GOLD'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : (wallet?.vipTier || user.vipTier) === 'SILVER'
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-stone-800 text-[#C4A480] border border-[#C4A480]/30'
                  }`}
                >
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-100 flex items-center gap-2">
                    <span>Hạng VIP: {wallet?.vipTierName || user.vipTierName || 'Đồng'}</span>
                    {(wallet?.depositDiscountPercent ?? 0) > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/80 font-semibold">
                        Giảm {wallet?.depositDiscountPercent}% cọc
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {wallet?.pointsToNextTier && wallet.pointsToNextTier > 0
                      ? `Cần thêm ${wallet.pointsToNextTier} điểm để lên hạng tiếp theo`
                      : 'Đã đạt hạng thành viên cao nhất'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-[#C4A480] flex items-center justify-end gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#C4A480]" />
                  <span>{wallet?.loyaltyPoints ?? user.loyaltyPoints ?? 0}</span>
                </div>
                <div className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold">Điểm tích lũy</div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">Họ và Tên</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">Ảnh đại diện (URL)</label>
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <input
                  type="url"
                  value={avatarUrl}
                  maxLength={500}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Dị ứng, chế độ ăn &amp; món yêu thích
              </label>
              <div className="relative">
                <Utensils className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <textarea
                  rows={4}
                  value={dietary}
                  maxLength={1000}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="Ví dụ: Dị ứng tôm cua, ăn chay, thích vang đỏ..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[#C4A480]/40 text-[#C4A480] hover:bg-[#C4A480]/10 transition cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-stone-500 mt-1 text-right">{dietary.length}/1000</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C4A480] to-[#8C6A43] hover:from-[#d5b591] hover:to-[#9c764e] text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-[#8C6A43]/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
