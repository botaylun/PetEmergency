import { DEFAULT_MALE_AVATAR, DEFAULT_FEMALE_AVATAR } from '../constants/avatars';

/**
 * Format date string or ISO timestamp into Vietnamese relative time
 * e.g., "Vừa xong", "15 phút trước", "2 giờ trước", "3 ngày trước"
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return 'Vừa xong';

  // If already relative string in Vietnamese, return as is
  if (typeof dateInput === 'string' && (
    dateInput.includes('trước') ||
    dateInput.includes('Vừa xong') ||
    dateInput.includes('hôm nay')
  )) {
    return dateInput;
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
      return 'Vừa xong';
    }
    if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} phút trước`;
    }
    if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours} giờ trước`;
    }
    if (diffSeconds < 604800) {
      const days = Math.floor(diffSeconds / 86400);
      return `${days} ngày trước`;
    }

    // Format DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (_) {
    return String(dateInput);
  }
}

/**
 * Format full date & time for tooltips e.g. "14:30, 19/09/2026"
 */
export function formatFullDateTime(dateInput) {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes}, ${day}/${month}/${year}`;
  } catch (_) {
    return String(dateInput);
  }
}

/**
 * Robust image error handler that prevents infinite error loops
 */
export function handleAvatarError(event, isDoctor = false, gender = 'male') {
  event.target.onerror = null;
  if (isDoctor) {
    event.target.src = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop';
  } else {
    event.target.src = gender === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR;
  }
}
