# Hệ Thống PetCare AI 24/24 — Báo Cáo Kiểm Toán Kỹ Thuật (AUDIT)

**Ngày kiểm toán**: 19/09/2026  
**Trạng thái hệ thống**: Hoạt động (Demo / Development Mode)  

---

## 1. Kiến Trúc & Công Nghệ (Technology Stack)

| Thành phần | Công nghệ / Thư viện | Địa chỉ / Cổng | Vai trò |
|---|---|---|---|
| **Frontend** | React 19, Vite, TailwindCSS, Axios | `http://localhost:5173` | Giao diện SPA người dùng, bác sĩ, quản trị viên |
| **Backend** | Laravel 11, PHP 8.2+, MySQL Driver | `http://localhost:8001` | REST API, xử lý nghiệp vụ, DB transactions, Authentication |
| **Database** | MySQL 8.0 với Spatial Indexing | `localhost:3306` (`pet_emergency`) | Lưu trữ quan hệ: Users, Pets, Posts, SOS, Devices |
| **AI / RAG** | Python FastAPI, ChromaDB / Embeddings | Port 8002 (Optional/Mocked) | Tìm kiếm tri thức cấp cứu, hỗ trợ sơ cứu theo triệu chứng |
| **LLM Provider** | Google Gemini 1.5 Flash API | Cloud API | Fallback sinh phác đồ sơ cứu 3-4 bước khi RAG offline |

---

## 2. Kiểm Toán Cơ Sở Dữ Liệu (Database Schema Audit)

### Các bảng hiện có trong cơ sở dữ liệu (`SHOW TABLES`):
1. `users` — Tài khoản (User / Doctor / Admin), tọa độ, số điện thoại, trạng thái xác thực (`pending`, `verified`, `rejected`), chuyên khoa, phòng khám.
2. `pets` — Hồ sơ thú cưng, ngày sinh, cân nặng, mã GPS vòng cổ cứng (`hardware_gps_id`), tọa độ định vị (`tracking_lat`, `tracking_lng`).
3. `posts` — Bài viết diễn đàn cộng đồng, liên kết ảnh/video, kiểm duyệt AI (`ai_mod_status`, `ai_mod_reason`), cờ bài viết (`is_flagged`), tên & avatar pet.
4. `comments` — Bình luận dưới bài viết, ghim bình luận bác sĩ thú y lên trên.
5. `post_reports` — Báo cáo vi phạm nội dung diễn đàn dành cho kiểm duyệt viên/admin.
6. `emergency_logs` — Bản ghi SOS thô tạo từ migration ban đầu.

### Phát hiện bất đồng bộ (Schema Discrepancy):
- Trong `EmergencyController.php`, code backend truy vấn bảng `emergency_requests` (chứa `location` POINT SPATIAL, `symptom_tags` JSON, `ai_first_aid`, `status`, `doctor_id`) và bảng `doctors_online` (lưu heartbeat vị trí trực tuyến của bác sĩ).
- Tuy nhiên, migration ban đầu chỉ tạo bảng `emergency_logs` với cấu trúc đơn giản, thiếu bảng `doctors_online` và cấu trúc trường phục vụ thuật toán ST_Distance_Sphere.
- **Giải pháp**: Tạo migration đồng bộ `emergency_requests` và `doctors_online` (hoặc view/alias chuẩn) để tính năng SOS thời gian thực hoạt động 100% không lỗi SQL.

---

## 3. Danh Mục Điểm Cuối API (API Endpoints Catalog)

### 3.1. Xác thực & Tài khoản (`/api/v1/auth`)
- `POST /register` — Đăng ký tài khoản mới (Chủ nuôi hoặc Bác sĩ với giấy phép)
- `POST /login` — Đăng nhập (Session + Cookie + trả về dữ liệu User)
- `POST /logout` — Hủy phiên làm việc
- `GET /me` — Lấy thông tin tài khoản hiện tại
- `PUT/POST /profile` — Cập nhật thông tin cá nhân & avatar đồng bộ

### 3.2. Quản lý Thú cưng & Vòng cổ GPS (`/api/v1/pet`)
- `GET /` — Danh sách thú cưng của người dùng
- `POST /pair-collar` — Ghép đôi mã phần cứng vòng cổ GPS
- `POST /update-gps` — Cập nhật vị trí GPS giả lập từ vòng cổ

