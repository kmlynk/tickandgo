package com.kmlynk.tickandgo.mappers;

import com.kmlynk.tickandgo.domain.CreateEventRequest;
import com.kmlynk.tickandgo.domain.CreateTicketTypeRequest;
import com.kmlynk.tickandgo.domain.dtos.*;
import com.kmlynk.tickandgo.domain.entities.Event;
import com.kmlynk.tickandgo.domain.entities.TicketType;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EventMapper {

    CreateTicketTypeRequest fromDto(CreateTicketTypeRequestDto dto);

    CreateEventRequest fromDto(CreateEventRequestDto dto);

    CreateEventResponseDto toDto(Event event);

    CreateTicketTypeResponseDto toDto(TicketType ticketType);

    ListEventTicketTypeResponseDto toListEventTicketTypeDto(TicketType ticketType);

    ListEventResponseDto toListEventResponseDto(Event event);
}
