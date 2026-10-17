import React, { useRef } from 'react';
import Avatar from './Avatar';

/**
 * ===================================================================
 * NODE.JS BACKEND SPECIFICATION
 * ===================================================================
 * Endpoint: POST /api/user/avatar
 * Content-Type: multipart/form-data
 * 
 * Form Field:
 * - avatar: Binary File (image/jpeg, image/png, image/webp)
 * 
 * Response (200 OK):
 * {
 *   "success": true,
 *   "message": "Cập nhật ảnh đại diện thành công",
 *   "avatarUrl": "/uploads/avatars/user_102.jpg"
 * }
 * ===================================================================
 */

export default function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  showToast,
  size = 'w-12 h-12',
  cameraSize = 'w-5 h-5',
  disabled = false,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WEBP).', 'error');
      return;
    }

    // 1. Tạo preview tức thì cho UI mượt mà bằng URL.createObjectURL
    const previewUrl = URL.createObjectURL(file);
    if (onAvatarChange) onAvatarChange(previewUrl, file);
    if (showToast) showToast('Đã cập nhật ảnh đại diện mới thành công!', 'success');

    // 2. Gửi tệp nhị phân lên Node.js Backend
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.warn('API /api/user/avatar offline mode:', err.message);
    }
  };

  return (
    <div className={`relative inline-block ${size} flex-shrink-0 group`}>
      {/* Khung ảnh đại diện bo tròn */}
      <Avatar
        src={currentAvatar}
        size={size}
        className="border-2 border-rose-100 shadow-sm transition-transform group-hover:scale-105"
      />

      {/* Input File ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={disabled}
      />

      {/* Nút icon Camera đè lên góc dưới */}
      <button
        type="button"
        onClick={() => !disabled && fileInputRef.current?.click()}
        disabled={disabled}
        title="Đổi ảnh đại diện từ máy tính"
        className={`absolute bottom-0 right-0 ${cameraSize} rounded-full bg-slate-900/80 hover:bg-[#ff4757] text-white flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 border border-white ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-2.5 h-2.5"
        >
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      </button>
    </div>
  );
}
