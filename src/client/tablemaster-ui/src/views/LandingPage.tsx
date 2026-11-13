import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Users,
  UtensilsCrossed,
  Layers,
  MapPin,
  Clock,
  Phone,
  Building2,
} from 'lucide-react';

import type { ActiveView } from '../components/common/Navbar';
import { SIGNATURE_DISHES } from '../data/mockData';

interface LandingPageProps {
  onNavigate: (view: ActiveView, floor?: 1 | 2 | 3) => void;
  onOpenBanquetModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenBanquetModal }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  ];

  // Auto-slide banner images: hold still for 10 seconds before sliding to next
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const [active3dIndex, setActive3dIndex] = useState(0);

  const architectureSpaces = [
    {
      id: 'space-1',
      title: 'Sảnh Chính Nguyễn Huệ (Main Hall)',
      location: 'Khu Sảnh Chính • Hướng Nguyễn Huệ View',
      capacity: '45 Bàn • Phù hợp 2-6 Khách',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      floor: 1 as const,
      tag: 'Window View',
    },
    {
      id: 'space-2',
      title: 'Phòng Tiệc Private VIP Cellar',
      location: 'Khu Phòng VIP • Hầm Vang Độc Bản',
      capacity: '2 Phòng VIP • 8-16 Khách',
      image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80',
      floor: 2 as const,
      tag: 'VIP Cellar',
    },
    {
      id: 'space-3',
      title: 'Sky Lounge Outdoor Terrace',
      location: 'Khu Sân Vườn • Ban Công Sunset',
      capacity: '12 Bàn • Phù hợp Hò Hẹn & Tiệc Đêm',
      image: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1200&q=80',
      floor: 3 as const,
      tag: 'Outdoor Lounge',
    },
    {
      id: 'space-4',
      title: 'Quầy Bar Mixology Marble & Velvet',
      location: 'Khu Quầy Bar Mixology',
      capacity: '15 Ghế Bar Da Bò Cổ Điển',
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
      floor: 1 as const,
      tag: 'Bar Side',
    },
    {
      id: 'space-5',
      title: 'Bàn Đôi Cửa Sổ Parisian Window',
      location: 'Tầng 1 & 2 • Góc Kính Vòm Cổ Điển',
      capacity: 'Bàn Đôi 2 Khách • Lãng Mạn',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
      floor: 1 as const,
      tag: 'Romantic Window',
    },
  ];

  // Auto-slide 3D space coverflow every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActive3dIndex((prev) => (prev + 1) % architectureSpaces.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [architectureSpaces.length]);

  return (
    <div className="w-full bg-[#FAF7F2] text-[#1C1917] overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: EXPANDED CONTAINER WITH BACKGROUND IMAGE & GRADIENT FADE */}
      {/* ========================================================================= */}
      <section className="min-h-[calc(100vh-5rem)] flex flex-col justify-between max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10 pb-8">
        {/* Big Master Hero Container - Extended horizontally with luxury shadow */}
        <div className="relative w-full rounded-[2.5rem] overflow-hidden border border-[#E2DAD0] bg-[#FAF7F2] shadow-[0_20px_60px_-15px_rgba(28,25,23,0.12)] flex-1 flex flex-col justify-center min-h-[580px] lg:min-h-[620px] my-auto transition-shadow duration-300">

          {/* Layer 1: Background Photo Filling Entire Container with Ultra Slow Horizontal Slide */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.img
                key={activeSlide}
                src={heroImages[activeSlide]}
                alt="The Prime Bistro Luxury Dining"
                initial={{ x: '100%', opacity: 0.85 }}
                animate={{ x: '0%', opacity: 1 }}
                exit={{ x: '-100%', opacity: 0.85 }}
                transition={{ duration: 3.2, ease: [0.65, 0, 0.25, 1] }}
                className="absolute inset-0 w-full h-full object-cover object-right md:object-center"

              />
            </AnimatePresence>
          </div>



          {/* Layer 2: Seamless Left-to-Right Fade Mask */}
          {/* Left side is solid/smooth warm ivory so text is 100% sharp; right side fades out so photo is brilliantly clear */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/95 via-45% md:via-52% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2]/40 via-transparent to-[#FAF7F2]/30 pointer-events-none" />

          {/* Layer 3: Content Overlay */}
          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center px-6 sm:px-12 lg:px-18 py-12">

            {/* Left Content Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-5 max-w-2xl"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.22em] bg-[#F3ECE0] px-3.5 py-1 rounded-full border border-[#E8DFD1]">
                  LE PRIME BISTRO & LOUNGE
                </span>
                <span className="text-xs font-semibold text-[#8C6A43] flex items-center gap-1">
                  ⭐ Michelin Guide Selected
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1C1917] leading-[1.2]">
                Nghệ Thuật Ẩm Thực <br />
                <span className="text-[#8C6A43]">Pháp & Bò Dry-Aged</span> <br />
                Đẳng Cấp Thượng Lưu
              </h1>

              <p className="text-sm sm:text-base text-[#594D43] leading-relaxed font-normal">
                Tọa lạc tại vị trí đắc địa số 68 Đại lộ Nguyễn Huệ, LE PRIME BISTRO mang đến hành trình ẩm thực tinh hoa với Bò lên tuổi Dry-Aged 45 ngày ủ muối tuyết Himalaya, hải sản tươi sống nhập khẩu và hầm vang Grand Cru Pháp danh giá. Không gian kiến trúc cổ điển sang trọng, chuẩn bị chu đáo cho từng trải nghiệm tiệc và hẹn hò lãng mạn.
              </p>

              {/* Restaurant Quick Info Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-[#594D43]">
                <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-[#E8DFD1] shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-[#8C6A43] shrink-0" />
                  <span className="truncate">68 Nguyễn Huệ, Q.1</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-[#E8DFD1] shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-[#8C6A43] shrink-0" />
                  <span className="truncate">11:00 - 23:00</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-[#E8DFD1] shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-[#8C6A43] shrink-0" />
                  <span className="truncate">0909 123 456</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onNavigate('booking')}
                  className="btn-tan px-8 py-3.5 text-sm font-semibold flex items-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Đặt Bàn Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {onOpenBanquetModal && (
                  <button
                    onClick={onOpenBanquetModal}
                    className="px-6 py-3.5 rounded-full border border-[#8C6A43] bg-white/90 hover:bg-[#FAF4EB] text-[#8C6A43] text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:border-[#735534]"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Đặt Tiệc Sự Kiện (20 - 100 Khách)</span>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Right Column: Space for Image + Slide Navigation Controls */}
            <div className="lg:col-span-5 relative flex items-center justify-end h-full">
              {/* Slider Next arrow on right side */}
              <button
                onClick={() => setActiveSlide((prev) => (prev + 1) % heroImages.length)}
                className="w-12 h-12 rounded-full bg-[#1C1917]/70 hover:bg-[#1C1917] text-white flex items-center justify-center backdrop-blur-xs transition-colors shadow-lg cursor-pointer active:scale-90"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

        </div>

        {/* Pagination Dots placed OUTSIDE, centered below the container */}
        <div className="flex flex-col items-center justify-center pt-4 gap-2.5">
          <div className="flex items-center gap-2 bg-[#1C1917]/10 border border-[#E0D7C9] px-3.5 py-1.5 rounded-full shadow-2xs">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeSlide === i ? 'bg-[#C4A480] w-6' : 'bg-[#C5BCAD] hover:bg-[#8C6A43] w-2'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Elegant Scroll Indicator at Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col items-center justify-center text-[#78716C] select-none"
          >
            <span className="text-[11px] font-sans uppercase tracking-[0.2em] font-medium mb-0.5">
              Lướt xuống để khám phá
            </span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4 h-4 text-[#C4A480]" />
            </motion.div>
          </motion.div>
        </div>
      </section>



      {/* ========================================================================= */}
      {/* 2. GOURMET COMBOS FLOW (Infinite Horizontal Stream Left to Right) */}
      {/* ========================================================================= */}
      <motion.section
        initial={{ opacity: 0, y: 70 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="py-16 border-t border-[#EBE5DC] overflow-hidden"
      >
        {/* Section Header with title and View All */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#C4A480]" />
              <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.2em]">
                Culinary Artistry • Dòng Chảy Combo Thượng Hạng
              </span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1C1917] tracking-tight">
              Tuyệt Tác Combo & Set Menu Đỉnh Cao
            </h2>
            <p className="text-xs text-[#78716C] mt-1">
              (Dòng chảy combo tự động từ trái sang phải • Rê chuột để tạm dừng & xem)
            </p>
          </div>

          <button
            onClick={() => onNavigate('booking')}
            className="px-4 py-2 text-xs font-semibold text-[#8C6A43] hover:text-white bg-[#FAF4EB] hover:bg-[#C4A480] border border-[#E0D7C9] rounded-full flex items-center gap-1.5 transition-all shadow-2xs group cursor-pointer w-fit active:scale-95"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Khám Phá Tất Cả Combo</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Continuous Horizontal Stream Track with Pop-up Reveal Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative animate-dish-flow-container overflow-hidden py-2"
        >
          {/* Subtle Side Fades for luxury blending */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-[#FAF7F2] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-[#FAF7F2] to-transparent z-10 pointer-events-none" />

          {/* Marquee Track duplicated for seamless continuous looping */}
          <div className="animate-dish-flow flex gap-6 px-4">
            {[...SIGNATURE_DISHES, ...SIGNATURE_DISHES].map((dish, idx) => (
              <div
                key={`${dish.id}-${idx}`}
                onClick={() => onNavigate('booking')}
                className="w-[260px] sm:w-[320px] shrink-0 bg-white border border-[#EBE5DC] rounded-2xl p-4 shadow-xs hover:shadow-xl hover:border-[#C4A480] transition-all duration-300 group cursor-pointer flex flex-col justify-between select-none"
              >
                <div>
                  {/* Combo Image Container */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-[#F7F4EE]">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    />
                    {/* Serving Size Tag */}
                    {dish.servingSize && (
                      <div className="absolute top-2.5 left-2.5 bg-[#1C1917]/80 backdrop-blur-md text-[#F3EBE1] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/10 shadow-2xs flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#C4A480]" />
                        <span>{dish.servingSize}</span>
                      </div>
                    )}
                    {/* Category Tag */}
                    <div className="absolute top-2.5 right-2.5 bg-[#C4A480] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                      {dish.category}
                    </div>
                  </div>

                  {/* Combo Title */}
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#1C1917] group-hover:text-[#8C6A43] transition-colors line-clamp-2 leading-snug mb-2">
                    {dish.name}
                  </h3>
                </div>

                {/* Card Footer: Price & Navigation CTA */}
                <div className="pt-2.5 border-t border-[#F2ECE1] flex items-center justify-between mt-2">
                  <div>
                    {dish.originalPrice && (
                      <span className="text-[10px] sm:text-[11px] text-[#9E978F] line-through block font-medium">
                        {new Intl.NumberFormat('vi-VN').format(dish.originalPrice)} đ
                      </span>
                    )}
                    <span className="text-sm sm:text-base font-bold font-serif text-[#8C6A43]">
                      {new Intl.NumberFormat('vi-VN').format(dish.price)} đ
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-[#FAF7F2] group-hover:bg-[#C4A480] text-[#1C1917] group-hover:text-white transition-all duration-300 flex items-center justify-center shadow-2xs border border-[#E0D7C9] group-hover:border-transparent">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* ========================================================================= */}
      {/* 3. 3D PERSPECTIVE COVERFLOW CAROUSEL: RESTAURANT AMBIENCE */}
      {/* ========================================================================= */}
      <motion.section
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#EBE5DC] overflow-hidden"
      >
        {/* Section Header */}
        <div className="mb-10 sm:mb-12 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Layers className="w-4 h-4 text-[#C4A480]" />
            <span className="text-[11px] font-bold text-[#8C6A43] uppercase tracking-[0.2em]">
              Architectural Ambience • Không Gian Kiến Trúc
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1917] tracking-tight">
            Không Gian Ẩm Thực LE PRIME
          </h2>
          <p className="text-xs text-[#78716C] mt-1.5 font-normal">
            Không gian kiến trúc Pháp sang trọng, ấm cúng và đầy tính nghệ thuật
          </p>
        </div>

        {/* 3D Coverflow Container */}
        <div className="relative h-[300px] sm:h-[380px] md:h-[420px] w-full perspective-container flex items-center justify-center select-none pt-2">
          {/* Left Floating Navigation Button */}
          <button
            onClick={() =>
              setActive3dIndex((prev) => (prev - 1 + architectureSpaces.length) % architectureSpaces.length)
            }
            className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#1C1917]/75 hover:bg-[#1C1917] text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl cursor-pointer active:scale-90 border border-white/20"
            aria-label="Previous Space"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Floating Navigation Button */}
          <button
            onClick={() => setActive3dIndex((prev) => (prev + 1) % architectureSpaces.length)}
            className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#1C1917]/75 hover:bg-[#1C1917] text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl cursor-pointer active:scale-90 border border-white/20"
            aria-label="Next Space"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {architectureSpaces.map((space, i) => {
            const total = architectureSpaces.length;
            let diff = (i - active3dIndex + total) % total;
            if (diff > total / 2) diff -= total;

            const isCenter = diff === 0;

            // Compute 3D Transformation style
            let transformStyle = '';
            let opacity = 1;
            let zIndex = 10;
            let filter = 'brightness(1)';
            let boxShadow = '0 10px 30px rgba(0,0,0,0.1)';

            if (diff === 0) {
              transformStyle = 'translate3d(0, 0, 140px) rotateY(0deg) scale(1.06)';
              opacity = 1;
              zIndex = 30;
              boxShadow = '0 25px 60px -15px rgba(196, 164, 128, 0.45)';
            } else if (diff === -1 || diff === total - 1) {
              transformStyle = 'translate3d(-52%, 0, -40px) rotateY(26deg) scale(0.86)';
              opacity = 0.8;
              zIndex = 20;
              filter = 'brightness(0.8)';
            } else if (diff === 1 || diff === -(total - 1)) {
              transformStyle = 'translate3d(52%, 0, -40px) rotateY(-26deg) scale(0.86)';
              opacity = 0.8;
              zIndex = 20;
              filter = 'brightness(0.8)';
            } else if (diff < -1) {
              transformStyle = 'translate3d(-92%, 0, -160px) rotateY(40deg) scale(0.68)';
              opacity = 0.35;
              zIndex = 10;
              filter = 'brightness(0.5)';
            } else {
              transformStyle = 'translate3d(92%, 0, -160px) rotateY(-40deg) scale(0.68)';
              opacity = 0.35;
              zIndex = 10;
              filter = 'brightness(0.5)';
            }

            return (
              <div
                key={space.id}
                onClick={() => setActive3dIndex(i)}
                style={{
                  transform: transformStyle,
                  opacity,
                  zIndex,
                  filter,
                  boxShadow,
                }}
                className={`absolute top-4 sm:top-6 w-[82%] sm:w-[58%] md:w-[48%] max-w-[580px] aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-700 ease-out border border-white/40 group ${
                  isCenter ? 'ring-2 ring-[#C4A480]/60' : ''
                }`}
              >
                <img
                  src={space.image}
                  alt={space.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/85 via-[#1C1917]/20 to-transparent" />

                {/* Card Tag & Content Overlay */}
                <div className="absolute top-4 left-4 bg-[#1C1917]/70 backdrop-blur-md text-[#F3EBE1] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10 shadow-2xs">
                  {space.location}
                </div>

                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white mb-1 group-hover:text-[#E8D8C3] transition-colors">
                    {space.title}
                  </h3>
                  <p className="text-xs text-[#E8D8C3] font-light line-clamp-1">
                    {space.capacity}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3D Indicator Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {architectureSpaces.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActive3dIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                active3dIndex === idx ? 'bg-[#C4A480] w-6' : 'bg-[#C5BCAD] hover:bg-[#8C6A43] w-2'
              }`}
              aria-label={`Space ${idx + 1}`}
            />
          ))}
        </div>
      </motion.section>
    </div>
  );
};
