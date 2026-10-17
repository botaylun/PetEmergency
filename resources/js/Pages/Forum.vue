<template>
  <div class="figma-desktop-forum">
    <div class="forum-3col-layout">
      <!-- ══════════════════════════════════════════
           LEFT COLUMN: Profile & Navigation Sidebar
           ══════════════════════════════════════════ -->
      <aside class="left-sidebar">
        <!-- User Profile Card -->
        <div class="sidebar-user-card">
          <div class="user-avatar-wrap">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80"
              alt="Mai Nguyen"
              class="sidebar-avatar-img"
            />
          </div>
          <div class="user-info">
            <h4 class="user-name">{{ currentUser.name || 'Mai Nguyen' }}</h4>
            <span class="user-subtext">Pet Parent • 2 Dogs</span>
          </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="sidebar-nav-menu">
          <button
            class="sidebar-nav-item"
            :class="{ active: activeNav === 'pets' }"
            @click="activeNav = 'pets'; $emit('switch-view', 'gps')"
          >
            <span class="nav-icon">🐶</span>
            <span>My Pets</span>
          </button>

          <button
            class="sidebar-nav-item"
            :class="{ active: activeNav === 'history' }"
            @click="activeNav = 'history'"
          >
            <span class="nav-icon">📋</span>
            <span>Emergency History</span>
          </button>

          <button
            class="sidebar-nav-item"
            :class="{ active: activeNav === 'vets' }"
            @click="activeNav = 'vets'"
          >
            <span class="nav-icon">🛡️</span>
            <span>Verified Doctors Near Me</span>
          </button>

          <button
            class="sidebar-nav-item"
            :class="{ active: activeNav === 'saved' }"
            @click="activeNav = 'saved'"
          >
            <span class="nav-icon">🔖</span>
            <span>Saved Posts</span>
          </button>

          <button
            class="sidebar-nav-item"
            :class="{ active: activeNav === 'settings' }"
            @click="activeNav = 'settings'"
          >
            <span class="nav-icon">⚙️</span>
            <span>Account Settings</span>
          </button>
        </nav>
      </aside>

      <!-- ══════════════════════════════════════════
           CENTER COLUMN: Community Feed & Posts
           ══════════════════════════════════════════ -->
      <main class="center-feed">
        <!-- Create Post Card -->
        <div class="create-post-card card">
          <div class="create-post-top">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80"
              alt="Avatar"
              class="create-avatar-img"
            />
            <input
              type="text"
              v-model="newPostContent"
              class="create-post-input"
              placeholder="What's happening with your pet?"
              @keyup.enter="handleCreatePost"
            />
          </div>

          <!-- Selected Media Preview -->
          <div v-if="mediaPreview" class="post-preview-bar">
            <span class="preview-filename">{{ selectedFile?.name }}</span>
            <button class="btn-remove-preview" @click="removeFile">✕</button>
          </div>

          <div class="create-post-bottom">
            <div class="create-actions-group">
              <input type="file" ref="fileInput" class="hidden-input" accept="image/*,video/*" @change="onFileChosen" />
              <button type="button" class="post-action-btn" @click="triggerFileSelect">
                <span class="action-icon">📷</span>
                <span>Photo</span>
              </button>
              <button type="button" class="post-action-btn" @click="triggerFileSelect">
                <span class="action-icon">🎥</span>
                <span>Video</span>
              </button>
              <button type="button" class="post-action-btn" @click="$emit('show-toast', 'Location tagged: Hoan Kiem, Hanoi', 'info')">
                <span class="action-icon">📍</span>
                <span>Location</span>
              </button>
              <button type="button" class="post-action-btn" @click="$emit('show-toast', 'Tagged Pet: Milo', 'info')">
                <span class="action-icon">🏷️</span>
                <span>Tag Pet</span>
              </button>
            </div>

            <button
              class="btn btn-share"
              :disabled="!newPostContent.trim() && !selectedFile"
              @click="handleCreatePost"
            >
              Share
            </button>
          </div>
        </div>

        <!-- Dynamic Real Posts Feed from Database -->
        <div v-if="loadingPosts" class="loading-posts-skeleton card" style="padding: 24px; text-align: center; color: #8E95A5;">
          <span>⏳ Đang tải bảng tin cộng đồng...</span>
        </div>

        <article
          v-for="post in postsList"
          :key="post.id"
          class="feed-post-card card"
        >
          <!-- Post Author Header -->
          <div class="post-header-row">
            <div class="author-meta-group">
              <img
                :src="post.user?.avatar || (post.user?.role === 'doctor' ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80')"
                :alt="post.user?.name || 'User'"
                class="author-avatar-img"
              />
              <div class="author-text-info">
                <div class="author-title-line">
                  <span class="author-name">{{ post.user?.name || 'Thành viên cộng đồng' }}</span>
                  <span v-if="post.user?.role === 'doctor'" class="badge-doctor">🩺 Bác sĩ thú y</span>
                </div>
                <span class="author-subtext">{{ formatPostTime(post.created_at) }}</span>
              </div>
            </div>

            <button class="post-menu-btn" @click="$emit('show-toast', 'Tùy chọn bài viết', 'info')">•••</button>
          </div>

          <!-- Post Content -->
          <p class="post-body-text">{{ post.content }}</p>

          <!-- Media Display -->
          <div v-if="post.media_full_url" class="post-single-image-wrap">
            <video
              v-if="post.media_type === 'video'"
              :src="post.media_full_url"
              controls
              class="single-post-img"
              style="max-height: 480px; width: 100%; background: #000; border-radius: 12px;"
            ></video>
            <img
              v-else
              :src="post.media_full_url"
              class="single-post-img"
              :alt="post.content"
            />
          </div>

          <!-- Interactions Row -->
          <div class="post-stats-row">
            <div class="stats-left">
              <button class="stat-btn" :class="{ liked: post.isLiked }" @click="toggleLike(post)">
                <span>❤️</span>
                <span>{{ post.likes_count || (post.isLiked ? 1 : 0) }} Likes</span>
              </button>
              <button class="stat-btn" @click="post.showComments = !post.showComments">
                <span>💬</span>
                <span>{{ post.comments?.length || post.comments_count || 0 }} Comments</span>
              </button>
            </div>
            <button class="stat-btn stat-share" @click="$emit('show-toast', 'Đã sao chép liên kết bài viết!', 'success')">
              <span>↗</span>
            </button>
          </div>

          <!-- Comments Section -->
          <div v-show="post.showComments !== false" class="post-comments-container">
            <!-- List of Comments -->
            <div
              v-for="cmt in (post.comments || [])"
              :key="cmt.id"
              class="comment-row"
              :class="{ 'nested-doctor-reply': cmt.user?.role === 'doctor' }"
            >
              <img
                :src="cmt.user?.avatar || (cmt.user?.role === 'doctor' ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80')"
                :alt="cmt.user?.name"
                class="comment-avatar-img"
              />
              <div :class="cmt.user?.role === 'doctor' ? 'doctor-reply-bubble' : 'comment-bubble-box'">
                <div class="doctor-reply-header" v-if="cmt.user?.role === 'doctor'">
                  <span class="doctor-reply-name">{{ cmt.user?.name }}</span>
                  <span class="badge-doctor" style="font-size: 0.65rem; padding: 1px 6px;">🩺 Bác sĩ thú y</span>
                </div>
                <span v-else class="comment-user-name">{{ cmt.user?.name || 'Thành viên' }}</span>
                <p :class="cmt.user?.role === 'doctor' ? 'doctor-reply-text' : 'comment-user-text'">
                  {{ cmt.content }}
                </p>
              </div>
            </div>

            <!-- Add Comment Input Form -->
            <div class="comment-input-box">
              <input
                type="text"
                v-model="post.newCommentText"
                class="comment-field"
                placeholder="Viết bình luận cho bài viết này..."
                @keyup.enter="handleSendComment(post)"
              />
              <button
                class="btn-send-comment"
                :disabled="!post.newCommentText?.trim()"
                @click="handleSendComment(post)"
              >
                Gửi
              </button>
            </div>
          </div>
        </article>
      </main>

      <!-- ══════════════════════════════════════════
           RIGHT COLUMN: Live Alerts & Verified Vets
           ══════════════════════════════════════════ -->
      <aside class="right-sidebar">
        <!-- Widget 1: Live Alerts -->
        <div class="widget-card card">
          <div class="widget-header">
            <div class="widget-title-group">
              <span class="red-beacon-dot"></span>
              <span class="widget-title">Live Alerts</span>
            </div>
            <span class="widget-badge-radius">0.5 KM NEARBY</span>
          </div>

          <div class="alerts-list">
            <!-- Alert 1 (Pink background / Red border) -->
            <div class="alert-item-active">
              <div class="alert-top-row">
                <span class="alert-pet-title">🥨 Corgi (Milo)</span>
                <span class="alert-time">2 min ago</span>
              </div>
              <div class="alert-details">
                Severe Bleeding • 0.3 km
              </div>
              <button
                class="btn btn-primary alert-respond-btn"
                @click="$emit('switch-view', 'doctor')"
              >
                Respond
              </button>
            </div>

            <!-- Alert 2 (Gray subtle card) -->
            <div class="alert-item-subtle">
              <div class="alert-top-row">
                <span class="alert-pet-title">🐱 Persian Cat</span>
                <span class="alert-time">12 min ago</span>
              </div>
              <div class="alert-details">
                Toxic Poisoning • 0.8 km
              </div>
            </div>
          </div>
        </div>

        <!-- Widget 2: Verified Doctors Near You -->
        <div class="widget-card card">
          <div class="widget-header">
            <span class="widget-title">Verified Doctors Near You</span>
          </div>

          <div class="vets-list">
            <!-- Vet 1 -->
            <div class="vet-item">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&auto=format&fit=crop&q=80"
                alt="Dr. Minh Khanh"
                class="vet-avatar-img"
              />
              <div class="vet-info">
                <span class="vet-name">Dr. Minh Khanh</span>
                <span class="vet-spec">Cardiology Specialist</span>
                <span class="vet-rating">⭐ 4.9 <span class="review-count">(124 reviews)</span></span>
              </div>
              <button class="btn-contact-vet" @click="$emit('show-toast', 'Contacting Dr. Minh Khanh...', 'success')">
                Contact
              </button>
            </div>

            <!-- Vet 2 -->
            <div class="vet-item">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&auto=format&fit=crop&q=80"
                alt="Dr. David Nguyen"
                class="vet-avatar-img"
              />
              <div class="vet-info">
                <span class="vet-name">Dr. David Nguyen</span>
                <span class="vet-spec">Emergency Surgery</span>
                <span class="vet-rating">⭐ 4.8 <span class="review-count">(98 reviews)</span></span>
              </div>
              <button class="btn-contact-vet" @click="$emit('show-toast', 'Contacting Dr. David Nguyen...', 'success')">
                Contact
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'Forum',
  props: {
    currentUser: {
      type: Object,
      required: true
    }
  },
  emits: ['show-toast', 'switch-view'],
  setup(props, { emit }) {
    const activeNav = ref('vets');
    const newPostContent = ref('');
    const selectedFile = ref(null);
    const mediaPreview = ref(null);
    const fileInput = ref(null);
    const postsList = ref([]);
    const loadingPosts = ref(false);

    const triggerFileSelect = () => {
      fileInput.value?.click();
    };

    const onFileChosen = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        selectedFile.value = file;
        mediaPreview.value = URL.createObjectURL(file);
        emit('show-toast', `Đã chọn tệp: ${file.name}`, 'info');
      }
    };

    const removeFile = () => {
      if (mediaPreview.value) {
        URL.revokeObjectURL(mediaPreview.value);
      }
      selectedFile.value = null;
      mediaPreview.value = null;
      if (fileInput.value) fileInput.value.value = '';
    };

    const formatPostTime = (dateStr) => {
      if (!dateStr) return 'Vừa xong';
      try {
        const d = new Date(dateStr);
        const diffMs = Date.now() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        return d.toLocaleDateString('vi-VN');
      } catch (e) {
        return 'Gần đây';
      }
    };

    const handleCreatePost = async () => {
      const content = newPostContent.value?.trim();
      if (!content && !selectedFile.value) {
        emit('show-toast', 'Vui lòng nhập nội dung hoặc đính kèm ảnh/video', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('content', content || 'Chia sẻ khoảnh khắc thú cưng');
      if (selectedFile.value) {
        formData.append('media', selectedFile.value);
      }

      try {
        // IMPORTANT: Do NOT manually specify 'Content-Type': 'multipart/form-data'!
        // Axios automatically sets the proper boundary header for FormData.
        const response = await axios.post('/api/v1/forum/posts', formData, {
          headers: {
            'X-User-Id': (props.currentUser?.id || 1).toString()
          }
        });

        if (response.data.success && response.data.data) {
          emit('show-toast', 'Đã chia sẻ bài viết lên diễn đàn!', 'success');
          const newPost = {
            ...response.data.data,
            comments: [],
            showComments: true,
            newCommentText: '',
            isLiked: false,
            likes_count: 0
          };
          postsList.value.unshift(newPost);
          newPostContent.value = '';
          removeFile();
        }
      } catch (err) {
        console.error('Post error:', err.response?.data || err);
        const errorMsg = err.response?.data?.message || 'Lỗi khi đăng bài viết';
        emit('show-toast', errorMsg, 'error');
      }
    };

    const handleSendComment = async (post) => {
      const text = post.newCommentText?.trim();
      if (!text) return;

      const tempId = 'temp_' + Date.now();
      const tempComment = {
        id: tempId,
        content: text,
        created_at: new Date().toISOString(),
        user: {
          id: props.currentUser?.id || 1,
          name: props.currentUser?.name || 'Tôi',
          role: props.currentUser?.role || 'user'
        }
      };

      if (!post.comments) post.comments = [];
      post.comments.push(tempComment);
      post.newCommentText = '';

      try {
        const response = await axios.post(`/api/v1/forum/posts/${post.id}/comments`, {
          content: text
        }, {
          headers: {
            'X-User-Id': (props.currentUser?.id || 1).toString()
          }
        });

        if (response.data.success && response.data.data) {
          const idx = post.comments.findIndex(c => c.id === tempId);
          if (idx !== -1) {
            post.comments[idx] = response.data.data;
          }
          emit('show-toast', 'Đã gửi bình luận!', 'success');
        }
      } catch (err) {
        console.error('Comment error:', err);
        emit('show-toast', 'Lỗi khi gửi bình luận', 'error');
      }
    };

    const toggleLike = (post) => {
      post.isLiked = !post.isLiked;
      if (post.isLiked) {
        post.likes_count = (post.likes_count || 0) + 1;
      } else {
        post.likes_count = Math.max(0, (post.likes_count || 1) - 1);
      }
    };

    const fetchPosts = async () => {
      loadingPosts.value = true;
      try {
        const response = await axios.get('/api/v1/forum/posts');
        if (response.data.success && response.data.data?.data) {
          postsList.value = response.data.data.data.map(p => ({
            ...p,
            showComments: true,
            newCommentText: '',
            isLiked: false,
            likes_count: p.likes_count || Math.floor(Math.random() * 20) + 5
          }));
        }
      } catch (e) {
        console.warn('Fetch posts error:', e);
      } finally {
        loadingPosts.value = false;
      }
    };

    onMounted(() => {
      fetchPosts();
    });

    return {
      activeNav,
      newPostContent,
      selectedFile,
      mediaPreview,
      fileInput,
      postsList,
      loadingPosts,
      triggerFileSelect,
      onFileChosen,
      removeFile,
      formatPostTime,
      handleCreatePost,
      handleSendComment,
      toggleLike
    };
  }
};
</script>

