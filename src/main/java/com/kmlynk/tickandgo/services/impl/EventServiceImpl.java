package com.kmlynk.tickandgo.services.impl;

import com.kmlynk.tickandgo.domain.CreateEventRequest;
import com.kmlynk.tickandgo.domain.UpdateEventRequest;
import com.kmlynk.tickandgo.domain.UpdateTicketTypeRequest;
import com.kmlynk.tickandgo.domain.entities.Event;
import com.kmlynk.tickandgo.domain.entities.EventStatusEnum;
import com.kmlynk.tickandgo.domain.entities.TicketType;
import com.kmlynk.tickandgo.domain.entities.User;
import com.kmlynk.tickandgo.exceptions.EventNotFoundException;
import com.kmlynk.tickandgo.exceptions.EventUpdateException;
import com.kmlynk.tickandgo.exceptions.TicketTypeNotFoundException;
import com.kmlynk.tickandgo.exceptions.UserNotFoundException;
import com.kmlynk.tickandgo.repositories.EventRepository;
import com.kmlynk.tickandgo.repositories.UserRepository;
import com.kmlynk.tickandgo.services.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Override
    @Transactional
    public Event createEvent(UUID organizerId, CreateEventRequest event) {
        User organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new UserNotFoundException(
                        String.format("User with ID '%s' not found", organizerId))
                );

        Event eventToCreate = new Event();

        List<TicketType> ticketTypesToCreate = event.getTicketTypes().stream().map(
                ticketType -> {
                    TicketType ticketTypeToCreate = new TicketType();
                    ticketTypeToCreate.setName(ticketType.getName());
                    ticketTypeToCreate.setPrice(ticketType.getPrice());
                    ticketTypeToCreate.setDescription(ticketType.getDescription());
                    ticketTypeToCreate.setTotalAvailable(ticketType.getTotalAvailable());
                    ticketTypeToCreate.setEvent(eventToCreate);
                    return ticketTypeToCreate;
                }).toList();

        eventToCreate.setName(event.getName());
        eventToCreate.setStart(event.getStart());
        eventToCreate.setEnd(event.getEnd());
        eventToCreate.setVenue(event.getVenue());
        eventToCreate.setSalesStart(event.getSalesStart());
        eventToCreate.setSalesEnd(event.getSalesEnd());
        eventToCreate.setStatus(event.getStatus());
        eventToCreate.setOrganizer(organizer);
        eventToCreate.setTicketTypes(ticketTypesToCreate);

        return  eventRepository.save(eventToCreate);
    }

    @Override
    public Page<Event> listEventsForOrganizer(UUID organizerId, Pageable pageable) {
        return  eventRepository.findByOrganizerId(organizerId, pageable);
    }

    @Override
    public Optional<Event> getEventForOrganizer(UUID organizerId, UUID id) {
        return eventRepository.findByIdAndOrganizerId(id, organizerId);
    }

    @Override
    @Transactional
    public Event updateEventForOrganizer(UUID organizerId, UUID id, UpdateEventRequest request) {
        if (request.getId() == null) {
            throw new EventUpdateException("Event ID cannot be null");
        }

        if (!id.equals(request.getId())) {
            throw new EventUpdateException("Cannot update the ID of an event");
        }

        Event existingEvent = eventRepository.findByIdAndOrganizerId(id, organizerId)
                .orElseThrow(() -> new EventNotFoundException(String.format("Event with ID '%s' does not exists", id)));

        existingEvent.setName(request.getName());
        existingEvent.setStart(request.getStart());
        existingEvent.setEnd(request.getEnd());
        existingEvent.setVenue(request.getVenue());
        existingEvent.setSalesStart(request.getSalesStart());
        existingEvent.setSalesEnd(request.getSalesEnd());
        existingEvent.setStatus(request.getStatus());

        Set<UUID> requestTicketTypeIds = request.getTicketTypes()
                .stream()
                .map(UpdateTicketTypeRequest::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        existingEvent.getTicketTypes()
                .removeIf(existingTicketType -> !requestTicketTypeIds.contains(existingTicketType.getId()));

        Map<UUID, TicketType> existingTicketTypesIndex = existingEvent.getTicketTypes()
                .stream().collect(Collectors.toMap(TicketType::getId, Function.identity()));

        for (UpdateTicketTypeRequest ticketType : request.getTicketTypes()) {
            if (ticketType.getId() == null) {
                // Create case
                TicketType ticketTypeToCreate = new TicketType();
                ticketTypeToCreate.setName(ticketType.getName());
                ticketTypeToCreate.setPrice(ticketType.getPrice());
                ticketTypeToCreate.setDescription(ticketType.getDescription());
                ticketTypeToCreate.setTotalAvailable(ticketType.getTotalAvailable());
                ticketTypeToCreate.setEvent(existingEvent);
                existingEvent.getTicketTypes().add(ticketTypeToCreate);
            } else if (existingTicketTypesIndex.containsKey(ticketType.getId())) {
                // Update case
                TicketType existingTicketType = existingTicketTypesIndex.get(ticketType.getId());
                existingTicketType.setName(ticketType.getName());
                existingTicketType.setPrice(ticketType.getPrice());
                existingTicketType.setDescription(ticketType.getDescription());
                existingTicketType.setTotalAvailable(ticketType.getTotalAvailable());
            } else {
                throw new TicketTypeNotFoundException(
                        String.format("Ticket type with ID '%s' does not exists", ticketType.getId()));
            }
        }

        return eventRepository.save(existingEvent);
    }

    @Override
    @Transactional
    public void deleteEventForOrganizer(UUID organizerId, UUID id) {
        getEventForOrganizer(organizerId, id).ifPresent(eventRepository::delete);
    }

    @Override
    public Page<Event> listPublishedEvents(Pageable pageable) {
        return eventRepository.findByStatus(EventStatusEnum.PUBLISHED, pageable);
    }

    @Override
    public Page<Event> searchPublishedEvents(String query, Pageable pageable) {
        return eventRepository.searchEvents(query, pageable);
    }

    @Override
    public Optional<Event> getPublishedEvent(UUID eventId) {
        return eventRepository.findByIdAndStatus(eventId, EventStatusEnum.PUBLISHED);
    }

}
