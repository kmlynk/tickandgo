package com.kmlynk.tickandgo.domain.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ListPublishedEventsResponseDto {

    private UUID id;
    private String name;
    private LocalDateTime start;
    private String venue;

}
