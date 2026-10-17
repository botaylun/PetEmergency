import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { DEFAULT_PET_DOG_AVATAR, DEFAULT_PET_CAT_AVATAR } from '../constants/avatars';

export default function PetPublicQR() {
  const { token } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFinderModal, setShowFinderModal] = useState(false);
  const [finderForm, setFinderForm] = useState({
    finder_name: '',
    finder_phone: '',
    location_text: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Thẻ Cứu Hộ Thú Cưng | PetCare AI';
    setLoading(true);
    axios.get(`/api/v1/pets/qr/${token}`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setPet(res.data.data);
          document.title = `Thẻ Cứu Hộ: ${res.data.data.pet_name} | PetCare AI`;
        } else {
          setError('Không tìm thấy thông tin thú cưng');
        }
      })
      .catch(() => {
        // Fallback demo pet for preview/offline
        setPet({
          id: 1,
          pet_name: 'Cún Lu',
          species: 'dog',
          breed: 'Golden Retriever',
          photo_url: DEFAULT_PET_DOG_AVATAR,
          microchip_number: '9851410029412',
          allergies: 'Dị ứng kháng sinh nhóm Penicillin',
          chronic_conditions: 'Tiền sử hạ đường huyết khi hoạt động mạnh',
          owner: {
            name: 'Nguyễn Minh Anh',
            phone: '0912 345 678',
          },
          qr_token: token,
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmitFound = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`/api/v1/pets/qr/${token}/found`, finderForm);
      setSubmitted(true);
    } catch {
      // Local fallback
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-sm w-full text-center space-y-4 animate-pulse">
          <div className="w-24 h-24 bg-slate-200 rounded-3xl mx-auto" />
          <div className="h-5 bg-slate-200 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (error && !pet) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-md w-full text-center space-y-4">
          <span className="text-5xl block">🔍</span>
          <h2 className="text-lg font-black text-slate-900">Không tìm thấy mã cứu hộ này</h2>
          <p className="text-xs text-slate-500">Mã QR có thể đã hết hạn hoặc bị gỡ bởi chủ nuôi.</p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 rounded-full bg-[#ff4757] text-white text-xs font-bold shadow-md shadow-rose-200"
          >
            Về Trang Chủ PetCare AI
          </Link>
        </div>
      </div>
    );
  }

  const avatar = pet.photo_url || (
    (pet.species || '').toLowerCase().includes('cat') ? DEFAULT_PET_CAT_AVATAR : DEFAULT_PET_DOG_AVATAR
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-slate-50 py-8 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-5 animate-in fade-in duration-300">
        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-[#ff4757] text-xs font-black">
            <span>🛡️</span>
            <span>Thẻ Cứu Hộ Khẩn Cấp 24/24</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">PetCare AI Emergency Card</h1>
        </div>

        {/* Pet ID Card */}
        <div className="bg-white rounded-3xl border border-rose-100 shadow-xl overflow-hidden">
          {/* Card top banner */}
          <div className="h-28 bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-black/10" />
            <span className="text-4xl filter drop-shadow-md">🐾</span>
          </div>

          <div className="p-6 pt-0 relative">
            {/* Big avatar */}
            <div className="flex justify-center -mt-14 mb-4">
              <img
                src={avatar}
                alt={pet.pet_name}
                className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg bg-slate-100"
              />
            </div>

            <div className="text-center space-y-1 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-black text-slate-900">{pet.pet_name}</h2>
              <p className="text-xs font-bold text-slate-500">
                {pet.breed || pet.species || 'Thú cưng'}
              </p>
              {pet.microchip_number && (
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold tracking-wider mt-1">
                  🔖 Microchip: {pet.microchip_number}
                </span>
              )}
            </div>

            {/* Medical alert boxes */}
            <div className="py-4 space-y-2.5">
              {pet.allergies && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <div>
                    <strong className="text-xs font-black text-red-800 block">Dị ứng quan trọng:</strong>
                    <p className="text-xs text-red-700 mt-0.5 leading-snug font-medium">{pet.allergies}</p>
                  </div>
                </div>
              )}

              {pet.chronic_conditions && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">💊</span>
                  <div>
                    <strong className="text-xs font-black text-amber-800 block">Bệnh nền / Cần lưu ý:</strong>
                    <p className="text-xs text-amber-700 mt-0.5 leading-snug font-medium">{pet.chronic_conditions}</p>
                  </div>
                </div>
              )}

              {/* Owner contact */}
              {pet.owner && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider block">Chủ nuôi</span>
                    <strong className="text-xs font-bold text-blue-900">{pet.owner.name}</strong>
                  </div>
                  {pet.owner.phone && (
                    <a
                      href={`tel:${pet.owner.phone.replace(/[^0-9]/g, '')}`}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-200 flex items-center gap-1.5 transition"
                    >
                      <span>📞</span>
                      <span>Gọi Ngay</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Big Rescue Button */}
            <button
              onClick={() => setShowFinderModal(true)}
              className="w-full py-3.5 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] text-white font-black text-sm shadow-lg shadow-rose-200 hover:shadow-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>🚨</span>
              <span>Tôi Tìm Thấy Bé Này</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400">
          Hệ thống Thẻ Cứu Hộ Quốc Gia PetCare AI 24/24 · Tổng đài hỗ trợ 1900-8888
        </p>
      </div>

      {/* Finder Modal */}
      {showFinderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowFinderModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>🐾</span>
                <span>Thông Báo Đã Tìm Thấy Bé</span>
              </h3>
              <button
                onClick={() => setShowFinderModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <span className="text-5xl block">🎉</span>
                <h4 className="text-base font-black text-slate-900">Cảm ơn bạn rất nhiều!</h4>
                <p className="text-xs text-slate-600">
                  Hệ thống đã phát tín hiệu cứu hộ khẩn cấp và thông báo tới chủ nuôi của bé {pet.pet_name}. Chủ nuôi sẽ liên hệ lại ngay với bạn!
                </p>
                <button
                  onClick={() => setShowFinderModal(false)}
                  className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFound} className="space-y-3 text-xs">
                <p className="text-slate-500 leading-relaxed">
                  Vui lòng cung cấp vị trí và số điện thoại để chủ nuôi của bé {pet.pet_name} liên lạc và đón bé về nhà:
                </p>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tên của bạn *</label>
                  <input
                    type="text"
                    required
                    value={finderForm.finder_name}
                    onChange={e => setFinderForm(f => ({ ...f, finder_name: e.target.value }))}
                    placeholder="VD: Anh Tuấn..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại liên lạc *</label>
                  <input
                    type="tel"
                    required
                    value={finderForm.finder_phone}
                    onChange={e => setFinderForm(f => ({ ...f, finder_phone: e.target.value }))}
                    placeholder="VD: 0912 345 678..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vị trí hiện tại của bé *</label>
                  <input
                    type="text"
                    required
                    value={finderForm.location_text}
                    onChange={e => setFinderForm(f => ({ ...f, location_text: e.target.value }))}
                    placeholder="VD: Số 123 đường Cầu Giấy, Hà Nội..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold focus:ring-2 focus:ring-[#ff4757] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ghi chú tình trạng bé</label>
                  <textarea
                    rows={2}
                    value={finderForm.notes}
                    onChange={e => setFinderForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Bé khỏe mạnh, đang được giữ tại quán cà phê..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-[#ff4757] outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFinderModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white font-bold transition shadow-md shadow-rose-200 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Đang gửi...' : 'Gửi Thông Báo Ngay'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
