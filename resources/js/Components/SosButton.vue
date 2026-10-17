<template>
  <div class="figma-sos-screen">
    <!-- Top Header inside Frame -->
    <div class="sos-screen-header">
      <div class="sos-brand-group">
        <div class="brand-close-circle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <span class="sos-brand-title">PetEmergency</span>
      </div>

      <div class="badge-emergency-mode">
        Emergency Mode
      </div>
    </div>

    <!-- Main SOS Trigger Zone -->
    <div class="sos-center-stage">
      <div
        class="sos-interactive-container"
        :class="{ 'is-pressing': isPressing, 'is-loading': isLoading }"
        @mousedown="startPress"
        @touchstart.prevent="startPress"
        @mouseup="cancelPress"
        @mouseleave="cancelPress"
        @touchend="cancelPress"
      >
        <!-- Circular Progress Ring (Figma pink arc) -->
        <svg class="sos-svg-ring" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="figmaRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FF5A7A" />
              <stop offset="100%" stop-color="#FF2A54" />
            </linearGradient>
            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- Outer Soft Track -->
          <circle
            cx="110"
            cy="110"
            r="98"
            stroke="#FFE6EB"
            stroke-width="5"
            fill="transparent"
          />

          <!-- Active Animated Stroke -->
          <circle
            class="sos-animated-stroke"
            cx="110"
            cy="110"
            r="98"
            stroke="url(#figmaRingGradient)"
            stroke-width="6"
            stroke-linecap="round"
            fill="transparent"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            filter="url(#ringGlow)"
          />
        </svg>

        <!-- Center Glowing Disc Button -->
        <div class="sos-disc-button animate-pulse-sos">
          <!-- Bell Icon Outline -->
          <svg class="bell-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>

          <span class="hold-title">HOLD 3s FOR<br />SOS</span>
          
          <span class="countdown-label">
            {{ isPressing ? currentSecondsDisplay : '3.0s...' }}
          </span>
        </div>
      </div>

      <!-- Subtitle instructions -->
      <p class="sos-caption-text">
        Press and hold for 3 seconds to activate<br />
        emergency alert and notify nearest vets.
      </p>
    </div>

    <!-- Bottom Sheet Card: What is the emergency? -->
    <div class="sos-bottom-sheet">
      <div class="sheet-drag-handle"></div>

      <div class="sheet-header">
        <h3 class="sheet-title">What is the emergency?</h3>
        <p class="sheet-subtitle">Select symptoms to speed up clinic response</p>
      </div>

      <!-- 2x2 Symptoms Grid -->
      <div class="symptoms-grid">
        <button
          type="button"
          class="symptom-btn"
          :class="{ selected: selectedSymptoms.includes('accident') }"
          @click="toggleSymptom('accident')"
        >
          <svg class="symptom-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>Accident</span>
        </button>

        <button
          type="button"
          class="symptom-btn"
          :class="{ selected: selectedSymptoms.includes('poisoning') }"
          @click="toggleSymptom('poisoning')"
        >
          <svg class="symptom-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <span>Poisoning</span>
        </button>

        <button
          type="button"
          class="symptom-btn"
          :class="{ selected: selectedSymptoms.includes('severe_injury') }"
          @click="toggleSymptom('severe_injury')"
        >
          <svg class="symptom-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Severe Injury</span>
        </button>

        <button
          type="button"
          class="symptom-btn"
          :class="{ selected: selectedSymptoms.includes('choking') }"
          @click="toggleSymptom('choking')"
        >
          <svg class="symptom-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>Choking</span>
        </button>
      </div>

      <!-- Attach Photo/Video Proof Button -->
      <div class="attach-media-bar" @click="triggerPhotoPicker">
        <input type="file" ref="filePicker" class="hidden-picker" accept="image/*,video/*" @change="onPhotoSelected" />
        <div class="attach-icon-circle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF3B62" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        <span class="attach-text">{{ attachedFile ? attachedFile.name : 'Tap to attach photo/video proof' }}</span>
      </div>

      <!-- AI Assistant Guidance Card -->
      <div class="ai-guidance-card" @click="showAiDialog = true">
        <div class="ai-guidance-header">
          <span class="ai-pink-title">AI Assistant: Quick First-Aid Guidance</span>
        </div>
        <p class="ai-guidance-placeholder">
          {{ aiSteps.length ? `Showing ${aiSteps.length} step first-aid plan...` : 'Describe symptoms for instant AI guidance...' }}
        </p>
      </div>
    </div>

    <!-- AI First-Aid Drawer / Dialog -->
    <div v-if="showAiDialog" class="ai-drawer-overlay" @click.self="showAiDialog = false">
      <div class="ai-drawer-box">
        <div class="drawer-top-bar">
          <span class="ai-pink-title">🤖 AI Clinical First-Aid Steps</span>
          <button class="btn-drawer-close" @click="showAiDialog = false">✕</button>
        </div>

        <div v-if="loadingAi" class="drawer-loading">
          <div class="spinner"></div>
          <span>AI is preparing immediate triage steps...</span>
        </div>

        <div v-else class="drawer-steps-list">
          <div
            v-for="step in aiSteps"
            :key="step.step"
            class="triage-step-card"
            :class="'priority-' + (step.priority || 'urgent')"
          >
            <span class="step-num">Step {{ step.step }}</span>
            <div class="step-details">
              <p class="step-text">{{ step.action }}</p>
              <p v-if="step.warning" class="step-alert">⚠️ {{ step.warning }}</p>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-drawer-action" @click="fetchAiSteps">
          Regenerate AI Guidance
        </button>
      </div>
    </div>

    <!-- Success Modal When SOS Dispatched -->
    <div v-if="showSuccessModal" class="ai-drawer-overlay" @click.self="showSuccessModal = false">
      <div class="ai-drawer-box success-box">
        <div class="success-icon-badge">🚑</div>
        <h3 class="success-title">SOS Signal Broadcasted!</h3>
        <p class="success-desc">Top 5 nearest clinics within 3.0km notified via native Haversine dispatch.</p>
        
        <div class="dispatched-vets-list" v-if="sosData?.nearby_doctors">
          <div v-for="doc in sosData.nearby_doctors" :key="doc.id" class="vet-row">
            <span class="vet-name">👨‍⚕️ {{ doc.name }}</span>
            <span class="vet-dist">{{ Number(doc.distance_km).toFixed(2) }} km</span>
          </div>
        </div>

        <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" @click="showSuccessModal = false">
          Got It
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

