# Thiết Kế Kiến Trúc & Quyết Định Kỹ Thuật (DECISIONS)

**Dự án**: PetCare AI 24/24  
**Ngày phê duyệt**: 19/09/2026  

---

## 1. Cơ Sở Dữ Liệu & Mô Hình Dữ Liệu SOS

### Quyết định:
Tạo migration bổ sung bảng `emergency_requests` và `doctors_online` chuẩn hóa với kiểu dữ liệu không gian (Spatial Geometry `POINT` SRID 4326), đồng thời tạo bảng `sos_reports` để lưu bệnh án/biên bản cấp cứu khi hoàn tất ca.

### Lý do:
- Thuật toán `ST_Distance_Sphere` trong MySQL yêu cầu kiểu dữ liệu `POINT(lng, lat)` và chỉ mục không gian `SPATIAL INDEX` để quét nhanh các bác sĩ trong bán kính 5km - 15km dưới 10ms.
- Bảng `emergency_logs` cũ chỉ lưu `decimal(10, 7)` và thiếu các trường JSON cho triệu chứng sơ cứu (`symptom_tags`), phác đồ sơ cứu AI (`ai_first_aid`), ảnh chụp (`pet_photo_url`), và dòng thời gian xử lý.
- Tách biệt rõ ràng giữa vị trí hiện thời của bác sĩ (`doctors_online`) và lịch sử các ca điều phối (`emergency_requests`).

---

## 2. Giải Quyết Xung Đột Nhận Ca (Race Condition & Concurrency)

### Vấn đề:
Khi một ca SOS được phát đi, nhiều bác sĩ trực tuyến trong khu vực có thể cùng bấm "Nhận Ca" cùng một giây.

### Quyết định:
Áp dụng **Atomic Conditional Update** trong Database Transaction:
```php
DB::transaction(function () use ($emergencyId, $doctorId) {
    $affected = DB::table('emergency_requests')
        ->where('id', $emergencyId)
        ->where('status', 'finding') // Điều kiện nguyên tử
        ->update([
            'status' => 'accepted',
            'doctor_id' => $doctorId,
            'accepted_at' => now(),
            'updated_at' => now(),
        ]);

    if ($affected > 0) {
        DB::table('doctors_online')
            ->where('user_id', $doctorId)
            ->update(['is_busy' => 1]);
    }

    return $affected > 0;
});
```
- Bác sĩ đầu tiên ghi nhận thành công sẽ nhận HTTP 200 kèm hồ sơ bệnh nhân.
- Bác sĩ đến sau nhận HTTP 409 Conflict với thông báo: *"Ca này đã được bác sĩ khác nhận rồi."*

---

## 3. Máy Trạng Thái Cấp Cứu (SOS State Machine)

### Vòng đời trạng thái ca SOS:
1. `finding`: Chủ nuôi vừa gửi SOS, hệ thống quét bác sĩ gần nhất và phát tín hiệu ping (30 giây).
2. `accepted`: Một bác sĩ đã bấm nhận ca.
3. `en_route`: Bác sĩ đang trên đường di chuyển đến vị trí cấp cứu.
4. `arrived`: Bác sĩ đã có mặt tại hiện trường.
5. `treating`: Đang thực hiện các biện pháp sơ cấp cứu.
6. `completed`: Ca cấp cứu hoàn tất, bác sĩ nhập chẩn đoán và khuyến nghị theo dõi.
7. `canceled`: Chủ nuôi hủy ca (trong vòng 5 giây đếm ngược hoặc khi tình trạng đã ổn định).

---

## 4. Cơ Chế Fallback Đa Tầng (Graceful Degradation)

1. **AI First Aid**:
   - Tầng 1: RAG Service (FastAPI + ChromaDB) trích xuất bài viết diễn đàn và y văn.
   - Tầng 2: Fallback trực tiếp gọi Gemini 1.5 Flash API với Prompt bác sĩ thú y.
   - Tầng 3: Danh mục sơ cứu y khoa tĩnh định sẵn theo triệu chứng (ngộ độc, co giật, khó thở, chảy máu...). Không bao giờ để giao diện SOS bị trắng hoặc treo.
2. **Offline & Demo Mode**:
   - Khi không kết nối được máy chủ Laravel hoặc DB chưa có ca mới, Dashboard tự động kích hoạt Demo Mode có huy hiệu rõ ràng và cho phép thử nghiệm đầy đủ các tương tác.

