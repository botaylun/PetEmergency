<template>
  <div class="web-app-shell">
    <!-- Top Modern Global Website Header -->
    <header class="web-header">
      <div class="header-container">
        <!-- Brand Logo -->
        <div class="brand-logo-wrap" @click="currentTab = 'forum'">
          <div class="logo-pink-circle">⊗</div>
          <div class="brand-text-block">
            <span class="brand-name">PetEmergency</span>
            <span class="brand-subline">Hệ thống cấp cứu & chăm sóc thú cưng</span>
          </div>
        </div>

        <!-- Main Desktop Navigation Tabs -->
        <nav class="web-nav-tabs">
          <button
            class="nav-tab-btn"
            :class="{ active: currentTab === 'forum' }"
            @click="currentTab = 'forum'"
          >
            <span class="nav-icon">📱</span>
            <span>Diễn Đàn</span>
          </button>

          <button
            class="nav-tab-btn tab-emergency"
            :class="{ active: currentTab === 'emergency' }"
            @click="currentTab = 'emergency'"
          >
            <span class="nav-icon">🚨</span>
            <span>Cấp Cứu SOS</span>
          </button>

          <button
            class="nav-tab-btn"
            :class="{ active: currentTab === 'doctor' }"
            @click="currentTab = 'doctor'"
          >
            <span class="nav-icon">🩺</span>
            <span>Bác Sĩ Console</span>
          </button>

          <button
            class="nav-tab-btn"
            :class="{ active: currentTab === 'gps' }"
            @click="currentTab = 'gps'"
          >
            <span class="nav-icon">📡</span>
            <span>Vòng Cổ GPS</span>
          </button>
        </nav>

        <!-- Right User Account & Auth Area -->
        <div class="user-auth-area">
          <!-- When Logged In -->
          <div v-if="currentUser" class="logged-in-profile">
            <div class="user-meta-capsule">
              <div class="user-avatar-tiny" :style="{ background: currentUser.role === 'doctor' ? '#FFF0F3' : '#F3F5F9' }">
                {{ currentUser.role === 'doctor' ? '👨‍⚕️' : '👤' }}
              </div>
              <div class="user-name-role">
                <span class="user-display-name">{{ currentUser.name }}</span>
                <span v-if="currentUser.role === 'doctor'" class="badge-doctor" style="font-size: 0.65rem; padding: 1px 6px;">
                  🩺 Bác sĩ thú y
                </span>
                <span v-else class="badge-user-tag">
                  Chủ nuôi
                </span>
              </div>
            </div>

            <button class="btn-logout" @click="handleLogout" title="Đăng xuất">
              <span>Đăng xuất</span>
            </button>
          </div>

          <!-- When NOT Logged In -->
          <div v-else class="auth-buttons-group">
            <button class="btn btn-ghost btn-sm" @click="openAuth('login')">
              Đăng Nhập
            </button>
            <button class="btn btn-primary btn-sm" @click="openAuth('register')">
              Đăng Ký
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Global Toast Alert -->
    <transition name="toast-anim">
      <div v-if="toast.show" class="global-web-toast" :class="'toast-' + toast.type">
        {{ toast.message }}
      </div>
    </transition>

    <!-- Login / Register Real Modal -->
    <AuthModal
      v-if="showAuthModal"
      @close="showAuthModal = false"
      @auth-success="onAuthSuccess"
      @show-toast="triggerToast"
    />

    <!-- Main Website Viewport -->
    <main class="web-content-area">
      <!-- 1. Community Forum Page -->
      <section v-if="currentTab === 'forum'">
        <Forum
          :current-user="currentUser || defaultGuest"
          @show-toast="triggerToast"
          @switch-view="currentTab = $event"
        />
      </section>

      <!-- 2. Emergency SOS Page (Desktop Website) -->
      <section v-else-if="currentTab === 'emergency'">
        <EmergencyWeb
          :current-user="currentUser || defaultGuest"
          @show-toast="triggerToast"
        />
      </section>

      <!-- 3. Doctor Emergency Console Page (Desktop Website) -->
      <section v-else-if="currentTab === 'doctor'">
        <DoctorDashboard
          :current-user="currentUser || defaultGuest"
          @show-toast="triggerToast"
        />
      </section>

      <!-- 4. GPS Collar Tracking Page (Desktop Website) -->
      <section v-else-if="currentTab === 'gps'">
        <GpsTracking
          :current-user="currentUser || defaultGuest"
          @show-toast="triggerToast"
        />
      </section>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Forum from './Pages/Forum.vue';
