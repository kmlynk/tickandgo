import {createBrowserRouter, Navigate} from "react-router";
import AppLayout from "./components/AppLayout";
import {RequireLogin, RequireRole} from "./components/guards";
import {ORGANIZER_ROLE, STAFF_ROLE} from "./lib/auth";
import AccountPage from "./pages/AccountPage";
import DiscoverPage from "./pages/attendee/DiscoverPage";
import EventPage from "./pages/attendee/EventPage";
import MyTicketsPage from "./pages/attendee/MyTicketsPage";
import TicketPage from "./pages/attendee/TicketPage";
import TicketPassPage from "./pages/attendee/TicketPassPage";
import {CallbackPage, LegacyEditRedirect, NotFoundPage} from "./pages/misc";
import EventEditorPage from "./pages/organizer/EventEditorPage";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import StaffHubPage from "./pages/staff/StaffHubPage";

const organizerOnly = (
    <RequireRole role={ORGANIZER_ROLE} audience="Organizers" purpose="Creating and managing events"/>
);
const staffOnly = <RequireRole role={STAFF_ROLE} audience="Staff" purpose="Checking tickets in"/>;

export const router = createBrowserRouter([
    {
        Component: AppLayout,
        children: [
            // Attendees (public)
            {index: true, Component: DiscoverPage}, // ?q=…&page=…
            {path: "events/:eventId", Component: EventPage},
            {path: "account", Component: AccountPage},

            // Keycloak redirects here after login; main.tsx then navigates on.
            {path: "callback", Component: CallbackPage},

            {
                Component: RequireLogin,
                children: [
                    // Attendees (logged in)
                    {path: "tickets", Component: MyTicketsPage}, // ?view=past
                    {path: "tickets/:ticketId", Component: TicketPage},

                    // Organizers
                    {
                        path: "organizer",
                        element: organizerOnly,
                        children: [
                            {index: true, Component: OrganizerDashboard}, // ?filter=…&page=…
                            {path: "events/new", Component: EventEditorPage},
                            {path: "events/:eventId/edit", Component: EventEditorPage},
                        ],
                    },

                    // Staff
                    {path: "staff", element: staffOnly, children: [{index: true, Component: StaffHubPage}]},
                ],
            },

            // Old organizer URLs
            {path: "dashboard/events", element: <Navigate to="/organizer" replace/>},
            {path: "dashboard/events/new", element: <Navigate to="/organizer/events/new" replace/>},
            {path: "dashboard/events/:eventId/edit", Component: LegacyEditRedirect},

            {path: "*", Component: NotFoundPage},
        ],
    },

    // Full-screen pages without the header and tab bar
    {
        Component: RequireLogin,
        children: [
            {path: "tickets/:ticketId/qr", Component: TicketPassPage},
            {
                path: "staff/scan",
                element: staffOnly,
                children: [
                    {
                        index: true,
                        // Loaded on demand: the QR decoder is big and only staff need it.
                        lazy: async () => ({Component: (await import("./pages/staff/ScannerPage")).default}),
                    },
                ],
            },
        ],
    },
]);
