<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Pet;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class CatHealthForumSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Realistic Vietnamese sick cat scenarios with verified veterinary doctor guidance.
     */
    public function run(): void
    {
        // Get or find doctor accounts
        $drMai = User::where('email', 'dr.mai@example.com')->first();
        $drBao = User::where('email', 'dr.bao@example.com')->first();
        $drDung = User::where('email', 'dr.dung@example.com')->first();

        // Get regular user accounts
        $user1 = User::where('email', 'minhanh@example.com')->first() ?? User::first();
        $user2 = User::where('email', 'vanhung@example.com')->first() ?? User::first();
        $user3 = User::where('email', 'thuha@example.com')->first() ?? User::first();

        if (!$drMai) {
            $drMai = User::create([
                'name'                => 'BS. Phạm Thị Mai',
                'email'               => 'dr.mai@example.com',
                'password'            => bcrypt('password'),
                'role'                => 'doctor',
                'specialty'           => 'Cấp cứu & Hồi sức Thú y 24/24',
                'clinic_name'         => 'PetCare 24h Hà Nội',
                'verification_status' => 'verified',
            ]);
        }

        // 25 realistic sick cat medical cases
        $cases = [
            [
                'author'    => $user1,
                'pet_name'  => 'Mèo Bơ',
                'tags'      => ['Cấp cứu', 'Mèo', 'Hỏi bác sĩ'],
                'content'   => 'CỨU EM VỚI Ạ! Mèo nhà em nôn dịch vàng sủi bọt từ sáng đến giờ 4 lần rồi, người lừ đừ không chịu ăn hạt hay pate. Cho uống nước là nôn thốc ra nước kèm bọt trắng nhờn. Bé mới được 8 tháng tuổi, chưa tiêm nhắc mũi 2. Em lo quá, có phải bé bị giảm bạch cầu không ạ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **TƯ VẤN CẤP CỨU TỪ BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Nôn dịch vàng nhiều lần ở mèo chưa tiêm đủ vaccine là dấu hiệu báo động đỏ của Viêm ruột truyền nhiễm (Giảm bạch cầu FPV) hoặc Tắc nghẽn ruột do nuốt phải dị vật (búi lông, dây chỉ, xốp).\n\n"
                    . "⚡ **Làm ngay tại nhà**:\n"
                    . "- Tạm ngưng cho ăn hạt và thức ăn cứng trong 4-6 giờ để đường ruột nghỉ ngơi.\n"
                    . "- Giữ ấm cho bé bằng chăn mềm, đặt ở nơi yên tĩnh, tránh gió lùa.\n"
                    . "- Chuẩn bị đưa bé đi khám càng sớm càng tốt.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** tự ý cho mèo uống thuốc chống nôn hoặc men tiêu hóa của người.\n"
                    . "- **KHÔNG** ép bé uống nhiều nước hoặc sữa khi đang nôn liên tục (dễ sặc vào phổi gây viêm phổi hít).\n\n"
                    . "🚨 **Khi nào phải đưa đi cấp cứu ngay lập tức**:\n"
                    . "- Bé nôn trên 3 lần trong vòng 4 tiếng.\n"
                    . "- Bắt đầu có dấu hiệu đi ngoài phân lỏng hôi tanh hoặc có tia máu.\n"
                    . "- Niêm mạc miệng, nướu răng nhợt nhạt, véo da cổ không đàn hồi trở lại (mất nước độ 3).",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Miu Đực',
                'tags'      => ['Cấp cứu', 'Mèo', 'Sức khỏe'],
                'content'   => 'Mèo đực nhà em 2 tuổi liên tục vào chậu cát rặn tiểu nhưng chỉ nhỏ ra 1-2 giọt máu, vừa rặn vừa kêu gào thảm thiết, liếm bộ phận sinh dục liên tục. Bụng dưới sờ vào thấy căng tròn cứng ngắc như quả bóng tennis. Đây có phải bí tiểu cấp không mọi người?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **CẢNH BÁO TỐI CẤP CỨU TỪ BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Đây là hội chứng Bí tiểu cấp tính do sỏi/nút nhầy niệu đạo (FLUTD / Urethral Obstruction) ở mèo đực. Bàng quang căng cứng có nguy cơ VỠ BÀNG QUANG hoặc ngộ độc Kali máu (tăng Kali gây ngừng tim) dẫn đến tử vong trong vòng 24-48 giờ!\n\n"
                    . "⚡ **Làm ngay**:\n"
                    . "- Giữ bình tĩnh, không xoa bóp hay ấn mạnh vào vùng bàng quang căng cứng (nguy cơ vỡ bàng quang lập tức).\n"
                    . "- Bọc mèo vào khăn bông êm, giữ cố định và gọi ngay xe/phòng khám thú y có trực đêm 24/7 để đặt ống thông tiểu (thông sonde).\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** tự dùng tăm bông hay kim chọc thụt rửa tại nhà.\n"
                    . "- **KHÔNG** cho uống thuốc lợi tiểu của người.\n\n"
                    . "🚨 **Khi nào đến phòng khám**: PHẢI ĐẾN NGAY LẬP TỨC TRONG ĐÊM NAY, không được đợi đến sáng mai!",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Bánh Bao',
                'tags'      => ['Sơ cứu', 'Mèo', 'Cấp cứu'],
                'content'   => 'Mọi người ơi giúp em, em cắm lọ hoa ly (Lily) trên bàn, lúc nãy phát hiện bé mèo cắn rách cánh hoa và dính phấn hoa vàng ở miệng và mũi. Bé vừa nôn ra một ít dịch có dính phấn hoa. Nghe nói hoa ly độc với mèo lắm đúng không ạ?!',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **CHỈ ĐẠO CẤP CỨU ĐỘC HỌC TỪ BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: TẤT CẢ các bộ phận của cây hoa ly (cánh hoa, lá, phấn hoa, thậm chí cả nước trong bình cắm) đều chứa độc tố gây SUY THẬN CẤP HOẠI TỬ VÔ PHƯƠNG CỨU CHỮA ở mèo nếu không được truyền dịch hỗ trợ trong 6 giờ đầu!\n\n"
                    . "⚡ **Làm ngay tại nhà**:\n"
                    . "- Dùng khăn ẩm lau sạch toàn bộ phấn hoa dính trên miệng, mũi, ria mép và lông chân của mèo để tránh bé liếm láp thêm độc tố.\n"
                    . "- Chụp ảnh lại mẫu cành hoa ly mang theo để bác sĩ xác định chủng loài.\n"
                    . "- Đưa bé đến bệnh viện thú y gần nhất ngay trong vòng 2 giờ để đặt ven truyền dịch giải độc và bảo vệ cầu thận.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** tự móc họng gây nôn bằng xà phòng hoặc muối ăn (gây ngộ độc natri tử vong).\n"
                    . "- **KHÔNG** chần chừ theo dõi tại nhà, độc tố hoa ly hủy hoại thận âm thầm không có thuốc giải đặc hiệu nếu để quá 18 giờ.",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Mimi',
                'tags'      => ['Cấp cứu', 'Mèo', 'Thuốc'],
                'content'   => 'Bé mèo bị sốt nóng tai 40 độ C, người run rẩy. Người nhà em định lấy 1/4 viên Panadol (Paracetamol) 500mg nghiền ra cho bé uống hạ sốt. Em cản lại lên đây hỏi bác sĩ trước cho an tâm ạ, mèo có uống được Panadol không?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **CẢNH BÁO TỬ VONG — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: **PARACETAMOL LÀ CHẤT ĐỘC TỬ THẦN ĐỐI VỚI MÈO!** Cơ thể mèo hoàn toàn thiếu hụt enzym Glucuronyl transferase để chuyển hóa Paracetamol. Dù chỉ 1 mẩu nhỏ Panadol cũng đủ làm vỡ hồng cầu hàng loạt (Methemoglobinemia), hoại tử gan cấp tính, máu chuyển màu nâu socola và mèo ngạt thở tử vong sau vài giờ!\n\n"
                    . "⚡ **Làm ngay hạ sốt an toàn**:\n"
                    . "- Dùng khăn xô nhúng nước ấm (khoảng 35-37 độ C, vắt kiệt) lau nhẹ vào 4 đệm bàn chân, bẹn đùi trong và vành tai bé.\n"
                    . "- Để bé nằm nơi thoáng mát, quạt nhẹ thoang thoảng (không phả thẳng vào mặt).\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG BAO GIỜ** cho mèo dùng Paracetamol, Panadol, Decolgen, Tylenol, Efferalgan hay Aspirin/Ibuprofen của người!\n"
                    . "- **KHÔNG** chườm nước đá lạnh ngắt (gây co mạch đột ngột làm sốt cao hơn).\n\n"
                    . "🚨 **Đưa đi khám**: Nếu sốt trên 39.5°C kéo dài trên 2 giờ kèm thở gấp, đưa đến phòng khám để bác sĩ tiêm thuốc hạ sốt thú y chuyên dụng.",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Cam Cam',
                'tags'      => ['Sơ cứu', 'Mèo', 'Cấp cứu'],
                'content'   => 'Mèo nhà em nghịch cuộn chỉ khâu và lỡ nuốt mất một đoạn chỉ dài, hiện em thấy một mẩu chỉ còn thò ra ở khóe miệng bé. Em có nên cầm đầu sợi chỉ kéo mạnh ra không ạ? Bé đang ho ọe liên tục.',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **CẢNH BÁO PHẪU THUẬT TỪ BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Đây là dị vật dạng sợi (Linear foreign body). Sợi chỉ thường đã mắc vào cuống lưỡi hoặc môn vị dạ dày trong khi đoạn dưới đã trôi xuống ruột. Nếu bạn kéo chỉ ra, sợi chỉ sẽ hoạt động như lưỡi cưa cắt đứt thành ruột và thủng dạ dày gây viêm phúc mạc tử vong!\n\n"
                    . "⚡ **Làm ngay**:\n"
                    . "- Giữ bé bình tĩnh, nhẹ nhàng dùng kéo cắt bớt phần sợi chỉ thò ra ngoài miệng nhưng chừa lại khoảng 1-2 cm (để tránh chỉ vướng vào răng hoặc đồ đạc).\n"
                    . "- Bế bé đi cấp cứu ngay để chụp X-quang / nội soi gắp dị vật ra an toàn.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG KÉO SỢI CHỈ RA** dù thấy kéo rất nhẹ tay!\n"
                    . "- **KHÔNG** cho ăn thêm cơm hay chuối để 'nuốt trôi' (làm tắc nghẽn nặng hơn).",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Miu Miu',
                'tags'      => ['Sức khỏe', 'Mèo', 'Triệu chứng'],
                'content'   => 'Bé mèo ta 4 tháng tuổi 2 ngày nay mắt nhắm tịt, rỉ mắt màu vàng xanh đặc quẹt dính chặt 2 mí, mũi nghẹt thở khò khè, hắt xì liên tục ra dịch nhầy. Bé bỏ ăn vì không ngửi được mùi thức ăn. Có phải bé bị cảm lạnh thông thường không?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **TƯ VẤN ĐIỀU TRỊ TỪ BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Đây là triệu chứng điển hình của Hội chứng Viêm đường hô hấp trên ở mèo (Feline Upper Respiratory Infection - thường do Feline Herpesvirus FHV-1 hoặc Calicivirus FCV). Rỉ mắt vàng xanh chứng tỏ đã có bội nhiễm vi khuẩn, nếu không chữa kịp thời có thể gây loét giác mạc thủng mắt.\n\n"
                    . "⚡ **Chăm sóc tại nhà**:\n"
                    . "- Dùng gạc y tế thấm nước muối sinh lý NaCl 0.9% ấm lau mềm và nhẹ nhàng lấy sạch rỉ mắt, thông lỗ mũi cho bé ngày 3-4 lần.\n"
                    . "- Hâm ấm thức ăn ướt (pate) để dậy mùi thơm, kích thích khứu giác giúp bé chịu ăn.\n"
                    . "- Cho bé xông hơi nước ấm (đưa bé vào phòng tắm khi bật nước nóng ấm 10 phút) để loãng đờm mũi.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **KHÔNG** dùng thuốc nhỏ mắt chứa Corticoid (như Dexamethasone/Tobradex) bừa bãi khi chưa soi giác mạc (sẽ làm mù mắt nếu có vết loét).\n"
                    . "- **KHÔNG** cạy rỉ mắt khi còn khô cứng (gây rách da mi mắt).",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Đậu Đậu',
                'tags'      => ['Cấp cứu', 'Mèo', 'Sức khỏe'],
                'content'   => 'Mèo Xiêm nhà em bụng tự dưng phình to căng tròn như quả dưa hấu trong vòng 1 tuần nay, nhưng sống lưng và 4 chân lại teo tóp gầy trơ xương. Bé thở dốc, sốt nhẹ ngắt quãng. Bác sĩ cho em hỏi bé bị giun hay bị bệnh FIP thể ướt ạ?',
                'doctor'    => $drDung,
                'doctor_advice' => "🩺 **TƯ VẤN CHUYÊN MÔN TỪ BS. NGUYỄN HOÀNG DŨNG**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Bụng to tích dịch nhanh kèm teo cơ sống lưng và sốt dao động ở mèo trẻ dưới 2 tuổi là dấu hiệu lâm sàng rất điển hình của FIP thể ướt (Viêm phúc mạc truyền nhiễm do biến chủng Coronavirus mèo). Dịch bụng này thường có màu vàng rơm, quánh dính như lòng trắng trứng.\n\n"
                    . "⚡ **Hành động khẩn cấp**:\n"
                    . "- Cần đưa bé đến cơ sở thú y có máy siêu âm và xét nghiệm Rivalta test dịch ổ bụng để xác định chính xác.\n"
                    . "- Hiện nay FIP đã có phác đồ điều trị kháng virus đặc hiệu (GS-441524), cơ hội cứu sống lên tới trên 85% nếu can thiệp sớm trước khi suy đa tạng!\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **KHÔNG** tự ý cho uống thuốc xổ giun lúc này (đường ruột đang tổn thương, tẩy giun có thể gây sốc viêm ruột cấp).\n"
                    . "- **KHÔNG** tự lấy kim chọc hút dịch bụng tại nhà.",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Tom',
                'tags'      => ['Cấp cứu', 'Mèo', 'Hô hấp'],
                'content'   => 'Bé Tom đang nằm tự dưng thở dốc, há ngoác mồm thè lưỡi thở như chó, ngực và bụng phập phồng co giật từng cơn. Lưỡi bé bắt đầu chuyển sang màu tím tái! Em phải sơ cứu thế nào ngay bây giờ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **CHỈ ĐẠO CẤP CỨU HÔ HẤP KHẨN CẤP — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Mèo thở há miệng kèm lưỡi tím tái là triệu chứng SUY HÔ HẤP CẤP / THIẾU OXY NGHIÊM TRỌNG (do tràn dịch màng phổi, hen mèo cấp tính Feline Asthma, hoặc phù phổi cấp do bệnh cơ tim phì đại HCM). Mèo có thể tử vong vì ngạt thở trong vài phút!\n\n"
                    . "⚡ **Làm ngay trong 60 giây tới**:\n"
                    . "- **GIẢM THIỂU TỐI ĐA MỌI CĂNG THẲNG**: Không ôm chặt, không ép nằm ngửa, không bóp miệng.\n"
                    . "- Đặt bé vào lồng thoáng khí, bật quạt mát thoang thoảng hoặc điều hòa 24 độ C.\n"
                    . "- Đưa bé NGAY LẬP TỨC đến bệnh viện thú y gần nhất có bình oxy và lồng thở oxy cấp cứu.\n"
                    . "- Trong quá trình di chuyển trên xe, giữ xe yên tĩnh, không mở nhạc, không bật đèn flash chói mắt.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** đè ép ngực hoặc cố đổ nước hay sữa vào miệng (làm sặc chết ngay lập tức)!",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Mochi',
                'tags'      => ['Sức khỏe', 'Mèo', 'Dinh dưỡng'],
                'content'   => 'Mèo con 3 tuần tuổi mồ côi mẹ, em đang cho uống sữa đặc Ông Thọ pha ấm được 2 ngày thì hôm nay bé tiêu chảy xì xoẹt phân trắng vàng toàn nước, hậu môn sưng đỏ rát. Em phải làm sao để bé không mất nước ạ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **TƯ VẤN NUÔI DƯỠNG MÈO CON — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguyên nhân**: Hệ tiêu hóa mèo con KHÔNG CÓ ENZYM LACTASE để tiêu hóa đường Lactose trong sữa bò hay sữa đặc Ông Thọ. Cho uống sữa bò sẽ gây lên men thối rữa đường ruột, tiêu chảy cấp gây trụy mạch tử vong rất nhanh ở mèo dưới 1 tháng tuổi!\n\n"
                    . "⚡ **Làm ngay**:\n"
                    . "- DỪNG NGAY sữa Ông Thọ lập tức!\n"
                    . "- Chuyển sang dùng **Sữa bột công thức chuyên dụng cho mèo con** (KMR, PetLac, Bio Milk for Cat).\n"
                    . "- Pha nước ấm 38-40°C, cho bú từng giọt bằng bình sữa ti nhỏ hoặc xi lanh không kim, đặt mèo NẰM SẤP KHI BÚ (tuyệt đối không ngửa bụng như em bé để tránh sặc vào phổi).\n"
                    . "- Dùng bông gòn ấm xoa nhẹ kích thích hậu môn sau khi ăn để bé đi vệ sinh.\n\n"
                    . "🚨 **Nếu bé lờ đờ hạ thân nhiệt**: Bọc khăn ấm, bổ sung 1 giọt mật ong hoặc nước đường glucose vào nướu và đưa đến trạm xá.",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Cacao',
                'tags'      => ['Sức khỏe', 'Mèo', 'Da liễu'],
                'content'   => 'Hai tai mèo nhà em đầy vảy đen khô như bã cà phê, bé hay lắc đầu mạnh và gãi tai đến trầy xước rướm máu. Vành tai có mùi hôi hôi khó chịu. Bé bị làm sao và dùng thuốc gì trị được ạ?',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **TƯ VẤN DA LIỄU THÚ Y — BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Chẩn đoán**: Dịch đen vón cục như bã cà phê kèm ngứa dữ dội là dấu hiệu 99% của **Rận tai mèo (Otodectes cynotis)**. Ký sinh trùng này lây lan rất nhanh giữa các thú cưng trong nhà.\n\n"
                    . "⚡ **Phác đồ điều trị an toàn**:\n"
                    . "- Dùng dung dịch rửa tai thú y chuyên dụng (Oticlens, Epi-Otic) bóp vài giọt vào ống tai, xoa nhẹ gốc tai 30 giây rồi để bé lắc đầu văng chất bẩn ra, dùng gạc lau sạch.\n"
                    . "- Nhỏ thuốc đặc trị rận tai (như Dexoryl, Otimectin) hoặc dùng thuốc nhỏ gáy phổ rộng trị cả rận tai (như Revolution Plus / Advocate / Broadline).\n"
                    . "- Vệ sinh chăn đệm, phơi nắng ổ nằm của mèo.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **KHÔNG** dùng tăm bông chọc sâu vào trong lỗ tai mèo (sẽ đẩy rận và chất bẩn nén chặt vào màng nhĩ, nguy cơ thủng màng nhĩ).\n"
                    . "- **KHÔNG** dùng cồn y tế hay oxy già rửa tai (gây xót buốt và loét niêm mạc ống tai).",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Bé Miu',
                'tags'      => ['Sức khỏe', 'Mèo', 'Da liễu'],
                'content'   => 'Mèo bị rụng lông thành từng đốm tròn tròn ở tai và sống mũi, vùng da đó ửng đỏ, có vảy trắng mốc li ti như gàu. Hôm qua em cũng bị ngứa và nổi nốt tròn đỏ ở cánh tay! Em và mèo bị nhiễm nấm lây nhau đúng không bác sĩ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **TƯ VẤN TRỊ NẤM MÈO LÂY NGƯỜI — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguyên nhân**: Đây chính là bệnh **Nấm da mèo (Microsporum canis)**. Đây là bệnh da truyền nhiễm phổ biến nhất từ chó mèo sang người (Zoonosis), tạo thành các vệt hắc lào tròn ngứa trên da người.\n\n"
                    . "⚡ **Các bước xử lý cho bé mèo**:\n"
                    . "- Đeo loa chống liếm (vòng Elizabeth) cho mèo để bé không liếm thuốc.\n"
                    . "- Vệ sinh vùng nấm bằng cồn đỏ Povidine loãng hoặc xịt xịt nấm thú y chuyên dụng (như Fungikur, Alkin Mitecidine).\n"
                    . "- Tắm định kỳ tuần 1-2 lần bằng dầu tắm trị nấm chứa Ketoconazole hoặc Chlorhexidine.\n"
                    . "- Cho bé phơi nắng sớm 15-20 phút mỗi ngày và bổ sung vitamin tăng đề kháng da.\n\n"
                    . "⚡ **Đối với người nuôi**:\n"
                    . "- Rửa tay xà phòng sát khuẩn sau khi tiếp xúc với mèo.\n"
                    . "- Chỗ nổi nốt đỏ trên người bôi kem trị nấm (như Nizoral, Canesten hoặc Lamisil) ngày 2 lần trong 2 tuần.",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Milo Mèo',
                'tags'      => ['Cấp cứu', 'Mèo', 'Sơ cứu'],
                'content'   => 'Mèo nhà em bị ngã từ ban công tầng 3 xuống sân gạch. Hiện bé nằm im lìm một chỗ, miệng rỉ ít máu tươi, 2 chân sau không cử động được, thở ngắt quãng. Em nên bế bé lên thế nào để đưa đi bệnh viện mà không làm bé gãy xương thêm ạ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **QUY TRÌNH VẬN CHUYỂN CHẤN THƯƠNG RƠI CAO (HIGH-RISE SYNDROME) — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Rơi từ độ cao thường gây: Gãy xương hàm, vỡ vòm họng, tràn khí màng phổi, dập bàng quang/gan, gãy hoặc trật đốt sống lưng.\n\n"
                    . "⚡ **Quy trình di chuyển an toàn tuyệt đối**:\n"
                    . "1. **KHÔNG ĐƯỢC BẾ XỐC NÁCH HOẶC BỒNG NGỬA MÈO LÊN TAY** (sẽ làm đốt sống gãy chèn đứt tủy sống hoặc mảnh sườn đâm thủng phổi).\n"
                    . "2. Tìm một mặt phẳng cứng: Tấm ván gỗ, nắp thùng xốp, hoặc đáy thùng carton dày có lót khăn êm.\n"
                    . "3. Nhẹ nhàng trượt nhẹ toàn bộ cơ thể bé theo đường thẳng lên mặt phẳng cứng đó, giữ đầu và cột sống trên một trục thẳng cố định.\n"
                    . "4. Phủ chăn ấm lên người bé để chống sốc hạ thân nhiệt.\n"
                    . "5. Di chuyển nhẹ nhàng đến phòng cấp cứu có máy X-quang và siêu âm FAST ngay lập tức!",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Mun Mun',
                'tags'      => ['Cấp cứu', 'Mèo', 'Ngộ độc'],
                'content'   => 'Em vừa xịt thuốc diệt muỗi gián (loại bình xịt xịt phòng) trong nhà thì 15 phút sau bé mèo có biểu hiện co giật liên hồi, sùi bọt mép trắng xóa, đồng tử giãn to, 4 chân chèo bơi giật giật. Cứu bé với ạ!',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **CẤP CỨU NGỘ ĐỘC THUỐC DIỆT CÔN TRÙNG (PYRETHROID) — BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Các loại thuốc diệt côn trùng gia dụng thường chứa hợp chất **Permethrin / Pyrethroid**. Mèo cực kỳ mẫn cảm với chất này vì thiếu enzyme gan phân hủy, dẫn đến nhiễm độc thần kinh cấp tính gây co giật liên tục, tăng thân nhiệt ác tính và tử vong do kiệt sức cơ hoành.\n\n"
                    . "⚡ **Sơ cứu lập tức**:\n"
                    . "- Đưa bé ra ngay nơi thoáng khí, cách xa căn phòng vừa xịt thuốc.\n"
                    . "- Nếu lông dính thuốc: Dùng nước ấm và dầu gội/xà phòng dịu nhẹ tắm rửa nhanh để loại bỏ chất độc bám trên da lông, sau đó sấy khô ấm.\n"
                    . "- Đặt bé nằm nghiêng một bên trên đệm mềm, tránh để đầu gập làm nghẹt đường thở.\n"
                    . "- Đưa ngay đến phòng khám thú y để bác sĩ tiêm thuốc chống co giật (Diazepam/Midazolam) và giải độc mỡ mạch máu (Intralipid) kịp thời.\n\n"
                    . "🚫 **KHÔNG** cố nhét ngón tay hay que vào miệng mèo khi đang co giật (mèo không bị 'cắn lưỡi' như người, nhét đồ vào sẽ gãy răng hoặc làm tắc thở).",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Bé Mập',
                'tags'      => ['Sức khỏe', 'Mèo', 'Dinh dưỡng'],
                'content'   => 'Mèo nhà em 5kg hơi béo, em cho bé ăn kiêng nhịn đói hoàn toàn 3 ngày nay để giảm cân nhanh. Hôm nay bé bỗng nhiên vàng khè mắt, nướu răng và vành tai trong cũng chuyển màu vàng nghệ, lờ đờ không đứng vững. Bé bị viêm gan hay sao ạ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **CẢNH BÁO GAN NHIỄM MỠ TỐI NGUY HIỂM — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Đây là căn bệnh chết người: **Hội chứng Gan nhiễm mỡ do bỏ ăn (Hepatic Lipidosis)**! Khi mèo thừa cân bị bỏ đói đột ngột, mỡ dự trữ bị huy động ồ ạt về gan để chuyển hóa năng lượng, làm gan quá tải, ứ đọng lipid gây hoại tử tế bào gan và hoàng đảm (vàng da, vàng mắt).\n\n"
                    . "⚡ **Hành động cấp cứu**:\n"
                    . "- PHẢI ĐƯA ĐI CẤP CỨU NGAY: Bé cần được đặt ống thông dạ dày (Feeding Tube) để nuôi ăn cưỡng bức thức ăn giàu đạm vi sinh và truyền dịch hỗ trợ gan.\n\n"
                    . "🚫 **QUY TẮC BẤT DI BẤT DỊCH TRONG GIẢM CÂN CHO MÈO**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG BAO GIỜ ĐỂ MÈO BỊ NHỊN ĐÓI QUÁ 24-48 GIỜ**!\n"
                    . "- Giảm cân an toàn chỉ được giảm 1-2% trọng lượng cơ thể mỗi tuần bằng thức ăn giảm béo chuyên dụng, không bao giờ dùng biện pháp nhịn ăn cực đoan.",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Miu Trắng',
                'tags'      => ['Sức khỏe', 'Mèo', 'Nha khoa'],
                'content'   => 'Mèo già 9 tuổi nhà em gần đây mồm hôi nồng nặc, chảy dãi nhớt liên tục ướt đẫm cằm, mỗi lần cúi xuống gặm hạt là kêu \'chít\' một tiếng rồi giật bắn người bỏ chạy. Em vạch mồm ra xem thấy nướu đỏ lừ rướm máu quanh chân răng. Làm sao để bé ăn được bớt đau ạ?',
                'doctor'    => $drDung,
                'doctor_advice' => "🩺 **TƯ VẤN NHA KHOA THÚ Y — BS. NGUYỄN HOÀNG DŨNG**:\n\n"
                    . "⚠️ **Chẩn đoán**: Bé bị **Viêm loét miệng nướu mãn tính (Gingivostomatitis)** hoặc **Tiêu ngót cổ răng (FORL - Feline Odontoclastic Resorptive Lesions)**. Vết loét thần kinh ở cổ răng gây đau đớn khủng khiếp tương đương người bị sâu ăn vào tủy sống.\n\n"
                    . "⚡ **Chăm sóc hỗ trợ giảm đau tại nhà**:\n"
                    . "- Đổi toàn bộ hạt khô cứng sang thức ăn mềm mịn: Pate nhuyễn pha thêm nước ấm hoặc súp dinh dưỡng lỏng (Recovery Paste).\n"
                    . "- Dùng gạc mềm thấm gel xịt sát khuẩn nha khoa thú y (như Biotene / Stomaferin) bôi nhẹ nướu.\n\n"
                    . "⚡ **Điều trị triệt để**:\n"
                    . "- Đưa bé đi lấy cao răng dưới gây mê an toàn, chụp X-quang răng và nhổ bỏ các chân răng đã bị tiêu ngót hoại tử. Sau khi nhổ răng tổn thương, mèo già sẽ hết đau hoàn toàn và ăn uống ngon miệng trở lại!",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Miu Miu',
                'tags'      => ['Sức khỏe', 'Mèo', 'Tiêu hóa'],
                'content'   => 'Mèo Anh lông ngắn 3 tuổi nhà em 4 ngày nay không hề đi ị trong chậu cát. Bé rặn cong cả lưng, ưỡn mông nhưng chỉ ra vài giọt nước nhờn hôi. Bụng sờ thấy cục phân to cứng ngắc ở đoạn ruột dưới. Em có nên tự thụt hậu môn cho bé không?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **CẢNH BÁO TÁO BÓN MÃN TÍNH & PHÌNH ĐẠI TRÀNG — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Đây là Táo bón nặng có nguy cơ biến chứng thành Hội chứng Phình đại tràng (Megacolon). Khối phân đóng kết (Fecaloma) to cứng chèn ép gây thiếu máu cục bộ thành đại tràng, rách niêm mạc hoặc nhiễm độc phân hấp thu ngược vào máu.\n\n"
                    . "⚡ **Làm ngay tại nhà**:\n"
                    . "- Tăng cường uống nước: Cho bé uống nước hầm ức gà không gia vị, bổ sung men vi sinh và chất xơ hòa tan (bột bí đỏ luộc nhuyễn 1 thìa cafe trộn thức ăn).\n"
                    . "- Đưa bé đến phòng khám để bác sĩ chụp X-quang kiểm tra kích thước khối phân và thụt tháo dưới kiểm soát y khoa.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** dùng thuốc thụt Microlax của người (chứa muối Phosphate gây ngộ độc tăng Phốt pho máu và co giật ở mèo)!\n"
                    . "- **KHÔNG** dùng tay bóp ép bụng vì có thể làm bục thành ruột.",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Lucky',
                'tags'      => ['Cấp cứu', 'Mèo', 'Sơ cứu'],
                'content'   => 'Bé Lucky vừa nhảy lên bếp gas cản không kịp bị bỏng 4 đệm chân. Da đệm chân đỏ lột một mảng, bé đau giơ chân lên không dám chạm đất, run lẩy bẩy. Em nên bôi kem đánh răng hay dầu mỡ lên vết bỏng không ạ?',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **SƠ CỨU BỎNG NHIỆT KHẨN CẤP — BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Đệm bàn chân là nơi tập trung rất nhiều đầu mút dây thần kinh và tuyến mồ hôi của mèo. Bỏng độ 2-3 dễ gây nhiễm trùng hoại tử đệm chân khiến mèo tàn phế không đi lại được.\n\n"
                    . "⚡ **Quy trình sơ cứu chuẩn y khoa**:\n"
                    . "1. Đặt 4 chân bé dưới vòi nước máy mát chảy nhẹ (hoặc ngâm trong thau nước mát sạch) liên tục trong 10-15 phút để hạ nhiệt sâu mô da.\n"
                    . "2. Thấm khô nhẹ bằng gạc vô trùng, quấn gạc sạch lỏng tay để tránh mèo liếm vào vết bỏng.\n"
                    . "3. Mang bé đến cơ sở thú y để bôi kem kháng khuẩn chuyên dụng (Silver Sulfadiazine) và tiêm thuốc giảm đau an toàn.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** bôi kem đánh răng, nước mắm, mỡ trăn hay đá viên trực tiếp lên vết bỏng (gây bỏng lạnh sâu và nhiễm trùng uốn ván)!\n"
                    . "- **KHÔNG** tự ý bóc lớp da phồng rộp.",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Miu Con',
                'tags'      => ['Sức khỏe', 'Mèo', 'Ký sinh trùng'],
                'content'   => 'Sáng nay bé mèo 2 tháng tuổi nhà em vừa nôn ra một con giun màu trắng ngà dài khoảng 7cm ngoe nguẩy như sợi bún. Bụng bé to tròn ễnh ra như cái trống nhưng sườn thì gầy. Bác sĩ cho em hỏi bé bị nhiễm giun gì và tẩy thế nào an toàn?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **HƯỚNG DẪN TẨY GIUN AN TOÀN — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Chẩn đoán**: Bé bị nhiễm nặng **Giun đũa mèo (Toxocara cati)**. Bụng phình to tròn (Potbelly) kèm nôn ra giun sống chứng tỏ số lượng giun trong ruột non đã quá tải tràn lên dạ dày, có nguy cơ gây tắc ruột hoặc giun chui ống mật.\n\n"
                    . "⚡ **Quy trình tẩy giun đúng cách**:\n"
                    . "- Cho bé uống thuốc tẩy giun chuyên dụng cho mèo con (như Drontal Cat, Milbemax, Bio Rantel) theo đúng cân nặng (thường 1/2 viên cho mèo 1kg).\n"
                    . "- Uống vào buổi sáng trước khi ăn 30 phút.\n"
                    . "- Tiêm nhắc lại mũi tẩy giun sau đúng 14 ngày để diệt ấu trùng non mới nở.\n\n"
                    . "🚫 **LƯU Ý QUAN TRỌNG**:\n"
                    . "- Nếu bé đang sốt cao hoặc tiêu chảy ra máu, KHÔNG tẩy giun ngay mà phải điều trị đường ruột ổn định trước.\n"
                    . "- Vệ sinh sạch chậu cát và phân hàng ngày vì trứng giun đũa có thể lây sang người qua đường tiêu hóa.",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Su Su',
                'tags'      => ['Cấp cứu', 'Mèo', 'Ngộ độc'],
                'content'   => 'Em thấy mèo bị ngứa da nên lấy tinh dầu tràm trà (Tea tree oil) pha loãng bôi lên lưng và cổ cho bé. Nửa tiếng sau bé bắt đầu đi loạng choạng như say rượu, chân sau yếu không đứng vững, run cơ giật giật cơ thể, hạ thân nhiệt. Tinh dầu tràm trà có độc với mèo không ạ?',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **CẤP CỨU NGỘ ĐỘC TINH DẦU THỰC VẬT — BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Cảnh báo cực kỳ nghiêm trọng**: **TINH DẦU TRÀM TRÀ (TEA TREE OIL) LÀ CHẤT CỰC ĐỘC VỚI MÈO!** Thành phần Terpene trong tinh dầu hấp thu cực nhanh qua da mèo vào máu, gây ức chế thần kinh trung ương, hạ thân nhiệt, liệt cơ và suy gan cấp tính.\n\n"
                    . "⚡ **Sơ cứu giải độc khẩn cấp**:\n"
                    . "- Dùng xà phòng/dầu tắm thú y và nước ấm rửa trôi sạch sẽ vùng lông vừa bôi tinh dầu để ngăn da tiếp tục ngấm độc tố.\n"
                    . "- Sấy khô và quấn khăn ấm giữ nhiệt cho bé (ngộ độc tràm trà thường làm thân nhiệt tụt xuống dưới 37°C gây trụy mạch).\n"
                    . "- Đưa bé đi bệnh viện thú y ngay để truyền dịch giải độc và hỗ trợ chức năng gan thận.\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG BAO GIỜ** dùng tinh dầu tràm, khuynh diệp, bạc hà, quế để trị rận hoặc xịt phòng cho mèo!",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Bông Gòn',
                'tags'      => ['Sức khỏe', 'Mèo', 'Sinh sản'],
                'content'   => 'Mèo mẹ vừa đẻ 4 bé được 5 ngày. Hôm nay em thấy một bên vú của mèo mẹ căng cứng sưng đỏ, nóng ran, rỉ mủ vàng xanh hôi tanh. Mèo mẹ đau không cho con bú, sốt 40 độ lừ đừ. Có phải mèo mẹ bị viêm vú không ạ? Mèo con có bú được bên vú khác không?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **TƯ VẤN VIÊM TUYẾN VÚ SAU SINH (MASTITIS) — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Nguy cơ tiềm ẩn**: Mèo mẹ bị **Viêm tuyến vú cấp tính mưng mủ**. Sữa từ tuyến vú nhiễm khuẩn chứa đầy độc tố vi khuẩn (Staphylococcus/Streptococcus), nếu mèo con bú phải sẽ bị ngộ độc chết yểu sau 24 giờ (Hội chứng sữa độc - Toxic Milk Syndrome).\n\n"
                    . "⚡ **Hành động ngay**:\n"
                    . "- **CÁCH LY MÈO CON KHỎI BÊN VÚ BỊ VIÊM**: Dán băng gạc che đầu ti bị viêm hoặc mặc áo y tế cho mèo mẹ để đàn con không bú vào bên vú mưng mủ.\n"
                    . "- Chườm ấm nhẹ nhàng lên bên vú sưng 10 phút, rồi dùng gạc nặn nhẹ bỏ dịch mủ ra ngoài.\n"
                    . "- Đưa mèo mẹ đi bác sĩ tiêm kháng sinh an toàn cho con bú và thuốc giảm đau hạ sốt.\n"
                    . "- Hỗ trợ đút thêm sữa bột công thức cho đàn mèo con nếu sữa mẹ không đủ.",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Simba',
                'tags'      => ['Cấp cứu', 'Mèo', 'Nội khoa'],
                'content'   => 'Bé Simba 4 tuổi tự dưng không chịu nằm duỗi mà ngồi thu lu một chỗ gập bụng sát đất, đầu chúi về phía trước (tư thế như đang quỳ lạy cầu nguyện). Mỗi lần chạm vào bụng là gầm gừ quào cấu đau đớn, nôn khan liên tục. Bác sĩ cho em hỏi bé bị đau gì ạ?',
                'doctor'    => $drDung,
                'doctor_advice' => "🩺 **TƯ VẤN CẤP CỨU VIÊM TỤY CẤP — BS. NGUYỄN HOÀNG DŨNG**:\n\n"
                    . "⚠️ **Chẩn đoán**: Tư thế 'cầu nguyện' (Prayer position) ở mèo kết hợp đau quặn bụng trên và nôn khan là triệu chứng kinh điển của **Viêm tụy cấp tính (Acute Pancreatitis)**. Men tụy tự tiêu hủy mô tụy gây đau đớn dữ dội, tụt huyết áp và nguy cơ hoại tử tụy lan tỏa.\n\n"
                    . "⚡ **Hành động khẩn cấp**:\n"
                    . "- Không ấn hay sờ nắn mạnh vào vùng bụng trên của bé.\n"
                    . "- Cho bé nhịn ăn hạt hoàn toàn trong 12 giờ đầu.\n"
                    . "- Đưa bé đi phòng khám cấp cứu ngay để làm xét nghiệm fPLI (Feline Pancreatic Lipase Immunoreactivity) xác định viêm tụy và truyền dịch kiểm soát đau bằng thuốc giảm đau chuyên dụng (Buprenorphine).\n\n"
                    . "🚫 **KHÔNG** cho uống dầu ăn hay men tiêu hóa tự chế tại nhà.",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Kem',
                'tags'      => ['Sức khỏe', 'Mèo', 'Nội tiết'],
                'content'   => 'Mèo ta 7 tuổi nhà em khoảng 1 tháng nay uống nước nhiều khủng khiếp, ngày uống hết cả bát nước to, chậu cát lúc nào cũng ngập tràn nước tiểu vón cục. Bé ăn khỏe gấp đôi bình thường nhưng cơ thể lại gầy rộc đi, 2 chân sau khi đi có vẻ khuỳnh khuỳnh chạm cả khuỷu chân xuống đất. Đây là bệnh gì vậy ạ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **TƯ VẤN ĐÁI THÁO ĐƯỜNG Ở MÈO — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Chẩn đoán**: Tam chứng 'Ăn nhiều - Uống nhiều - Tiểu nhiều nhưng sụt cân' (Polyphagia, Polydipsia, Polyuria) cùng dáng đi gập gối khuỷu chân sau (Neuropathy hạ bàn chân) là dấu hiệu 95% của **Bệnh Tiểu đường ở mèo (Feline Diabetes Mellitus)**.\n\n"
                    . "⚡ **Hướng dẫn chẩn đoán và điều trị**:\n"
                    . "- Cần đưa bé đi xét nghiệm đường huyết (Glucose máu) và Fructosamine máu để khẳng định chẩn đoán.\n"
                    . "- Đa số mèo tiểu đường nếu được tiêm Insulin thú y định kỳ kết hợp chế độ ăn giàu đạm, cực thấp Carbohydrate (Pate chuyên dụng Diabetic) có thể đạt được trạng thái Thuyên giảm hoàn toàn (Diabetic Remission) và không cần phụ thuộc Insulin sau này!\n\n"
                    . "🚫 **KHÔNG ĐƯỢC LÀM**:\n"
                    . "- **TUYỆT ĐỐI KHÔNG** tự ý cho mèo uống thuốc hạ đường huyết dạng viên của người (gây tụt đường huyết đột ngột co giật tử vong).",
            ],
            [
                'author'    => $user2,
                'pet_name'  => 'Nhím',
                'tags'      => ['Sơ cứu', 'Mèo', 'Chấn thương'],
                'content'   => 'Bé Nhím nhảy chơi kẹp móng vào khe cửa bị giật bật đứt cả gốc móng chân trước, máu tươi bắn ra lênh láng không ngừng. Bé giãy giụa kêu la rất đau. Em đã lấy bông gòn ấn giữ nhưng buông ra máu lại chảy tiếp. Em phải cầm máu thế nào nhanh nhất ạ?',
                'doctor'    => $drBao,
                'doctor_advice' => "🩺 **SƠ CỨU CẦM MÁU BẬT MÓNG KHẨN CẤP — BS. TRẦN QUỐC BẢO**:\n\n"
                    . "⚠️ **Đặc điểm**: Móng chân mèo có tủy móng (Quick) chứa mạch máu và dây thần kinh lớn. Khi bị đứt gốc móng, mạch máu co lại kém nên máu chảy rất nhiều và cực kỳ đau xót.\n\n"
                    . "⚡ **Mẹo cầm máu tức thì tại nhà bằng nguyên liệu sẵn có**:\n"
                    . "1. Nếu không có bột cầm máu thú y (Kwik Stop): Lấy ngay **Bột bắp (Bột ngô) hoặc Bột mì tinh sạch**, ấn chặt một nhúm bột trực tiếp vào đầu móng đang chảy máu trong 2-3 phút. Bột sẽ tương tác với huyết tương tạo thành nút chặn cầm máu lập tức!\n"
                    . "2. Có thể áp một gói trà túi lọc ấm (đã vắt ráo) vào đầu móng: Chất Tanin trong trà có tác dụng co mạch và cầm máu rất nhạy.\n"
                    . "3. Sau khi máu ngừng chảy, băng nhẹ bằng gạc sạch, đeo loa chống liếm và đưa đi sát trùng tránh viêm tủy xương móng.\n\n"
                    . "🚫 **KHÔNG** dùng cồn 90 độ hay oxy già xịt thẳng vào tủy móng hở (gây xót kinh hoàng làm mèo cắn người sơ cứu).",
            ],
            [
                'author'    => $user3,
                'pet_name'  => 'Mun Đen',
                'tags'      => ['Sức khỏe', 'Mèo', 'Hô hấp'],
                'content'   => 'Bé Mun nhà em thỉnh thoảng đang nằm bỗng nhiên ngồi bẹp xuống, duỗi dài cổ sát sàn nhà rồi ho sù sụ từng cơn như cố khạc thứ gì trong cổ họng ra. Mỗi cơn ho kéo dài 1-2 phút, sau đó bé lại bình thường. Đây có phải ho do khạc búi lông hay hen suyễn vậy ạ?',
                'doctor'    => $drMai,
                'doctor_advice' => "🩺 **PHÂN BIỆT KHẠC BÚI LÔNG VÀ HEN SUYỄN MÈO — BS. PHẠM THỊ MAI**:\n\n"
                    . "⚠️ **Phân biệt lâm sàng quan trọng**:\n"
                    . "- **Khạc búi lông (Hairball)**: Mèo gập bụng co thắt từng đợt cơ hoành và sau đó KHẠC RA một búi lông hình trụ lẫn dịch dạ dày.\n"
                    . "- **Hen suyễn mèo (Feline Asthma)**: Mèo vươn dài cổ sát sàn, ho khan dạng tiếng rít 'khục... khục... khẹt', ngực phập phồng nhưng HO XONG KHÔNG RA BẤT KỲ THỨ GÌ. Đây là bệnh co thắt phế quản dị ứng mãn tính!\n\n"
                    . "⚡ **Chăm sóc và phòng ngừa**:\n"
                    . "- Nếu do búi lông: Cho ăn gel tiêu búi lông (Hairball paste) tuần 2 lần kết hợp chải lông rụng mỗi ngày.\n"
                    . "- Nếu do hen suyễn: Cần đưa đi chụp X-quang phổi (hình ảnh 'bánh quy hình nhẫn' phế quản). Tránh tuyệt đối khói thuốc lá, nhang muỗi, tinh dầu xông và cát vệ sinh có nhiều bụi mịn trong nhà!\n\n"
                    . "🚨 **Cấp cứu**: Nếu cơn ho kèm tím tái niêm mạc miệng, cần đưa vào phòng khám để hít khí dung giãn phế quản cấp cứu.",
            ],
            [
                'author'    => $user1,
                'pet_name'  => 'Miu Mướp',
                'tags'      => ['Sức khỏe', 'Mèo', 'Mắt'],
                'content'   => 'Mắt trái của mèo nhà em sáng nay bị lồi ra một màng màu trắng đục che phủ gần hết nửa tròng mắt, mắt kèm nhèm chảy nước mắt liên tục. Em nhìn tưởng bé bị mù mắt một bên. Màng trắng này là gì và có tự lặn được không thưa bác sĩ?',
                'doctor'    => $drDung,
                'doctor_advice' => "🩺 **TƯ VẤN HIỆN TƯỢNG NHÔ MÍ MẮT THỨ BA (THIRD EYELID PROTRUSION) — BS. NGUYỄN HOÀNG DŨNG**:\n\n"
                    . "⚠️ **Bản chất**: Màng trắng đục đó chính là **Mí mắt thứ ba (Màng mí trong / Nictitating Membrane)** của loài mèo, có chức năng bảo vệ và làm ẩm nhãn cầu. Khi mèo hoàn toàn khỏe mạnh, màng này giấu kín ở khóe mắt trong.\n\n"
                    . "⚡ **Nguyên nhân mí thứ ba bị nhô ra**:\n"
                    . "1. Mèo đang bị mất nước, sốt cao hoặc kiệt sức (mô mỡ quanh hốc mắt teo lại làm nhãn cầu thụt sâu, đẩy mí thứ 3 trồi lên).\n"
                    . "2. Kích ứng dị vật, xước loét giác mạc do mèo cào nhau.\n"
                    . "3. Hội chứng Haw (nhiễm giun sán hoặc viêm ruột nhẹ kích thích dây thần kinh mắt).\n\n"
                    . "⚡ **Xử lý an toàn**:\n"
                    . "- Nhỏ nước mắt nhân tạo hoặc nước muối sinh lý NaCl 0.9% rửa mắt êm dịu.\n"
                    . "- Đưa bé đi khám để soi đèn kiểm tra giác mạc có bị vết loét hay không trước khi nhỏ bất kỳ loại thuốc đặc trị nào!",
            ],
        ];

        $postCount = 0;
        foreach ($cases as $index => $c) {
            // Check if post with same title snippet already exists (idempotency)
            $existingPost = Post::where('content', 'like', mb_substr($c['content'], 0, 40) . '%')->first();
            if ($existingPost) {
                continue;
            }

            $post = Post::create([
                'user_id'       => $c['author']->id,
                'content'       => $c['content'],
                'pet_name'      => $c['pet_name'],
                'tags'          => $c['tags'],
                'ai_mod_status' => 'approved',
                'likes_count'   => rand(5, 38),
                'created_at'    => now()->subDays(rand(1, 14))->subHours(rand(1, 23)),
            ]);

            // Add Pinned Doctor Advice comment
            Comment::create([
                'post_id'    => $post->id,
                'user_id'    => $c['doctor']->id,
                'content'    => $c['doctor_advice'],
                'created_at' => $post->created_at->addMinutes(rand(10, 45)),
            ]);

            // Add an owner thankful reply
            Comment::create([
                'post_id'    => $post->id,
                'user_id'    => $c['author']->id,
                'content'    => 'Dạ em cảm ơn bác sĩ nhiều lắm ạ! May quá em đọc kịp tư vấn của bác sĩ, em đang đưa bé đi cấp cứu ngay đây ạ.',
                'created_at' => $post->created_at->addMinutes(rand(50, 90)),
            ]);

            $postCount++;
        }

        $this->command?->info("CatHealthForumSeeder completed: seeded {$postCount} sick cat clinical cases.");
    }
}
