import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from './Avatar';
import ImageCropModal from './ImageCropModal';
import DoctorReviewsTab from './DoctorReviewsTab';
import AvatarUpload from './AvatarUpload';
import DoctorClinicManager from './DoctorClinicManager';
import ReportModal from './ReportModal';
import {
  DEFAULT_MALE_AVATAR,
  DEFAULT_FEMALE_AVATAR,
  DEFAULT_PET_DOG_AVATAR,
  DEFAULT_PET_CAT_AVATAR,
} from '../constants/avatars';
import { formatTimeAgo } from '../utils/formatters';

export default function UserProfile({
  currentUser,
  petsList = [],
  onUpdateUser,
  onUpdatePets,
  showToast,
  onRequireAuth,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Kiểm tra xem đang xem hồ sơ của chính mình hay của người khác
  const isOwnProfile = !id || (currentUser && String(currentUser.id) === String(id));
  const effectiveUserId = isOwnProfile ? currentUser?.id : id;

  const [userData, setUserData] = useState(isOwnProfile ? currentUser : null);
  const [loading, setLoading] = useState(!isOwnProfile);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'posts', 'reviews', 'clinics', 'pets'

  // State chỉnh sửa (cho hồ sơ của chính mình)
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [gender, setGender] = useState(currentUser?.gender || 'male');
  const [role, setRole] = useState(currentUser?.role || 'user');
  const [specialty, setSpecialty] = useState(currentUser?.specialty || '');
  const [clinicName, setClinicName] = useState(currentUser?.clinicName || currentUser?.clinic_name || '');
  const [clinicId, setClinicId] = useState(currentUser?.clinic_id || '');
  const [clinicsList, setClinicsList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // State cắt & tải ảnh (Avatar & Cover)
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropMode, setCropMode] = useState('circular'); // 'circular' | 'cover'
  const [selectedCropFile, setSelectedCropFile] = useState(null);

  // Tải danh sách phòng khám để bác sĩ lựa chọn
  useEffect(() => {
    if (role === 'doctor' || userData?.role === 'doctor') {
      const headers = currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {};
      axios.get('/api/v1/doctor/clinics', { headers }).then(res => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setClinicsList(res.data.data);
        } else {
          axios.get('/api/v1/clinics').then(r => {
            if (r.data?.success && Array.isArray(r.data.data)) {
              setClinicsList(r.data.data);
            }
          }).catch(() => {});
        }
      }).catch(() => {
        axios.get('/api/v1/clinics').then(r => {
          if (r.data?.success && Array.isArray(r.data.data)) {
            setClinicsList(r.data.data);
          }
        }).catch(() => {});
      });
    }
  }, [role, userData?.role, currentUser]);

  // Tải dữ liệu hồ sơ
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setUserData(currentUser);
      setName(currentUser.name || '');
      setBio(currentUser.bio || '');
      setGender(currentUser.gender || 'male');
      setRole(currentUser.role || 'user');
      setSpecialty(currentUser.specialty || '');
      setClinicName(currentUser.clinicName || currentUser.clinic_name || '');
      setClinicId(currentUser.clinic_id || '');
      document.title = `${currentUser.name} | Hồ sơ cá nhân | PetCare AI`;
      setLoading(false);
      setNotFound(false);
      return;
    }

    if (id) {
      setLoading(true);
      setNotFound(false);
      axios.get(`/api/v1/users/${id}`)
        .then(res => {
          if (res.data?.success && res.data?.data) {
            setUserData(res.data.data);
            document.title = `${res.data.data.name} | PetCare AI`;
          } else {
            setNotFound(true);
          }
        })
        .catch(err => {
          console.warn('Profile fetch error:', err);
          setNotFound(true);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isOwnProfile, currentUser]);

  const p = userData || {};
  const isDoctor = p.role === 'doctor';
  const displayName = p.name || 'Người dùng PetCare';
  const avatarUrl = p.avatar_url || p.avatar;

  // Xử lý chọn file ảnh
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Kích thước ảnh đại diện tối đa 5MB.', 'error');
      return;
    }
    setSelectedCropFile(file);
    setCropMode('circular');
    setCropModalOpen(true);
    e.target.value = '';
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Kích thước ảnh bìa tối đa 5MB.', 'error');
      return;
    }
    setSelectedCropFile(file);
    setCropMode('cover');
    setCropModalOpen(true);
    e.target.value = '';
  };

  // Lưu ảnh đã cắt lên máy chủ
  const handleCropSave = async (blob) => {
    const formData = new FormData();
    const isAv = cropMode === 'circular';
    const field = isAv ? 'avatar' : 'cover';
    formData.append(field, blob, `${field}.webp`);

    const endpoint = isAv ? '/api/v1/me/avatar' : '/api/v1/me/cover';
    try {
      const res = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User-Id': String(currentUser.id),
        },
      });

      if (res.data?.success) {
        showToast?.(res.data.message, 'success');
        const updatedUser = res.data.user || {
          ...currentUser,
          ...(isAv ? { avatar_url: res.data.avatar_url, avatar: res.data.avatar_url } : { cover_url: res.data.cover_url }),
        };
        setUserData(updatedUser);
        onUpdateUser?.(updatedUser);
        setCropModalOpen(false);
      } else {
        showToast?.(res.data?.message || 'Lỗi tải ảnh lên.', 'error');
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Lỗi tải ảnh lên.', 'error');
    }
  };

  // Khôi phục ảnh bìa mặc định
  const handleDeleteCover = async () => {
    if (!window.confirm('Khôi phục ảnh bìa về dạng màu mặc định?')) return;
    try {
      const res = await axios.delete('/api/v1/me/cover', {
        headers: { 'X-User-Id': String(currentUser.id) },
      });
      if (res.data?.success) {
        showToast?.('Đã khôi phục ảnh bìa mặc định!', 'info');
        const updated = { ...currentUser, cover_url: null };
        setUserData(updated);
        onUpdateUser?.(updated);
      }
    } catch (_) {
      showToast?.('Lỗi khi xóa ảnh bìa.', 'error');
    }
  };

  // Xử lý lưu chỉnh sửa hồ sơ
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name,
        bio,
        gender,
        role,
        specialty: role === 'doctor' ? specialty : null,
        clinic_name: role === 'doctor' ? clinicName : null,
        clinic_id: role === 'doctor' && clinicId ? parseInt(clinicId) : null,
      };

      const res = await axios.put('/api/v1/auth/profile', payload, {
        headers: currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {},
      });

      if (res.data?.success) {
        const updated = {
          ...currentUser,
          ...payload,
          clinicName: clinicName,
        };
        onUpdateUser?.(updated);
        setUserData(updated);
        setIsEditing(false);
        showToast?.('Đã cập nhật hồ sơ thành công!', 'success');
      } else {
        showToast?.(res.data?.message || 'Lỗi cập nhật hồ sơ.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể lưu thông tin hồ sơ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFollowToggle = () => {
    if (!currentUser) {
      onRequireAuth?.('Vui lòng đăng nhập để theo dõi thành viên!');
      return;
    }
    setIsFollowing(prev => !prev);
    showToast?.(isFollowing ? `Đã bỏ theo dõi ${displayName}` : `Đã theo dõi ${displayName}!`, 'info');
  };

  // Skeleton Loading State
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-48 sm:h-64 bg-slate-200 rounded-3xl" />
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 bg-slate-200 rounded-3xl -mt-16 border-4 border-white" />
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-16 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // 404 Not Found State
  if (notFound) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4 animate-in fade-in duration-300">
        <span className="text-6xl block">😿</span>
        <h2 className="text-xl font-extrabold text-slate-900">Không tìm thấy người dùng</h2>
        <p className="text-xs text-slate-500">
          Tài khoản này có thể đã bị vô hiệu hóa, không tồn tại hoặc đường dẫn không chính xác.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-[#ff4757] hover:bg-[#ff6b81] text-white font-bold text-xs rounded-full transition cursor-pointer"
        >
          Trở về Bảng tin
        </button>
      </div>
    );
  }

  // Private Profile State
  if (p.is_private && !isOwnProfile) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm space-y-4">
        <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-4xl">
          🔒
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">{displayName}</h2>
        <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
          Hồ sơ riêng tư
        </span>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Người dùng này đã cài đặt chế độ bảo mật riêng tư. Thông tin bài viết và thú cưng hiện không được công khai.
        </p>
      </div>
    );
  }

  // Phân bố sao đánh giá
  const starDist = p.star_distribution || { 5: 18, 4: 4, 3: 1, 2: 0, 1: 0 };
  const totalReviews = Object.values(starDist).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          postId={null}
          postAuthor={displayName}
          onClose={() => setShowReportModal(false)}
          showToast={showToast}
        />
      )}

      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Cover image or gradient */}
        <div
          className="h-44 sm:h-56 relative overflow-hidden bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300"
          style={p.cover_url ? { backgroundImage: `url(${p.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          <div className="absolute inset-0 bg-black/15" />

          {/* Cover change buttons (own profile only) */}
          {isOwnProfile && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
              <label className="px-3.5 py-1.5 rounded-full bg-black/55 hover:bg-black/75 text-white text-xs font-bold backdrop-blur-md cursor-pointer transition flex items-center gap-1.5 shadow-sm">
                <span>📷</span>
                <span>Đổi ảnh bìa</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverFileChange}
                />
              </label>
              {p.cover_url && (
                <button
                  type="button"
                  onClick={handleDeleteCover}
                  className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-red-600 text-white text-xs font-bold backdrop-blur-md transition shadow-sm cursor-pointer"
                  title="Xóa ảnh bìa, khôi phục màu mặc định"
                >
                  ✕ Xóa ảnh bìa
                </button>
              )}
            </div>
          )}

          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {!isOwnProfile && (
              <>
                <button
                  onClick={handleFollowToggle}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold shadow-md transition cursor-pointer flex items-center gap-1.5 ${
                    isFollowing
                      ? 'bg-white/90 hover:bg-white text-slate-800'
                      : 'bg-[#ff4757] hover:bg-[#ff6b81] text-white'
                  }`}
                >
                  <span>{isFollowing ? '✓ Đang theo dõi' : '+ Theo dõi'}</span>
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-3 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 text-xs font-bold transition cursor-pointer"
                  title="Báo cáo vi phạm"
                >
                  🚩
                </button>
              </>
            )}
            {isOwnProfile && (
              <button
                onClick={() => setIsEditing(e => !e)}
                className="px-4 py-2 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-extrabold shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{isEditing ? '✕ Hủy chỉnh sửa' : '✏️ Chỉnh sửa hồ sơ'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Meta info bar */}
        <div className="px-6 pb-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            {/* Avatar & Badges with Hover Camera Overlay */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <Avatar
                  src={avatarUrl}
                  name={displayName}
                  size="2xl"
                  isDoctor={isDoctor}
                  verified={isDoctor && Boolean(p.is_verified || p.verification_status === 'verified')}
                  className="border-4 border-white shadow-lg bg-slate-100 ring-2 ring-slate-200"
                />

                {isOwnProfile && (
                  <label
                    title="Đổi ảnh đại diện"
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-[2px]"
                  >
                    <span className="text-xl">📷</span>
                    <span className="text-[10px] font-bold">Thay ảnh</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </label>
                )}
              </div>
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {displayName}
                  </h1>
                  {isDoctor ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-extrabold border border-blue-200">
                      🩺 Bác sĩ Thú y
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#ff4757] text-xs font-extrabold border border-rose-200">
                      🐾 Chủ nuôi
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {isDoctor
                    ? `${p.specialty || 'Chuyên khoa Cấp cứu'} • ${p.clinic_name || 'Bệnh viện PetCare'}`
                    : `Gia nhập cộng đồng PetCare AI`}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons for Doctor */}
            {isDoctor && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    navigate('/?ask_doc=' + encodeURIComponent(displayName));
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-extrabold shadow-md shadow-blue-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>💬</span><span>Hỏi Bác Sĩ</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/vetmap');
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🏥</span><span>Đặt Lịch Khám</span>
                </button>
              </div>
            )}
          </div>

          {/* Bio text */}
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed mt-2">
            {p.bio || 'Chưa cập nhật phần giới thiệu cá nhân.'}
          </p>

          {/* Followers / Stats Counters */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-slate-100 text-xs">
            <div>
              <strong className="text-slate-900 font-extrabold text-sm block">
                {p.posts_count ?? (p.recent_posts?.length || 0)}
              </strong>
              <span className="text-slate-400">Bài viết</span>
            </div>
            <div className="h-6 w-px bg-slate-100" />
            <div>
              <strong className="text-slate-900 font-extrabold text-sm block">
                {p.followers_count || 38}
              </strong>
              <span className="text-slate-400">Người theo dõi</span>
            </div>
            <div className="h-6 w-px bg-slate-100" />
            <div>
              <strong className="text-slate-900 font-extrabold text-sm block">
                {p.following_count || 12}
              </strong>
              <span className="text-slate-400">Đang theo dõi</span>
            </div>
            {isDoctor && (
              <>
                <div className="h-6 w-px bg-slate-100" />
                <div>
                  <strong className="text-amber-500 font-extrabold text-sm block flex items-center gap-1">
                    <span>⭐</span> {p.average_rating || 4.8}
                  </strong>
                  <span className="text-slate-400">{totalReviews} đánh giá</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PROFILE EDIT FORM (Toggled only on own profile) */}
        {isOwnProfile && isEditing && (
          <div className="p-6 bg-slate-50/80 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>⚙️</span> Chỉnh Sửa Thông Tin Cá Nhân
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Họ & Tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#ff4757] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Giới tính</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#ff4757] outline-none"
                >
                  <option value="male">Nam 👨</option>
                  <option value="female">Nữ 👩</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Tiểu sử (Bio)</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Giới thiệu đôi nét về bản thân hoặc kinh nghiệm thú y..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#ff4757] outline-none resize-none"
                />
              </div>

              {role === 'doctor' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Chuyên khoa</label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="VD: Cấp cứu & Ngoại khoa, Dinh dưỡng..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#ff4757] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Phòng khám công tác</label>
                    <select
                      value={clinicId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setClinicId(selId);
                        const selClinic = clinicsList.find(c => String(c.id) === String(selId));
                        setClinicName(selClinic ? selClinic.name : '');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#ff4757] outline-none cursor-pointer"
                    >
                      <option value="">-- Chưa gắn phòng khám --</option>
                      {clinicsList.map(c => (
                        <option key={c.id} value={c.id}>
                          🏥 {c.name} {c.address ? `(${c.address.slice(0, 32)}...)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Avatar field in edit form */}
              <div className="sm:col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-700 block">Ảnh đại diện</label>
                  <span className="text-[11px] text-slate-400">Tải lên ảnh vuông, hệ thống sẽ tự động tối ưu</span>
                </div>
                <label className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5">
                  <span>📷</span>
                  <span>Chọn ảnh mới</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold transition shadow-md shadow-rose-200 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex border-t border-slate-100 bg-slate-50/60 overflow-x-auto">
          {isDoctor ? (
            <>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'about' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>ℹ️</span><span>Giới Thiệu</span>
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'posts' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📝</span><span>Bài Viết & Tư Vấn</span>
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'reviews' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⭐</span><span>Đánh Giá ({totalReviews})</span>
              </button>
              <button
                onClick={() => setActiveTab('clinics')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'clinics' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🏥</span><span>Phòng Khám ({p.clinics?.length || 1})</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('about')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'about' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>ℹ️</span><span>Giới Thiệu</span>
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'posts' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📝</span><span>Bài Viết</span>
              </button>
              <button
                onClick={() => setActiveTab('pets')}
                className={`px-5 py-3 text-xs font-extrabold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pets' ? 'border-[#ff4757] text-[#ff4757] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🐾</span><span>Thú Cưng ({isOwnProfile ? petsList.length : (p.pets?.length || 0)})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* 1. DOCTOR: GIỚI THIỆU TAB */}
      {isDoctor && activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>🩺</span> Chuyên Môn & Kinh Nghiệm
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <span className="text-slate-400 block mb-0.5">Chuyên khoa</span>
                  <strong className="text-blue-900 font-extrabold text-sm">
                    {p.specialty || 'Chuyên khoa Cấp cứu & Ngoại khoa'}
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <span className="text-slate-400 block mb-0.5">Kinh nghiệm công tác</span>
                  <strong className="text-purple-900 font-extrabold text-sm">
                    {p.experience_years || 5} năm kinh nghiệm
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <span className="text-slate-400 block mb-0.5">Chứng chỉ hành nghề</span>
                  <strong className="text-emerald-900 font-extrabold text-sm">
                    {p.license_no || 'VET-2024-VN'}
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <span className="text-slate-400 block mb-0.5">Trạng thái duyệt</span>
                  <strong className="text-amber-900 font-extrabold text-sm flex items-center gap-1">
                    <span>✓</span> Đã xác thực giấy phép
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                🏥 Nơi Làm Việc
              </h3>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                {p.clinic_name || 'Bệnh viện Thú y Quốc tế PetCare 24/7'}
              </p>
              <button
                onClick={() => navigate('/vetmap')}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-2xl transition cursor-pointer"
              >
                Xem trên bản đồ phòng khám →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REVIEWS TAB (Doctor) */}
      {isDoctor && activeTab === 'reviews' && (
        <DoctorReviewsTab
          doctorId={p.id || effectiveUserId}
          currentUser={currentUser}
          showToast={showToast}
          onRequireAuth={onRequireAuth}
        />
      )}

      {/* 3. CLINICS TAB (Doctor) */}
      {isDoctor && activeTab === 'clinics' && (
        <div className="space-y-4">
          {(p.clinics && p.clinics.length > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.clinics.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900">🏥 {c.name}</h4>
                    {Boolean(c.is_24h) && (
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-black border border-red-200">
                        24/7
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{c.address}, {c.city}</p>
                  <p className="text-xs text-slate-600 font-semibold">📞 Hotline: {c.hotline || '1900-PETCARE'}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-amber-500 font-bold">⭐ {c.rating || 5.0}</span>
                    <button
                      onClick={() => navigate('/vetmap')}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Xem chỉ đường →
                    </button>
                  </div>
                </div>

))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-xs text-slate-400">
              Bác sĩ trực thuộc hệ thống phòng khám đối tác PetCare AI.
            </div>
          )}
        </div>
      )}

      {/* 4. POSTS TAB (Both Doctor & Owner) */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {(p.recent_posts && p.recent_posts.length > 0) ? (
            p.recent_posts.map(post => (
              <div key={post.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{formatTimeAgo(post.created_at)}</span>
                  <span className="text-rose-500 font-bold">❤️ {post.likes_count || 0}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{post.content}</p>
                {post.media_url && post.media_type === 'image' && (
                  <img
                    src={post.media_url.startsWith('http') ? post.media_url : `/storage/${post.media_url}`}
                    alt="Ảnh bài viết"
                    className="w-full max-h-80 object-cover rounded-2xl"
                  />
                )}
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-xs text-slate-400">
              <span className="text-3xl block mb-2">📝</span>
              Chưa có bài viết nào được chia sẻ.
            </div>
          )}
        </div>
      )}

      {/* 5. OWNER: THÚ CƯNG TAB */}
      {!isDoctor && activeTab === 'pets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              🐾 Danh Sách Thú Cưng ({isOwnProfile ? petsList.length : (p.pets?.length || 0)})
            </h3>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/pets')}
                className="px-3.5 py-1.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                + Quản lý Sổ sức khỏe
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(isOwnProfile ? petsList : (p.pets || [])).map(pet => (
              <div
                key={pet.id}
                className="bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-rose-200 shadow-sm flex items-center gap-4 transition group"
              >
                <img
                  src={pet.avatar || pet.photo_url || DEFAULT_PET_DOG_AVATAR}
                  alt={pet.name || pet.pet_name}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-100 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-sm text-slate-900 truncate">
                      {pet.name || pet.pet_name}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">
                      Công khai
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pet.breed || pet.type || 'Thú cưng'}
                    {pet.weight ? ` • ${pet.weight}kg` : ''}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigate(`/pets/${pet.id}`)}
                      className="text-[11px] text-[#ff4757] font-bold hover:underline mt-1 block cursor-pointer"
                    >
                      Xem sổ tiêm & bệnh án →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. OWNER: GIỚI THIỆU TAB */}
      {!isDoctor && activeTab === 'about' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            ℹ️ Thông Tin Giới Thiệu
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {p.bio || 'Chủ nuôi chưa cập nhật tiểu sử chi tiết.'}
          </p>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            Thành viên tích cực chia sẻ và bảo vệ sức khỏe thú cưng cùng PetCare AI 24/24.
          </div>
        </div>
      )}
      {/* Image Crop Modal */}
      {cropModalOpen && selectedCropFile && (
        <ImageCropModal
          file={selectedCropFile}
          mode={cropMode}
          onSave={handleCropSave}
          onClose={() => {
            setCropModalOpen(false);
            setSelectedCropFile(null);
          }}
        />
      )}
    </div>
  );
}
