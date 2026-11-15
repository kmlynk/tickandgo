package com.kmlynk.tickandgo.repositories;

import com.kmlynk.tickandgo.domain.entities.Ticket;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    int countByTicketTypeId(UUID ticketTypeId);

    Page<Ticket> findByPurchaserId(UUID purchaserId, Pageable pageable);

    Optional<Ticket> findByIdAndPurchaserId(UUID id, UUID purchaserId);

    /**
     * Locks the ticket row, so two scanners can't both admit the same ticket at once.
     */
    @Query("SELECT t FROM Ticket t WHERE t.id = :id")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Ticket> findByIdWithLock(@Param("id") UUID id);

}
