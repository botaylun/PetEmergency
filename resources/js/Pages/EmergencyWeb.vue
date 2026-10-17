<template>
  <div class="emergency-web-page">
    <div class="emergency-web-container">
      <!-- Top Emergency Warning Header Banner -->
      <div class="web-sos-hero-card card">
        <div class="hero-text-col">
          <div class="badge-emergency-mode">
            🚨 CHẾ ĐỘ CẤP CỨU THÚ CƯNG 24/7
          </div>
          <h2 class="hero-main-title">Trạm Điều Phối Cấp Cứu Thú Cưng Trực Tuyến</h2>
          <p class="hero-main-desc">
            Khi phát tín hiệu, hệ thống sẽ sử dụng công thức không gian địa lý Haversine quét trực tiếp trong cơ sở dữ liệu để tìm kiếm Top 5 bác sĩ thú y đã xác thực đang ở gần nhất trong bán kính 3.0km.
          </p>
        </div>

        <div class="hero-sos-trigger-col">
          <div
            class="sos-interactive-circle"
            :class="{ 'is-pressing': isPressing, 'is-loading': isLoading }"
            @mousedown="startPress"
            @touchstart.prevent="startPress"
            @mouseup="cancelPress"
            @mouseleave="cancelPress"
            @touchend="cancelPress"
          >
            <!-- Circular Progress SVG Ring -->
            <svg class="sos-ring-svg" viewBox="0 0 240 240">
              <defs>
                <linearGradient id="webRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FF7590" />
                  <stop offset="100%" stop-color="#FF5A79" />
                </linearGradient>
              </defs>
              <circle cx="120" cy="120" r="105" stroke="#FFE4E8" stroke-width="6" fill="transparent" />
              <circle
                class="sos-ring-stroke"
                cx="120"
                cy="120"
                r="105"
                stroke="url(#webRingGrad)"
                stroke-width="8"
                stroke-linecap="round"
                fill="transparent"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
              />
            </svg>

            <!-- Center Big SOS Disc -->
            <div class="sos-center-disc animate-pulse-sos">
              <svg class="sos-bell-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span class="disc-title">GIỮ 3 GIÂY<br />ĐỂ PHÁT SOS</span>
              <span class="disc-countdown">{{ isPressing ? countdownText : '3.0s...' }}</span>
            </div>
          </div>
          <span class="sos-hint">Nhấn và giữ chuột hoặc ngón tay đủ 3 giây</span>
        </div>
      </div>

      <!-- 2-Column Desktop Grid -->
      <div class="emergency-dashboard-grid">
        <!-- LEFT COLUMN: Triage & Symptoms Selector -->
        <div class="triage-panel-col">
          <!-- Card: Chọn triệu chứng -->
          <div class="card panel-card">
            <h3 class="panel-card-title">Tình Trạng Khẩn Cấp Của Thú Cưng</h3>
            <p class="panel-card-desc">Lựa chọn các dấu hiệu cấp tính để bác sĩ chuẩn bị trước trang thiết bị cấp cứu:</p>

            <div class="symptoms-selector-grid">
              <button
                v-for="sym in symptomsList"
                :key="sym.id"
                class="symptom-tag-btn"
                :class="{ selected: selectedSymptoms.includes(sym.id) }"
                @click="toggleSymptom(sym.id)"
              >
                <span class="sym-icon">{{ sym.icon }}</span>
                <span>{{ sym.label }}</span>
              </button>
            </div>

            <!-- Upload Photo/Video Proof -->
            <div class="media-proof-box" @click="triggerUpload">
              <input type="file" ref="fileUpload" class="hidden-input" accept="image/*,video/*" @change="onFileSelected" />
              <span class="proof-icon">📷</span>
              <span class="proof-text">{{ attachedFile ? attachedFile.name : 'Đính kèm hình ảnh hoặc video tình trạng thú cưng' }}</span>
            </div>
          </div>

          <!-- Card: AI Hướng Dẫn Sơ Cứu Tức Thì -->
          <div class="card panel-card ai-triage-card">
            <div class="ai-card-top">
              <div class="ai-title-wrap">
                <span class="ai-robot-badge">🤖 AI First-Aid Assistant</span>
                <span class="ai-model-tag">Gemini / OpenAI Triage</span>
              </div>
              <button class="btn btn-ghost btn-sm" @click="fetchAiGuidance" :disabled="loadingAi">
                🔄 Cập nhật hướng dẫn
              </button>
            </div>

            <div v-if="loadingAi" class="ai-loading-box">
              <div class="spinner-small" style="border-top-color: #FF5A79; border-color: rgba(255,90,121,0.2);"></div>
              <span>AI đang phân tích quy trình sơ cứu y khoa thú y khẩn cấp...</span>
            </div>

            <div v-else class="triage-steps-flow">
              <div
                v-for="step in aiSteps"
                :key="step.step"
                class="flow-step-item"
                :class="'priority-' + (step.priority || 'urgent')"
              >
                <div class="flow-num-badge">Bước {{ step.step }}</div>
                <div class="flow-step-content">
                  <p class="flow-action">{{ step.action }}</p>
                  <p v-if="step.warning" class="flow-warning">⚠️ {{ step.warning }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Radar & Top 5 Closest Doctors -->
        <div class="radar-panel-col">
          <!-- Card: Bác sĩ trong phạm vi 3.0km -->
          <div class="card panel-card">
            <div class="panel-header-row">
              <h3 class="panel-card-title">🩺 Bác Sĩ Thú Y Tiếp Cận Gần Nhất (3.0 km)</h3>
              <span class="badge-online-count">
                ● {{ nearbyDoctors.length }} bác sĩ trực ban
              </span>
            </div>

            <div class="doctors-cards-stack">
              <div
                v-for="(doc, idx) in nearbyDoctors"
                :key="doc.id"
                class="doctor-result-card"
                :class="{ 'closest-highlight': idx === 0 }"
              >
                <div class="doc-avatar-box">
                  👨‍⚕️
                </div>
                <div class="doc-info-body">
                  <div class="doc-name-row">
                    <span class="doc-name">{{ doc.name }}</span>
                    <span v-if="idx === 0" class="badge-nearest">TIẾP CẬN GẦN NHẤT</span>
                  </div>
                  <span class="doc-phone">📞 {{ doc.phone || '0901 234 567' }}</span>
                </div>
                <div class="doc-dist-box">
                  <span class="dist-km">{{ Number(doc.distance_km).toFixed(2) }}</span>
                  <span class="dist-label">km</span>
                </div>
              </div>
            </div>

            <div class="clinic-dispatch-footer">
              <div class="dispatch-gps-info">
                <span>📍 Tọa độ của bạn: <strong>21.0285055, 105.8542065</strong></span>
                <span style="color: #10B981;">● Bán kính quét Haversine: 3.0 km</span>
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
  name: 'EmergencyWeb',
  props: {
    currentUser: {
      type: Object,
      required: true
    }
  },
  emits: ['show-toast'],
  setup(props, { emit }) {
    const isPressing = ref(false);
    const progress = ref(0);
    const isLoading = ref(false);
    const attachedFile = ref(null);
    const fileUpload = ref(null);

    const selectedSymptoms = ref(['accident', 'severe_injury']);
    const symptomsList = [
      { id: 'accident', icon: '❤️', label: 'Tai nạn / Va chạm' },
      { id: 'poisoning', icon: '🚫', label: 'Nghi ngộ độc' },
      { id: 'severe_injury', icon: '🩹', label: 'Vết thương hở / Chảy máu' },
      { id: 'choking', icon: '💨', label: 'Nghẹn dị vật / Khó thở' },
      { id: 'vomiting', icon: '🤢', label: 'Nôn mửa liên tục' },
      { id: 'convulsion', icon: '⚡', label: 'Co giật / Bất tỉnh' }
    ];

    const nearbyDoctors = ref([
      { id: 4, name: 'BS. Phạm Thị Mai', phone: '0901 234 567', distance_km: 0.17 },
      { id: 5, name: 'BS. Trần Quốc Bảo', phone: '0902 345 678', distance_km: 0.90 },
      { id: 6, name: 'BS. Nguyễn Hoàng Dũng', phone: '0903 456 789', distance_km: 1.13 },
      { id: 7, name: 'BS. Vũ Thanh Lan', phone: '0904 567 890', distance_km: 1.41 },
      { id: 8, name: 'BS. Đỗ Minh Tuấn', phone: '0905 678 901', distance_km: 1.78 }
    ]);

    const loadingAi = ref(false);
    const aiSteps = ref([]);

    let timer = null;
    const radius = 105;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffset = computed(() => {
      return circumference * (1 - progress.value);
    });

    const countdownText = computed(() => {
      const remaining = Math.max(0, 3 - progress.value * 3);
      return remaining.toFixed(1) + 's...';
    });

    const startPress = () => {
      if (isLoading.value) return;
      isPressing.value = true;
      progress.value = 0;
      const start = Date.now();

      timer = setInterval(() => {
        const elapsed = Date.now() - start;
        progress.value = Math.min(elapsed / 3000, 1);
        if (progress.value >= 1) {
          clearInterval(timer);
          dispatchSos();
        }
      }, 30);
    };

    const cancelPress = () => {
      if (progress.value < 1) {
        clearInterval(timer);
        isPressing.value = false;
        progress.value = 0;
      }
    };

    const toggleSymptom = (id) => {
      const idx = selectedSymptoms.value.indexOf(id);
      if (idx > -1) {
        selectedSymptoms.value.splice(idx, 1);
      } else {
        selectedSymptoms.value.push(id);
      }
    };

    const triggerUpload = () => {
      fileUpload.value?.click();
    };

    const onFileSelected = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        attachedFile.value = file;
        emit('show-toast', `Đã đính kèm bằng chứng: ${file.name}`, 'info');
      }
    };

    const dispatchSos = async () => {
      isPressing.value = false;
      isLoading.value = true;

      let lat = 21.0285055;
      let lng = 105.8542065;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: true });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (geoErr) {
          console.warn('Geolocation fallback:', geoErr);
        }
      }

      try {
        const response = await axios.post('/api/v1/emergency/sos', {
          latitude: lat,
          longitude: lng,
          description: selectedSymptoms.value.join(', ') || 'Cấp cứu thú cưng khẩn cấp',
          urgency_level: 'critical'
        }, {
          headers: {
            'X-User-Id': props.currentUser?.id || 1
          }
        });

        if (response.data.success) {
          emit('show-toast', 'Tín hiệu SOS đã được gửi thành công đến các bác sĩ gần nhất!', 'success');
          if (response.data.data?.nearby_doctors) {
            nearbyDoctors.value = response.data.data.nearby_doctors;
          }
          fetchAiGuidance();
        }
      } catch (err) {
        if (err.response && err.response.status === 429) {
          const retryAfter = err.response.data?.retry_after || 120;
          emit('show-toast', `Chống DDoS SOS: Vui lòng đợi ${retryAfter} giây trước khi gửi tiếp`, 'warning');
        } else {
          emit('show-toast', 'Lỗi khi gửi tín hiệu SOS', 'error');
        }
      } finally {
        isLoading.value = false;
        progress.value = 0;
      }
    };

    const fetchAiGuidance = async () => {
      loadingAi.value = true;
      try {
        const response = await axios.post('/api/v1/emergency/ai-first-aid', {
          symptoms: selectedSymptoms.value.join(', ') || 'tai nạn và thương tích',
          pet_type: 'dog',
          urgency: 'critical'
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          aiSteps.value = response.data.data;
        }
      } catch (e) {
        console.warn('AI Triage error:', e);
      } finally {
        loadingAi.value = false;
      }
    };

    onMounted(() => {
      fetchAiGuidance();
    });

    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });

    return {
      isPressing,
      progress,
      isLoading,
      circumference,
      strokeDashoffset,
      countdownText,
      selectedSymptoms,
      symptomsList,
      nearbyDoctors,
      loadingAi,
      aiSteps,
      attachedFile,
      fileUpload,
      startPress,
      cancelPress,
      toggleSymptom,
      triggerUpload,
      onFileSelected,
      fetchAiGuidance
    };
  }
};
</script>

