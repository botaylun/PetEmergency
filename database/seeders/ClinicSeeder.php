<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicHour;
use App\Models\ClinicMember;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ClinicSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 33 initial clinics from the VetMap list
        $clinicsData = [
            // === HÀ NỘI ===
            [
                'name' => 'Bệnh Viện Thú Y Hà Nội',
                'address' => '97 Trường Chinh, Đống Đa, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 21.0172,
                'lng' => 105.8412,
                'hotline' => '024 3851 2388',
                'rating' => 4.7,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Bệnh viện thú y đa khoa hàng đầu tại Hà Nội với trang thiết bị xét nghiệm và phẫu thuật hiện đại.',
            ],
            [
                'name' => 'PetCare 24h Hà Nội',
                'address' => '45 Láng Hạ, Đống Đa, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 21.0245,
                'lng' => 105.8225,
                'hotline' => '024 3514 2299',
                'rating' => 4.5,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Trung tâm cấp cứu và điều trị thú cưng 24/7 trực đêm chuyên nghiệp.',
            ],
            [
                'name' => 'Phòng Khám Thú Y Cầu Giấy',
                'address' => '132 Xuân Thủy, Cầu Giấy, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 21.0380,
                'lng' => 105.7886,
                'hotline' => '024 3789 1234',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám chữa bệnh, tiêm phòng và chăm sóc định kỳ cho chó mèo khu vực Cầu Giấy.',
            ],
            [
                'name' => 'Vet Pro Tây Hồ',
                'address' => '56 Xuân Diệu, Tây Hồ, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 21.0650,
                'lng' => 105.8425,
                'hotline' => '024 3718 9900',
                'rating' => 4.6,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú y tiêu chuẩn quốc tế tại Tây Hồ, hỗ trợ tiếng Anh.',
            ],
            [
                'name' => 'Happy Paws Hà Nội',
                'address' => '23 Hoàng Quốc Việt, Cầu Giấy',
                'city' => 'Hà Nội',
                'lat' => 21.0433,
                'lng' => 105.7994,
                'hotline' => '024 3776 5511',
                'rating' => 4.4,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Dịch vụ khám điều trị, spa chăm sóc lông và lưu trú thú cưng.',
            ],
            [
                'name' => 'Bệnh Viện Thú Y Nam Từ Liêm',
                'address' => '78 Lê Đức Thọ, Nam Từ Liêm, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 21.0267,
                'lng' => 105.7689,
                'hotline' => '024 6261 8800',
                'rating' => 4.5,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Cấp cứu phẫu thuật, phòng hồi sức thở oxy và điều trị nội trú 24/24.',
            ],
            [
                'name' => 'Pet Kingdom Long Biên',
                'address' => '34 Nguyễn Văn Cừ, Long Biên, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 21.0445,
                'lng' => 105.8772,
                'hotline' => '024 3612 9009',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám, điều trị và tiêm chủng cho thú cưng bờ Đông Hà Nội.',
            ],
            [
                'name' => 'Animal Care Hoàng Mai',
                'address' => '112 Giải Phóng, Hoàng Mai, Hà Nội',
                'city' => 'Hà Nội',
                'lat' => 20.9987,
                'lng' => 105.8534,
                'hotline' => '024 3641 2277',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Chăm sóc y tế toàn diện cho vật nuôi khu vực Hoàng Mai.',
            ],

            // === HỒ CHÍ MINH ===
            [
                'name' => 'Bệnh Viện Thú Y TP.HCM',
                'address' => '68 Lê Văn Thịnh, Bình Thạnh, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.7870,
                'lng' => 106.7243,
                'hotline' => '028 3840 5555',
                'rating' => 4.8,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Bệnh viện thú y chuyên sâu với hệ thống phòng mổ vô trùng và máy X-quang kỹ thuật số.',
            ],
            [
                'name' => 'PetVet Quận 1',
                'address' => '15 Nguyễn Huệ, Quận 1, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.7769,
                'lng' => 106.7009,
                'hotline' => '028 3823 1100',
                'rating' => 4.6,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú cưng cao cấp tại trung tâm Quận 1.',
            ],
            [
                'name' => 'Thú Y Quốc Tế Saigon',
                'address' => '234 Phan Xích Long, Phú Nhuận, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.7970,
                'lng' => 106.6886,
                'hotline' => '028 3995 2233',
                'rating' => 4.7,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Đội ngũ bác sĩ thú y giàu kinh nghiệm, cấp cứu và nội trú 24/7.',
            ],
            [
                'name' => 'Anipet Clinic Quận 7',
                'address' => '45 Nguyễn Thị Thập, Quận 7, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.7300,
                'lng' => 106.7139,
                'hotline' => '028 5413 7788',
                'rating' => 4.5,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám tổng quát, xét nghiệm máu, siêu âm màu và phẫu thuật cơ bản.',
            ],
            [
                'name' => 'Pet Care Bình Dương Gò Vấp',
                'address' => '189 Quang Trung, Gò Vấp, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.8224,
                'lng' => 106.6657,
                'hotline' => '028 3894 6600',
                'rating' => 4.4,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Dịch vụ thú y tận tâm, giá cả hợp lý tại Gò Vấp.',
            ],
            [
                'name' => 'VetCare Tân Bình',
                'address' => '78 Hoàng Văn Thụ, Tân Bình, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.7984,
                'lng' => 106.6570,
                'hotline' => '028 3844 2255',
                'rating' => 4.6,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Chuyên điều trị bệnh truyền nhiễm, da liễu và xương khớp cho thú cưng.',
            ],
            [
                'name' => 'Phòng Khám Thú Y Thủ Đức',
                'address' => '321 Võ Văn Ngân, Thủ Đức, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.8492,
                'lng' => 106.7602,
                'hotline' => '028 3722 9900',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Cơ sở thú y uy tín tại TP Thủ Đức với dịch vụ tiêm phòng và phẫu thuật.',
            ],
            [
                'name' => 'AnimalHouse Bình Chánh',
                'address' => '56 Nguyễn Văn Linh, Bình Chánh, TP.HCM',
                'city' => 'TP. Hồ Chí Minh',
                'lat' => 10.6891,
                'lng' => 106.6271,
                'hotline' => '028 3763 1188',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám chữa bệnh và cấp cứu ban ngày khu vực Bình Chánh.',
            ],

            // === ĐÀ NẴNG ===
            [
                'name' => 'Bệnh Viện Thú Y Đà Nẵng',
                'address' => '234 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
                'city' => 'Đà Nẵng',
                'lat' => 16.0678,
                'lng' => 108.2120,
                'hotline' => '0236 3655 199',
                'rating' => 4.5,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Bệnh viện thú y lớn nhất miền Trung phục vụ 24/7.',
            ],
            [
                'name' => 'PetClinic Hải Châu',
                'address' => '45 Lê Lợi, Hải Châu, Đà Nẵng',
                'city' => 'Đà Nẵng',
                'lat' => 16.0544,
                'lng' => 108.2022,
                'hotline' => '0236 3812 456',
                'rating' => 4.4,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám định kỳ, chích ngừa và làm đẹp cho thú cưng tại Hải Châu.',
            ],
            [
                'name' => 'Furry Friends Đà Nẵng',
                'address' => '78 Nguyễn Văn Linh, Đà Nẵng',
                'city' => 'Đà Nẵng',
                'lat' => 16.0469,
                'lng' => 108.2208,
                'hotline' => '0236 3999 777',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thân thiện cho chó mèo ngay trung tâm Đà Nẵng.',
            ],

            // === CẦN THƠ ===
            [
                'name' => 'Bệnh Viện Thú Y Cần Thơ',
                'address' => '34 Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ',
                'city' => 'Cần Thơ',
                'lat' => 10.0341,
                'lng' => 105.7875,
                'hotline' => '0292 3827 123',
                'rating' => 4.4,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Bệnh viện thú y trung tâm Đồng bằng Sông Cửu Long tiếp nhận cấp cứu 24/7.',
            ],
            [
                'name' => 'PetCare Bình Thủy',
                'address' => '56 Nguyễn Trãi, Bình Thủy, Cần Thơ',
                'city' => 'Cần Thơ',
                'lat' => 10.0580,
                'lng' => 105.7644,
                'hotline' => '0292 3613 456',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Dịch vụ khám chữa và chích ngừa gia đình cho thú cưng.',
            ],

            // === HẢI PHÒNG ===
            [
                'name' => 'Phòng Khám Thú Y Lê Chân',
                'address' => '123 Lạch Tray, Lê Chân, Hải Phòng',
                'city' => 'Hải Phòng',
                'lat' => 20.8449,
                'lng' => 106.6881,
                'hotline' => '0225 3823 789',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú y uy tín lâu năm tại Hải Phòng.',
            ],
            [
                'name' => 'Hải Phòng Pet Hospital',
                'address' => '67 Trần Phú, Ngô Quyền, Hải Phòng',
                'city' => 'Hải Phòng',
                'lat' => 20.8597,
                'lng' => 106.6997,
                'hotline' => '0225 3642 100',
                'rating' => 4.5,
                'is_24h' => true,
                'type' => 'hospital',
                'description' => 'Bệnh viện thú y hiện đại, trực cấp cứu 24/7 thành phố Cảng.',
            ],

            // === NHA TRANG ===
            [
                'name' => 'Nha Trang Vet Center',
                'address' => '89 Nguyễn Thiện Thuật, Nha Trang',
                'city' => 'Nha Trang',
                'lat' => 12.2388,
                'lng' => 109.1967,
                'hotline' => '0258 3522 388',
                'rating' => 4.4,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Trung tâm thú y và cứu hộ động vật Nha Trang.',
            ],
            [
                'name' => 'Biển Đông Pet Clinic',
                'address' => '15 Yersin, Nha Trang, Khánh Hòa',
                'city' => 'Nha Trang',
                'lat' => 12.2449,
                'lng' => 109.1975,
                'hotline' => '0258 3812 667',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám chữa bệnh, triệt sản và tư vấn dinh dưỡng thú cưng.',
            ],

            // === HUẾ ===
            [
                'name' => 'Phòng Khám Thú Y Huế',
                'address' => '45 Lê Lợi, Phú Hội, TP Huế',
                'city' => 'Huế',
                'lat' => 16.4637,
                'lng' => 107.5909,
                'hotline' => '0234 3813 445',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú y Cố Đô Huế.',
            ],

            // === VŨNG TÀU ===
            [
                'name' => 'Vũng Tàu Pet Care',
                'address' => '78 Lê Hồng Phong, Vũng Tàu',
                'city' => 'Vũng Tàu',
                'lat' => 10.3460,
                'lng' => 107.0843,
                'hotline' => '0254 3856 788',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Chăm sóc sức khỏe toàn diện cho thú cưng Vũng Tàu.',
            ],

            // === BIÊN HÒA ===
            [
                'name' => 'Phòng Khám Thú Y Biên Hòa',
                'address' => '123 Đồng Khởi, Biên Hòa, Đồng Nai',
                'city' => 'Biên Hòa',
                'lat' => 10.9574,
                'lng' => 106.8429,
                'hotline' => '0251 3822 456',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú y hàng đầu TP Biên Hòa.',
            ],

            // === BÌNH DƯƠNG ===
            [
                'name' => 'Pet Hospital Bình Dương',
                'address' => '234 Đại lộ Bình Dương, Thủ Dầu Một',
                'city' => 'Bình Dương',
                'lat' => 10.9804,
                'lng' => 106.6520,
                'hotline' => '0274 3822 999',
                'rating' => 4.4,
                'is_24h' => false,
                'type' => 'hospital',
                'description' => 'Bệnh viện thú y đa khoa Thủ Dầu Một Bình Dương.',
            ],

            // === LONG AN ===
            [
                'name' => 'Thú Y Long An',
                'address' => '56 Hùng Vương, Tân An, Long An',
                'city' => 'Long An',
                'lat' => 10.5318,
                'lng' => 106.4135,
                'hotline' => '0272 3822 678',
                'rating' => 4.1,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Khám điều trị thú nhỏ tại TP Tân An.',
            ],

            // === QUẢNG NINH ===
            [
                'name' => 'Hạ Long Pet Care',
                'address' => '45 Hoàng Quốc Việt, Hạ Long, Quảng Ninh',
                'city' => 'Quảng Ninh',
                'lat' => 20.9517,
                'lng' => 107.0801,
                'hotline' => '0203 3625 456',
                'rating' => 4.3,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú y Hạ Long Quảng Ninh.',
            ],

            // === THANH HÓA ===
            [
                'name' => 'Phòng Khám Thú Y Thanh Hóa',
                'address' => '89 Lê Lợi, TP Thanh Hóa',
                'city' => 'Thanh Hóa',
                'lat' => 19.8073,
                'lng' => 105.7766,
                'hotline' => '0237 3851 234',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Phòng khám thú cưng trung tâm Thanh Hóa.',
            ],

            // === NGHỆ AN ===
            [
                'name' => 'VetCare Vinh',
                'address' => '56 Trần Phú, Vinh, Nghệ An',
                'city' => 'Nghệ An',
                'lat' => 18.6790,
                'lng' => 105.6804,
                'hotline' => '0238 3855 678',
                'rating' => 4.2,
                'is_24h' => false,
                'type' => 'clinic',
                'description' => 'Dịch vụ thú y tận tình tại TP Vinh.',
            ],
        ];

        $drMai = User::where('email', 'dr.mai@example.com')->first();
        $drBao = User::where('email', 'dr.bao@example.com')->first();
        $drDung = User::where('email', 'dr.dung@example.com')->first();

        foreach ($clinicsData as $index => $data) {
            $clinic = Clinic::updateOrCreate(
                ['name' => $data['name']],
                [
                    'type'              => $data['type'],
                    'description'       => $data['description'],
                    'address'           => $data['address'],
                    'city'              => $data['city'],
                    'lat'               => $data['lat'],
                    'lng'               => $data['lng'],
                    'hotline'           => $data['hotline'],
                    'zalo'              => $data['hotline'],
                    'website'           => 'https://petcare24.vn',
                    'facebook'          => 'https://facebook.com/petcare24',
                    'is_24h'            => $data['is_24h'],
                    'accepts_emergency' => true,
                    'species'           => ['Chó', 'Mèo', 'Chim', 'Chuột Hamster'],
                    'services'          => ['Cấp cứu 24/7', 'Phẫu thuật', 'Tiêm phòng', 'Xét nghiệm', 'Lưu chuồng', 'Grooming & Spa'],
                    'status'            => 'approved',
                    'rating'            => $data['rating'],
                    'review_count'      => rand(12, 68),
                    'created_by'        => ($index === 1 && $drMai) ? $drMai->id : null,
                ]
            );

            // Populate Clinic Hours
            for ($d = 0; $d <= 6; $d++) {
                ClinicHour::updateOrCreate(
                    ['clinic_id' => $clinic->id, 'day_of_week' => $d],
                    [
                        'open_time'  => $data['is_24h'] ? '00:00:00' : '07:30:00',
                        'close_time' => $data['is_24h'] ? '23:59:59' : '21:00:00',
                        'is_closed'  => false,
                    ]
                );
            }

            // Link Dr. Mai as owner of PetCare 24h Hà Nội
            if ($index === 1 && $drMai) {
                ClinicMember::updateOrCreate(
                    ['clinic_id' => $clinic->id, 'user_id' => $drMai->id],
                    ['role' => 'owner', 'status' => 'active']
                );
                $drMai->update([
                    'clinic_id' => $clinic->id,
                    'clinic_name' => $clinic->name,
                ]);
            }

            // Link Dr. Bao as member of Bệnh Viện Thú Y Hà Nội
            if ($index === 0 && $drBao) {
                ClinicMember::updateOrCreate(
                    ['clinic_id' => $clinic->id, 'user_id' => $drBao->id],
                    ['role' => 'member', 'status' => 'active']
                );
            }

            // Link Dr. Dung as owner of Phòng Khám Thú Y Cầu Giấy
            if ($index === 2 && $drDung) {
                ClinicMember::updateOrCreate(
                    ['clinic_id' => $clinic->id, 'user_id' => $drDung->id],
                    ['role' => 'owner', 'status' => 'active']
                );
            }
        }
    }
}
