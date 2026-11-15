package com.kmlynk.tickandgo.mappers;

import com.kmlynk.tickandgo.domain.dtos.ListEventResponseDto;
import com.kmlynk.tickandgo.domain.dtos.ListTicketResponseDto;
import com.kmlynk.tickandgo.domain.dtos.ListTicketTicketTypeResponseDto;
import com.kmlynk.tickandgo.domain.entities.Event;
import com.kmlynk.tickandgo.domain.entities.Ticket;
import com.kmlynk.tickandgo.domain.entities.TicketType;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TicketMapper {

    ListTicketTicketTypeResponseDto toListTicketTicketTypeResponseDto(TicketType ticketType);

    ListTicketResponseDto toListTicketResponseDto(Ticket ticket);

    ListEventResponseDto toListEventResponseDto(Event event);

}