<style scoped>
.emergency-web-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 60px;
}

.web-sos-hero-card {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
  align-items: center;
  padding: 36px 40px;
  margin-bottom: 28px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FFF5F7 100%);
  border: 1.5px solid #FFD2DA;
  box-shadow: 0 10px 30px rgba(255, 90, 121, 0.08);
}

.hero-main-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #14171F;
  margin: 10px 0 8px;
  letter-spacing: -0.02em;
}

.hero-main-desc {
  font-size: 0.92rem;
  color: #5E6578;
  line-height: 1.6;
}

.hero-sos-trigger-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sos-interactive-circle {
  position: relative;
  width: 240px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.sos-ring-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.sos-ring-stroke {
  transition: stroke-dashoffset 0.03s linear;
}

.sos-center-disc {
  width: 184px;
  height: 184px;
  border-radius: 50%;
  background: var(--gradient-sos);
  color: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: var(--shadow-sos);
  transition: transform 0.2s;
}

.is-pressing .sos-center-disc {
  transform: scale(0.92);
}

.disc-title {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.2;
}

.disc-countdown {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.9;
  margin-top: 4px;
}

.sos-hint {
  font-size: 0.8rem;
  color: #8E95A5;
  margin-top: 14px;
}

/* 2-Column Dashboard Grid */
.emergency-dashboard-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}

