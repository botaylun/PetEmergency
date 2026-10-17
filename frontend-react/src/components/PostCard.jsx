import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import { DEFAULT_PET_DOG_AVATAR, DEFAULT_MALE_AVATAR } from '../constants/avatars';
import Avatar from './Avatar';
import { formatTimeAgo, formatFullDateTime } from '../utils/formatters';

const TAG_COLORS = {
  'Sơ cứu':     'bg-red-100 text-red-700 border-red-200',
  'Cấp cứu':    'bg-red-100 text-red-700 border-red-200',
  'Sức khỏe':   'bg-blue-100 text-blue-700 border-blue-200',
  'Vaccine':     'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Dinh dưỡng': 'bg-green-100 text-green-700 border-green-200',
  'Mèo':        'bg-purple-100 text-purple-700 border-purple-200',
  'Chó':        'bg-amber-100 text-amber-700 border-amber-200',
  'Hỏi bác sĩ':'bg-pink-100 text-pink-700 border-pink-200',
  'Mẹo hay':    'bg-teal-100 text-teal-700 border-teal-200',
  'default':    'bg-slate-100 text-slate-600 border-slate-200',
};

export default function PostCard({
  post, isLoggedIn, currentUser, onRequireAuth,
  onLiked, onCommentAdded, onPostDeleted, onViewProfile,
}) {
  const [isLiked, setIsLiked]             = useState(post.isLiked || false);
  const [likesCount, setLikesCount]       = useState(post.likesCount || 0);
  const [isAnimatePop, setIsAnimatePop]   = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments?.length || 0);
  const [sharesCount, setSharesCount]     = useState(post.sharesCount || 0);
  const [isSaved, setIsSaved]             = useState(false);
  const [savedCount, setSavedCount]       = useState(post.savedCount || 0);
  const [showLockedTooltip, setShowLockedTooltip] = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [isEditing, setIsEditing]         = useState(false);
  const [editContent, setEditContent]     = useState(post.caption || post.content || '');
  const [saving, setSaving]               = useState(false);
  const [deleted, setDeleted]             = useState(false);

  const commentInputRef = useRef(null);
  const menuRef         = useRef(null);

  const isOwner = Boolean(
    currentUser && (
      (post.authorId != null && String(currentUser.id) === String(post.authorId)) ||
      (post.authorId == null && currentUser.name && currentUser.name === post.authorName)
    )
  );
  const isAdmin  = currentUser?.role === 'admin';
  const isAuthorDoctor = post.authorRole === 'doctor';

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (deleted) return null;

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleToggleLike = async () => {
    if (!isLoggedIn || !currentUser) {
      onRequireAuth('Vui lòng đăng nhập để thả tim!'); return;
    }
    const nextState = !isLiked;
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextState);
    setLikesCount(nextCount);
    setIsAnimatePop(true);
    setTimeout(() => setIsAnimatePop(false), 350);
    if (onLiked) onLiked(post.id, nextCount, nextState);
    try {
      await fetch(`/api/v1/forum/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...(currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {}),
        },
      });
    } catch (err) { console.warn('Like fallback:', err.message); }
  };

  // ── Comment focus ──────────────────────────────────────────────────────────
  const handleCommentFocus = () => {
    if (!isLoggedIn || !currentUser) {
      onRequireAuth('Vui lòng đăng nhập để bình luận!'); return;
    }
    commentInputRef.current?.focus();
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (!isLoggedIn) { onRequireAuth('Đăng nhập để chia sẻ!'); return; }
    const url = `${window.location.origin}?post=${post.id}`;
    navigator.clipboard?.writeText(url);
    setShowMenu(false);
    alert('Đã sao chép link bài viết!');
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài viết này?')) return;
    setShowMenu(false);
    try {
      await fetch(`/api/v1/forum/posts/${post.id}`, {
        method: 'DELETE', credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...(currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {}),
        },
      });
      setDeleted(true);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (err) {
      // Fallback local delete
      setDeleted(true);
      if (onPostDeleted) onPostDeleted(post.id);
    }
  };

  // ── Toggle Bookmark ─────────────────────────────────────────────────────────
  const handleToggleSave = () => {
    if (!isLoggedIn) { onRequireAuth('Đăng nhập để lưu bài viết!'); return; }
    const next = !isSaved;
    setIsSaved(next);
    setSavedCount(prev => next ? prev + 1 : Math.max(0, prev - 1));
  };

  // ── Share + copy link ───────────────────────────────────────────────────────
  const handleShareCopy = () => {
    const url = `${window.location.origin}?post=${post.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setSharesCount(prev => prev + 1);
  };

  // ── Format date Vietnamese ──────────────────────────────────────────────────
  const formatDate = (raw) => {
    if (!raw || raw === 'Vừa xong') return 'Vừa xong';
    try {
      const d = new Date(raw);
      if (isNaN(d)) return raw;
      return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return raw; }
  };

  const formatCount = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0','') + 'K';
    return String(n);
  };

  // ── Save post edit (chỉ chủ bài viết) ──────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    if (!isOwner) {
      alert('Bạn chỉ có quyền chỉnh sửa bài viết do chính bạn tạo!');
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/forum/posts/${post.id}`, {
        method: 'PUT', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {}),
        },
        body: JSON.stringify({ content: editContent, user_id: currentUser?.id }),
      });
      const data = await res.json();
      if (data.success) {
        post.caption = editContent;
        setIsEditing(false);
      } else {
        alert(data.message || 'Chỉnh sửa không thành công.');
        setIsEditing(false);
      }
    } catch {
      post.caption = editContent;
      setIsEditing(false);
    }
    finally { setSaving(false); }
  };

  const tagColor = (tag) => TAG_COLORS[tag] || TAG_COLORS.default;

  return (
    <>
      {/* Report Modal */}
      {showReport && (
        <ReportModal
          postId={post.id}
          postAuthor={post.authorName}
          onClose={() => setShowReport(false)}
          showToast={(m, t) => console.log(m)}
        />
      )}

      <article className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {/* Avatar tác giả + pet thumbnail */}
            <Link
              to={`/u/${post.authorId || 1}`}
              className="relative flex-shrink-0 hover:opacity-85 transition block"
            >
              <Avatar
                src={post.authorAvatar}
                name={post.authorName}
                size="w-12 h-12 text-base"
                isDoctor={isAuthorDoctor}
                verified={isAuthorDoctor}
                className="border-2 border-rose-100 shadow-sm"
              />
              {post.petAvatar && !post.pets?.length && (
                <img
                  src={post.petAvatar}
                  alt={post.petName || 'Thú cưng'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_PET_DOG_AVATAR;
                  }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg object-cover border-2 border-white shadow-sm"
                />
              )}
            </Link>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/u/${post.authorId || 1}`}
                  className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight hover:text-[#ff4757] transition-colors"
                >
                  {post.authorName || 'Ẩn danh'}
                </Link>
                {isAuthorDoctor && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-extrabold border border-blue-200">
                    🩺 Bác sĩ Thú y
                  </span>
                )}
              </div>

              {/* Pet Chips (Part C: Tagged pets 0-3) */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {Array.isArray(post.pets) && post.pets.length > 0 ? (
                  post.pets.map(pet => (
                    pet.is_public !== false ? (
                      <Link
                        key={pet.id}
                        to={pet.qr_token ? `/pet/${pet.qr_token}` : `/u/${post.authorId || 1}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#ff4757] text-[11px] font-bold border border-rose-100 transition"
                      >
                        <img
                          src={pet.avatar || pet.photo_url || DEFAULT_PET_DOG_AVATAR}
                          alt={pet.name || pet.pet_name}
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                        <span>{pet.name || pet.pet_name}</span>
                      </Link>
                    ) : (
                      <span
                        key={pet.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200"
                      >
                        <img
                          src={pet.avatar || pet.photo_url || DEFAULT_PET_DOG_AVATAR}
                          alt={pet.name || pet.pet_name}
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                        <span>{pet.name || pet.pet_name}</span>
                      </span>
                    )
                  ))
                ) : post.petName ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-[#ff4757] text-[11px] font-bold border border-rose-100">
                    🐾 <strong>{post.petName}{post.petBreed ? ` (${post.petBreed})` : ''}</strong>
                  </span>
                ) : null}

                <span title={formatFullDateTime(post.createdAt)} className="text-xs text-slate-400 cursor-help hover:text-slate-600 transition-colors">
                  {formatTimeAgo(post.createdAt)}
                </span>
                {isAuthorDoctor && post.authorSpecialty && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-500 text-xs truncate max-w-[140px]">{post.authorSpecialty}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── 3-DOT MENU ──────────────────────────────────────────────── */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Tùy chọn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-9 z-30 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 min-w-[160px] animate-in zoom-in-95 duration-150">
                {(isOwner || isAdmin) && (
                  <>
                    {isOwner && (
                      <button
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        ✏️ Chỉnh sửa
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      🗑️ Xóa bài viết
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}
                <button
                  onClick={handleShare}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  🔗 Sao chép link
                </button>
                {isLoggedIn && !isOwner && (
                  <button
                    onClick={() => { setShowReport(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    🚩 Báo cáo
                  </button>
                )}
                {!isLoggedIn && (
                  <button
                    onClick={() => { onRequireAuth('Đăng nhập để báo cáo!'); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    🚩 Báo cáo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── TAGS ────────────────────────────────────────────────────────── */}
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="px-4 sm:px-5 pb-2 flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <span key={tag}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tagColor(tag)}`}>
                # {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── MEDIA ───────────────────────────────────────────────────────── */}
        {post.mediaUrl && post.mediaType !== 'none' && (
          <div className="w-full bg-slate-950 flex items-center justify-center max-h-[520px] overflow-hidden">
            {post.mediaType === 'video' ? (
              <video src={post.mediaUrl} controls playsInline className="w-full h-auto max-h-[520px] object-contain" />
            ) : (
              <img src={post.mediaUrl} alt={post.caption} className="w-full h-auto max-h-[520px] object-cover" />
            )}
          </div>
        )}

        {/* ── ACTIONS + CAPTION + COMMENTS ────────────────────────────────── */}
        <div className="p-4 sm:p-5">
          <div className="relative">
            {showLockedTooltip && !isLoggedIn && (
              <div className="absolute -top-10 left-0 bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg z-20 whitespace-nowrap animate-in fade-in">
                🔒 Vui lòng đăng nhập để tương tác!
              </div>
            )}

            {/* ── STATS BAR (Instagram style) ────────────────────────────── */}
            <div className="flex items-center justify-between mb-2">
              {/* Left: Like + Comment + Share */}
              <div className="flex items-center gap-3 sm:gap-4">

                {/* Like ❤️ */}
                <button type="button" onClick={handleToggleLike}
                  onMouseEnter={() => !isLoggedIn && setShowLockedTooltip(true)}
                  onMouseLeave={() => setShowLockedTooltip(false)}
                  className={`flex items-center gap-1.5 transition-all ${
                    !isLoggedIn ? 'opacity-50 text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:text-[#ff4757] cursor-pointer group'
                  }`}>
                  <svg viewBox="0 0 24 24"
                    fill={isLiked ? '#ff4757' : 'none'}
                    stroke={isLiked ? '#ff4757' : 'currentColor'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`w-6 h-6 transition-transform ${isAnimatePop ? 'scale-125 rotate-6' : 'group-hover:scale-110'}`}>
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  <span className={`text-xs font-bold tabular-nums ${isLiked ? 'text-[#ff4757]' : 'text-slate-600'}`}>
                    {formatCount(likesCount)}
                  </span>
                </button>

                {/* Comment 💬 */}
                <button type="button" onClick={handleCommentFocus}
                  onMouseEnter={() => !isLoggedIn && setShowLockedTooltip(true)}
                  onMouseLeave={() => setShowLockedTooltip(false)}
                  className={`flex items-center gap-1.5 transition-all ${
                    !isLoggedIn ? 'opacity-50 text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-[#ff4757] cursor-pointer group'
                  }`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="w-6 h-6 group-hover:scale-110 transition-transform">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  </svg>
                  <span className="text-xs font-bold tabular-nums text-slate-600">{formatCount(commentsCount)}</span>
                </button>

                {/* Share 🔁 */}
                <button type="button" onClick={() => { if (!isLoggedIn) { onRequireAuth('Đăng nhập để chia sẻ!'); return; } handleShareCopy(); setShowMenu(false); }}
                  className={`flex items-center gap-1.5 transition-all ${
                    !isLoggedIn ? 'opacity-50 text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-blue-500 cursor-pointer group'
                  }`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="w-6 h-6 group-hover:scale-110 transition-transform">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  <span className="text-xs font-bold tabular-nums text-slate-600">{formatCount(sharesCount)}</span>
                </button>

              </div>

              {/* Right: Bookmark 🔖 */}
              <button type="button" onClick={handleToggleSave}
                onMouseEnter={() => !isLoggedIn && setShowLockedTooltip(true)}
                onMouseLeave={() => setShowLockedTooltip(false)}
                title={isSaved ? 'Bỏ lưu' : 'Lưu bài viết'}
                className={`flex items-center gap-1.5 transition-all ${
                  !isLoggedIn ? 'opacity-50 cursor-not-allowed text-slate-400' : 'cursor-pointer group'
                }`}>
                <svg viewBox="0 0 24 24"
                  fill={isSaved ? '#f59e0b' : 'none'}
                  stroke={isSaved ? '#f59e0b' : 'currentColor'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-6 h-6 group-hover:scale-110 transition-transform">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
                {savedCount > 0 && (
                  <span className={`text-xs font-bold tabular-nums ${isSaved ? 'text-amber-500' : 'text-slate-500'}`}>
                    {formatCount(savedCount)}
                  </span>
                )}
              </button>
            </div>

            {/* ── LIKES SUMMARY LINE ───────────────────────────────────────── */}
            <p className="text-[13px] font-bold text-slate-800 mb-1">
              {likesCount > 0 ? (
                <>{formatCount(likesCount)} <span className="font-normal text-slate-600">lượt thích</span></>
              ) : (
                <span className="font-normal text-slate-500">Hãy là người đầu tiên thả tim ❤️</span>
              )}
            </p>
          </div>

          {/* Caption / Edit mode */}
          {isEditing ? (
            <div className="mb-3">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-blue-300 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-200 transition-colors">
                  Hủy
                </button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-60">
                  {saving ? '⏳ Đang lưu...' : '✅ Lưu thay đổi'}
                </button>
              </div>
            </div>
          ) : (
            (editContent || post.caption) && (
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-1">
                <span className="font-bold text-slate-900 mr-2">{post.authorName}</span>
                <span>{editContent || post.caption}</span>
              </div>
            )
          )}

          {/* ── DATE TIMESTAMP (Instagram style) ──────────────────── */}
          <p className="text-[11px] text-slate-400 font-semibold mt-2 mb-0.5 uppercase tracking-wide">
            {formatDate(post.createdAt)}
          </p>

          {/* Comments */}
          <CommentSection
            ref={commentInputRef}
            postId={post.id}
            initialComments={post.comments || []}
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
            onRequireAuth={onRequireAuth}
            onViewProfile={onViewProfile}
            onCommentAdded={(newComment) => {
              setCommentsCount(prev => prev + 1);
              if (onCommentAdded) onCommentAdded(post.id, newComment);
            }}
          />
        </div>
      </article>
    </>
  );
}
