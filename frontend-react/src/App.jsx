import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import PetDeviceForm from './components/PetDeviceForm';
import ConnectionGuide from './components/ConnectionGuide';
import PetFeed from './components/PetFeed';
import UserProfile from './components/UserProfile';
import AuthModal from './components/AuthModal';
import AvatarUpload from './components/AvatarUpload';
import VetMap from './components/VetMap';
import DoctorDashboard from './components/DoctorDashboard';
import SosButton from './components/SosButton';
import AdminPanel from './components/AdminPanel';
import PetDetail from './components/PetDetail';
import PetList from './components/PetList';
import SearchResultsPage from './components/SearchResultsPage';
import SearchAutocomplete from './components/SearchAutocomplete';
import PetPublicQR from './components/PetPublicQR';
import ErrorBoundary from './components/ErrorBoundary';
import {
  DEFAULT_MALE_AVATAR,
  DEFAULT_FEMALE_AVATAR,
  DEFAULT_PET_DOG_AVATAR,
  DEFAULT_PET_CAT_AVATAR,
} from './constants/avatars';

axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Demo seed posts (persist in memory across tab switches)
const SEED_POSTS = [
  {
    id: 'p_1',
    authorId: 'seed_doc_1',
    petName: 'Milo (Golden Retriever)',
    petAvatar: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=80&h=80&fit=crop',
    authorName: 'BS. Tuấn Minh', authorRole: 'doctor',
    authorAvatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop',
    authorSpecialty: 'Chuyên khoa Cấp cứu & Hồi sức',
    caption: 'Hôm nay Milo chạy bộ 4.5km quanh công viên, vòng cổ GPS vẫn cập nhật lộ trình chuẩn từng mét! 🏃‍♂️🐶 #AI_Tracking #GoldenRetriever',
    mediaUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=900&auto=format&fit=crop&q=80',
    mediaType: 'image', likesCount: 142, isLiked: false, createdAt: '1 giờ trước',
    tags: ['Sức khỏe', 'Chó'],
    comments: [
      { id: 'c1', author: 'BS. Lan Hương', role: 'doctor', isDoctorAdvice: true, specialty: 'Bác sĩ Dinh dưỡng • Bệnh viện PetCare', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop', text: '🩺 Nhớ bổ sung nước và điện giải sau khi bé vận động mạnh nhé, tránh sốc nhiệt!', createdAt: '45 phút trước' },
      { id: 'c2', author: 'Minh Tuấn', role: 'user', isDoctorAdvice: false, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop', text: 'Bé cưng và năng động quá! ❤️', createdAt: '30 phút trước' },
    ],
  },
  {
    id: 'p_2',
    authorId: 'seed_user_2',
    petName: 'Mèo Bơ (Munchkin)',
    petAvatar: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=80&h=80&fit=crop',
    authorName: 'Thu Hà', authorRole: 'user',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
    caption: 'Bé Bơ nằm phơi nắng chiều bên cửa sổ lười biếng. AI cảnh báo thời tiết hôm nay hanh khô, cần cấp ẩm cho bé 🐾✨ #CatLife',
    mediaUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&auto=format&fit=crop&q=80',
    mediaType: 'image', likesCount: 89, isLiked: false, createdAt: '4 giờ trước',
    tags: ['Mèo', 'Chia sẻ khoảnh khắc'],
    comments: [{ id: 'c3', author: 'Hoàng Oanh', role: 'user', isDoctorAdvice: false, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop', text: 'Đôi mắt to tròn cưng xỉu luôn á!', createdAt: '2 giờ trước' }],
  },
];

const USER_TABS = [
  { id: 'feed',    label: 'Diễn Đàn',     icon: '📱' },
  { id: 'pets',    label: 'Thú Cưng',     icon: '🐾' },
  { id: 'vetmap',  label: 'Bản Đồ Thú Y', icon: '🗺️' },
  { id: 'device',  label: 'Thiết Bị',     icon: '📡' },
  { id: 'profile', label: 'Hồ Sơ',        icon: '👤' },
];
const DOCTOR_TABS = [
  { id: 'feed',    label: 'Diễn Đàn',     icon: '📱' },
  { id: 'sos',     label: 'Bảng SOS',     icon: '🚨' },
  { id: 'vetmap',  label: 'Bản Đồ Thú Y', icon: '🗺️' },
  { id: 'profile', label: 'Hồ Sơ',        icon: '👤' },
];
const ADMIN_TABS = [
  { id: 'feed',    label: 'Diễn Đàn',   icon: '📱' },
  { id: 'admin',   label: 'Quản Trị',   icon: '🛡️' },
  { id: 'profile', label: 'Hồ Sơ',      icon: '👤' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab]         = useState('feed');

  // Đồng bộ tab khi người dùng truy cập trực tiếp bằng URL (/pets, /vetmap, /profile...)
  useEffect(() => {
    const path = location.pathname.replace(/^\//, '');
    if (path === 'pets' || path === 'vetmap' || path === 'profile' || path === 'admin' || path === 'sos' || path === 'device' || path === 'search') {
      setActiveTab(path);
    } else if (location.pathname === '/') {
      setActiveTab('feed');
    }
  }, [location.pathname]);
  // Khởi tạo currentUser từ localStorage để F5 / Reset trang KHÔNG bị mất session
  const [currentUser, setCurrentUser]     = useState(() => {
    try {
      const saved = localStorage.getItem('petcare_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [toast, setToast]                 = useState({ show: false, message: '', type: 'success' });
  // Notification center
  const [notifications, setNotifications] = useState([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  // ── Posts lifted to App level so they persist across tab switches ──────────
  const [posts, setPosts]                 = useState(SEED_POSTS);
  const [postsLoaded, setPostsLoaded]     = useState(false);
  const [petsList, setPetsList]           = useState([
    { id: 'pet_1', name: 'Cún Lu',  breed: 'Golden Retriever', avatar: DEFAULT_PET_DOG_AVATAR,  imei: '', aiMonitoring: false },
    { id: 'pet_2', name: 'Mèo Bơ',  breed: 'Munchkin',         avatar: DEFAULT_PET_CAT_AVATAR, imei: '', aiMonitoring: false },
  ]);

  const isLoggedIn = currentUser !== null;
  const isDoctor = currentUser?.role === 'doctor';
  const isAdmin  = currentUser?.role === 'admin';
  const TABS = isAdmin ? ADMIN_TABS : isDoctor ? DOCTOR_TABS : USER_TABS;

  // Restore & verify session on load
  useEffect(() => {
    const savedUser = (() => {
      try {
        const s = localStorage.getItem('petcare_current_user');
        return s ? JSON.parse(s) : null;
      } catch { return null; }
    })();

    const headers = savedUser?.id ? { 'X-User-Id': String(savedUser.id) } : {};
    axios.get('/api/v1/auth/me', { headers }).then(res => {
      if (res.data?.success && res.data?.data) {
        const u = buildUser(res.data.data);
        setCurrentUser(u);
        try { localStorage.setItem('petcare_current_user', JSON.stringify(u)); } catch (_) {}
      }
    }).catch(() => {});
  }, []);

  // Load posts from API once
  useEffect(() => {
    if (postsLoaded) return;
    axios.get('/api/v1/forum/posts').then(res => {
      const list = res.data?.data?.data;
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map(p => {
          const isCurrentAuthor = currentUser && (
            (p.user_id && String(p.user_id) === String(currentUser.id)) ||
            (p.user?.name && p.user?.name === currentUser.name)
          );
          // Đồng bộ: Nếu là bài viết của currentUser thì LUÔN dùng avatar hiện tại của currentUser
          const authorAvatar = (isCurrentAuthor && currentUser?.avatar)
            ? currentUser.avatar
            : (p.user?.avatar_url || (p.user?.role === 'doctor'
                ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop'
                : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop'));

          return {
            id: p.id,
            authorId: p.user_id || p.user?.id,
            petName: p.pet_name || 'Thú cưng',
            petAvatar: p.pet_avatar || DEFAULT_PET_DOG_AVATAR,
            authorName: p.user?.name || 'Ẩn danh',
            authorRole: p.user?.role || 'user',
            authorAvatar: authorAvatar,
            authorSpecialty: p.user?.specialty || '',
            caption: p.content,
            tags: p.tags || [],
            mediaUrl: p.media_full_url || null,
            mediaType: p.media_type || 'none',
            likesCount: p.likes_count || 0,
            isLiked: false,
            createdAt: p.created_at,
            comments: (p.comments || []).map(c => ({
              id: c.id,
              author: c.user?.name || 'Ẩn danh',
              role: c.user?.role || 'user',
              isDoctorAdvice: c.user?.role === 'doctor',
              specialty: c.user?.specialty || '',
              avatar: (currentUser && (String(c.user_id || c.user?.id) === String(currentUser.id) || c.user?.name === currentUser.name))
                ? currentUser.avatar
                : (c.user?.avatar_url || (c.user?.role === 'doctor'
                    ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop'
                    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop')),
              text: c.content,
              createdAt: c.created_at,
            })),
          };
        });
        setPosts([...mapped, ...SEED_POSTS]);
      }
      setPostsLoaded(true);
    }).catch(() => setPostsLoaded(true));
  }, [postsLoaded, currentUser]);

  const buildUser = (data) => ({
    id: data.id, name: data.name, email: data.email,
    role: data.role || 'user', gender: data.gender || 'male',
    avatar: data.avatar_url || (data.role === 'doctor'
      ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop'
      : (data.gender === 'female'
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop')),
    clinicName: data.clinic_name || '', specialty: data.specialty || '',
    bio: data.bio || '', verification_status: data.verification_status || 'verified',
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4500);
    // Also push to notifications history
    setNotifications(prev => [{
      id: Date.now(),
      message,
      type,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    }, ...prev].slice(0, 50)); // keep max 50
    setUnreadNotifCount(c => c + 1);
  };

  const handleRequireAuth = (msg) => {
    setAuthModalMessage(msg || 'Vui lòng đăng nhập để tương tác!');
    setIsAuthModalOpen(true);
  };

  // Cập nhật thông tin user & đồng bộ avatar lập tức sang diễn đàn và localStorage
  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('petcare_current_user', JSON.stringify(updatedUser));
    } catch (_) {}

    // Đồng bộ ngay lập tức sang tất cả bài viết của user này trên diễn đàn
    if (updatedUser?.avatar) {
      setPosts(prev => prev.map(p => {
        const isUserPost = (p.authorId && String(p.authorId) === String(updatedUser.id)) ||
                           (!p.authorId && p.authorName === updatedUser.name);
        return isUserPost ? { ...p, authorAvatar: updatedUser.avatar } : p;
      }));
    }
  };

  const handleLoginSuccess = (user) => {
    handleUpdateUser(user);
    setActiveTab(user.role === 'admin' ? 'admin' : (user.role === 'doctor' ? 'sos' : 'feed'));
    showToast(`🎉 Chào mừng ${user.name}!`, 'success');
  };

  const handleLogout = async () => {
    try { await axios.post('/api/v1/auth/logout'); } catch (_) {}
    try { localStorage.removeItem('petcare_current_user'); } catch (_) {}
    setCurrentUser(null);
    setActiveTab('feed');
    showToast('Đã đăng xuất. Hẹn gặp lại! 👋', 'info');
  };

  const handleTabChange = (tabId) => {
    if (!isLoggedIn && tabId !== 'feed') {
      handleRequireAuth('Đăng nhập để truy cập tính năng này!');
      return;
    }
    setActiveTab(tabId);
    navigate(tabId === 'feed' ? '/' : `/${tabId}`);
  };

  // Add new post (called from PetFeed, state lives here)
  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  // Update likes count
  const handlePostLiked = (postId, newCount, liked) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: newCount, isLiked: liked } : p));
  };

  // Add comment
  const handleCommentAdded = (postId, newComment) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
    ));
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <Routes>
      <Route path="/pet/:token" element={<PetPublicQR />} />
      <Route path="/pets/:id/qr" element={<PetPublicQR />} />
      <Route path="/pets/:id" element={
        <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-[#ff4757] selection:text-white">
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <PetDetail currentUser={currentUser} showToast={showToast} />
          </main>
        </div>
      } />
      <Route path="/u/:id" element={
        <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-[#ff4757] selection:text-white">
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm py-3 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#ff4757] transition">
                <span>←</span><span>Trang Chủ PetCare AI</span>
              </Link>
              <div className="text-xs font-black text-slate-900">🐾 Hồ Sơ Bác Sĩ & Thành Viên</div>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <UserProfile
              currentUser={currentUser}
              petsList={petsList}
              onUpdateUser={handleUpdateUser}
              onUpdatePets={setPetsList}
              showToast={showToast}
              onRequireAuth={handleRequireAuth}
            />
          </main>
        </div>
      } />
      <Route path="*" element={
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-[#ff4757] selection:text-white">

      {/* TOAST */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[60] animate-in slide-in-from-right duration-300">
          <div className={`px-5 py-3 rounded-2xl shadow-xl font-bold text-xs sm:text-sm flex items-center gap-3 border ${
            toast.type === 'error' ? 'bg-rose-600 border-rose-700 text-white'
            : toast.type === 'info' ? 'bg-slate-800 border-slate-700 text-white'
            : 'bg-white border-rose-200 text-slate-800 shadow-rose-100'
          }`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${toast.type === 'error' ? 'bg-white' : 'bg-[#ff4757]'}`}/>
            {toast.message}
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        message={authModalMessage}
      />

      {/* SOS FLOATING BUTTON (only visible for pet owners, not doctors or admins) */}
      {isLoggedIn && !isDoctor && !isAdmin && (
        <SosButton currentUser={currentUser} showToast={showToast} />
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <div onClick={() => handleTabChange('feed')} className="flex items-center gap-3 cursor-pointer group flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff4757] to-[#ff6b81] flex items-center justify-center text-white text-xl shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">🐾</div>
            <div className="hidden sm:block">
              <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 leading-none">
                Pet<span className="text-[#ff4757]">Care</span> AI
              </h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                {isDoctor ? '🩺 Cổng Bác Sĩ Thú Y' : 'Quản lý & Diễn Đàn 24/24'}
              </span>
            </div>
          </div>

          {/* Quick Search Header with Autocomplete */}
          <div className="hidden lg:block flex-1 max-w-xs xl:max-w-sm mx-3">
            <SearchAutocomplete
              placeholder="Tìm bác sĩ, bài viết, phòng khám..."
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 flex-1 max-w-xl mx-4">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
                {tab.id === 'sos' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
              </button>
            ))}
          </nav>

          {/* User area + Notification Bell */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification Bell */}
            {isLoggedIn && (
              <div className="relative">
                <button
                  id="btn-notif-bell"
                  onClick={() => { setShowNotifDrawer(d => !d); setUnreadNotifCount(0); setNotifications(prev => prev.map(n => ({...n, read: true}))); }}
                  className="relative p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all cursor-pointer"
                  title="Trung tâm thông báo"
                >
                  <span className="text-lg leading-none">🔔</span>
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff4757] text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* Notification Drawer */}
                {showNotifDrawer && (
                  <>
                    <div className="fixed inset-0 z-[45]" onClick={() => setShowNotifDrawer(false)} />
                    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl z-[46] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-900 text-sm">🔔 Thông Báo</h3>
                        <button onClick={() => setNotifications([])} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-semibold">
                          Xóa tất cả
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            <div className="text-3xl mb-2">🔔</div>
                            Chưa có thông báo nào
                          </div>
                        ) : notifications.map(n => (
                          <div key={n.id} className={`px-4 py-3 flex items-start gap-3 text-xs hover:bg-slate-50 transition-colors ${
                            !n.read ? 'bg-rose-50/40' : ''
                          }`}>
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              n.type === 'error' ? 'bg-red-500' : n.type === 'info' ? 'bg-blue-400' : 'bg-emerald-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-700 font-medium leading-snug">{n.message}</p>
                              <span className="text-slate-400 text-[10px]">{n.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-2 pr-3 py-1">
                <AvatarUpload
                  currentAvatar={currentUser.avatar}
                  onAvatarChange={async (url) => {
                    const updated = { ...currentUser, avatar: url, avatar_url: url };
                    handleUpdateUser(updated);
                    try {
                      await axios.put('/api/v1/auth/profile', { id: currentUser.id, avatar_url: url }, {
                        headers: { 'X-User-Id': String(currentUser.id) }
                      });
                      showToast('Đã cập nhật ảnh đại diện!', 'success');
                    } catch (_) {}
                  }}
                  showToast={showToast} size="w-8 h-8" cameraSize="w-3.5 h-3.5"
                />
                <div onClick={() => handleTabChange('profile')} className="cursor-pointer text-left hidden md:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight hover:text-[#ff4757] transition-colors">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isDoctor ? '🩺 Bác sĩ Thú y' : '🐾 Chủ nuôi'}
                  </span>
                </div>
                <button onClick={handleLogout} className="text-xs font-semibold text-slate-500 hover:text-[#ff4757] pl-2 border-l border-slate-200 cursor-pointer transition-colors">Thoát</button>
              </div>
            ) : (
              <button onClick={() => handleRequireAuth('Đăng nhập để tham gia cộng đồng!')}
                className="px-4 py-2.5 rounded-full bg-[#ff4757] hover:bg-[#ff6b81] active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center gap-1.5">
                <span>🔒</span><span>Đăng Nhập</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="sm:hidden border-t border-slate-100 flex">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === tab.id ? 'text-[#ff4757] bg-rose-50' : 'text-slate-500'
              }`}>
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">

        {/* Guest Banner */}
        {!isLoggedIn && activeTab === 'feed' && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Chế độ Khách — Thả tim & Bình luận đang bị khóa</h4>
                <p className="text-xs text-slate-600 mt-0.5">Đăng nhập để hỏi Bác sĩ, đăng bài và tìm phòng khám gần nhất.</p>
              </div>
            </div>
            <button onClick={() => handleRequireAuth()}
              className="px-6 py-2.5 rounded-full bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold shadow-md shadow-rose-200 transition-all cursor-pointer whitespace-nowrap">
              Mở Khóa Ngay 🚀
            </button>
          </div>
        )}

        {/* TAB: FORUM */}
        {activeTab === 'feed' && location.pathname !== '/pets' && location.pathname !== '/search' && (
          <PetFeed
            showToast={showToast}
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            petsList={petsList}
            onRequireAuth={handleRequireAuth}
            posts={posts}
            onPostCreated={handlePostCreated}
            onPostLiked={handlePostLiked}
            onCommentAdded={handleCommentAdded}
            onPostDeleted={handlePostDeleted}
          />
        )}

        {/* TAB: PETS ("Sổ Thú Cưng") */}
        {(activeTab === 'pets' || location.pathname === '/pets') && (
          <PetList
            currentUser={currentUser}
            showToast={showToast}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* TAB: SEARCH RESULTS */}
        {(activeTab === 'search' || location.pathname === '/search') && (
          <SearchResultsPage
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {/* TAB: VET MAP */}
        {activeTab === 'vetmap' && isLoggedIn && (
          <ErrorBoundary type="map">
            <VetMap currentUser={currentUser} showToast={showToast} />
          </ErrorBoundary>
        )}

        {/* TAB: DEVICE */}
        {activeTab === 'device' && isLoggedIn && !isDoctor && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <PetDeviceForm
              onDeviceAdded={(d) => setPetsList(prev => prev.map((p, i) => i === 0 ? { ...p, imei: d.imei, aiMonitoring: true } : p))}
              showToast={showToast}
            />
            <ConnectionGuide />
          </div>
        )}

        {/* TAB: ADMIN PANEL */}
        {activeTab === 'admin' && isLoggedIn && isAdmin && (
          <AdminPanel currentUser={currentUser} showToast={showToast} />
        )}

        {/* TAB: SOS DASHBOARD (doctor) */}
        {activeTab === 'sos' && isLoggedIn && isDoctor && (
          <ErrorBoundary type="app">
            <DoctorDashboard currentUser={currentUser} showToast={showToast} />
          </ErrorBoundary>
        )}

        {/* TAB: PROFILE */}
        {activeTab === 'profile' && isLoggedIn && (
          <UserProfile
            currentUser={currentUser}
            petsList={petsList}
            onUpdateUser={handleUpdateUser}
            onUpdatePets={setPetsList}
            showToast={showToast}
            onRequireAuth={handleRequireAuth}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-8 mb-16 sm:mb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-600">
            <span className="text-lg">🐾</span> PetCare AI 24/24
          </div>
          <p>© 2026 PetCare AI · Kết nối Người nuôi & Bác sĩ thú y uy tín · Toàn Việt Nam</p>
          <div className="flex items-center gap-3">
            <span>🏥 33 phòng khám</span><span>·</span><span>🩺 Bác sĩ 24/7</span>
          </div>
        </div>
      </footer>
    </div>
    } />
    </Routes>
  );
}
