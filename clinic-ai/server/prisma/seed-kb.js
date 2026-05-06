/**
 * Seed script: tạo toàn bộ tài liệu Knowledge Base cho chatbot tiền khám.
 * Dùng MockEmbeddingProvider – không cần Ollama hay internet.
 *
 * Chạy: node prisma/seed-kb.js
 * hoặc:  npm run prisma:seed-kb
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Mock embedding (giống mockEmbedding.provider.js) ───────────────────────
const MOCK_DIMS = 768;

function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

function normalizeVector(v) {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / mag);
}

function textToMockVector(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const vector = new Array(MOCK_DIMS).fill(0);
  for (const word of words) {
    const h = simpleHash(word);
    const idx = h % MOCK_DIMS;
    vector[idx] += 1;
  }
  return normalizeVector(vector);
}

// ─── Chunker (giống chunking.js) ────────────────────────────────────────────
function chunkText(text, { chunkSize = 800, overlap = 120 } = {}) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const safeChunkSize = Math.max(100, Math.min(chunkSize, 4000));
  const safeOverlap = Math.max(0, Math.min(overlap, safeChunkSize - 1));
  const step = Math.max(1, safeChunkSize - safeOverlap);
  const chunks = [];
  let index = 0;

  while (index < normalized.length) {
    const startOffset = index;
    const endOffset = Math.min(index + safeChunkSize, normalized.length);
    const content = normalized.slice(startOffset, endOffset).trim();
    if (content) {
      chunks.push({ chunkIndex: chunks.length, content, startOffset, endOffset });
    }
    if (endOffset >= normalized.length) break;
    index += step;
  }
  return chunks;
}

// ─── Tài liệu KB ─────────────────────────────────────────────────────────────
const KB_DOCUMENTS = [
  {
    title: "Hướng dẫn đặt lịch khám tại ClinicAI",
    type: "TEXT",
    content: `# Hướng dẫn đặt lịch khám tại ClinicAI

## Các bước đặt lịch khám

Để đặt lịch khám tại ClinicAI, bạn thực hiện theo các bước sau:

1. Đăng nhập vào tài khoản bệnh nhân tại website hoặc ứng dụng ClinicAI.
2. Chọn mục "Đặt lịch khám" trên thanh điều hướng.
3. Chọn chuyên khoa hoặc dịch vụ khám mà bạn cần.
4. Chọn bác sĩ phù hợp từ danh sách bác sĩ có lịch trống.
5. Chọn ngày và khung giờ phù hợp.
6. Xác nhận thông tin đặt lịch và nhấn "Xác nhận đặt khám".
7. Hệ thống sẽ gửi thông báo xác nhận qua email hoặc SMS.

## Yêu cầu để đặt lịch

- Bạn cần có tài khoản và đăng nhập vào hệ thống.
- Chọn đúng dịch vụ và bác sĩ mà bạn muốn khám.
- Đặt lịch ít nhất 2 giờ trước giờ khám để đảm bảo bác sĩ có thể chuẩn bị.

## Xác nhận lịch khám

Sau khi đặt lịch thành công, trạng thái lịch khám sẽ là "PENDING" (Chờ xác nhận). Bác sĩ hoặc admin phòng khám sẽ xác nhận lịch và chuyển sang trạng thái "CONFIRMED". Bạn sẽ nhận được thông báo khi lịch được xác nhận.

## Đặt lịch cho dịch vụ gì?

ClinicAI hiện cung cấp các dịch vụ khám: khám tổng quát, khám chuyên khoa (Tim mạch, Nội tiết, Tiêu hóa, Thần kinh, Da liễu, Mắt, Tai Mũi Họng, v.v.), tư vấn sức khỏe, xét nghiệm cơ bản, và chụp chiếu.

## Thời gian khám

Mỗi ca khám thông thường kéo dài từ 15 đến 60 phút tùy theo loại dịch vụ. Thông tin thời gian cụ thể sẽ hiển thị khi bạn chọn dịch vụ.
`,
  },
  {
    title: "Hủy lịch và đổi lịch khám",
    type: "TEXT",
    content: `# Hủy lịch và đổi lịch khám

## Hủy lịch khám

Bạn có thể hủy lịch khám đã đặt nếu không thể đến đúng giờ. Để hủy lịch:

1. Vào mục "Lịch sử đặt khám" trong tài khoản của bạn.
2. Tìm lịch khám cần hủy.
3. Nhấn vào nút "Hủy lịch".
4. Xác nhận hủy.

**Lưu ý quan trọng:** Bạn chỉ có thể hủy lịch khám ít nhất 2 giờ trước giờ khám đã đặt. Nếu đã quá thời hạn hoặc lịch khám đang ở trạng thái "DONE" (Đã khám), bạn không thể hủy.

## Đổi lịch khám (Reschedule)

Nếu bạn muốn thay đổi thời gian khám:

1. Vào mục "Lịch sử đặt khám".
2. Chọn lịch khám muốn thay đổi.
3. Nhấn "Đổi lịch".
4. Chọn ngày và giờ mới phù hợp.
5. Xác nhận thay đổi.

Tương tự hủy lịch, bạn cần đổi lịch ít nhất 2 giờ trước giờ khám.

## Trạng thái lịch khám

- **PENDING**: Chờ xác nhận từ phòng khám.
- **CONFIRMED**: Đã được xác nhận, bạn cần đến đúng giờ.
- **DONE**: Đã khám xong.
- **CANCELED**: Đã hủy.

Lịch ở trạng thái DONE hoặc CANCELED không thể thay đổi.
`,
  },
  {
    title: "Chuẩn bị trước khi đến khám",
    type: "TEXT",
    content: `# Chuẩn bị trước khi đến khám

## Giấy tờ cần mang theo

Khi đến khám, bạn nên mang theo:
- Căn cước công dân hoặc hộ chiếu để xác minh danh tính.
- Thẻ BHYT (Bảo hiểm y tế) nếu có để được hưởng chính sách bảo hiểm.
- Kết quả xét nghiệm, phim chụp, hồ sơ bệnh cũ liên quan đến tình trạng sức khỏe hiện tại.
- Danh sách thuốc đang sử dụng (nếu có).

## Chuẩn bị sức khỏe

- **Nhịn ăn**: Một số xét nghiệm máu (đường huyết, mỡ máu, chức năng gan thận) yêu cầu nhịn ăn ít nhất 8 tiếng trước khi lấy mẫu. Hỏi bác sĩ hoặc phòng khám trước để biết chắc.
- **Không sử dụng chất kích thích**: Tránh cà phê, rượu bia, thuốc lá ít nhất 24 giờ trước khi khám.
- **Thuốc đang dùng**: Thông báo cho bác sĩ tất cả các loại thuốc, thực phẩm chức năng, vitamin đang sử dụng.
- **Đến đúng giờ hoặc sớm hơn**: Nên đến trước giờ khám 10–15 phút để hoàn tất thủ tục lễ tân.

## Điền thông tin tiền khám

Trước buổi khám, hệ thống có thể yêu cầu bạn điền các thông tin sức khỏe cơ bản như:
- Triệu chứng hiện tại và thời gian xuất hiện.
- Tiền sử bệnh lý bản thân và gia đình.
- Tiền sử dị ứng (thuốc, thực phẩm, môi trường).
- Lý do chính muốn gặp bác sĩ.

Thông tin này giúp bác sĩ chuẩn bị tốt hơn và tiết kiệm thời gian khám.

## Câu hỏi nên hỏi bác sĩ

Chuẩn bị sẵn danh sách câu hỏi để không bỏ sót:
- Chẩn đoán bệnh là gì?
- Cần làm thêm xét nghiệm hay chụp chiếu gì?
- Phác đồ điều trị như thế nào?
- Cần theo dõi những triệu chứng nào?
- Khi nào cần tái khám?
`,
  },
  {
    title: "Các dịch vụ khám và chuyên khoa tại ClinicAI",
    type: "TEXT",
    content: `# Các dịch vụ khám và chuyên khoa tại ClinicAI

## Khám tổng quát

Dịch vụ khám tổng quát giúp đánh giá tổng thể tình trạng sức khỏe. Bao gồm: đo huyết áp, nhịp tim, cân nặng, chiều cao, kiểm tra các cơ quan nội tạng cơ bản. Phù hợp cho người khám sức khỏe định kỳ hoặc chưa biết chọn chuyên khoa nào.

## Tim mạch

Khám và tư vấn các bệnh về tim, mạch máu như: tăng huyết áp, thiếu máu cơ tim, rối loạn nhịp tim, suy tim. Kết hợp điện tâm đồ (ECG) và siêu âm tim nếu cần.

## Nội tiết – Đái tháo đường

Khám và điều trị các rối loạn nội tiết: đái tháo đường type 1 và type 2, bệnh tuyến giáp (cường giáp, suy giáp), loãng xương, béo phì do nội tiết.

## Tiêu hóa

Các bệnh về dạ dày, ruột, gan mật, tụy: viêm loét dạ dày, trào ngược axit, hội chứng ruột kích thích, viêm gan, sỏi mật.

## Thần kinh

Khám đau đầu, đau nửa đầu (migraine), chóng mặt, mất ngủ, đột quỵ không điển hình, các bệnh thần kinh ngoại biên.

## Da liễu

Các bệnh về da: mụn, viêm da cơ địa, vảy nến, nấm da, bệnh da do miễn dịch, kiểm tra nốt ruồi và tổn thương da nghi ngờ.

## Mắt

Khám thị lực, khúc xạ, kiểm tra áp lực nội nhãn, khám đáy mắt. Tư vấn đeo kính, kính áp tròng.

## Tai – Mũi – Họng (TMH)

Viêm mũi dị ứng, viêm xoang, viêm họng, viêm amidan, ù tai, nghe kém, polyp mũi.

## Cơ xương khớp

Đau lưng, đau cổ, thoái hóa khớp, viêm khớp, gout, loãng xương, chấn thương cơ xương khớp.

## Hô hấp

Hen suyễn, viêm phổi, viêm phế quản, COPD, khó thở, ho kéo dài.

## Thời gian và giá dịch vụ

Thời gian và giá cụ thể của từng dịch vụ hiển thị trực tiếp khi bạn chọn dịch vụ trong hệ thống đặt lịch. Bạn có thể xem thông tin bác sĩ, chuyên khoa và lịch trống trước khi xác nhận đặt.
`,
  },
  {
    title: "Thông tin bác sĩ và cách chọn bác sĩ phù hợp",
    type: "TEXT",
    content: `# Thông tin bác sĩ và cách chọn bác sĩ phù hợp

## Xem thông tin bác sĩ

Trong hệ thống ClinicAI, mỗi bác sĩ có trang hồ sơ riêng thể hiện:
- Họ tên và ảnh đại diện.
- Chuyên khoa chính.
- Tiểu sử và kinh nghiệm (Bio).
- Các dịch vụ mà bác sĩ cung cấp.
- Lịch khám trống theo ngày và giờ.
- Số điện thoại liên hệ (khi cần).

## Cách chọn bác sĩ phù hợp

1. **Theo chuyên khoa**: Chọn chuyên khoa phù hợp với triệu chứng của bạn, sau đó xem danh sách bác sĩ thuộc chuyên khoa đó.
2. **Theo dịch vụ**: Chọn dịch vụ bạn cần (ví dụ: siêu âm bụng, khám mắt), hệ thống sẽ gợi ý bác sĩ phù hợp.
3. **Theo lịch trống**: Nếu bạn cần khám gấp, lọc bác sĩ theo lịch trống gần nhất.

## Tôi chưa biết cần khám chuyên khoa gì?

Nếu chưa xác định được chuyên khoa, bạn nên:
- Đặt lịch khám tổng quát trước để bác sĩ đánh giá và chuyển khoa phù hợp.
- Hoặc mô tả triệu chứng cho chatbot tiền khám để được gợi ý dịch vụ.

## Bác sĩ có thể từ chối xác nhận lịch không?

Trong một số trường hợp bác sĩ hoặc admin phòng khám có thể điều chỉnh hoặc từ chối lịch nếu:
- Khung giờ bị trùng lặp do lỗi hệ thống.
- Bác sĩ cần nghỉ đột xuất.
- Trường hợp này bạn sẽ được thông báo sớm nhất để đổi lịch.
`,
  },
  {
    title: "Thanh toán và bảo hiểm y tế",
    type: "TEXT",
    content: `# Thanh toán và bảo hiểm y tế

## Hình thức thanh toán

ClinicAI hỗ trợ các hình thức thanh toán sau:
- **Tiền mặt** tại quầy lễ tân khi đến khám.
- **Chuyển khoản ngân hàng** theo thông tin trên hóa đơn.
- **Thanh toán qua ứng dụng** (cập nhật theo chính sách phòng khám).

## Bảo hiểm y tế (BHYT)

Để sử dụng bảo hiểm y tế tại ClinicAI:
- Mang theo thẻ BHYT còn hạn khi đến khám.
- Thông báo sử dụng BHYT ngay khi đăng ký tại quầy lễ tân.
- Các dịch vụ được BHYT thanh toán tùy theo quy định hiện hành của Bộ Y tế.
- Một số dịch vụ chuyên sâu hoặc kỹ thuật cao có thể không được BHYT chi trả hoặc chỉ được thanh toán một phần.

## Hóa đơn và chi phí

Chi phí khám được niêm yết công khai trên hệ thống khi bạn chọn dịch vụ. Sau khi khám, bạn sẽ nhận hóa đơn chi tiết bao gồm:
- Phí khám tư vấn.
- Phí xét nghiệm (nếu có).
- Phí thủ thuật hoặc kỹ thuật (nếu có).
- Phí thuốc (nếu có).

## Câu hỏi về chi phí

Nếu bạn muốn biết chi phí dự kiến trước khi khám, liên hệ trực tiếp phòng khám qua số điện thoại hoặc email hỗ trợ được hiển thị trên website.
`,
  },
  {
    title: "Quy trình khám khi đến phòng khám",
    type: "TEXT",
    content: `# Quy trình khi đến phòng khám ClinicAI

## Bước 1: Đăng ký lễ tân

Khi đến phòng khám, bạn đến quầy lễ tân để đăng ký. Nhân viên sẽ:
- Xác minh danh tính theo CCCD hoặc hộ chiếu.
- Kiểm tra mã lịch khám đã đặt trên hệ thống.
- Hỏi về thẻ BHYT nếu bạn muốn sử dụng.
- Yêu cầu bạn ngồi chờ tại khu vực chờ khám.

## Bước 2: Đo sinh hiệu (nếu có)

Trước khi gặp bác sĩ, y tá hoặc điều dưỡng sẽ đo:
- Huyết áp và nhịp tim.
- Cân nặng và chiều cao.
- Nhiệt độ cơ thể.
- Đánh giá sơ bộ tình trạng ban đầu.

## Bước 3: Khám với bác sĩ

Bạn vào phòng khám gặp bác sĩ đã đặt lịch. Bác sĩ sẽ:
- Hỏi về lý do đến khám và triệu chứng chi tiết.
- Xem xét hồ sơ sức khỏe và thông tin tiền khám bạn đã điền.
- Thăm khám lâm sàng (nghe tim phổi, sờ nắn bụng, v.v.).
- Chỉ định thêm xét nghiệm, chụp chiếu nếu cần.

## Bước 4: Xét nghiệm và chẩn đoán hình ảnh (nếu có)

Nếu bác sĩ yêu cầu xét nghiệm:
- Bạn được hướng dẫn đến bộ phận xét nghiệm hoặc chẩn đoán hình ảnh trong cùng phòng khám.
- Kết quả thường có trong ngày hoặc hẹn lấy kết quả sau.

## Bước 5: Kết luận và điều trị

Sau khi có đủ dữ liệu, bác sĩ sẽ:
- Đưa ra chẩn đoán.
- Kê đơn thuốc hoặc chỉ định điều trị.
- Hướng dẫn theo dõi tại nhà.
- Hẹn tái khám nếu cần.

## Bước 6: Thanh toán và lấy thuốc

Sau khi khám xong:
- Đến quầy lễ tân để thanh toán viện phí.
- Mang đơn thuốc đến nhà thuốc trong hoặc gần phòng khám.
`,
  },
  {
    title: "Câu hỏi thường gặp (FAQ) về sức khỏe và khám bệnh",
    type: "TEXT",
    content: `# Câu hỏi thường gặp (FAQ)

## Tôi có triệu chứng ho kéo dài, nên khám chuyên khoa nào?

Ho kéo dài trên 2 tuần nên được khám bởi bác sĩ Hô hấp. Nếu kèm theo sốt, khó thở, hoặc đau ngực, bạn cần đến phòng khám sớm. Ho có thể do viêm phế quản mãn, hen suyễn, trào ngược dạ dày, hoặc các nguyên nhân khác cần được bác sĩ đánh giá.

## Đau đầu thường xuyên, tôi nên làm gì?

Đau đầu kéo dài hoặc tái phát nên được khám chuyên khoa Thần kinh. Trước đó, ghi chú lại: tần suất, mức độ (1–10), vị trí đau, hoàn cảnh xuất hiện. Nếu đau đầu đột ngột rất dữ dội (như "sét đánh"), kèm nôn ói, cứng cổ hoặc lơ mơ, đây là dấu hiệu nguy hiểm cần đến cấp cứu ngay.

## Huyết áp cao bao nhiêu là cần đi khám?

Huyết áp bình thường dưới 120/80 mmHg. Nếu đo nhiều lần liên tục trên 140/90 mmHg, bạn nên đến khám Tim mạch hoặc khám tổng quát để được đánh giá và tư vấn điều trị.

## Đau bụng, tôi cần khám gì?

Tùy vị trí:
- Đau thượng vị (vùng trên rốn): khám Tiêu hóa (dạ dày, thực quản).
- Đau quanh rốn hoặc hạ vị: có thể ruột thừa, ruột, hoặc phụ khoa.
- Đau hạ sườn phải: có thể liên quan gan, mật.
- Đau dữ dội đột ngột kèm sốt, cứng bụng: cần cấp cứu ngay.

## Tôi bị tiểu đường type 2, cần theo dõi những gì?

Bệnh nhân tiểu đường type 2 cần:
- Kiểm tra đường huyết định kỳ (HbA1c mỗi 3 tháng).
- Khám Nội tiết định kỳ 3–6 tháng/lần.
- Kiểm tra huyết áp, mỡ máu, chức năng thận.
- Khám mắt (đáy mắt) hàng năm để phát hiện biến chứng.
- Khám bàn chân để phát hiện biến chứng thần kinh ngoại biên.

## Tôi cần khám sức khỏe định kỳ bao lâu một lần?

- Người trưởng thành khỏe mạnh: 1 lần/năm.
- Người có bệnh nền mãn tính (tiểu đường, huyết áp): 3–6 tháng/lần theo hướng dẫn của bác sĩ.
- Phụ nữ: thêm khám phụ khoa và tầm soát ung thư cổ tử cung hàng năm.
- Người trên 50 tuổi: thêm nội soi dạ dày-đại tràng, kiểm tra mật độ xương.

## Làm sao để biết kết quả xét nghiệm của tôi?

Sau khi làm xét nghiệm, kết quả có thể được:
- Nhận trực tiếp tại phòng khám theo hẹn.
- Nhận qua email nếu phòng khám có hệ thống gửi kết quả điện tử.
- Xem trong hồ sơ điện tử trên hệ thống ClinicAI (tính năng đang phát triển).

## Tôi có thể nhờ người thân đặt lịch giúp không?

Hiện tại hệ thống yêu cầu bệnh nhân đặt lịch bằng tài khoản của chính mình để đảm bảo thông tin chính xác. Nếu bạn cần hỗ trợ, liên hệ hotline phòng khám để được hỗ trợ đặt lịch qua điện thoại.
`,
  },
  {
    title: "Dấu hiệu nguy hiểm cần đến cấp cứu ngay",
    type: "TEXT",
    content: `# Dấu hiệu nguy hiểm cần đến cơ sở y tế ngay

## Các triệu chứng cần cấp cứu NGAY LẬP TỨC

Nếu bạn hoặc người thân có các dấu hiệu sau, hãy gọi cấp cứu 115 hoặc đến phòng cấp cứu gần nhất ngay lập tức, KHÔNG chờ đặt lịch:

### Tim mạch – Nguy cơ đột quỵ / nhồi máu cơ tim
- Đau ngực dữ dội, đè nặng hoặc lan ra vai trái, cổ, hàm.
- Khó thở đột ngột dữ dội kèm mồ hôi lạnh.
- Tê liệt hoặc yếu đột ngột một bên mặt, tay hoặc chân.
- Méo miệng đột ngột, nói ngọng, không hiểu lời nói.
- Đau đầu cực kỳ dữ dội xuất hiện đột ngột (kiểu "sét đánh").

### Mất ý thức / thần kinh
- Ngất xỉu, bất tỉnh, không phản ứng với kích thích.
- Co giật kéo dài hoặc co giật lần đầu.
- Lơ mơ, nhầm lẫn không giải thích được.

### Hô hấp
- Khó thở nghiêm trọng, không thể nói thành câu.
- Môi, ngón tay tím tái.
- Nghẹt thở do dị vật.

### Bụng / Tiêu hóa nguy hiểm
- Đau bụng dữ dội đột ngột + bụng cứng như gỗ + sốt cao.
- Nôn ra máu hoặc đi ngoài ra máu nhiều.

### Dị ứng / Sốc phản vệ
- Nổi mề đay toàn thân + khó thở + tụt huyết áp sau khi ăn, uống thuốc, hoặc tiêm.

## Ghi nhớ số điện thoại cấp cứu

- **Cấp cứu**: 115
- **Cảnh sát**: 113
- **Cứu hỏa**: 114

## Chatbot không thay thế bác sĩ

Chatbot của ClinicAI chỉ hỗ trợ giải đáp thông tin và hướng dẫn tiền khám. Chatbot KHÔNG thể chẩn đoán bệnh. Với bất kỳ triệu chứng nào bạn lo lắng, hãy gặp bác sĩ trực tiếp để được đánh giá đúng.
`,
  },
  {
    title: "Tài khoản, bảo mật và quyền riêng tư",
    type: "TEXT",
    content: `# Tài khoản, bảo mật và quyền riêng tư tại ClinicAI

## Đăng ký tài khoản

Để sử dụng dịch vụ của ClinicAI, bạn cần tạo tài khoản bệnh nhân:
1. Vào trang Đăng ký (Register).
2. Điền họ tên, email, số điện thoại và mật khẩu.
3. Xác minh email hoặc số điện thoại qua mã OTP được gửi.
4. Hoàn tất đăng ký và đăng nhập vào hệ thống.

## Quên mật khẩu

Nếu quên mật khẩu:
1. Vào trang Đăng nhập, chọn "Quên mật khẩu".
2. Nhập email đã đăng ký.
3. Kiểm tra email và nhấn vào link đặt lại mật khẩu.
4. Nhập mật khẩu mới và xác nhận.

## Bảo mật tài khoản

- Không chia sẻ mật khẩu với bất kỳ ai, kể cả nhân viên phòng khám.
- ClinicAI không bao giờ hỏi mật khẩu của bạn qua email hay điện thoại.
- Đăng xuất sau khi sử dụng trên thiết bị công cộng.
- Dùng mật khẩu mạnh (ít nhất 8 ký tự, gồm chữ và số).

## Quyền riêng tư và dữ liệu y tế

- Thông tin sức khỏe của bạn được bảo mật theo quy định pháp luật.
- Chỉ bác sĩ điều trị và nhân viên y tế được phân quyền mới có quyền xem hồ sơ của bạn.
- Dữ liệu không được chia sẻ với bên thứ ba khi chưa có sự đồng ý của bạn.
- Bạn có thể yêu cầu xóa tài khoản và dữ liệu cá nhân bằng cách liên hệ hỗ trợ.

## Cập nhật thông tin cá nhân

Bạn có thể cập nhật họ tên, số điện thoại trong phần Hồ sơ cá nhân sau khi đăng nhập. Email không thể thay đổi sau khi đã xác minh — nếu cần thay đổi, liên hệ hỗ trợ.
`,
  },
  {
    title: "Liên hệ hỗ trợ và phản hồi",
    type: "TEXT",
    content: `# Liên hệ hỗ trợ và phản hồi

## Kênh liên hệ

Nếu bạn cần hỗ trợ về kỹ thuật hoặc dịch vụ, vui lòng liên hệ qua:
- **Email hỗ trợ**: support@clinicai.local
- **Hotline**: Hiển thị trên trang web chính của phòng khám.
- **Chatbot tiền khám**: Hỗ trợ giải đáp FAQ 24/7.
- **Trực tiếp**: Đến quầy lễ tân trong giờ làm việc.

## Giờ làm việc

- **Thứ Hai – Thứ Sáu**: 7:30 – 17:00
- **Thứ Bảy**: 7:30 – 12:00
- **Chủ nhật và ngày lễ**: Nghỉ (hoặc theo lịch đặc biệt)

## Phản hồi về chất lượng dịch vụ

Sau mỗi lần khám, bạn sẽ nhận được email khảo sát. Phản hồi của bạn giúp phòng khám cải thiện chất lượng dịch vụ.

## Vấn đề kỹ thuật với hệ thống đặt lịch

Nếu gặp lỗi kỹ thuật khi đặt lịch trực tuyến:
- Làm mới trang (F5) và thử lại.
- Xóa cache trình duyệt.
- Thử bằng trình duyệt khác.
- Nếu vẫn lỗi, chụp màn hình lỗi và gửi email đến bộ phận hỗ trợ kỹ thuật.

## Khiếu nại

Nếu bạn không hài lòng với dịch vụ, hãy liên hệ trực tiếp Ban Giám đốc phòng khám qua email chính thức được đăng trên website. Mọi khiếu nại sẽ được xử lý trong vòng 3–5 ngày làm việc.
`,
  },
];

// ─── Upsert helper ───────────────────────────────────────────────────────────
async function upsertDocument(doc) {
  const { title, type, content } = doc;

  const existing = await prisma.kbDocument.findFirst({ where: { title } });

  let document;
  if (existing) {
    document = await prisma.kbDocument.update({
      where: { id: existing.id },
      data: { content, status: "PENDING", error: null },
    });
    // clear old chunks
    await prisma.kbChunk.deleteMany({ where: { documentId: existing.id } });
    console.log(`  [update] ${title}`);
  } else {
    document = await prisma.kbDocument.create({
      data: { title, type, content, status: "PENDING" },
    });
    console.log(`  [create] ${title}`);
  }

  // chunk + embed
  const chunks = chunkText(content, { chunkSize: 800, overlap: 120 });
  for (const chunk of chunks) {
    const embedding = textToMockVector(chunk.content);
    await prisma.kbChunk.create({
      data: {
        documentId: document.id,
        content: chunk.content,
        embedding,
        meta: {
          title,
          chunkIndex: chunk.chunkIndex,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        },
      },
    });
  }

  await prisma.kbDocument.update({
    where: { id: document.id },
    data: { status: "PROCESSED" },
  });

  console.log(`         → ${chunks.length} chunks, status=PROCESSED`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Seeding Knowledge Base ===");
  console.log(`Documents: ${KB_DOCUMENTS.length}\n`);

  for (const doc of KB_DOCUMENTS) {
    await upsertDocument(doc);
  }

  const total = await prisma.kbDocument.count({ where: { status: "PROCESSED" } });
  const chunks = await prisma.kbChunk.count();
  console.log(`\n✅ Done. PROCESSED documents: ${total} | Total chunks: ${chunks}`);
}

main()
  .catch((e) => {
    console.error("KB seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
