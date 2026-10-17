import React, { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_MALE_AVATAR, DEFAULT_FEMALE_AVATAR } from '../constants/avatars';
import Avatar from './Avatar';
import { formatTimeAgo } from '../utils/formatters';

/**
 * ===================================================================
 * NODE.JS BACKEND SPECIFICATION
 * ===================================================================
 * Endpoint: POST /api/posts/:postId/comments
 * Headers:  Authorization: Bearer <token> (BẮT BUỘC ĐĂNG NHẬP)
 * 
 * Request Body:
 * {
 *   "text": "Bác sĩ cho em hỏi bé có cần kiêng ăn dầu mỡ không ạ?"
 * }
 * 
 * Response (201 Created):
 * {
 *   "success": true,
 *   "comment": {
 *     "id": "cmt_89",
 *     "postId": "post_1",
 *     "author": "Nguyễn Minh Anh",
 *     "role": "user", // hoặc "doctor"
 *     "specialty": null,
 *     "avatar": "https://...",
 *     "text": "...",
 *     "isDoctorAdvice": false,
 *     "createdAt": "2026-09-16T14:15:00Z"
 *   }
 * }
 * ===================================================================
 */

const CommentSection = forwardRef(
  ({ postId, initialComments = [], isLoggedIn, currentUser, onRequireAuth, onCommentAdded, onViewProfile }, ref) => {
    const [comments, setComments] = useState(initialComments);
    const [inputText, setInputText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tự động sắp xếp: Các câu trả lời từ Bác Sĩ (Doctor's Advice) được GHIM LÊN ĐẦU
    const sortedComments = [...comments].sort((a, b) => {
      const aIsDoc = a.role === 'doctor' || a.isDoctorAdvice ? 1 : 0;
      const bIsDoc = b.role === 'doctor' || b.isDoctorAdvice ? 1 : 0;
      return bIsDoc - aIsDoc; // Bác sĩ xếp trước
    });

    const handleSendComment = async (e) => {
      if (e) e.preventDefault();

      // 1. Kiểm tra trạng thái đăng nhập
      if (!isLoggedIn || !currentUser) {
        onRequireAuth('Vui lòng đăng nhập để viết bình luận và đặt câu hỏi!');
        return;
      }

      const cleanText = inputText.trim();
      if (!cleanText) return;

      // 2. Optimistic UI: Hiển thị ngay tức thì lên màn hình
      const tempId = 'temp_' + Date.now();
      const isDoc = currentUser.role === 'doctor';
      const newComment = {
        id: tempId,
        author: currentUser.name || 'Thành viên',
        role: currentUser.role || 'user',
        specialty: isDoc ? currentUser.specialty || 'Bác sĩ Thú y' : null,
        clinicName: isDoc ? currentUser.clinicName || 'Bệnh viện thú y' : null,
        avatar: currentUser.avatar || (currentUser.gender === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR),
        text: cleanText,
        isDoctorAdvice: isDoc,
        createdAt: 'Vừa xong',
      };

      setComments((prev) => [...prev, newComment]);
      setInputText('');

      if (onCommentAdded) {
        onCommentAdded(newComment);
      }

      // 3. Gửi sang Backend
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/v1/forum/posts/${postId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ content: cleanText }),
        });

        if (!response.ok) throw new Error('Lỗi khi gửi bình luận');

        const data = await response.json();
        if (data.data?.id) {
          const serverComment = {
            id: data.data.id,
            author: data.data.user?.name || newComment.author,
            role: data.data.user?.role || 'user',
            isDoctorAdvice: data.data.user?.role === 'doctor',
            specialty: data.data.user?.specialty || null,
            avatar: data.data.user?.avatar_url || newComment.avatar,
            text: data.data.content,
            createdAt: data.data.created_at,
          };
          setComments(prev => prev.map(c => c.id === tempId ? serverComment : c));
        }
      } catch (err) {
        console.warn('Comment API offline mode:', err.message);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendComment();
      }
    };

    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        {/* Danh sách bình luận */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
          {sortedComments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-1">
              Chưa có bình luận nào. Hãy là người đầu tiên để lại phản hồi!
            </p>
          ) : (
            sortedComments.map((comment) => {
              const isDoctor = comment.role === 'doctor' || comment.isDoctorAdvice;
              return (
                <div
                  key={comment.id}
                  className={`p-3 rounded-2xl transition-all ${
                    isDoctor
                      ? 'bg-gradient-to-r from-blue-50/90 to-cyan-50/50 border border-blue-200 border-l-4 border-l-blue-600 shadow-sm'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Link
                      to={`/u/${comment.userId || comment.user_id || 1}`}
                      className="flex-shrink-0"
                    >
                      <Avatar
                        src={comment.avatar}
                        name={comment.author}
                        size="w-7 h-7 text-[10px]"
                        isDoctor={isDoctor}
                        verified={isDoctor}
                        className={`mt-0.5 border hover:opacity-80 transition ${
                          isDoctor ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
                        }`}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <Link
                          to={`/u/${comment.userId || comment.user_id || 1}`}
                          className="font-bold text-slate-800 text-xs hover:text-[#ff4757] transition-colors"
                        >
                          {comment.author}
                        </Link>

                        {/* Huy Hiệu Bác Sĩ Ghim Nổi Bật (Doctor's Advice) */}
                        {isDoctor && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shadow-sm">
                            <span>🩺</span>
                            <span>Bác sĩ Thú y Xác minh</span>
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 ml-auto">
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>

                      {/* Phụ đề phòng khám nếu là bác sĩ */}
                      {isDoctor && comment.specialty && (
                        <p className="text-[10px] text-blue-700 font-semibold mb-1">
                          {comment.specialty} {comment.clinicName ? `• ${comment.clinicName}` : ''}
                        </p>
                      )}

                      <p className="text-xs text-slate-700 leading-relaxed break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
             Ô NHẬP BÌNH LUẬN (CHẶN NẾU CHƯA ĐĂNG NHẬP)
           ══════════════════════════════════════════════════════════ */}
        {isLoggedIn ? (
          <form onSubmit={handleSendComment} className="flex items-center gap-2">
            <input
              ref={ref}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentUser?.role === 'doctor'
                  ? 'Viết lời khuyên chuyên môn bác sĩ...'
                  : 'Viết bình luận cho bé cưng...'
              }
              className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b81] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputText.trim()}
              className="px-5 py-2.5 rounded-full bg-[#ff4757] hover:bg-[#ff6b81] active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-200"
            >
              Gửi
            </button>
          </form>
        ) : (
          /* Khối thông báo khi CHƯA ĐĂNG NHẬP */
          <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium pl-2">
              🔒 Bạn phải đăng nhập để viết bình luận và tương tác cùng bác sĩ.
            </span>
            <button
              type="button"
              onClick={() => onRequireAuth('Vui lòng đăng nhập để viết bình luận!')}
              className="px-4 py-1.5 rounded-full bg-[#ff4757] hover:bg-[#ff6b81] text-white text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Đăng Nhập Ngay
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default CommentSection;
