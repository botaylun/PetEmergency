import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Avatar from './Avatar';
import { formatTimeAgo, formatFullDateTime } from '../utils/formatters';

const REASON_LABELS = {
  spam: '🚫 Spam / Quảng cáo',
  inappropriate: '🔞 Nội dung không phù hợp',
  misinformation: '⚠️ Sai lệch thông tin y khoa',
  harassment: '😡 Quấy rối / Xúc phạm',
  off_topic: '📌 Lạc đề',
  other: '📝 Lý do khác',
};

const STATUS_BADGES = {
  pending:  { label: '⏳ Chờ Duyệt', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  verified: { label: '✅ Đã Xác Minh', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { label: '❌ Bị Từ Chối', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export default function AdminPanel({ currentUser, showToast }) {
  const [activeTab, setActiveTab]         = useState('doctors');
  const [reports, setReports]             = useState([]);
  const [posts, setPosts]                 = useState([]);
  const [doctors, setDoctors]             = useState([]);
  const [pendingClinics, setPendingClinics] = useState([]);
  const [loadingR, setLoadingR]           = useState(false);
  const [loadingP, setLoadingP]           = useState(false);
  const [loadingD, setLoadingD]           = useState(false);
  const [loadingC, setLoadingC]           = useState(false);
  const [clinicAction, setClinicAction]   = useState(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [rejectTarget, setRejectTarget]   = useState(null);
  const [searchQ, setSearchQ]             = useState('');
  const [doctorFilter, setDoctorFilter]   = useState('all'); // all, pending, verified, rejected
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    loadReports();
    loadPosts();
    loadDoctors();
    loadPendingClinics();
  }, []);

  const loadReports = async () => {
    setLoadingR(true);
    try {
      const res = await axios.get('/api/v1/forum/admin/reports', {
        headers: { 'X-User-Id': currentUser?.id || 10 },
      });
      setReports(res.data?.data?.data || []);
    } catch (e) {
      // Fallback
    } finally {
      setLoadingR(false);
    }
  };

  const loadPosts = async () => {
    setLoadingP(true);
    try {
      const res = await axios.get('/api/v1/forum/posts?per_page=50');
      setPosts(res.data?.data?.data || []);
    } catch (e) {
      // Fallback
    } finally {
      setLoadingP(false);
    }
  };

  const loadDoctors = async () => {
    setLoadingD(true);
    try {
      const res = await axios.get('/api/v1/admin/doctors', {
        headers: { 'X-User-Id': currentUser?.id || 10 },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDoctors(res.data.data);
      }
    } catch (e) {
      // Fallback demo doctors
      setDoctors([
        {
          id: 9,
          name: 'BS. Lý Văn Đức',
          email: 'dr.duc@example.com',
          phone: '0906789012',
          role: 'doctor',
          verification_status: 'pending',
          specialty: 'Phẫu thuật ngoại khoa',
          clinic_name: 'Bệnh viện Thú y Quốc tế Đức',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingD(false);
    }
  };

  const handleReviewReport = async (reportId, action) => {
    try {
      await axios.post(
        `/api/v1/forum/admin/reports/${reportId}/review`,
        { action },
        { headers: { 'X-User-Id': currentUser?.id || 10 } }
      );
      showToast(
        action === 'delete_post' ? '✅ Đã xóa bài viết và giải quyết báo cáo.' : '✅ Đã bỏ qua báo cáo.',
        'success'
      );
      loadReports();
      if (action === 'delete_post') loadPosts();
    } catch (e) {
      showToast('Lỗi xử lý báo cáo.', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi hệ thống?')) return;
    try {
      await axios.delete(`/api/v1/forum/posts/${postId}`, {
        headers: { 'X-User-Id': currentUser?.id || 10 },
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('✅ Đã xóa bài viết thành công.', 'success');
    } catch (e) {
      showToast('Lỗi khi xóa bài viết.', 'error');
    }
  };

  const handleVerifyDoctor = async (doctorId, status) => {
    setActionInProgress(doctorId);
    try {
      const res = await axios.post(
        `/api/v1/admin/doctors/${doctorId}/verify`,
        { status },
        { headers: { 'X-User-Id': currentUser?.id || 10 } }
      );
      if (res.data?.success) {
        setDoctors(prev =>
          prev.map(d => d.id === doctorId ? { ...d, verification_status: status } : d)
        );
        showToast(res.data.message, 'success');
      }
    } catch (e) {
      // Demo fallback update
      setDoctors(prev =>
        prev.map(d => d.id === doctorId ? { ...d, verification_status: status } : d)
      );
      showToast(status === 'verified' ? '✅ Đã phê duyệt bác sĩ!' : '❌ Đã từ chối bác sĩ!', 'info');
    } finally {
      setActionInProgress(null);
    }
  };

  const loadPendingClinics = async () => {
    setLoadingC(true);
    try {
      const res = await axios.get('/api/v1/admin/clinics?status=pending_review', {
        headers: { 'X-User-Id': currentUser?.id },
        withCredentials: true,
      });
      setPendingClinics(res.data?.data?.data || []);
    } catch { /* ignore */ } finally { setLoadingC(false); }
  };

  const handleApproveClinic = async (clinicId) => {
    setClinicAction(clinicId);
    try {
      const res = await axios.post(`/api/v1/admin/clinics/${clinicId}/approve`, {}, {
        headers: { 'X-User-Id': currentUser?.id },
        withCredentials: true,
      });
      showToast(res.data?.message || '✅ Đã duyệt phòng khám!', 'success');
      loadPendingClinics();
    } catch { showToast('Lỗi duyệt phòng khám.', 'error'); }
    finally { setClinicAction(null); }
  };

  const handleRejectClinic = async (clinicId) => {
    if (!rejectReason.trim()) { showToast('Vui lòng nhập lý do từ chối.', 'error'); return; }
    setClinicAction(clinicId);
    try {
      const res = await axios.post(`/api/v1/admin/clinics/${clinicId}/reject`, { reason: rejectReason }, {
        headers: { 'X-User-Id': currentUser?.id },
        withCredentials: true,
      });
      showToast(res.data?.message || '❌ Đã từ chối phòng khám!', 'success');
      setRejectTarget(null); setRejectReason('');
      loadPendingClinics();
    } catch { showToast('Lỗi từ chối phòng khám.', 'error'); }
    finally { setClinicAction(null); }
  };

  const pendingDoctorsCount = doctors.filter(d => d.verification_status === 'pending').length;

  const filteredDoctors = doctors.filter(doc => {
    const matchFilter = doctorFilter === 'all' || doc.verification_status === doctorFilter;
    const q = searchQ.trim().toLowerCase();
    const matchSearch = !q ||
      (doc.name && doc.name.toLowerCase().includes(q)) ||
      (doc.email && doc.email.toLowerCase().includes(q)) ||
      (doc.clinic_name && doc.clinic_name.toLowerCase().includes(q)) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  const filteredPosts = posts.filter(post => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return true;
    return (post.content && post.content.toLowerCase().includes(q)) ||
           (post.user?.name && post.user.name.toLowerCase().includes(q));
  });

  const TABS = [
    { id: 'doctors',  label: '🩺 Duyệt Bác Sĩ',    badge: pendingDoctorsCount },
    { id: 'clinics',  label: '🏥 Duyệt Phòng Khám', badge: pendingClinics.length },
    { id: 'reports',  label: '🚩 Báo Cáo',          badge: reports.length },
    { id: 'posts',    label: '📝 Quản Lý Bài',       badge: posts.length },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl backdrop-blur-sm shadow-inner">
              🛡️
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Cổng Quản Trị Hệ Thống (Admin Panel)</h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Kiểm duyệt hồ sơ bác sĩ thú y · Xử lý báo cáo vi phạm · Giám sát diễn đàn
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <div className="text-center px-3.5 py-2 bg-white/10 rounded-2xl">
              <div className="text-xl font-black text-amber-400">{pendingDoctorsCount}</div>
              <div className="text-[10px] text-slate-300 font-bold uppercase">Bác sĩ chờ duyệt</div>
            </div>
            <div className="text-center px-3.5 py-2 bg-white/10 rounded-2xl">
              <div className="text-xl font-black text-rose-400">{reports.length}</div>
              <div className="text-[10px] text-slate-300 font-bold uppercase">Báo cáo chờ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQ(''); }}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === tab.id ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: DOCTORS VERIFICATION ────────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          {/* Controls: Search & Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="🔍 Tìm bác sĩ theo tên, email, phòng khám, chuyên khoa..."
                className="w-full pl-4 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-slate-400 outline-none shadow-sm"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-shrink-0">
              {[
                { id: 'all',      label: 'Tất cả' },
                { id: 'pending',  label: 'Chờ duyệt' },
                { id: 'verified', label: 'Đã duyệt' },
                { id: 'rejected', label: 'Từ chối' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDoctorFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    doctorFilter === f.id ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loadingD ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="animate-spin text-4xl mb-3">⏳</div>
              <p className="text-sm text-slate-400">Đang tải danh sách bác sĩ thú y...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="text-5xl mb-3">👨‍⚕️</div>
              <h3 className="font-extrabold text-slate-800">Không tìm thấy bác sĩ nào!</h3>
              <p className="text-xs text-slate-400 mt-1">Không có kết quả khớp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredDoctors.map(doctor => {
                const badgeInfo = STATUS_BADGES[doctor.verification_status] || STATUS_BADGES.pending;
                const isPending = doctor.verification_status === 'pending';

                return (
                  <div
                    key={doctor.id}
                    className={`bg-white rounded-3xl border-2 p-5 shadow-sm transition-all ${
                      isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Doctor info */}
                      <div className="flex items-start gap-4">
                        <Avatar
                          src={doctor.avatar_url}
                          name={doctor.name}
                          size="w-14 h-14 text-base"
                          isDoctor={true}
                          verified={doctor.doctor_verified}
                          className="rounded-2xl border-2 border-slate-100 flex-shrink-0 shadow-sm"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-black text-slate-900 leading-tight">
                              {doctor.name}
                            </h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeInfo.badge}`}>
                              {badgeInfo.label}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ID: #{doctor.id}
                            </span>
                          </div>

                          <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                            <p>📧 {doctor.email} {doctor.phone ? `• 📞 ${doctor.phone}` : ''}</p>
                            <p>
                              🏥 Phòng khám: <strong>{doctor.clinic_name || 'Phòng khám PetCare'}</strong>
                              {doctor.specialty ? ` • Chuyên khoa: ${doctor.specialty}` : ''}
                            </p>
                            {doctor.latitude && doctor.longitude && (
                              <p className="text-[11px] text-slate-400 font-mono">
                                📍 Tọa độ GPS: {parseFloat(doctor.latitude).toFixed(4)}, {parseFloat(doctor.longitude).toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doctor.verification_status !== 'verified' && (
                          <button
                            onClick={() => handleVerifyDoctor(doctor.id, 'verified')}
                            disabled={actionInProgress === doctor.id}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black shadow-sm shadow-emerald-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            ✅ Phê Duyệt
                          </button>
                        )}

                        {doctor.verification_status !== 'rejected' && (
                          <button
                            onClick={() => handleVerifyDoctor(doctor.id, 'rejected')}
                            disabled={actionInProgress === doctor.id}
                            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-xs font-black shadow-sm shadow-rose-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            ❌ Từ Chối
                          </button>
                        )}

                        {doctor.verification_status !== 'pending' && (
                          <button
                            onClick={() => handleVerifyDoctor(doctor.id, 'pending')}
                            disabled={actionInProgress === doctor.id}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                          >
                            🔄 Reset Chờ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CLINICS ──────────────────────────────────────────────────── */}
      {activeTab === 'clinics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              Phòng Khám Chờ Kiểm Duyệt ({pendingClinics.length})
            </h3>
            <button
              onClick={loadPendingClinics}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              🔄 Tải lại
            </button>
          </div>

          {loadingC ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="animate-spin text-4xl mb-3">⏳</div>
              <p className="text-sm text-slate-400">Đang tải danh sách phòng khám chờ duyệt...</p>
            </div>
          ) : pendingClinics.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="text-5xl mb-3">🏥</div>
              <h3 className="font-bold text-slate-800">Không có phòng khám nào đang chờ duyệt</h3>
              <p className="text-xs text-slate-400 mt-1">Tất cả phòng khám gửi lên đã được xử lý hoặc chưa có yêu cầu mới.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingClinics.map((clinic) => (
                <div key={clinic.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-2xl">🏥</span>
                        <h4 className="text-lg font-black text-slate-900">{clinic.name}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Chờ duyệt
                        </span>
                        {clinic.is_24_7 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🚨 Trực 24/7
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div>📍 <strong>Địa chỉ:</strong> {clinic.address || 'Chưa cập nhật'}</div>
                        <div>📞 <strong>Hotline:</strong> {clinic.phone || 'Chưa cập nhật'}</div>
                        <div>🕒 <strong>Giờ làm việc:</strong> {clinic.opening_hours || (clinic.is_24_7 ? '24/7' : 'Giờ hành chính')}</div>
                        <div>🧭 <strong>Tọa độ:</strong> {clinic.latitude?.toFixed?.(5) || clinic.latitude}, {clinic.longitude?.toFixed?.(5) || clinic.longitude}</div>
                      </div>

                      {clinic.description && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {clinic.description}
                        </p>
                      )}

                      {clinic.services && Array.isArray(clinic.services) && clinic.services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {clinic.services.map((svc, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-lg border border-indigo-100">
                              {svc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2 min-w-[140px] justify-end">
                      <button
                        onClick={() => handleApproveClinic(clinic.id)}
                        disabled={clinicAction === clinic.id}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black shadow-sm shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {clinicAction === clinic.id ? '⏳ Đang xử lý...' : '✅ Phê Duyệt'}
                      </button>

                      <button
                        onClick={() => setRejectTarget(clinic.id)}
                        disabled={clinicAction === clinic.id}
                        className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-xs font-black shadow-sm shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        ❌ Từ Chối
                      </button>
                    </div>
                  </div>

                  {rejectTarget === clinic.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 bg-rose-50/50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-rose-800 mb-1.5">Lý do từ chối phòng khám này:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Nhập lý do (ví dụ: Thiếu giấy phép hành nghề, tọa độ sai...)"
                          className="flex-1 px-3 py-2 text-xs bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
                        />
                        <button
                          onClick={() => handleRejectClinic(clinic.id)}
                          disabled={clinicAction === clinic.id}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer"
                        >
                          Xác nhận từ chối
                        </button>
                        <button
                          onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {loadingR ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="animate-spin text-4xl mb-3">⏳</div>
              <p className="text-sm text-slate-400">Đang tải báo cáo vi phạm...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="font-bold text-slate-800">Không có báo cáo nào đang chờ xử lý!</h3>
              <p className="text-xs text-slate-400 mt-1">Diễn đàn cộng đồng hoạt động an toàn và tích cực.</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🚩
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border bg-rose-50 text-rose-700 border-rose-200">
                        {REASON_LABELS[report.reason] || report.reason}
                      </span>
                      <span className="text-xs text-slate-400">
                        Báo cáo bởi: <strong>{report.reporter?.name || 'Thành viên'}</strong>
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-400">{formatTimeAgo(report.created_at)}</span>
                    </div>

                    {report.post && (
                      <div className="bg-slate-50 rounded-2xl p-4 mb-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Nội dung bị báo cáo:</span>
                          <span className="text-[11px] font-bold text-slate-700">Tác giả: {report.post.user?.name}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 line-clamp-3 leading-relaxed">
                          {report.post.content}
                        </p>
                      </div>
                    )}

                    {report.description && (
                      <p className="text-xs text-slate-600 italic mb-3">
                        Ghi chú từ người báo cáo: "{report.description}"
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewReport(report.id, 'delete_post')}
                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-red-200"
                      >
                        🗑️ Xóa Bài Viết Vi Phạm
                      </button>
                      <button
                        onClick={() => handleReviewReport(report.id, 'dismiss')}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        ✓ Giữ Lại & Bỏ Qua
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: POSTS ────────────────────────────────────────────────────── */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="🔍 Tìm bài viết theo nội dung hoặc tên tác giả..."
              className="w-full pl-4 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-slate-400 outline-none shadow-sm"
            />
          </div>

          {loadingP ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="animate-spin text-4xl mb-3">⏳</div>
              <p className="text-sm text-slate-400">Đang tải danh sách bài viết...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="text-5xl mb-3">📝</div>
              <h3 className="font-bold text-slate-800">Không có bài viết nào</h3>
              <p className="text-xs text-slate-400 mt-1">Chưa có bài viết nào hoặc không có kết quả tìm kiếm.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post, idx) => (
                <div key={post.id ?? idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-rose-200 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <Avatar
                      src={post.user?.avatar_url}
                      name={post.user?.name}
                      size="w-10 h-10 text-xs"
                      isDoctor={post.user?.role === 'doctor'}
                      verified={post.user?.doctor_verified}
                      className="flex-shrink-0 border-2 border-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{post.user?.name}</span>
                        {post.user?.role === 'doctor' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                            🩺 Bác sĩ
                          </span>
                        )}
                        {post.is_flagged && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold">
                            🚩 Đã bị báo cáo
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          {formatTimeAgo(post.created_at)}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 mb-2 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          ❤️ {post.likes_count || 0} lượt thích • 💬 {post.comments_count || 0} bình luận
                        </span>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer transition-colors"
                        >
                          🗑️ Xóa Bài
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
