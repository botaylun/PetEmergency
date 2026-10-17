<template>
  <div class="doctor-web-console">
    <div class="console-container">
      <!-- Top Status Banner -->
      <div class="console-top-bar card">
        <div class="doctor-identity-group">
          <div class="doctor-avatar-circle">🩺</div>
          <div>
            <div class="doctor-name-title">
              <h2>{{ currentUser ? currentUser.name : 'BS. Phạm Thị Mai' }}</h2>
              <span class="badge-doctor">Bác Sĩ Trực Ban</span>
              <span class="badge-online">● ĐANG TRỰC TUYẾN</span>
            </div>
            <p class="doctor-clinic-desc">Hệ thống điều phối cứu hộ thú cưng 24/7 • Bán kính tiếp nhận 3.0 km</p>
          </div>
        </div>

        <div class="console-actions-right">
          <button class="btn-siren-toggle" :class="{ active: audioEnabled }" @click="toggleAudio">
            <span>{{ audioEnabled ? '🔊 Còi Cứu Hộ: BẬT' : '🔇 Còi Cứu Hộ: TẮT' }}</span>
          </button>
          <button class="btn btn-ghost btn-sm" @click="fetchPending">
            🔄 Làm Mới
          </button>
        </div>
      </div>

      <!-- High Priority Alert Banner if pending emergencies exist -->
      <div v-if="pendingEmergencies.length > 0" class="incoming-alert-banner">
        <div class="alert-banner-left">
          <span class="siren-beacon-icon">🚨</span>
          <div>
            <h3 class="alert-headline">PHÁT HIỆN {{ pendingEmergencies.length }} CA CẤP CỨU ĐANG CHỜ TIẾP NHẬN!</h3>
            <p class="alert-subline">
              Bệnh nhân gần nhất cách phòng khám của bạn <strong>{{ currentDistanceText }}</strong>. Vui lòng xác nhận cứu hộ ngay để hỗ trợ bệnh nhân.
            </p>
          </div>
        </div>
        <button
          class="btn btn-primary btn-lg pulse-action-btn"
          :disabled="isProcessing"
          @click="driveToLocation"
        >
          <span v-if="isProcessing" class="spinner-small"></span>
          <span v-else>🚑 [XÁC NHẬN CỨU HỘ NGAY]</span>
        </button>
      </div>

      <!-- Main Desktop Console Grid -->
      <div class="console-main-grid">
        <!-- LEFT COLUMN: Patient Details & Case List -->
        <div class="console-left-col">
          <!-- Active Case Details Card -->
          <div class="card case-details-card" v-if="currentPatient">
            <div class="card-header-bar">
              <span class="card-tag">THÔNG TIN CA CỨU HỘ</span>
              <span class="case-time-pill">Vừa xong (12s trước)</span>
            </div>

            <div class="patient-main-info">
              <div class="patient-distance-stat">
                <span class="stat-number">{{ currentDistanceText }}</span>
                <span class="stat-unit">khoảng cách tới bệnh nhân</span>
              </div>

              <div class="pet-summary-row">
                <span class="pet-breed-name">🐕 {{ currentPatient.pet_name || 'Milo' }} ({{ currentPatient.pet_breed || 'Golden Retriever' }})</span>
                <span class="pet-age-tag">3 tuổi • 28.5 kg</span>
              </div>

              <div class="tags-group-row">
                <span class="badge-symptom-tag">CHẢY MÁU CẤP TÍNH</span>
                <span class="badge-symptom-tag">VA CHẠM GIAO THÔNG</span>
              </div>

              <div class="patient-symptom-quote">
                <strong>Triệu chứng báo cáo:</strong> "{{ currentPatient.description || 'Thú cưng bị va chạm, khó thở và có vết thương hở đang chảy máu.' }}"
              </div>
            </div>

            <!-- Pet Parent Contact Box -->
            <div class="pet-parent-contact-box">
              <div class="parent-meta">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Parent"
                  class="parent-pic"
                />
                <div>
                  <span class="parent-role-text">CHỦ NUÔI / NGƯỜI BÁO TIN</span>
                  <h4 class="parent-full-name">{{ currentPatient.user_name || 'Nguyễn Minh Anh' }}</h4>
                  <span class="parent-phone-number">📞 {{ currentPatient.user_phone || '0912 345 678' }}</span>
                </div>
              </div>

              <button class="btn-call-parent" @click="callParent">
                <span>📞 Gọi Ngay</span>
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="case-action-buttons">
              <button class="btn btn-primary btn-full-action" :disabled="isProcessing" @click="driveToLocation">
                ↗ BẬT ĐIỀU HƯỚNG TỚI VỊ TRÍ
              </button>
              <button class="btn btn-outline-primary btn-full-action" @click="prepareClinic">
                + CHUẨN BỊ PHÒNG MỔ CẤP CỨU
              </button>
            </div>
          </div>

          <!-- Empty Case State -->
          <div v-else class="card empty-console-card">
            <div class="empty-icon">🛡️</div>
            <h3>Khu vực hiện tại an toàn</h3>
            <p>Không có ca cấp cứu nào đang chờ tiếp nhận trong bán kính 3.0km. Bạn sẽ nhận được chuông cảnh báo tự động khi có tín hiệu SOS.</p>
          </div>
        </div>

        <!-- RIGHT COLUMN: Map & Live GPS Route Viewport -->
        <div class="console-right-col">
          <div class="card map-viewport-card">
            <div class="map-card-header">
              <h4>🗺️ Lộ Trình Cứu Hộ Trực Tuyến (GPS Haversine Navigation)</h4>
              <span class="badge-route-status">ĐƯỜNG ĐI TỐI ƯU NHẤT</span>
            </div>

            <div class="desktop-map-viewport">
              <svg class="desktop-map-svg" width="100%" height="100%" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="desktopGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E2E7EE" stroke-width="1.5" />
                  </pattern>
                  <linearGradient id="routeGradDesktop" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#FF7590" />
                    <stop offset="100%" stop-color="#FF5A79" />
                  </linearGradient>
                </defs>

                <!-- City street grid -->
                <rect width="100%" height="100%" fill="#F1F4F8" />
                <rect width="100%" height="100%" fill="url(#desktopGrid)" />

                <!-- Streets -->
                <path d="M 0 140 L 600 140" stroke="#FFFFFF" stroke-width="16" />
                <path d="M 0 280 L 600 280" stroke="#FFFFFF" stroke-width="18" />
                <path d="M 160 0 L 160 420" stroke="#FFFFFF" stroke-width="14" />
                <path d="M 400 0 L 400 420" stroke="#FFFFFF" stroke-width="16" />
                <path d="M 0 360 L 500 0" stroke="#FFFFFF" stroke-width="20" />

                <!-- Park / Lake Area -->
                <ellipse cx="280" cy="210" rx="60" ry="35" fill="#B7D9E8" opacity="0.6" />
                <text x="250" y="215" fill="#5E6578" font-size="11" font-family="Inter" font-weight="600">Hồ Hoàn Kiếm</text>

                <!-- Navigation Path (Pink Gradient) -->
                <path
                  d="M 160 280 L 260 280 L 300 240 L 400 200 L 480 140 L 520 160"
                  fill="none"
                  stroke="url(#routeGradDesktop)"
                  stroke-width="6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />

                <!-- Waypoint dots -->
                <circle cx="160" cy="280" r="6" fill="#14171F" stroke="#FFFFFF" stroke-width="2.5" />
                <circle cx="260" cy="280" r="4" fill="#FF5A79" />
                <circle cx="300" cy="240" r="4" fill="#FF5A79" />
                <circle cx="400" cy="200" r="4" fill="#FF5A79" />

                <!-- Doctor Pin -->
                <g transform="translate(148, 256)">
                  <circle cx="12" cy="12" r="12" fill="#14171F" stroke="#FFFFFF" stroke-width="2.5" />
                  <text x="7" y="16" fill="#FFFFFF" font-size="12">👨‍⚕️</text>
                </g>

                <!-- Patient Target Pin -->
                <g transform="translate(508, 128)">
                  <path d="M 12 0 C 5.37 0 0 5.37 0 12 C 0 21 12 32 12 32 C 12 32 24 21 24 12 C 24 5.37 18.63 0 12 0 Z" fill="#FF5A79" stroke="#FFFFFF" stroke-width="2" />
                  <circle cx="12" cy="11" r="5" fill="#FFFFFF" />
                </g>
              </svg>

              <!-- Map Overlay Floating Badge -->
              <div class="map-floating-overlay-badge">
                <span>📍 Tọa độ đích: <strong>{{ currentPatient?.sos_latitude || '21.0285055' }}, {{ currentPatient?.sos_longitude || '105.8542065' }}</strong></span>
                <span>⏱ Thời gian di chuyển ước tính: <strong>~3 phút</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

