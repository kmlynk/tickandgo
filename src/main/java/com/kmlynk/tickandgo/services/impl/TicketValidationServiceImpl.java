package com.kmlynk.tickandgo.services.impl;

import com.kmlynk.tickandgo.domain.entities.*;
import com.kmlynk.tickandgo.exceptions.QrCodeNotFoundException;
import com.kmlynk.tickandgo.exceptions.TicketNotFoundException;
import com.kmlynk.tickandgo.repositories.QrCodeRepository;
import com.kmlynk.tickandgo.repositories.TicketRepository;
import com.kmlynk.tickandgo.repositories.TicketValidationRepository;
import com.kmlynk.tickandgo.services.TicketValidationService;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TicketValidationServiceImpl implements TicketValidationService {

    private final QrCodeRepository qrCodeRepository;
    private final TicketValidationRepository ticketValidationRepository;
    private final TicketRepository ticketRepository;

    @Override
    public TicketValidation validateTicketByQrCode(UUID qrCodeId) {
        QrCode qrCode = qrCodeRepository.findByIdAndStatus(qrCodeId, QrCodeStatusEnum.ACTIVE)
                .orElseThrow(()
                        -> new QrCodeNotFoundException(String.format("QR Code with ID %s was not found", qrCodeId)));

        return validateTicket(qrCode.getTicket().getId(), TicketValidationMethodEnum.QR_SCAN);
    }

    @Override
    public TicketValidation validateTicketManually(UUID ticketId) {
        return validateTicket(ticketId, TicketValidationMethodEnum.MANUAL);
    }

    private @NonNull TicketValidation validateTicket(UUID ticketId, TicketValidationMethodEnum validationMethod) {
        // Locked until the transaction ends: a second scan of the same ticket waits here
        // and then sees the first one's result.
        Ticket ticket = ticketRepository.findByIdWithLock(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(
                        String.format("Ticket with ID %s was not found", ticketId)));

        TicketValidationStatusEnum ticketValidationStatus = determineStatus(ticket);

        // The first valid scan uses up the ticket.
        if (TicketValidationStatusEnum.VALID.equals(ticketValidationStatus)) {
            ticket.setStatus(TicketStatusEnum.USED);
        }

        TicketValidation ticketValidation = new TicketValidation();
        ticketValidation.setTicket(ticket);
        ticketValidation.setValidationMethod(validationMethod);
        ticketValidation.setStatus(ticketValidationStatus);
        // Every attempt is stored, also rejected ones, as an audit trail.
        ticket.getValidations().add(ticketValidation);

        return ticketValidationRepository.save(ticketValidation);
    }

    /**
     * EXPIRED: the event is over (or was cancelled / completed).
     * INVALID: the ticket was cancelled or has already been used.
     * VALID: otherwise.
     */
    private TicketValidationStatusEnum determineStatus(Ticket ticket) {
        Event event = ticket.getTicketType().getEvent();

        if (isOver(event)) {
            return TicketValidationStatusEnum.EXPIRED;
        }

        if (!TicketStatusEnum.PURCHASED.equals(ticket.getStatus())) {
            return TicketValidationStatusEnum.INVALID;
        }

        // Also covers tickets validated before USED was set on the ticket.
        boolean alreadyValidated = ticket.getValidations().stream()
                .anyMatch(v -> TicketValidationStatusEnum.VALID.equals(v.getStatus()));

        return alreadyValidated ? TicketValidationStatusEnum.INVALID : TicketValidationStatusEnum.VALID;
    }

    private boolean isOver(Event event) {
        if (EventStatusEnum.CANCELED.equals(event.getStatus())
                || EventStatusEnum.COMPLETED.equals(event.getStatus())) {
            return true;
        }

        // Entry is possible until the event ends. Without an end, until the end of its start day.
        LocalDateTime entryUntil = event.getEnd() != null
                ? event.getEnd()
                : event.getStart() != null ? event.getStart().toLocalDate().atTime(LocalTime.MAX) : null;

        return entryUntil != null && LocalDateTime.now().isAfter(entryUntil);
    }

}
