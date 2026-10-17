import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DoctorClinicManager from './DoctorClinicManager';

const API = '/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Spatial Grid Clustering Helper
// ─────────────────────────────────────────────────────────────────────────────
function clusterClinics(clinics, zoom) {
  if (zoom >= 14) {
    // Zoomed in: show all individual markers
    return clinics.map(c => ({ isCluster: false, clinic: c, lat: c.lat, lng: c.lng }));
  }

  // Determine grid size based on zoom level
  const gridSize = zoom <= 7 ? 1.5 : zoom <= 9 ? 0.6 : zoom <= 11 ? 0.15 : 0.04;
  const grid = {};

  clinics.forEach(clinic => {
    const key = `${Math.floor(clinic.lat / gridSize)}_${Math.floor(clinic.lng / gridSize)}`;
    if (!grid[key]) {
      grid[key] = [];
    }
    grid[key].push(clinic);
  });

  const items = [];
  Object.values(grid).forEach(group => {
    if (group.length === 1) {
      items.push({ isCluster: false, clinic: group[0], lat: group[0].lat, lng: group[0].lng });
    } else {
      const avgLat = group.reduce((sum, c) => sum + Number(c.lat), 0) / group.length;
      const avgLng = group.reduce((sum, c) => sum + Number(c.lng), 0) / group.length;
      items.push({
        isCluster: true,
        clinics: group,
        lat: avgLat,
        lng: avgLng,
        count: group.length,
      });
    }
  });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet Map Component with Clustering
// ─────────────────────────────────────────────────────────────────────────────
function LeafletMap({ clinics, selectedClinic, onSelect, userLocation, enableClustering = true }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);
  const [currentZoom, setCurrentZoom] = useState(6);

  useEffect(() => {
    if (leafletRef.current || !mapRef.current) return;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapRef.current, {
      center: [16.0, 106.0],
      zoom:   6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // Render Clustered or Individual Markers
  useEffect(() => {
    const map = leafletRef.current;
    if (!map) return;

    // Clean up previous markers
    markersRef.current.forEach(m => {
      if (m && typeof m.remove === 'function') m.remove();
    });
    markersRef.current = [];

    const hospitalIcon = L.divIcon({
      className: '',
      html: `<div style="background:#ff4757;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(255,71,87,0.5);border:2px solid white;">🏥</div>`,
      iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -34],
    });
    const clinicIcon = L.divIcon({
      className: '',
      html: `<div style="background:#ff6b81;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(255,107,129,0.5);border:2px solid white;">🩺</div>`,
      iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30],
    });

    const itemsToRender = enableClustering
      ? clusterClinics(clinics, currentZoom)
      : clinics.map(c => ({ isCluster: false, clinic: c, lat: c.lat, lng: c.lng }));

    itemsToRender.forEach(item => {
      if (item.isCluster) {
        // Cluster Badge
        const clusterIcon = L.divIcon({
          className: '',
          html: `<div style="background:linear-gradient(135deg, #ff4757, #ff6b81);color:white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;box-shadow:0 4px 12px rgba(255,71,87,0.6);border:3px solid white;cursor:pointer;transform:scale(1.05);transition:transform 0.2s;">${item.count}</div>`,
          iconSize: [38, 38], iconAnchor: [19, 19],
        });

        const clusterMarker = L.marker([item.lat, item.lng], { icon: clusterIcon })
          .addTo(map)
          .bindTooltip(`<strong>${item.count} phòng khám</strong><br/>Nhấp để phóng to khu vực`, { direction: 'top' })
          .on('click', () => {
            const bounds = L.latLngBounds(item.clinics.map(c => [c.lat, c.lng]));
            map.fitBounds(bounds, { maxZoom: 15, padding: [40, 40] });
          });

        markersRef.current.push(clusterMarker);
      } else {
        // Individual Clinic Pin
        const clinic = item.clinic;
        const icon = clinic.type === 'hospital' ? hospitalIcon : clinicIcon;
        const openLabel = clinic.is_24h ? '24/7' : (clinic.open || '');
        const sourceBadge = clinic.source === 'osm' ? '🌐 OpenStreetMap' : (clinic.source === 'google' ? '📍 Google' : (clinic.source === 'csv' ? '📄 CSV' : ''));

        const marker = L.marker([clinic.lat, clinic.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:210px;padding:2px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:4px;">
                <strong style="color:#ff4757;font-size:13px;">${clinic.name}</strong>
                ${sourceBadge ? `<span style="font-size:9px;background:#f1f5f9;color:#64748b;padding:1px 5px;border-radius:4px;white-space:nowrap;">${sourceBadge}</span>` : ''}
              </div>
              <span style="font-size:11px;color:#64748b;line-height:1.3;display:block;">${clinic.address}</span>
              <div style="margin-top:6px;display:flex;align-items:center;gap:8px;font-size:11px;color:#334155;">
                <span>⏰ <strong>${openLabel}</strong></span>
                <span>⭐ <strong>${clinic.rating || 4.5}</strong></span>
              </div>
              <a href="tel:${clinic.hotline || clinic.phone}" style="display:block;margin-top:8px;padding:6px 12px;background:#ff4757;color:white;border-radius:20px;text-align:center;text-decoration:none;font-weight:bold;font-size:11px;">📞 ${clinic.hotline || clinic.phone}</a>
            </div>
          `, { maxWidth: 260 })
          .on('click', () => onSelect(clinic));

        markersRef.current.push(marker);
      }
    });

    if (userLocation) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="background:#4f46e5;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 10px rgba(79,70,229,0.6);border:3px solid white;">📍</div>`,
        iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -38],
      });
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>📍 Vị trí của bạn</strong>')
        .openPopup();
      markersRef.current.push(userMarker);
    }
  }, [clinics, userLocation, currentZoom, enableClustering]);

  useEffect(() => {
    const map = leafletRef.current;
    if (!map || !selectedClinic) return;
    map.flyTo([selectedClinic.lat, selectedClinic.lng], 15, { duration: 1.2 });
  }, [selectedClinic]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main VetMap Component
// ─────────────────────────────────────────────────────────────────────────────
export default function VetMap({ currentUser }) {
  const [leafletLoaded, setLeafletLoaded]     = useState(false);
  const [clinics, setClinics]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [selectedCity, setSelectedCity]       = useState('Tất cả');
  const [selectedClinic, setSelectedClinic]   = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [userLocation, setUserLocation]       = useState(null);
  const [locationStatus, setLocationStatus]   = useState('idle');
  const [nearestClinics, setNearestClinics]   = useState([]);
  const [filter24h, setFilter24h]             = useState(false);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [enableClustering, setEnableClustering] = useState(true);

  useEffect(() => {
    setLeafletLoaded(true);
  }, []);

  // Fetch clinics from API
  const fetchClinics = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params.lat)       qs.set('lat', params.lat);
      if (params.lng)       qs.set('lng', params.lng);
      if (params.radius)    qs.set('radius', params.radius);
      if (params.is_24h)    qs.set('is_24h', '1');
      if (params.emergency) qs.set('emergency', '1');
      qs.set('per_page', '100');

      const res = await fetch(`${API}/clinics?${qs}`);
      const data = await res.json();
      if (data.success) {
        setClinics(data.data.data || data.data);
      }
    } catch (err) {
      console.error('Clinic fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClinics({ is_24h: filter24h, emergency: filterEmergency });
  }, [filter24h, filterEmergency, fetchClinics]);

  const cities = ['Tất cả', ...Array.from(new Set(clinics.map(c => c.city).filter(Boolean))).sort()];

  const filteredClinics = clinics.filter(c => {
    const cityMatch   = selectedCity === 'Tất cả' || c.city === selectedCity;
    const searchMatch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase());
    return cityMatch && searchMatch;
  });

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R   = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a   = Math.sin(dLat / 2) ** 2 +
                Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleGetLocation = () => {
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('success');

        // Re-fetch with coordinates for distance sorting
        fetchClinics({ lat: loc.lat, lng: loc.lng, radius: 30 });

        // Compute local nearest from current list
        const sorted = [...clinics]
          .map(c => ({ ...c, distance: getDistance(loc.lat, loc.lng, c.lat, c.lng) }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);
        setNearestClinics(sorted);
        if (sorted[0]) setSelectedClinic(sorted[0]);
      },
      () => setLocationStatus('error'),
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            🗺️ Bản Đồ Thú Y Toàn Việt Nam
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Đang tải...' : `${clinics.length} phòng khám & bệnh viện thú y`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser?.role === 'doctor' && (
            <button
              onClick={() => setShowClinicModal(true)}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              🏥 Quản Lý / Thêm Phòng Khám Của Tôi
            </button>
          )}

          <button
            onClick={handleGetLocation}
            disabled={locationStatus === 'loading'}
            className="px-5 py-2.5 rounded-full bg-[#ff4757] hover:bg-[#ff6b81] disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            {locationStatus === 'loading' ? (
              <><span className="animate-spin inline-block">⏳</span> Đang tìm...</>
            ) : locationStatus === 'success' ? (
              <>✅ Đã có vị trí</>
            ) : (
              <>📍 Tìm gần tôi nhất</>
            )}
          </button>
        </div>
      </div>

      {/* Nearest clinics */}
      {nearestClinics.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200">
          <p className="text-xs font-bold text-[#ff4757] mb-3 uppercase tracking-wider">⚡ 5 Phòng Khám Gần Bạn Nhất</p>
          <div className="flex gap-2 flex-wrap">
            {nearestClinics.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClinic(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedClinic?.id === c.id
                    ? 'bg-[#ff4757] text-white border-[#ff4757] shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                }`}
              >
                {c.type === 'hospital' ? '🏥' : '🩺'} {c.name} <span className="text-[10px] opacity-70">({(c.distance || c.distance_km || 0).toFixed(1)}km)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Tìm tên phòng khám, địa chỉ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-[#ff6b81] focus:border-[#ff6b81] outline-none transition-all"
          />
        </div>
        <select
          value={selectedCity}
          onChange={e => setSelectedCity(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#ff6b81] outline-none cursor-pointer"
        >
          {cities.map(city => <option key={city}>{city}</option>)}
        </select>
        {/* Toggle chips */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter24h(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${filter24h ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
          >
            🌙 24/7
          </button>
          <button
            onClick={() => setFilterEmergency(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${filterEmergency ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}
          >
            🚨 Cấp cứu
          </button>
          <button
            type="button"
            onClick={() => setEnableClustering(v => !v)}
            title="Bật/tắt gom nhóm phòng khám trên bản đồ"
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              enableClustering ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            🗺️ Gom cụm: {enableClustering ? 'BẬT' : 'TẮT'}
          </button>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: '520px' }}>
        {/* Map Panel — isolation:isolate prevents Leaflet z-index from bleeding out */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100" style={{ height: '520px', isolation: 'isolate', position: 'relative', zIndex: 0 }}>
          {leafletLoaded ? (
            <LeafletMap
              clinics={filteredClinics}
              selectedClinic={selectedClinic}
              onSelect={setSelectedClinic}
              userLocation={userLocation}
              enableClustering={enableClustering}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="text-4xl animate-pulse">🗺️</div>
              <p className="text-sm font-semibold">Đang tải bản đồ...</p>
            </div>
          )}
        </div>

        {/* Sidebar - Clinic List */}
        <div className="overflow-y-auto space-y-2 pr-1" style={{ height: '520px' }}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 sticky top-0 bg-[#f8f9fa] py-1">
            {filteredClinics.length} kết quả
          </p>

          {loading && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <div className="text-2xl animate-pulse mb-2">⏳</div>
              Đang tải danh sách...
            </div>
          )}

          {!loading && filteredClinics.map(clinic => (
            <button
              key={clinic.id}
              onClick={() => setSelectedClinic(clinic)}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                selectedClinic?.id === clinic.id
                  ? 'bg-rose-50 border-rose-300 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl mt-0.5">{clinic.type === 'hospital' ? '🏥' : '🩺'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${selectedClinic?.id === clinic.id ? 'text-[#ff4757]' : 'text-slate-800'}`}>
                    {clinic.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{clinic.address}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-amber-600">⭐ {clinic.rating || 4.5}</span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] font-semibold text-emerald-600">
                      ⏰ {clinic.is_24h ? '24/7' : (clinic.open || 'Xem giờ')}
                    </span>
                    {clinic.source && clinic.source !== 'manual' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200">
                        {clinic.source.toUpperCase()}
                      </span>
                    )}
                    {clinic.distance_km != null && (
                      <>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] font-bold text-[#ff4757]">📍 {parseFloat(clinic.distance_km).toFixed(1)}km</span>
                      </>
                    )}
                    {clinic.is_24h && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">24/7</span>
                    )}
                  </div>
                  <a
                    href={`tel:${clinic.hotline || clinic.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="mt-1.5 text-[10px] font-bold text-[#ff4757] hover:underline flex items-center gap-1"
                  >
                    📞 {clinic.hotline || clinic.phone}
                  </a>
                </div>
              </div>
            </button>
          ))}

          {!loading && filteredClinics.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Không tìm thấy phòng khám nào.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
        <span className="flex items-center gap-1.5"><span className="text-base">🏥</span> Bệnh viện (24/7)</span>
        <span className="flex items-center gap-1.5"><span className="text-base">🩺</span> Phòng khám</span>
        <span className="flex items-center gap-1.5"><span className="text-base">📍</span> Vị trí của bạn</span>
      </div>

      {/* Doctor Clinic Manager Modal — z-[9999] to clear Leaflet panes (z-index 400-600) */}
      {showClinicModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: 9999 }}
          onClick={() => setShowClinicModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                🏥 Quản Lý & Đăng Ký Phòng Khám Thú Y
              </h3>
              <button
                onClick={() => { setShowClinicModal(false); fetchClinics(); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <DoctorClinicManager user={currentUser} />
          </div>
        </div>
      )}
    </div>
  );
}
