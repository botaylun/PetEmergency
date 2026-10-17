<template>
  <div class="page-container page-wide">
    <div class="gps-header-card glass-card animate-slide-up">
      <div class="header-info">
        <div class="avatar avatar-lg" style="background: var(--gradient-success)">
          📡
        </div>
        <div>
          <h2 class="page-title">Theo Dõi Vòng Đeo Cổ GPS Thú Cưng</h2>
          <p class="page-subtitle">Hệ thống giám sát định vị thời gian thực & giả lập phần cứng IoT Collar</p>
        </div>
      </div>

      <button class="btn btn-primary btn-sm" @click="openPairModal">
        + Gắn Vòng Cổ GPS Mới
      </button>
    </div>

    <!-- Main Layout Grid -->
    <div class="gps-grid">
      <!-- Left Column: Pet List -->
      <div class="pets-col">
        <div class="section-title-bar">
          <h3>🐕 Thú Cưng Của Bạn ({{ pets.length }})</h3>
          <button class="btn btn-ghost btn-sm" @click="fetchPets">🔄</button>
        </div>

        <div v-if="loading" class="empty-state">
          <div class="spinner"></div>
          <p style="margin-top: 10px;">Đang tải danh sách thú cưng...</p>
        </div>

        <div v-else-if="!pets.length" class="empty-state glass-card">
          <div class="empty-state-icon">🐾</div>
          <p>Bạn chưa có hồ sơ thú cưng nào</p>
        </div>

        <div v-else class="pets-cards-stack">
          <div
            v-for="pet in pets"
            :key="pet.id"
            class="glass-card pet-card"
            :class="{ 'is-selected': selectedPet?.id === pet.id }"
            @click="selectPet(pet)"
          >
            <div class="pet-card-avatar">
              {{ pet.type === 'dog' ? '🐶' : (pet.type === 'cat' ? '🐱' : '🐾') }}
            </div>

            <div class="pet-card-info">
              <div class="pet-name-line">
                <span class="pet-name">{{ pet.pet_name }}</span>
                <span v-if="pet.hardware_gps_id" class="badge badge-gps">
                  GPS: {{ pet.hardware_gps_id }}
                </span>
                <span v-else class="badge badge-no-gps">
                  Chưa gắn vòng cổ
                </span>
              </div>
              <div class="pet-sub-info">
                {{ pet.type === 'dog' ? 'Chó' : 'Mèo' }} • {{ pet.breed }}
              </div>
            </div>

            <div class="pet-card-arrow">
              →
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Interactive Map & Live Telemetry -->
      <div class="tracking-col">
        <div v-if="!selectedPet" class="empty-state glass-card">
          <div class="empty-state-icon">🗺️</div>
          <div class="empty-state-text">Chọn một thú cưng để xem tọa độ GPS</div>
          <p class="text-muted">Chọn từ danh sách bên trái để mở bản đồ định vị</p>
        </div>

        <div v-else class="tracking-active-box">
          <!-- Pet Status Bar -->
          <div class="glass-card active-pet-bar animate-slide-up">
            <div class="active-meta">
              <span class="pet-big-avatar">{{ selectedPet.type === 'dog' ? '🐶' : '🐱' }}</span>
              <div>
                <h3 class="active-pet-name">{{ selectedPet.pet_name }}</h3>
                <span v-if="selectedPet.hardware_gps_id" class="text-cyan font-mono" style="font-size: 0.8rem;">
                  ID Vòng cổ: {{ selectedPet.hardware_gps_id }}
                </span>
                <span v-else class="text-danger" style="font-size: 0.8rem;">
                  Chưa kích hoạt thiết bị phần cứng
                </span>
              </div>
            </div>

            <!-- Hardware collar pairing button if not paired -->
            <button
              v-if="!selectedPet.hardware_gps_id"
              class="btn btn-doctor btn-sm"
              @click="openPairModalWithPet(selectedPet)"
            >
              Gắn Thiết Bị Ngay
            </button>

            <!-- Collar live controls if paired -->
            <div v-else class="simulator-controls">
              <button
                class="btn btn-sm"
                :class="isSimulating ? 'btn-danger' : 'btn-success'"
                @click="toggleSimulation"
              >
                <span>{{ isSimulating ? '⏹ Dừng Giả Lập' : '▶ Giả Lập Di Chuyển' }}</span>
              </button>
            </div>
          </div>

          <!-- Interactive Mockup Map Viewport -->
          <div class="glass-card map-mockup-card animate-slide-up animate-delay-1">
            <div class="map-viewport-wrapper">
              <!-- Map Grid SVG Background -->
              <svg class="map-svg-grid" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
                  </pattern>
                  <radialGradient id="geofenceGlow">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="#0a111e" />
                <rect width="100%" height="100%" fill="url(#grid)" />

                <!-- Road simulation paths -->
                <path d="M 0 160 Q 200 120 400 200 T 800 220" fill="none" stroke="rgba(56, 189, 248, 0.15)" stroke-width="14" />
                <path d="M 120 0 Q 180 200 240 400" fill="none" stroke="rgba(56, 189, 248, 0.12)" stroke-width="10" />
                <path d="M 500 0 L 520 400" fill="none" stroke="rgba(56, 189, 248, 0.1)" stroke-width="8" />

                <!-- Lake / Park Area -->
                <ellipse cx="280" cy="240" rx="140" ry="90" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.25)" stroke-width="2" />
                <text x="260" y="245" fill="rgba(6, 182, 212, 0.5)" font-size="12" font-family="Inter">Hồ Hoàn Kiếm</text>

                <!-- Geofence Safety Circle around Home -->
                <circle cx="280" cy="220" r="110" fill="url(#geofenceGlow)" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6,4" />
              </svg>

              <!-- Safe Zone Badge -->
              <div class="map-badge-safe-zone">
                🛡️ VÙNG AN TOÀN (GEOFENCE: 500M)
              </div>

              <!-- Map Live Coordinates Overlay -->
              <div class="map-coords-badge">
                <span>LAT: {{ (Number(selectedPet.tracking_lat) || 21.0285).toFixed(6) }}</span>
                <span>LNG: {{ (Number(selectedPet.tracking_lng) || 105.8542).toFixed(6) }}</span>
              </div>

              <!-- Pet Dynamic Location Pin on Map -->
              <div
                class="map-pet-pin"
                :style="pinMapStyle"
              >
                <div class="pin-pulse-ring"></div>
                <div class="pin-marker">
                  <span class="pin-emoji">{{ selectedPet.type === 'dog' ? '🐕' : '🐈' }}</span>
                </div>
                <div class="pin-tooltip">
                  <strong>{{ selectedPet.pet_name }}</strong>
                  <span>{{ isSimulating ? 'Đang chạy bộ...' : 'Đang nghỉ ngơi' }}</span>
                </div>
              </div>
            </div>

            <!-- Telemetry Status Bar -->
            <div class="telemetry-bar">
              <div class="telemetry-stat">
                <span class="tel-label">Trạng thái kết nối</span>
                <span class="tel-val text-emerald">● Trực tuyến 4G LTE</span>
              </div>
              <div class="telemetry-stat">
                <span class="tel-label">Pin vòng cổ</span>
                <span class="tel-val text-cyan">🔋 87% (3 ngày còn lại)</span>
              </div>
              <div class="telemetry-stat">
                <span class="tel-label">Độ chính xác GPS</span>
                <span class="tel-val font-semibold">&plusmn; 2.5 mét</span>
              </div>
              <div class="telemetry-stat">
                <span class="tel-label">Cập nhật lần cuối</span>
                <span class="tel-val text-muted">{{ lastUpdatedTime || 'Vừa xong' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pair GPS Collar Modal -->
    <div v-if="showPairModal" class="modal-overlay" @click.self="showPairModal = false">
      <div class="modal-content glass-card">
        <h3 class="modal-title">Gắn Vòng Đeo Cổ GPS</h3>
        <p class="text-muted" style="margin-bottom: 16px; font-size: 0.85rem;">
          Nhập mã định danh phần cứng (Hardware ID in trên mặt sau thiết bị vòng cổ) để kích hoạt tính năng theo dõi vị trí trực tiếp.
        </p>

        <div style="margin-bottom: 14px;">
          <label class="form-label" style="display: block; font-size: 0.8rem; margin-bottom: 6px; color: var(--color-text-secondary);">
            Chọn thú cưng:
          </label>
          <select v-model="pairForm.pet_id" class="form-input">
            <option v-for="p in pets" :key="p.id" :value="p.id">
              {{ p.pet_name }} ({{ p.breed }})
            </option>
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <label class="form-label" style="display: block; font-size: 0.8rem; margin-bottom: 6px; color: var(--color-text-secondary);">
            Hardware GPS ID:
          </label>
          <input
            type="text"
            v-model="pairForm.hardware_gps_id"
            class="form-input font-mono"
            placeholder="VD: GPS-COLLAR-888"
          />
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showPairModal = false">Hủy</button>
          <button class="btn btn-primary" :disabled="isPairing" @click="submitPair">
            <span v-if="isPairing" class="spinner"></span>
            <span v-else>Xác Nhận Kích Hoạt</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'GpsTracking',
  props: {
    currentUser: {
      type: Object,
      required: true
    }
  },
  emits: ['show-toast'],
  setup(props, { emit }) {
    const pets = ref([]);
    const loading = ref(true);
    const selectedPet = ref(null);
    const showPairModal = ref(false);
    const isPairing = ref(false);
    const isSimulating = ref(false);
    const lastUpdatedTime = ref('');

    const pairForm = ref({
      pet_id: null,
      hardware_gps_id: 'GPS-COLLAR-' + Math.floor(100 + Math.random() * 900)
    });

    let simInterval = null;
    let simStep = 0;

    const fetchPets = async () => {
      loading.value = true;
      try {
        const res = await fetch('/api/v1/pet', {
          headers: {
            'Accept': 'application/json',
            'X-User-Id': (props.currentUser.id || 1).toString()
          }
        });
        const json = await res.json();
        if (json.success) {
          pets.value = json.data || [];
          if (pets.value.length && !selectedPet.value) {
            // Select first pet with GPS collar by default
            selectedPet.value = pets.value.find(p => p.hardware_gps_id) || pets.value[0];
          }
        }
      } catch (e) {
        console.error('Fetch pets error:', e);
      } finally {
        loading.value = false;
      }
    };

    const selectPet = (pet) => {
      if (isSimulating.value) {
        stopSimulation();
      }
      selectedPet.value = pet;
    };

    const openPairModal = () => {
      pairForm.value.pet_id = pets.value[0]?.id || null;
      pairForm.value.hardware_gps_id = 'GPS-COLLAR-' + Math.floor(100 + Math.random() * 900);
      showPairModal.value = true;
    };

    const openPairModalWithPet = (pet) => {
      pairForm.value.pet_id = pet.id;
      pairForm.value.hardware_gps_id = 'GPS-COLLAR-' + Math.floor(100 + Math.random() * 900);
      showPairModal.value = true;
    };

    const submitPair = async () => {
      if (!pairForm.value.pet_id || !pairForm.value.hardware_gps_id.trim()) {
        emit('show-toast', 'Vui lòng nhập đầy đủ thông tin', 'warning');
        return;
      }

      isPairing.value = true;
      try {
        const res = await fetch('/api/v1/pet/pair-collar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-User-Id': (props.currentUser.id || 1).toString(),
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
          },
          body: JSON.stringify(pairForm.value)
        });

        const json = await res.json();
        if (json.success) {
          emit('show-toast', 'Gắn vòng đeo cổ GPS thành công!', 'success');
          showPairModal.value = false;
          // Refresh pets
          await fetchPets();
          selectedPet.value = pets.value.find(p => p.id === pairForm.value.pet_id);
        } else {
          emit('show-toast', json.message || 'Lỗi gắn thiết bị', 'error');
        }
      } catch (err) {
        console.error('Pair error:', err);
        emit('show-toast', 'Không thể kết nối máy chủ', 'error');
      } finally {
        isPairing.value = false;
      }
    };

    // Calculate map pin visual offset based on pet coordinates
    const pinMapStyle = computed(() => {
      if (!selectedPet.value) return { left: '50%', top: '50%' };

      // Base Hoan Kiem coords
      const baseLat = 21.0285;
      const baseLng = 105.8542;

      const latDiff = (Number(selectedPet.value.tracking_lat) || baseLat) - baseLat;
      const lngDiff = (Number(selectedPet.value.tracking_lng) || baseLng) - baseLng;

      // Scale factors to fit nicely on SVG canvas
      const xPercent = Math.max(15, Math.min(85, 50 + lngDiff * 12000));
      const yPercent = Math.max(15, Math.min(85, 50 - latDiff * 12000));

      return {
        left: `${xPercent}%`,
        top: `${yPercent}%`
      };
    });

    // Hardware collar live GPS movement simulation
    const toggleSimulation = () => {
      if (isSimulating.value) {
        stopSimulation();
      } else {
        startSimulation();
      }
    };

    const startSimulation = () => {
      if (!selectedPet.value?.hardware_gps_id) return;
      isSimulating.value = true;
      emit('show-toast', 'Đã bắt đầu giả lập vòng đeo cổ GPS gửi tọa độ nền...', 'success');

      // Base starting point
      let currentLat = Number(selectedPet.value.tracking_lat) || 21.0285;
      let currentLng = Number(selectedPet.value.tracking_lng) || 105.8542;

      simInterval = setInterval(async () => {
        simStep++;
        // Simulate wandering movement around lake perimeter
        const deltaLat = Math.sin(simStep * 0.4) * 0.00035;
        const deltaLng = Math.cos(simStep * 0.4) * 0.00045;

        currentLat += deltaLat;
        currentLng += deltaLng;

        try {
          const res = await fetch('/api/v1/pet/update-gps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            },
            body: JSON.stringify({
              hardware_gps_id: selectedPet.value.hardware_gps_id,
              latitude: Number(currentLat.toFixed(7)),
              longitude: Number(currentLng.toFixed(7))
            })
          });

          const json = await res.json();
          if (json.success && selectedPet.value) {
            selectedPet.value.tracking_lat = json.data.tracking_lat;
            selectedPet.value.tracking_lng = json.data.tracking_lng;
            lastUpdatedTime.value = new Date().toLocaleTimeString('vi-VN');
          }
        } catch (e) {
          console.error('Sim error:', e);
        }
      }, 2500); // 2.5s telemetry interval
    };

    const stopSimulation = () => {
      isSimulating.value = false;
      if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
      }
      emit('show-toast', 'Đã dừng giả lập vòng cổ GPS', 'warning');
    };

    onMounted(() => {
      fetchPets();
    });

    onUnmounted(() => {
      stopSimulation();
    });

    return {
      pets,
      loading,
      selectedPet,
      showPairModal,
      isPairing,
      isSimulating,
      lastUpdatedTime,
      pairForm,
      pinMapStyle,
      fetchPets,
      selectPet,
      openPairModal,
      openPairModalWithPet,
      submitPair,
      toggleSimulation
    };
  }
};
</script>

