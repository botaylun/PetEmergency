import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const COMMON_SYMPTOMS = [
  'Khó thở', 'Co giật', 'Chảy máu',
  'Ngộ độc', 'Chấn thương', 'Nôn mửa liên tục',
  'Hóc dị vật', 'Hôn mê / Bất tỉnh',
];

function StarRatingInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
      {[1,2,3,4,5].map(star => (
        <span
          key={star}
          style={{ fontSize: 32, color: star <= display ? '#f59e0b' : '#d1d5db', transition: 'color 0.1s, transform 0.1s', transform: star <= display ? 'scale(1.15)' : 'scale(1)' }}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >★</span>
      ))}
    </div>
  );
}

export default function SosButton({ currentUser, showToast }) {
  const [showPanel, setShowPanel]       = useState(false);
  const [isSending, setIsSending]       = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const [location, setLocation]         = useState(null);
  const [description, setDescription]   = useState('');
  const [urgency, setUrgency]           = useState('critical');
  const [selectedTags, setSelectedTags] = useState(['Khó thở']);
  const [petName, setPetName]           = useState('Cún Lu');
  const [petBreed, setPetBreed]         = useState('Golden Retriever');

  // Active SOS tracking state
  const [activeSos, setActiveSos]       = useState(null);
  const [activeSosId, setActiveSosId]   = useState(null);
  const [canceling, setCanceling]       = useState(false);
  const pollingRef                      = useRef(null);

  // Rating popup state (auto-triggered after 'completed')
  const [showRating, setShowRating]     = useState(false);
  const [ratingValue, setRatingValue]   = useState(0);
  const [ratingText, setRatingText]     = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const ratingShownRef                  = useRef(false);


  // Get location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 21.0285, lng: 105.8542 }) // Hà Nội fallback
      );
    } else {
      setLocation({ lat: 21.0285, lng: 105.8542 });
    }
  }, []);

  // 5-second Countdown before sending
  useEffect(() => {
    if (countdown <= 0) return;
    if (countdown === 1) {
      handleSendSos();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Poll active SOS status
  useEffect(() => {
    if (!activeSosId) return;

    const checkStatus = async () => {
      try {
        const res = await axios.get(`/api/v1/emergency/sos/${activeSosId}`, {
          headers: { 'X-User-Id': currentUser?.id || 1 },
        });
        if (res.data?.success && res.data?.data) {
          setActiveSos(res.data.data);
          if (res.data.data.status === 'completed' && !ratingShownRef.current) {
            showToast('🎉 Ca cấp cứu đã hoàn tất! Bác sĩ đã lưu bệnh án.', 'success');
            // Auto-trigger rating popup after 1.5s
            setTimeout(() => {
              setShowRating(true);
              setShowPanel(true);
            }, 1500);
            ratingShownRef.current = true;
          }
        }
      } catch (_) {}
    };

    checkStatus();
    pollingRef.current = setInterval(checkStatus, 4000);
    return () => clearInterval(pollingRef.current);
  }, [activeSosId, currentUser, showToast]);


  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? (prev.length > 1 ? prev.filter(t => t !== tag) : prev)
        : [...prev, tag]
    );
  };

  const handleStartCountdown = () => {
    setCountdown(5);
  };

  const handleCancelCountdown = () => {
    setCountdown(0);
    showToast('Đã dừng gửi SOS.', 'info');
  };

  const handleSendSos = async () => {
    setCountdown(0);
    setIsSending(true);
    try {
      const loc = location || { lat: 21.0285, lng: 105.8542 };
      const payload = {
        lat:           loc.lat,
        lng:           loc.lng,
        symptom_tags:  selectedTags.length > 0 ? selectedTags : ['Cần cấp cứu gấp'],
        notes:         description || 'Khẩn cấp! Thú cưng cần cấp cứu ngay lập tức!',
        urgency_level: urgency,
        pet_name:      petName,
        pet_breed:     petBreed,
      };

      const res = await axios.post('/api/v1/emergency/sos', payload, {
        headers: { 'X-User-Id': currentUser?.id || 1 },
      });

      if (res.data?.success) {
        const sosId = res.data.emergency_id;
        setActiveSosId(sosId);
        setActiveSos({
          id: sosId,
          status: 'finding',
          ai_first_aid: res.data.ai_first_aid?.steps ? res.data.ai_first_aid.steps.join("\n") : null,
          nearby_doctors: res.data.nearby_doctors || [],
          pet: { name: petName, breed: petBreed },
        });
        showToast('🚨 Tín hiệu SOS đã phát thành công! Hệ thống đang kết nối bác sĩ gần nhất.', 'error');
      }
    } catch (err) {
      // Demo fallback mode
      const fakeId = Date.now();
      setActiveSosId(fakeId);
      setActiveSos({
        id: fakeId,
        status: 'finding',
        ai_first_aid: "1. Đặt thú cưng nằm nghiêng nơi thoáng mát\n2. Cầm máu hoặc gạt đờm dãi nếu có\n3. Giữ ấm cơ thể và chờ bác sĩ đến",
        pet: { name: petName, breed: petBreed },
      });
      showToast('🚨 Tín hiệu SOS đã phát (Demo mode)!', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelActiveSos = async () => {
    if (!activeSosId) return;
    setCanceling(true);
    try {
      await axios.post(`/api/v1/emergency/sos/${activeSosId}/cancel`, {}, {
        headers: { 'X-User-Id': currentUser?.id || 1 },
      });
      showToast('Đã hủy yêu cầu cấp cứu SOS.', 'info');
    } catch (_) {
      showToast('Đã hủy yêu cầu cấp cứu.', 'info');
    } finally {
      setActiveSos(null);
      setActiveSosId(null);
      setShowPanel(false);
      setCanceling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'finding':
        return { label: 'Đang Tìm Bác Sĩ...', color: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' };
      case 'accepted':
        return { label: 'Bác Sĩ Đã Tiếp Nhận!', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'en_route':
        return { label: 'Bác Sĩ Đang Đến 🚀', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'arrived':
        return { label: 'Bác Sĩ Đã Có Mặt 📍', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'treating':
        return { label: 'Đang Tiến Hành Cấp Cứu 🩺', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'completed':
        return { label: 'Ca Cấp Cứu Hoàn Tất ✅', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      default:
        return { label: 'Đang Điều Phối', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  return (
    <>
      {/* ── RATING POPUP (auto after completed) ─────────────────────────── */}
      {showRating && showPanel && (
        <div className="fixed inset-0 z-[56] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-amber-200 animate-in zoom-in-95 duration-200">
            {ratingSubmitted ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">🙏</div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Cảm ơn bạn đã đánh giá!</h3>
                <p className="text-sm text-slate-500 mb-5">Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ và hỗ trợ bác sĩ tốt hơn.</p>
                <button
                  onClick={() => { setShowRating(false); setShowPanel(false); setActiveSos(null); setActiveSosId(null); ratingShownRef.current = false; }}
                  className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-lg transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-2xl shadow-lg">⭐</div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Đánh Giá Bác Sĩ Cấp Cứu</h3>
                    <p className="text-xs text-slate-400">Ca #{activeSos?.id} đã hoàn tất • Phòng khám PetCare AI</p>
                  </div>
                </div>

                {activeSos?.doctor && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg">🩺</div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">{activeSos.doctor.name}</p>
                      <p className="text-xs text-blue-600">{activeSos.doctor.specialty || 'Chuyên khoa Cấp cứu'}</p>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-600 mb-2">Mức độ hài lòng của bạn:</p>
                  <StarRatingInput value={ratingValue} onChange={setRatingValue} />
                </div>

                <textarea
                  value={ratingText}
                  onChange={e => setRatingText(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm: Bác sĩ đến nhanh, thao tác chuyên nghiệp... (Tùy chọn)"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-amber-400 outline-none resize-none mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRating(false); setShowPanel(false); setActiveSos(null); setActiveSosId(null); ratingShownRef.current = false; }}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                  >
                    Bỏ Qua
                  </button>
                  <button
                    onClick={() => {
                      if (ratingValue === 0) { showToast('Vui lòng chọn số sao!', 'error'); return; }
                      setRatingSubmitted(true);
                      showToast(`⭐ Đã gửi đánh giá ${ratingValue} sao! Cảm ơn bạn.`, 'success');
                    }}
                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                  >
                    ⭐ Gửi Đánh Giá
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SOS MODAL DIALOG ────────────────────────────────────────────── */}
      {showPanel && (
        <div
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !activeSos) {
              setShowPanel(false);
              setCountdown(0);
            }
          }}
        >
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">

            {/* ── VIEW 1: ACTIVE ONGOING SOS TRACKING ─────────────────────── */}
            {activeSos ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl animate-bounce">🚨</span>
                    <div>
                      <h3 className="text-lg font-black text-red-700 leading-tight">
                        Tín Hiệu SOS Đang Hoạt Động
                      </h3>
                      <span className="text-xs text-slate-400 font-bold">Mã ca: #{activeSos.id}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Real-time Status Badge */}
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center">
                  <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
                    Trạng thái điều phối
                  </div>
                  <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-black border ${getStatusBadge(activeSos.status).color}`}>
                    {getStatusBadge(activeSos.status).label}
                  </div>
                </div>

                {/* Doctor info if accepted */}
                {activeSos.doctor ? (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700">🩺 Bác sĩ phụ trách:</span>
                      <strong className="text-sm text-blue-950">{activeSos.doctor.name}</strong>
                    </div>
                    {activeSos.doctor.specialty && (
                      <p className="text-xs text-blue-700">{activeSos.doctor.specialty}</p>
                    )}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Đường dây nóng:</span>
                      <a
                        href={`tel:${activeSos.doctor.phone}`}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5"
                      >
                        📞 Gọi Ngay: {activeSos.doctor.phone}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <span className="text-lg animate-spin">⏳</span>
                    <span>Đang kết nối đến các bác sĩ thú y trực tuyến trong bán kính 15km...</span>
                  </div>
                )}

                {/* AI First-Aid Steps */}
                {activeSos.ai_first_aid && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200">
                    <h5 className="text-xs font-black text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      🤖 Hướng Dẫn Sơ Cứu Khẩn Cấp Tức Thì (AI First-Aid):
                    </h5>
                    <p className="text-xs text-rose-950 whitespace-pre-line leading-relaxed font-medium">
                      {activeSos.ai_first_aid}
                    </p>
                  </div>
                )}

                {/* Report info if completed */}
                {activeSos.report && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
                    <h5 className="text-xs font-black text-emerald-800 uppercase">📋 Bệnh Án Của Bác Sĩ:</h5>
                    <p className="text-xs"><strong>Chẩn đoán:</strong> {activeSos.report.diagnosis}</p>
                    <p className="text-xs"><strong>Xử trí:</strong> {activeSos.report.treatment_summary}</p>
                    {activeSos.report.follow_up_advice && (
                      <p className="text-xs"><strong>Lời khuyên:</strong> {activeSos.report.follow_up_advice}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setShowPanel(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Thu Nhỏ Màn Hình
                  </button>
                  {activeSos.status !== 'completed' && (
                    <button
                      onClick={handleCancelActiveSos}
                      disabled={canceling}
                      className="flex-1 py-3 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold cursor-pointer transition-all"
                    >
                      {canceling ? 'Đang hủy...' : '✕ Hủy Yêu Cầu SOS'}
                    </button>
                  )}
                </div>
              </div>
            ) : countdown > 0 ? (
              /* ── VIEW 2: 5-SECOND COUNTDOWN ────────────────────────────── */
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-red-50 border-4 border-red-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-100 animate-pulse">
                  <span className="text-5xl font-black text-red-600">{countdown}</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-800 mb-1">
                  Đang phát tín hiệu SOS sau {countdown} giây...
                </h4>
                <p className="text-xs text-slate-500 mb-6">
                  Vị trí GPS và phác đồ sơ cứu đang được chuẩn bị.
                </p>
                <button
                  onClick={handleCancelCountdown}
                  className="px-6 py-2.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold transition-all cursor-pointer"
                >
                  ✕ Hủy Gửi SOS
                </button>
              </div>
            ) : (
              /* ── VIEW 3: SOS FORM CONFIGURATION ─────────────────────────── */
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-2xl shadow-lg shadow-red-200 animate-pulse flex-shrink-0">
                    🚨
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-red-700 leading-tight">
                      Cấp Cứu Thú Cưng Khẩn Cấp 24/24
                    </h3>
                    <p className="text-xs text-slate-500">
                      Điều phối bác sĩ thú y gần nhất & nhận hướng dẫn sơ cứu AI tức thì
                    </p>
                  </div>
                </div>

                {/* GPS Location Status */}
                <div className={`mb-4 p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                  location ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <span className="text-base">{location ? '📍' : '⚠️'}</span>
                  <span>
                    {location
                      ? `GPS Hiện Tại: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (Hà Nội)`
                      : 'Đang xác định GPS... (Dùng tọa độ trung tâm)'}
                  </span>
                </div>

                {/* Pet Name Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Bé thú cưng gặp sự cố</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPetName('Cún Lu'); setPetBreed('Golden Retriever'); }}
                      className={`p-2.5 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer text-left ${
                        petName === 'Cún Lu' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      🐶 Cún Lu <span className="block text-[10px] font-normal text-slate-400">Golden Retriever</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPetName('Mèo Bơ'); setPetBreed('Munchkin'); }}
                      className={`p-2.5 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer text-left ${
                        petName === 'Mèo Bơ' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      🐱 Mèo Bơ <span className="block text-[10px] font-normal text-slate-400">Munchkin</span>
                    </button>
                  </div>
                </div>

                {/* Symptom Tags Quick Select */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chọn nhanh triệu chứng khẩn cấp (Chọn nhiều mục):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COMMON_SYMPTOMS.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-red-500 text-white border-red-600 shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Urgency Level */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mức độ khẩn cấp</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'critical', label: '🚨 Cực Khẩn Cấp', color: 'border-red-500 bg-red-50 text-red-700' },
                      { val: 'high',     label: '⚠️ Nghiêm Trọng',  color: 'border-orange-500 bg-orange-50 text-orange-700' },
                    ].map(u => (
                      <button
                        key={u.val}
                        type="button"
                        onClick={() => setUrgency(u.val)}
                        className={`py-2 px-3 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                          urgency === u.val ? u.color + ' shadow-sm' : 'border-slate-200 text-slate-600 bg-white'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description input */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả tình trạng hiện tại (Tùy chọn)
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="VD: Cún vừa nuốt dị vật, ho sặc sụa và ngạt thở..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-red-400 outline-none resize-none"
                  />
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowPanel(false); setCountdown(0); }}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleStartCountdown}
                    disabled={isSending}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black shadow-lg shadow-red-200 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSending ? <><span className="animate-spin">⏳</span> Đang gửi...</> : <>🚨 Gửi Tín Hiệu SOS</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FLOATING SOS TRIGGER BUTTON (Owner only) ─────────────────────── */}
      <div className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-50">
        <div className="relative">
          {/* Animated ping waves */}
          {!showPanel && (
            <>
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25 scale-125" />
              <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-15 scale-150 animation-delay-300" />
            </>
          )}
          <button
            id="btn-floating-sos"
            onClick={() => setShowPanel(p => !p)}
            className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer active:scale-95 select-none ${
              showPanel || activeSos
                ? 'bg-slate-800 text-white shadow-slate-400'
                : 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-300 hover:from-red-600 hover:to-rose-700 hover:scale-105'
            }`}
          >
            <span className="text-2xl sm:text-3xl leading-none">{showPanel ? '✕' : '🆘'}</span>
            <span className="text-[9px] sm:text-[10px] font-black tracking-wider uppercase leading-none mt-1">
              {showPanel ? 'Đóng' : (activeSos ? 'Đang SOS' : 'SOS 24/24')}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