import EmergencyWeb from './Pages/EmergencyWeb.vue';
import DoctorDashboard from './Pages/DoctorDashboard.vue';
import GpsTracking from './Pages/GpsTracking.vue';
import AuthModal from './Pages/AuthModal.vue';

export default {
  name: 'App',
  components: {
    Forum,
    EmergencyWeb,
    DoctorDashboard,
    GpsTracking,
    AuthModal
  },
  setup() {
    const currentTab = ref('forum');
    const currentUser = ref(null);
    const showAuthModal = ref(false);

    const defaultGuest = {
      id: 1,
      name: 'Khách vãng lai',
      role: 'user',
      label: 'Khách'
    };

    const toast = ref({ show: false, message: '', type: 'success' });
    let toastTimer = null;

    const triggerToast = (msg, type = 'success') => {
      if (toastTimer) clearTimeout(toastTimer);
      toast.value = { show: true, message: msg, type };
      toastTimer = setTimeout(() => {
        toast.value.show = false;
      }, 3500);
    };

    const checkCurrentUser = async () => {
      try {
        const res = await axios.get('/api/v1/auth/me');
        if (res.data.success && res.data.data) {
          currentUser.value = res.data.data;
        }
      } catch (e) {
        console.warn('Auth check:', e);
      }
    };

    const openAuth = (tab = 'login') => {
      showAuthModal.value = true;
    };

    const onAuthSuccess = (user) => {
      currentUser.value = user;
      // Auto-switch to doctor dashboard if user is doctor
      if (user.role === 'doctor') {
        currentTab.value = 'doctor';
      }
    };

    const handleLogout = async () => {
      try {
        await axios.post('/api/v1/auth/logout');
        currentUser.value = null;
        triggerToast('Đã đăng xuất tài khoản thành công.', 'info');
      } catch (e) {
        currentUser.value = null;
      }
    };

    onMounted(() => {
      checkCurrentUser();
    });

    return {
      currentTab,
      currentUser,
      defaultGuest,
      showAuthModal,
      toast,
      openAuth,
      onAuthSuccess,
      handleLogout,
      triggerToast
    };
  }
};
</script>

<style scoped>
.web-app-shell {
  min-height: 100vh;
  background-color: var(--color-bg-app);
}

.web-header {
  background: #FFFFFF;
  border-bottom: 1px solid #ECEEF3;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(20, 23, 31, 0.03);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.brand-logo-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-pink-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #FFF0F3;
  color: #FF5A79;
  font-size: 1.3rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text-block {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: #FF5A79;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.brand-subline {
  font-size: 0.68rem;
  color: #8E95A5;
}

/* Nav Tabs */
.web-nav-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #F3F5F9;
  padding: 5px;
  border-radius: var(--radius-full);
}

.nav-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #5E6578;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-tab-btn:hover {
  color: #14171F;
}

.nav-tab-btn.active {
  background: #FFFFFF;
  color: #FF5A79;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-emergency.active {
  background: #FF5A79;
  color: #FFFFFF;
}

.nav-icon {
  font-size: 1rem;
}

/* User Profile & Auth */
.user-auth-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logged-in-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-meta-capsule {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F8FAFD;
  border: 1px solid #E2E6EE;
  padding: 4px 12px 4px 6px;
  border-radius: var(--radius-full);
}

.user-avatar-tiny {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.user-name-role {
  display: flex;
  flex-direction: column;
}

.user-display-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: #14171F;
  line-height: 1.2;
}

.badge-user-tag {
  font-size: 0.65rem;
  color: #8E95A5;
}

.btn-logout {
  background: none;
  border: 1px solid #E2E6EE;
  border-radius: var(--radius-full);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #8E95A5;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #FFF0F3;
  color: #FF5A79;
  border-color: #FFD2DA;
}

.auth-buttons-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Toast */
.global-web-toast {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 3000;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  background: #FFFFFF;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.toast-success {
  border-left: 4px solid #10B981;
  color: #065F46;
}

.toast-warning {
  border-left: 4px solid #F59E0B;
  color: #92400E;
}

.toast-error {
  border-left: 4px solid #FF5A79;
  color: #991B1B;
}

.toast-info {
  border-left: 4px solid #3B82F6;
  color: #1E40AF;
}

@media (max-width: 900px) {
  .header-container {
    flex-wrap: wrap;
  }
  .web-nav-tabs {
    order: 3;
    width: 100%;
    justify-content: space-around;
  }
}
</style>
