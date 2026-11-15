package com.kmlynk.tickandgo.services;

import com.kmlynk.tickandgo.domain.entities.TicketValidation;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public interface TicketValidationService {

    TicketValidation validateTicketByQrCode(UUID qrCodeId);

    TicketValidation validateTicketManually(UUID ticketId);

}