<style scoped>
.gps-header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 2px;
}

.page-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.gps-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
}

.pets-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pet-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.pet-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.pet-card.is-selected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
}

.pet-card-avatar {
  font-size: 1.8rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.pet-card-info {
  flex: 1;
}

.pet-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.pet-name {
  font-weight: 700;
  font-size: 0.95rem;
}

.pet-sub-info {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.pet-card-arrow {
  color: var(--color-text-muted);
  font-weight: bold;
}

/* Active Tracking View */
.tracking-active-box {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.active-pet-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.active-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pet-big-avatar {
  font-size: 2rem;
}

.active-pet-name {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 2px;
}

/* Map Mockup Card */
.map-mockup-card {
  padding: 0;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(16, 185, 129, 0.25);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.map-viewport-wrapper {
  position: relative;
  width: 100%;
  height: 420px;
  overflow: hidden;
}

.map-svg-grid {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-badge-safe-zone {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid #10b981;
  color: #10b981;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
}

.map-coords-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.75rem;
  color: #38bdf8;
  display: flex;
  flex-direction: column;
  gap: 2px;
  backdrop-filter: blur(8px);
}

/* Pet Pin Marker */
.map-pet-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10;
}

.pin-pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  transform: translate(-50%, -50%);
  background: rgba(16, 185, 129, 0.35);
  border-radius: 50%;
  animation: emergency-pulse 1.8s infinite;
}

.pin-marker {
  position: relative;
  width: 38px;
  height: 38px;
  background: radial-gradient(circle, #10b981 0%, #047857 100%);
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
}

.pin-emoji {
  font-size: 1.25rem;
}

.pin-tooltip {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
  margin-top: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.telemetry-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.telemetry-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tel-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.tel-val {
  font-size: 0.825rem;
}

@media (max-width: 850px) {
  .gps-grid {
    grid-template-columns: 1fr;
  }
  .telemetry-bar {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
}
</style>