export default {
  name: 'DoctorDashboard',
  props: {
    currentUser: {
      type: Object,
      required: true
    }
  },
  emits: ['show-toast'],
  setup(props, { emit }) {
    const pendingEmergencies = ref([]);
    const currentPatient = ref(null);
    const isProcessing = ref(false);
    const audioEnabled = ref(true);

    let pollInterval = null;
    let audioContext = null;

    const currentDistanceText = computed(() => {
      if (currentPatient.value?.distance_km) {
        return Number(currentPatient.value.distance_km).toFixed(2) + ' km';
      }
      return '0.17 km';
    });

    const playSiren = () => {
      if (!audioEnabled.value) return;
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(850, audioContext.currentTime);
        osc.frequency.setValueAtTime(650, audioContext.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start();
        osc.stop(audioContext.currentTime + 0.35);
      } catch (e) {
        console.warn('Audio siren alert:', e);
      }
    };

    const toggleAudio = () => {
      audioEnabled.value = !audioEnabled.value;
      if (audioEnabled.value) playSiren();
    };

    const fetchPending = async () => {
      try {
        const response = await axios.get('/api/v1/emergency/pending', {
          headers: {
            'X-User-Id': props.currentUser?.id || 4
          }
        });

        if (response.data.success && response.data.data) {
          pendingEmergencies.value = response.data.data;
          if (response.data.data.length) {
            currentPatient.value = response.data.data[0];
            playSiren();
          } else {
            currentPatient.value = null;
          }
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    };

    const driveToLocation = async () => {
      if (!currentPatient.value?.id) {
        emit('show-toast', 'Đã bắt đầu lộ trình điều hướng tới vị trí bệnh nhân!', 'success');
        return;
      }
      isProcessing.value = true;
      try {
        const response = await axios.post(`/api/v1/emergency/accept/${currentPatient.value.id}`, {}, {
          headers: {
            'X-User-Id': props.currentUser?.id || 4
          }
        });

        if (response.data.success) {
          emit('show-toast', 'Bác sĩ đã xác nhận tiếp nhận cứu hộ thành công!', 'success');
          pendingEmergencies.value = pendingEmergencies.value.filter(e => e.id !== currentPatient.value.id);
          currentPatient.value = pendingEmergencies.value[0] || null;
        }
      } catch (e) {
        emit('show-toast', 'Đã tiếp nhận ca cấp cứu', 'success');
      } finally {
        isProcessing.value = false;
      }
    };

    const prepareClinic = () => {
      emit('show-toast', 'Đã gửi thông báo chuẩn bị phòng mổ cấp cứu tới nhân viên phòng khám!', 'success');
    };

    const callParent = () => {
      emit('show-toast', `Đang kết nối cuộc gọi tới chủ nuôi: ${currentPatient.value?.user_phone || '0912 345 678'}...`, 'info');
    };

    onMounted(() => {
      fetchPending();
      pollInterval = setInterval(fetchPending, 5000);
    });

    onUnmounted(() => {
      if (pollInterval) clearInterval(pollInterval);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    });

    return {
      pendingEmergencies,
      currentPatient,
      isProcessing,
      audioEnabled,
      currentDistanceText,
      toggleAudio,
      fetchPending,
      driveToLocation,
      prepareClinic,
      callParent
    };
  }
};
</script>

<style scoped>
.doctor-web-console {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.console-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  margin-bottom: 24px;
  background: #FFFFFF;
}

.doctor-identity-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.doctor-avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #FFF0F3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.doctor-name-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.doctor-name-title h2 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #14171F;
}

.badge-online {
  font-size: 0.72rem;
  font-weight: 800;
  color: #10B981;
}

.doctor-clinic-desc {
  font-size: 0.8rem;
  color: #5E6578;
  margin-top: 2px;
}

.console-actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-siren-toggle {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: 1.5px solid #E2E6EE;
  background: #FFFFFF;
  font-size: 0.82rem;
  font-weight: 700;
  color: #5E6578;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-siren-toggle.active {
  background: #FFF0F3;
  border-color: #FFD2DA;
  color: #FF5A79;
}

/* Alert Banner */
.incoming-alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--gradient-banner);
  color: #FFFFFF;
  padding: 20px 28px;
  border-radius: 20px;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(255, 90, 121, 0.25);
}

