package com.kmlynk.tickandgo.services;

import com.kmlynk.tickandgo.domain.entities.Ticket;

import java.util.UUID;

public interface TicketTypeService {

    Ticket purchaseTicket(UUID userId, UUID ticketTypeId);

}