---

## 5. Tiêu Chuẩn Ngôn Ngữ & UX

- **Giao diện người dùng (UI Copy)**: 100% tiếng Việt tự nhiên, chuẩn văn phong y tế thú y thân thiện ("Sơ cứu", "Chuyên khoa", "Đang trực", "Bán kính").
- **Mã nguồn, Database & Tài liệu kỹ thuật**: Viết bằng tiếng Anh chuẩn.
- **Tài khoản Demo 1-Click**: Luôn có sẵn 3 nút đăng nhập nhanh (Chủ nuôi nam: Nguyễn Minh Anh, Chủ nuôi nữ: Lê Thu Hà, Bác sĩ: BS. Phạm Thị Mai) để kiểm thử tức thì không qua bước nhập liệu.

---

## 6. Xử Lý Stacking Context & Z-Index Cho Bản Đồ Leaflet (Map Modals & Form Overlays)

### Vấn đề:
Các container của thư viện Leaflet mặc định tạo nhiều lớp pane nội bộ (`leaflet-pane: 400`, `leaflet-marker-pane: 600`, `leaflet-control: 800`, `leaflet-top/bottom: 1000`). Khi render modal form (như form "Thêm Phòng Khám Mới" hoặc popup dẫn đường SOS), các pane bản đồ này có thể bị "rò rỉ" ra ngoài phạm vi container và đè lên form nhập liệu, ô gợi ý địa chỉ (autocomplete dropdown), sticky header hoặc footer.

### Quyết định:
1. **Global CSS Isolation** (`index.css`):
   ```css
   .leaflet-container {
     isolation: isolate;
     z-index: 0 !important;
   }
   ```
   Điều này ép toàn bộ các z-index 400-1000 của Leaflet vào một stacking context cục bộ, không thể thoát ra đè lên các thành phần ngoài.
2. **Modal & Form Elevation**:
   - Mọi form modal (như `ClinicFormModal`) được đặt ở tầng `z-[10000]` với `relative z-[10001]`.
   - Header và footer sticky bên trong modal có `z-30`.
   - Dropdown gợi ý địa chỉ Nominatim có `z-40` / `z-50`.
   - MapPinPicker bên trong modal được gán `isolation: isolate` và `z-index: 1`.

---

## 7. Hồ Sơ Toàn Trang Trực Tiếp (Full Page Profile Everywhere - Part A)

### Quyết định:
Loại bỏ hoàn toàn modal/popup/hover-card mini profile. Mọi thao tác click vào tên hoặc avatar bác sĩ / người dùng (trong bài viết, bình luận, kết quả tìm kiếm, danh bạ) đều chuyển hướng trực tiếp đến route `/u/:id` với `<Link>` chuẩn của React Router.

### Lý do:
- Người dùng có thể mở tab mới bằng Ctrl/Middle-Click.
- Nút Back của trình duyệt khôi phục vị trí cuộn trang tự nhiên.
- URL deep-link thân thiện (`/u/:id`), F5 giữ nguyên phiên và dữ liệu người dùng.
- Hiển thị đầy đủ thông tin: ảnh bìa, chuyên khoa, phòng khám liên kết, đánh giá sao, bài viết và tab thú cưng công khai.

---

## 8. Tách Biệt Thú Cưng Trong Đăng Bài & Quan Hệ Pivot `post_pets` (Part C)

### Quyết định:
1. Mặc định cho phép người dùng đăng bài dưới tư cách chủ nuôi thông thường mà **không bắt buộc phải có thú cưng**.
2. Thêm nút "🐾 Thêm bé cưng" cho phép gắn thẻ tùy chọn từ 0 đến 3 thú cưng thông qua bảng pivot `post_pets`.
3. Bảo vệ IDOR ở tầng Backend: Nghiêm cấm người dùng gắn thẻ thú cưng thuộc sở hữu của tài khoản khác (trả về HTTP 403 Forbidden).

---

## 9. Sổ Sức Khỏe Thú Cưng & Thẻ Cứu Hộ QR Công Khai (Part B)

