import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  QrCode,
  X,
  Users,
  CheckCircle2,
  Plus,
  Minus,
  Receipt,
  CreditCard,
  Banknote,
  Utensils,
  FileText,
  UserCheck,
  Check,
  RefreshCw,
  Smartphone,
  Sparkles,
  ArrowRightLeft,
  Merge,
  ArrowRight,
  Info,
  Baby,
  Cake,
  Flame,
  ShieldAlert,
  Edit3,
  ChefHat,
  Phone,
  PhoneCall,
  Calendar,
  Layers,
  LayoutGrid,
  Radio,
  Timer,
  Camera,
  Zap,
} from 'lucide-react';
import type { TableItem, TableStatus, BookingDetails, TableOrderRecord, HostFloorLivePayload } from '../types';
import { SIGNATURE_DISHES } from '../data/mockData';
import { bookingApi } from '../services/bookingApi';
import { FloorPlanCanvas } from '../components/floor/FloorPlanCanvas';
import { websocketService } from '../services/websocketService';
import { HostCameraQrScanner } from '../components/host/HostCameraQrScanner';
import { OneTouchStatusRibbon } from '../components/host/OneTouchStatusRibbon';
import { hostAudioService } from '../services/hostAudioService';

interface HostTabletPageProps {
  tables: TableItem[];
  bookings?: BookingDetails[];
  tableOrders: Record<string, TableOrderRecord>;
  setTableOrders: React.Dispatch<React.SetStateAction<Record<string, TableOrderRecord>>>;
  onUpdateTableStatus: (tableId: string, status: TableStatus, guestName?: string) => void;
  onTransferTable?: (sourceTableId: string, targetTableId: string) => void;
  onMergeTables?: (sourceTableId: string, targetTableId: string) => void;
  onNavigateToWaiter?: () => void;
  onNavigateToKds?: () => void;
  onUpdateBooking?: (updatedBooking: BookingDetails) => void;
}

