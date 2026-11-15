package com.kmlynk.tickandgo.services.impl;

import com.kmlynk.tickandgo.domain.entities.Ticket;
import com.kmlynk.tickandgo.domain.entities.TicketStatusEnum;
import com.kmlynk.tickandgo.domain.entities.TicketType;
import com.kmlynk.tickandgo.domain.entities.User;
import com.kmlynk.tickandgo.exceptions.TicketSoldOutException;
import com.kmlynk.tickandgo.exceptions.TicketTypeNotFoundException;
import com.kmlynk.tickandgo.exceptions.UserNotFoundException;
import com.kmlynk.tickandgo.repositories.TicketRepository;
import com.kmlynk.tickandgo.repositories.TicketTypeRepository;
import com.kmlynk.tickandgo.repositories.UserRepository;
import com.kmlynk.tickandgo.services.QrCodeService;
import com.kmlynk.tickandgo.services.TicketTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketTypeServiceImpl implements TicketTypeService {

    private final UserRepository userRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final TicketRepository ticketRepository;
    private final QrCodeService qrCodeService;

    @Override
    @Transactional
    public Ticket purchaseTicket(UUID userId, UUID ticketTypeId) {
        User user = userRepository
                .findById(userId).orElseThrow(() -> new UserNotFoundException(
                        String.format("User with ID %s not found", userId)));

        TicketType ticketType = ticketTypeRepository
                .findByIdWithLock(ticketTypeId).orElseThrow(() -> new TicketTypeNotFoundException(
                        String.format("Ticket type with ID %s not found", ticketTypeId)));

        int purchasedTickets = ticketRepository.countByTicketTypeId(ticketTypeId);
        Integer totalAvailable = ticketType.getTotalAvailable();

        if (purchasedTickets + 1 > totalAvailable) {
            throw new TicketSoldOutException();
        }

        Ticket ticket = new Ticket();
        ticket.setStatus(TicketStatusEnum.PURCHASED);
        ticket.setTicketType(ticketType);
        ticket.setPurchaser(user);

        Ticket savedTicket = ticketRepository.save(ticket);
        qrCodeService.generateQrCode(savedTicket);

        return ticketRepository.save(savedTicket);
    }

}