.panel-card {
  padding: 24px;
  margin-bottom: 24px;
  background: #FFFFFF;
}

.panel-card-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #14171F;
}

.panel-card-desc {
  font-size: 0.82rem;
  color: #5E6578;
  margin: 4px 0 16px;
}

.symptoms-selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.symptom-tag-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #F8FAFD;
  border: 1.5px solid #E2E6EE;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #363B49;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.symptom-tag-btn.selected {
  background: #FFF0F3;
  border-color: #FFD2DA;
  color: #FF5A79;
}

.media-proof-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #F8FAFD;
  border: 1px dashed #CBD2DE;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: #5E6578;
  transition: all 0.2s;
}

.media-proof-box:hover {
  border-color: #FF5A79;
  background: #FFF9FA;
  color: #FF5A79;
}

.hidden-input {
  display: none;
}

/* AI Triage Card */
.ai-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.ai-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-robot-badge {
  font-size: 0.95rem;
  font-weight: 800;
  color: #FF5A79;
}

.ai-model-tag {
  font-size: 0.7rem;
  background: #F3F5F9;
  color: #5E6578;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.triage-steps-flow {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.flow-step-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: #F8FAFD;
  border-left: 3px solid #FF5A79;
  border-radius: 4px 12px 12px 4px;
}

