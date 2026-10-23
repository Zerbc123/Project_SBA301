import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import type { AuthUser } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser, accessToken: string, refreshToken: string) => void;
}

type AuthTab = 'login' | 'register';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetFormFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTabSwitch = (tab: AuthTab) => {
    setActiveTab(tab);
    resetFormFeedback();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin đăng nhập.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (data.message) {
          throw new Error(data.message);
        }
        if (response.status === 401) {
          throw new Error('Email/SĐT hoặc mật khẩu không chính xác.');
        } else if (response.status === 403) {
          throw new Error('Tài khoản bị vô hiệu hóa hoặc không có quyền truy cập.');
        }
        throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
      }

      setSuccessMsg(`Đăng nhập thành công! Chào mừng ${data.user.fullName}`);
      localStorage.setItem('tm_access_token', data.accessToken);
      localStorage.setItem('tm_refresh_token', data.refreshToken);
      localStorage.setItem('tm_user', JSON.stringify(data.user));

      setTimeout(() => {
        onLoginSuccess(data.user, data.accessToken, data.refreshToken);
        onClose();
      }, 700);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ Authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();

    if (!regFullName.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với Điều khoản dịch vụ.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Đăng ký không thành công (${response.status}).`);
      }

      setSuccessMsg(`Đăng ký tài khoản thành công! Xin chào ${data.user.fullName}`);
      localStorage.setItem('tm_access_token', data.accessToken);
      localStorage.setItem('tm_refresh_token', data.refreshToken);
      localStorage.setItem('tm_user', JSON.stringify(data.user));

      setTimeout(() => {
        onLoginSuccess(data.user, data.accessToken, data.refreshToken);
        onClose();
      }, 900);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Lỗi kết nối máy chủ khi đăng ký tài khoản.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#1C1917] border border-[#C4A480]/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-200 z-10 overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#C4A480]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C4A480] to-[#8C6A43] text-white flex items-center justify-center font-serif text-xl font-bold shadow-md border border-[#E8DFD1]/20">
              P
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-amber-100 leading-tight">
                LE PRIME BISTRO
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-[#C4A480] font-semibold">
                TableMaster Hospitality Identity
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-2xl bg-stone-900/90 p-1 mb-6 border border-stone-800">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#8C6A43] text-stone-950 font-bold shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-[#C4A480] to-[#8C6A43] text-stone-950 font-bold shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng Ký</span>
            </button>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* FORM: ĐĂNG NHẬP */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Email hoặc Số Điện Thoại
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Ví dụ: admin@primebistro.vn hoặc 090..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Mật Khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-200 transition cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-400 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-stone-800 border-stone-700 text-[#C4A480] accent-[#C4A480]"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[#C4A480] hover:underline">
                  Quên mật khẩu?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C4A480] to-[#8C6A43] hover:from-[#d5b591] hover:to-[#9c764e] text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-[#8C6A43]/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
              </button>

              <div className="text-center text-xs text-stone-400 pt-2">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('register')}
                  className="text-[#C4A480] font-semibold hover:underline cursor-pointer"
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          )}

          {/* FORM: ĐĂNG KÝ */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Họ và Tên
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Số Điện Thoại
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="an@gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Mật Khẩu (Tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-2.5 text-stone-400 hover:text-stone-200 transition cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Xác Nhận Mật Khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#C4A480] transition"
                  />
                </div>
              </div>

              <div className="text-xs text-stone-400 pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 mt-0.5 rounded bg-stone-800 border-stone-700 text-[#C4A480] accent-[#C4A480]"
                  />
                  <span className="leading-tight text-[11px]">
                    Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của TableMaster.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C4A480] to-[#8C6A43] hover:from-[#d5b591] hover:to-[#9c764e] text-stone-950 font-bold text-sm tracking-wide shadow-lg shadow-[#8C6A43]/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới'}
              </button>

              <div className="text-center text-xs text-stone-400 pt-1">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('login')}
                  className="text-[#C4A480] font-semibold hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
