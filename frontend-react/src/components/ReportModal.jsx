import React, { useState } from 'react';
import axios from 'axios';

const REASONS = [
  { value: 'spam',           label: '🚫 Spam / Quảng cáo' },
  { value: 'inappropriate',  label: '🔞 Nội dung không phù hợp' },
  { value: 'misinformation', label: '⚠️ Thông tin sai lệch' },
  { value: 'harassment',     label: '😡 Quấy rối / Bạo lực' },
  { value: 'off_topic',      label: '📌 Không liên quan thú cưng' },
  { value: 'other',          label: '📝 Lý do khác' },
];

export default function ReportModal({ postId, postAuthor, onClose, showToast }) {
  const [reason, setReason]           = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { showToast('Vui lòng chọn lý do báo cáo!', 'error'); return; }

    setSubmitting(true);
    try {
      await axios.post(`/api/v1/forum/posts/${postId}/report`, { reason, description });
      showToast('✅ Đã gửi báo cáo! Chúng tôi sẽ xem xét sớm nhất.', 'success');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi gửi báo cáo.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-xl">🚩</div>
            <div>
              <h3 className="font-extrabold text-slate-800">Báo Cáo Bài Viết</h3>
              <p className="text-[11px] text-slate-400">của {postAuthor}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl cursor-pointer transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason selection */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2">Chọn lý do báo cáo: <span className="text-red-500">*</span></p>
            <div className="space-y-2">
              {REASONS.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                    reason === r.value
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-slate-200 hover:border-rose-200'
                  }`}>
                  <input
                    type="radio" name="reason" value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-rose-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Mô tả thêm (tuỳ chọn)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết vấn đề bạn thấy với bài viết này..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all cursor-pointer">
              Hủy
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-2">
              {submitting ? <><span className="animate-spin">⏳</span> Đang gửi...</> : '🚩 Gửi Báo Cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