.flow-num-badge {
  font-size: 0.75rem;
  font-weight: 800;
  color: #FF5A79;
  white-space: nowrap;
}

.flow-action {
  font-size: 0.85rem;
  color: #14171F;
}

.flow-warning {
  font-size: 0.75rem;
  color: #D97706;
  font-weight: 600;
  margin-top: 2px;
}

/* Right Doctors Stack */
.panel-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.badge-online-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: #10B981;
}

.doctors-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.doctor-result-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #F8FAFD;
  border: 1px solid #ECEEF3;
  border-radius: 14px;
  transition: all 0.2s;
}

.doctor-result-card.closest-highlight {
  border-color: #FFD2DA;
  background: #FFF0F3;
}

.doc-avatar-box {
  font-size: 1.8rem;
}

.doc-info-body {
  flex: 1;
}

.doc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.doc-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #14171F;
}

.badge-nearest {
  font-size: 0.65rem;
  font-weight: 800;
  background: #FF5A79;
  color: #FFFFFF;
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

.doc-phone {
  font-size: 0.78rem;
  color: #5E6578;
}

.doc-dist-box {
  text-align: right;
  background: #FFFFFF;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid #ECEEF3;
}

.dist-km {
  font-size: 1.1rem;
  font-weight: 900;
  color: #10B981;
}

.dist-label {
  font-size: 0.72rem;
  color: #5E6578;
  margin-left: 2px;
}

.dispatch-gps-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #5E6578;
  padding-top: 12px;
  border-top: 1px solid #ECEEF3;
}

@media (max-width: 900px) {
  .web-sos-hero-card {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .emergency-dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
