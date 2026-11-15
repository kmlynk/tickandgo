# Tick&Go frontend

Mobile-first React + Vite + TypeScript UI for the `tickandgo` Spring Boot backend.
Light and dark mode, bottom tab bar on phones, top navigation on desktop.

## Who sees what

Navigation adapts to the Keycloak realm roles in the access token (`realm_access.roles`).

| Role                | Role name in Keycloak | Gets                                                           |
|---------------------|-----------------------|----------------------------------------------------------------|
| Attendee (everyone) | –                     | Discover, event pages, buying tickets, My tickets, mobile pass |
| Organizer           | `ROLE_ORGANIZER`      | **Manage**: dashboard, create / edit / delete events           |
| Staff               | `ROLE_STAFF`          | **Check-in**: scanner and manual ticket check                  |

## Pages

| URL                               | Page                                                                                           | Access                      |
|-----------------------------------|------------------------------------------------------------------------------------------------|-----------------------------|
| `/` (`?q=…&page=…`)               | Discover: search (as you type) and browse published events                                     | public                      |
| `/events/:eventId`                | Event page: details, ticket picker with quantity, checkout, add to calendar, directions, share | public (buying needs login) |
| `/account`                        | Profile, roles, shortcuts, theme (auto / light / dark), log out                                | public                      |
| `/tickets` (`?view=past`)         | My tickets, grouped per event, upcoming / past                                                 | login                       |
| `/tickets/:ticketId`              | Ticket details                                                                                 | login                       |
| `/tickets/:ticketId/qr`           | Full-screen mobile pass with QR code and live clock                                            | login                       |
| `/organizer` (`?filter=…`)        | Organizer dashboard: stats, filters, search, event list                                        | organizer                   |
| `/organizer/events/new`           | Create event (sections, inline validation, live preview)                                       | organizer                   |
| `/organizer/events/:eventId/edit` | Edit / delete event                                                                            | organizer                   |
| `/staff`                          | Check-in hub: start scanner, manual check                                                      | staff                       |
| `/staff/scan`                     | Full-screen camera QR scanner                                                                  | staff                       |
| `/callback`                       | Keycloak login return                                                                          |                             |

Old `/dashboard/events…` URLs redirect to `/organizer…`.
A ticket selection made while logged out survives the Keycloak login and opens checkout afterwards.

## Code layout

```
src/
  main.tsx, router.tsx, styles.css   entry, routes, design system (CSS variables)
  lib/          api client, auth helpers, types, formatting, calendar (.ics), theme, cover art
  components/   layout (top bar + tab bar), guards, icons, sheet, toast, cards, common bits
  pages/
    attendee/   Discover, Event, My tickets, Ticket, Pass
    organizer/  Dashboard, Event editor
    staff/      Check-in hub, Scanner (lazy-loaded, uses jsqr)
    AccountPage.tsx, misc.tsx (callback, 404, redirects)
```

The backend has no images, so each event gets generated cover art from its id (`lib/cover.ts`).
Buying several tickets calls the one-ticket purchase endpoint once per ticket.

## Run

Start PostgreSQL, Keycloak and the backend first (see the [main README](../README.md)), then:

```sh
npm install
npm run dev
```

Open http://localhost:5173.

## How requests are routed (Vite dev server)

| Path          | Goes to                 | Why                                          |
|---------------|-------------------------|----------------------------------------------|
| `/api/*`      | `http://localhost:8080` | Spring Boot backend                          |
| `/keycloak/*` | `http://localhost:9090` | Keycloak token endpoint, called without CORS |

The Keycloak login page itself opens directly on `localhost:9090`.
The client's **Valid redirect URIs** must include `http://localhost:5173/callback`.
Logout ends the Keycloak session and stays on Keycloak's "You are logged out" page;
open http://localhost:5173 again afterwards.

The scanner needs camera access, which browsers only allow on `http://localhost` or https.
