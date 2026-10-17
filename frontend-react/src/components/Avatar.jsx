import React, { useState, useEffect } from 'react';
import {
  DEFAULT_MALE_AVATAR,
  DEFAULT_DOCTOR_AVATAR,
  DEFAULT_PET_DOG_AVATAR,
} from '../constants/avatars';

const SIZE_MAP = {
  xs:  'w-6 h-6 text-[10px]',
  sm:  'w-8 h-8 text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-14 h-14 text-lg',
  xl:  'w-20 h-20 text-2xl',
  '2xl': 'w-28 h-28 text-3xl',
  '3xl': 'w-36 h-36 text-4xl',
};

const BG_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'
];

function getInitials(name = '') {
  if (!name) return '🐾';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorByName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % BG_COLORS.length;
  return BG_COLORS[idx];
}

/**
 * Avatar — Thành phần đại diện dùng chung trong toàn bộ ứng dụng
 * Tự động xử lý fallback khi ảnh hỏng (onError) và tránh hotlink ngoài.
 */
export default function Avatar({
  src,
  name = '',
  size = 'md',
  isDoctor = false,
  verified = false,
  className = '',
  onClick = null,
  alt = '',
}) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClass = SIZE_MAP[size] || size;
  const isClickable = Boolean(onClick);

  const initials = getInitials(name);
  const bgColor = isDoctor ? 'bg-blue-600' : getColorByName(name);

  // Check if image is present and has not failed
  const hasValidSrc = Boolean(src) && !imgError;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full flex-shrink-0 select-none overflow-hidden ${sizeClass} ${isClickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      title={name || alt}
    >
      {hasValidSrc ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white font-bold tracking-wider rounded-full shadow-inner ${bgColor}`}>
          {isDoctor ? (
            <span className="text-center font-extrabold">{initials}</span>
          ) : (
            <span>{initials}</span>
          )}
        </div>
      )}

      {/* Verified doctor checkmark badge */}
      {(verified || (isDoctor && verified)) && (
        <div
          title="Bác sĩ đã xác thực"
          className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white flex items-center justify-center shadow-sm"
          style={{ width: '38%', height: '38%', minWidth: '12px', minHeight: '12px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
