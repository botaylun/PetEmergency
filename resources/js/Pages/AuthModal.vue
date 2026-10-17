<template>
  <div class="auth-modal-overlay" @click.self="$emit('close')">
    <div class="auth-modal-card card animate-slide-up">
      <!-- Modal Close Button -->
      <button class="btn-close-modal" @click="$emit('close')">✕</button>

      <!-- Brand Header -->
      <div class="auth-header">
        <div class="auth-logo-badge">⊗</div>
        <h3 class="auth-title">PetEmergency & Care</h3>
        <p class="auth-subtitle">Nền tảng cứu hộ và chăm sóc thú cưng toàn diện</p>
      </div>

      <!-- Auth Tabs -->
      <div class="auth-tabs">
        <button
          class="auth-tab-btn"
          :class="{ active: currentTab === 'login' }"
          @click="currentTab = 'login'"
        >
          Đăng Nhập
        </button>
        <button
          class="auth-tab-btn"
          :class="{ active: currentTab === 'register' }"
          @click="currentTab = 'register'"
        >
          Đăng Ký Tài Khoản
        </button>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="auth-error-alert">
        ⚠️ {{ errorMessage }}
      </div>

      <!-- TAB 1: ĐĂNG NHẬP (LOGIN) -->
      <form v-if="currentTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label">Địa chỉ Email</label>
          <input
            type="email"
            v-model="loginForm.email"
            class="form-input"
            placeholder="nhap.email@example.com"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Mật khẩu</label>
          <input
            type="password"
            v-model="loginForm.password"
            class="form-input"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary auth-submit-btn" :disabled="isLoading">
          <span v-if="isLoading" class="spinner-small"></span>
          <span v-else>Đăng Nhập Ngay</span>
        </button>

        <!-- Quick Demo Accounts One-Click Login -->
        <div class="demo-accounts-box">
          <span class="demo-label">Hoặc đăng nhập nhanh bằng tài khoản có sẵn:</span>
          <div class="demo-buttons-grid">
            <button
              type="button"
              class="btn-demo-pill"
              @click="quickLogin('minhanh@example.com', 'password')"
            >
              <span>👤 Chủ nuôi (Minh Anh)</span>
            </button>
            <button
              type="button"
              class="btn-demo-pill pill-doctor"
              @click="quickLogin('dr.mai@example.com', 'password')"
            >
              <span>🩺 Bác sĩ (BS. Mai)</span>
            </button>
          </div>
        </div>
      </form>

      <!-- TAB 2: ĐĂNG KÝ (REGISTER) -->
      <form v-else @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label">Họ và Tên</label>
          <input
            type="text"
            v-model="regForm.name"
            class="form-input"
            placeholder="Nguyễn Văn A"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Địa chỉ Email</label>
          <input
            type="email"
            v-model="regForm.email"
            class="form-input"
            placeholder="email@example.com"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Số điện thoại</label>
          <input
            type="tel"
            v-model="regForm.phone"
            class="form-input"
            placeholder="0912 345 678"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Mật khẩu (ít nhất 6 ký tự)</label>
          <input
            type="password"
            v-model="regForm.password"
            class="form-input"
            placeholder="••••••••"
            minlength="6"
            required
          />
        </div>

        <!-- Role Selector -->
        <div class="form-group">
          <label class="form-label">Vai trò của bạn trên hệ thống</label>
          <div class="role-choose-grid">
            <div
              class="role-card"
              :class="{ selected: regForm.role === 'user' }"
              @click="regForm.role = 'user'"
            >
              <span class="role-icon">🐶</span>
              <div class="role-card-text">
                <strong>Chủ Nuôi</strong>
                <span>Quản lý thú cưng & phát SOS</span>
              </div>
            </div>

            <div
              class="role-card"
              :class="{ selected: regForm.role === 'doctor' }"
              @click="regForm.role = 'doctor'"
            >
              <span class="role-icon">🩺</span>
              <div class="role-card-text">
                <strong>Bác Sĩ Thú Y</strong>
                <span>Tiếp nhận cấp cứu & tư vấn</span>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary auth-submit-btn" :disabled="isLoading">
          <span v-if="isLoading" class="spinner-small"></span>
          <span v-else>Đăng Ký Tài Khoản</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';

