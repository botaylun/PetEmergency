import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons — use inline styles (not Tailwind classes) to survive purge
const doctorIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="width:40px;height:40px;border-radius:50%;background:#2563eb;color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(37,99,235,0.5);border:2px solid white;font-size:20px;">
        🩺
      </div>
      <div style="position:absolute;bottom:-5px;width:12px;height:12px;background:#2563eb;transform:rotate(45deg);"></div>
    </div>
  `,
  iconSize: [40, 44],
  iconAnchor: [20, 44],
  popupAnchor: [0, -40],
});

const getCaseIcon = (urgency = 'critical') => {
  const bg  = urgency === 'critical' ? '#dc2626' :
              urgency === 'high'     ? '#f97316' : '#eab308';
  const shadow = urgency === 'critical' ? 'rgba(220,38,38,0.5)' :
                 urgency === 'high'     ? 'rgba(249,115,22,0.5)' : 'rgba(234,179,8,0.5)';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px ${shadow};border:2px solid white;font-size:20px;">
          🚨
        </div>
        <div style="position:absolute;bottom:-5px;width:12px;height:12px;background:${bg};transform:rotate(45deg);"></div>
      </div>
    `,
    iconSize: [40, 44],
    iconAnchor: [20, 44],
    popupAnchor: [0, -40],
  });
};

