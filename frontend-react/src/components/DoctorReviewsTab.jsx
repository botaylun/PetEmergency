import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Avatar from './Avatar';
import { formatTimeAgo } from '../utils/formatters';

export default function DoctorReviewsTab({
  doctorId,
  currentUser,
  showToast,
  onRequireAuth,
}) {
  const [reviews, setReviews]           = useState([]);
  const [aggregate, setAggregate]       = useState({ average: 5.0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [loading, setLoading]           = useState(true);
  const [sortBy, setSortBy]             = useState('newest');
  const [canReview, setCanReview]       = useState(false);
  const [userReview, setUserReview]     = useState(null);

  // Form states
  const [rating, setRating]             = useState(5);
  const [hoverRating, setHoverRating]   = useState(0);
  const [comment, setComment]           = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);

  // Reply states
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText]       = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!doctorId) return;
    try {
      const headers = currentUser?.id ? { 'X-User-Id': String(currentUser.id) } : {};
      const res = await axios.get(`/api/v1/doctors/${doctorId}/reviews`, {
        params: { sort: sortBy },
        headers,
      });
      if (res.data?.success) {
        setReviews(res.data.data || []);
        if (res.data.aggregate) setAggregate(res.data.aggregate);
        setCanReview(Boolean(res.data.can_review));
        if (res.data.user_review) {
          setUserReview(res.data.user_review);
          setRating(res.data.user_review.rating || 5);
          setComment(res.data.user_review.comment || '');
        } else {
          setUserReview(null);
        }
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId, currentUser, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Submit new or updated review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth?.('Vui lòng đăng nhập để gửi đánh giá!');
      return;
    }
    if (rating < 1 || rating > 5) {
      showToast?.('Vui lòng chọn từ 1 đến 5 sao.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/v1/doctors/${doctorId}/reviews`, {
        rating,
        comment,
      }, {
        headers: { 'X-User-Id': String(currentUser.id) },
      });

      if (res.data?.success) {
        showToast?.(res.data.message || 'Đã gửi đánh giá thành công!', 'success');
        setIsEditingForm(false);
        fetchReviews();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Không thể lưu đánh giá.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      const res = await axios.delete(`/api/v1/doctors/${doctorId}/reviews/${reviewId}`, {
        headers: { 'X-User-Id': String(currentUser?.id) },
      });
      if (res.data?.success) {
        showToast?.('Đã xóa đánh giá.', 'info');
        setComment('');
        setRating(5);
        fetchReviews();
      }
    } catch (err) {
      showToast?.('Lỗi khi xóa đánh giá.', 'error');
    }
  };

  // Doctor reply
  const handleSendReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await axios.post(`/api/v1/doctors/${doctorId}/reviews/${reviewId}/reply`, {
        reply: replyText.trim(),
      }, {
        headers: { 'X-User-Id': String(currentUser?.id) },
      });
      if (res.data?.success) {
        showToast?.('Đã gửi phản hồi thành công!', 'success');
        setReplyingToId(null);
        setReplyText('');
        fetchReviews();
      }
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Lỗi gửi phản hồi.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Report review
  const handleReport = async (reviewId) => {
    const reason = window.prompt('Nhập lý do báo cáo đánh giá này (vi phạm, ngôn từ không phù hợp...):');
    if (!reason) return;
    try {
      const res = await axios.post(`/api/v1/doctors/${doctorId}/reviews/${reviewId}/report`, {
        reason,
      }, {
        headers: { 'X-User-Id': String(currentUser?.id) },
      });
      if (res.data?.success) {
        showToast?.('Đã gửi báo cáo đến ban quản trị.', 'info');
      }
    } catch (_) {
      showToast?.('Lỗi khi gửi báo cáo.', 'error');
    }
  };

  const isCurrentDoctor = currentUser && String(currentUser.id) === String(doctorId);
  const activeStar = hoverRating || rating;
  const dist = aggregate.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalCount = aggregate.total || 0;

  return (
    <div className="space-y-6">
      {/* ── AGGREGATE SUMMARY CARD ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left: Big Score */}
        <div className="text-center md:text-left space-y-1">
          <div className="text-5xl font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-2">
            <span>{aggregate.average?.toFixed(1) || '5.0'}</span>
            <span className="text-amber-400 text-4xl">★</span>
          </div>
          <p className="text-xs font-bold text-slate-400">
            Dựa trên <strong className="text-slate-700">{totalCount}</strong> lượt đánh giá thực tế
          </p>
          <div className="flex items-center justify-center md:justify-start gap-1 text-amber-400 text-lg pt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <span key={s}>{s <= Math.round(aggregate.average || 5) ? '★' : '☆'}</span>
            ))}
          </div>
        </div>

        {/* Middle: 5-to-1 Star Distribution Bars */}
        <div className="md:col-span-2 space-y-2">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = dist[stars] || 0;
            const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-bold text-slate-600 flex items-center gap-1">
                  <span>{stars}</span>
                  <span className="text-amber-400">★</span>
                </span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-slate-400 font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── WRITE REVIEW SECTION (OWNERS ONLY) ─────────────────────────── */}
      {canReview && (!userReview || isEditingForm) && (
        <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-6 border-2 border-rose-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>✍️</span>
              <span>{userReview ? 'Chỉnh Sửa Đánh Giá Của Bạn' : 'Viết Đánh Giá Về Bác Sĩ'}</span>
            </h4>
            {userReview && isEditingForm && (
              <button
                type="button"
                onClick={() => setIsEditingForm(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Hủy sửa
              </button>
            )}
          </div>

          {/* Star Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              Mức độ hài lòng của bạn <span className="text-[#ff4757]">*</span>:
            </label>
            <div className="flex items-center gap-1.5 cursor-pointer select-none">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  className="text-3xl sm:text-4xl transition-transform hover:scale-110 focus:outline-none"
                  style={{ color: s <= activeStar ? '#f59e0b' : '#cbd5e1' }}
                >
                  ★
                </button>
              ))}
              <span className="ml-3 text-xs font-extrabold text-slate-700">
                {activeStar === 5 && '🌟 Tuyệt vời & Chuyên nghiệp'}
                {activeStar === 4 && '👍 Rất tốt'}
                {activeStar === 3 && '👌 Bình thường'}
                {activeStar === 2 && '👎 Chưa hài lòng'}
                {activeStar === 1 && '⚠️ Rất thất vọng'}
              </span>
            </div>
          </div>

          {/* Comment input */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
              <label>Nhận xét chi tiết (tùy chọn):</label>
              <span className={comment.length > 900 ? 'text-red-500' : 'text-slate-400'}>
                {comment.length}/1000
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sự tận tâm, chuyên môn cấp cứu, sự ân cần của bác sĩ..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#ff4757] outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              🛡️ Đánh giá từ ca cấp cứu thực tế sẽ có huy hiệu xác thực
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-2xl bg-[#ff4757] hover:bg-[#ff6b81] disabled:opacity-60 text-white text-xs font-black shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? 'Đang gửi...' : (userReview ? 'Cập Nhật Đánh Giá' : 'Gửi Đánh Giá')}
            </button>
          </div>
        </form>
      )}

      {/* ── ALREADY REVIEWED CALLOUT ───────────────────────────────────── */}
      {canReview && userReview && !isEditingForm && (
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-rose-900 font-bold">
            <span>✅ Bạn đã đánh giá bác sĩ ({userReview.rating} sao).</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingForm(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition cursor-pointer"
            >
              ✏️ Sửa
            </button>
            <button
              onClick={() => handleDeleteReview(userReview.id)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200 transition cursor-pointer"
            >
              🗑️ Xóa
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWS LIST HEADER & SORT ─────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-base font-extrabold text-slate-900">
          Tất Cả Đánh Giá ({totalCount})
        </h3>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold outline-none cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="highest">Sao cao nhất</option>
            <option value="lowest">Sao thấp nhất</option>
          </select>
        </div>
      </div>

      {/* ── REVIEWS LIST ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white rounded-3xl border border-slate-100 p-5 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-4xl block">⭐</span>
          <h4 className="text-sm font-extrabold text-slate-800">Chưa có đánh giá nào</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy là người đầu tiên chia sẻ cảm nhận sau khi được bác sĩ hỗ trợ thăm khám hoặc sơ cứu!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(item => {
            const author = item.user || {};
            const isOwn = currentUser && String(currentUser.id) === String(item.user_id);
            const isReplying = replyingToId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm space-y-3 relative group"
              >
                {/* Author row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={author.avatar_url}
                      name={author.name}
                      size="md"
                      isDoctor={author.role === 'doctor'}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-extrabold text-slate-900">
                          {author.name || 'Chủ nuôi'}
                        </strong>
                        {item.is_verified_treatment && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                            <span>✓</span> Đã được bác sĩ hỗ trợ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="text-amber-400 font-bold">
                          {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Report or Edit/Delete */}
                  <div className="flex items-center gap-2 text-xs">
                    {isOwn ? (
                      <>
                        <button
                          onClick={() => {
                            setRating(item.rating);
                            setComment(item.comment || '');
                            setIsEditingForm(true);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }}
                          className="text-slate-400 hover:text-slate-700 font-semibold"
                        >
                          Sửa
                        </button>
                        <span>·</span>
                        <button
                          onClick={() => handleDeleteReview(item.id)}
                          className="text-slate-400 hover:text-red-500 font-semibold"
                        >
                          Xóa
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleReport(item.id)}
                        className="text-slate-300 hover:text-rose-500 font-semibold text-[11px]"
                        title="Báo cáo đánh giá không phù hợp"
                      >
                        🚩 Báo cáo
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment content */}
                {item.comment && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13">
                    {item.comment}
                  </p>
                )}

                {/* Doctor Public Reply */}
                {item.doctor_reply && (
                  <div className="ml-6 sm:ml-10 p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-blue-900 font-extrabold">
                      <span>🩺 Phản hồi từ Bác sĩ:</span>
                      <span className="text-[10px] text-blue-500 font-normal">
                        {formatTimeAgo(item.doctor_replied_at)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {item.doctor_reply}
                    </p>
                  </div>
                )}

                {/* Doctor Reply Action Button & Form */}
                {isCurrentDoctor && !item.doctor_reply && !isReplying && (
                  <div className="pl-13 pt-1">
                    <button
                      onClick={() => {
                        setReplyingToId(item.id);
                        setReplyText('');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
                    >
                      💬 Trả lời đánh giá này
                    </button>
                  </div>
                )}

                {/* Inline Reply Form */}
                {isCurrentDoctor && isReplying && (
                  <div className="ml-6 sm:ml-10 p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3 animate-in fade-in duration-200">
                    <span className="text-xs font-extrabold text-blue-900 block">
                      💬 Viết phản hồi công khai của bạn:
                    </span>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Cảm ơn bạn đã tin tưởng gửi gắm thú cưng cho phòng khám..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-blue-200 text-xs outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingToId(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={sendingReply || !replyText.trim()}
                        onClick={() => handleSendReply(item.id)}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold"
                      >
                        {sendingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