<style scoped>
.figma-desktop-forum {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.forum-3col-layout {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  gap: 24px;
  align-items: flex-start;
}

/* ══════════════════════════════
   LEFT SIDEBAR
   ══════════════════════════════ */
.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 16px;
  margin-bottom: 12px;
}

.user-avatar-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: #ECEEF3;
  flex-shrink: 0;
}

.sidebar-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #14171F;
  line-height: 1.2;
}

.user-subtext {
  font-size: 0.72rem;
  color: #8E95A5;
}

.sidebar-nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #363B49;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.sidebar-nav-item:hover {
  background: #ECEEF3;
}

.sidebar-nav-item.active {
  background: #FFF0F3;
  border-color: #FFD2DA;
  color: #FF3B62;
  font-weight: 700;
}

.nav-icon {
  font-size: 1.1rem;
}

/* ══════════════════════════════
   CENTER FEED
   ══════════════════════════════ */
.center-feed {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Create Post Card */
.create-post-card {
  padding: 16px;
  background: #FFFFFF;
}

.create-post-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.create-avatar-img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}

.create-post-input {
  flex: 1;
  background: #F3F5F9;
  border: none;
  border-radius: var(--radius-full);
  padding: 10px 18px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}

.create-post-input::placeholder {
  color: #8E95A5;
}

