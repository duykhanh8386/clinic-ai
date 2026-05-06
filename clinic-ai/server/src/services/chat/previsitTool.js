/**
 * Previsit Guidance Tool — Week 7
 *
 * Được gọi khi intent = "previsit".
 * Trả về hướng dẫn chuẩn bị trước khám và cách điền phiếu tiền khám.
 */

const PREVISIT_GUIDE = `
## Hướng dẫn chuẩn bị trước khi khám

### 1. Phiếu tiền khám
Trước buổi khám, bạn có thể điền **Phiếu tiền khám** trong hệ thống ClinicAI để bác sĩ nắm tình trạng sức khỏe trước khi gặp. Phiếu gồm:
- **Triệu chứng hiện tại**: Mô tả các triệu chứng bạn đang gặp (ví dụ: đau đầu, sốt, ho...)
- **Thời gian triệu chứng**: Triệu chứng xuất hiện bao nhiêu ngày
- **Có sốt không**: Đánh dấu Có/Không
- **Dị ứng**: Các loại thuốc hoặc thực phẩm bạn bị dị ứng
- **Tiền sử bệnh**: Các bệnh đã từng mắc (tiểu đường, huyết áp, tim mạch...)
- **Thuốc đang dùng**: Các thuốc đang sử dụng
- **Ghi chú thêm**: Bất kỳ thông tin nào bạn muốn bác sĩ biết

### 2. Cách điền phiếu
1. Đăng nhập vào ClinicAI
2. Vào **Lịch hẹn của tôi**
3. Chọn lịch hẹn cần chuẩn bị
4. Nhấn **Điền phiếu tiền khám**
5. Điền thông tin → Lưu

### 3. Giấy tờ cần mang
- CMND/CCCD hoặc Hộ chiếu
- Thẻ bảo hiểm y tế (nếu có)
- Kết quả xét nghiệm/chụp chiếu trước đó (nếu có)

### 4. Lưu ý trước khám
- Đến trước giờ hẹn **15 phút** để làm thủ tục
- Nếu không thể đến, **hủy lịch trước ít nhất 2 giờ**
- Nhịn ăn nếu bác sĩ có yêu cầu (thường cho xét nghiệm máu)
`;

/**
 * Trả về hướng dẫn previsit dạng plain text để đưa vào prompt AI.
 */
export function buildPrevisitContext() {
  return PREVISIT_GUIDE.trim();
}
