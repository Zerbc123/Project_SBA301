package com.tablemaster.booking.entity;

import com.tablemaster.booking.enums.OperationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Bảng nhật ký chuyển bàn & ghép bàn (table_operations_audit)
 * Ghi vết mọi thao tác TRANSFER (chuyển bàn) và MERGE (ghép bàn)
 */
@Entity
@Table(name = "table_operations_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableOperationsAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Loại thao tác: TRANSFER hoặc MERGE
    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 30)
    private OperationType operationType;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "source_table_id", nullable = false)
    private UUID sourceTableId;

    @Column(name = "target_table_id", nullable = false)
    private UUID targetTableId;

    // Ref tablemaster_auth.users(id) - Lễ tân / Phục vụ thực hiện thao tác
    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    // Lý do chuyển bàn: "Khách thích view cửa sổ"
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}