export default {
  name: 'SosButton',
  props: {
    userId: {
      type: Number,
      default: 1
    }
  },
  emits: ['show-toast', 'sos-dispatched'],
  setup(props, { emit }) {
    const isPressing = ref(false);
    const progress = ref(0);
    const isLoading = ref(false);
    const selectedSymptoms = ref(['accident']);
    const attachedFile = ref(null);
    const filePicker = ref(null);

    const showAiDialog = ref(false);
    const showSuccessModal = ref(false);
    const loadingAi = ref(false);
    const aiSteps = ref([]);
    const sosData = ref(null);

    let pressTimer = null;
    const PRESS_DURATION = 3000;
    const UPDATE_INTERVAL = 30;

    // Radius 98 -> Circumference = 2 * PI * 98 ≈ 615.75
    const radius = 98;
    const circumference = 2 * Math.PI * radius;

    const strokeDashoffset = computed(() => {
      return circumference * (1 - progress.value);
    });

    const currentSecondsDisplay = computed(() => {
      const remaining = Math.max(0, 3 - (progress.value * 3));
      return remaining.toFixed(1) + 's...';
    });

    const startPress = () => {
      if (isLoading.value) return;
      isPressing.value = true;
      progress.value = 0;

      const startTime = Date.now();

      pressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        progress.value = Math.min(elapsed / PRESS_DURATION, 1);

        if (progress.value >= 1) {
          clearInterval(pressTimer);
          triggerSosBroadcast();
        }
      }, UPDATE_INTERVAL);
    };

    const cancelPress = () => {
      if (progress.value < 1) {
        clearInterval(pressTimer);
        isPressing.value = false;
        progress.value = 0;
      }
    };

    const toggleSymptom = (sym) => {
      const idx = selectedSymptoms.value.indexOf(sym);
      if (idx > -1) {
        selectedSymptoms.value.splice(idx, 1);
      } else {
        selectedSymptoms.value.push(sym);
      }
    };

    const triggerPhotoPicker = () => {
      filePicker.value?.click();
    };

    const onPhotoSelected = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        attachedFile.value = file;
        emit('show-toast', `Attached: ${file.name}`, 'success');
      }
    };

    const triggerSosBroadcast = async () => {
      isPressing.value = false;
      isLoading.value = true;

      // Geolocation or standard fallback
      let lat = 21.0285055;
      let lng = 105.8542065;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sendSos(pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            sendSos(lat, lng);
          },
          { timeout: 3000 }
        );
      } else {
        sendSos(lat, lng);
      }
    };

    const sendSos = async (lat, lng) => {
      try {
        const response = await axios.post('/api/v1/emergency/sos', {
          latitude: lat,
          longitude: lng,
          description: selectedSymptoms.value.join(', ') || 'Cấp cứu thú cưng khẩn cấp',
          urgency_level: 'critical'
        }, {
          headers: {
            'X-User-Id': (props.userId || 1).toString()
          }
        });

        if (response.data.success) {
          sosData.value = response.data.data;
          showSuccessModal.value = true;
          emit('sos-dispatched', response.data.data);
          emit('show-toast', 'Tín hiệu SOS đã phát tới các bác sĩ gần nhất!', 'success');
          fetchAiSteps();
        }
      } catch (err) {
        if (err.response && err.response.status === 429) {
          const retryAfter = err.response.data?.retry_after || 120;
          emit('show-toast', `Quá tải: Vui lòng đợi ${retryAfter} giây trước khi gửi tiếp`, 'warning');
        } else {
          console.error('SOS error:', err);
          emit('show-toast', 'Lỗi khi gửi tín hiệu SOS', 'error');
        }
      } finally {
        isLoading.value = false;
        progress.value = 0;
      }
    };

    const fetchAiSteps = async () => {
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
        console.warn('AI triage error:', e);
      } finally {
        loadingAi.value = false;
      }
    };

    onMounted(() => {
      fetchAiSteps();
    });

    onUnmounted(() => {
      if (pressTimer) clearInterval(pressTimer);
    });

    return {
      isPressing,
      progress,
      isLoading,
      circumference,
      strokeDashoffset,
      currentSecondsDisplay,
      selectedSymptoms,
      attachedFile,
      filePicker,
      showAiDialog,
      showSuccessModal,
      loadingAi,
      aiSteps,
      sosData,
      startPress,
      cancelPress,
      toggleSymptom,
      triggerPhotoPicker,
      onPhotoSelected,
      fetchAiSteps
    };
  }
};
</script>

