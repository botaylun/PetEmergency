import React, { useState, useRef } from 'react';
import { DEFAULT_PET_DOG_AVATAR, DEFAULT_MALE_AVATAR } from '../constants/avatars';
import Avatar from './Avatar';

const QUICK_TAGS = [
  'Hỏi bác sĩ', 'Sức khỏe', 'Sơ cứu', 'Dinh dưỡng',
  'Vaccine', 'Mèo', 'Chó', 'Mẹo hay', 'Chia sẻ khoảnh khắc', 'Cấp cứu',
];

export default function CreatePost({
  isLoggedIn, currentUser, petsList = [],
  onRequireAuth, onPostCreated, showToast,
}) {
  const [caption, setCaption]       = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType]     = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null); // null = no pet attached

  const fileInputRef = useRef(null);

  const toggleTag = (tag) => {
    if (!isLoggedIn) { onRequireAuth('Đăng nhập để chọn tag!'); return; }
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  // selectedPet is null if user chose not to attach a pet
  const selectedPet = selectedPetId
    ? (petsList.find((p) => p.id === selectedPetId) || null)
    : null;

  const handleFileChange = (e) => {
    if (!isLoggedIn || !currentUser) {
      onRequireAuth('Vui lòng đăng nhập để đính kèm ảnh/video!');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      showToast('Vui lòng chỉ tải lên tệp tin Ảnh hoặc Video hợp lệ.', 'error');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(localUrl);
    setFileType(isVid ? 'video' : 'image');
  };

  const handleRemoveMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAppendHashtag = (tag) => {
    if (!isLoggedIn) {
      onRequireAuth('Vui lòng đăng nhập để viết bài!');
      return;
    }
    setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn || !currentUser) {
      onRequireAuth('Vui lòng đăng nhập để chia sẻ bài viết lên bảng tin!');
      return;
    }

    if (!caption.trim() && !selectedFile) {
      showToast('Vui lòng viết mô tả hoặc đính kèm ảnh/video cho bài đăng.', 'error');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('content', caption.trim());
      formData.append('user_id', currentUser.id);
      formData.append('author_name', currentUser.name);
      if (currentUser.avatar) formData.append('author_avatar', currentUser.avatar);
      if (selectedPet) {
        formData.append('petName', selectedPet.name);
        formData.append('petAvatar', selectedPet.avatar);
      }
      selectedTags.forEach(tag => formData.append('tags[]', tag));
      if (selectedFile) formData.append('media', selectedFile);

      const response = await fetch('/api/v1/forum/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-User-Id': String(currentUser.id),
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Lỗi máy chủ khi đăng bài viết.');

      const result = await response.json();
      showToast('Bài đăng đã được chia sẻ lên bảng tin!', 'success');

      if (onPostCreated && result.data) {
        onPostCreated({
          id: result.data.id,
          authorId: currentUser.id,
          petName: selectedPet ? selectedPet.name : null,
          petAvatar: selectedPet ? (selectedPet.avatar || DEFAULT_PET_DOG_AVATAR) : null,
          authorName: currentUser.name,
          authorRole: currentUser.role || 'user',
          authorAvatar: currentUser.avatar || (currentUser.gender === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR),
          authorSpecialty: currentUser.specialty || '',
          caption: result.data.content,
          mediaUrl: result.data.media_full_url || null,
          mediaType: result.data.media_type || 'none',
          tags: selectedTags,
          likesCount: 0, isLiked: false,
          comments: [], createdAt: 'Vừa xong',
        });
      }

      setCaption('');
      setSelectedTags([]);
      handleRemoveMedia();
    } catch (err) {
      console.warn('Local post fallback mode:', err.message);

      // Tạo bài đăng hiển thị với đầy đủ Tách biệt Avatar Thú Cưng vs Avatar Chủ Nuôi
      const fallbackPost = {
        id: 'post_' + Date.now(),
        authorId: currentUser.id,
        petName: selectedPet ? selectedPet.name : null,
        petAvatar: selectedPet ? (selectedPet.avatar || DEFAULT_PET_DOG_AVATAR) : null,
        authorName: currentUser.name,
        authorRole: currentUser.role || 'user',
        authorAvatar: currentUser.avatar || (currentUser.gender === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR),
        authorSpecialty: currentUser.specialty || '',
        caption: caption.trim(),
        mediaUrl:
          previewUrl ||
          'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
        mediaType: fileType || 'image',
        likesCount: 0,
        isLiked: false,
        aiMonitoring: selectedPet ? (selectedPet.aiMonitoring || false) : false,
        comments: [],
        createdAt: 'Vừa xong',
      };

      if (onPostCreated) {
        onPostCreated(fallbackPost);
      }

      showToast(selectedPet ? `Đã chia sẻ khoảnh khắc của bé "${selectedPet.name}"!` : 'Bài đăng đã được chia sẻ!', 'success');
      setCaption('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-100 mb-8 relative">
      {/* ══════════════════════════════════════════════════════════
           CHỌN BÉ CƯNG LÀM CHỦ THỂ BÀI VIẾT (TÁCH BIỆT PET AVATAR)
         ══════════════════════════════════════════════════════════ */}
        {/* Header: author info + optional pet selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {/* Pet avatar (if attached) or user avatar */}
          {selectedPet ? (
            <img
              src={selectedPet.avatar || DEFAULT_PET_DOG_AVATAR}
              alt={selectedPet.name}
              onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_PET_DOG_AVATAR; }}
              className="w-12 h-12 rounded-2xl object-cover border-2 shadow-sm bg-slate-50 flex-shrink-0 border-rose-200"
            />
          ) : (
            <Avatar
              src={currentUser?.avatar}
              name={currentUser?.name || 'Bạn'}
              size="w-12 h-12 text-sm"
              isDoctor={currentUser?.role === 'doctor'}
              verified={currentUser?.doctor_verified}
              className="rounded-2xl border-2 border-slate-200 flex-shrink-0"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-800">
                {selectedPet ? (
                  <>Đăng bài về: <span className="text-[#ff4757]">{selectedPet.name}</span></>
                ) : (
                  <>Chia sẻ với cộng đồng 🌟</>
                )}
              </h3>
              {currentUser?.role === 'doctor' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200">
                  🩺 Bác sĩ Thú y
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isLoggedIn
                ? `Đăng bởi ${currentUser?.name}`
                : 'Đăng nhập để chia sẻ câu chuyện của bé'}
            </p>
          </div>
        </div>

        {/* Pet selector toggle + dropdown */}
        <div className="flex items-center gap-2">
          {/* Toggle: attach / detach pet */}
          {petsList.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedPetId(selectedPetId ? null : (petsList[0]?.id || null))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedPetId
                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {selectedPetId ? '🐾 Bỏ bé cưng' : '🐾 Thêm bé cưng'}
            </button>
          )}
          {/* Dropdown only when a pet IS attached and there are multiple */}
          {selectedPetId && petsList.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Chọn bé:</span>
              <select
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#ff6b81]"
              >
                {petsList.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    🐾 {pet.name} ({pet.breed})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Khung Textarea */}
        <div className="relative">
          <textarea
            rows={3}
            value={caption}
            onFocus={() => {
              if (!isLoggedIn) {
                onRequireAuth('Vui lòng đăng nhập để viết bài đăng!');
              }
            }}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={
              isLoggedIn
                ? (selectedPet
                    ? `Hôm nay ${selectedPet.name} thế nào? Đặt câu hỏi cho bác sĩ hoặc chia sẻ kỷ niệm...`
                    : 'Hôm nay bạn muốn chia sẻ điều gì? Đặt câu hỏi cho bác sĩ hoặc tâm sự cùng cộng đồng...')
                : 'Vui lòng đăng nhập để chia sẻ bài viết và hỏi đáp cùng Bác sĩ Thú y...'
            }
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b81] focus:bg-white resize-none transition-all"
          />

          {!isLoggedIn && (
            <div
              onClick={() => onRequireAuth('Vui lòng đăng nhập để tham gia cộng đồng!')}
              className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl cursor-pointer flex items-center justify-center"
            >
              <span className="px-4 py-2 rounded-full bg-slate-900/85 text-white text-xs font-bold shadow-lg flex items-center gap-2">
                <span>🔒</span>
                <span>Nhấn vào đây để Đăng Nhập</span>
              </span>
            </div>
          )}
        </div>

        {/* Vùng Preview Đa Phương Tiện */}
        {previewUrl && (
          <div className="relative mt-4 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 max-h-80 flex items-center justify-center">
            {fileType === 'video' ? (
              <video src={previewUrl} controls className="max-h-80 w-full object-contain" />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-h-80 w-full object-contain" />
            )}

            <button
              type="button"
              onClick={handleRemoveMedia}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-[#ff4757] text-white flex items-center justify-center transition-colors cursor-pointer text-xs font-bold shadow-md"
              title="Xóa tệp đính kèm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tag Selector — Reddit style */}
        {isLoggedIn && (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-slate-500 mb-1.5">
              🏷️ Chọn tag (tối đa 5): {selectedTags.length}/5
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map(tag => (
                <button
                  key={tag} type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-all cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-[#ff4757] border-[#ff4757] text-white scale-105'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-300'
                  }`}
                >
                  {selectedTags.includes(tag) ? '✓ ' : '# '}{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thanh công cụ đính kèm & Hashtag */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
              id="file-upload-post"
              disabled={!isLoggedIn}
            />
            <label
              htmlFor="file-upload-post"
              onClick={(e) => {
                if (!isLoggedIn) {
                  e.preventDefault();
                  onRequireAuth('Vui lòng đăng nhập để đính kèm ảnh/video!');
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-[#ff4757] text-xs font-semibold cursor-pointer transition-colors flex items-center gap-2"
            >
              <span>📸</span>
              <span>Đính kèm Ảnh / Video</span>
            </label>

            <button
              type="button"
              onClick={() => handleAppendHashtag('#HỏiBácSĩ')}
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold cursor-pointer"
            >
              🩺 #HỏiBácSĩ
            </button>
            <button
              type="button"
              onClick={() => handleAppendHashtag('#AI_Pet24h')}
              className="hidden sm:inline-block px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-medium cursor-pointer"
            >
              #AI_Pet24h
            </button>
          </div>

          {/* Nút Chia sẻ */}
          <button
            type="submit"
            disabled={isUploading}
            className="px-6 py-2.5 rounded-xl bg-[#ff4757] hover:bg-[#ff6b81] active:scale-95 text-white text-sm font-bold shadow-md shadow-rose-200 hover:shadow-rose-300 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isUploading ? (
              <span>Đang tải lên...</span>
            ) : (
              <>
                <span>Chia sẻ bài viết</span>
                <span>✨</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