export default function SosDoctorMap({
  sos,
  doctorLocation = { lat: 21.0285, lng: 105.8542 },
  isAccepted = false,
  onStatusChange,
  showToast,
  height = '420px',
}) {
  const mapContainerRef   = useRef(null);
  const mapRef            = useRef(null);
  const doctorMarkerRef   = useRef(null);
  const caseMarkerRef     = useRef(null);
  const circleRef         = useRef(null);
  const polylineRef       = useRef(null);
  const simIntervalRef    = useRef(null);
  const lastSpokenStepRef = useRef(-1);

  const [routeData, setRouteData]         = useState(null);
  const [loadingRoute, setLoadingRoute]   = useState(false);
  const [isNavigating, setIsNavigating]   = useState(false);
  const [voiceMuted, setVoiceMuted]       = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showStepsDrawer, setShowStepsDrawer] = useState(false);
  const [simSpeed, setSimSpeed]           = useState(1);
  const [isSimulating, setIsSimulating]   = useState(false);
  const [currentDoctorPos, setCurrentDoctorPos] = useState(doctorLocation);
  const [offRouteWarn, setOffRouteWarn]   = useState(false);
  const [arrivedPrompt, setArrivedPrompt] = useState(false);

  const rawLat = sos?.sos_latitude ?? sos?.latitude;
  const rawLng = sos?.sos_longitude ?? sos?.longitude;
  const parsedLat = parseFloat(rawLat);
  const parsedLng = parseFloat(rawLng);
  const targetLat = !isNaN(parsedLat) && parsedLat !== 0 ? parsedLat : 21.0300;
  const targetLng = !isNaN(parsedLng) && parsedLng !== 0 ? parsedLng : 105.8500;

  // Speak instruction using Web Speech API (vi-VN)
  const speakInstruction = useCallback((text) => {
    if (voiceMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }, [voiceMuted]);

  // Fetch Route from Backend API
  const fetchRoute = useCallback(async (fromPos) => {
    if (!sos?.id) return;
    setLoadingRoute(true);
    try {
      const p = fromPos || currentDoctorPos;
      const res = await axios.get(`/api/v1/emergency/${sos.id}/route`, {
        params: {
          from_lat: p.lat,
          from_lng: p.lng,
          mode: 'driving',
        },
        headers: { 'X-User-Id': 4 },
      });

      if (res.data?.success) {
        setRouteData(res.data);
        setCurrentStepIdx(0);
        lastSpokenStepRef.current = -1;

        if (isNavigating && res.data.steps?.[0]) {
          speakInstruction(res.data.steps[0].instruction);
        }
      }
    } catch (err) {
      console.warn('Route API fallback to straight line:', err.message);
    } finally {
      setLoadingRoute(false);
    }
  }, [sos?.id, currentDoctorPos, isNavigating, speakInstruction]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [targetLat, targetLng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Update Markers, Radius Circle, & Route Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Doctor Marker
    if (doctorMarkerRef.current) doctorMarkerRef.current.remove();
    doctorMarkerRef.current = L.marker([currentDoctorPos.lat, currentDoctorPos.lng], {
      icon: doctorIcon,
      zIndexOffset: 1000,
    }).addTo(map).bindPopup('<strong>Vị trí của bạn (Bác sĩ)</strong>');

    // Case Marker & Privacy Circle
    if (caseMarkerRef.current) caseMarkerRef.current.remove();
    if (circleRef.current) circleRef.current.remove();

    if (isAccepted) {
      // Exact pin after accepted
      caseMarkerRef.current = L.marker([targetLat, targetLng], {
        icon: getCaseIcon(sos?.urgency_level),
      }).addTo(map).bindPopup(`
        <strong>🚨 Điểm Cấp Cứu</strong><br/>
        Chủ nuôi: ${sos?.user?.name || 'Ẩn danh'}<br/>
        Thú cưng: ${sos?.pet?.name || 'Bé cưng'}
      `);
    } else {
      // Approximate 500m circle before accept (Privacy Rule)
      circleRef.current = L.circle([targetLat, targetLng], {
        radius: 500,
        color: '#ff4757',
        fillColor: '#ff6b81',
        fillOpacity: 0.18,
        dashArray: '6, 8',
      }).addTo(map).bindPopup('<strong>Vùng ước lượng (~500m)</strong><br/>Tọa độ chính xác sẽ hiển thị sau khi nhận ca.');

      caseMarkerRef.current = L.marker([targetLat, targetLng], {
        icon: getCaseIcon(sos?.urgency_level),
      }).addTo(map).bindPopup('Vùng xảy ra sự cố cấp cứu');
    }

    // Polyline
    if (polylineRef.current) polylineRef.current.remove();

    if (routeData?.geometry?.coordinates) {
      // GeoJSON has [lng, lat] -> Leaflet requires [lat, lng]
      const latLngs = routeData.geometry.coordinates.map(c => [c[1], c[0]]);

      polylineRef.current = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);

      // Auto-fit bounds
      try {
        const bounds = L.latLngBounds([
          [currentDoctorPos.lat, currentDoctorPos.lng],
          [targetLat, targetLng],
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (_) {}
    }
  }, [currentDoctorPos, targetLat, targetLng, isAccepted, routeData, sos]);

  // Initial route fetch
  useEffect(() => {
    fetchRoute();
  }, [sos?.id, isAccepted]);

  // Invalidate map size when component mounts / re-appears safely
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current && mapContainerRef.current) {
        try { mapRef.current.invalidateSize(); } catch (_) {}
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Handle Simulation movement
  const toggleSimulation = () => {
    if (isSimulating) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      return;
    }

    const coords = routeData?.geometry?.coordinates;
    if (!coords || coords.length < 2) {
      showToast?.('Chưa có tuyến đường để giả lập di chuyển.', 'error');
      return;
    }

    setIsSimulating(true);
    let stepIndex = 0;

    simIntervalRef.current = setInterval(() => {
      stepIndex++;
      if (stepIndex >= coords.length) {
        clearInterval(simIntervalRef.current);
        setIsSimulating(false);
        setArrivedPrompt(true);
        speakInstruction('Bạn đã đến nơi hiện trường cấp cứu!');
        return;
      }

      const nextLng = coords[stepIndex][0];
      const nextLat = coords[stepIndex][1];
      const nextPos = { lat: nextLat, lng: nextLng };
      setCurrentDoctorPos(nextPos);

      // Pan map smoothly with doctor
      mapRef.current?.panTo([nextLat, nextLng]);

      // Progress step index
      const steps = routeData.steps || [];
      const stepInterval = Math.max(1, Math.floor(coords.length / steps.length));
      const currentS = Math.min(steps.length - 1, Math.floor(stepIndex / stepInterval));

      if (currentS !== lastSpokenStepRef.current) {
        setCurrentStepIdx(currentS);
        lastSpokenStepRef.current = currentS;
        if (steps[currentS]) {
          speakInstruction(steps[currentS].instruction);
        }
      }

      // Check remaining distance
      const dLat = targetLat - nextLat;
      const dLng = targetLng - nextLng;
      const distM = Math.sqrt(dLat * dLat + dLng * dLng) * 111111;
      if (distM < 50 && !arrivedPrompt) {
        setArrivedPrompt(true);
      }
    }, 1200 / simSpeed);
  };

  useEffect(() => {
    return () => clearInterval(simIntervalRef.current);
  }, []);

  // Start Navigation Mode
  const handleStartNavigation = () => {
    setIsNavigating(true);
    if (onStatusChange) onStatusChange('en_route');
    if (routeData?.steps?.[0]) {
      speakInstruction(routeData.steps[0].instruction);
    }
    showToast?.('🚀 Đã bắt đầu chế độ dẫn đường trực tiếp!', 'success');
  };

  const handleConfirmArrival = () => {
    setArrivedPrompt(false);
    setIsNavigating(false);
    if (onStatusChange) onStatusChange('arrived');
    showToast?.('📍 Đã xác nhận có mặt tại hiện trường!', 'success');
  };

  // External Map Links
  const openGoogleMaps = () => {
    const origin = `${currentDoctorPos.lat},${currentDoctorPos.lng}`;
    const dest   = `${targetLat},${targetLng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`, '_blank');
  };

  const openAppleMaps = () => {
    window.open(`https://maps.apple.com/?saddr=${currentDoctorPos.lat},${currentDoctorPos.lng}&daddr=${targetLat},${targetLng}`, '_blank');
  };

  const openWaze = () => {
    window.open(`https://waze.com/ul?ll=${targetLat},${targetLng}&navigate=yes`, '_blank');
  };

  const copyCoordinates = () => {
    const text = `${targetLat.toFixed(6)}, ${targetLng.toFixed(6)}`;
    navigator.clipboard?.writeText(text);
    showToast?.(`📋 Đã sao chép tọa độ: ${text}`, 'success');
  };

  const currentStep = routeData?.steps?.[currentStepIdx] || routeData?.steps?.[0];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-white" style={{ isolation: 'isolate', zIndex: 0 }}>

      {/* ── TOP NAVIGATION BANNER (Turn-by-turn Google Maps style) ──────── */}
      {isNavigating && currentStep && (
        <div className="absolute top-3 left-3 right-3 z-[1000] bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
              {currentStep.maneuver?.includes('right') ? '↱' :
               currentStep.maneuver?.includes('left')  ? '↰' :
               currentStep.maneuver?.includes('arrive')? '🏁' : '↑'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-black leading-tight text-white line-clamp-1">
                {currentStep.instruction}
              </div>
              <div className="text-xs text-blue-300 font-bold mt-0.5 flex items-center gap-2">
                <span>{currentStep.distance_m} m tới điểm rẽ</span>
                <span>•</span>
                <span>Tổng còn: {routeData?.distance_txt} (~{routeData?.duration_txt})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setVoiceMuted(v => !v)}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                voiceMuted ? 'bg-slate-700 text-slate-400' : 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
              }`}
              title={voiceMuted ? 'Bật giọng nói' : 'Tắt giọng nói'}
            >
              {voiceMuted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={() => setShowStepsDrawer(s => !s)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold border border-slate-700 cursor-pointer"
              title="Danh sách các bước"
            >
              📋
            </button>
          </div>
        </div>
      )}

      {/* Arrival Prompt Banner */}
      {arrivedPrompt && (
        <div className="absolute top-20 left-3 right-3 z-[1001] bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎉</span>
            <div>
              <h5 className="font-black text-sm leading-tight">Bạn đã đến nơi hiện trường cấp cứu!</h5>
              <p className="text-[11px] text-emerald-100">Khoảng cách dưới 50m. Hãy xác nhận để chuyển sang cấp cứu.</p>
            </div>
          </div>
          <button
            onClick={handleConfirmArrival}
            className="px-4 py-2 rounded-xl bg-white text-emerald-700 font-black text-xs shadow-md hover:bg-emerald-50 cursor-pointer whitespace-nowrap"
          >
            Đã Có Mặt (Arrived)
          </button>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* ── BOTTOM CONTROL OVERLAYS ───────────────────────────────────────── */}
      <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">

        {/* Route Stats & Privacy status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span>📍 Cách {routeData?.distance_txt || '1.2 km'}</span>
            <span className="text-slate-300">•</span>
            <span>⏱️ Dự kiến: {routeData?.duration_txt || '4 phút'}</span>
          </div>

          {!isAccepted && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300">
              🛡️ Vùng ước lượng (~500m)
            </span>
          )}
        </div>

        {/* Action Buttons: Navigation, Simulation, External Maps */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isNavigating ? (
            <button
              onClick={handleStartNavigation}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              🧭 Bắt Đầu Dẫn Đường
            </button>
          ) : (
            <button
              onClick={() => setIsNavigating(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              ✕ Dừng Dẫn Đường
            </button>
          )}

          {/* Desktop Simulation Button */}
          <button
            onClick={toggleSimulation}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              isSimulating
                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Mô phỏng xe bác sĩ chạy trên route để kiểm thử"
          >
            🚗 {isSimulating ? 'Dừng Giả Lập' : 'Giả Lập Di Chuyển'}
          </button>

          {/* Speed picker during simulation */}
          {isSimulating && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  className={`px-2 py-0.5 rounded-lg cursor-pointer ${simSpeed === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}

          {/* External Deep Links dropdown / buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={openGoogleMaps}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
              title="Mở Google Maps chỉ đường"
            >
              🗺️ Google Maps
            </button>
            <button
              onClick={copyCoordinates}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
              title="Sao chép tọa độ"
            >
              📋 Copy
            </button>
          </div>
        </div>
      </div>

      {/* ── FULL STEPS DRAWER ──────────────────────────────────────────────── */}
      {showStepsDrawer && routeData?.steps && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 max-h-56 overflow-y-auto space-y-2 text-xs">
          <div className="flex items-center justify-between font-black text-slate-700 uppercase tracking-wider text-[11px] mb-2">
            <span>Chi Tiết Tuyến Đường Từng Bước</span>
            <button onClick={() => setShowStepsDrawer(false)} className="text-slate-400 hover:text-slate-600">✕ Đóng</button>
          </div>
          {routeData.steps.map((step, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                idx === currentStepIdx
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <span>{idx + 1}. {step.instruction}</span>
              <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">{step.distance_m} m</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
