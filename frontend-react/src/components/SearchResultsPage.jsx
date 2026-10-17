import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DEFAULT_PET_DOG_AVATAR, DEFAULT_MALE_AVATAR, DEFAULT_FEMALE_AVATAR } from '../constants/avatars';
import Avatar from './Avatar';
import { formatTimeAgo } from '../utils/formatters';

export default function SearchResultsPage({ currentUser, showToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputVal, setInputVal] = useState(query);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'clinics', 'pets', 'posts'
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ users: [], clinics: [], posts: [], pets: [] });
  const navigate = useNavigate();

  useEffect(() => {
    setInputVal(query);
    document.title = query ? `Tìm kiếm: "${query}" | PetCare AI` : 'Tìm kiếm | PetCare AI';

    if (!query.trim()) {
      setResults({ users: [], clinics: [], posts: [], pets: [] });
      return;
    }

    setLoading(true);
    axios.get(`/api/v1/search?q=${encodeURIComponent(query.trim())}`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setResults({
            users: res.data.data.users || [],
            clinics: res.data.data.clinics || [],
            posts: res.data.data.posts || [],
            pets: res.data.data.pets || [],
          });
        }
      })
      .catch(err => {
        console.warn('Search error:', err);
        showToast?.('Không thể tải kết quả tìm kiếm.', 'error');
      })
      .finally(() => setLoading(false));
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchParams({ q: inputVal.trim() });
    }
  };

  const totalResults = results.users.length + results.clinics.length + results.posts.length + (results.pets?.length || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Search Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">🔍</span>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Tìm bác sĩ, phòng khám, bài viết, thú cưng..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4757] focus:bg-white transition"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-[#ff4757] hover:bg-[#ff6b81] text-white font-bold text-sm rounded-2xl transition shadow-md shadow-rose-200 cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>

        {/* Tab Filters */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🩺 Bác sĩ & Thành viên ({results.users.length})
          </button>
          <button
            onClick={() => setActiveTab('clinics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'clinics' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏥 Phòng khám ({results.clinics.length})
          </button>
          <button
            onClick={() => setActiveTab('pets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'pets' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🐾 Thú cưng ({results.pets?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'posts' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📝 Bài viết ({results.posts.length})
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm animate-pulse flex gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && query && totalResults === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <span className="text-5xl mb-3 block">🔍</span>
          <h3 className="font-extrabold text-slate-800 text-base mb-1">Không tìm thấy kết quả phù hợp</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Không có bác sĩ, phòng khám hay bài viết nào khớp với từ khóa "{query}". Bạn hãy thử tìm với từ khóa chung hơn như "chó", "mèo", "vaccine" hoặc tên phòng khám.
          </p>
        </div>
      )}

      {/* Results Content */}
      {!loading && (
        <div className="space-y-6">
          {/* USERS / DOCTORS SECTION */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>👤</span> Bác sĩ & Thành viên ({results.users.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.users.map(u => {
                  const isDoc = u.role === 'doctor';
                  return (
                    <Link
                      key={u.id}
                      to={`/u/${u.id}`}
                      className="bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-[#ff4757] hover:shadow-md transition flex items-center gap-3.5 group"
                    >
                      <Avatar
                        src={u.avatar_url}
                        name={u.name}
                        size="w-12 h-12 text-sm"
                        isDoctor={isDoc}
                        verified={isDoc}
                        className="rounded-2xl border border-slate-100 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900 group-hover:text-[#ff4757] transition-colors truncate">
                            {u.name}
                          </span>
                          {isDoc && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold border border-blue-100">
                              🩺 Bác sĩ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {isDoc ? (u.specialty || u.clinic_name || 'Bác sĩ Thú y') : '🐾 Chủ nuôi thú cưng'}
                        </p>
                      </div>
                      <span className="text-slate-300 group-hover:text-[#ff4757] transition-colors text-sm font-bold">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* CLINICS SECTION */}
          {(activeTab === 'all' || activeTab === 'clinics') && results.clinics.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>🏥</span> Phòng Khám Thú Y ({results.clinics.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.clinics.map(c => (
                  <Link
                    key={c.id}
                    to={`/clinic/${c.id}`}
                    className="bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                          🏥 {c.name}
                        </h4>
                        {Boolean(c.is_24h) && (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-black border border-red-200">
                            24/7
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{c.address}, {c.city}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
                      <span>⭐ {c.rating || 5.0} ({c.review_count || 1} đánh giá)</span>
                      <span className="font-bold text-emerald-600 group-hover:underline">Xem vị trí →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* PETS SECTION */}
          {(activeTab === 'all' || activeTab === 'pets') && results.pets?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>🐾</span> Thú Cưng Cộng Đồng ({results.pets.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {results.pets.map(pet => (
                  <Link
                    key={pet.id}
                    to={pet.qr_token ? `/pet/${pet.qr_token}` : `/u/${pet.user_id}`}
                    className="bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-[#ff4757] hover:shadow-md transition flex items-center gap-3.5 group"
                  >
                    <img
                      src={pet.avatar || DEFAULT_PET_DOG_AVATAR}
                      alt={pet.pet_name}
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_PET_DOG_AVATAR; }}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-100 group-hover:scale-105 transition-transform bg-slate-50"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#ff4757] transition-colors truncate">
                        {pet.pet_name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {pet.breed || pet.species} {pet.weight ? `• ${pet.weight}kg` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Chủ: {pet.user?.name || 'Ẩn danh'}
                      </p>
                    </div>
                    <span className="text-slate-300 group-hover:text-[#ff4757] transition-colors text-sm font-bold">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* POSTS SECTION */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>📝</span> Bài Viết Diễn Đàn ({results.posts.length})
              </h3>
              <div className="space-y-3">
                {results.posts.map(p => (
                  <Link
                    key={p.id}
                    to={`/post/${p.id}`}
                    className="bg-white p-4 rounded-3xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition block group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-700">{p.user?.name || 'Ẩn danh'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400">{formatTimeAgo(p.created_at)}</span>
                      {p.pet_name && (
                        <span className="ml-auto text-[11px] bg-rose-50 text-[#ff4757] font-semibold px-2 py-0.5 rounded-full">
                          🐾 {p.pet_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 line-clamp-2 leading-relaxed group-hover:text-blue-600 transition-colors">
                      {p.content}
                    </p>
                    {Array.isArray(p.tags) && p.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2.5 flex-wrap">
                        {p.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
