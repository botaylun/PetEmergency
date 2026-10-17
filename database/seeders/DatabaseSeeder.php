<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Pet;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with realistic test data.
     * Doctors are positioned near Hanoi's Hoan Kiem district for Haversine testing.
     */
    public function run(): void
    {
        // ──────────────────────────────────────────────
        // Regular Users (Pet Parents)
        // ──────────────────────────────────────────────
        $user1 = User::firstOrCreate(['email' => 'minhanh@example.com'], [
            'name'                => 'Nguyễn Minh Anh',
            'password'            => Hash::make('password'),
            'role'                => 'user',
            'verification_status' => 'verified',
            'latitude'            => 21.0285055,  // Hoan Kiem Lake
            'longitude'           => 105.8542065,
            'phone'               => '0912345678',
        ]);

        $user2 = User::firstOrCreate(['email' => 'vanhung@example.com'], [
            'name'                => 'Trần Văn Hùng',
            'password'            => Hash::make('password'),
            'role'                => 'user',
            'verification_status' => 'verified',
            'latitude'            => 21.0309397,
            'longitude'           => 105.8524774,
            'phone'               => '0987654321',
        ]);

        $user3 = User::firstOrCreate(['email' => 'thuha@example.com'], [
            'name'                => 'Lê Thu Hà',
            'password'            => Hash::make('password'),
            'role'                => 'user',
            'verification_status' => 'verified',
            'latitude'            => 21.0227784,
            'longitude'           => 105.8519438,
            'phone'               => '0934567890',
        ]);

        // ──────────────────────────────────────────────
        // Verified Doctors (within 3km of Hoan Kiem)
        // ──────────────────────────────────────────────
        $doctor1 = User::firstOrCreate(['email' => 'dr.mai@example.com'], [
            'name'                => 'BS. Phạm Thị Mai',
            'password'            => Hash::make('password'),
            'role'                => 'doctor',
            'specialty'           => 'Cấp cứu & Hồi sức Thú y 24/24',
            'clinic_name'         => 'PetCare 24h Hà Nội',
            'bio'                 => 'Bác sĩ chuyên khoa Cấp cứu & Hồi sức Thú y 24/24 với hơn 8 năm kinh nghiệm cấp cứu ngộ độc, chấn thương và hồi sức tích cực cho chó mèo.',
            'verification_status' => 'verified',
            'latitude'            => 21.0275000, // ~0.17km
            'longitude'           => 105.8530000,
            'phone'               => '0901234567',
        ]);
        $doctor1->update([
            'specialty'           => 'Cấp cứu & Hồi sức Thú y 24/24',
            'clinic_name'         => 'PetCare 24h Hà Nội',
            'bio'                 => 'Bác sĩ chuyên khoa Cấp cứu & Hồi sức Thú y 24/24 với hơn 8 năm kinh nghiệm cấp cứu ngộ độc, chấn thương và hồi sức tích cực cho chó mèo.',
            'verification_status' => 'verified',
        ]);

        $doctor2 = User::firstOrCreate(['email' => 'dr.bao@example.com'], [
            'name'                => 'BS. Trần Quốc Bảo',
            'password'            => Hash::make('password'),
            'role'                => 'doctor',
            'specialty'           => 'Phẫu thuật ngoại khoa & Hồi sức',
            'clinic_name'         => 'Phòng khám Thú y 24/7 Hoàn Kiếm',
            'verification_status' => 'verified',
            'latitude'            => 21.0350000, // ~0.9km
            'longitude'           => 105.8490000,
            'phone'               => '0902345678',
        ]);

        $doctor3 = User::firstOrCreate(['email' => 'dr.dung@example.com'], [
            'name'                => 'BS. Nguyễn Hoàng Dũng',
            'role'                => 'doctor',
            'password'            => Hash::make('password'),
            'verification_status' => 'verified',
            'latitude'            => 21.0190000, // ~1.1km
            'longitude'           => 105.8580000,
            'phone'               => '0903456789',
        ]);

        $doctor4 = User::firstOrCreate(['email' => 'dr.lan@example.com'], [
            'name'                => 'BS. Vũ Thanh Lan',
            'password'            => Hash::make('password'),
            'role'                => 'doctor',
            'verification_status' => 'verified',
            'latitude'            => 21.0400000, // ~1.4km
            'longitude'           => 105.8600000,
            'phone'               => '0904567890',
        ]);

        $doctor5 = User::firstOrCreate(['email' => 'dr.tuan@example.com'], [
            'name'                => 'BS. Đỗ Minh Tuấn',
            'password'            => Hash::make('password'),
            'role'                => 'doctor',
            'verification_status' => 'verified',
            'latitude'            => 21.0150000, // ~1.7km
            'longitude'           => 105.8450000,
            'phone'               => '0905678901',
        ]);

        // Unverified doctor (should NOT appear in Haversine dispatch)
        User::firstOrCreate(['email' => 'dr.duc@example.com'], [
            'name'                => 'BS. Lý Văn Đức (Chưa duyệt)',
            'password'            => Hash::make('password'),
            'role'                => 'doctor',
            'verification_status' => 'pending',
            'latitude'            => 21.0260000,
            'longitude'           => 105.8500000,
            'phone'               => '0906789012',
        ]);

        // Admin
        User::firstOrCreate(['email' => 'admin@petemergency.com'], [
            'name'                => 'Admin PetEmergency',
            'password'            => Hash::make('admin123'),
            'role'                => 'admin',
            'verification_status' => 'verified',
            'latitude'            => null,
            'longitude'           => null,
            'phone'               => '0909999999',
        ]);

        // ──────────────────────────────────────────────
        // Pets with Realistic Details
        // ──────────────────────────────────────────────
        $pet1 = Pet::firstOrCreate(['user_id' => $user1->id, 'pet_name' => 'Milo'], [
            'type'             => 'dog',
            'species'          => 'dog',
            'breed'            => 'Golden Retriever',
            'birth_date'       => '2023-04-15',
            'weight'           => 28.5,
            'medical_history'  => 'Đã tiêm phòng dại định kỳ, tẩy giun tháng 8/2026.',
            'hardware_gps_id'  => 'GPS-COLLAR-001',
            'tracking_lat'     => 21.0288000,
            'tracking_lng'     => 105.8545000,
            'is_public'        => true,
            'qr_token'         => 'milo_demo_qr_token_2026',
            'qr_settings'      => ['show_photo' => true, 'show_name' => true, 'show_allergies' => true, 'show_contact' => true],
        ]);

        $pet2 = Pet::firstOrCreate(['user_id' => $user1->id, 'pet_name' => 'Luna'], [
            'type'             => 'cat',
            'species'          => 'cat',
            'breed'            => 'Persian',
            'birth_date'       => '2024-01-10',
            'weight'           => 4.2,
            'medical_history'  => 'Đã triệt sản, tiền sử dị ứng với một số loại hạt khô.',
            'hardware_gps_id'  => 'GPS-COLLAR-002',
            'tracking_lat'     => 21.0283000,
            'tracking_lng'     => 105.8538000,
            'is_public'        => true,
            'qr_token'         => 'luna_demo_qr_token_2026',
            'qr_settings'      => ['show_photo' => true, 'show_name' => true, 'show_allergies' => true, 'show_contact' => true],
        ]);

        Pet::firstOrCreate(['user_id' => $user2->id, 'pet_name' => 'Buddy'], [
            'type'             => 'dog',
            'species'          => 'dog',
            'breed'            => 'Shiba Inu',
            'birth_date'       => '2022-09-20',
            'weight'           => 11.0,
            'medical_history'  => 'Khỏe mạnh, kiểm tra sức khỏe tổng quát 6 tháng/lần.',
            'hardware_gps_id'  => 'GPS-COLLAR-003',
            'tracking_lat'     => 21.0310000,
            'tracking_lng'     => 105.8520000,
            'is_public'        => true,
        ]);

        // ──────────────────────────────────────────────
        // Health Events, Weights, Medications for Demo Pet
        // ──────────────────────────────────────────────
        \App\Models\PetHealthEvent::create([
            'pet_id'      => $pet1->id,
            'type'        => 'vaccine',
            'name'        => 'Tiêm phòng Dại (Rabies) định kỳ',
            'given_at'    => now()->subMonths(11),
            'next_due_at' => now()->addMonth(), // Sắp đến hạn
            'status'      => 'upcoming',
            'clinic_name' => 'Bệnh viện Thú y PetCare',
            'doctor_id'   => $doctor1->id,
            'notes'       => 'Vaccine Rabisin phòng dại cho chó 1 năm',
        ]);

        \App\Models\PetHealthEvent::create([
            'pet_id'      => $pet1->id,
            'type'        => 'deworm',
            'name'        => 'Tẩy giun định kỳ (Milbemax)',
            'given_at'    => null,
            'next_due_at' => now()->subDays(5), // Quá hạn
            'status'      => 'overdue',
            'clinic_name' => 'Bệnh viện Thú y PetCare',
            'notes'       => '1 viên Milbemax theo trọng lượng',
        ]);

        \App\Models\PetHealthEvent::create([
            'pet_id'      => $pet1->id,
            'type'        => 'vaccine',
            'name'        => 'Vaccine DHPP 5-in-1',
            'given_at'    => now()->subMonths(6),
            'next_due_at' => now()->addMonths(6),
            'status'      => 'done',
            'clinic_name' => 'Bệnh viện Thú y PetCare',
            'doctor_id'   => $doctor1->id,
        ]);

        // Weight tracking records
        \App\Models\PetWeight::create(['pet_id' => $pet1->id, 'weight' => 26.0, 'recorded_at' => now()->subMonths(2)]);
        \App\Models\PetWeight::create(['pet_id' => $pet1->id, 'weight' => 27.2, 'recorded_at' => now()->subMonth()]);
        \App\Models\PetWeight::create(['pet_id' => $pet1->id, 'weight' => 28.5, 'recorded_at' => now()->subDays(3)]);

        // Active medication
        \App\Models\PetMedication::create([
            'pet_id'       => $pet1->id,
            'name'         => 'Men vi sinh Probiotic Pet',
            'dosage'       => '1 gói/ngày',
            'times_per_day'=> 1,
            'start_date'   => now()->subDays(2),
            'end_date'     => now()->addDays(5),
            'instructions' => 'Trộn vào thức ăn hạt',
        ]);

        // Notification for owner
        \App\Models\AppNotification::create([
            'user_id' => $user1->id,
            'type'    => 'health_reminder',
            'title'   => 'Lịch tiêm phòng sắp tới',
            'message' => 'Bé Milo sắp đến hạn tiêm nhắc phòng Dại vào tháng tới.',
            'data'    => ['pet_id' => $pet1->id],
        ]);

        // ──────────────────────────────────────────────
        // Forum Posts & Comments
        // ──────────────────────────────────────────────
        $post1 = Post::create([
            'user_id'    => $doctor1->id,
            'content'    => 'Common winter hazard warning: please keep toxic household plants like Poinsettias or Lilies completely out of reach of your cats and dogs. If you suspect ingestion, trigger the 3-second SOS alert on our app immediately to locate the nearest emergency team!',
            'media_url'  => null,
            'media_type' => 'none',
        ]);

        $post2 = Post::create([
            'user_id'    => $user1->id,
            'content'    => 'Little Milo recovered beautifully from his spay surgery last week. Thanks so much to the emergency chat support team on this app for comforting me through my panic!',
            'media_url'  => null,
            'media_type' => 'none',
        ]);

        // Regular user comment
        Comment::create([
            'post_id' => $post1->id,
            'user_id' => $user2->id,
            'content' => 'Thank you doctor! My cat loves chewing on green leaves, this is extremely helpful to know.',
        ]);

        // Doctor comment (will be pinned to top by ForumController)
        Comment::create([
            'post_id' => $post1->id,
            'user_id' => $doctor1->id,
            'content' => 'Of course! Try growing fresh cat grass instead—it is totally safe and satisfies their natural urge to graze!',
        ]);

        Comment::create([
            'post_id' => $post2->id,
            'user_id' => $doctor2->id,
            'content' => 'Milo hồi phục rất tốt! Chú ý tránh vận động mạnh trong 7 ngày tới nhé bạn.',
        ]);

        $this->call(ClinicSeeder::class);
        $this->call(CatHealthForumSeeder::class);
    }
}
