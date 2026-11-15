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

        Ticket ticket = qrCode.getTicket();

        return validateTicket(ticket);
    }

    @Override
    public TicketValidation validateTicketManually(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(TicketNotFoundException::new);

        return validateTicket(ticket);
    }

    private @NonNull TicketValidation validateTicket(Ticket ticket) {
        TicketValidation ticketValidation = new TicketValidation();
        ticketValidation.setTicket(ticket);
        ticketValidation.setValidationMethod(TicketValidationMethodEnum.QR_SCAN);

        TicketValidationStatusEnum ticketValidationStatus = ticket.getValidations().stream()
                .filter(v
                        -> TicketValidationStatusEnum.VALID.equals(v.getStatus()))
                .findFirst()
                .map(v -> TicketValidationStatusEnum.INVALID)
                .orElse(TicketValidationStatusEnum.VALID);

        ticketValidation.setStatus(ticketValidationStatus);

        return ticketValidationRepository.save(ticketValidation);
    }

}