### 3.3. Điều Phối Cấp Cứu SOS (`/api/v1/emergency`)
- `POST /sos` — Tạo ca cấp cứu khẩn cấp (tìm bác sĩ lân cận + gợi ý sơ cứu AI)
- `GET /pending` — Lấy danh sách các ca SOS đang chờ nhận (Thiếu trong routes -> Cần bổ sung)
- `POST /sos/{id}/accept` — Bác sĩ nhận ca cấp cứu (Dùng DB transaction chống race condition)
- `POST /sos/{id}/complete` — Hoàn tất ca cấp cứu
- `POST /doctor/location` — Bác sĩ gửi heartbeat tọa độ định kỳ (Online)
- `POST /doctor/offline` — Bác sĩ chuyển trạng thái nghỉ (Offline)

### 3.4. Diễn Đàn & Báo Cáo (`/api/v1/forum`)
- `GET /posts` — Lấy danh sách bài viết phân trang (lọc theo tags)
- `GET /tags` — Danh sách chủ đề thảo luận
- `POST /posts` — Đăng bài mới (tự động kiểm duyệt AI)
- `PUT /posts/{id}` — Chỉnh sửa bài viết (chỉ chủ bài)
- `DELETE /posts/{id}` — Xóa bài viết (chủ bài hoặc admin)
- `POST /posts/{id}/like` — Thả tim / Bỏ tim bài viết
- `POST /posts/{id}/comments` — Bình luận bài viết
- `POST /posts/{id}/report` — Báo cáo bài viết vi phạm
- `GET /admin/reports` — Danh sách báo cáo dành cho admin
- `POST /admin/reports/{id}/review` — Xử lý báo cáo (giữ lại hoặc xóa bài)

---

## 4. Báo Cáo Kiểm Tra Lỗi Chi Tiết (Bugs B1 - B8)

| Mã lỗi | Vị trí | Mô tả hiện tượng | Nguyên nhân gốc rễ | Hướng xử lý |
|---|---|---|---|---|
| **B1** | `DoctorDashboard.jsx` | Thẻ thống kê SOS hiển thị 0 / 0 / 0 | Route `/api/v1/emergency/pending` trả về 404, khối `catch` nạp `MOCK_SOS` nhưng không cập nhật state `stats` | Bổ sung API endpoint pending trong backend Laravel + tính toán `stats` trong cả trường hợp API lẫn fallback |
| **B2** | `App.jsx` | Nút SOS nổi tròn màu đỏ hiển thị cho cả tài khoản Bác sĩ | Điều kiện render chỉ kiểm tra `isLoggedIn` mà không loại trừ `isDoctor` và `isAdmin` | Đổi điều kiện thành `{isLoggedIn && !isDoctor && !isAdmin && ...}` |
| **B3** | `PostCard.jsx` | Thời gian bài viết hiển thị chuỗi ISO thô (`2026-09-17T...Z`) | Không gọi hàm định dạng thời gian tương đối | Viết hàm tiện ích dùng chung `formatTimeAgo()` hỗ trợ tiếng Việt ("X phút trước", "X giờ trước") |
| **B4** | `PostCard.jsx` / `App.jsx` | Tên thú cưng hiển thị nhãn mặc định "Thú cưng" | Thiếu fallback kết hợp tên giống loài (`{petName} · {petBreed}`) | Định dạng hiển thị tên và giống loài rõ ràng, fallback nếu không có |
| **B5** | `DoctorDashboard.jsx` | Bảng bác sĩ thiếu nút chuyển đổi Trực Tuyến / Nghỉ (Online/Offline) | Giao diện chỉ có nút chuông âm thanh và làm mới | Bổ sung toggle `🟢 Đang trực (Online)` / `⚪ Đang nghỉ (Offline)` gọi API heartbeat / offline |
| **B6** | Toàn bộ ứng dụng | Ảnh avatar bị vỡ nếu URL ảnh ngoài bị lỗi 404 | Một số thẻ `<img>` thiếu bộ xử lý sự kiện `onError` | Bổ sung hàm fallback avatar chuẩn (SVG/ảnh đại diện mặc định) |
| **B7** | Mock data & Seeders | Tên demo chủ nuôi nữ không nhất quán ("Nguyễn Thu Hà" vs "Lê Thu Hà") | Dữ liệu `MOCK_SOS` sử dụng "Nguyễn Thu Hà", trong khi nút 1-click login tạo "Lê Thu Hà" | Thống nhất thành "Lê Thu Hà" trên toàn hệ thống |
| **B8** | `DoctorDashboard.jsx` | Bác sĩ click vào thẻ SOS không xem được chi tiết ca | Thiếu modal/drawer hiển thị chi tiết triệu chứng, bản đồ và ảnh thú cưng | Bổ sung Modal Chi Tiết Ca SOS khi bác sĩ click vào thẻ |

---

## 5. Bảng Đánh Giá Hiện Trạng Chi Tiết (Part D — Honest Gap Check)

