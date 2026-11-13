package com.kmlynk.tickandgo.services;

import com.kmlynk.tickandgo.domain.CreateEventRequest;
import com.kmlynk.tickandgo.domain.entities.Event;

import java.util.UUID;

public interface EventService {

    Event createEvent(UUID organizerId, CreateEventRequest event);

}