.post-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #FFF0F3;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 0.78rem;
  color: #FF3B62;
}

.btn-remove-preview {
  background: none;
  border: none;
  cursor: pointer;
  color: #FF3B62;
  font-weight: bold;
}

.create-post-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.create-actions-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hidden-input {
  display: none;
}

.post-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  color: #5E6578;
  cursor: pointer;
  transition: color 0.2s;
}

.post-action-btn:hover {
  color: #FF3B62;
}

/* Feed Post Cards */
.feed-post-card {
  padding: 20px;
  background: #FFFFFF;
}

.post-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.author-meta-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar-img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #FFF0F3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.author-text-info {
  display: flex;
  flex-direction: column;
}

.author-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-weight: 800;
  font-size: 0.95rem;
  color: #14171F;
}

.author-subtext {
  font-size: 0.72rem;
  color: #8E95A5;
}

.post-menu-btn {
  background: none;
  border: none;
  color: #8E95A5;
  font-size: 1rem;
  cursor: pointer;
}

.post-body-text {
  font-size: 0.88rem;
  line-height: 1.55;
  color: #2D3340;
  margin-bottom: 14px;
}

/* 2-Image Grid */
.post-images-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
  border-radius: 14px;
  overflow: hidden;
}

.grid-image-wrap {
  width: 100%;
  height: 220px;
  background: #F3F5F9;
}

.grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Single Image */
.post-single-image-wrap {
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 14px;
  max-height: 380px;
}

.single-post-img {
  width: 100%;
  height: auto;
  max-height: 380px;
  object-fit: cover;
  display: block;
}

/* Post Stats Row */
.post-stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #F0F2F6;
  margin-bottom: 14px;
}

.stats-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  color: #5E6578;
  cursor: pointer;
}

.stat-btn.liked {
  color: #FF3B62;
}

.stat-share {
  font-size: 1.1rem;
  font-weight: 800;
}

/* Comments Section */
.post-comments-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.comment-avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-bubble-box {
  background: #F6F8FC;
  border-radius: 14px;
  padding: 8px 14px;
  flex: 1;
}

.comment-user-name {
  font-size: 0.8rem;
  font-weight: 800;
  color: #14171F;
}

.comment-user-text {
  font-size: 0.82rem;
  color: #363B49;
  margin-top: 2px;
}

/* Nested Doctor Reply (Pink Tint Box) */
.nested-doctor-reply {
  margin-left: 28px;
}

.doctor-reply-bubble {
  background: #FFF0F3;
  border-radius: 14px;
  padding: 8px 14px;
  flex: 1;
}

.doctor-reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doctor-reply-name {
  font-size: 0.8rem;
  font-weight: 800;
  color: #FF3B62;
}

