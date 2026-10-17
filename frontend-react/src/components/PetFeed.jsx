import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreatePost from './CreatePost';
import PostCard from './PostCard';

const FILTER_TAGS = [
  { id: 'all',     label: 'Tất Cả' },
  { id: 'doctor',  label: '🩺 Lời Khuyên Bác Sĩ' },
  { id: 'Sức khỏe',label: '💊 Sức Khỏe' },
  { id: 'Dinh dưỡng', label: '🥗 Dinh Dưỡng' },
  { id: 'Sơ cứu',  label: '🚨 Sơ Cứu' },
  { id: 'Chó',     label: '🐶 Chó' },
  { id: 'Mèo',     label: '🐱 Mèo' },
];

export default function PetFeed({
  showToast, isLoggedIn, currentUser, petsList, onRequireAuth,
  posts = [], onPostCreated, onPostLiked, onCommentAdded, onPostDeleted,
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedTag, setSelectedTag]       = useState('all');
  const [searchedUsers, setSearchedUsers]   = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Search users / doctors via backend when searchQuery changes
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchedUsers([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingUsers(true);
      axios.get(`/api/v1/users/search?q=${encodeURIComponent(q)}`)
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setSearchedUsers(res.data.data);
          }
        })
        .catch(() => setSearchedUsers([]))
        .finally(() => setIsSearchingUsers(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter posts based on searchQuery & selectedTag
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // 1. Tag filter
      if (selectedTag === 'doctor') {
        const isDoc = post.authorRole === 'doctor' || (post.comments || []).some(c => c.isDoctorAdvice || c.role === 'doctor');
        if (!isDoc) return false;
      } else if (selectedTag !== 'all') {
        const hasTag = (post.tags || []).some(t => t.toLowerCase() === selectedTag.toLowerCase());
        const inCaption = (post.caption || post.content || '').toLowerCase().includes(selectedTag.toLowerCase());
        const inPet = (post.petName || '').toLowerCase().includes(selectedTag.toLowerCase());
        if (!hasTag && !inCaption && !inPet) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inCaption = (post.caption || post.content || '').toLowerCase().includes(q);
        const inAuthor  = (post.authorName || '').toLowerCase().includes(q);
        const inPet     = (post.petName || '').toLowerCase().includes(q);
        const inBreed   = (post.petBreed || '').toLowerCase().includes(q);
        const inTags    = (post.tags || []).some(t => t.toLowerCase().includes(q));
        if (!inCaption && !inAuthor && !inPet && !inBreed && !inTags) return false;
      }

      return true;
    });
  }, [posts, selectedTag, searchQuery]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header & Search */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>🐾</span> Bảng Tin Cộng Đồng & Tư Vấn Bác Sĩ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tra cứu kinh nghiệm chăm sóc, tìm kiếm bác sĩ thú y và kết nối cộng đồng yêu thú cưng
          </p>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate('/search?q=' + encodeURIComponent(searchQuery.trim()));
            }
          }}
          className="relative"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            🔍
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bài viết, câu hỏi, giống loài (Poodle, Golden), hoặc tên bác sĩ... (Nhấn Enter)"
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff4757] shadow-sm transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
            >
              ✕
            </button>
          )}
        </form>

        {/* User Search Results Dropdown / Preview Card */}
        {searchQuery.trim().length >= 2 && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                👤 Thành viên & Bác sĩ phù hợp ({searchedUsers.length})
              </span>
              <div className="flex items-center gap-2">
                {isSearchingUsers && <span className="text-xs text-slate-400 animate-pulse">Đang tìm...</span>}
                <button
                  type="button"
                  onClick={() => navigate('/search?q=' + encodeURIComponent(searchQuery.trim()))}
                  className="text-xs text-[#ff4757] font-bold hover:underline cursor-pointer"
                >
                  Xem tất cả →
                </button>
              </div>
            </div>

            {searchedUsers.length === 0 ? (
              <p className="text-xs text-slate-400 py-1 italic">
                Không tìm thấy bác sĩ hoặc thành viên nào tên "{searchQuery}"
              </p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {searchedUsers.map(u => {
                  const isDoc = u.role === 'doctor';
                  return (
                    <Link
                      key={u.id}
                      to={`/u/${u.id}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50/60 border border-slate-200/80 hover:border-rose-200 cursor-pointer transition flex-shrink-0 min-w-[200px]"
                    >
                      <img
                        src={u.avatar_url || (isDoc ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop')}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-white shadow-sm flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h5 className="text-xs font-black text-slate-800 truncate">{u.name}</h5>
                          {isDoc && <span className="text-[10px]" title="Bác sĩ xác minh">🩺</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {isDoc ? (u.specialty || 'Bác sĩ Thú y') : 'Chủ nuôi thú cưng'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TAGS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTag(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                selectedTag === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Khung tạo bài */}
      <CreatePost
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        petsList={petsList}
        onRequireAuth={onRequireAuth}
        onPostCreated={onPostCreated}
        showToast={showToast}
      />

      {/* Kết quả bộ lọc */}
      {(selectedTag !== 'all' || searchQuery.trim()) && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Tìm thấy <strong>{filteredPosts.length}</strong> bài viết phù hợp</span>
          <button
            onClick={() => { setSelectedTag('all'); setSearchQuery(''); }}
            className="text-[#ff4757] font-bold hover:underline cursor-pointer"
          >
            ✕ Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* Danh sách bài đăng */}
      <div className="space-y-7">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="font-extrabold text-slate-800 text-base">Không tìm thấy bài viết nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Thử tìm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ bài viết từ cộng đồng.
            </p>
            <button
              onClick={() => { setSelectedTag('all'); setSearchQuery(''); }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Xem tất cả bài viết
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              onRequireAuth={onRequireAuth}
              onLiked={onPostLiked}
              onCommentAdded={onCommentAdded}
              onPostDeleted={onPostDeleted}
            />
          ))
        )}
      </div>
    </div>
  );
}