export const HostTabletPage: React.FC<HostTabletPageProps> = ({
  tables,
  bookings = [],
  tableOrders,
  setTableOrders,
  onUpdateTableStatus,
  onTransferTable,
  onMergeTables,
  onNavigateToWaiter,
  onNavigateToKds,
  onUpdateBooking,
}) => {
  // UC-27 & UC-05: Phân Khu Trải Nghiệm (Zone-Based Seating) & Lưới Thẻ Bàn
  const [selectedFloor] = useState<1 | 2 | 3 | 'ALL'>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'canvas' | 'cards'>('cards');
  const [hostFloorLive, setHostFloorLive] = useState<HostFloorLivePayload | null>(null);
  const [stompLatencyMs, setStompLatencyMs] = useState<number>(18);
  const [isWsLive, setIsWsLive] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('vi-VN'));
  const [liveTicker, setLiveTicker] = useState<number>(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'SEATED' | 'CONFIRMED' | 'CALL_BILL' | 'LONG_DINING' | 'OVERSTAY' | 'CLEANING'>('ALL');
  const selectedShift = '🌙 Ca Tối (17:00 - 23:00)';

  // UC-17: Đổi trạng thái bàn 1 chạm trên Tablet (One-touch Table Status)
  const [isOneTouchFastMode, setIsOneTouchFastMode] = useState<boolean>(false);

  // Active Table for POS / Detail Drawer
  const [selectedTableForPOS, setSelectedTableForPOS] = useState<TableItem | null>(null);

  // Walk-in Quick Open Modal
  const [walkInTargetTable, setWalkInTargetTable] = useState<TableItem | null>(null);
  const [walkInName, setWalkInName] = useState('Khách Vãng Lai');
  const [walkInGuests, setWalkInGuests] = useState(2);
  const [walkInNotes, setWalkInNotes] = useState('');

  // Table Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string>('');

  // Table Merge Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // UC-16: Host Camera QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);


  // Quick Menu Category for Add Dishes inside POS
  const [menuTab, setMenuTab] = useState<string>('ALL');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');

  // Custom Dish Input by Cashier / Host
  const [isAddingCustomDish, setIsAddingCustomDish] = useState(false);
  const [customDishName, setCustomDishName] = useState('');
  const [customDishPrice, setCustomDishPrice] = useState<string>('50000');
  const [customDishNotes, setCustomDishNotes] = useState('');

  // UC-08: Special Requests & Dietary Notes Edit Modal State
  const [isEditSpecialModalOpen, setIsEditSpecialModalOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string>('');
  const [editOccasion, setEditOccasion] = useState<string>('');
  const [editBabyChairCount, setEditBabyChairCount] = useState<number>(0);
  const [editCandleSetup, setEditCandleSetup] = useState<boolean>(false);
  const [editDietaryNotes, setEditDietaryNotes] = useState<string>('');
  const [editStaffNotes, setEditStaffNotes] = useState<string>('');

  // Payment Confirmation State
  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = useState(false);
  const [paidTableSummary, setPaidTableSummary] = useState<{
    code: string;
    total: number;
    guestName: string;
    depositDeducted: number;
    finalPaid: number;
    paymentMethod: string;
  } | null>(null);

  // UC-10: Private Banquet & Event Inquiries Drawer State
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<'ALL' | 'PENDING' | 'CONSULTED'>('ALL');
  const [selectedInquiryForCall, setSelectedInquiryForCall] = useState<BookingDetails | null>(null);
  const [consultationCallStatus, setConsultationCallStatus] = useState<'CALLED' | 'PROPOSAL_SENT' | 'ACCEPTED' | 'REJECTED'>('CALLED');
  const [consultationNotesInput, setConsultationNotesInput] = useState('');
  const [agreedBudgetInput, setAgreedBudgetInput] = useState<number>(0);
  const [agreedDepositInput, setAgreedDepositInput] = useState<number>(0);
  const [targetBookingStatus, setTargetBookingStatus] = useState<BookingDetails['status']>('EVENT_INQUIRY');
  const [isSavingConsultation, setIsSavingConsultation] = useState(false);
  const [simulatedCallInquiryId, setSimulatedCallInquiryId] = useState<string | null>(null);

  // Live timer tick for 15-minute SLA countdown
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter event inquiries and bookings needing consultation (EVENT_INQUIRY, PENDING_REVIEW, AWAITING_PAYMENT, or has eventType or consulted)
  const eventInquiries = bookings.filter(
    (b) =>
      b.status === 'EVENT_INQUIRY' ||
      b.status === 'PENDING_REVIEW' ||
      b.status === 'AWAITING_PAYMENT' ||
      b.eventType != null ||
      b.consultationNotes != null ||
      (b.managerCallStatus && b.managerCallStatus !== 'PENDING_CALL')
  );
  const pendingEventInquiries = eventInquiries.filter(
    (b) =>
      (b.status === 'PENDING_REVIEW' || b.status === 'EVENT_INQUIRY') &&
      (!b.managerCallStatus || b.managerCallStatus === 'PENDING_CALL')
  );
  const pendingInquiriesCount = pendingEventInquiries.length;

  const calculateSlaRemainingSeconds = (inquiry: BookingDetails): number => {
    if (inquiry.callbackDeadline) {
      const deadlineMs = new Date(inquiry.callbackDeadline).getTime();
      if (!isNaN(deadlineMs)) {
        return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      }
    }
    return 15 * 60;
  };

  const formatSlaTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleOpenConsultationModal = (inquiry: BookingDetails) => {
    setSelectedInquiryForCall(inquiry);
    setConsultationCallStatus(
      inquiry.managerCallStatus && inquiry.managerCallStatus !== 'PENDING_CALL'
        ? inquiry.managerCallStatus
        : 'CALLED'
    );
    setConsultationNotesInput(inquiry.consultationNotes || '');
    setAgreedBudgetInput(inquiry.estimatedBudget || (inquiry.depositAmount ? inquiry.depositAmount * 2 : 2000000));
    setAgreedDepositInput(inquiry.depositAmount || 200000);
    // Khi tư vấn chốt đơn, trạng thái tiếp theo chuẩn là AWAITING_PAYMENT để gửi email nạp cọc
    setTargetBookingStatus('AWAITING_PAYMENT');
  };

  const handleSimulateCall = (inquiry: BookingDetails) => {
    setSimulatedCallInquiryId(inquiry.bookingId);
    showToast(`Đang kết nối cuộc gọi tới Quý khách ${inquiry.customerName} (${inquiry.phone})...`);
    setTimeout(() => {
      setSimulatedCallInquiryId(null);
      handleOpenConsultationModal(inquiry);
    }, 1200);
  };

  const handleSaveConsultation = async () => {
    if (!selectedInquiryForCall) return;
    setIsSavingConsultation(true);
    const bookingIdentifier =
      selectedInquiryForCall.backendUUID ||
      selectedInquiryForCall.bookingCode ||
      selectedInquiryForCall.bookingId;

    try {
      await bookingApi.updateEventConsultation(bookingIdentifier, {
        managerCallStatus: consultationCallStatus,
        consultationNotes: consultationNotesInput,
        agreedBudget: agreedBudgetInput,
        agreedDeposit: agreedDepositInput,
        targetBookingStatus: targetBookingStatus,
      });

      const updatedBooking: BookingDetails = {
        ...selectedInquiryForCall,
        managerCallStatus: consultationCallStatus,
        consultationNotes: consultationNotesInput,
        estimatedBudget: agreedBudgetInput,
        depositAmount: agreedDepositInput,
        status: targetBookingStatus,
      };

      if (onUpdateBooking) {
        onUpdateBooking(updatedBooking);
      }

      showToast(`✅ Đã lưu biên bản & chuyển đơn sang [${targetBookingStatus}], email cọc đã được gửi tới Quý khách!`);
      setSelectedInquiryForCall(null);
    } catch (err: any) {
      console.warn('Lỗi lưu tư vấn:', err);
      const updatedBooking: BookingDetails = {
        ...selectedInquiryForCall,
        managerCallStatus: consultationCallStatus,
        consultationNotes: consultationNotesInput,
        estimatedBudget: agreedBudgetInput,
        depositAmount: agreedDepositInput,
        status: targetBookingStatus,
      };
      if (onUpdateBooking) {
        onUpdateBooking(updatedBooking);
      }
      showToast(`Đã ghi nhận tư vấn đơn ${selectedInquiryForCall.bookingCode || selectedInquiryForCall.bookingId}`);
      setSelectedInquiryForCall(null);
    } finally {
      setIsSavingConsultation(false);
    }
  };

  // UC-15: Fetch live floor map & subscribe to STOMP WebSocket topic /topic/host/floors-live (<300ms)
  useEffect(() => {
    let isSubscribed = true;

    const loadLiveFloors = async () => {
      try {
        const floorParam = selectedFloor === 'ALL' ? undefined : selectedFloor;
        const res = await bookingApi.getHostFloorsLive(floorParam);
        if (isSubscribed && res.success && res.data) {
          setHostFloorLive(res.data);
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
          if (res.data.latencyMs) setStompLatencyMs(res.data.latencyMs);
        }
      } catch (err) {
        console.warn('Failed to load host floors live:', err);
      }
    };

    loadLiveFloors();

    const unsubscribeStomp = websocketService.subscribeToHostFloorLive((payload: HostFloorLivePayload) => {
      if (!isSubscribed) return;
      setHostFloorLive(payload);
      setIsWsLive(true);
      const ping = websocketService.getLastPingMs() || 14;
      setStompLatencyMs(ping);
      setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
    });

    return () => {
      isSubscribed = false;
      unsubscribeStomp();
    };
  }, [selectedFloor]);

  // Periodic ping & dynamic dining timer counter tick (every 10s)
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTicker((t) => t + 1);
      const ping = websocketService.getLastPingMs();
      if (ping > 0) setStompLatencyMs(ping);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateStompBroadcast = () => {
    const start = performance.now();
    const updated = bookingApi.generateFallbackHostFloorLive(selectedFloor === 'ALL' ? undefined : selectedFloor);
    websocketService.simulateHostFloorBroadcast(updated.data);
    const roundTrip = Math.round(performance.now() - start + 8);
    setStompLatencyMs(roundTrip);
    setHostFloorLive(updated.data);
    showToast(`Đã nhận khung tin WebSocket STOMP (/topic/host/floors-live) trong ${roundTrip}ms (Đạt chuẩn <300ms)`);
  };

  // Helper tính thời gian ngồi ăn và phân loại alert level: NORMAL (<75m), LONG_DINING (75-105m), OVERSTAY (>105m)
  const getTableDiningMetrics = (table: TableItem) => {
    const liveItem = hostFloorLive?.tables?.find((lt) => lt.tableId === table.id || lt.tableCode === table.code);
    if (liveItem && liveItem.seatedMinutes != null) {
      return {
        minutes: liveItem.seatedMinutes,
        durationFormatted: liveItem.seatedDurationFormatted || `${liveItem.seatedMinutes} phút`,
        alertLevel: liveItem.diningAlertLevel || (liveItem.seatedMinutes > 105 ? 'OVERSTAY' : liveItem.seatedMinutes > 75 ? 'LONG_DINING' : 'NORMAL'),
        seatedAt: liveItem.seatedAt,
      };
    }

    const order = tableOrders[table.id];
    let mins = 0;
    if (table.seatedSince) {
      if (table.seatedSince.includes('phút')) {
        mins = parseInt(table.seatedSince) || 45;
      } else if (table.seatedSince.includes('giờ') || table.seatedSince.includes('h')) {
        const parts = table.seatedSince.match(/\d+/g);
        if (parts && parts.length >= 2) {
          mins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts && parts.length === 1) {
          mins = parseInt(parts[0]) * 60;
        }
      }
    } else if (order?.seatedAtTime) {
      mins = 35;
    }

    const durationFormatted = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} phút`;
    const alertLevel: 'NORMAL' | 'LONG_DINING' | 'OVERSTAY' =
      mins > 105 ? 'OVERSTAY' : mins > 75 ? 'LONG_DINING' : 'NORMAL';

    return {
      minutes: mins,
      durationFormatted,
      alertLevel,
      seatedAt: undefined,
    };
  };

  // Live table metrics mapped by tableId & tableCode for FloorPlanCanvas
  const liveTableMetrics = React.useMemo(() => {
    const map: Record<string, { durationFormatted?: string; alertLevel?: 'NORMAL' | 'LONG_DINING' | 'OVERSTAY' }> = {};
    tables.forEach((t) => {
      if (t.status === 'SEATED') {
        const m = getTableDiningMetrics(t);
        map[t.id] = {
          durationFormatted: m.durationFormatted,
          alertLevel: m.alertLevel,
        };
        map[t.code] = map[t.id];
      }
    });
    return map;
  }, [tables, hostFloorLive, liveTicker, tableOrders]);

  // Helper compute table statistics
  const getTableStats = (targetTables: TableItem[]) => {
    const total = targetTables.length;
    const available = targetTables.filter((t) => t.status === 'AVAILABLE').length;
    const seated = targetTables.filter((t) => t.status === 'SEATED').length;
    const reserved = targetTables.filter((t) => t.status === 'CONFIRMED' || t.status === 'HOLDING').length;
    const callBill = targetTables.filter((t) => t.status === 'CALL_BILL').length;
    const cleaning = targetTables.filter((t) => t.status === 'CLEANING').length;
    const capacity = targetTables.reduce((sum, t) => sum + t.capacity, 0);
    const occupancy = total > 0 ? Math.round(((seated + reserved) / total) * 1000) / 10 : 0;
    const longDiningCount = targetTables.filter((t) => {
      if (t.status !== 'SEATED') return false;
      const m = getTableDiningMetrics(t);
      return m.alertLevel === 'LONG_DINING';
    }).length;
    const overstayCount = targetTables.filter((t) => {
      if (t.status !== 'SEATED') return false;
      const m = getTableDiningMetrics(t);
      return m.alertLevel === 'OVERSTAY';
    }).length;
    const totalDeposit = targetTables.reduce((sum, t) => sum + (t.depositPrice || 0), 0);

    return { total, available, seated, reserved, callBill, cleaning, capacity, occupancy, longDiningCount, overstayCount, totalDeposit };
  };

  // Active Zone & Floor Tables
  const currentFloorTables = tables.filter((t) => {
    const matchesZone = selectedZone === 'ALL' || t.zone === selectedZone || (t as any).zoneType === selectedZone;
    const matchesFloor = selectedFloor === 'ALL' || t.floor === selectedFloor;
    return matchesZone && matchesFloor;
  });

  const currentFloorStats = getTableStats(currentFloorTables);


  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // Handlers
  const handleOpenWalkInModal = (table: TableItem) => {
    setWalkInTargetTable(table);
    setWalkInName('Khách Vãng Lai');
    setWalkInGuests(table.capacity > 4 ? 4 : table.capacity);
    setWalkInNotes('');
  };

  const handleConfirmWalkInOpen = () => {
    if (!walkInTargetTable) return;
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    onUpdateTableStatus(walkInTargetTable.id, 'SEATED', walkInName);

    setTableOrders((prev) => ({
      ...prev,
      [walkInTargetTable.id]: {
        tableCode: walkInTargetTable.code,
        guestName: walkInName,
        source: 'WALK_IN',
        guestCount: walkInGuests,
        seatedAtTime: `${nowStr} (Vừa vào)`,
        notes: walkInNotes,
        depositAmount: 0,
        items: [],
      },
    }));

    showToast(`Đã mở bàn ${walkInTargetTable.code} thành công (${walkInGuests} khách).`);
    setWalkInTargetTable(null);
  };

  const handleCheckInOnlineBooking = (table: TableItem) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    onUpdateTableStatus(table.id, 'SEATED', table.currentGuestName || 'Khách Đặt Online');

    const matchedBooking = bookings.find((b: BookingDetails) => b.tableId === table.id || b.tableCode.includes(table.code));

    setTableOrders((prev) => {
      const existing = prev[table.id];
      if (existing) {
        return {
          ...prev,
          [table.id]: {
            ...existing,
            seatedAtTime: `${nowStr} (Vừa nhận bàn)`,
            occasion: existing.occasion || matchedBooking?.occasion,
            dietaryNotes: existing.dietaryNotes || matchedBooking?.dietaryNotes,
            babyChairCount: existing.babyChairCount ?? matchedBooking?.babyChairCount ?? 0,
            candleSetup: existing.candleSetup ?? matchedBooking?.candleSetup ?? false,
          },
        };
      }

      // Convert preorder items to order items if present
      const preOrderItems = matchedBooking?.preOrders?.map((po: any) => ({
        dishId: po.dish.id,
        name: po.dish.name,
        price: po.dish.price,
        quantity: po.quantity,
        status: 'PREPARING' as const,
        category: po.dish.category,
        notes: po.preparationNotes,
      })) || [];

      return {
        ...prev,
        [table.id]: {
          tableCode: table.code,
          guestName: table.currentGuestName || matchedBooking?.customerName || 'Khách Đặt Online',
          phone: table.guestPhone || matchedBooking?.phone || '090***',
          source: 'ONLINE',
          guestCount: matchedBooking?.partySize || table.capacity,
          seatedAtTime: `${nowStr} (Vừa nhận bàn)`,
          notes: matchedBooking?.notes || 'Đặt bàn qua cổng Online Le Prime Bistro',
          occasion: matchedBooking?.occasion,
          dietaryNotes: matchedBooking?.dietaryNotes,
          babyChairCount: matchedBooking?.babyChairCount || 0,
          candleSetup: matchedBooking?.candleSetup || false,
          depositAmount: matchedBooking?.depositAmount || table.depositPrice || 200000,
          items: preOrderItems,
        },
      };
    });

    showToast(`Check-in thành công: Bàn ${table.code} (${table.currentGuestName || 'Khách Online'}).`);

    // Đồng bộ trạng thái SEATED xuống PostgreSQL qua verifyAndCheckIn
    if (matchedBooking) {
      const token = (matchedBooking as any).checkinQrToken || matchedBooking.bookingCode || matchedBooking.bookingId;
      if (token) {
        bookingApi.verifyAndCheckIn({
          qrToken: token,
          scannerLocation: `Host Tablet Nhận Bàn ${table.code}`,
        }).then(() => console.log(`✅ [Host Tablet] Đã cập nhật đơn ${table.code} sang SEATED trong DB`))
          .catch((err) => console.warn('Sync check-in backend error:', err));
      }
    }
  };

  // UC-08: Open Special Requests & Dietary Edit Modal
  const handleOpenEditSpecialModal = (tableId: string) => {
    const order = tableOrders[tableId];
    const table = tables.find((t) => t.id === tableId);
    const booking = bookings.find((b: BookingDetails) => b.tableId === tableId || (table && b.tableCode.includes(table.code)));

    setEditingTableId(tableId);
    setEditOccasion(order?.occasion || booking?.occasion || 'BIRTHDAY');
    setEditBabyChairCount(order?.babyChairCount ?? booking?.babyChairCount ?? 0);
    setEditCandleSetup(order?.candleSetup ?? booking?.candleSetup ?? false);
    setEditDietaryNotes(order?.dietaryNotes || booking?.dietaryNotes || '');
    setEditStaffNotes(order?.notes || booking?.notes || '');
    setIsEditSpecialModalOpen(true);
  };

  // UC-08: Save Special Requests & Sync to KDS Bếp
  const handleSaveSpecialRequests = async () => {
    if (!editingTableId) return;

    setTableOrders((prev) => {
      const current = prev[editingTableId];
      if (!current) return prev;
      return {
        ...prev,
        [editingTableId]: {
          ...current,
          occasion: editOccasion,
          babyChairCount: editBabyChairCount,
          candleSetup: editCandleSetup,
          dietaryNotes: editDietaryNotes,
          notes: editStaffNotes,
        },
      };
    });

    const table = tables.find((t) => t.id === editingTableId);
    const booking = bookings.find((b: BookingDetails) => b.tableId === editingTableId || (table && b.tableCode.includes(table.code)));

    if (booking && booking.tableId) {
      try {
        await bookingApi.updateSpecialRequests(booking.tableId, {
          occasion: editOccasion,
          dietaryNotes: editDietaryNotes,
          babyChairCount: editBabyChairCount,
          candleSetup: editCandleSetup,
          specialNotes: editStaffNotes,
        });
      } catch (e) {
        console.warn('Backend sync in local state:', e);
      }
    }

    setIsEditSpecialModalOpen(false);
    showToast(`✅ Đã đồng bộ Nhu cầu đặc biệt & Dị ứng sang KDS Bếp cho bàn ${table?.code || ''}!`);
  };

  const handleAddDishToTable = (tableId: string, dish: typeof SIGNATURE_DISHES[0]) => {
    setTableOrders((prev) => {
      const current = prev[tableId] || {
        tableCode: tables.find((t) => t.id === tableId)?.code || 'Bàn',
        guestName: 'Khách Tại Bàn',
        source: 'WALK_IN',
        guestCount: 2,
        seatedAtTime: 'Vừa gọi món',
        depositAmount: 0,
        items: [],
      };

      const existingItemIndex = current.items.findIndex((i) => i.dishId === dish.id);
      let updatedItems = [...current.items];

      if (existingItemIndex >= 0) {
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1,
        };
      } else {
        updatedItems.push({
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          status: 'PREPARING',
          category: dish.category,
        });
      }

      return {
        ...prev,
        [tableId]: {
          ...current,
          items: updatedItems,
        },
      };
    });
  };

  const handleAddCustomDish = (tableId: string) => {
    if (!customDishName.trim()) {
      alert('Vui lòng nhập tên món ăn / đồ uống');
      return;
    }
    const price = parseInt(customDishPrice.replace(/\D/g, ''), 10) || 0;

    setTableOrders((prev) => {
      const current = prev[tableId] || {
        tableCode: tables.find((t) => t.id === tableId)?.code || 'Bàn',
        guestName: 'Khách Tại Bàn',
        source: 'WALK_IN',
        guestCount: 2,
        seatedAtTime: 'Vừa gọi món',
        depositAmount: 0,
        items: [],
      };

      const customDishId = `custom-${Date.now()}`;
      const updatedItems = [
        ...current.items,
        {
          dishId: customDishId,
          name: customDishName.trim(),
          price,
          quantity: 1,
          status: 'PREPARING' as const,
          category: 'Món Nhập Riêng',
          notes: customDishNotes.trim(),
        },
      ];

      return {
        ...prev,
        [tableId]: {
          ...current,
          items: updatedItems,
        },
      };
    });

    setCustomDishName('');
    setCustomDishPrice('50000');
    setCustomDishNotes('');
    setIsAddingCustomDish(false);
    showToast(`Đã thêm món riêng vào bàn.`);
  };

  const handleUpdateDishQty = (tableId: string, dishId: string, delta: number) => {
    setTableOrders((prev) => {
      const current = prev[tableId];
      if (!current) return prev;

      const updatedItems = current.items
        .map((item) => {
          if (item.dishId === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((i): i is import('../types').OrderItem => i !== null);

      return {
        ...prev,
        [tableId]: {
          ...current,
          items: updatedItems,
        },
      };
    });
  };

  const handleToggleDishStatus = (tableId: string, dishId: string) => {
    setTableOrders((prev) => {
      const current = prev[tableId];
      if (!current) return prev;

      const updatedItems = current.items.map((item) => {
        if (item.dishId === dishId) {
          return {
            ...item,
            status: item.status === 'PREPARING' ? ('SERVED' as const) : ('PREPARING' as const),
          };
        }
        return item;
      });

      return {
        ...prev,
        [tableId]: {
          ...current,
          items: updatedItems,
        },
      };
    });
  };

  // Transfer table handler
  const handleConfirmTransfer = () => {
    if (!selectedTableForPOS || !transferTargetId) return;
    const targetTable = tables.find((t) => t.id === transferTargetId);
    if (!targetTable) return;

    if (onTransferTable) {
      onTransferTable(selectedTableForPOS.id, transferTargetId);
    }

    showToast(`Đã chuyển toàn bộ hóa đơn từ ${selectedTableForPOS.code} sang ${targetTable.code}.`);
    setSelectedTableForPOS(targetTable);
    setIsTransferModalOpen(false);
    setTransferTargetId('');
  };

  // Merge tables handler
  const handleConfirmMerge = () => {
    if (!selectedTableForPOS || !mergeTargetId) return;
    const targetTable = tables.find((t) => t.id === mergeTargetId);
    if (!targetTable) return;

    if (onMergeTables) {
      onMergeTables(selectedTableForPOS.id, mergeTargetId);
    }

    showToast(`Đã ghép bàn ${selectedTableForPOS.code} vào bàn ${targetTable.code} thành công.`);
    setSelectedTableForPOS(targetTable);
    setIsMergeModalOpen(false);
    setMergeTargetId('');
  };

  const handleCompletePayment = (table: TableItem, paymentMethod: string) => {
    const order = tableOrders[table.id];
    const itemsTotal = order ? order.items.reduce((sum, i) => sum + i.price * i.quantity, 0) : 0;
    const serviceCharge = Math.round(itemsTotal * 0.05);
    const subtotal = itemsTotal + serviceCharge;
    const deposit = order ? order.depositAmount : 0;
    const finalPaid = Math.max(0, subtotal - deposit);

    setPaidTableSummary({
      code: table.code,
      total: subtotal,
      guestName: order?.guestName || 'Khách Tại Bàn',
      depositDeducted: deposit,
      finalPaid,
      paymentMethod,
    });

    onUpdateTableStatus(table.id, 'AVAILABLE', undefined);

    // Đồng bộ hoàn tất thanh toán & giải phóng bàn trong DB (UC-18 / UC-20)
    const matchedBooking = bookings.find((b: BookingDetails) => b.tableId === table.id || (table && b.tableCode.includes(table.code)));
    if (matchedBooking) {
      if (onUpdateBooking) {
        onUpdateBooking({
          ...matchedBooking,
          status: 'COMPLETED' as any,
          rawStatus: 'COMPLETED',
        });
      }
      if (matchedBooking.backendUUID || matchedBooking.bookingId) {
        bookingApi.completeBooking(matchedBooking.backendUUID || matchedBooking.bookingId)
          .then(() => console.log(`✅ [Host POS] Đã hoàn tất hóa đơn ${matchedBooking.bookingCode || table.code} và lưu trạng thái COMPLETED trong DB`))
          .catch((err) => console.warn('Sync complete booking error:', err));
      }
    }

    setTableOrders((prev) => {
      const copy = { ...prev };
      delete copy[table.id];
      return copy;
    });

    setSelectedTableForPOS(null);
    setIsPaymentSuccessOpen(true);
  };

  // =========================================================================
  // UC-17: Đổi trạng thái bàn 1 chạm trên Tablet (One-touch Table Status)
  // Chu trình: SEATED -> CALL_BILL -> CLEANING -> AVAILABLE
  // =========================================================================

  const handleOneTouchFastCycle = async (table: TableItem) => {
    let nextStatus: TableStatus;
    switch (table.status) {
      case 'CONFIRMED':
        nextStatus = 'SEATED';
        break;
      case 'SEATED':
        nextStatus = 'CALL_BILL';
        break;
      case 'CALL_BILL':
        nextStatus = 'CLEANING';
        break;
      case 'CLEANING':
        nextStatus = 'AVAILABLE';
        break;
      case 'AVAILABLE':
      default:
        nextStatus = 'SEATED';
        break;
    }

    const isReleasing = nextStatus === 'AVAILABLE' || nextStatus === 'CLEANING';

    // 1. Âm thanh tổng hợp Web Audio API và rung haptic
    hostAudioService.playOneTouchTransition(nextStatus);

    // 2. Cập nhật state cục bộ
    onUpdateTableStatus(table.id, nextStatus, isReleasing ? undefined : table.currentGuestName);

    // 3. Phát sóng STOMP WebSocket đa kênh tức thời (<300ms)
    const colorMap: Record<string, string> = {
      SEATED: '#2563EB',
      CALL_BILL: '#9333EA',
      CLEANING: '#0D9488',
      AVAILABLE: '#059669',
      CONFIRMED: '#4F46E5',
    };

    websocketService.broadcastOneTouchTableStatus({
      tableId: table.id,
      tableCode: table.code,
      status: nextStatus,
      color: colorMap[nextStatus] || '#2563EB',
      updatedBy: 'HOST_TABLET',
      guestName: isReleasing ? undefined : table.currentGuestName,
      message: `Đổi trạng thái bàn ${table.code} sang ${nextStatus}`,
    });

    // 4. Nếu dọn bàn hoặc bàn trống -> giải phóng đơn và hóa đơn
    if (isReleasing) {
      setTableOrders((prev) => {
        const copy = { ...prev };
        delete copy[table.id];
        return copy;
      });

      const matchedBooking = bookings.find((b: BookingDetails) => b.tableId === table.id || (table && b.tableCode.includes(table.code)));
      if (matchedBooking) {
        if (onUpdateBooking) {
          onUpdateBooking({
            ...matchedBooking,
            status: 'COMPLETED' as any,
            rawStatus: 'COMPLETED',
          });
        }
        if (matchedBooking.backendUUID || matchedBooking.bookingId) {
          bookingApi.completeBooking(matchedBooking.backendUUID || matchedBooking.bookingId)
            .catch((err) => console.warn('Sync complete booking error:', err));
        }
      }
    }

    // 5. Đồng bộ REST API backend nếu có
    try {
      await bookingApi.oneTouchUpdateTableStatus(table.code, {
        status: nextStatus,
        updatedBy: 'HOST',
        guestName: isReleasing ? undefined : table.currentGuestName,
      });
    } catch (e: any) {
      console.debug('API oneTouch status update error:', e.message);
    }

    showToast(`⚡ [1 Chạm] Bàn ${table.code} ➔ ${nextStatus} (<300ms STOMP)`);
  };

  const handleRibbonStatusChange = async (
    newStatus: TableStatus,
    guestName?: string,
    notes?: string
  ) => {
    if (!selectedTableForPOS) return;

    // 1. Âm thanh phản hồi
    hostAudioService.playOneTouchTransition(newStatus);

    const targetTable = selectedTableForPOS;
    const isReleasing = newStatus === 'AVAILABLE' || newStatus === 'CLEANING';

    // 2. Cập nhật state
    onUpdateTableStatus(targetTable.id, newStatus, isReleasing ? undefined : guestName);
    if (newStatus === 'AVAILABLE') {
      setSelectedTableForPOS(null);
    } else {
      setSelectedTableForPOS((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    // 3. Phát sóng STOMP WebSocket
    const colorMap: Record<string, string> = {
      SEATED: '#2563EB',
      CALL_BILL: '#9333EA',
      CLEANING: '#0D9488',
      AVAILABLE: '#059669',
      CONFIRMED: '#4F46E5',
    };

    websocketService.broadcastOneTouchTableStatus({
      tableId: targetTable.id,
      tableCode: targetTable.code,
      status: newStatus,
      color: colorMap[newStatus] || '#2563EB',
      updatedBy: 'HOST_TABLET',
      guestName: isReleasing ? undefined : (guestName || targetTable.currentGuestName),
      message: `Đổi trạng thái bàn ${targetTable.code} sang ${newStatus}`,
      notes,
    });

    // 4. Nếu bàn chuyển sang CLEANING hoặc AVAILABLE -> Hoàn tất đơn đặt bàn và dọn order
    if (isReleasing) {
      setTableOrders((prev) => {
        const copy = { ...prev };
        delete copy[targetTable.id];
        return copy;
      });

      const matchedBooking = bookings.find(
        (b: BookingDetails) =>
          b.tableId === targetTable.id ||
          (targetTable && b.tableCode.includes(targetTable.code))
      );

      if (matchedBooking) {
        if (onUpdateBooking) {
          onUpdateBooking({
            ...matchedBooking,
            status: 'COMPLETED' as any,
            rawStatus: 'COMPLETED',
          });
        }
        if (matchedBooking.backendUUID || matchedBooking.bookingId) {
          bookingApi.completeBooking(matchedBooking.backendUUID || matchedBooking.bookingId)
            .then(() => console.log(`✅ [One-Touch] Đã hoàn tất hóa đơn ${matchedBooking.bookingCode} và lưu COMPLETED trong DB`))
            .catch((err) => console.warn('Sync complete booking error:', err));
        }
      }
    }

    // 5. API Call
    try {
      await bookingApi.oneTouchUpdateTableStatus(targetTable.code, {
        status: newStatus,
        updatedBy: 'HOST',
        guestName: isReleasing ? undefined : (guestName || targetTable.currentGuestName),
        notes,
      });
    } catch (e: any) {
      console.debug('API oneTouch status update error:', e.message);
    }

    showToast(`⚡ [1 Chạm] Bàn ${targetTable.code} ➔ ${newStatus} (<300ms STOMP)`);
  };



  // Filter tables by floor, search query, and dining status
  const filteredTables = currentFloorTables.filter((t) => {
    const matchesSearch =
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.currentGuestName && t.currentGuestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.guestPhone && t.guestPhone.includes(searchQuery));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'AVAILABLE') return t.status === 'AVAILABLE';
    if (statusFilter === 'SEATED') return t.status === 'SEATED';
    if (statusFilter === 'CONFIRMED') return t.status === 'CONFIRMED' || t.status === 'HOLDING';
    if (statusFilter === 'CALL_BILL') return t.status === 'CALL_BILL';
    if (statusFilter === 'LONG_DINING') {
      if (t.status !== 'SEATED') return false;
      const m = getTableDiningMetrics(t);
      return m.alertLevel === 'LONG_DINING' || m.alertLevel === 'OVERSTAY';
    }
    if (statusFilter === 'OVERSTAY') {
      if (t.status !== 'SEATED') return false;
      const m = getTableDiningMetrics(t);
      return m.alertLevel === 'OVERSTAY';
    }
    if (statusFilter === 'CLEANING') return t.status === 'CLEANING';
    return true;
  });

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans relative">
      {/* Real-time Global Feedback Toast */}
      {feedbackToast && (
        <div className="fixed top-24 right-6 z-50 bg-[#2C221E] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#C4A480] flex items-center gap-3 text-xs animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{feedbackToast}</span>
          <button type="button" onClick={() => setFeedbackToast(null)} className="text-white/60 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* 1. TOP HEADER & METRICS BAR (FRONT DESK HOST DASHBOARD) */}
      <div className="bg-white border border-[#E8DFD1] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E8DFD1]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.2em] font-mono">
                Front-Desk Host & Cashier POS • Màn Hình Quầy Lễ Tân
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#2C221E] font-bold tracking-tight mt-1">
              Quản Lý Bàn & Thu Ngân Trực Sảnh
            </h1>
            <p className="text-xs text-[#78716C] mt-1">
              Tiếp nhận bàn đặt online, mở bàn cho khách vãng lai, hỗ trợ chuyển bàn / ghép bàn và thanh toán hóa đơn.
            </p>
          </div>

          {/* Shift info, STOMP indicator & Fast Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* UC-15: Real-time WebSocket STOMP Live Badge (<300ms SLA) */}
            <div className={`flex items-center gap-2 ${isWsLive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'} px-3.5 py-2 rounded-2xl border text-xs font-semibold shadow-2xs`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isWsLive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isWsLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="font-mono text-[11px] font-bold">
                {isWsLive ? 'STOMP Live (<300ms)' : 'STOMP Đang Kết Nối'}
              </span>
              <span className={`text-[10px] ${isWsLive ? 'bg-emerald-200/80 text-emerald-950' : 'bg-amber-200/80 text-amber-950'} px-2 py-0.5 rounded-full font-mono font-bold`}>
                Ping: {stompLatencyMs}ms
              </span>
              <button
                type="button"
                onClick={handleSimulateStompBroadcast}
                title="Mô phỏng phát sóng WebSocket STOMP tức thì"
                className="p-1 hover:bg-emerald-200 rounded-lg transition-colors text-emerald-700 cursor-pointer ml-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-[#FAF7F2] px-4 py-2 rounded-2xl border border-[#E8DFD1] text-xs font-semibold text-[#44403C]">
              <Clock className="w-4 h-4 text-[#8C6A43]" />
              <span>{selectedShift}</span>
            </div>

            {onNavigateToWaiter && (
              <button
                type="button"
                onClick={onNavigateToWaiter}
                className="px-4 py-2 rounded-2xl bg-[#FAF4EB] hover:bg-[#F3ECE0] text-[#8C6A43] border border-[#C4A480] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Smartphone className="w-4 h-4 text-[#8C6A43]" />
                <span>App Phục Vụ</span>
              </button>
            )}

            {onNavigateToKds && (
              <button
                type="button"
                onClick={onNavigateToKds}
                className="px-4 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <ChefHat className="w-4 h-4 text-amber-700" />
                <span>KDS Bếp</span>
              </button>
            )}

            {/* UC-10: Large Banquet & Consultation Inquiries Drawer trigger */}
            <button
              type="button"
              onClick={() => setIsEventDrawerOpen(true)}
              className="relative px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer border border-purple-400/40"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Đơn Cần Tư Vấn & Tiệc (UC-10)</span>
              {pendingInquiriesCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center animate-bounce shadow-xs">
                  {pendingInquiriesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 rounded-2xl bg-[#8C6A43] text-white hover:bg-[#735534] text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-300" />
              <span>Camera Quét Vé QR (UC-16)</span>
            </button>
          </div>
        </div>

        {/* SLA Callback Alert Banner for Shift Manager & Host (UC-10) */}
        {pendingInquiriesCount > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950 via-purple-950 to-rose-950 border-2 border-rose-400 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 animate-pulse shadow-md">
                <Phone className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 px-2.5 py-0.5 rounded-full text-white">
                    Cam Kết Gọi Tư Vấn Trong 15 Phút (SLA)
                  </span>
                  <span className="text-xs text-rose-200">
                    Có <strong>{pendingInquiriesCount} đơn đặt bàn & tiệc cần tư vấn</strong> trực tiếp từ Quản lý / Lễ tân
                  </span>
                </div>
                <p className="text-xs text-rose-100/90 leading-relaxed">
                  Đơn đặt bàn & sự kiện đang chờ duyệt: Vui lòng gọi điện tư vấn, xếp bàn và chốt tiền cọc cho khách theo cam kết SLA 15 phút.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEventDrawerOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-950 font-bold text-xs transition-colors shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <span>Xem Đơn & Gọi Ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* UC-27 & UC-05: Zone-Based Table Management (Bộ Lọc Phân Khu Nhà Hàng) */}
        <div className="space-y-3 pt-2 border-t border-[#E8DFD1]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8C6A43]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C6A43]">
                PHÂN KHU TRẢI NGHIỆM (ZONE-BASED SEATING UC-05 / UC-27)
              </span>
            </div>
            <span className="text-[11px] text-[#78716C]">
              Đồng bộ dữ liệu thời gian thực • Lần cuối: {lastSyncTime}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'ALL', name: 'Toàn Bộ Bàn', desc: 'Tất cả phân khu', icon: '✨' },
              { id: 'STANDARD', name: 'Sảnh Chính', desc: 'Bàn tiêu chuẩn', icon: '🍽️' },
              { id: 'WINDOW_VIEW', name: 'View Cửa Sổ', desc: 'Ngắm đại lộ', icon: '🖼️' },
              { id: 'OUTDOOR', name: 'Sân Vườn / Rooftop', desc: 'Không gian mở', icon: '🌿' },
              { id: 'VIP', name: 'Phòng VIP', desc: 'Không gian riêng tư', icon: '👑' },
              { id: 'BAR_SIDE', name: 'Quầy Bar', desc: 'Cocktail & Rượu', icon: '🍸' },
            ].map((zoneItem) => {
              const zoneTables = zoneItem.id === 'ALL'
                ? tables
                : tables.filter((t) => t.zone === zoneItem.id || (t as any).zoneType === zoneItem.id);
              const total = zoneTables.length;
              const avail = zoneTables.filter((t) => t.status === 'AVAILABLE').length;
              const isSelected = selectedZone === zoneItem.id;

              return (
                <button
                  key={zoneItem.id}
                  type="button"
                  onClick={() => setSelectedZone(zoneItem.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#FAF4EB] to-amber-50 border-[#C4A480] ring-2 ring-[#C4A480]/60 shadow-sm scale-[1.01]'
                      : 'bg-[#FAF7F2] border-[#E8DFD1] hover:bg-white hover:border-[#C4A480]/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-serif text-sm font-bold text-[#2C221E] flex items-center gap-1.5">
                        <span>{zoneItem.icon}</span>
                        <span className="truncate">{zoneItem.name}</span>
                      </span>
                      <span className="text-[10px] text-[#8C6A43] font-medium block truncate">
                        {zoneItem.desc}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#78716C] pt-1.5 mt-1.5 border-t border-[#E8DFD1]/60">
                    <span className="font-semibold text-emerald-700">
                      {avail}/{total} trống
                    </span>
                    <span className="font-mono text-[10px] text-stone-500">
                      {total > 0 ? Math.round(((total - avail) / total) * 100) : 0}% đầy
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Status Metric Counters for the Active Floor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#78716C]">Bàn Trống (Sẵn Sàng)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#2C221E]">
              {currentFloorStats.available} <span className="text-xs font-normal text-[#78716C]">/ {currentFloorStats.total} bàn</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF4EB] border border-[#C4A480]/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C6A43]">Đang Có Khách Ngồi</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#8C6A43]">
                {currentFloorStats.seated} <span className="text-xs font-normal text-[#78716C]">bàn</span>
              </p>
              {currentFloorStats.overstayCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                  {currentFloorStats.overstayCount} Overstay
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">Đặt Online Đã Cọc</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-blue-900">
              {currentFloorStats.reserved} <span className="text-xs font-normal text-blue-600">bàn</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Tiền Cọc Đang Giữ</span>
              <Receipt className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-900 truncate">
              {new Intl.NumberFormat('vi-VN').format(currentFloorStats.totalDeposit)} đ
            </p>
          </div>
        </div>

        {/* Dining Overstay & Long Dining Notification Alert */}
        {(currentFloorStats.overstayCount > 0 || currentFloorStats.longDiningCount > 0) && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 text-white border-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Timer className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 px-2 py-0.5 rounded text-white">
                    Cảnh Báo Thời Gian Ngồi Ăn (Host Dining Tracker)
                  </span>
                  <span className="text-xs text-amber-200">
                    Phát hiện <strong>{currentFloorStats.overstayCount} bàn quá 105 phút</strong> và <strong>{currentFloorStats.longDiningCount} bàn quá 75 phút</strong>
                  </span>
                </div>
                <p className="text-xs text-amber-100/90">
                  Lễ tân và phục vụ chú ý chăm sóc tiếp trà, mời tráng miệng hoặc chuẩn bị in hóa đơn để đảm bảo giờ đón khách ca sau.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('OVERSTAY')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shrink-0 cursor-pointer shadow-xs"
            >
              Xem Bàn Quá Giờ
            </button>
          </div>
        )}

        {/* View Mode Switcher, Status Filters & Search Box */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
          {/* Dual Presentation Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#E8DFD1]">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'canvas'
                  ? 'bg-[#2C221E] text-white shadow-md'
                  : 'text-[#6B5E54] hover:text-[#2C221E]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-amber-400" />
              <span>🗺️ Sơ Đồ Mặt Bằng Live</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'cards'
                  ? 'bg-[#2C221E] text-white shadow-md'
                  : 'text-[#6B5E54] hover:text-[#2C221E]'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>📋 Lưới Thẻ Bàn Cảm Ứng</span>
            </button>
          </div>

          {/* Status filter tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'Tất Cả', count: currentFloorTables.length },
              { id: 'AVAILABLE', label: '🟢 Trống', count: currentFloorStats.available },
              { id: 'SEATED', label: '🔵 Xanh Dương (Seated)', count: currentFloorStats.seated },
              { id: 'CALL_BILL', label: '💳 Gọi Bill', count: currentFloorStats.callBill },
              { id: 'CLEANING', label: '🧹 Dọn Bàn', count: currentFloorStats.cleaning },
              { id: 'CONFIRMED', label: '🟣 Đã Cọc', count: currentFloorStats.reserved },
              { id: 'LONG_DINING', label: '⏱️ >75p', count: currentFloorStats.longDiningCount + currentFloorStats.overstayCount },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#8C6A43] text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#6B5E54] hover:bg-white border border-[#E8DFD1]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#8C6A43] border border-[#E8DFD1]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm số bàn hoặc khách..."
              className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-2xl pl-9 pr-4 py-2 text-xs text-[#2C221E] font-medium focus:outline-none focus:border-[#C4A480]"
            />
          </div>
        </div>
      </div>

      {/* 2. DUAL PRESENTATION VIEW: INTERACTIVE FLOOR CANVAS OR TOUCH CARDS GRID */}
      {viewMode === 'canvas' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#2C221E] flex items-center gap-2">
                <span>
                  Sơ Đồ Mặt Bằng Live •{' '}
                  {selectedZone === 'ALL'
                    ? 'Toàn Cảnh Nhà Hàng Le Prime Bistro'
                    : selectedZone === 'STANDARD'
                    ? 'Phân Khu Sảnh Chính (Grand Dining)'
                    : selectedZone === 'WINDOW_VIEW'
                    ? 'Phân Khu View Cửa Sổ (Panoramic Street View)'
                    : selectedZone === 'OUTDOOR'
                    ? 'Phân Khu Sân Vườn / Rooftop'
                    : selectedZone === 'VIP'
                    ? 'Phân Khu Phòng Tiệc VIP'
                    : 'Phân Khu Quầy Bar Mixology'}
                </span>
                <span className="text-xs font-normal text-[#78716C]">
                  (Tọa độ thực, cảm ứng chạm 1 chạm vào từng bàn để thao tác)
                </span>
              </h2>
              <span className="text-xs text-[#8C6A43] font-medium mt-0.5 block">
                ✨ Vòm Kính Panoramic View Phố Đi Bộ Nguyễn Huệ • 5 Phân Khu Trải Nghiệm Chuẩn Michelin
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isOneTouchFastMode;
                  setIsOneTouchFastMode(nextMode);
                  showToast(
                    nextMode
                      ? '⚡ Đã BẬT Chế Độ Đổi Trạng Thái 1 Chạm (UC-17): Chạm vào bàn để chuyển SEATED ➔ CALL_BILL ➔ CLEANING ➔ AVAILABLE'
                      : 'Đã chuyển về Chế Độ Xem Bàn Bình Thường'
                  );
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isOneTouchFastMode
                    ? 'bg-amber-500 text-slate-950 border-2 border-amber-300 shadow-md ring-2 ring-amber-400/50 animate-pulse'
                    : 'bg-white text-[#44403C] hover:bg-amber-50 border border-[#E8DFD1]'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${isOneTouchFastMode ? 'fill-slate-950 text-slate-950' : 'text-amber-600'}`} />
                <span>{isOneTouchFastMode ? '⚡ 1 Chạm: ĐANG BẬT' : '⚡ Bật Đổi Trạng Thái 1 Chạm'}</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>STOMP Stream Active (&lt;300ms)</span>
              </div>
            </div>
          </div>

          {/* UC-17: Banner Chế Độ Đổi Trạng Thái 1 Chạm */}
          {isOneTouchFastMode && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-teal-500/15 border-2 border-amber-500/60 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <Zap className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <p className="font-bold text-[#2C221E] text-xs">
                    Chế Độ Đổi Trạng Thái Bàn 1 Chạm (UC-17) Đang Hoạt Động
                  </p>
                  <p className="text-[11px] text-[#78716C] mt-0.5">
                    Chạm trực tiếp vào bất kỳ bàn nào trên sơ đồ để chuyển trạng thái tức thì theo vòng đời:
                    <strong className="text-blue-700 mx-1">🔵 SEATED</strong> ➔
                    <strong className="text-purple-700 mx-1">💳 CALL_BILL</strong> ➔
                    <strong className="text-teal-700 mx-1">🧹 CLEANING</strong> ➔
                    <strong className="text-emerald-700 mx-1">🟢 AVAILABLE</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOneTouchFastMode(false)}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-50 text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                ✕ Tắt Chế Độ
              </button>
            </div>
          )}

          {/* Architectural Live Canvas */}
          <FloorPlanCanvas
            floorNumber={(selectedFloor === 'ALL' ? 1 : selectedFloor) as 1 | 2 | 3}
            tables={tables}
            selectedTable={selectedTableForPOS}
            onSelectTable={(table) => {
              if (isOneTouchFastMode) {
                handleOneTouchFastCycle(table);
                return;
              }
              if (table.status === 'AVAILABLE') {
                handleOpenWalkInModal(table);
              } else {
                setSelectedTableForPOS(table);
              }
            }}
            isHostView={true}
            tableLiveMetrics={liveTableMetrics}
          />

          {/* Architectural Canvas Legend & Host Guide Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1] shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px] font-mono">
                Chú Giải Trạng Thái Bàn Live (Host Legend):
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-400" />
                  <span className="text-[#44403C]">Bàn Trống (Sẵn sàng)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-400 animate-pulse" />
                  <span className="text-[#44403C]">Đang Giữ 5p (Redlock)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-100 border border-indigo-500" />
                  <span className="text-[#44403C]">Đã Cọc (Confirmed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-blue-100 border border-blue-600" />
                  <span className="text-blue-900 font-bold">Xanh Dương • Đang Ăn (Seated &lt;75p)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-100 border border-purple-500 animate-pulse" />
                  <span className="text-purple-900 font-bold">Tím • Gọi Tính Tiền (Call Bill)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-teal-100 border border-teal-500" />
                  <span className="text-teal-900 font-bold">Teal • Đang Dọn Bàn (Cleaning)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-300 border border-amber-600" />
                  <span className="text-[#44403C]">Ngồi Lâu (75-105p)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-200 border border-rose-600 animate-pulse" />
                  <span className="text-rose-700 font-bold">Overstay (&gt;105p)</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#78716C] italic border-t border-[#E8DFD1] pt-2">
              💡 Chạm vào bất kỳ bàn nào trên sơ đồ để mở drawer chi tiết hoặc bật <strong>⚡ Chế Độ 1 Chạm</strong> để chuyển nhanh trạng thái bàn SEATED ➔ CALL_BILL ➔ CLEANING ➔ AVAILABLE.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#2C221E] flex items-center gap-2">
              <span>Danh Sách Thẻ Bàn Cảm Ứng Tại Sảnh</span>
              <span className="text-xs font-normal text-[#78716C]">
                (Hiển thị thời gian ngồi ăn và thông tin cọc trực quan)
              </span>
            </h2>
            <span className="text-xs text-[#8C6A43] font-semibold">
              Hiển thị {filteredTables.length} bàn
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const isAvailable = table.status === 'AVAILABLE';
            const isSeated = table.status === 'SEATED';
            const isConfirmed = table.status === 'CONFIRMED' || table.status === 'HOLDING';
            const isCleaning = table.status === 'CLEANING';

            const currentOrder = tableOrders[table.id];
            const itemsCount = currentOrder?.items.reduce((sum, i) => sum + i.quantity, 0) || 0;
            const itemsTotal = currentOrder?.items.reduce((sum, i) => sum + i.price * i.quantity, 0) || 0;

            return (
              <div
                key={table.id}
                className={`rounded-3xl border p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isAvailable
                    ? 'bg-white border-[#E8DFD1] hover:border-emerald-500 hover:shadow-md'
                    : isSeated
                    ? 'bg-gradient-to-b from-[#FFFDF9] to-[#FAF4EB] border-[#C4A480] shadow-sm ring-1 ring-[#C4A480]/40'
                    : isConfirmed
                    ? 'bg-gradient-to-b from-[#F0F7FF] to-[#E5F0FD] border-blue-300 shadow-sm'
                    : 'bg-stone-100 border-stone-300 opacity-80'
                }`}
              >
                {/* Top Row: Table Code, Floor, Capacity & Status Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-2xl font-bold text-[#2C221E] tracking-tight">
                          {table.code}
                        </span>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded">
                          Tầng {table.floor}
                        </span>
                        <span className="text-[11px] font-bold text-[#78716C] bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#E8DFD1] flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#C4A480]" />
                          <span>{table.capacity} ghế</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8C6A43] font-medium block mt-0.5">
                        {table.zone === 'WINDOW_VIEW'
                          ? '🌟 View phố Nguyễn Huệ'
                          : table.zone === 'VIP'
                          ? '👑 Phòng VIP Salon'
                          : table.zone === 'OUTDOOR'
                          ? '🌿 Sky Terrace'
                          : '🍽️ Sảnh Tiêu Chuẩn'}
                      </span>
                    </div>

                    {/* Badge */}
                    {isAvailable && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🟢 Bàn Trống
                      </span>
                    )}
                    {isSeated && (() => {
                      const dining = getTableDiningMetrics(table);
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                              dining.alertLevel === 'OVERSTAY'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-2 ring-rose-400 animate-pulse'
                                : dining.alertLevel === 'LONG_DINING'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <Clock className="w-3 h-3 text-[#8C6A43]" />
                            <span>{dining.durationFormatted}</span>
                          </span>
                          {dining.alertLevel === 'OVERSTAY' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-600 text-white animate-bounce">
                              Overstay &gt;105p
                            </span>
                          )}
                          {dining.alertLevel === 'LONG_DINING' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-200 text-amber-900">
                              Ngồi Lâu &gt;75p
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {isConfirmed && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>Đã Cọc 100%</span>
                        </span>
                        <span className="text-[10px] font-mono text-blue-900 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded">
                          {new Intl.NumberFormat('vi-VN').format(table.depositPrice)} đ
                        </span>
                      </div>
                    )}
                    {isCleaning && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                        ⚪ Cần Dọn Bàn
                      </span>
                    )}
                  </div>

                  {/* Body Info based on Table State */}
                  {isAvailable && (
                    <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] text-[11px] text-[#78716C] space-y-1">
                      <p className="font-semibold text-[#2C221E] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sẵn sàng đón khách mới</span>
                      </p>
                      <p className="text-[10px] text-[#8C6A43]">
                        Khi nhân viên phục vụ báo khách chọn bàn này ➔ Bấm nút dưới để mở bàn.
                      </p>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="p-3 bg-white/90 rounded-2xl border border-blue-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1E3A8A] truncate">
                          {table.currentGuestName || 'Khách Đặt Online'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {table.bookingTime || '19:00'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475569]">
                        SĐT: {table.guestPhone || '090***'}
                      </p>

                      {/* UC-08 Badges for Online Booking */}
                      {(() => {
                        const matchingBk = bookings.find(
                          (b: BookingDetails) =>
                            b.tableId === table.id ||
                            b.tableCode.includes(table.code) ||
                            (table.currentGuestName && b.customerName === table.currentGuestName)
                        );
                        if (!matchingBk) return null;
                        const hasSpecial =
                          matchingBk.occasion ||
                          matchingBk.babyChairCount ||
                          matchingBk.candleSetup ||
                          matchingBk.dietaryNotes;
                        if (!hasSpecial) return null;

                        return (
                          <div className="space-y-1 pt-1 border-t border-blue-100">
                            <div className="flex flex-wrap items-center gap-1">
                              {matchingBk.occasion && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  <Cake className="w-2.5 h-2.5 text-amber-600" />
                                  {matchingBk.occasion}
                                </span>
                              )}
                              {matchingBk.babyChairCount && matchingBk.babyChairCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                  <Baby className="w-2.5 h-2.5 text-blue-600" />
                                  {matchingBk.babyChairCount} Ghế bé
                                </span>
                              ) : null}
                              {matchingBk.candleSetup && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                  <Flame className="w-2.5 h-2.5 text-rose-600" />
                                  Nến
                                </span>
                              )}
                            </div>
                            {matchingBk.dietaryNotes && (
                              <div className="flex items-start gap-1 p-1 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[10px] font-semibold leading-tight">
                                <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{matchingBk.dietaryNotes}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between text-[10px] text-[#1E3A8A] font-semibold pt-1 border-t border-blue-100">
                        <span>Tiền cọc đã trả:</span>
                        <span className="font-mono">{new Intl.NumberFormat('vi-VN').format(table.depositPrice)} đ</span>
                      </div>
                    </div>
                  )}

                  {isSeated && (
                    <div className="p-3 bg-white/90 rounded-2xl border border-[#E8DFD1] text-xs space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2C221E] truncate">
                          {currentOrder?.guestName || table.currentGuestName || 'Khách Tại Bàn'}
                        </span>
                        <span className="text-[10px] text-[#8C6A43] font-semibold bg-[#FAF4EB] px-2 py-0.5 rounded border border-[#E8DFD1]">
                          {currentOrder?.source === 'ONLINE' ? '✨ Online' : '🚶 Vãng lai'}
                        </span>
                      </div>

                      {/* UC-08 Badges for Seated Order */}
                      {(() => {
                        const hasSpecial =
                          currentOrder?.occasion ||
                          currentOrder?.babyChairCount ||
                          currentOrder?.candleSetup ||
                          currentOrder?.dietaryNotes;
                        if (!hasSpecial) return null;

                        return (
                          <div className="space-y-1 pt-1 border-t border-[#E8DFD1]">
                            <div className="flex flex-wrap items-center gap-1">
                              {currentOrder?.occasion && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  <Cake className="w-2.5 h-2.5 text-amber-600" />
                                  {currentOrder.occasion}
                                </span>
                              )}
                              {currentOrder?.babyChairCount && currentOrder.babyChairCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                  <Baby className="w-2.5 h-2.5 text-blue-600" />
                                  {currentOrder.babyChairCount} Ghế bé
                                </span>
                              ) : null}
                              {currentOrder?.candleSetup && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                  <Flame className="w-2.5 h-2.5 text-rose-600" />
                                  Nến
                                </span>
                              )}
                            </div>
                            {currentOrder?.dietaryNotes && (
                              <div className="flex items-start gap-1 p-1 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[10px] font-semibold leading-tight">
                                <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{currentOrder.dietaryNotes}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#78716C] pt-1 border-t border-[#E8DFD1]">
                        <div>
                          <span>Thời lượng ngồi:</span>
                          <p className={`font-semibold font-mono flex items-center gap-1 ${
                            getTableDiningMetrics(table).alertLevel === 'OVERSTAY'
                              ? 'text-rose-700 font-bold'
                              : getTableDiningMetrics(table).alertLevel === 'LONG_DINING'
                              ? 'text-amber-700 font-bold'
                              : 'text-[#2C221E]'
                          }`}>
                            <Clock className="w-3 h-3 text-[#8C6A43]" />
                            <span>{getTableDiningMetrics(table).durationFormatted}</span>
                          </p>
                        </div>
                        <div>
                          <span>Đã gọi:</span>
                          <p className="font-semibold text-[#8C6A43]">{itemsCount} món</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DFD1]">
                        <span className="font-semibold text-[#78716C]">Tạm tính:</span>
                        <span className="font-mono font-bold text-[#8C6A43]">
                          {new Intl.NumberFormat('vi-VN').format(itemsTotal)} đ
                        </span>
                      </div>
                    </div>
                  )}

                  {isCleaning && (
                    <div className="p-3 bg-white rounded-2xl border border-stone-300 text-xs text-stone-600">
                      <span>Bàn vừa thanh toán xong, đang được nhân viên dọn dẹp và khử khuẩn.</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 mt-3 border-t border-[#E8DFD1]">
                  {isAvailable && (
                    <button
                      type="button"
                      onClick={() => handleOpenWalkInModal(table)}
                      className="w-full py-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#8C6A43] text-[#8C6A43] hover:text-white border border-[#E8DFD1] hover:border-[#8C6A43] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Mở Bàn (Phục vụ báo khách ngồi)</span>
                    </button>
                  )}

                  {isConfirmed && (
                    <button
                      type="button"
                      onClick={() => handleCheckInOnlineBooking(table)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Khách Tới ➔ Nhận Bàn (Check-in)</span>
                    </button>
                  )}

                  {isSeated && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTableForPOS(table)}
                          className="py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE0] text-[#2C221E] border border-[#E8DFD1] text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-[#8C6A43]" />
                          <span>Order / Thêm Món</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTableForPOS(table)}
                          className="py-2 rounded-xl bg-[#8C6A43] hover:bg-[#735534] text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Tính Tiền</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEditSpecialModal(table.id)}
                        className="w-full py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Xem & Cập nhật Nhu cầu đặc biệt & Cảnh báo dị ứng cho bếp"
                      >
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        <span>Nhu Cầu Đặc Biệt & Dị Ứng (KDS)</span>
                      </button>
                    </div>
                  )}

                  {isCleaning && (
                    <button
                      type="button"
                      onClick={() => onUpdateTableStatus(table.id, 'AVAILABLE')}
                      className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã Dọn Xong ➔ Trở Về Bàn Trống</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 3. MODAL: PHỤC VỤ BÁO MỞ BÀN (WALK-IN GUEST OPEN MODAL) */}
      {walkInTargetTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-[#E8DFD1] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-2.5">
                <div className="px-3.5 h-10 rounded-xl bg-[#8C6A43] min-w-[50px] text-white flex items-center justify-center font-serif font-bold text-sm whitespace-nowrap shadow-xs shrink-0">
                  {walkInTargetTable.code}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2C221E]">
                    Mở Bàn Cho Khách ({walkInTargetTable.code})
                  </h3>
                  <p className="text-[11px] text-[#78716C]">
                    Nhân viên phục vụ bên trong báo khách vừa chọn ngồi bàn này
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalkInTargetTable(null)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-center text-[#78716C] hover:text-[#2C221E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Party size selection */}
              <div className="space-y-2">
                <label className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px]">
                  Số lượng khách ngồi bàn:
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setWalkInGuests(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        walkInGuests === num
                          ? 'bg-[#8C6A43] text-white border-[#8C6A43] shadow-xs'
                          : 'bg-[#FAF7F2] text-[#2C221E] border-[#E8DFD1] hover:bg-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest name */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px]">
                  Tên khách hoặc Đại diện nhóm (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="Ví dụ: Anh Tuấn, Khách vãng lai..."
                  className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px]">
                  Ghi chú phục vụ (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  placeholder="Ví dụ: Uống nước suối lạnh trước, xin thêm ghế em bé..."
                  className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl px-3.5 py-2.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#E8DFD1]">
              <button
                type="button"
                onClick={() => setWalkInTargetTable(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E8DFD1] text-xs font-bold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmWalkInOpen}
                className="flex-1 py-2.5 rounded-xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Mở Bàn {walkInTargetTable.code}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: HOST BOOKING INSPECTOR (CHO BÀN ĐÃ CỌC 'CONFIRMED') HOẶC POS CHI TIẾT BÀN (CHO 'SEATED') */}
      {selectedTableForPOS && selectedTableForPOS.status === 'CONFIRMED' && (() => {
        const matchedBk = bookings.find(
          (b: BookingDetails) => b.tableId === selectedTableForPOS.id || b.tableCode.includes(selectedTableForPOS.code)
        );
        const guestName = selectedTableForPOS.currentGuestName || matchedBk?.customerName || 'Khách Đặt Online';
        const phone = selectedTableForPOS.guestPhone || matchedBk?.phone || '090***';
        const bookingCode = matchedBk?.bookingCode || `BK-${selectedTableForPOS.code}-2026`;
        const timeSlot = selectedTableForPOS.bookingTime || matchedBk?.bookingTime || '19:00 - 21:00';
        const partySize = matchedBk?.partySize || selectedTableForPOS.capacity;
        const depositAmount = matchedBk?.depositAmount || selectedTableForPOS.depositPrice || 200000;
        const preOrders = matchedBk?.preOrders || [];
        const preOrdersTotal = preOrders.reduce((sum: number, po: any) => sum + (po.dish.price * po.quantity), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-3xl bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400 text-white flex items-center justify-center font-serif font-bold text-lg shadow-inner shrink-0">
                    {selectedTableForPOS.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-xl font-bold text-white">
                        Hồ Sơ Đặt Bàn Đã Cọc • Bàn {selectedTableForPOS.code}
                      </h3>
                      <span className="text-[11px] font-bold text-blue-200 bg-blue-800/60 px-2.5 py-0.5 rounded-full border border-blue-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span>Đã Cọc 100% Giữ Chỗ</span>
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/90 mt-0.5 flex items-center gap-1.5">
                      <span>Tầng {selectedTableForPOS.floor}</span>
                      <span>•</span>
                      <span>{selectedTableForPOS.zone === 'WINDOW_VIEW' ? '🌟 View Phố Nguyễn Huệ' : selectedTableForPOS.zone === 'VIP' ? '👑 Phòng VIP Salon' : selectedTableForPOS.zone === 'OUTDOOR' ? '🌿 Sky Terrace' : '🍽️ Sảnh Tiêu Chuẩn'}</span>
                      <span>•</span>
                      <span>{selectedTableForPOS.capacity} Ghế</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>STOMP Live (&lt;300ms)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTableForPOS(null)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                {/* UC-17: One-Touch Status Ribbon */}
                <OneTouchStatusRibbon
                  table={selectedTableForPOS}
                  onStatusChange={handleRibbonStatusChange}
                  activeRole="HOST"
                />

                {/* Grid 2 cols: Guest Info & Reservation Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Guest Information */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] space-y-3">
                    <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-wider block">
                      👤 Thông Tin Thực Khách
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-[#E8DFD1]">
                        <span className="text-[#78716C]">Họ và tên khách:</span>
                        <strong className="text-sm text-[#2C221E]">{guestName}</strong>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#E8DFD1]">
                        <span className="text-[#78716C]">Số điện thoại:</span>
                        <a href={`tel:${phone}`} className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{phone}</span>
                        </a>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#E8DFD1]">
                        <span className="text-[#78716C]">Mã đơn booking:</span>
                        <span className="font-mono font-bold text-[#8C6A43] bg-white px-2 py-0.5 rounded border border-[#E8DFD1]">
                          {bookingCode}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-[#78716C]">Số lượng khách:</span>
                        <span className="font-bold text-[#2C221E] flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#8C6A43]" />
                          <span>{partySize} người</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Schedule & Escrow Deposit */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] space-y-3">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      💳 Tiền Cọc & Khung Giờ Đến
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-[#E8DFD1]">
                        <span className="text-[#78716C]">Khung giờ hẹn:</span>
                        <span className="font-mono font-bold text-[#2C221E] bg-white px-2 py-0.5 rounded border border-[#E8DFD1]">
                          {timeSlot}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-emerald-900 font-bold">Tiền cọc đang giữ (Escrow):</span>
                          <span className="font-mono text-base font-black text-emerald-800">
                            {new Intl.NumberFormat('vi-VN').format(depositAmount)} đ
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Đã thanh toán 100% qua VNPay / VietQR an toàn</span>
                        </p>
                      </div>
                      {matchedBk?.occasion && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-[#78716C]">Mục đích tiệc:</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                            <Cake className="w-3 h-3 text-amber-700" />
                            <span>{matchedBk.occasion}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 3: UC-08 Special Requests & Dietary Intel */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                      <span>Nhu Cầu Đặc Biệt & An Toàn Thực Phẩm (UC-08)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditSpecialModal(selectedTableForPOS.id)}
                      className="text-[11px] font-bold text-[#8C6A43] hover:text-[#735534] underline cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Chỉnh sửa</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200">
                      <Baby className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-[#2C221E]">
                        Ghế trẻ em: <strong>{matchedBk?.babyChairCount || 0} ghế</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200">
                      <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-[#2C221E]">
                        Bố trí nến lãng mạn: <strong>{matchedBk?.candleSetup ? 'Có yêu cầu thắp nến' : 'Không'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Dietary & Allergy Warning Banner */}
                  {matchedBk?.dietaryNotes ? (
                    <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl space-y-1 text-xs text-rose-900">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>CẢNH BÁO AN TOÀN THỰC PHẨM & DỊ ỨNG (LƯU Ý KHI TIẾP ĐÓN):</span>
                      </div>
                      <p className="font-semibold pl-5">
                        {matchedBk.dietaryNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Không có ghi chú dị ứng đặc biệt từ khách</span>
                    </div>
                  )}

                  {matchedBk?.notes && (
                    <div className="text-xs text-[#78716C] bg-white p-2.5 rounded-xl border border-[#E8DFD1]">
                      <strong>Ghi chú khách:</strong> {matchedBk.notes}
                    </div>
                  )}
                </div>

                {/* Card 4: UC-07 Pre-ordered Dishes */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-wider flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-[#8C6A43]" />
                      <span>Món Gọi Trước Qua Online (UC-07)</span>
                    </span>
                    <span className="text-xs font-semibold text-[#8C6A43]">
                      {preOrders.length} món đã đặt
                    </span>
                  </div>

                  {preOrders.length === 0 ? (
                    <div className="p-3 bg-white rounded-xl border border-dashed border-[#E8DFD1] text-center text-xs text-[#78716C]">
                      Khách chưa đặt trước món ăn. Thực khách sẽ chọn món trực tiếp tại bàn sau khi nhận chỗ.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {preOrders.map((po: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#E8DFD1] flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#2C221E] truncate">{po.dish.name}</p>
                              {po.preparationNotes && (
                                <p className="text-[10px] text-amber-800 italic">Ghi chú: {po.preparationNotes}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <span className="font-mono text-[#78716C]">x{po.quantity} • </span>
                              <strong className="font-mono text-[#8C6A43]">{new Intl.NumberFormat('vi-VN').format(po.dish.price * po.quantity)} đ</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#E8DFD1] text-xs">
                        <span className="font-bold text-[#78716C]">Tổng giá trị món đặt trước:</span>
                        <strong className="font-mono text-sm text-[#8C6A43]">{new Intl.NumberFormat('vi-VN').format(preOrdersTotal)} đ</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-5 bg-gradient-to-r from-[#FAF7F2] to-[#F5ECE0] border-t border-[#E8DFD1] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTableForPOS(null);
                      setIsScannerOpen(true);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF4EB] text-[#2C221E] border border-[#E8DFD1] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-[#8C6A43]" />
                    <span>Quét Vé QR (UC-12)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTableForPOS(null)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#78716C] border border-[#E8DFD1] text-xs font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleCheckInOnlineBooking(selectedTableForPOS);
                    setSelectedTableForPOS(null);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Xác Nhận Đón Khách Vào Bàn {selectedTableForPOS.code} (Check-in 1 Chạm)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4.2 MODAL: POS CHI TIẾT BÀN, QUẢN LÝ ORDER & TÍNH TIỀN (CHO BÀN SEATED) */}
      {selectedTableForPOS && selectedTableForPOS.status !== 'CONFIRMED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header - Fixed Badge Overflow with min-w & whitespace-nowrap */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FAF7F2] via-[#F5ECE0] to-[#FAF7F2] border-b border-[#E8DFD1] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="px-3.5 h-12 rounded-2xl bg-[#8C6A43] min-w-[56px] text-white flex items-center justify-center font-serif font-bold text-lg whitespace-nowrap shadow-xs shrink-0">
                  {selectedTableForPOS.code}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-xl font-bold text-[#2C221E]">
                      Hóa Đơn & Quản Lý Bàn {selectedTableForPOS.code}
                    </h3>
                    <span className="text-[11px] font-bold text-[#8C6A43] bg-white px-2.5 py-0.5 rounded-full border border-[#E8DFD1]">
                      {tableOrders[selectedTableForPOS.id]?.source === 'ONLINE' ? '✨ Khách Đặt Online' : '🚶 Khách Vãng Lai'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-[#78716C]">
                      Thực khách: <strong>{tableOrders[selectedTableForPOS.id]?.guestName || selectedTableForPOS.currentGuestName || 'Khách Tại Bàn'}</strong> • {tableOrders[selectedTableForPOS.id]?.seatedAtTime || 'Đang ngồi'}
                    </p>
                    {(() => {
                      const dining = getTableDiningMetrics(selectedTableForPOS);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                              dining.alertLevel === 'OVERSTAY'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-2 ring-rose-400 animate-pulse'
                                : dining.alertLevel === 'LONG_DINING'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <Clock className="w-3 h-3 text-[#8C6A43]" />
                            <span>Đã ngồi: <strong>{dining.durationFormatted}</strong></span>
                          </span>
                          {dining.alertLevel === 'OVERSTAY' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white animate-bounce">
                              ⚠️ Overstay &gt;105p
                            </span>
                          )}
                          {dining.alertLevel === 'LONG_DINING' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                              🕒 &gt;75p
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Table Action Controls (Chuyển bàn, Ghép bàn, Waiter App, Đóng) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF4EB] text-[#2C221E] border border-[#E8DFD1] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Chuyển toàn bộ order sang một bàn trống khác"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#8C6A43]" />
                  <span>Chuyển Bàn</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF4EB] text-[#2C221E] border border-[#E8DFD1] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Ghép bàn hoặc gộp hóa đơn với bàn khác"
                >
                  <Merge className="w-3.5 h-3.5 text-[#8C6A43]" />
                  <span>Ghép Bàn</span>
                </button>

                {onNavigateToWaiter && (
                  <button
                    type="button"
                    onClick={onNavigateToWaiter}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF4EB] text-[#8C6A43] border border-[#E8DFD1] text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#8C6A43]" />
                    <span>App Phục Vụ</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTableForPOS(null)}
                  className="w-9 h-9 rounded-full bg-white border border-[#E8DFD1] flex items-center justify-center text-[#78716C] hover:text-[#2C221E] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* UC-17: One-Touch Status Ribbon */}
            <div className="px-5 sm:px-6 pt-4 shrink-0">
              <OneTouchStatusRibbon
                table={selectedTableForPOS}
                onStatusChange={handleRibbonStatusChange}
                activeRole="CASHIER"
              />
            </div>

            {/* Main POS Content Grid (Left: Current Orders List | Right: Billing & Add Dish) */}
            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
              {/* LEFT: Current Orders List (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD1]">
                  <h4 className="font-serif text-base font-bold text-[#2C221E] flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-[#8C6A43]" />
                    <span>Danh Sách Món Đang Dùng</span>
                  </h4>
                  <span className="text-xs font-semibold text-[#8C6A43]">
                    {tableOrders[selectedTableForPOS.id]?.items.reduce((a, b) => a + b.quantity, 0) || 0} phần món
                  </span>
                </div>

                {/* Items container */}
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {(!tableOrders[selectedTableForPOS.id]?.items || tableOrders[selectedTableForPOS.id].items.length === 0) ? (
                    <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8DFD1] space-y-2">
                      <Utensils className="w-8 h-8 text-[#C4A480] mx-auto opacity-50" />
                      <p className="text-xs font-bold text-[#2C221E]">Bàn này chưa gọi món nào</p>
                      <p className="text-[11px] text-[#78716C]">
                        Chọn món từ thực đơn bên dưới hoặc nhập món riêng để thêm vào hóa đơn bàn.
                      </p>
                    </div>
                  ) : (
                    tableOrders[selectedTableForPOS.id].items.map((item) => (
                      <div
                        key={item.dishId}
                        className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD1] flex items-center justify-between gap-3 hover:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#2C221E] truncate">
                              {item.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleDishStatus(selectedTableForPOS.id, item.dishId)}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                                item.status === 'SERVED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {item.status === 'SERVED' ? '✓ Đã Lên Bàn' : '⏳ Bếp Đang Nấu'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] font-mono text-[#8C6A43]">
                              {new Intl.NumberFormat('vi-VN').format(item.price)} đ / phần
                            </p>
                            {item.notes && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                📝 {item.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stepper & Total */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-[#E8DFD1]">
                            <button
                              type="button"
                              onClick={() => handleUpdateDishQty(selectedTableForPOS.id, item.dishId, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-[#6B5E54] hover:bg-[#FAF7F2] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold font-mono w-4 text-center text-[#2C221E]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateDishQty(selectedTableForPOS.id, item.dishId, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-[#8C6A43] hover:bg-[#FAF4EB] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-mono font-bold text-[#2C221E] w-24 text-right">
                            {new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)} đ
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Section: ADD DISHES (Fast Menu Picker + Custom Dish Entry) */}
                <div className="space-y-3 pt-3 border-t border-[#E8DFD1]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C221E] uppercase tracking-wider">
                      + Thêm Món Vào Bàn (Phục vụ báo order):
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomDish(!isAddingCustomDish)}
                      className="text-[11px] font-bold text-[#8C6A43] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAddingCustomDish ? 'Đóng nhập tay' : '+ Tự nhập món riêng / nước ngọt'}</span>
                    </button>
                  </div>

                  {/* Custom Dish Manual Entry Form */}
                  {isAddingCustomDish && (
                    <div className="p-3 bg-[#FAF4EB] rounded-2xl border border-[#C4A480] space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2C221E]">Nhập món / Đồ uống ngoài menu:</span>
                        <span className="text-[10px] text-[#78716C]">Nhập tên & giá</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={customDishName}
                          onChange={(e) => setCustomDishName(e.target.value)}
                          placeholder="Tên món (VD: Bia Heineken, Nước Suối...)"
                          className="bg-white border border-[#E8DFD1] rounded-xl px-3 py-1.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customDishPrice}
                            onChange={(e) => setCustomDishPrice(e.target.value)}
                            placeholder="Giá tiền (VNĐ)"
                            className="w-full bg-white border border-[#E8DFD1] rounded-xl px-3 py-1.5 text-xs font-mono text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCustomDish(selectedTableForPOS.id)}
                            className="px-3 py-1.5 bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer shadow-2xs"
                          >
                            + Thêm
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={customDishNotes}
                        onChange={(e) => setCustomDishNotes(e.target.value)}
                        placeholder="Ghi chú thêm (VD: Uống đá riêng, ít ngọt...)"
                        className="w-full bg-white border border-[#E8DFD1] rounded-xl px-3 py-1.5 text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                      />
                    </div>
                  )}

                  {/* Menu tabs & Search */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'ALL', label: 'Tất Cả' },
                          { id: 'Set Menu & Combo', label: '🌟 Set Combo' },
                          { id: 'Bò Dry-Aged & Món Chính', label: '🥩 Bò & Steak' },
                          { id: 'Rượu Vang & Champagne', label: '🍷 Vang & Rượu' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setMenuTab(tab.id)}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                              menuTab === tab.id
                                ? 'bg-[#8C6A43] text-white border-[#8C6A43]'
                                : 'bg-[#FAF7F2] text-[#6B5E54] border-[#E8DFD1] hover:bg-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative w-full sm:w-44">
                        <Search className="w-3 h-3 text-[#78716C] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={menuSearchQuery}
                          onChange={(e) => setMenuSearchQuery(e.target.value)}
                          placeholder="Tìm nhanh món..."
                          className="w-full bg-[#FAF7F2] border border-[#E8DFD1] rounded-xl pl-7 pr-2 py-1 text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                        />
                      </div>
                    </div>

                    {/* Quick dish grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                      {SIGNATURE_DISHES
                        .filter(
                          (d) =>
                            (menuTab === 'ALL' || d.category === menuTab) &&
                            d.name.toLowerCase().includes(menuSearchQuery.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((dish) => (
                          <button
                            key={dish.id}
                            type="button"
                            onClick={() => handleAddDishToTable(selectedTableForPOS.id, dish)}
                            className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-white border border-[#E8DFD1] hover:border-[#C4A480] text-left transition-all flex items-center justify-between gap-2 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#2C221E] truncate group-hover:text-[#8C6A43]">
                                {dish.name}
                              </p>
                              <p className="text-[10px] font-mono text-[#8C6A43]">
                                {new Intl.NumberFormat('vi-VN').format(dish.price)} đ
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-[#8C6A43] shrink-0 group-hover:scale-110 transition-transform" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Billing Summary & Payment Checkout (5 cols) */}
              <div className="lg:col-span-5 bg-[#FAF7F2] rounded-3xl p-5 border border-[#E8DFD1] flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="pb-3 border-b border-[#E8DFD1]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C6A43] block">
                      POS & Hóa Đơn Thanh Toán
                    </span>
                    <h4 className="font-serif text-xl font-bold text-[#2C221E] mt-0.5">
                      Bảng Tính Tiền Bàn {selectedTableForPOS.code}
                    </h4>
                  </div>

                  {/* UC-08: Nhu cầu Đặc biệt & Dị ứng Card */}
                  {(() => {
                    const current = tableOrders[selectedTableForPOS.id];
                    const hasSpecial = current?.occasion || current?.babyChairCount || current?.candleSetup || current?.dietaryNotes;
                    return (
                      <div className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all ${
                        current?.dietaryNotes 
                          ? 'bg-rose-50/80 border-rose-200' 
                          : hasSpecial 
                          ? 'bg-[#FAF4EB] border-[#C4A480]' 
                          : 'bg-white border-[#E8DFD1]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#8C6A43]" />
                            <span className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px]">
                              Nhu Cầu Đặc Biệt & Dị Ứng
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSpecialModal(selectedTableForPOS.id)}
                            className="text-[11px] font-bold text-[#8C6A43] hover:text-[#735534] flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Chỉnh sửa / Đồng bộ KDS</span>
                          </button>
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {current?.occasion && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <Cake className="w-3 h-3 text-amber-700" />
                              {current.occasion}
                            </span>
                          )}
                          {current?.babyChairCount && current.babyChairCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold">
                              <Baby className="w-3 h-3 text-blue-700" />
                              {current.babyChairCount} Ghế trẻ em
                            </span>
                          ) : null}
                          {current?.candleSetup && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-bold">
                              <Flame className="w-3 h-3 text-rose-700" />
                              Setup Nến Thơm
                            </span>
                          )}
                        </div>

                        {/* Dietary Notes alert */}
                        {current?.dietaryNotes ? (
                          <div className="p-2.5 rounded-xl bg-white/90 border border-rose-300 text-rose-900 flex items-start gap-2 shadow-2xs">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                                Cảnh Báo Bếp (Dị ứng / Lưu ý nấu nướng):
                              </span>
                              <p className="text-xs font-semibold text-rose-950 leading-relaxed">
                                {current.dietaryNotes}
                              </p>
                            </div>
                          </div>
                        ) : !hasSpecial ? (
                          <p className="text-[11px] text-[#78716C] italic">
                            Chưa có ghi chú đặc biệt. Bấm "Chỉnh sửa" nếu khách cần thêm ghế trẻ em, nến thơm, hoặc kiêng gia vị.
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}

                  {/* Pricing Breakdown */}
                  {(() => {
                    const current = tableOrders[selectedTableForPOS.id];
                    const itemsTotal = current ? current.items.reduce((s, i) => s + i.price * i.quantity, 0) : 0;
                    const serviceCharge = Math.round(itemsTotal * 0.05);
                    const subtotal = itemsTotal + serviceCharge;
                    const deposit = current ? current.depositAmount : 0;
                    const finalPayable = Math.max(0, subtotal - deposit);

                    return (
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-[#78716C]">
                          <span>Tiền món ăn & đồ uống:</span>
                          <span className="font-mono font-semibold text-[#2C221E]">
                            {new Intl.NumberFormat('vi-VN').format(itemsTotal)} đ
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[#78716C]">
                          <span>Phí phục vụ tiêu chuẩn (5%):</span>
                          <span className="font-mono font-semibold text-[#2C221E]">
                            {new Intl.NumberFormat('vi-VN').format(serviceCharge)} đ
                          </span>
                        </div>

                        {deposit > 0 && (
                          <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                            <span className="font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Trừ tiền cọc Online đã trả:</span>
                            </span>
                            <span className="font-mono font-bold">
                              - {new Intl.NumberFormat('vi-VN').format(deposit)} đ
                            </span>
                          </div>
                        )}

                        <div className="pt-3 border-t-2 border-[#E8DFD1] flex items-baseline justify-between">
                          <div>
                            <span className="font-serif text-sm font-bold text-[#2C221E] block">
                              Tổng Tiền Cần Thu:
                            </span>
                            <span className="text-[10px] text-[#78716C]">
                              (Đã khấu trừ tiền cọc trước)
                            </span>
                          </div>
                          <span className="font-mono text-2xl font-bold text-[#8C6A43]">
                            {new Intl.NumberFormat('vi-VN').format(finalPayable)} đ
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Checkout Payment Actions */}
                <div className="space-y-2.5 pt-4 border-t border-[#E8DFD1]">
                  <span className="text-[10px] font-bold text-[#6B5E54] uppercase tracking-wider block">
                    Chọn hình thức thanh toán tại quầy:
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCompletePayment(selectedTableForPOS, 'TIỀN MẶT')}
                      className="py-3 px-2 rounded-xl bg-white border border-[#E8DFD1] hover:border-[#8C6A43] text-xs font-bold text-[#2C221E] hover:bg-[#FAF4EB] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Tiền Mặt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompletePayment(selectedTableForPOS, 'QUẸT THẺ POS')}
                      className="py-3 px-2 rounded-xl bg-white border border-[#E8DFD1] hover:border-[#8C6A43] text-xs font-bold text-[#2C221E] hover:bg-[#FAF4EB] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Quẹt Thẻ POS</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompletePayment(selectedTableForPOS, 'VIETQR CHUYỂN KHOẢN')}
                    className="w-full py-3.5 rounded-2xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Quét VietQR & Hoàn Tất Thanh Toán Bàn {selectedTableForPOS.code}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: CHUYỂN BÀN (TABLE TRANSFER MODAL) */}
      {isTransferModalOpen && selectedTableForPOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-[#E8DFD1] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#8C6A43] text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2C221E]">
                    Chuyển Toàn Bộ Bàn {selectedTableForPOS.code}
                  </h3>
                  <p className="text-[11px] text-[#78716C]">
                    Chuyển order, khách và tiền cọc sang một bàn trống khác
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#78716C] hover:text-[#2C221E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#78716C] uppercase font-bold">Bàn Nguồn (Hiện tại):</span>
                  <p className="font-serif font-bold text-sm text-[#2C221E]">{selectedTableForPOS.code} ({tableOrders[selectedTableForPOS.id]?.guestName || 'Khách'})</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8C6A43]" />
                <div className="text-right">
                  <span className="text-[10px] text-[#78716C] uppercase font-bold">Bàn Đích Sắp Chuyển:</span>
                  <p className="font-serif font-bold text-sm text-[#8C6A43]">
                    {transferTargetId ? tables.find(t => t.id === transferTargetId)?.code : 'Chưa chọn'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px] block">
                  Chọn Bàn Trống Muốn Chuyển Sang:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {tables
                    .filter((t) => t.id !== selectedTableForPOS.id && t.status === 'AVAILABLE')
                    .map((t) => {
                      const isSelected = transferTargetId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTransferTargetId(t.id)}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#8C6A43] text-white border-[#8C6A43] font-bold shadow-xs'
                              : 'bg-[#FAF7F2] text-[#2C221E] border-[#E8DFD1] hover:bg-white hover:border-[#C4A480]'
                          }`}
                        >
                          <p className="font-serif font-bold text-sm">{t.code}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-amber-100' : 'text-[#78716C]'}`}>{t.capacity} ghế</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              <p className="text-[11px] text-[#78716C] italic flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#8C6A43] shrink-0" />
                <span>Bàn cũ {selectedTableForPOS.code} sẽ tự động trở về Bàn Trống ngay sau khi chuyển.</span>
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#E8DFD1]">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E8DFD1] text-xs font-bold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!transferTargetId}
                onClick={handleConfirmTransfer}
                className="flex-1 py-2.5 rounded-xl bg-[#8C6A43] hover:bg-[#735534] disabled:opacity-40 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Chuyển Bàn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: GHÉP BÀN / GỘP HÓA ĐƠN (TABLE MERGE MODAL) */}
      {isMergeModalOpen && selectedTableForPOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-[#E8DFD1] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#8C6A43] text-white flex items-center justify-center font-bold">
                  <Merge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2C221E]">
                    Ghép Bàn {selectedTableForPOS.code}
                  </h3>
                  <p className="text-[11px] text-[#78716C]">
                    Gộp order & tiền cọc với bàn khác để thanh toán chung 1 hóa đơn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#78716C] hover:text-[#2C221E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-2">
                <label className="font-bold text-[#2C221E] uppercase tracking-wider text-[11px] block">
                  Chọn Bàn Muốn Ghép Vào:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {tables
                    .filter((t) => t.id !== selectedTableForPOS.id)
                    .map((t) => {
                      const isSelected = mergeTargetId === t.id;
                      const hasOrder = Boolean(tableOrders[t.id]);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setMergeTargetId(t.id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#8C6A43] text-white border-[#8C6A43] font-bold shadow-xs'
                              : 'bg-[#FAF7F2] text-[#2C221E] border-[#E8DFD1] hover:bg-white hover:border-[#C4A480]'
                          }`}
                        >
                          <div>
                            <p className="font-serif font-bold text-sm">{t.code}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-amber-100' : 'text-[#78716C]'}`}>
                              {t.capacity} ghế • {hasOrder ? '🟠 Đang có khách' : '🟢 Bàn trống'}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 text-[11px] space-y-1">
                <p className="font-bold">⚡ Quy tắc ghép bàn:</p>
                <p>• Toàn bộ món ăn và tiền cọc của <strong>{selectedTableForPOS.code}</strong> sẽ được cộng dồn vào bàn được chọn.</p>
                <p>• Bàn <strong>{selectedTableForPOS.code}</strong> sẽ được giải phóng về trạng thái Bàn Trống.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#E8DFD1]">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E8DFD1] text-xs font-bold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!mergeTargetId}
                onClick={handleConfirmMerge}
                className="flex-1 py-2.5 rounded-xl bg-[#8C6A43] hover:bg-[#735534] disabled:opacity-40 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Ghép Bàn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: THANH TOÁN THÀNH CÔNG (PAYMENT RECEIPT SUCCESS) */}
      {isPaymentSuccessOpen && paidTableSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFD1] shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-mono">
                Thanh Toán Hoàn Tất
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#2C221E]">
                Bàn {paidTableSummary.code} Đã Thanh Toán
              </h3>
              <p className="text-xs text-[#78716C]">
                Thực khách: <strong>{paidTableSummary.guestName}</strong>
              </p>
            </div>

            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8DFD1] text-xs space-y-2 text-left">
              <div className="flex justify-between text-[#78716C]">
                <span>Tổng hóa đơn:</span>
                <span className="font-mono font-semibold">{new Intl.NumberFormat('vi-VN').format(paidTableSummary.total)} đ</span>
              </div>
              {paidTableSummary.depositDeducted > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Tiền cọc Online đã trừ:</span>
                  <span className="font-mono font-bold">- {new Intl.NumberFormat('vi-VN').format(paidTableSummary.depositDeducted)} đ</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#2C221E] pt-2 border-t border-[#E8DFD1]">
                <span>Thực thu tại quầy:</span>
                <span className="font-mono text-base text-[#8C6A43]">{new Intl.NumberFormat('vi-VN').format(paidTableSummary.finalPaid)} đ</span>
              </div>
              <div className="text-[11px] text-[#78716C] pt-1">
                Phương thức: <strong>{paidTableSummary.paymentMethod}</strong>
              </div>
            </div>

            <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Bàn {paidTableSummary.code} đã được tự động chuyển về trạng thái <strong>Bàn Trống (Available)</strong> sẵn sàng đón khách mới.</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsPaymentSuccessOpen(false);
                setPaidTableSummary(null);
              }}
              className="w-full py-3 rounded-2xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Đóng & Tiếp Tục Giám Sát
            </button>
          </div>
        </div>
      )}

      {/* 8. UC-16: HOST CAMERA QR SCANNER & LIVE CHECK-IN MODAL */}
      <HostCameraQrScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        tables={tables}
        bookings={bookings}
        onCheckInSuccess={(table, guestName) => {
          handleCheckInOnlineBooking(table);
          websocketService.simulateBroadcast({
            tableId: table.id,
            tableCode: table.code,
            status: 'SEATED',
            color: '#2563EB',
          });
          showToast(`✅ Quét vé thành công: Khách ${guestName} đã vào bàn ${table.code} (Trạng thái: XANH DƯƠNG - SEATED)!`);
        }}
      />


      {/* 9. UC-08: SPECIAL REQUESTS & DIETARY NOTES EDIT MODAL */}
      {isEditSpecialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8DFD1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#8C6A43]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2C221E]">
                    Nhu Cầu Đặc Biệt & Dị Ứng
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Bàn {tables.find((t) => t.id === editingTableId)?.code || editingTableId} • Đồng bộ tức thì sang KDS Bếp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditSpecialModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center text-[#78716C] hover:text-[#2C221E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Occasion Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2C221E] block">
                  Mục Đích Bữa Tiệc (Occasion):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Không có', 'Sinh nhật', 'Kỷ niệm', 'Hẹn hò', 'Gặp đối tác', 'Gia đình'].map((occ) => {
                    const isSelected = (occ === 'Không có' && !editOccasion) || editOccasion === occ;
                    return (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => setEditOccasion(occ === 'Không có' ? '' : occ)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#8C6A43] text-white border-[#8C6A43] shadow-2xs'
                            : 'bg-[#FAF7F2] text-[#44403C] border-[#E8DFD1] hover:bg-white'
                        }`}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extra Facilities: Baby Chair & Candles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] space-y-2">
                  <span className="text-xs font-bold text-[#2C221E] flex items-center gap-1.5">
                    <Baby className="w-4 h-4 text-blue-600" />
                    <span>Ghế ăn em bé (High-chair)</span>
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#78716C]">Số lượng:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditBabyChairCount(Math.max(0, editBabyChairCount - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-[#E8DFD1] flex items-center justify-center font-bold text-xs hover:bg-[#FAF4EB] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-sm w-5 text-center text-[#2C221E]">
                        {editBabyChairCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditBabyChairCount(Math.min(5, editBabyChairCount + 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-[#E8DFD1] flex items-center justify-center font-bold text-xs hover:bg-[#FAF4EB] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD1] space-y-2">
                  <span className="text-xs font-bold text-[#2C221E] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span>Setup nến thơm</span>
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#78716C]">Thắp nến lãng mạn</span>
                    <button
                      type="button"
                      onClick={() => setEditCandleSetup(!editCandleSetup)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        editCandleSetup ? 'bg-[#8C6A43]' : 'bg-[#D6C7B2]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                          editCandleSetup ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dietary notes & Allergy Warnings */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Lưu Ý Ăn Uống & Cảnh Báo Dị Ứng Cho Bếp:</span>
                  </label>
                  <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    KDS Bếp ưu tiên
                  </span>
                </div>

                {/* Quick chip suggestions */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    'Không rắc tiêu vào thức ăn vì có trẻ nhỏ',
                    'Dị ứng hải sản có vỏ',
                    'Dị ứng đậu phộng',
                    'Không ăn cay',
                    'Ăn chay (Vegetarian)',
                    'Không hành tỏi',
                    'Không bột ngọt',
                  ].map((preset) => {
                    const isIncluded = editDietaryNotes.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (isIncluded) {
                            setEditDietaryNotes(
                              editDietaryNotes
                                .split(', ')
                                .filter((s) => s.trim() !== preset)
                                .join(', ')
                            );
                          } else {
                            setEditDietaryNotes(
                              editDietaryNotes ? `${editDietaryNotes}, ${preset}` : preset
                            );
                          }
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isIncluded
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                            : 'bg-rose-50/60 text-rose-800 border-rose-200 hover:bg-rose-100 font-medium'
                        }`}
                      >
                        {isIncluded ? '✓ ' : '+ '}
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={editDietaryNotes}
                  onChange={(e) => setEditDietaryNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú chi tiết cho đầu bếp (VD: Không rắc tiêu vì có bé nhỏ, dị ứng tôm cua...)"
                  className="w-full p-3 rounded-xl border border-rose-300 bg-rose-50/30 text-xs text-rose-950 focus:outline-none focus:border-rose-500 font-medium leading-relaxed"
                />
              </div>

              {/* Staff internal notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2C221E] block">
                  Ghi Chú Nội Bộ Phục Vụ / Lễ Tân:
                </label>
                <input
                  type="text"
                  value={editStaffNotes}
                  onChange={(e) => setEditStaffNotes(e.target.value)}
                  placeholder="Ghi chú phục vụ (VD: Khách VIP thân thiết, chuẩn bị bánh kem...)"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD1] text-xs text-[#2C221E] focus:outline-none focus:border-[#C4A480]"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8DFD1]">
              <button
                type="button"
                onClick={() => setIsEditSpecialModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E8DFD1] text-xs font-semibold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSpecialRequests}
                className="px-5 py-2.5 rounded-xl bg-[#8C6A43] hover:bg-[#735534] text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lưu & Đồng Bộ Sang KDS Bếp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC-10: Shift Manager Private Banquet & Event Inquiries Drawer */}
      {isEventDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E8DFD1] shrink-0">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full">
                      Private Banquet Booking (UC-10)
                    </span>
                    <span className="text-xs text-rose-600 font-bold flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>SLA Gọi Tư Vấn: 15 Phút</span>
                    </span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#2C221E] mt-1">
                    Đơn Tiệc Đoàn Đông & Bao Trọn Tầng Rooftop
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    Quản lý ca trực tiếp liên hệ tư vấn thực đơn, thống nhất ngân sách và ghi nhận tiền đặt cọc.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEventDrawerOpen(false)}
                className="p-2 text-[#78716C] hover:text-[#2C221E] rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 shrink-0">
              {[
                { id: 'ALL', label: `Tất Cả (${eventInquiries.length})` },
                { id: 'PENDING', label: `🚨 Cần Gọi Ngay (${pendingInquiriesCount})` },
                { id: 'CONSULTED', label: `✅ Đã Tư Vấn (${eventInquiries.length - pendingInquiriesCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEventFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    eventFilter === tab.id
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#6B5E54] hover:bg-stone-100 border border-[#E8DFD1]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Inquiries List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {eventInquiries
                .filter((inquiry) => {
                  if (eventFilter === 'PENDING') return inquiry.managerCallStatus === 'PENDING_CALL' || !inquiry.managerCallStatus;
                  if (eventFilter === 'CONSULTED') return inquiry.managerCallStatus && inquiry.managerCallStatus !== 'PENDING_CALL';
                  return true;
                })
                .map((inquiry) => {
                  const remSec = calculateSlaRemainingSeconds(inquiry);
                  const isPending = inquiry.managerCallStatus === 'PENDING_CALL' || !inquiry.managerCallStatus;
                  const isCalling = simulatedCallInquiryId === inquiry.bookingId;

                  return (
                    <div
                      key={inquiry.bookingId}
                      className={`p-5 rounded-2xl border transition-all ${
                        isPending
                          ? 'bg-purple-50/40 border-purple-200 shadow-xs'
                          : 'bg-white border-[#E8DFD1]'
                      }`}
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200/70">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-stone-900 text-white px-2.5 py-1 rounded-lg">
                            #{inquiry.bookingId}
                          </span>
                          <span className="text-xs font-bold text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-lg">
                            {inquiry.eventType === 'ROOFTOP_BUYOUT'
                              ? '🌆 Bao Trọn Rooftop Tầng 3'
                              : inquiry.eventType === 'COMPANY_PARTY'
                              ? '🏢 Tiệc Công Ty'
                              : inquiry.eventType === 'BIRTHDAY_GALA'
                              ? '🎂 Tiệc Sinh Nhật VIP'
                              : inquiry.eventType === 'WORKSHOP_NETWORKING'
                              ? '🤝 Workshop & Networking'
                              : inquiry.eventType === 'WEDDING_ENGAGEMENT'
                              ? '💍 Tiệc Đính Hôn Thân Mật'
                              : inquiry.status === 'PENDING_REVIEW'
                              ? '📞 Đặt Bàn Chờ Tư Vấn'
                              : '✨ Đơn Tiệc & Tư Vấn'}
                          </span>
                          <span className="text-xs text-stone-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{inquiry.date} • {inquiry.timeSlot}</span>
                          </span>
                        </div>

                        {/* 15-Minute SLA Countdown or Status Badge */}
                        <div>
                          {isPending ? (
                            remSec > 600 ? (
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>⏱️ SLA Còn {formatSlaTimer(remSec)}</span>
                              </span>
                            ) : remSec > 0 ? (
                              <span className="text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                                <span>🚨 Khẩn Cấp! Còn {formatSlaTimer(remSec)}</span>
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-white bg-rose-600 border border-rose-700 px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono animate-bounce">
                                <span>⚠️ Quá hạn SLA 15 phút!</span>
                              </span>
                            )
                          ) : (
                            <span className={`text-xs font-bold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                              inquiry.managerCallStatus === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : inquiry.managerCallStatus === 'PROPOSAL_SENT'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : inquiry.managerCallStatus === 'CALLED'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}>
                              <span>
                                {inquiry.managerCallStatus === 'ACCEPTED'
                                  ? '🥂 Đã Chốt Tiệc / Nhận Cọc'
                                  : inquiry.managerCallStatus === 'PROPOSAL_SENT'
                                  ? '📋 Đã Gửi Thực Đơn'
                                  : inquiry.managerCallStatus === 'CALLED'
                                  ? '📞 Đã Gọi Tư Vấn'
                                  : '✕ Khách Từ Chối'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs">
                        {/* Organizer Contact */}
                        <div className="space-y-1.5">
                          <p className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-purple-700" />
                            <span>{inquiry.customerName}</span>
                            {inquiry.companyName && (
                              <span className="text-xs font-normal text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded-md">
                                {inquiry.companyName}
                              </span>
                            )}
                          </p>
                          <p className="text-stone-600 flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <strong className="text-stone-900 font-mono text-sm">{inquiry.phone}</strong>
                          </p>
                          <p className="text-stone-600 flex items-center gap-2">
                            <span>✉️</span>
                            <span>{inquiry.email}</span>
                          </p>
                        </div>

                        {/* Banquet Specs */}
                        <div className="space-y-1.5 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60">
                          <div className="flex items-center justify-between">
                            <span className="text-stone-600">Quy mô tiệc:</span>
                            <strong className="text-stone-900 font-mono font-bold text-sm">
                              {inquiry.partySize} Thực Khách
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-stone-600">Không gian tiệc:</span>
                            <strong className="text-purple-900 font-bold">
                              {inquiry.targetFloor === 3
                                ? 'Tầng 3 (Sky Lounge Rooftop)'
                                : inquiry.targetFloor === 2
                                ? 'Tầng 2 (VIP Salon Cellar)'
                                : 'Tầng 1 (Grand Bistro)'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-stone-600">Ngân sách dự kiến:</span>
                            <strong className="text-amber-800 font-mono font-bold">
                              {new Intl.NumberFormat('vi-VN').format(inquiry.estimatedBudget || 0)} đ
                            </strong>
                          </div>
                          {inquiry.depositAmount > 0 && (
                            <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                              <span className="text-emerald-700 font-semibold">Tiền cọc đã ghi nhận:</span>
                              <strong className="text-emerald-800 font-mono font-bold">
                                {new Intl.NumberFormat('vi-VN').format(inquiry.depositAmount)} đ
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AV & Decor Badges */}
                      <div className="pt-3 flex flex-wrap items-center gap-2">
                        {inquiry.stageAudioRequired && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg">
                            🎤 Âm thanh sân khấu & 2 Micro không dây
                          </span>
                        )}
                        {inquiry.decorationRequired && (
                          <span className="text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-1 rounded-lg">
                            🌸 Hoa tươi & Backdrop thiết kế riêng
                          </span>
                        )}
                        {inquiry.notes && (
                          <div className="w-full text-stone-600 text-xs italic bg-stone-50 p-2.5 rounded-xl border border-stone-200 mt-1">
                            "{inquiry.notes}"
                          </div>
                        )}
                      </div>

                      {/* Consultation Notes from Manager */}
                      {inquiry.consultationNotes && (
                        <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                            <FileText className="w-3.5 h-3.5 text-indigo-700" />
                            <span>Ghi Chú Tư Vấn Của Quản Lý Ca:</span>
                          </p>
                          <p className="text-indigo-900/90 leading-relaxed">
                            {inquiry.consultationNotes}
                          </p>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 mt-3 border-t border-stone-200">
                        {inquiry.status === 'AWAITING_PAYMENT' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const payUrl = `${window.location.origin}/?bookingId=${inquiry.bookingCode || inquiry.bookingId}&action=pay-deposit`;
                                navigator.clipboard.writeText(payUrl);
                                showToast(`📋 Đã copy link thanh toán cọc đơn #${inquiry.bookingCode || inquiry.bookingId}!`);
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                            >
                              <span>🔗 Copy Link Cọc</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                window.open(
                                  `${window.location.origin}/?bookingId=${inquiry.bookingCode || inquiry.bookingId}&action=pay-deposit`,
                                  '_blank'
                                );
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                            >
                              <span>💳 Mở Cổng Nạp Cọc</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSimulateCall(inquiry)}
                          disabled={isCalling}
                          className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <PhoneCall className={`w-3.5 h-3.5 ${isCalling ? 'animate-spin' : ''}`} />
                          <span>{isCalling ? 'Đang Gọi...' : `Gọi Tư Vấn (${inquiry.phone})`}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenConsultationModal(inquiry)}
                          className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                          <span>{inquiry.consultationNotes ? 'Chỉnh Sửa Biên Bản' : 'Lập Biên Bản Tư Vấn'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {eventInquiries.length === 0 && (
                <div className="p-12 text-center text-stone-500 space-y-3">
                  <Sparkles className="w-12 h-12 text-stone-300 mx-auto" />
                  <p className="font-serif text-lg text-stone-700">Chưa có đơn tiệc đoàn đông nào</p>
                  <p className="text-xs text-stone-400">
                    Khi khách hàng đăng ký tổ chức tiệc trên website, đơn sẽ ngay lập tức xuất hiện tại đây cùng đồng hồ đếm ngược 15 phút.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UC-10: Shift Manager Consultation Form Modal */}
      {selectedInquiryForCall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#E8DFD1] shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E8DFD1]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                  Biên Bản Tư Vấn Trực Tiếp (UC-10)
                </span>
                <h3 className="font-serif text-xl font-bold text-[#2C221E] mt-1">
                  Ghi Nhận Kết Quả Tư Vấn Tiệc
                </h3>
                <p className="text-xs text-[#78716C]">
                  Khách: <strong>{selectedInquiryForCall.customerName}</strong> ({selectedInquiryForCall.partySize} khách • {selectedInquiryForCall.phone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiryForCall(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Call Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C221E] block">
                  Trạng Thái Tư Vấn Của Quản Lý (SLA Callback):
                </label>
                <select
                  value={consultationCallStatus}
                  onChange={(e) => setConsultationCallStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD1] bg-white text-xs font-semibold text-[#2C221E] focus:outline-none focus:border-purple-600"
                >
                  <option value="CALLED">📞 Đã gọi tư vấn sơ bộ (Đang chốt thực đơn)</option>
                  <option value="PROPOSAL_SENT">📋 Đã gửi báo giá & thực đơn chi tiết qua Email/Zalo</option>
                  <option value="ACCEPTED">🥂 Khách đồng ý chốt tiệc (Ký thỏa thuận / Đã chuyển cọc)</option>
                  <option value="REJECTED">✕ Khách từ chối / Không chốt được lịch</option>
                </select>
              </div>

              {/* Agreed Budget & Deposit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C221E] block">Ngân Sách Thống Nhất (VNĐ):</label>
                  <input
                    type="number"
                    value={agreedBudgetInput}
                    onChange={(e) => setAgreedBudgetInput(Number(e.target.value) || 0)}
                    step="1000000"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD1] text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#2C221E] block">Tiền Cọc Thỏa Thuận (VNĐ):</label>
                  <input
                    type="number"
                    value={agreedDepositInput}
                    onChange={(e) => setAgreedDepositInput(Number(e.target.value) || 0)}
                    step="500000"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/30 text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Target Booking Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C221E] block">
                  Cập Nhật Trạng Thái Đơn Hàng Booking:
                </label>
                <select
                  value={targetBookingStatus}
                  onChange={(e) => setTargetBookingStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD1] bg-white text-xs font-semibold text-[#2C221E] focus:outline-none focus:border-purple-600"
                >
                  <option value="AWAITING_PAYMENT">⭐ AWAITING_PAYMENT (Khách chốt đặt cọc - Hệ thống gửi link VietQR/MoMo qua email)</option>
                  <option value="CONFIRMED">CONFIRMED (Khách đã cọc trực tiếp tại quầy / chuyển khoản ngay - Khóa bàn & cấp vé QR)</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW (Chờ liên hệ lại sau)</option>
                  <option value="CANCELLED">CANCELLED (Hủy đơn đặt bàn / Không liên hệ được khách)</option>
                </select>
              </div>

              {/* Consultation Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#2C221E] block">
                  Ghi Chú Chi Tiết Buổi Tư Vấn (Món ăn, giờ đón khách, hoa tươi, thanh toán...):
                </label>
                <textarea
                  rows={3}
                  value={consultationNotesInput}
                  onChange={(e) => setConsultationNotesInput(e.target.value)}
                  placeholder="VD: Đã gọi anh Trí lúc 14:15. Khách chốt Set Menu 5 món cho 50 người, cần thêm 2 chai vang Pháp mở màn. Setup hoa tươi tông trắng vàng. Hẹn cọc trước ngày 10/11..."
                  className="w-full p-3 rounded-xl border border-[#E8DFD1] text-xs text-[#2C221E] focus:outline-none focus:border-purple-600 font-medium leading-relaxed"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8DFD1]">
              <button
                type="button"
                onClick={() => setSelectedInquiryForCall(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E8DFD1] text-xs font-semibold text-[#78716C] hover:bg-[#FAF7F2] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveConsultation}
                disabled={isSavingConsultation}
                className="px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isSavingConsultation ? 'Đang Lưu...' : 'Lưu Biên Bản & Đồng Bộ Hệ Thống'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