.doctor-reply-text {
  font-size: 0.82rem;
  color: #2D3340;
  margin-top: 2px;
}

/* ══════════════════════════════
   RIGHT SIDEBAR WIDGETS
   ══════════════════════════════ */
.right-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.widget-card {
  padding: 16px;
  background: #FFFFFF;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.widget-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.red-beacon-dot {
  width: 8px;
  height: 8px;
  background: #FF3B62;
  border-radius: 50%;
}

.widget-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: #14171F;
}

.widget-badge-radius {
  font-size: 0.68rem;
  font-weight: 800;
  color: #FF3B62;
  letter-spacing: 0.04em;
}

/* Live Alerts List */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item-active {
  background: #FFF4F6;
  border: 1px solid #FFD2DA;
  border-radius: 12px;
  padding: 12px;
}

.alert-item-subtle {
  background: #F8FAFD;
  border-radius: 12px;
  padding: 12px;
}

.alert-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.alert-pet-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: #14171F;
}

.alert-time {
  font-size: 0.7rem;
  color: #8E95A5;
}

.alert-details {
  font-size: 0.75rem;
  color: #5E6578;
  margin-bottom: 8px;
}

.alert-respond-btn {
  width: 100%;
  padding: 6px;
  font-size: 0.78rem;
}

/* Verified Doctors List */
.vets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vet-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vet-avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.vet-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.vet-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: #14171F;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vet-spec {
  font-size: 0.7rem;
  color: #8E95A5;
}

.vet-rating {
  font-size: 0.7rem;
  font-weight: 700;
  color: #14171F;
}

.review-count {
  color: #8E95A5;
  font-weight: normal;
}

.btn-contact-vet {
  background: #FFF0F3;
  color: #FF3B62;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s;
}

/* Comment Input Area */
.comment-input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #F0F2F6;
}

.comment-field {
  flex: 1;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1px solid #E2E6EE;
  background: #F8F9FA;
  font-size: 0.82rem;
  color: #14171F;
  outline: none;
  transition: all 0.2s;
}

.comment-field:focus {
  background: #FFFFFF;
  border-color: #FF3B62;
  box-shadow: 0 0 0 3px rgba(255, 59, 98, 0.12);
}

.btn-send-comment {
  padding: 7px 18px;
  background: #FF3B62;
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-send-comment:hover:not(:disabled) {
  background: #E02B51;
  transform: translateY(-1px);
}

.btn-send-comment:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 980px) {
  .forum-3col-layout {
    grid-template-columns: 1fr;
  }
  .left-sidebar, .right-sidebar {
    display: none;
  }
}
</style>
