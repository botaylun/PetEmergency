import React, { useState } from 'react';
import Avatar from './Avatar';

const REVIEWS_SEED = [
  {
    id: 'r1', author: 'Nguyễn Thu Hà', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop',
    rating: 5, text: 'Bác sĩ rất nhiệt tình và chuyên nghiệp! Bé cún nhà tôi được chăm sóc rất tốt. Phòng khám sạch sẽ, trang thiết bị hiện đại. Rất hài lòng!',
    date: '2 ngày trước', petName: 'Cún Bông',
  },
  {
    id: 'r2', author: 'Trần Minh Tuấn', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop',
    rating: 5, text: 'Bác sĩ giải thích rõ ràng từng bước điều trị, tôi hoàn toàn yên tâm khi giao phó sức khỏe bé mèo cho bác sĩ. Sẽ quay lại!',
    date: '1 tuần trước', petName: 'Mèo Cam',
  },
  {
    id: 'r3', author: 'Lê Phương Linh', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop',
    rating: 4, text: 'Phục vụ tốt, bác sĩ có tâm và kinh nghiệm. Thời gian chờ hơi lâu một chút nhưng chất lượng điều trị rất đáng tin cậy.',
    date: '2 tuần trước', petName: 'Thỏ Trắng',
  },
];

function StarRating({ value, onChange, size = 'text-2xl', readonly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = readonly ? value : (hovered || value);

  return (
    <div className={`flex gap-0.5 ${readonly ? '' : 'cursor-pointer'}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`${size} transition-transform ${!readonly && 'hover:scale-125'} select-none`}
          style={{ color: star <= display ? '#f59e0b' : '#d1d5db' }}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange && onChange(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function DoctorRating({ doctor, isLoggedIn, currentUser, onRequireAuth, showToast }) {
  const [reviews, setReviews] = useState(REVIEWS_SEED);
  const [myRating, setMyRating]       = useState(0);
  const [myReview, setMyReview]       = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { onRequireAuth('Đăng nhập để đánh giá bác sĩ!'); return; }
    if (myRating === 0) { showToast('Vui lòng chọn số sao đánh giá!', 'error'); return; }
    if (!myReview.trim()) { showToast('Vui lòng nhập nhận xét của bạn!', 'error'); return; }
    if (hasReviewed) { showToast('Bạn đã đánh giá bác sĩ này rồi!', 'error'); return; }

    setSubmitting(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 800));

    const newReview = {
      id: 'r_' + Date.now(),
      author: currentUser?.name || 'Ẩn danh',
      avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=60&h=60&fit=crop',
      rating: myRating,
      text: myReview.trim(),
      date: 'Vừa xong',
      petName: 'Thú cưng của bạn',
    };

    setReviews(prev => [newReview, ...prev]);
    setHasReviewed(true);
    setMyRating(0);
    setMyReview('');
    setSubmitting(false);
    showToast('✅ Cảm ơn bạn đã đánh giá! Nhận xét đã được gửi.', 'success');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          ⭐ Đánh Giá & Nhận Xét
        </h3>

        {/* Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Big score */}
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-black text-amber-500 leading-none">{avgRating}</div>
            <StarRating value={Math.round(parseFloat(avgRating))} size="text-xl" readonly />
            <p className="text-xs text-slate-400 mt-1">{reviews.length} đánh giá</p>
          </div>

          {/* Bar chart */}
          <div className="flex-1 w-full space-y-1.5">
            {ratingDist.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 w-3 text-right">{star}</span>
                <span className="text-amber-400 text-sm leading-none">★</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-6">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Write Review */}
      <div className="p-6 bg-gradient-to-br from-amber-50/50 to-rose-50/30 border-b border-slate-100">
        <h4 className="text-sm font-bold text-slate-700 mb-3">
          {hasReviewed ? '✅ Bạn đã gửi đánh giá' : '✍️ Viết Đánh Giá Của Bạn'}
        </h4>

        {hasReviewed ? (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
            <span className="text-base">🙏</span>
            Cảm ơn bạn đã đánh giá! Phản hồi của bạn giúp cộng đồng tìm được bác sĩ tốt nhất.
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Chọn số sao đánh giá:</p>
              <StarRating value={myRating} onChange={setMyRating} size="text-3xl" />
            </div>
            <textarea
              value={myReview}
              onChange={e => setMyReview(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn với bác sĩ này... (VD: Bác sĩ rất tận tình, giải thích rõ ràng...)"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !isLoggedIn}
              onClick={() => !isLoggedIn && onRequireAuth('Đăng nhập để đánh giá!')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-amber-100 transition-all cursor-pointer flex items-center gap-2"
            >
              {submitting ? <><span className="animate-spin">⏳</span> Đang gửi...</> : '⭐ Gửi Đánh Giá'}
            </button>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-slate-100">
        {reviews.map(review => (
          <div key={review.id} className="p-5 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-start gap-3">
              <Avatar
                src={review.avatar}
                name={review.author}
                size="w-10 h-10 text-xs"
                className="flex-shrink-0 border-2 border-slate-100"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <span className="text-sm font-bold text-slate-800">{review.author}</span>
                    {review.petName && (
                      <span className="ml-1.5 text-[11px] text-slate-400">• 🐾 {review.petName}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">{review.date}</span>
                </div>
                <StarRating value={review.rating} size="text-sm" readonly />
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{review.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
