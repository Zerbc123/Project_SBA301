import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Copy, Check, ShieldCheck, Zap, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { BookingDetails } from '../../types';
import { bookingApi, SEED_DATA } from '../../services/bookingApi';


interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetails | null;
  onPaymentSuccess: () => void;
}

export const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionCode, setTransactionCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !booking) {
      setIsSuccess(false);
      setIsProcessing(false);
      setTransactionCode(null);
      return;
    }

    setIsSuccess(false);
    setIsProcessing(false);

    // Khởi tạo giao dịch chờ thanh toán trên payment-service (UC-11)
    let isMounted = true;
    const initPaymentSession = async () => {
      try {
        const res = await bookingApi.createMomoPayment({
          bookingId: booking.backendUUID || SEED_DATA.BOOKING_ID,
          userId: SEED_DATA.USER_ID,
          amount: booking.depositAmount,
          orderInfo: `Thanh toan coc giu ban ${booking.bookingId} - ${booking.customerName}`,
        });
        if (isMounted && res.success && res.data?.orderId) {
          setTransactionCode(res.data.orderId);
          console.log('✅ [Payment Service] Khởi tạo giao dịch cọc thành công:', res.data);
        }
      } catch (err: any) {
        console.warn('⚠️ [Payment Service] Không thể kết nối payment-service (8084), sử dụng chế độ QR trực tiếp:', err?.message || err);
      }
    };

    initPaymentSession();
    return () => {
      isMounted = false;
    };
  }, [isOpen, booking?.bookingId, booking?.backendUUID, booking?.depositAmount]);

  if (!isOpen || !booking) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);

    // Kích hoạt Mock IPN trên payment-service để bắn Kafka event 'payment.success' sang booking-service
    if (transactionCode) {
      try {
        await bookingApi.triggerMomoMockIpn(transactionCode);
        console.log('✅ [Payment Service] Đã kích hoạt Mock IPN & bắn Kafka payment.success cho mã GD:', transactionCode);
      } catch (err: any) {
        console.warn('⚠️ [Payment Service] Lỗi kích hoạt Mock IPN (sẽ dùng REST fallback):', err?.message || err);
      }
    }

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D97706', '#C5A880', '#10B981', '#F59E0B'],
      });
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
    }, 800);
  };

  // Format currency
  const formattedDeposit = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(booking.depositAmount);

  // Generate dynamic VietQR URL or fallback high quality QR SVG mockup
  const accountNumber = '0909888999';
  const bankName = 'Vietcombank - Chi nhánh Bến Nghé, Q.1';
  const accountHolder = 'THE PRIME BISTRO & STEAKHOUSE CO., LTD';
  const qrTransferContent = booking.vietqrCode;

  // VietQR quick link standard
  const qrImageUrl = `https://img.vietqr.io/image/VCB-${accountNumber}-compact2.png?amount=${booking.depositAmount}&addInfo=${encodeURIComponent(
    qrTransferContent
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
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-900">
                  Thanh Toán Cọc Giữ Bàn VietQR
                </h3>
                <p className="text-xs text-slate-500">Chuyển khoản trực tiếp tới tài khoản nhà hàng</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[80vh] overflow-y-auto">
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
                  Cảm ơn quý khách <span className="font-semibold text-slate-900">{booking.customerName}</span>. Mã đặt bàn <span className="font-mono font-bold text-amber-700">{booking.bookingId}</span> đã được ghi nhận trực tiếp trên hệ thống!
                </p>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
                  Trạng thái bàn <span className="font-bold">{booking.tableCode}</span> đã tự động chuyển sang <span className="text-rose-700 font-bold">ĐÃ XÁC NHẬN</span> trên sơ đồ mặt bằng trực tiếp.
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-100 w-52 h-52 flex items-center justify-center overflow-hidden">
                    <img
                      src={qrImageUrl}
                      alt="VietQR Chuyển khoản cọc giữ bàn"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback QR display with simulated SVG if offline
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('bg-amber-50');
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity bg-white/90">
                      <p className="text-xs font-semibold text-amber-800">Quét mã bằng app ngân hàng bất kỳ</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>0% Phí trung gian • Chuẩn Napas 24/7</span>
                  </div>
                </div>

                {/* Account details & Deposit Breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-gradient-to-br from-amber-500/10 via-amber-50/80 to-amber-500/5 border border-amber-300 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Tổng cọc hóa đơn VietQR:</span>
                      <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">100% Khấu trừ vào bill</span>
                    </div>
                    <span className="text-2xl font-black font-serif text-amber-950 block mt-1">{formattedDeposit}</span>
                    
                    {/* Breakdown cọc bàn + cọc món (UC-07) */}
                    {booking.preOrders && booking.preOrders.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-stone-600">
                          <span>• Tiền cọc giữ bàn ({booking.tableCode}):</span>
                          <span className="font-mono font-bold text-stone-900">
                            {new Intl.NumberFormat('vi-VN').format(Math.max(0, booking.depositAmount - booking.preOrders.reduce((s, p) => s + p.dish.price * p.quantity, 0)))} đ
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-900 font-semibold">
                          <span>• Cọc món Signature đặt trước ({booking.preOrders.reduce((s, p) => s + p.quantity, 0)} phần):</span>
                          <span className="font-mono font-bold text-amber-800">
                            {new Intl.NumberFormat('vi-VN').format(booking.preOrders.reduce((s, p) => s + p.dish.price * p.quantity, 0))} đ
                          </span>
                        </div>
                        <div className="pl-2 space-y-1 pt-1 border-t border-amber-200/50">
                          {booking.preOrders.map((p, idx) => (
                            <div key={idx} className="text-[10px] text-stone-600 leading-tight">
                              <span className="font-bold text-amber-800">{p.quantity}x {p.dish.name}</span>
                              {p.preparationNotes && (
                                <span className="block text-stone-500 italic pl-2">↳ Yêu cầu: {p.preparationNotes}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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
                          className="text-slate-400 hover:text-amber-700 p-1"
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
                          className="text-slate-400 hover:text-amber-700 p-1"
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
                </div>
              </div>
            )}
          </div>

          {/* Footer & Simulation Action */}
          {!isSuccess && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Hệ thống đang lắng nghe giao dịch...
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 gold-gradient text-white text-xs font-semibold rounded-xl shadow-md hover:brightness-110 active:scale-98 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isProcessing ? 'Đang xác thực giao dịch...' : '⚡ Giả lập Thanh toán thành công'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
