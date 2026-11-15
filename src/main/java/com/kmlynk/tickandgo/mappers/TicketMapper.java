package com.kmlynk.tickandgo.mappers;

import com.kmlynk.tickandgo.domain.dtos.ListTicketEventResponseDto;
import com.kmlynk.tickandgo.domain.dtos.ListTicketResponseDto;
import com.kmlynk.tickandgo.domain.dtos.ListTicketTicketTypeResponseDto;
import com.kmlynk.tickandgo.domain.entities.Event;
import com.kmlynk.tickandgo.domain.entities.Ticket;
import com.kmlynk.tickandgo.domain.entities.TicketType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TicketMapper {

    ListTicketTicketTypeResponseDto toListTicketTicketTypeResponseDto(TicketType ticketType);

    @Mapping(target = "event", source = "ticketType.event")
    ListTicketResponseDto toListTicketResponseDto(Ticket ticket);

    ListTicketEventResponseDto toListTicketEventResponseDto(Event event);

}
