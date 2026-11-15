package com.kmlynk.tickandgo.services;

import com.kmlynk.tickandgo.domain.entities.QrCode;
import com.kmlynk.tickandgo.domain.entities.Ticket;

import java.util.UUID;

public interface QrCodeService {

    QrCode generateQrCode(Ticket ticket);

    byte[] getQrCodeImageForUserAndTicket(UUID userId, UUID ticketId);

}