### Quyết định:
1. Tích hợp thanh điều hướng "🐾 Thú Cưng" (`/pets`) cho chủ nuôi, bao gồm Dashboard "Hôm nay" và danh thiếp trực quan từng bé với huy hiệu hạn tiêm ("Quá hạn: X", "Sắp đến hạn: Y").
2. Trang chi tiết `/pets/:id` với 7 tab chuyên sâu: Tổng quan (Health Score 0-100), Tiêm chủng, Tẩy giun, Cân nặng (biểu đồ SVG), Thuốc điều trị, Bệnh án và Thẻ QR.
3. Cung cấp trang QR cứu hộ công khai `/pet/:token` không yêu cầu đăng nhập: Khi quét vòng cổ hoặc thẻ của bé bị lạc, người tìm thấy có thể xem thông tin dị ứng/bệnh nền khẩn cấp, gọi điện cho chủ nuôi hoặc gửi tọa độ định vị tức thì qua nút "🚨 Tôi Tìm Thấy Bé Này".

---

## 10. Các Cải Tiến Bổ Sung (Part D Extras)

1. **Dashboard "Hôm nay" (Today's Routine)**: Tích hợp checklist việc cần làm trong ngày (uống men vi sinh, ăn pate, kiểm tra lịch tiêm) với thao tác 1-chạm đánh dấu hoàn thành trực quan.
2. **Hệ thống Tìm Kiếm Toàn Diện (Unified Search)**: Thanh tìm kiếm nhanh ngay trên Header hỗ trợ tìm kiếm đồng thời Bác sĩ, Phòng khám 24/7 và Bài viết kinh nghiệm theo thời gian thực.
3. **Mã hóa Thẻ QR Cứu Hộ Đa Tầng**: Tùy biến hiển thị/ẩn số điện thoại, dị ứng nhằm bảo vệ quyền riêng tư cá nhân của chủ nuôi.

---

## 11. Khắc Phục Lỗi Màn Hình Trắng Bản Đồ SOS & Chiến Lược Error Boundary (Round 4 - Part 1)

### Vấn đề (P0 Bug):
Khi bác sĩ trực bấm "🗺️ Xem Bản Đồ" trên bất kỳ thẻ ca SOS nào trong Bảng Điều Phối SOS, toàn bộ trang web bị trắng hoàn toàn (White screen of death).

### Nguyên nhân gốc rễ (Root Causes):
1. **Lỗi `m.remove is not a function`**: Trong `SosDoctorBoardMap.jsx`, mảng `markersRef.current` lưu trữ đối tượng `{ id, marker, lat, lng }`, nhưng khi xóa marker cũ để vẽ lại lại gọi `markersRef.current.forEach(m => m.remove())` thay vì `m.marker?.remove()`. Khi React render lại, hàm `m.remove` không tồn tại dẫn đến `TypeError: m.remove is not a function`.
2. **Lỗi `Cannot read properties of undefined (reading '_leaflet_pos')`**: Khi chuyển đổi tab hoặc unmount/remount container trong React StrictMode, `map.invalidateSize()` được gọi sau khi container DOM đã bị gỡ hoặc chưa tính toán xong kích thước.
3. **Lỗi tham số MySQL Spatial trong `/api/v1/emergency/doctor/location` (HTTP 500)**: Câu lệnh SQL sử dụng `ST_GeomFromText('POINT(? ?)', 4326)` đặt dấu `?` bên trong nháy đơn chuỗi, khiến MySQL không nhận diện được placeholder và báo lỗi cú pháp.
4. **Không có React Error Boundary**: Ứng dụng thiếu rào chắn lỗi cấp component. Bất kỳ exception nào trong cây DOM bản đồ đều làm toàn bộ ứng dụng React sụp đổ và unmount toàn bộ giao diện.

### Quyết định kỹ thuật:
1. **Sửa dứt điểm nguyên nhân trong `SosDoctorBoardMap.jsx` & `SosDoctorMap.jsx`**:
   - Gọi chính xác `m.marker?.remove?.()`.
   - Chuẩn hóa tọa độ `parseFloat(sos.sos_latitude || sos.latitude)` với fallback tọa độ trung tâm bác sĩ và cảnh báo trực quan nếu thiếu tọa độ.
   - Kiểm tra `mapRef.current && mapContainerRef.current` trước mọi lệnh `invalidateSize()`.
   - Bọc toàn bộ các thao tác `fitBounds` trong khối try-catch an toàn.
2. **Sửa endpoint heartbeat `/api/v1/emergency/doctor/location`**: Chuyển sang nội suy an toàn biến `$lat` và `$lng` đã validate qua `ST_GeomFromText("POINT({$lat} {$lng})", 4326)`.
3. **Triển khai `ErrorBoundary` đa cấp**:
   - `type="app"`: Fallback toàn ứng dụng với giao diện tiếng Việt ("Đã xảy ra sự cố không mong muốn", nút "Thử lại", "Về trang chủ").
   - `type="map"`: Fallback cấp bản đồ ("Bản đồ tạm thời không thể hiển thị trực quan"), bảo toàn 100% thông tin ca cứu hộ (Mã ca, Chủ nuôi, Bé cưng, Khoảng cách chim bay, Mô tả) và hiển thị các nút điều hướng ngoại vi: Google Maps, Apple Maps, Waze, "Sao chép tọa độ" và nút "Thử lại".

---

## 12. Quản Lý Ảnh Đại Diện, Ảnh Bìa & Đồng Bộ Hồ Sơ Bác Sĩ (Round 4 - Part 2)

### Vấn đề:
1. Giao diện sử dụng thẻ `<img>` thô với link Unsplash bên ngoài, khi mất kết nối Internet hoặc lỗi DNS hình ảnh sẽ bị vỡ thành ô vuông gãy.
2. Chưa có công cụ cắt ảnh đại diện tròn và ảnh bìa theo tỷ lệ chuẩn 3:1.
3. Bác sĩ chưa thể chọn phòng khám trực thuộc khi chỉnh sửa hồ sơ.

### Quyết định kỹ thuật:
1. **Component dùng chung `<Avatar>`**:
   - Tự động thay thế toàn bộ thẻ `<img>` avatar thô trên Header, Diễn đàn, Hồ sơ, Bình luận, Tìm kiếm, Đánh giá.
   - Xử lý `onError` tự động chuyển đổi sang Avatar chữ cái đầu (Initials) với nền màu phối hợp theo bảng màu cá nhân, hoặc SVG thú cưng offline.
   - Hỗ trợ huy hiệu xác thực bác sĩ (tick xanh dương) tự động khi `verified = true`.
2. **Cắt ảnh Client-side `<ImageCropModal>`**:
   - Sử dụng HTML5 Canvas để cắt ảnh tức thì không phụ thuộc thư viện nặng: chế độ tròn (`circular`) cho avatar và tỷ lệ 3:1 (`cover`) cho ảnh bìa.
   - Nút icon Camera đè góc dưới khi rê chuột vào Avatar cho phép chọn ảnh và mở hộp thoại cắt ảnh.
3. **Backend Resize & Chuyển đổi WebP**:
   - `POST /api/v1/me/avatar`: nén và đổi kích thước về vuông 512×512 chuẩn WebP chất lượng 85%.
   - `POST /api/v1/me/cover`: nén và đổi kích thước về 1600×533 (chuẩn tỷ lệ 3:1) WebP.
   - Cột `cover_url`, `clinic_id`, `average_rating`, `reviews_count` được bổ sung vào bảng `users`.
4. **Bộ chọn phòng khám trong hồ sơ bác sĩ**:
   - Dropdown trong modal chỉnh sửa hồ sơ bác sĩ tải danh sách phòng khám từ `/api/v1/clinics` cho phép liên kết phòng khám trực thuộc.
   - Demo bác sĩ `dr.mai@example.com` được cấu hình đầy đủ tiểu sử, chuyên khoa cấp cứu, phòng khám `PetCare 24h Hà Nội` và avatar nội bộ.

---

## 13. Hệ Thống Đánh Giá & Phản Hồi Bác Sĩ Thú Y (Round 4 - Part 3)

### Vấn đề:
Cần hệ thống đánh giá uy tín, minh bạch cho bác sĩ thú y nhưng phải ngăn chặn gian lận, tự đánh giá hoặc đánh giá chéo giữa các bác sĩ.

### Quyết định kỹ thuật:
1. **Quy tắc Nghiệp vụ & Bảo mật**:
   - Chỉ tài khoản chủ nuôi (`role = user`) mới có quyền viết đánh giá. Tài khoản `doctor` và `admin` bị chặn (HTTP 403).
   - Bác sĩ không thể tự đánh giá chính mình (HTTP 422).
   - Mỗi chủ nuôi chỉ có 1 đánh giá cho mỗi bác sĩ: gửi lại đánh giá sẽ tự động cập nhật (Upsert `updateOrCreate`) thay vì phát sinh lỗi trùng lặp dữ liệu.
   - Huy hiệu "✅ Đã điều trị thực tế" (`is_verified_treatment`): Tự động kiểm tra trong bảng `emergency_requests` / `emergency_logs` xem người đánh giá đã từng có ca cấp cứu với bác sĩ đó ở trạng thái `completed` hay chưa, gắn liền `sos_id`.
2. **Tính toán Điểm trung bình Nguyên tử (Atomic Recalculation)**:
   - Mọi thao tác tạo, sửa, xóa đánh giá đều kích hoạt hàm `recalculateDoctorRating` bên trong MySQL Database Transaction, tự động cập nhật `average_rating` và `reviews_count` trên bảng `users`.
3. **Phản hồi của Bác sĩ & Báo cáo Vi phạm**:
   - Endpoint `POST /api/v1/doctors/{doctorId}/reviews/{id}/reply`: chỉ bác sĩ được đánh giá hoặc admin mới có quyền phản hồi công khai (tối đa 1 phản hồi).
   - Endpoint `POST /api/v1/doctors/{doctorId}/reviews/{id}/report`: gắn cờ `is_reported = true` và ghi nhận lý do vi phạm để quản trị viên kiểm duyệt.

---

## 14. Hệ Thống Tìm Kiếm Hợp Nhất & Autocomplete Không Dấu (Round 4 - Part 4)

### Vấn đề:
1. Người dùng Việt Nam thường tìm kiếm không dấu (ví dụ: "meo non", "tieu chay", "bac si mai"). Do MySQL mặc định phân biệt chữ `đ` và `d`, các truy vấn như "dieu tri" không khớp với "điều trị".
2. Cần gợi ý tìm kiếm tức thì dạng dropdown nhóm (Autocomplete).
3. Cần tìm kiếm mở rộng sang Thú cưng cộng đồng công khai (`pets`).

### Quyết định kỹ thuật:
1. **Xử lý Biến thể Ngữ âm Tiếng Việt (Vietnamese Accent Variants)**:
   - Hàm `unifiedSearch` tạo tập hợp các biến thể chuyển đổi hai chiều giữa `d` và `đ` (ví dụ: "dieu tri" <-> "điều trị", "dong da" <-> "đống đa").
   - Nhờ đó, người dùng gõ không dấu hoặc có dấu đều tìm chính xác các thực thể tương ứng.
2. **Thành phần Autocomplete `<SearchAutocomplete>`**:
   - Debounce 280ms gọi API `/api/v1/search?q=...`.
   - Dropdown phân nhóm trực quan: 🩺 Bác sĩ, 🏥 Phòng khám, 🐾 Thú cưng, 📝 Bài viết, 🏷️ Thẻ chủ đề.
   - Điều hướng bàn phím đầy đủ: Phím Mũi tên Lên/Xuống để duyệt danh sách, Phím Enter để chọn mục hoặc tìm kiếm, Phím Escape để đóng dropdown.
   - Dòng liên kết chân trang "Xem tất cả kết quả cho '...' →" chuyển tới trang `/search?q=...`.
3. **Trang Kết Quả `/search?q=`**:
   - Bổ sung tab "🐾 Thú cưng" và lưới thẻ thú cưng công khai (hình đại diện, tên, giống, cân nặng, tên chủ nuôi và nút xem thẻ QR).

---

## 15. Dữ Liệu Mẫu Diễn Đàn Mèo Bệnh & Tiêu Chuẩn An Toàn Y Khoa (Round 4 - Part 5)

### Vấn đề:
Diễn đàn cần 25 tình huống thực tế về các bệnh thường gặp và tối cấp cứu ở loài mèo, có bác sĩ chuyên khoa tư vấn trực tiếp và phải có rào chắn an toàn y tế nghiêm ngặt (ngăn chặn các mẹo dân gian nguy hại).

### Quyết định kỹ thuật:
1. **Tạo Seeder Idempotent `CatHealthForumSeeder.php`**:
   - Xây dựng 25 ca bệnh lâm sàng thực tế: nôn dịch vàng, bí tiểu cấp FLUTD, ngộ độc hoa ly, nuốt dị vật sợi chỉ, FIP thể ướt, suy hô hấp khẩn cấp, dị ứng sữa đặc Ông Thọ, rận tai Otodectes, nấm Microsporum canis lây người, ngã ban công gãy xương, ngộ độc tinh dầu tràm trà / Permethrin, gan nhiễm mỡ do nhịn ăn, viêm loét miệng nướu, táo bón phình đại tràng, bỏng đệm chân, nhiễm giun đũa nôn ra giun, viêm vú sau sinh, viêm tụy cấp tư thế cầu nguyện, tiểu đường hạ bàn chân, bật móng chảy máu tủy, hen suyễn mèo, nhô mí mắt thứ ba.
   - Kiểm tra `Post::where('content', 'like', ...)` đảm bảo seeder có thể chạy lặp lại vô số lần mà không bao giờ nhân bản dữ liệu.
2. **Cấu trúc Tư vấn Chuẩn Y Khoa**:
   - Mỗi bài viết có bình luận ghim của bác sĩ thú y (`BS. Phạm Thị Mai`, `BS. Trần Quốc Bảo`, `BS. Nguyễn Hoàng Dũng`) chia theo cấu trúc 4 phần rõ ràng:
     - ⚠️ **Nguy cơ tiềm ẩn**
     - ⚡ **Làm ngay tại nhà**
     - 🚫 **KHÔNG ĐƯỢC LÀM** (Cảnh báo cấm tuyệt đối: Paracetamol/Panadol, Aspirin, ép uống nước khi co giật, móc họng bằng xà phòng, thụt rửa niệu đạo tại nhà...)
     - 🚨 **Khi nào phải đến phòng khám cấp cứu gấp**

---

## 16. Bộ Nhập Liệu Phòng Khám & Gom Cụm Bản Đồ (Round 4 - Part 6)

### Vấn đề:
1. Dữ liệu phòng khám thú y cần được nhập từ nhiều nguồn: OpenStreetMap Overpass API, Google Places API và tệp CSV.
2. Cần lưu vết tiến trình nhập liệu (resumable), chia ô không gian (spatial tiling) và thuật toán khử trùng lặp (deduplication) chính xác.
3. Khi hiển thị hàng trăm phòng khám trên bản đồ, trình duyệt có thể bị giật lag nếu không gom cụm marker.

### Quyết định kỹ thuật:
1. **Kiến trúc Nhập liệu Đa nguồn (`ClinicImporterService`)**:
   - Giao diện `ClinicSourceInterface` thống nhất cho các adapter: `OsmOverpassSource`, `GooglePlacesSource`, `CsvSource`.
   - Bảng `clinic_import_runs`: lưu trữ nhật ký từng lượt nhập (nguồn, trạng thái, số lượng lấy được, thêm mới, cập nhật, bỏ qua, lỗi).
   - Bảng `clinic_import_tiles`: chia lưới tọa độ không gian (bounding box 0.1 độ ~11km) phục vụ quét theo từng vùng.
2. **Thuật toán Khử Trùng Lặp (Deduplication Pipeline)**:
   - **Bước 1**: Chuẩn hóa số điện thoại `REGEXP_REPLACE(hotline, '[^0-9]', '')`. Nếu trùng số điện thoại >= 8 chữ số -> Khẳng định trùng và cập nhật thông tin mới.
   - **Bước 2**: Khoảng cách không gian Haversine < 50 mét VÀ độ tương đồng tên `similar_text` >= 75% -> Khẳng định trùng và cập nhật.
   - **Bước 3**: Nếu không trùng -> Thêm mới phòng khám và khởi tạo 7 bản ghi giờ mở cửa mặc định `ClinicHour`.
3. **Artisan Command `clinics:import`**:
   - Hỗ trợ tham số: `source` (osm, google, csv), `--file`, `--city`, `--limit`, `--dry-run`, `--mock`, `--tiles`.
4. **Thuật toán Gom Cụm Marker Bản Đồ Client-side (`clusterClinics`)**:
   - Khi mức thu phóng Zoom <= 11: Gom các phòng khám gần nhau thành cụm với huy hiệu số lượng gradient đỏ-hồng rực rỡ, kèm hiệu ứng hover và tooltip. Nhấp vào cụm sẽ tự động phóng to bao quát khu vực (`map.fitBounds`).
   - Khi Zoom >= 14: Tự động bung ra các ghim chi tiết phòng khám / bệnh viện kèm nhãn nguồn (`OSM`, `GOOGLE`, `CSV`).
   - Tích hợp nút bật/tắt gom cụm trực tiếp trên thanh công cụ: "🗺️ Gom cụm: BẬT / TẮT".


