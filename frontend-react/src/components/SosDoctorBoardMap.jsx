import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatTimeAgo } from '../utils/formatters';

// Use inline styles in divIcon HTML to avoid Tailwind purge
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
});

const getSeverityIcon = (urgency = 'critical') => {
  const bg = urgency === 'critical' ? '#dc2626' :
             urgency === 'high'     ? '#f97316' : '#eab308';
  const shadow = urgency === 'critical' ? 'rgba(220,38,38,0.5)' :
                 urgency === 'high'     ? 'rgba(249,115,22,0.5)' : 'rgba(234,179,8,0.5)';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="width:36px;height:36px;border-radius:50%;background:${bg};color:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px ${shadow};border:2px solid white;font-size:18px;">
          🚨
        </div>
        <div style="position:absolute;bottom:-5px;width:10px;height:10px;background:${bg};transform:rotate(45deg);"></div>
      </div>
    `,
    iconSize: [36, 40],
    iconAnchor: [18, 40],
    popupAnchor: [0, -36],
  });
};

export default function SosDoctorBoardMap({
  sosList = [],
  doctorLocation = { lat: 21.0285, lng: 105.8542 },
  focusedCaseId = null,
  onSelectCase,
  onAcceptCase,
}) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const circleRef       = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // If map already exists, just invalidate size (tab switch)
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [doctorLocation.lat, doctorLocation.lng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Doctor Marker
    L.marker([doctorLocation.lat, doctorLocation.lng], { icon: doctorIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<strong>Vị trí của bạn (Bác sĩ trực)</strong><br/>Bán kính quét: 15 km');

    // 15km Service Radius Circle
    circleRef.current = L.circle([doctorLocation.lat, doctorLocation.lng], {
      radius: 15000,
      color: '#3b82f6',
      fillColor: '#93c5fd',
      fillOpacity: 0.08,
      dashArray: '5, 8',
      weight: 1.5,
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size after mount to ensure tiles render safely
    const initTimer = setTimeout(() => {
      if (mapRef.current && mapContainerRef.current) {
        try { mapRef.current.invalidateSize(); } catch (_) {}
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      try {
        markersRef.current.forEach(m => m.marker?.remove?.());
        markersRef.current = [];
        circleRef.current?.remove();
        map.remove();
      } catch (_) {}
      mapRef.current = null;
    };
  }, []);

  // Invalidate size whenever component re-appears (viewMode switch) safely
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current && mapContainerRef.current) {
        try { mapRef.current.invalidateSize(); } catch (_) {}
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Update Case Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers safely
    markersRef.current.forEach(m => {
      try { m.marker?.remove?.(); } catch (_) {}
    });
    markersRef.current = [];

    const dLat = parseFloat(doctorLocation?.lat) || 21.0285;
    const dLng = parseFloat(doctorLocation?.lng) || 105.8542;
    const bounds = L.latLngBounds([[dLat, dLng]]);

    sosList.forEach(sos => {
      const rawLat = sos.sos_latitude ?? sos.latitude;
      const rawLng = sos.sos_longitude ?? sos.longitude;
      const parsedLat = parseFloat(rawLat);
      const parsedLng = parseFloat(rawLng);
      const isValidCoord = !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;
      const lat = isValidCoord ? parsedLat : dLat;
      const lng = isValidCoord ? parsedLng : dLng;

      bounds.extend([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: getSeverityIcon(sos.urgency_level),
      }).addTo(map);

      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'padding:4px;font-size:12px;';
      popupContent.innerHTML = `
        <div style="font-weight:800;font-size:13px;color:#dc2626;margin-bottom:4px;">
          🚨 Ca SOS #${sos.id} (${sos.urgency_level === 'critical' ? 'Khẩn Cấp' : 'Nghiêm Trọng'})
        </div>
        <p style="font-weight:600;color:#1e293b;margin-bottom:4px;">${sos.description || 'Cần cấp cứu thú cưng ngay!'}</p>
        <div style="font-size:11px;color:#64748b;margin-bottom:8px;">
          👤 Chủ nuôi: <strong>${sos.user?.name || 'Ẩn danh'}</strong><br/>
          🐾 Thú cưng: <strong>${sos.pet?.name || 'Bé cưng'}</strong> (${sos.pet?.breed || 'Thú cưng'})<br/>
          📍 Cách: <strong>${sos.distance_km != null ? sos.distance_km + ' km' : '1.2 km'}</strong> · ${formatTimeAgo(sos.created_at)}
          ${!isValidCoord ? '<br/><span style="color:#e11d48;font-weight:700;">⚠️ Tọa độ ước lượng khu vực trung tâm</span>' : ''}
        </div>
        <div style="display:flex;gap:8px;">
          <button id="btn-popup-accept-${sos.id}" style="padding:6px 12px;border-radius:8px;background:#ff4757;color:white;font-weight:700;border:none;cursor:pointer;font-size:11px;">
            ⚡ Nhận Ca
          </button>
          <button id="btn-popup-view-${sos.id}" style="padding:6px 12px;border-radius:8px;background:#f1f5f9;color:#334155;font-weight:700;border:1px solid #e2e8f0;cursor:pointer;font-size:11px;">
            🔍 Xem Chi Tiết
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const acceptBtn = document.getElementById(`btn-popup-accept-${sos.id}`);
        const viewBtn   = document.getElementById(`btn-popup-view-${sos.id}`);
        if (acceptBtn) acceptBtn.onclick = () => onAcceptCase?.(sos);
        if (viewBtn)   viewBtn.onclick   = () => onSelectCase?.(sos);
      });

      markersRef.current.push({ id: sos.id, marker, lat, lng });
    });

    if (sosList.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (_) {}
    }
  }, [sosList, doctorLocation, onAcceptCase, onSelectCase]);

  // Focus specific case if selected
  useEffect(() => {
    if (!focusedCaseId || !mapRef.current) return;
    const found = markersRef.current.find(m => m.id === focusedCaseId);
    if (found) {
      try {
        mapRef.current.setView([found.lat, found.lng], 15, { animate: true });
        found.marker.openPopup();
      } catch (_) {}
    }
  }, [focusedCaseId]);

  return (
    <div style={{ position: 'relative', borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', background: 'white' }}>
      <div ref={mapContainerRef} style={{ height: '540px', width: '100%', zIndex: 0 }} />

      {/* Recenter Button */}
      <button
        onClick={() => mapRef.current?.setView([doctorLocation.lat, doctorLocation.lng], 14, { animate: true })}
        style={{
          position: 'absolute', bottom: '16px', right: '16px', zIndex: 1000,
          padding: '10px 14px', borderRadius: '14px', background: 'white',
          border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#334155',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        🎯 Vị Trí Của Tôi
      </button>

      {/* Map Legend */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 1000,
        padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0', fontSize: '11px', lineHeight: '1.7',
      }}>
        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Bản Đồ Điều Phối SOS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span> Bác sĩ (Bạn)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span> Cực khẩn cấp 🚨
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316', display: 'inline-block' }}></span> Nghiêm trọng ⚠️
        </div>
        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Vòng tròn xanh: Bán kính 15km</div>
      </div>
    </div>
  );
}
