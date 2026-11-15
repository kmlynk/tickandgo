package com.kmlynk.tickandgo.controllers;

import com.kmlynk.tickandgo.domain.dtos.ListTicketResponseDto;
import com.kmlynk.tickandgo.mappers.TicketMapper;
import com.kmlynk.tickandgo.services.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static com.kmlynk.tickandgo.util.JwtUtil.parseUserId;


@RestController
@RequestMapping(path = "/api/v1/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final TicketMapper ticketMapper;

    @GetMapping
    public Page<ListTicketResponseDto> listTickets(
            @AuthenticationPrincipal Jwt jwt,
            Pageable pageable) {
        UUID userId = parseUserId(jwt);

        return ticketService.listTicketsForUser(userId, pageable).map(ticketMapper::toListTicketResponseDto);
    }

}
