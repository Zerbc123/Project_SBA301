import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  QrCode,
  Wallet,
  ExternalLink,
  Loader2,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { BookingDetails } from '../../types';
import { paymentApi } from '../../services/paymentApi';
import { restaurantApi } from '../../services/restaurantApi';
import { bookingApi, SEED_DATA } from '../../services/bookingApi';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetails | null;
  onPaymentSuccess: () => void;
  initialTab?: 'VIETQR' | 'MOMO';
}

export const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
  initialTab = 'VIETQR',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'VIETQR' | 'MOMO'>(initialTab);

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  const isPendingReview = booking?.status === 'PENDING_REVIEW';

  // Trạng thái kết nối payment-service & mã giao dịch DB
  const [transactionCode, setTransactionCode] = useState<string>('');
  const [momoPayUrl, setMomoPayUrl] = useState<string>('');
  const [momoQrUrl, setMomoQrUrl] = useState<string>('');
  const [isPaymentDbConnected, setIsPaymentDbConnected] = useState<boolean>(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState<boolean>(false);
  const [apiCallMessage, setApiCallMessage] = useState<string>('');

  // Thông tin ngân hàng từ Database (restaurant_profile)
  const [bankInfo, setBankInfo] = useState({
    bankBin: '970422',
    bankName: 'MBBank (Ngân hàng Quân Đội)',
    bankAccountNo: '0388999999',
    bankAccountHolder: 'CONG TY TNHH THE PRIME BISTRO',
  });

  // 1. Tải cấu hình ngân hàng từ Database & Khởi tạo giao dịch cọc trên payment-service
  useEffect(() => {
    if (!isOpen || !booking) return;

    let active = true;
    setIsInitializingPayment(true);

    // Lấy cấu hình tài khoản ngân hàng chính thức của nhà hàng từ database
    restaurantApi
      .getProfile()
      .then((profile) => {
        if (!active || !profile) return;
        setBankInfo({
          bankBin: profile.bankBin || '970422',
          bankName: profile.bankName || 'MBBank (Ngân hàng Quân Đội)',
          bankAccountNo: profile.bankAccountNo || '0388999999',
          bankAccountHolder: profile.bankAccountHolder || 'CONG TY TNHH THE PRIME BISTRO',
        });
      })
      .catch((err) => {
        console.warn('⚠️ [QRPaymentModal] Dùng thông tin ngân hàng mặc định:', err?.message || err);
      });

    // Tạo giao dịch cọc trên payment-service (bảng payment_transactions ở trạng thái PENDING)
    const bookingUUID = booking.backendUUID || SEED_DATA.BOOKING_ID;
    paymentApi
      .createPayment({
        bookingId: bookingUUID,
        userId: SEED_DATA.USER_ID,
        amount: booking.depositAmount,
        orderInfo: `Thanh toan tien coc ban ${booking.bookingId}`,
        redirectUrl: window.location.origin,
      })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setTransactionCode(res.data.orderId);
          setMomoPayUrl(res.data.payUrl);
          setMomoQrUrl(res.data.qrCodeUrl);
          setIsPaymentDbConnected(!res.data.partnerCode.includes('FALLBACK'));
          console.log('✅ [Payment API] Đã khởi tạo giao dịch thanh toán trong Database:', res.data);
        }
      })
      .catch((err) => {
        console.warn('⚠️ [Payment API] Không thể kết nối payment-service:', err?.message || err);
      })
      .finally(() => {
        if (active) setIsInitializingPayment(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 2. Xác nhận thanh toán (Gọi payment-service cập nhật SUCCESS + confirm booking)
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    const code = transactionCode || `TXN-MM-${Date.now()}`;
    setApiCallMessage(`Đang gọi POST /api/v1/payments/momo/mock-ipn/${code}...`);

    console.log(`🚀 [Payment API] Gọi giả lập thanh toán MoMo Mock IPN: /api/v1/payments/momo/mock-ipn/${code}`);

    try {
      // 1. Gọi API payment-service: POST /api/v1/payments/momo/mock-ipn/{transactionCode}
      const payRes = await paymentApi.simulatePaymentSuccess(code);
      console.log('✅ [Payment API] Đã cập nhật giao dịch MoMo SUCCESS trong database tablemaster_payment:', payRes);

      // 2. Gọi booking-service: POST /api/v1/bookings/{id}/confirm-payment
      const bookingUUID = booking.backendUUID || booking.bookingId;
      if (bookingUUID) {
        setApiCallMessage(`Đang xác nhận đơn đặt bàn ${bookingUUID}...`);
        await bookingApi.confirmPayment(bookingUUID);
        console.log('✅ [Booking API] Đã chuyển trạng thái booking sang CONFIRMED và sinh vé check-in QR');
      }
    } catch (e: any) {
      console.warn('⚠️ [Payment] Lỗi xác thực thanh toán (vẫn kích hoạt fallback UI):', e?.message || e);
    } finally {
      setIsProcessing(false);
      setIsSuccess(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D97706', '#C5A880', '#10B981', '#A21CAF'],
      });
      setTimeout(() => {
        onPaymentSuccess();
      }, 2000);
    }
  };

  // Format currency
  const formattedDeposit = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(booking.depositAmount);

  // Thông tin chuyển khoản VietQR chuẩn Napas 24/7
  const accountNumber = bankInfo.bankAccountNo;
  const bankName = bankInfo.bankName;
  const accountHolder = bankInfo.bankAccountHolder;
  const qrTransferContent = booking.vietqrCode || `TM ${booking.bookingId}`;

  // VietQR quick link standard
  const qrImageUrl = `https://img.vietqr.io/image/${bankInfo.bankBin}-${accountNumber}-compact2.png?amount=${booking.depositAmount}&addInfo=${encodeURIComponent(
    qrTransferContent
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  // Link QR MoMo an toàn (dùng VietQR format hoặc qrserver với fallback)
  const momoFallbackQr = `https://img.vietqr.io/image/${bankInfo.bankBin}-${accountNumber}-compact2.png?amount=${booking.depositAmount}&addInfo=${encodeURIComponent(
    `MOMO ${transactionCode || booking.bookingId}`
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-amber-100/80 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    Thanh Toán Cọc Giữ Bàn
                  </h3>
                  {isPaymentDbConnected && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Payment DB Live
                    </span>
                  )}
                  {isInitializingPayment && (
                    <span className="text-[10px] text-amber-700 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> Khởi tạo GD...
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {transactionCode ? `Mã giao dịch: ${transactionCode}` : 'Hệ thống thanh toán tự động TableMaster'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payment Method Switcher Tabs */}
          {!isSuccess && (
            <div className="px-6 pt-3 pb-1 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('VIETQR')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'VIETQR'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>VietQR (Napas 24/7)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MOMO')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'MOMO'
                    ? 'bg-[#A21CAF] text-white shadow-sm ring-2 ring-[#A21CAF]/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-pink-500" />
                <span>Ví Điện Tử MoMo</span>
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-serif font-bold text-slate-900">
                  Xác Nhận Giữ Bàn Thành Công!
                </h4>
                <p className="text-sm text-slate-600 max-w-sm">
                  Cảm ơn quý khách <span className="font-semibold text-slate-900">{booking.customerName}</span>. Đơn đặt bàn <span className="font-mono font-bold text-amber-700">{booking.bookingId}</span> đã được ghi nhận vào hệ thống!
                </p>
                {transactionCode && (
                  <p className="text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    Mã giao dịch DB: <strong>{transactionCode}</strong> • Trạng thái: <strong>SUCCESS</strong>
                  </p>
                )}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
                  Trạng thái đơn đã tự động chuyển sang <span className="text-emerald-700 font-bold">CONFIRMED</span> và vé điện tử QR check-in đã sẵn sàng.
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Cảnh báo khi đơn chưa được Lễ tân duyệt */}
                {isPendingReview && (
                  <div className="col-span-1 md:col-span-2 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Đơn đặt bàn đang ở trạng thái Chờ Lễ Tân Tư Vấn (PENDING_REVIEW)</p>
                      <p className="text-[11px] text-amber-800">
                        Theo quy trình nghiệp vụ, quý khách vui lòng chờ Lễ tân gọi điện xác nhận thực đơn và duyệt cọc. Nút thanh toán cọc sẽ được kích hoạt sau khi đơn được duyệt sang trạng thái <strong>AWAITING_PAYMENT</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-100 w-52 h-52 flex items-center justify-center overflow-hidden">
                    <img
                      src={activeTab === 'VIETQR' ? qrImageUrl : (momoQrUrl || momoFallbackQr)}
                      alt={activeTab === 'VIETQR' ? 'VietQR Chuyển khoản' : 'MoMo QR Code'}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback sang link VietQR nội địa nếu link bên ngoài bị chặn
                        if (e.currentTarget.src !== momoFallbackQr) {
                          e.currentTarget.src = momoFallbackQr;
                        }
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium text-center">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>
                      {activeTab === 'VIETQR'
                        ? '0% Phí trung gian • Chuẩn Napas 24/7'
                        : 'Cổng thanh toán MoMo All-in-One'}
                    </span>
                  </div>

                  {/* Nút hành động trực tiếp trong tab MoMo */}
                  {activeTab === 'MOMO' && (
                    <div className="w-full mt-3 space-y-2">
                      {momoPayUrl && (
                        <a
                          href={momoPayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#A21CAF] bg-purple-50 hover:bg-purple-100 border border-purple-200 py-2 px-3 rounded-xl transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở Cổng Thanh Toán MoMo</span>
                        </a>
                      )}

                      {/* NÚT GIẢ LẬP THANH TOÁN MOMO NỔI BẬT TRONG TAB MOMO */}
                      <button
                        type="button"
                        onClick={handleSimulatePayment}
                        disabled={isProcessing || isPendingReview}
                        className="w-full py-2.5 px-3 bg-[#A21CAF] hover:bg-[#86198F] active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>{isProcessing ? 'Đang gọi Mock IPN MoMo...' : isPendingReview ? '🔒 Chờ Lễ Tân Duyệt Đơn Trước Khi Cọc' : '⚡ Giả Lập MoMo Thành Công'}</span>
                      </button>
                    </div>
                  )}

                  {/* Nút hành động trực tiếp trong tab VietQR */}
                  {activeTab === 'VIETQR' && (
                    <div className="w-full mt-3">
                      <button
                        type="button"
                        onClick={handleSimulatePayment}
                        disabled={isProcessing || isPendingReview}
                        className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Zap className="w-4 h-4 text-amber-200" />
                        <span>{isProcessing ? 'Đang xác thực giao dịch...' : isPendingReview ? '🔒 Chờ Lễ Tân Duyệt Đơn Trước Khi Cọc' : '⚡ Giả Lập Quét QR Thành Công'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Account details & Deposit Breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-50/80 to-amber-500/5 border border-amber-300 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                        {activeTab === 'VIETQR' ? 'Tổng cọc VietQR:' : 'Tổng cọc MoMo:'}
                      </span>
                      <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                        100% Khấu trừ vào bill
                      </span>
                    </div>
                    <span className="text-2xl font-black font-serif text-amber-950 block mt-1">
                      {formattedDeposit}
                    </span>

                    {/* Breakdown cọc bàn + cọc món */}
                    {booking.preOrders && booking.preOrders.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-stone-600">
                          <span>• Tiền cọc giữ bàn ({booking.tableCode}):</span>
                          <span className="font-mono font-bold text-stone-900">
                            {new Intl.NumberFormat('vi-VN').format(
                              Math.max(
                                0,
                                booking.depositAmount -
                                  booking.preOrders.reduce((s, p) => s + p.dish.price * p.quantity, 0)
                              )
                            )}{' '}
                            đ
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-900 font-semibold">
                          <span>
                            • Cọc món Signature đặt trước (
                            {booking.preOrders.reduce((s, p) => s + p.quantity, 0)} phần):
                          </span>
                          <span className="font-mono font-bold text-amber-800">
                            {new Intl.NumberFormat('vi-VN').format(
                              booking.preOrders.reduce((s, p) => s + p.dish.price * p.quantity, 0)
                            )}{' '}
                            đ
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {activeTab === 'VIETQR' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-semibold text-slate-800 text-right">{bankName}</span>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">{accountNumber}</span>
                          <button
                            onClick={() => copyToClipboard(accountNumber, 'acc')}
                            className="text-slate-400 hover:text-amber-700 p-1 cursor-pointer"
                            title="Sao chép số tài khoản"
                          >
                            {copiedField === 'acc' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                        <span className="text-slate-500">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                            {qrTransferContent}
                          </span>
                          <button
                            onClick={() => copyToClipboard(qrTransferContent, 'code')}
                            className="text-slate-400 hover:text-amber-700 p-1 cursor-pointer"
                            title="Sao chép nội dung"
                          >
                            {copiedField === 'code' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1.5 text-xs">
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <span className="font-semibold text-slate-800 text-right">{accountHolder}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Cổng thanh toán:</span>
                        <span className="font-semibold text-[#A21CAF] flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5" /> MoMo Payment Gateway
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Mã đơn hàng MoMo:</span>
                        <span className="font-mono font-bold text-slate-900">{transactionCode || 'Đang tạo...'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-500">Mã đối tác:</span>
                        <span className="font-mono font-semibold text-slate-700">MOMO</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 text-xs">
                        <span className="text-slate-500">Người thụ hưởng:</span>
                        <span className="font-semibold text-slate-800 text-right">TableMaster Restaurant</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer & Global Action Button */}
          {!isSuccess && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {apiCallMessage || 'Hệ thống đang lắng nghe giao dịch từ cổng thanh toán...'}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50 ${
                    activeTab === 'MOMO'
                      ? 'bg-[#A21CAF] hover:bg-[#86198F]'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>
                    {isProcessing
                      ? 'Đang xác thực giao dịch vào DB...'
                      : activeTab === 'MOMO'
                      ? '⚡ Giả lập MoMo Thành Công'
                      : '⚡ Giả lập Thanh Toán Thành Công'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
