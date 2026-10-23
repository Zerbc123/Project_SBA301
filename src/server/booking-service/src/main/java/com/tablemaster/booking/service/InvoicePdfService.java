package com.tablemaster.booking.service;

import com.itextpdf.barcodes.BarcodeQRCode;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.xobject.PdfFormXObject;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.tablemaster.booking.entity.Booking;
import com.tablemaster.booking.entity.BookingPreorderItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Service sinh hóa đơn cọc điện tử PDF chuẩn sang trọng cho Le Prime Bistro & Lounge
 */
@Slf4j
@Service
public class InvoicePdfService {

    private static final DeviceRgb COLOR_GOLD = new DeviceRgb(140, 106, 67);      // #8C6A43
    private static final DeviceRgb COLOR_GOLD_LIGHT = new DeviceRgb(245, 239, 230); // #F5EFE6
    private static final DeviceRgb COLOR_DARK = new DeviceRgb(28, 25, 23);         // #1C1917
    private static final DeviceRgb COLOR_GRAY = new DeviceRgb(120, 113, 108);      // #78716C
    private static final DeviceRgb COLOR_SUCCESS = new DeviceRgb(16, 185, 129);    // #10B981

    public byte[] generateInvoicePdf(Booking booking) {
        log.info("Generating PDF invoice for booking: {}", booking.getBookingCode());
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4);
            Document document = new Document(pdfDoc);
            document.setMargins(36, 40, 36, 40);