Đánh giá thực tế các hạng mục đối chiếu với Brief gốc trước khi triển khai Round 2:

| STT | Hạng mục kiểm tra | Trạng thái | Bằng chứng hiện có trong Code / Test | Kế hoạch hoàn thiện tại Round 2 |
|:---:|---|:---:|---|---|
| **1** | **Màn hình "Active SOS" chủ nuôi**: Stepper, thẻ bác sĩ, bản đồ bác sĩ di chuyển + ETA, chat, hủy ca kèm lý do, chia sẻ link vị trí | **Partial** | Đã có Stepper cơ bản và phác đồ AI tại [SosButton.jsx](file:///d:/PetEmergency/frontend-react/src/components/SosButton.jsx), API hủy ca tại [EmergencyController.php](file:///d:/PetEmergency/app/Http/Controllers/Api/v1/EmergencyController.php) | Nâng cấp bản đồ Leaflet hiển thị trực tiếp vị trí bác sĩ di chuyển theo heartbeat, hiển thị live ETA, chat nhanh/cuộc gọi và hộp thoại chọn lý do hủy ca |
| **2** | **Bảng Bác sĩ**: Các tab "Ca của tôi", "Lịch sử", thống kê; hủy/trả ca | **Partial** | Đã có thanh "Ca Cấp Cứu Đang Phụ Trách" và máy trạng thái trong [DoctorDashboard.jsx](file:///d:/PetEmergency/frontend-react/src/components/DoctorDashboard.jsx) | Tách tab rõ ràng: "Đang chờ", "Ca của tôi", "Lịch sử hoàn tất"; bổ sung nút "Trả lại ca / Hủy ca" để điều phối lại cho bác sĩ khác |
| **3** | **Tự động nới rộng bán kính tìm kiếm (3 → 5 → 10 km)** & xử lý hết giờ `no_doctor_found` kèm số hotline | **Partial** | `findNearbyDoctors` có bán kính mặc định 15km tại [EmergencyController.php](file:///d:/PetEmergency/app/Http/Controllers/Api/v1/EmergencyController.php#L380) | Thêm logic tự động mở rộng theo bậc thời gian (0-10s: 3km, 10-20s: 5km, 20-30s: 10km) và hiển thị hotline cấp cứu 1900-PETCARE nếu không có bác sĩ |
| **4** | **WebSocket thời gian thực (Reverb/Echo) + Polling Fallback**, Trung tâm thông báo (Notification Center), âm thanh/toast | **Partial** | Đã có polling 10s tự động và Web Audio API sound alert trong [DoctorDashboard.jsx](file:///d:/PetEmergency/frontend-react/src/components/DoctorDashboard.jsx#L64) | Tích hợp WebSocket client (Reverb/Pusher protocol) song song Polling fallback siêu mượt, thêm Notification Drawer lưu lịch sử thông báo |
| **5** | **Đánh giá bác sĩ sau cấp cứu (Rating Popup)** + xem hồ sơ bệnh án + lưu vào sổ khám thú cưng | **Partial** | Backend đã lưu `sos_reports` tại [EmergencyController.php](file:///d:/PetEmergency/app/Http/Controllers/Api/v1/EmergencyController.php#L350), đã có component [DoctorRating.jsx](file:///d:/PetEmergency/frontend-react/src/components/DoctorRating.jsx) | Tự động kích hoạt Popup Rating khi ca chuyển sang `completed`, đồng bộ bệnh án vào hồ sơ thú cưng [UserProfile.jsx](file:///d:/PetEmergency/frontend-react/src/components/UserProfile.jsx) |
| **6** | **Đăng ký/Đăng nhập thật kèm OTP giả lập**; Upload giấy phép hành nghề bác sĩ | **Partial** | Đăng ký & đăng nhập đã hoạt động với Session/Bcrypt trong [AuthController.php](file:///d:/PetEmergency/app/Http/Controllers/Api/v1/AuthController.php#L18) | Thêm form upload chứng chỉ hành nghề khi bác sĩ đăng ký và mock OTP xác thực qua SĐT |
| **7** | **Kiểm thử tự động E2E (Playwright)**: Full SOS flow, Doctor navigation (Part C), Clinic approval (Part A), Search & Profile (Part B) | **Not done** | Backend đã có 6 Feature Tests PHPUnit trong [SosConcurrencyAndWorkflowTest.php](file:///d:/PetEmergency/tests/Feature/SosConcurrencyAndWorkflowTest.php) | Cài đặt và cấu hình bộ kịch bản kiểm thử E2E tự động xác thực toàn bộ các luồng liên kết |