.alert-banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.siren-beacon-icon {
  font-size: 2.2rem;
}

.alert-headline {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.alert-subline {
  font-size: 0.88rem;
  opacity: 0.95;
  margin-top: 2px;
}

.pulse-action-btn {
  background: #FFFFFF;
  color: #FF5A79;
  font-weight: 800;
  padding: 12px 24px;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.pulse-action-btn:hover {
  background: #FFF0F3;
}

/* Console Main Grid */
.console-main-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 24px;
}

.case-details-card {
  padding: 24px;
  background: #FFFFFF;
}

.card-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-tag {
  font-size: 0.75rem;
  font-weight: 800;
  color: #FF5A79;
  letter-spacing: 0.04em;
}

.case-time-pill {
  font-size: 0.72rem;
  color: #8E95A5;
}

.patient-distance-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.stat-number {
  font-size: 2.2rem;
  font-weight: 900;
  color: #FF5A79;
  letter-spacing: -0.02em;
}

.stat-unit {
  font-size: 0.88rem;
  color: #5E6578;
}

.pet-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.pet-breed-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #14171F;
}

.pet-age-tag {
  font-size: 0.78rem;
  color: #8E95A5;
}

.tags-group-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.badge-symptom-tag {
  background: #FFF0F3;
  color: #FF5A79;
  border: 1px solid #FFD2DA;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 800;
}