            // ==================== 1. HEADER (BRANDING) ====================
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{65, 35}));
            headerTable.setWidth(UnitValue.createPercentValue(100));
            headerTable.setBorder(Border.NO_BORDER);

            Cell brandCell = new Cell().setBorder(Border.NO_BORDER);
            brandCell.add(new Paragraph("LE PRIME BISTRO & LOUNGE")
                    .setFontSize(20)
                    .setBold()
                    .setFontColor(COLOR_GOLD));
            brandCell.add(new Paragraph("French Contemporary Cuisine & Grand Cru Wine Cellar")
                    .setFontSize(9)
                    .setItalic()
                    .setFontColor(COLOR_GRAY));
            brandCell.add(new Paragraph("68 Dai lo Nguyen Hue, Ben Nghe, Quan 1, TP. Ho Chi Minh\nHotline: 028 3822 8899 - 0909 123 456\nWebsite: www.leprimebistro.vn")
                    .setFontSize(8)
                    .setFontColor(COLOR_GRAY)
                    .setMultipliedLeading(1.2f));
            headerTable.addCell(brandCell);

            Cell invoiceMetaCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
            invoiceMetaCell.add(new Paragraph("HOA DON COC DIEN TU")
                    .setFontSize(14)
                    .setBold()
                    .setFontColor(COLOR_DARK));
            invoiceMetaCell.add(new Paragraph("E-DEPOSIT RECEIPT / INVOICE")
                    .setFontSize(8)
                    .setFontColor(COLOR_GRAY));
            invoiceMetaCell.add(new Paragraph("Ma dat ban: " + booking.getBookingCode())
                    .setFontSize(10)
                    .setBold()
                    .setFontColor(COLOR_GOLD));
            String createdAtStr = booking.getCreatedAt() != null
                    ? booking.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "Hom nay";
            invoiceMetaCell.add(new Paragraph("Ngay tao don: " + createdAtStr)
                    .setFontSize(8)
                    .setFontColor(COLOR_GRAY));
            invoiceMetaCell.add(new Paragraph("Trang thai: " + booking.getStatus().name())
                    .setFontSize(9)
                    .setBold()
                    .setFontColor(COLOR_SUCCESS));
            headerTable.addCell(invoiceMetaCell);

            document.add(headerTable);

            // Divider gold line
            Table lineTable = new Table(UnitValue.createPercentArray(new float[]{100}));
            lineTable.setWidth(UnitValue.createPercentValue(100));
            Cell lineCell = new Cell().setBorder(Border.NO_BORDER)
                    .setBorderBottom(new SolidBorder(COLOR_GOLD, 1.5f))
                    .setPaddingTop(6)
                    .setPaddingBottom(6);
            lineTable.addCell(lineCell);
            document.add(lineTable);

            document.add(new Paragraph("\n").setFontSize(4));

            // ==================== 2. THONG TIN KHACH HANG & DAT BAN ====================
            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
            infoTable.setWidth(UnitValue.createPercentValue(100));
            infoTable.setBorder(new SolidBorder(COLOR_GOLD_LIGHT, 1));
            infoTable.setBackgroundColor(COLOR_GOLD_LIGHT);

            Cell customerCell = new Cell().setBorder(Border.NO_BORDER).setPadding(10);
            customerCell.add(new Paragraph("THONG TIN KHACH HANG").setFontSize(10).setBold().setFontColor(COLOR_DARK));
            customerCell.add(new Paragraph("Ho ten: " + booking.getGuestName()).setFontSize(9).setFontColor(COLOR_DARK));
            customerCell.add(new Paragraph("So dien thoai: " + booking.getGuestPhone()).setFontSize(9).setFontColor(COLOR_DARK));
            customerCell.add(new Paragraph("Email: " + (booking.getGuestEmail() != null ? booking.getGuestEmail() : "N/A")).setFontSize(9).setFontColor(COLOR_DARK));
            customerCell.add(new Paragraph("So luong khach: " + booking.getGuestCount() + " nguoi").setFontSize(9).setFontColor(COLOR_DARK));
            infoTable.addCell(customerCell);

            Cell bookingDetailCell = new Cell().setBorder(Border.NO_BORDER).setPadding(10);
            bookingDetailCell.add(new Paragraph("CHI TIET DAT CHO").setFontSize(10).setBold().setFontColor(COLOR_DARK));
            String bookingDateStr = booking.getBookingDate() != null
                    ? booking.getBookingDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    : "N/A";
            bookingDetailCell.add(new Paragraph("Ngay dung bua: " + bookingDateStr).setFontSize(9).setBold().setFontColor(COLOR_DARK));
            bookingDetailCell.add(new Paragraph("Khung gio: 19:00 - 21:00 (Gio Vang)").setFontSize(9).setFontColor(COLOR_DARK));
            bookingDetailCell.add(new Paragraph("Khu vuc / Ban: Ban VIP Chuan").setFontSize(9).setFontColor(COLOR_DARK));
            if (booking.getSpecialNotes() != null && !booking.getSpecialNotes().isBlank()) {
                bookingDetailCell.add(new Paragraph("Ghi chu: " + booking.getSpecialNotes()).setFontSize(8).setItalic().setFontColor(COLOR_GRAY));
            }
            infoTable.addCell(bookingDetailCell);

            document.add(infoTable);
            document.add(new Paragraph("\n").setFontSize(6));

            // ==================== 3. BANG CHI TIET TIEN COC & MON DAT TRUOC ====================
            document.add(new Paragraph("CHI TIET KHOAN COC DICH VU & MON AN")
                    .setFontSize(10)
                    .setBold()
                    .setFontColor(COLOR_DARK));

            Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{10, 45, 15, 15, 15}));
            itemsTable.setWidth(UnitValue.createPercentValue(100));

            // Header row
            itemsTable.addHeaderCell(createHeaderCell("STT"));
            itemsTable.addHeaderCell(createHeaderCell("Khoan Muc"));
            itemsTable.addHeaderCell(createHeaderCell("So Luong"));
            itemsTable.addHeaderCell(createHeaderCell("Don Gia"));
            itemsTable.addHeaderCell(createHeaderCell("Thanh Tien"));

            int itemIndex = 1;
            NumberFormat currencyFormatter = NumberFormat.getInstance(new Locale("vi", "VN"));

            // Khoản cọc giữ bàn tiêu chuẩn
            itemsTable.addCell(createCell(String.valueOf(itemIndex++), TextAlignment.CENTER));
            itemsTable.addCell(createCell("Coc giu ban tieu chuan (" + booking.getGuestCount() + " khach)", TextAlignment.LEFT));
            itemsTable.addCell(createCell("1", TextAlignment.CENTER));
            itemsTable.addCell(createCell("200,000 d", TextAlignment.RIGHT));
            itemsTable.addCell(createCell("200,000 d", TextAlignment.RIGHT));

            // Danh sách món đặt trước nếu có
            if (booking.getPreorderItems() != null && !booking.getPreorderItems().isEmpty()) {
                for (BookingPreorderItem item : booking.getPreorderItems()) {
                    itemsTable.addCell(createCell(String.valueOf(itemIndex++), TextAlignment.CENTER));
                    itemsTable.addCell(createCell("Mon an dat truoc (Pre-order Menu Item)", TextAlignment.LEFT));
                    itemsTable.addCell(createCell(String.valueOf(item.getQuantity()), TextAlignment.CENTER));
                    itemsTable.addCell(createCell(currencyFormatter.format(item.getUnitPrice()) + " d", TextAlignment.RIGHT));
                    itemsTable.addCell(createCell(currencyFormatter.format(item.getSubtotal()) + " d", TextAlignment.RIGHT));
                }
            }

            // Total Deposit Row
            Cell totalLabelCell = new Cell(1, 4)
                    .add(new Paragraph("TONG TIEN COC DA THANH TOAN (100%):").setBold().setFontSize(10).setFontColor(COLOR_DARK))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBackgroundColor(COLOR_GOLD_LIGHT)
                    .setPadding(8);
            itemsTable.addCell(totalLabelCell);

            String depositFormatted = currencyFormatter.format(booking.getTotalDeposit()) + " VND";
            Cell totalValueCell = new Cell()
                    .add(new Paragraph(depositFormatted).setBold().setFontSize(11).setFontColor(COLOR_GOLD))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBackgroundColor(COLOR_GOLD_LIGHT)
                    .setPadding(8);
            itemsTable.addCell(totalValueCell);

            document.add(itemsTable);
            document.add(new Paragraph("\n").setFontSize(6));

            // ==================== 4. MA QR CHECK-IN & DIEU KHOAN ====================
            Table qrAndPolicyTable = new Table(UnitValue.createPercentArray(new float[]{30, 70}));
            qrAndPolicyTable.setWidth(UnitValue.createPercentValue(100));
            qrAndPolicyTable.setBorder(new SolidBorder(COLOR_GOLD_LIGHT, 1));
            qrAndPolicyTable.setPadding(6);

            // Sinh mã QR Check-in
            String qrToken = booking.getCheckinQrToken() != null ? booking.getCheckinQrToken() : booking.getBookingCode();
            BarcodeQRCode qrCode = new BarcodeQRCode(qrToken);
            PdfFormXObject qrObject = qrCode.createFormXObject(pdfDoc);
            Image qrImage = new Image(qrObject);
            qrImage.setWidth(100);
            qrImage.setHeight(100);
            qrImage.setHorizontalAlignment(HorizontalAlignment.CENTER);

            Cell qrCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER).setPadding(6);
            qrCell.add(qrImage);
            qrCell.add(new Paragraph("VE QR CHECK-IN TAI SANH\n" + booking.getBookingCode())
                    .setFontSize(7)
                    .setBold()
                    .setFontColor(COLOR_GOLD));
            qrAndPolicyTable.addCell(qrCell);

            Cell policyCell = new Cell().setBorder(Border.NO_BORDER).setPadding(8);
            policyCell.add(new Paragraph("QUY DINH HOAN COC & CHECK-IN (BR-04)")
                    .setFontSize(9)
                    .setBold()
                    .setFontColor(COLOR_DARK));
            policyCell.add(new Paragraph("1. Hoan 100% tien coc neu huy truoc gio hen tren 24 gio.\n" +
                    "2. Hoan 50% tien coc neu huy trong khoang tu 6 gio den 24 gio truoc gio hen.\n" +
                    "3. Khong hoan coc neu huy duoi 6 gio hoac khach khong den (No-show).\n" +
                    "4. Toan bo tien coc nay se duoc khau tru truc tiep vao tong hoa don thanh toan tai ban.\n" +
                    "5. Vui long xuat trinh ma QR tren day cho Le tan tai sanh de duoc dan vao ban ngay.")
                    .setFontSize(8)
                    .setFontColor(COLOR_GRAY)
                    .setMultipliedLeading(1.3f));
            qrAndPolicyTable.addCell(policyCell);

            document.add(qrAndPolicyTable);

            // Footer note
            Paragraph footer = new Paragraph("\nCam on quy khach da tin tuong & lua chon Le Prime Bistro & Lounge. Chuc quy khach mot buoi toi ngon mieng!")
                    .setFontSize(8)
                    .setItalic()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(COLOR_GRAY);
            document.add(footer);

            document.close();
            log.info("PDF invoice generated successfully, size: {} bytes", baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Error generating PDF invoice for booking {}: {}", booking.getBookingCode(), e.getMessage(), e);
            throw new RuntimeException("Khong the sinh file PDF hoa don coc: " + e.getMessage(), e);
        }
    }

    private Cell createHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(8).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(COLOR_GOLD)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(5);
    }

    private Cell createCell(String text, TextAlignment alignment) {
        return new Cell()
                .add(new Paragraph(text).setFontSize(8).setFontColor(COLOR_DARK))
                .setTextAlignment(alignment)
                .setBorder(new SolidBorder(COLOR_GOLD_LIGHT, 0.5f))
                .setPadding(5);
    }
}
