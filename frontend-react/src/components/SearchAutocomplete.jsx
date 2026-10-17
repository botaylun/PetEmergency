import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Avatar from './Avatar';
import { DEFAULT_PET_DOG_AVATAR } from '../constants/avatars';

export default function SearchAutocomplete({
  placeholder = 'Tìm bác sĩ, bài viết, phòng khám, thú cưng...',
  className = '',
  inputClassName = '',
  onSelect = null,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ users: [], clinics: [], posts: [], pets: [], tags: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const navigate = useNavigate();

  // Flattened items for keyboard navigation
  const flatItems = React.useMemo(() => {
    const items = [];
    (results.users || []).slice(0, 3).forEach(u => items.push({ type: 'user', item: u }));
    (results.clinics || []).slice(0, 3).forEach(c => items.push({ type: 'clinic', item: c }));
    (results.pets || []).slice(0, 2).forEach(p => items.push({ type: 'pet', item: p }));
    (results.posts || []).slice(0, 3).forEach(p => items.push({ type: 'post', item: p }));
    (results.tags || []).slice(0, 3).forEach(t => items.push({ type: 'tag', item: t }));
    return items;
  }, [results]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced API call
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults({ users: [], clinics: [], posts: [], pets: [], tags: [] });
      setIsOpen(false);
      return;
    }

    setLoading(true);
    clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/v1/search?q=${encodeURIComponent(trimmed)}`);
        if (res.data?.success) {
          setResults(res.data.data || { users: [], clinics: [], posts: [], pets: [], tags: [] });
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.warn('Autocomplete error:', err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(debounceTimerRef.current);
  }, [query]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
      handleItemSelect(flatItems[selectedIndex]);
    } else {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      if (onSelect) onSelect();
    }
  };

  const handleItemSelect = (entry) => {
    setIsOpen(false);
    const { type, item } = entry;
    if (type === 'user') {
      navigate(`/u/${item.id}`);
    } else if (type === 'clinic') {
      navigate(`/clinics/${item.id}`);
    } else if (type === 'pet') {
      if (item.qr_token) {
        navigate(`/pet/${item.qr_token}`);
      } else {
        navigate(`/u/${item.user_id}`);
      }
    } else if (type === 'post') {
      navigate(`/post/${item.id}`);
    } else if (type === 'tag') {
      navigate(`/search?q=${encodeURIComponent(item)}`);
    }
    if (onSelect) onSelect();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === 'Enter') handleSubmit(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flatItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const totalHits =
    (results.users?.length || 0) +
    (results.clinics?.length || 0) +
    (results.posts?.length || 0) +
    (results.pets?.length || 0) +
    (results.tags?.length || 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <span className="absolute left-3.5 text-slate-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-9 pr-8 py-2 rounded-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 border border-slate-200 outline-none focus:ring-2 focus:ring-[#ff4757] focus:border-transparent transition-all ${inputClassName}`}
        />
        {loading ? (
          <span className="absolute right-3 text-xs text-slate-400 animate-spin">⏳</span>
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        ) : null}
      </form>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden z-50 max-h-[480px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100">
          {totalHits === 0 && !loading && (
            <div className="p-5 text-center text-xs text-slate-400">
              <span>😿</span> Không tìm thấy kết quả phù hợp cho "{query}".
            </div>
          )}

          {/* 1. USERS & DOCTORS */}
          {results.users?.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🩺</span> Bác sĩ & Thành viên
              </div>
              {results.users.slice(0, 3).map((u) => {
                const itemIndex = flatItems.findIndex((i) => i.type === 'user' && i.item.id === u.id);
                const isSelected = itemIndex === selectedIndex;
                const isDoc = u.role === 'doctor';
                return (
                  <div
                    key={`user-${u.id}`}
                    onClick={() => handleItemSelect({ type: 'user', item: u })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50/80 text-rose-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar
                      src={u.avatar_url}
                      name={u.name}
                      size="w-8 h-8 text-xs"
                      isDoctor={isDoc}
                      verified={isDoc && u.verification_status === 'verified'}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800 truncate">{u.name}</span>
                        {isDoc && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold border border-blue-100">
                            Bác sĩ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {isDoc ? (u.specialty || u.clinic_name || 'Bác sĩ Thú y') : 'Chủ nuôi'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. CLINICS */}
          {results.clinics?.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏥</span> Phòng khám & Bệnh viện
              </div>
              {results.clinics.slice(0, 3).map((c) => {
                const itemIndex = flatItems.findIndex((i) => i.type === 'clinic' && i.item.id === c.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={`clinic-${c.id}`}
                    onClick={() => handleItemSelect({ type: 'clinic', item: c })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50/80 text-rose-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      🏥
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800 truncate">{c.name}</span>
                        {Boolean(c.is_24h) && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-50 text-red-600 font-black border border-red-200">
                            24/7
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{c.address}, {c.city}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. PETS */}
          {results.pets?.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🐾</span> Thú cưng cộng đồng
              </div>
              {results.pets.slice(0, 2).map((p) => {
                const itemIndex = flatItems.findIndex((i) => i.type === 'pet' && i.item.id === p.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={`pet-${p.id}`}
                    onClick={() => handleItemSelect({ type: 'pet', item: p })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50/80 text-rose-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={p.avatar || DEFAULT_PET_DOG_AVATAR}
                      alt={p.pet_name}
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_PET_DOG_AVATAR; }}
                      className="w-8 h-8 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-xs text-slate-800 truncate block">{p.pet_name}</span>
                      <p className="text-[11px] text-slate-400 truncate">
                        {p.breed || p.species} • Chủ nuôi: {p.user?.name || 'Ẩn danh'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. POSTS */}
          {results.posts?.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📝</span> Bài viết diễn đàn
              </div>
              {results.posts.slice(0, 3).map((post) => {
                const itemIndex = flatItems.findIndex((i) => i.type === 'post' && i.item.id === post.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={`post-${post.id}`}
                    onClick={() => handleItemSelect({ type: 'post', item: post })}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`px-3 py-2 rounded-2xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50/80 text-rose-900' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs text-slate-800 line-clamp-1 font-medium leading-snug">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{post.user?.name || 'Ẩn danh'}</span>
                      {post.pet_name && <span>• 🐾 {post.pet_name}</span>}
                      {post.likes_count > 0 && <span>• ❤️ {post.likes_count}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. TAGS */}
          {results.tags?.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏷️</span> Thẻ chủ đề
              </div>
              <div className="flex flex-wrap gap-1.5 px-3 py-1">
                {results.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleItemSelect({ type: 'tag', item: tag })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-[#ff4757] text-[11px] font-bold border border-slate-200 transition cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Footer Action */}
          <div
            onClick={handleSubmit}
            className="p-3 bg-slate-50/80 hover:bg-rose-50 text-[#ff4757] text-xs font-bold text-center cursor-pointer transition-colors flex items-center justify-center gap-1"
          >
            <span>Xem tất cả kết quả cho</span>
            <span className="underline truncate max-w-[200px]">"{query}"</span>
            <span>→</span>
          </div>
        </div>
      )}
    </div>
  );
}
