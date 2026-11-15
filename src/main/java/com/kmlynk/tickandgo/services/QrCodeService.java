package com.kmlynk.tickandgo.services;

import com.kmlynk.tickandgo.domain.entities.QrCode;
import com.kmlynk.tickandgo.domain.entities.Ticket;

public interface QrCodeService {

    QrCode generateQrCode(Ticket ticket);

}