export default {
  name: 'AuthModal',
  emits: ['close', 'auth-success', 'show-toast'],
  setup(props, { emit }) {
    const currentTab = ref('login');
    const isLoading = ref(false);
    const errorMessage = ref('');

    const loginForm = ref({
      email: '',
      password: ''
    });

    const regForm = ref({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user'
    });

    const handleLogin = async () => {
      isLoading.value = true;
      errorMessage.value = '';

      try {
        const response = await axios.post('/api/v1/auth/login', loginForm.value);
        if (response.data.success) {
          emit('auth-success', response.data.data);
          emit('show-toast', `Chào mừng trở lại, ${response.data.data.name}!`, 'success');
          emit('close');
        }
      } catch (err) {
        errorMessage.value = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.';
      } finally {
        isLoading.value = false;
      }
    };

    const handleRegister = async () => {
      isLoading.value = true;
      errorMessage.value = '';

      try {
        const response = await axios.post('/api/v1/auth/register', regForm.value);
        if (response.data.success) {
          emit('auth-success', response.data.data);
          emit('show-toast', 'Đăng ký tài khoản thành công! Đã tự động đăng nhập.', 'success');
          emit('close');
        }
      } catch (err) {
        errorMessage.value = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      } finally {
        isLoading.value = false;
      }
    };

    const quickLogin = async (email, password) => {
      loginForm.value.email = email;
      loginForm.value.password = password;
      await handleLogin();
    };

    return {
      currentTab,
      isLoading,
      errorMessage,
      loginForm,
      regForm,
      handleLogin,
      handleRegister,
      quickLogin
    };
  }
};
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(20, 23, 31, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.auth-modal-card {
  width: 100%;
  max-width: 440px;
  background: #FFFFFF;
  border-radius: 24px;
  padding: 32px 28px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.btn-close-modal {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #F3F5F9;
  border: none;
  color: #8E95A5;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close-modal:hover {
  background: #FFE4E8;
  color: #FF5A79;
}

.auth-header {
  text-align: center;
  margin-bottom: 20px;
}

.auth-logo-badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #FFF0F3;
  color: #FF5A79;
  font-size: 1.5rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.auth-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: #14171F;
}

.auth-subtitle {
  font-size: 0.8rem;
  color: #8E95A5;
  margin-top: 2px;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #F3F5F9;
  padding: 4px;
  border-radius: var(--radius-full);
  margin-bottom: 20px;
}

.auth-tab-btn {
  padding: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #5E6578;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s;
}

.auth-tab-btn.active {
  background: #FFFFFF;
  color: #FF5A79;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.auth-error-alert {
  background: #FFF0F3;
  border-left: 4px solid #FF5A79;
  color: #D82649;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #363B49;
}

.form-input {
  width: 100%;
  padding: 11px 16px;
  background: #F8FAFD;
  border: 1.5px solid #E2E6EE;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #14171F;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #FF5A79;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(255, 90, 121, 0.15);
}

.role-choose-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.role-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #F8FAFD;
  border: 1.5px solid #E2E6EE;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.role-card:hover {
  background: #FFF4F6;
}

.role-card.selected {
  border-color: #FF5A79;
  background: #FFF0F3;
}

.role-icon {
  font-size: 1.5rem;
}

.role-card-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.role-card-text strong {
  font-size: 0.85rem;
  color: #14171F;
}

.role-card-text span {
  font-size: 0.68rem;
  color: #8E95A5;
}

.auth-submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 0.92rem;
  font-weight: 700;
  border-radius: var(--radius-full);
  margin-top: 4px;
}

.demo-accounts-box {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #ECEEF3;
  text-align: center;
}

.demo-label {
  font-size: 0.72rem;
  color: #8E95A5;
  display: block;
  margin-bottom: 8px;
}

.demo-buttons-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-demo-pill {
  padding: 8px;
  background: #F8FAFD;
  border: 1px solid #E2E6EE;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  color: #363B49;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-demo-pill:hover {
  background: #FFF0F3;
  border-color: #FFD2DA;
  color: #FF5A79;
}

.pill-doctor:hover {
  background: #EBF8FF;
  border-color: #BEE3F8;
  color: #2B6CB0;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
</style>
