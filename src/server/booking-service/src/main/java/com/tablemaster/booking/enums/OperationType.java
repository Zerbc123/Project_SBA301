package com.tablemaster.booking.enums;

/**
 * Loại thao tác trên bàn (Table Operations Type)
 *
 * TRANSFER → Chuyển bàn (khách muốn đổi vị trí)
 * MERGE    → Ghép bàn (đoàn đông cần ghép nhiều bàn)
 */
public enum OperationType {
    TRANSFER,
    MERGE
}
