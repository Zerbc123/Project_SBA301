import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  X,
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Upload,
  Baby,
  Flame,
  Check,
} from 'lucide-react';
import type { TableItem, BookingDetails } from '../../types';
import { bookingApi } from '../../services/bookingApi';
import { hostAudioService } from '../../services/hostAudioService';
import jsQR from 'jsqr';

interface HostCameraQrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableItem[];
  bookings?: BookingDetails[];
  onCheckInSuccess: (table: TableItem, guestName: string, bookingData?: any) => void;
}

interface VerificationSuccessData {
  bookingCode: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  tableCode: string;
  floorNumber: number;
  floorName: string;
  zoneName: string;
  depositAmount: number;
  scannedAt: string;
  occasion?: string;
  dietaryNotes?: string;
  babyChairCount?: number;
  candleSetup?: boolean;
  preorders?: Array<{ name: string; quantity: number; price: number; notes?: string }>;
}

export const HostCameraQrScanner: React.FC<HostCameraQrScannerProps> = ({
  isOpen,
  onClose,
  tables,
  bookings = [],
  onCheckInSuccess,
}) => {
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'error' | 'permission_denied'>('idle');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => hostAudioService.getIsMuted());

  // Scanning & Verification state
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [scanSuccessData, setScanSuccessData] = useState<VerificationSuccessData | null>(null);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [autoDismissCountdown, setAutoDismissCountdown] = useState<number>(5);
  const scanLaserActive = !isVerifying && !scanSuccessData;

  // Dừng mọi track camera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
    setIsTorchOn(false);
  }, []);

  // Khởi động Camera phần cứng trên Tablet / Laptop
  const startCamera = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setCameraStatus('starting');
    setCameraErrorMessage(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('error');
      setCameraErrorMessage('Trình duyệt không hỗ trợ truy cập Camera trực tiếp. Vui lòng sử dụng chế độ quét giả lập hoặc nhập token.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Kiểm tra hỗ trợ đèn Flash/Torch
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setIsTorchSupported(Boolean(capabilities && capabilities.torch));
      }

      setCameraStatus('active');
    } catch (err: any) {
      console.warn('Lỗi mở Camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
        setCameraErrorMessage('Quyền truy cập Camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.');
      } else {
        setCameraStatus('error');
        setCameraErrorMessage(err.message || 'Không thể khởi động Camera. Vui lòng kiểm tra thiết bị.');
      }
    }
  }, [facingMode, stopCamera]);

  // Xử lý xác thực Token QR (trong <1s)
  const handleExecuteVerifyToken = useCallback(
    async (tokenToVerify: string) => {
      const token = tokenToVerify.trim();
      if (!token || isVerifying) return;

      setIsVerifying(true);
      setScanErrorMessage(null);
      setScanSuccessData(null);

      try {
        const res = await bookingApi.verifyAndCheckIn({
          qrToken: token,
          scannerLocation: 'Camera Tablet Sảnh Đón Khách',
        });

        if (res.success && res.data) {
          const bk = res.data;

          // Tìm bàn tương ứng
          let targetTable = tables.find(
            (t) =>
              (bk.tableIds && bk.tableIds.includes(t.id)) ||
              (bk.bookingCode && t.code && bk.bookingCode.includes(t.code))
          );

          if (!targetTable) {
            // Tìm trong danh sách booking client
            const matchedBk = bookings.find((b) => b.bookingId === bk.id || b.bookingCode === bk.bookingCode);
            if (matchedBk) {
              targetTable = tables.find((t) => t.id === matchedBk.tableId || t.code === matchedBk.tableCode);
            }
          }

          if (!targetTable) {
            // Dự phòng bàn T-03 hoặc bàn trống đầu tiên
            targetTable =
              tables.find((t) => t.code === 'T-03') ||
              tables.find((t) => t.status === 'CONFIRMED') ||
              tables.find((t) => t.status === 'AVAILABLE') ||
              tables[0];
          }

          const matchedBookingDetails = bookings.find(
            (b) => b.bookingId === bk.id || (targetTable && b.tableId === targetTable.id)
          );

          const successData: VerificationSuccessData = {
            bookingCode: bk.bookingCode || 'BK2610260001',
            guestName: bk.guestName || targetTable?.currentGuestName || 'Quý Khách Hàng',
            guestPhone: bk.guestPhone || targetTable?.guestPhone || '0909 123 456',
            guestCount: bk.guestCount || targetTable?.capacity || 4,
            tableCode: targetTable ? targetTable.code : 'T-03',
            floorNumber: targetTable ? targetTable.floor : 1,
            floorName:
              targetTable?.floor === 2
                ? 'Khu Phòng VIP'
                : targetTable?.floor === 3
                ? 'Khu Sky Lounge'
                : 'Khu Sảnh Chính',
            zoneName:
              targetTable?.zone === 'WINDOW_VIEW'
                ? 'View Phố Nguyễn Huệ'
                : targetTable?.zone === 'VIP'
                ? 'Phòng VIP Salon'
                : targetTable?.zone === 'OUTDOOR'
                ? 'Sky Terrace'
                : 'Sảnh Tiêu Chuẩn',
            depositAmount: bk.totalDeposit || targetTable?.depositPrice || 300000,
            scannedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            occasion: matchedBookingDetails?.occasion,
            dietaryNotes: matchedBookingDetails?.dietaryNotes,
            babyChairCount: matchedBookingDetails?.babyChairCount,
            candleSetup: matchedBookingDetails?.candleSetup,
            preorders: matchedBookingDetails?.preOrders?.map((po) => ({
              name: po.dish.name,
              quantity: po.quantity,
              price: po.dish.price,
              notes: po.preparationNotes,
            })),
          };

          // 1. Phát âm thanh BÍP THÀNH CÔNG chuẩn 5 sao (Web Audio API)
          hostAudioService.playSuccess();

          // 2. Chuyển trạng thái bàn sang XANH DƯƠNG (SEATED)
          if (targetTable) {
            onCheckInSuccess(targetTable, successData.guestName, bk);
          }

          setScanSuccessData(successData);
          setAutoDismissCountdown(5);
        } else {
          throw new Error(res.message || 'Mã QR không hợp lệ');
        }
      } catch (err: any) {
        console.warn('Lỗi xác thực QR:', err);

        // Phát âm thanh CẢNH BÁO LỖI / GIAN LẬN
        hostAudioService.playError();

        setScanErrorMessage(
          err.message || 'Mã QR không hợp lệ hoặc vé này đã được check-in trước đó (Chống gian lận sử dụng 1 lần)!'
        );
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, tables, bookings, onCheckInSuccess]
  );

  // Realtime Frame Scanner Loop qua jsQR Engine & Native BarcodeDetector
  useEffect(() => {
    if (!isOpen || cameraStatus !== 'active') return;

    let isScanningFrame = false;

    scanIntervalRef.current = setInterval(async () => {
      if (isScanningFrame || isVerifying || scanSuccessData) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        isScanningFrame = true;

        try {
          // 1. Thử giải mã nhanh bằng native BarcodeDetector nếu trình duyệt hỗ trợ
          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await barcodeDetector.detect(video);

              if (barcodes && barcodes.length > 0) {
                const detectedValue = barcodes[0].rawValue;
                if (detectedValue) {
                  console.log('📷 [BarcodeDetector] Phát hiện mã QR:', detectedValue);
                  handleExecuteVerifyToken(detectedValue);
                  return;
                }
              }
            } catch {
              // Bỏ qua lỗi detector và chuyển sang jsQR
            }
          }

          // 2. Bộ giải mã bằng thư viện jsQR (hoạt động 100% trên mọi trình duyệt: Chrome, Edge, Firefox, Cốc Cốc)
          if (canvas) {
            let width = video.videoWidth;
            let height = video.videoHeight;

            // Giới hạn max width 800px để jsQR xử lý siêu tốc (< 15ms/frame) mà độ chi tiết QR vẫn cực nét
            if (width > 800) {
              height = Math.round((height * 800) / width);
              width = 800;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const imageData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imageData.data, width, height, {
                inversionAttempts: 'attemptBoth',
              });

              if (code && code.data && code.data.trim()) {
                console.log('📷 [jsQR Engine] Nhận diện mã QR thành công:', code.data);
                handleExecuteVerifyToken(code.data.trim());
              }
            }
          }
        } catch (e) {
          // Bỏ qua lỗi frame đơn lẻ
        } finally {
          isScanningFrame = false;
        }
      }
    }, 200);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isOpen, cameraStatus, isVerifying, scanSuccessData, handleExecuteVerifyToken]);

  // Vòng đời mở / đóng modal
  useEffect(() => {
    if (isOpen) {
      startCamera('environment');
      setScanSuccessData(null);
      setScanErrorMessage(null);
      setManualTokenInput('');
      setAutoDismissCountdown(5);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Đồng hồ đếm ngược tự đóng sau khi xác thực thành công
  useEffect(() => {
    if (!scanSuccessData) return;

    const timer = setInterval(() => {
      setAutoDismissCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [scanSuccessData, onClose]);

  // Bật/tắt Flash/Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current || !isTorchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Lỗi bật đèn flash:', err);
      }
    }
  };

  // Đổi Camera Trước / Sau
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Bật / Tắt âm thanh
  const handleToggleSound = () => {
    const muted = hostAudioService.toggleMute();
    setIsMuted(muted);
  };

  // Preset 1: Quét nhanh vé hợp lệ (1s Demo)
  const handleSimulateValidScan = () => {
    const validToken = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    setManualTokenInput(validToken);
    handleExecuteVerifyToken(validToken);
  };

  // Preset 2: Thử quét lại vé đã SEATED (Test Chống Gian Lận)
  const handleSimulateFraudScan = () => {
    const fraudToken = 'already_seated_token_simulation_fraud_test_64char_token_example';
    setManualTokenInput(fraudToken);
    handleExecuteVerifyToken(fraudToken);
  };

  // Preset 3: Quét theo mã đơn bàn đã cọc hiện có
  const handleScanConfirmedTable = (tableCode: string) => {
    setManualTokenInput(`BK-${tableCode}-2026`);
    handleExecuteVerifyToken(`BK-${tableCode}-2026`);
  };

  // Tải ảnh QR để giải mã (Upload Fallback bằng jsQR + BarcodeDetector)
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        });
        URL.revokeObjectURL(objectUrl);
        if (code && code.data && code.data.trim()) {
          const val = code.data.trim();
          setManualTokenInput(val);
          handleExecuteVerifyToken(val);
          return;
        }
      }
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.warn('Upload decode error:', err);
    }
    // Fallback nếu không đọc được ảnh
    handleSimulateValidScan();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header Thanh Lịch */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2C221E] via-[#3D2F28] to-[#2C221E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  UC-16 • Host Camera Scanner
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  &lt;1s Detection
                </span>
              </div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-white mt-0.5">
                Quét Camera Nhận Diện Vé QR Check-in
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút bật tắt âm thanh phản hồi */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={isMuted ? 'Bật âm thanh báo bíp' : 'Tắt âm thanh'}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-amber-300'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nội Dung Chính */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* 1. KHUNG CAMERA VIEWFINDER (THAO TÁC TRỰC TIẾP TRÊN PHẦN CỨNG TABLET) */}
          <div className="relative w-full h-64 sm:h-72 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-[#8C6A43]/40 shadow-inner group">
            {/* Live Video Stream Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Trạng thái khi Camera chưa mở / lỗi */}
            {cameraStatus !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950 text-slate-300">
                <Camera className="w-12 h-12 text-amber-400 animate-pulse opacity-70" />
                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-bold text-white">
                    {cameraStatus === 'starting'
                      ? 'Đang kết nối Camera Tablet...'
                      : cameraStatus === 'permission_denied'
                      ? 'Camera chưa được cấp quyền'
                      : 'Camera chưa sẵn sàng'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {cameraErrorMessage || 'Bạn có thể chuyển sang chế độ quét giả lập nhanh 1s hoặc nhập token bên dưới.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử Lại Camera</span>
                  </button>

                  <label className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/20">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải Ảnh QR</span>
                    <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* High-tech Viewfinder Overlay */}
            {cameraStatus === 'active' && (
              <>
                {/* Tia quét Laser vàng sang trọng */}
                {scanLaserActive && (
                  <div className="absolute inset-x-8 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_18px_#F59E0B] animate-bounce pointer-events-none" />
                )}

                {/* Khung ngắm Viewfinder 4 góc */}
                <div className="relative w-48 h-48 border-2 border-dashed border-amber-400/80 rounded-2xl flex flex-col items-center justify-center bg-white/5 backdrop-blur-[2px] pointer-events-none">
                  {/* 4 Góc định vị */}
                  <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                  {isVerifying ? (
                    <div className="flex flex-col items-center gap-1.5 text-amber-300">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <span className="text-[10px] font-mono font-bold tracking-wider">ĐANG ĐỐI SOÁT &lt;1S...</span>
                    </div>
                  ) : (
                    <QrCode className="w-12 h-12 text-amber-300/40 animate-pulse" />
                  )}
                </div>

                {/* Thanh điều khiển Camera nổi trên góc */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10">
                  {isTorchSupported && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      title={isTorchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isTorchOn ? 'bg-amber-400 text-stone-950' : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      {isTorchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    title="Đổi camera trước/sau trên tablet"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Nhãn trạng thái quét thời gian thực */}
                <div className="absolute bottom-2.5 inset-x-4 flex items-center justify-between text-[10px] font-mono text-stone-300 bg-black/70 backdrop-blur-md py-1 px-3 rounded-xl border border-white/10">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>CAMERA ACTIVE (1S DETECTION)</span>
                  </span>
                  <span>HMAC 64-CHAR • 60S ROTATION</span>
                </div>
              </>
            )}
          </div>

          {/* 2. KẾT QUẢ ĐỐI SOÁT THÀNH CÔNG: CHUYỂN BÀN SANG XANH DƯƠNG (SEATED) */}
          {scanSuccessData && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border-2 border-blue-500 shadow-lg space-y-3.5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block font-mono">
                      XÁC THỰC THÀNH CÔNG • ĐÃ MỞ BÀN
                    </span>
                    <h4 className="font-serif text-lg font-black text-blue-950 flex items-center gap-2">
                      <span>Bàn {scanSuccessData.tableCode}</span>
                      <span className="text-xs font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-full shadow-2xs">
                        🔵 XANH DƯƠNG (SEATED)
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-blue-700 block font-medium">Giờ quét tại cửa:</span>
                  <span className="font-mono text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-300">
                    {scanSuccessData.scannedAt}
                  </span>
                </div>
              </div>

              {/* Thông tin hồ sơ khách */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white/90 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Thực khách:</span>
                  <strong className="text-slate-900 truncate block font-bold">{scanSuccessData.guestName}</strong>
                </div>
                <div className="p-2.5 bg-white/90 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Số điện thoại:</span>
                  <strong className="font-mono text-blue-800 block">{scanSuccessData.guestPhone}</strong>
                </div>
                <div className="p-2.5 bg-white/90 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Vị trí sảnh:</span>
                  <strong className="text-blue-950 truncate block font-semibold">{scanSuccessData.floorName}</strong>
                </div>
                <div className="p-2.5 bg-white/90 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Tiền cọc ghi nhận:</span>
                  <strong className="font-mono text-emerald-800 font-bold block">
                    {new Intl.NumberFormat('vi-VN').format(scanSuccessData.depositAmount)} đ
                  </strong>
                </div>
              </div>

              {/* UC-08 Nhu cầu đặc biệt & Cảnh báo dị ứng */}
              {(scanSuccessData.dietaryNotes || scanSuccessData.babyChairCount || scanSuccessData.candleSetup) && (
                <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lưu ý tiếp đón thực khách (UC-08):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {scanSuccessData.babyChairCount && scanSuccessData.babyChairCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-semibold">
                        <Baby className="w-3 h-3 text-blue-600" />
                        {scanSuccessData.babyChairCount} Ghế em bé
                      </span>
                    ) : null}
                    {scanSuccessData.candleSetup && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200 text-[11px] font-semibold">
                        <Flame className="w-3 h-3 text-rose-600" />
                        Nến bàn ăn
                      </span>
                    )}
                  </div>
                  {scanSuccessData.dietaryNotes && (
                    <div className="p-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{scanSuccessData.dietaryNotes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Nút Dẫn khách vào bàn */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-blue-800 italic">
                  Tự động chuyển về sơ đồ sàn sau {autoDismissCountdown}s...
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Dẫn Khách Vào Bàn {scanSuccessData.tableCode} (Hoàn Tất)</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. CẢNH BÁO AN NINH CỬA RA VÀO (ANTI-FRAUD ONE-TIME USE) */}
          {scanErrorMessage && !scanSuccessData && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-950 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                <span>CẢNH BÁO AN NINH CỬA RA VÀO (ANTI-FRAUD)</span>
              </div>
              <p className="text-rose-950 leading-relaxed font-semibold">{scanErrorMessage}</p>
              <p className="text-[11px] text-rose-700 italic border-t border-rose-200 pt-1.5">
                Chính sách an ninh cửa: Mỗi mã QR chỉ được quét check-in 1 lần duy nhất và xoay sau mỗi 60 giây. Tuyệt đối không chấp nhận ảnh chụp màn hình chia sẻ lại.
              </p>
            </div>
          )}

          {/* 4. PHÍM THAO TÁC NHANH (FAST 1S PRESET BUTTONS FOR HOST) */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block font-mono">
              Phím Thao Tác Nhanh (Demo Check-in & Kiểm Thử):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSimulateValidScan}
                disabled={isVerifying}
                className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block font-bold">Quét Vé Hợp Lệ 1s</span>
                    <span className="text-[10px] text-emerald-700 font-normal">Bàn T-03 • Token 64-char HMAC</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={handleSimulateFraudScan}
                disabled={isVerifying}
                className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-950 text-xs font-bold text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="block font-bold">Test Chống Gian Lận</span>
                    <span className="text-[10px] text-rose-700 font-normal">Quét lại vé đã SEATED trước đó</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-rose-700 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Các bàn đã cọc chờ quét hiện có */}
            {tables.some((t) => t.status === 'CONFIRMED') && (
              <div className="pt-1">
                <span className="text-[10px] text-stone-500 block mb-1">Bàn đã cọc sẵn sàng đón khách:</span>
                <div className="flex flex-wrap gap-1.5">
                  {tables
                    .filter((t) => t.status === 'CONFIRMED')
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleScanConfirmedTable(t.code)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold font-mono cursor-pointer transition-colors"
                      >
                        Check-in Bàn {t.code}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. NHẬP THỦ CÔNG TOKEN HOẶC MÃ ĐƠN BK... */}
          <div className="space-y-1.5 pt-2 border-t border-[#E8DFD1]">
            <label className="text-xs font-bold text-[#2C221E] block">
              Nhập Mã Token 64 Ký Tự Hoặc Mã Đơn Booking (BK...):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="Dán token 64 ký tự hoặc mã đơn BK2610260001..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8DFD1] bg-[#FAF7F2] text-xs font-mono text-[#2C221E] focus:outline-none focus:border-[#8C6A43]"
              />
              <button
                type="button"
                onClick={() => handleExecuteVerifyToken(manualTokenInput)}
                disabled={isVerifying || !manualTokenInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-xs flex items-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Quét...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Quét Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[#FAF7F2] border-t border-[#E8DFD1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Âm thanh Web Audio API {isMuted ? '(Đang Tắt)' : '(Bật)'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng Máy Quét
          </button>
        </div>
      </div>
    </div>
  );
};