<style scoped>
.figma-sos-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #FFFFFF;
  position: relative;
  overflow-y: auto;
}

/* Header */
.sos-screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
}

.sos-brand-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-close-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid #FF3B62;
  color: #FF3B62;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sos-brand-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #FF3B62;
  letter-spacing: -0.02em;
}

/* Center Stage */
.sos-center-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 20px 24px;
}

.sos-interactive-container {
  position: relative;
  width: 230px;
  height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  touch-action: none;
}

.sos-svg-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.sos-animated-stroke {
  transition: stroke-dashoffset 0.03s linear;
}

.sos-disc-button {
  width: 176px;
  height: 176px;
  border-radius: 50%;
  background: var(--gradient-sos);
  box-shadow: 0 16px 40px rgba(255, 42, 84, 0.44), inset 0 2px 6px rgba(255, 255, 255, 0.5);
  color: #FFFFFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.is-pressing .sos-disc-button {
  transform: scale(0.93);
  box-shadow: 0 8px 24px rgba(255, 42, 84, 0.6);
}

.bell-icon {
  margin-bottom: 6px;
  stroke: #FFFFFF;
}

.hold-title {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: 0.04em;
}

.countdown-label {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.9;
  margin-top: 4px;
}

.sos-caption-text {
  text-align: center;
  font-size: 0.85rem;
  color: #8E95A5;
  line-height: 1.45;
  margin-top: 20px;
}

