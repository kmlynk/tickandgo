import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {AuthProvider} from "react-oidc-context";
import {RouterProvider} from "react-router";
import {ToastProvider} from "./components/Toast";
import {oidcConfig, returnPathFrom} from "./lib/auth";
import {initTheme} from "./lib/theme";
import {router} from "./router";
import "./styles.css";

initTheme();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider
            {...oidcConfig}
            // After login, leave /callback?code=... and go back to where the user started.
            onSigninCallback={(user) => {
                router.navigate(returnPathFrom(user), {replace: true});
            }}
        >
            <ToastProvider>
                <RouterProvider router={router}/>
            </ToastProvider>
        </AuthProvider>
    </StrictMode>,
);
