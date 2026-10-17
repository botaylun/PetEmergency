import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Map pin picker (Leaflet)
// ─────────────────────────────────────────────────────────────────────────────
function MapPinPicker({ lat, lng, onChange }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const markerRef  = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    if (!L) return;

    if (leafletRef.current) {
      leafletRef.current.remove();
      leafletRef.current = null;
    }

    const initLat = lat || 21.0285;
    const initLng = lng || 105.8542;

    const map = L.map(mapRef.current, { center: [initLat, initLng], zoom: 14 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const { lat: newLat, lng: newLng } = marker.getLatLng();
      onChange({ lat: newLat, lng: newLng });
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    leafletRef.current = map;
    markerRef.current  = marker;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  // Update marker position when coords change externally
  useEffect(() => {
    if (!leafletRef.current || !markerRef.current || !lat || !lng) return;
    markerRef.current.setLatLng([lat, lng]);
    leafletRef.current.setView([lat, lng], 15);
  }, [lat, lng]);

  return (
    <div
      ref={mapRef}
      style={{
        height: '260px',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        isolation: 'isolate',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    draft:          { label: 'Nháp', cls: 'bg-slate-100 text-slate-600' },
    pending_review: { label: 'Đang chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
    approved:       { label: 'Đã duyệt ✓', cls: 'bg-emerald-100 text-emerald-700' },
    rejected:       { label: 'Bị từ chối', cls: 'bg-red-100 text-red-700' },
    suspended:      { label: 'Tạm đình chỉ', cls: 'bg-orange-100 text-orange-700' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Days of week
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function HoursEditor({ hours, onChange }) {
  const initHours = () => {
    const h = {};
    for (let d = 0; d <= 6; d++) {
      const existing = (hours || []).find(x => x.day_of_week === d);
      h[d] = existing
        ? { open_time: existing.open_time?.slice(0, 5) || '08:00', close_time: existing.close_time?.slice(0, 5) || '20:00', is_closed: existing.is_closed }
        : { open_time: '08:00', close_time: '20:00', is_closed: false };
    }
    return h;
  };

  const [h, setH] = useState(initHours);

  const update = (day, field, val) => {
    const next = { ...h, [day]: { ...h[day], [field]: val } };
    setH(next);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {DAYS.map((day, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-8 font-bold text-slate-600">{day}</span>
          <input
            type="checkbox"
            checked={!h[i]?.is_closed}
            onChange={e => update(i, 'is_closed', !e.target.checked)}
            className="cursor-pointer"
          />
          {!h[i]?.is_closed ? (
            <>
              <input
                type="time"
                value={h[i]?.open_time || '08:00'}
                onChange={e => update(i, 'open_time', e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                value={h[i]?.close_time || '20:00'}
                onChange={e => update(i, 'close_time', e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
              />
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Nghỉ</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Clinic Form Modal
// ─────────────────────────────────────────────────────────────────────────────
function ClinicFormModal({ clinic, onClose, onSaved, xUserId }) {
  const isEdit = !!clinic?.id;

  const [form, setForm] = useState({
    name:              clinic?.name || '',
    type:              clinic?.type || 'clinic',
    description:       clinic?.description || '',
    address:           clinic?.address || '',
    city:              clinic?.city || '',
    lat:               clinic?.lat || null,
    lng:               clinic?.lng || null,
    hotline:           clinic?.hotline || '',
    zalo:              clinic?.zalo || '',
    website:           clinic?.website || '',
    facebook:          clinic?.facebook || '',
    is_24h:            clinic?.is_24h || false,
    accepts_emergency: clinic?.accepts_emergency !== false,
    species:           clinic?.species || ['Chó', 'Mèo'],
    services:          clinic?.services || [],
    hours:             {},
  });

  const [geoQuery, setGeoQuery]     = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [leafletReady, setLeafletReady] = useState(!!window.L);

  // Load Leaflet for map pin picker
  useEffect(() => {
    if (window.L) return;
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => setLeafletReady(true);
    document.head.appendChild(s);
    const l = document.createElement('link');
    l.rel  = 'stylesheet';
    l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(l);
  }, []);

  const debounceRef = useRef(null);
  const handleGeoSearch = (q) => {
    setGeoQuery(q);
    clearTimeout(debounceRef.current);
    if (q.length < 3) { setGeoResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`${API}/geo/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setGeoResults(data.results || []);
      } finally {
        setGeoLoading(false);
      }
    }, 400);
  };

  const handleGeoSelect = (r) => {
    setForm(f => ({ ...f, address: r.display_name.split(',').slice(0, 3).join(','), lat: r.lat, lng: r.lng }));
    setGeoQuery('');
    setGeoResults([]);
  };

  const toggleSpecies = (s) => {
    setForm(f => ({
      ...f,
      species: f.species.includes(s) ? f.species.filter(x => x !== s) : [...f.species, s],
    }));
  };

  const toggleService = (s) => {
    setForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const url  = isEdit ? `${API}/doctor/clinics/${clinic.id}` : `${API}/doctor/clinics`;
      const method = isEdit ? 'PUT' : 'POST';
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-User-Id': xUserId, 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Có lỗi xảy ra.');
        return;
      }
      onSaved(data.data);
    } catch {
      setError('Không thể kết nối server.');
    } finally {
      setSaving(false);
    }
  };

  const ALL_SPECIES  = ['Chó', 'Mèo', 'Chim', 'Chuột Hamster', 'Thỏ', 'Bò sát'];
  const ALL_SERVICES = ['Cấp cứu 24/7', 'Phẫu thuật', 'Tiêm phòng', 'Xét nghiệm', 'Siêu âm', 'X-quang', 'Lưu chuồng', 'Grooming & Spa', 'Tư vấn dinh dưỡng'];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-30">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {isEdit ? '✏️ Chỉnh Sửa Phòng Khám' : '🏥 Thêm Phòng Khám Mới'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Sau khi lưu nháp, bạn có thể gửi duyệt để xuất hiện trên bản đồ công khai.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl cursor-pointer">×</button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tên phòng khám *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Phòng Khám Thú Y ABC"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Loại hình</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                >
                  <option value="clinic">Phòng khám</option>
                  <option value="hospital">Bệnh viện thú y</option>
                  <option value="pet_shop">Cửa hàng thú cưng</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Thành phố</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="VD: Hà Nội"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Hotline *</label>
                <input
                  type="text"
                  value={form.hotline}
                  onChange={e => setForm(f => ({ ...f, hotline: e.target.value }))}
                  placeholder="0912 345 678"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Zalo</label>
                <input
                  type="text"
                  value={form.zalo}
                  onChange={e => setForm(f => ({ ...f, zalo: e.target.value }))}
                  placeholder="Số Zalo"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Mô tả</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Mô tả dịch vụ, thiết bị, kinh nghiệm..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none resize-none"
              />
            </div>
          </div>

          {/* Address & Map Pin */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Địa chỉ & Vị trí bản đồ</h3>
            <div className="relative">
              <input
                type="text"
                value={geoQuery}
                onChange={e => handleGeoSearch(e.target.value)}
                placeholder="Tìm kiếm địa chỉ... (ít nhất 3 ký tự)"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 outline-none"
              />
              {geoLoading && <span className="absolute right-4 top-2.5 text-slate-400 animate-spin">⏳</span>}
              {geoResults.length > 0 && (
                <div className="absolute z-40 top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto">
                  {geoResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleGeoSelect(r)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 border-b border-slate-100 last:border-b-0 cursor-pointer"
                    >
                      📍 {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.lat && form.lng && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2">
                📌 Toạ độ: {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)}
                <span className="ml-2 text-slate-400">(kéo ghim để điều chỉnh chính xác)</span>
              </div>
            )}

            <div className="text-xs text-slate-500 mb-1">Nhấp vào bản đồ hoặc kéo ghim để đặt vị trí chính xác</div>
            {leafletReady && (
              <MapPinPicker
                lat={form.lat}
                lng={form.lng}
                onChange={({ lat, lng }) => setForm(f => ({ ...f, lat, lng }))}
              />
            )}
          </div>

          {/* Species & Services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Loại thú cưng</h3>
              <div className="flex flex-wrap gap-2">
                {ALL_SPECIES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSpecies(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                      form.species.includes(s)
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">Dịch vụ</h3>
              <div className="flex flex-wrap gap-2">
                {ALL_SERVICES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleService(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                      form.services.includes(s)
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_24h}
                onChange={e => setForm(f => ({ ...f, is_24h: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold text-slate-700">🌙 Hoạt động 24/7</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.accepts_emergency}
                onChange={e => setForm(f => ({ ...f, accepts_emergency: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold text-slate-700">🚨 Nhận cấp cứu</span>
            </label>
          </div>

          {/* Hours */}
          {!form.is_24h && (
            <div>
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Giờ hoạt động</h3>
              <HoursEditor hours={clinic?.hours} onChange={h => setForm(f => ({ ...f, hours: h }))} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-3xl z-30">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 cursor-pointer transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.hotline}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-md disabled:opacity-60 cursor-pointer transition hover:opacity-90"
          >
            {saving ? '⏳ Đang lưu...' : isEdit ? '💾 Lưu thay đổi' : '➕ Tạo phòng khám'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: Doctor Clinic Management
// ─────────────────────────────────────────────────────────────────────────────
export default function DoctorClinicManager({ user }) {
  const [clinics, setClinics]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editClinic, setEditClinic] = useState(null);
  const [submitting, setSubmitting] = useState({});
  const [feedback, setFeedback]     = useState('');

  const xUserId = user?.id;

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/doctor/clinics`, {
        headers: { 'X-User-Id': xUserId },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setClinics(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [xUserId]);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  const handleSaved = (clinic) => {
    setShowForm(false);
    setEditClinic(null);
    fetchClinics();
    setFeedback(clinic ? '✅ Lưu thành công!' : '✅ Đã lưu!');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleSubmitForReview = async (clinicId) => {
    setSubmitting(s => ({ ...s, [clinicId]: true }));
    try {
      const res  = await fetch(`${API}/doctor/clinics/${clinicId}/submit`, {
        method: 'POST',
        headers: { 'X-User-Id': xUserId, 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
        credentials: 'include',
      });
      const data = await res.json();
      setFeedback(data.message || '✅ Đã gửi yêu cầu duyệt!');
      fetchClinics();
    } finally {
      setSubmitting(s => ({ ...s, [clinicId]: false }));
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl animate-pulse mb-3">🏥</div>
        <p className="text-sm">Đang tải phòng khám...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">🏥 Phòng Khám Của Tôi</h3>
          <p className="text-xs text-slate-500 mt-0.5">Quản lý danh sách phòng khám bạn sở hữu hoặc tham gia</p>
        </div>
        <button
          onClick={() => { setEditClinic(null); setShowForm(true); }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-bold shadow-md hover:opacity-90 cursor-pointer transition"
        >
          + Thêm mới
        </button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
          {feedback}
        </div>
      )}

      {clinics.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-semibold text-slate-600">Bạn chưa có phòng khám nào</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Đăng ký phòng khám để xuất hiện trên bản đồ thú y.</p>
          <button
            onClick={() => { setEditClinic(null); setShowForm(true); }}
            className="px-5 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 cursor-pointer transition"
          >
            🏥 Thêm phòng khám đầu tiên
          </button>
        </div>
      )}

      {/* Clinic cards */}
      <div className="space-y-4">
        {clinics.map(c => {
          const isOwner = c.members?.some(m => m.user_id === xUserId && m.role === 'owner');
          return (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{c.type === 'hospital' ? '🏥' : '🩺'}</span>
                  <div>
                    <h4 className="font-bold text-slate-900">{c.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{c.address}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <StatusBadge status={c.status} />
                      {isOwner && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                          Chủ sở hữu
                        </span>
                      )}
                      {c.is_24h && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          24/7
                        </span>
                      )}
                    </div>
                    {c.reject_reason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded-lg">
                        ⚠️ Lý do từ chối: {c.reject_reason}
                      </p>
                    )}
                    {c.pending_edits && (
                      <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg">
                        ⏳ Có thay đổi đang chờ admin phê duyệt
                      </p>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => { setEditClinic(c); setShowForm(true); }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer transition"
                    >
                      ✏️ Sửa
                    </button>
                    {['draft', 'rejected'].includes(c.status) && (
                      <button
                        onClick={() => handleSubmitForReview(c.id)}
                        disabled={submitting[c.id]}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 cursor-pointer disabled:opacity-60 transition"
                      >
                        {submitting[c.id] ? '⏳...' : '📤 Gửi duyệt'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span>⭐ {c.rating} ({c.review_count} đánh giá)</span>
                <span>📞 {c.hotline}</span>
                <span>👥 {c.members?.length || 0} thành viên</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ClinicFormModal
          clinic={editClinic}
          xUserId={xUserId}
          onClose={() => { setShowForm(false); setEditClinic(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
