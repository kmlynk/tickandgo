package com.kmlynk.tickandgo.mappers;

import com.kmlynk.tickandgo.domain.CreateEventRequest;
import com.kmlynk.tickandgo.domain.CreateTicketTypeRequest;
import com.kmlynk.tickandgo.domain.UpdateEventRequest;
import com.kmlynk.tickandgo.domain.UpdateTicketTypeRequest;
import com.kmlynk.tickandgo.domain.dtos.*;
import com.kmlynk.tickandgo.domain.entities.Event;
import com.kmlynk.tickandgo.domain.entities.TicketType;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EventMapper {

    // Create
    CreateTicketTypeRequest fromCreateTicketTypeRequestDto(CreateTicketTypeRequestDto dto);

    CreateEventRequest fromCreateEventRequestDto(CreateEventRequestDto dto);

    CreateTicketTypeResponseDto toCreateTicketTypeResponseDto(TicketType ticketType);

    CreateEventResponseDto toCreateEventResponseDto(Event event);

    // GET
    ListEventTicketTypeResponseDto toListEventTicketTypeDto(TicketType ticketType);

    ListEventResponseDto toListEventResponseDto(Event event);

    GetEventTicketTypesResponseDto toGetEventTicketTypesResponseDto(TicketType ticketType);

    GetEventDetailsResponseDto toGetEventDetailsResponseDto(Event event);

    // Update
    UpdateTicketTypeRequest fromUpdateTicketTypeRequestDto(UpdateTicketTypeRequestDto dto);

    UpdateEventRequest fromUpdateEventRequestDto(UpdateEventRequestDto dto);

    UpdateTicketTypeResponseDto toUpdateTicketTypeResponseDto(TicketType ticketType);

    UpdateEventResponseDto toUpdateEventResponseDto(Event event);

    ListPublishedEventsResponseDto toListPublishedEventsResponseDto(Event event);

    GetPublishedEventTicketTypesResponseDto toGetPublishedEventTicketTypesResponseDto(TicketType ticketType);

    GetPublishedEventDetailsResponseDto toGetPublishedEventDetailsResponseDto(Event event);

}