/* Bottom Sheet */
.sos-bottom-sheet {
  background: #FFFFFF;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  box-shadow: 0 -8px 30px rgba(20, 23, 31, 0.06);
  padding: 12px 20px 24px;
  border-top: 1px solid #F0F2F6;
  margin-top: auto;
}

.sheet-drag-handle {
  width: 38px;
  height: 4px;
  background: #E2E6EE;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.sheet-header {
  margin-bottom: 14px;
}

.sheet-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #14171F;
}

.sheet-subtitle {
  font-size: 0.78rem;
  color: #8E95A5;
  margin-top: 2px;
}

/* 2x2 Symptoms */
.symptoms-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.symptom-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #F6F8FC;
  border: 1.5px solid transparent;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #363B49;
  cursor: pointer;
  transition: all 0.2s;
}

.symptom-btn .symptom-icon {
  color: #8E95A5;
}

.symptom-btn.selected {
  background: #FFF0F3;
  border-color: #FFD2DA;
  color: #FF3B62;
}

.symptom-btn.selected .symptom-icon {
  color: #FF3B62;
}

/* Attach Media Bar */
.attach-media-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #F8FAFD;
  border: 1px solid #EEF1F6;
  border-radius: 14px;
  padding: 12px 16px;
  cursor: pointer;
  margin-bottom: 12px;
  transition: background 0.2s;
}

.attach-media-bar:hover {
  background: #F0F4FA;
}

.hidden-picker {
  display: none;
}

.attach-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #FFE8ED;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.attach-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #2D3340;
}

/* AI Assistant Guidance Card */
.ai-guidance-card {
  background: #F8FAFD;
  border: 1px solid #EEF1F6;
  border-radius: 14px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-guidance-card:hover {
  border-color: #FFD2DA;
  background: #FFF9FA;
}

.ai-pink-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: #FF3B62;
}

.ai-guidance-placeholder {
  font-size: 0.78rem;
  color: #8E95A5;
  margin-top: 3px;
}

/* Drawer / Dialog */
.ai-drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(20, 23, 31, 0.5);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.ai-drawer-box {
  background: #FFFFFF;
  border-top-left-radius: 28px;
  border-top-right-radius: 28px;
  padding: 20px;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
}

.drawer-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.btn-drawer-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #8E95A5;
  cursor: pointer;
}

.drawer-steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.triage-step-card {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #F8FAFD;
  border-left: 3px solid #FF3B62;
}

.step-num {
  font-size: 0.75rem;
  font-weight: 800;
  color: #FF3B62;
  white-space: nowrap;
}

.step-text {
  font-size: 0.82rem;
  color: #14171F;
}

.step-alert {
  font-size: 0.72rem;
  color: #F59E0B;
  font-weight: 600;
  margin-top: 2px;
}

.btn-drawer-action {
  width: 100%;
  padding: 10px;
  font-size: 0.85rem;
}

/* Success Box */
.success-box {
  text-align: center;
  padding: 28px 20px;
}

.success-icon-badge {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.success-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #14171F;
}

.success-desc {
  font-size: 0.82rem;
  color: #5E6578;
  margin-top: 4px;
}

.dispatched-vets-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.vet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #F8FAFD;
  border-radius: 8px;
  font-size: 0.82rem;
}

.vet-name {
  font-weight: 600;
}

.vet-dist {
  color: #10B981;
  font-weight: 700;
}
</style>
