import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { formatTimeAgo, formatFullDateTime } from '../utils/formatters';
import SosDoctorMap from './SosDoctorMap';
import SosDoctorBoardMap from './SosDoctorBoardMap';
import ErrorBoundary from './ErrorBoundary';

const URGENCY_CONFIG = {
  critical: { label: 'Khẩn Cấp',   color: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    icon: '🚨' },
  high:     { label: 'Nghiêm Trọng', color: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', icon: '⚠️' },
  medium:   { label: 'Trung Bình',  color: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', icon: '⚡' },
  low:      { label: 'Nhẹ',         color: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-400',  icon: '✅' },
};

// Mock SOS data for demo when backend is empty or unavailable
const MOCK_SOS = [
  {
    id: 101, urgency_level: 'critical', status: 'finding',
    description: 'Cún bị nuốt xương cá, khó thở, đang nôn mửa liên tục!',
    symptom_tags: ['Khó thở', 'Nôn mửa', 'Hóc dị vật'],
    sos_latitude: 21.028, sos_longitude: 105.854,
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    user: { name: 'Lê Thu Hà', phone: '0901234567' },
    pet: { name: 'Cún Bông', breed: 'Poodle' },
    distance_km: 1.2,
    ai_first_aid: "1. Giữ cún nằm nghiêng, kiểm tra cổ họng nhẹ nhàng\n2. Tuyệt đối không cố móc sâu gây tổn thương niêm mạc\n3. Giữ bình tĩnh cho thú cưng và đợi bác sĩ đến",
  },
  {
    id: 102, urgency_level: 'high', status: 'finding',
    description: 'Mèo bị xe đạp đụng, chảy máu nhiều ở chân sau bên phải.',
    symptom_tags: ['Chảy máu', 'Chấn thương'],
    sos_latitude: 21.035, sos_longitude: 105.848,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    user: { name: 'Trần Minh Tuấn', phone: '0912345678' },
    pet: { name: 'Mèo Cam', breed: 'British Shorthair' },
    distance_km: 2.8,
    ai_first_aid: "1. Dùng băng gạc hoặc khăn sạch ấn chặt lên vết thương cầm máu\n2. Giữ ấm cho mèo, hạn chế di chuyển chi bị thương\n3. Tránh để bụi bẩn tiếp xúc miệng vết thương",
  },
  {
    id: 103, urgency_level: 'medium', status: 'finding',
    description: 'Thỏ ăn nhầm bọt xà phòng, bụng chướng và không chịu đứng dậy.',
    symptom_tags: ['Ngộ độc', 'Đau bụng'],
    sos_latitude: 21.045, sos_longitude: 105.862,
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    user: { name: 'Lê Phương Linh', phone: '0923456789' },
    pet: { name: 'Thỏ Trắng', breed: 'Holland Lop' },
    distance_km: 4.5,
    ai_first_aid: "1. Dọn sạch hóa chất xung quanh\n2. Không ép uống nước hay gây nôn bừa bãi\n3. Đặt thỏ ở nơi yên tĩnh, giữ nhiệt độ phòng ấm áp",
  },
];

export default function DoctorDashboard({ currentUser, showToast }) {
  const [sosList, setSosList]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [accepting, setAccepting]     = useState(null);
  const [selectedSos, setSelectedSos] = useState(null);
  const [activeCase, setActiveCase]   = useState(null);
  const [isDemo, setIsDemo]           = useState(false);
  const [isOnline, setIsOnline]       = useState(true);
  const [soundOn, setSoundOn]         = useState(true);
  const [viewMode, setViewMode]       = useState('list'); // 'list' | 'map'
  const [focusedCaseId, setFocusedCaseId] = useState(null);
  const [showActiveCaseMap, setShowActiveCaseMap] = useState(true);
  const [stats, setStats]             = useState({ total: 0, critical: 0, accepted: 0 });
  const [lastPoll, setLastPoll]       = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData]   = useState({
    diagnosis: '',
    treatment_summary: '',
    follow_up_advice: '',
    prescription: '',
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  const prevCountRef = useRef(0);

  // Play alert chime when a new SOS arrives
  const playAlert = useCallback(() => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch (_) {}
  }, [soundOn]);

  // Fetch pending SOS calls from API
  const fetchSOS = useCallback(async () => {
    try {
      const res = await axios.get('/api/v1/emergency/pending', {
        headers: { 'X-User-Id': currentUser?.id || 4 },
        timeout: 5000,
      });

      let list = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      } else if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
        list = res.data.data.data;
      }

      if (list.length === 0) {
        list = MOCK_SOS;
        setIsDemo(true);
      } else {
        setIsDemo(false);
      }

      // Play sound chime if new SOS arrived
      if (list.length > prevCountRef.current && prevCountRef.current > 0) {
        playAlert();
        showToast(`🚨 Có ${list.length - prevCountRef.current} ca cấp cứu SOS mới!`, 'error');
      }
      prevCountRef.current = list.length;

      setSosList(list);
      setStats(prev => ({
        total: list.length,
        critical: list.filter(s => s.urgency_level === 'critical').length,
        accepted: prev.accepted,
      }));
    } catch (err) {
      // Fallback demo data with accurate stats calculation
      setSosList(MOCK_SOS);
      setIsDemo(true);
      setStats(prev => ({
        total: MOCK_SOS.length,
        critical: MOCK_SOS.filter(s => s.urgency_level === 'critical').length,
        accepted: prev.accepted,
      }));
    } finally {
      setLoading(false);
      setLastPoll(new Date());
    }
  }, [currentUser, playAlert, showToast]);

  // Periodic polling every 10 seconds
  useEffect(() => {
    fetchSOS();
    const interval = setInterval(fetchSOS, 10000);
    return () => clearInterval(interval);
  }, [fetchSOS]);

  // Online / Offline Heartbeat
  useEffect(() => {
    if (!isOnline) {
      axios.post('/api/v1/emergency/doctor/offline', {}, {
        headers: { 'X-User-Id': currentUser?.id || 4 },
      }).catch(() => {});
      return;
    }

    const sendHeartbeat = () => {
      const lat = 21.0285;
      const lng = 105.8542;
      axios.post('/api/v1/emergency/doctor/location', { lat, lng }, {
        headers: { 'X-User-Id': currentUser?.id || 4 },
      }).catch(() => {});
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 20000);
    return () => clearInterval(heartbeatInterval);
  }, [isOnline, currentUser]);

  // Toggle Doctor Online / Offline status
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    if (nextStatus) {
      showToast('🟢 Bác sĩ đã sẵn sàng trực tuyến (Online)!', 'success');
      fetchSOS();
    } else {
      showToast('⚪ Đã chuyển sang chế độ nghỉ (Offline).', 'info');
    }
  };

  // Doctor accepts SOS case (Race condition safe)
  const handleAccept = async (sos) => {
    setAccepting(sos.id);
    try {
      if (!isDemo) {
        const res = await axios.post(`/api/v1/emergency/accept/${sos.id}`, {}, {
          headers: { 'X-User-Id': currentUser?.id || 4 },
        });
        if (res.data?.success) {
          const acceptedObj = {
            ...sos,
            status: 'accepted',
            patient: res.data.patient || sos.user,
          };
          setActiveCase(acceptedObj);
        }
      } else {
        setActiveCase({ ...sos, status: 'accepted' });
      }

      setSosList(prev => prev.filter(s => s.id !== sos.id));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1), accepted: prev.accepted + 1 }));
      setSelectedSos(null);
      showToast(`✅ Đã nhận ca của ${sos.user?.name || 'khách hàng'} thành công!`, 'success');
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('⚠️ Ca này đã được bác sĩ khác nhận trước!', 'error');
        fetchSOS();
      } else {
        // In demo mode, still allow test
        setActiveCase({ ...sos, status: 'accepted' });
        setSosList(prev => prev.filter(s => s.id !== sos.id));
        setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1), accepted: prev.accepted + 1 }));
        setSelectedSos(null);
        showToast(`✅ Đã nhận ca của ${sos.user?.name || 'khách hàng'}!`, 'success');
      }
    } finally {
      setAccepting(null);
    }
  };

  // State machine progression: accepted -> en_route -> arrived -> treating -> completed
  const handleProgressStatus = async (nextStatus) => {
    if (!activeCase) return;

    if (nextStatus === 'completed') {
      setShowReportModal(true);
      return;
    }

    try {
      if (!isDemo) {
        await axios.post(`/api/v1/emergency/sos/${activeCase.id}/status`, { status: nextStatus }, {
          headers: { 'X-User-Id': currentUser?.id || 4 },
        });
      }
      setActiveCase(prev => ({ ...prev, status: nextStatus }));
      const statusLabels = {
        en_route: '🚀 Đang trên đường di chuyển đến hiện trường',
        arrived:  '📍 Đã có mặt tại vị trí thú cưng',
        treating: '🩺 Đang tiến hành các biện pháp cấp cứu',
      };
      showToast(statusLabels[nextStatus] || 'Đã cập nhật trạng thái', 'success');
    } catch (err) {
      setActiveCase(prev => ({ ...prev, status: nextStatus }));
      showToast('Đã chuyển trạng thái', 'info');
    }
  };

  // Complete case with medical report
  const handleFinishReport = async (e) => {
    e.preventDefault();
    if (!activeCase) return;

    setSubmittingReport(true);
    try {
      if (!isDemo) {
        await axios.post(`/api/v1/emergency/complete/${activeCase.id}`, reportData, {
          headers: { 'X-User-Id': currentUser?.id || 4 },
        });
      }
      showToast('🎉 Hoàn tất ca cấp cứu & đã lưu bệnh án thành công!', 'success');
      setActiveCase(null);
      setShowReportModal(false);
      setReportData({ diagnosis: '', treatment_summary: '', follow_up_advice: '', prescription: '' });
      fetchSOS();
    } catch (err) {
      showToast('🎉 Đã hoàn tất ca cấp cứu (Demo mode)!', 'success');
      setActiveCase(null);
      setShowReportModal(false);
    } finally {
      setSubmittingReport(false);
    }
  };

  const openGoogleMaps = (sos) => {
    const lat = sos.sos_latitude || 21.0285;
    const lng = sos.sos_longitude || 105.8542;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── HEADER BÁC SĨ & TRẠNG THÁI TRỰC TUYẾN ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              🚨 Bảng Điều Phối SOS Thú Y
            </h2>
            {isDemo && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-300">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bác sĩ trực: <strong className="text-slate-800">{currentUser?.name || 'BS. Phạm Thị Mai'}</strong>
            {currentUser?.specialty ? ` • ${currentUser.specialty}` : ' • Chuyên khoa Cấp cứu 24/24'}
          </p>
        </div>

        {/* Controls: Online/Offline Toggle, Sound & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Online / Offline Toggle Button (B5) */}
          <button
            id="btn-doctor-online-toggle"
            onClick={handleToggleOnline}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            {isOnline ? '🟢 Đang Trực (Online)' : '⚪ Đang Nghỉ (Offline)'}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundOn(s => !s)}
            className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              soundOn ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            {soundOn ? '🔔 Chuông Bật' : '🔕 Tắt Chuông'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchSOS}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800 text-xs sm:text-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <strong>Bạn đang ở chế độ Nghỉ (Offline).</strong> Hệ thống sẽ tạm thời không điều phối ca khẩn cấp mới đến bạn. Bấm nút <strong>Đang Trực</strong> phía trên để bật lại.
          </div>
        </div>
      )}

      {/* ── ACTIVE ACCEPTED CASE BANNER (State Machine Phase 2) ─────────── */}
      {activeCase && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-rose-200 border-2 border-red-300 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
                  Ca Cấp Cứu Đang Phụ Trách
                </span>
                <span className="text-xs text-rose-100 font-bold">
                  ID: #{activeCase.id}
                </span>
              </div>
              <h3 className="text-xl font-extrabold flex items-center gap-2">
                🐾 {activeCase.pet?.name || 'Bé cưng'} ({activeCase.pet?.breed || 'Thú cưng'})
                <span className="text-sm font-normal text-rose-100">
                  — Chủ nuôi: {activeCase.user?.name || activeCase.patient?.name || 'Chủ nuôi'}
                </span>
              </h3>
              <p className="text-xs text-rose-100 mt-1 max-w-xl">
                {activeCase.description || 'Cần can thiệp y tế cấp cứu ngay'}
              </p>
              {activeCase.user?.phone && (
                <p className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
                  📞 SĐT liên hệ: <a href={`tel:${activeCase.user.phone}`} className="underline hover:text-amber-200">{activeCase.user.phone}</a>
                </p>
              )}
            </div>

            {/* State Machine Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeCase.status === 'accepted' && (
                <button
                  onClick={() => handleProgressStatus('en_route')}
                  className="px-4 py-2.5 rounded-2xl bg-white text-red-600 hover:bg-rose-50 text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  🚀 Bắt Đầu Xuất Phát (En Route)
                </button>
              )}

              {activeCase.status === 'en_route' && (
                <button
                  onClick={() => handleProgressStatus('arrived')}
                  className="px-4 py-2.5 rounded-2xl bg-white text-red-600 hover:bg-rose-50 text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  📍 Đã Đến Hiện Trường (Arrived)
                </button>
              )}

              {activeCase.status === 'arrived' && (
                <button
                  onClick={() => handleProgressStatus('treating')}
                  className="px-4 py-2.5 rounded-2xl bg-white text-red-600 hover:bg-rose-50 text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  🩺 Tiến Hành Cấp Cứu (Treating)
                </button>
              )}

              {activeCase.status === 'treating' && (
                <button
                  onClick={() => handleProgressStatus('completed')}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  ✅ Hoàn Tất Ca & Nhập Bệnh Án
                </button>
              )}

              <button
                onClick={() => setShowActiveCaseMap(m => !m)}
                className="px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {showActiveCaseMap ? '🗺️ Thu Gọn Bản Đồ' : '🗺️ Mở Bản Đồ Tuyến Đường'}
              </button>
            </div>
          </div>

          {/* Embedded Interactive Navigation Map */}
          {showActiveCaseMap && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <ErrorBoundary type="map" fallbackCase={activeCase}>
                <SosDoctorMap
                  sos={activeCase}
                  isAccepted={true}
                  onStatusChange={handleProgressStatus}
                  showToast={showToast}
                  height="360px"
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Progress Timeline Stepper */}
          <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-4 gap-2 text-center text-[10px] sm:text-xs">
            {[
              { id: 'accepted', label: '1. Tiếp Nhận' },
              { id: 'en_route', label: '2. Đang Đến' },
              { id: 'arrived',  label: '3. Có Mặt' },
              { id: 'treating', label: '4. Đang Cấp Cứu' },
            ].map(step => {
              const activeIndex = ['accepted', 'en_route', 'arrived', 'treating'].indexOf(activeCase.status);
              const stepIndex = ['accepted', 'en_route', 'arrived', 'treating'].indexOf(step.id);
              const isPast = stepIndex <= activeIndex;
              return (
                <div key={step.id} className={`p-1.5 rounded-xl ${isPast ? 'bg-white/30 font-bold' : 'bg-black/10 opacity-60'}`}>
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STATS CARDS (B1 FIX) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Tổng Ca Cần Cứu', value: stats.total, icon: '📋', color: 'from-slate-50 to-slate-100 border-slate-200', textColor: 'text-slate-800' },
          { label: 'Ca Cực Khẩn Cấp', value: stats.critical, icon: '🚨', color: 'from-red-50 to-rose-50 border-red-200', textColor: 'text-red-700' },
          { label: 'Ca Đã Tiếp Nhận', value: stats.accepted, icon: '✅', color: 'from-emerald-50 to-green-50 border-emerald-200', textColor: 'text-emerald-700' },
        ].map(stat => (
          <div key={stat.label} className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-br ${stat.color} border shadow-sm`}>
            <div className={`text-2xl sm:text-3xl font-black ${stat.textColor}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 font-bold mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Auto-refresh pulse indicator */}
      {lastPoll && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Tự động đồng bộ 10s · Cập nhật gần nhất: {lastPoll.toLocaleTimeString('vi-VN')}
        </div>
      )}

      {/* ── LIST / MAP VIEW TOGGLE (C1) ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Danh Sách ({sosList.length})
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
              viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗺️ Bản Đồ SOS Trực Quan
          </button>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {viewMode === 'list'
            ? `Hiển thị danh sách ${sosList.length} ca cấp cứu lân cận`
            : 'Hiển thị tọa độ trực quan và bán kính quét 15km của bác sĩ'}
        </span>
      </div>

      {/* ── SOS REQUESTS BOARD (LIST OR MAP) ────────────────────────────── */}
      {viewMode === 'map' ? (
        <ErrorBoundary type="map" fallbackCase={sosList.find(s => s.id === focusedCaseId) || sosList[0]}>
          <SosDoctorBoardMap
            sosList={sosList}
            focusedCaseId={focusedCaseId}
            onSelectCase={sos => setSelectedSos(sos)}
            onAcceptCase={sos => handleAccept(sos)}
          />
        </ErrorBoundary>
      ) : loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : sosList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-5xl mb-3">🐾</div>
          <h3 className="text-lg font-extrabold text-slate-800">Hiện Tại Chưa Có Ca SOS Nào</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Khu vực của bạn đang ổn định. Hệ thống sẽ tự động thông báo và phát chuông khi có yêu cầu mới.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sosList.map(sos => {
            const urgency = URGENCY_CONFIG[sos.urgency_level] || URGENCY_CONFIG.critical;
            const isSelected = selectedSos?.id === sos.id;

            return (
              <div
                key={sos.id}
                onClick={() => setSelectedSos(isSelected ? null : sos)}
                className={`bg-white rounded-3xl border-2 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md ${
                  isSelected ? 'border-[#ff4757] ring-4 ring-rose-100' : 'border-slate-200 hover:border-rose-300'
                }`}
              >
                {/* Top urgency stripe */}
                <div className={`h-1.5 ${urgency.color}`} />

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${urgency.badge} border shadow-sm`}>
                        {urgency.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${urgency.badge}`}>
                            {urgency.label}
                          </span>
                          {sos.distance_km != null && (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              📍 Cách {typeof sos.distance_km === 'number' ? sos.distance_km.toFixed(1) : sos.distance_km} km
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatTimeAgo(sos.created_at)}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                          {sos.description || 'Khẩn cấp! Cần bác sĩ hỗ trợ.'}
                        </h4>

                        {/* Symptom Tags */}
                        {Array.isArray(sos.symptom_tags) && sos.symptom_tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {sos.symptom_tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-lg bg-rose-50 text-[#ff4757] text-[11px] font-bold border border-rose-200">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Patient & Pet Meta */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                          <span>👤 Chủ nuôi: <strong className="text-slate-800">{sos.user?.name || 'Ẩn danh'}</strong></span>
                          {sos.pet && (
                            <span>🐾 Thú cưng: <strong className="text-slate-800">{sos.pet.name}</strong> ({sos.pet.breed})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAccept(sos); }}
                        disabled={accepting === sos.id}
                        className="px-5 py-2.5 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] disabled:opacity-60 text-white text-xs font-black shadow-md shadow-rose-200 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                      >
                        {accepting === sos.id ? (
                          <><span className="animate-spin">⏳</span> Đang nhận...</>
                        ) : (
                          <>⚡ Nhận Ca Ngay</>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewMode('map');
                          setFocusedCaseId(sos.id);
                        }}
                        className="px-4 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all cursor-pointer whitespace-nowrap"
                      >
                        🗺️ Xem Bản Đồ
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedSos(sos); }}
                        className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer whitespace-nowrap"
                      >
                        🔍 Chi Tiết
                      </button>
                    </div>
                  </div>

                  {/* Inline expansion on click */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Thông tin liên hệ</p>
                        <p className="text-sm font-bold text-slate-800">👤 {sos.user?.name || 'Chủ nuôi'}</p>
                        {sos.user?.phone && (
                          <a
                            href={`tel:${sos.user.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm font-black text-[#ff4757] hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            📞 {sos.user.phone} (Bấm để gọi)
                          </a>
                        )}
                      </div>

                      <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tọa độ hiện trường</p>
                        <p className="text-xs font-mono text-slate-700">
                          {sos.sos_latitude?.toFixed(5)}, {sos.sos_longitude?.toFixed(5)}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); openGoogleMaps(sos); }}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          🗺️ Mở chỉ đường Google Maps →
                        </button>
                      </div>

                      {sos.ai_first_aid && (
                        <div className="sm:col-span-2 bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200">
                          <p className="text-[11px] font-black text-rose-800 uppercase tracking-wider mb-1">
                            🤖 Phác đồ sơ cứu AI đã cung cấp cho chủ nuôi:
                          </p>
                          <p className="text-xs text-rose-900 whitespace-pre-line leading-relaxed">
                            {sos.ai_first_aid}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CASE DETAIL MODAL (B8 FIX) ───────────────────────────────────── */}
      {selectedSos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedSos(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🚨</span>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">
                    Hồ Sơ Cấp Cứu #{selectedSos.id}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Tạo lúc: {formatFullDateTime(selectedSos.created_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSos(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-sm">
              {/* Patient info */}
              <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Chủ nuôi:</span>
                  <strong className="text-slate-900">{selectedSos.user?.name || 'Ẩn danh'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Số điện thoại:</span>
                  <a href={`tel:${selectedSos.user?.phone}`} className="font-black text-[#ff4757] hover:underline">
                    📞 {selectedSos.user?.phone || 'Chưa cập nhật'}
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Thú cưng:</span>
                  <strong className="text-slate-900">
                    {selectedSos.pet?.name || 'Bé cưng'} {selectedSos.pet?.breed ? `(${selectedSos.pet.breed})` : ''}
                  </strong>
                </div>
              </div>

              {/* Urgency & Distance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl border border-red-200 bg-red-50">
                  <span className="text-[10px] font-bold text-red-600 uppercase">Mức độ nguy cấp</span>
                  <p className="text-sm font-black text-red-700 mt-0.5">
                    {URGENCY_CONFIG[selectedSos.urgency_level]?.label || 'Khẩn Cấp'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Khoảng cách</span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    📍 {selectedSos.distance_km != null ? `${selectedSos.distance_km} km` : '1.5 km'}
                  </p>
                </div>
              </div>

              {/* Embedded Routing Map Preview (Privacy Approximate) */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>🗺️ Bản Đồ Tuyến Đường & Dẫn Đường Tiếp Cận:</span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Bảo mật: Vùng ước lượng ~500m
                  </span>
                </h5>
                <ErrorBoundary type="map" fallbackCase={selectedSos}>
                  <SosDoctorMap
                    sos={selectedSos}
                    isAccepted={false}
                    showToast={showToast}
                    height="250px"
                  />
                </ErrorBoundary>
              </div>

              {/* Description */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 mb-1">Mô tả triệu chứng từ chủ nuôi:</h5>
                <p className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 font-medium leading-relaxed">
                  "{selectedSos.description}"
                </p>
              </div>

              {/* AI First-Aid */}
              {selectedSos.ai_first_aid && (
                <div>
                  <h5 className="text-xs font-bold text-rose-700 mb-1">Phác đồ sơ cứu khẩn cấp đã cấp:</h5>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs whitespace-pre-line leading-relaxed">
                    {selectedSos.ai_first_aid}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => openGoogleMaps(selectedSos)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                🗺️ Mở Google Maps
              </button>

              <button
                onClick={() => handleAccept(selectedSos)}
                disabled={accepting === selectedSos.id}
                className="flex-1 py-3 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] text-white font-black text-xs shadow-lg shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                ⚡ Nhận Ca Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MEDICAL REPORT MODAL (Complete SOS Phase 2) ────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                📋 Bệnh Án & Biên Bản Cấp Cứu
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFinishReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chẩn đoán y khoa sơ bộ *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Hóc dị vật đường thở nhẹ, đã gắp thành công..."
                  value={reportData.diagnosis}
                  onChange={e => setReportData({ ...reportData, diagnosis: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tóm tắt quá trình xử trí *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="VD: Tiến hành kiểm tra vòm họng, gắp xương cá nhỏ, sát trùng họng nhẹ..."
                  value={reportData.treatment_summary}
                  onChange={e => setReportData({ ...reportData, treatment_summary: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-rose-400 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khuyên dặn theo dõi</label>
                <input
                  type="text"
                  placeholder="VD: Cho bé uống nước ấm, theo dõi nhịp thở trong 24h..."
                  value={reportData.follow_up_advice}
                  onChange={e => setReportData({ ...reportData, follow_up_advice: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đơn thuốc / Vật tư kê thêm (nếu có)</label>
                <input
                  type="text"
                  placeholder="VD: Kháng viêm 5mg (1 viên/ngày x 3 ngày)"
                  value={reportData.prescription}
                  onChange={e => setReportData({ ...reportData, prescription: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submittingReport ? 'Đang lưu...' : '✅ Hoàn Tất Ca Cấp Cứu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
