package com.tablemaster.payment.repository;

import com.tablemaster.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByTransferContent(String transferContent);

    List<PaymentTransaction> findByBookingId(UUID bookingId);

    List<PaymentTransaction> findByUserId(UUID userId);

    List<PaymentTransaction> findByStatus(String status);
}