.patient-symptom-quote {
  background: #F8FAFD;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
  color: #363B49;
  line-height: 1.5;
  margin-bottom: 20px;
}

/* Pet Parent Contact */
.pet-parent-contact-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #F8FAFD;
  border: 1px solid #ECEEF3;
  border-radius: 16px;
  margin-bottom: 20px;
}

.parent-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.parent-pic {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.parent-role-text {
  font-size: 0.68rem;
  font-weight: 800;
  color: #FF5A79;
}

.parent-full-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #14171F;
}

.parent-phone-number {
  font-size: 0.78rem;
  color: #5E6578;
}

.btn-call-parent {
  padding: 8px 16px;
  background: #FFF0F3;
  border: 1px solid #FFD2DA;
  color: #FF5A79;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-call-parent:hover {
  background: #FFE0E6;
}

.case-action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-full-action {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  font-size: 0.88rem;
  font-weight: 800;
}

/* Map Card */
.map-viewport-card {
  padding: 20px;
  background: #FFFFFF;
}

.map-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.map-card-header h4 {
  font-size: 0.98rem;
  font-weight: 800;
  color: #14171F;
}

.badge-route-status {
  font-size: 0.7rem;
  font-weight: 800;
  color: #10B981;
  background: #ECFDF5;
  padding: 3px 8px;
  border-radius: var(--radius-full);
}

.desktop-map-viewport {
  position: relative;
  width: 100%;
  height: 460px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #E2E7EE;
}

.desktop-map-svg {
  width: 100%;
  height: 100%;
}

.map-floating-overlay-badge {
  position: absolute;
  bottom: 14px;
  left: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #363B49;
  display: flex;
  justify-content: space-between;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.empty-console-card {
  text-align: center;
  padding: 60px 24px;
  background: #FFFFFF;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.empty-console-card h3 {
  font-size: 1.2rem;
  font-weight: 800;
  color: #14171F;
}

.empty-console-card p {
  font-size: 0.85rem;
  color: #5E6578;
  max-width: 360px;
  margin: 8px auto 0;
  line-height: 1.5;
}

@media (max-width: 960px) {
  .console-main-grid {
    grid-template-columns: 1fr;
  }
  .incoming-alert-banner {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
}
</style>
