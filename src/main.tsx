import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "sonner";
import { App } from "./app";
import { ErrorBoundary } from "./components/error-boundary";
import { recordPageView } from "./lib/cards/views";
import "./styles.css";

// Lifetime counter — once per tab session; never blocks UI.
void recordPageView();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
    <SpeedInsights />
    <Toaster
      theme="dark"
      position="bottom-center"
      toastOptions={{
        style: { background: "#161614", border: "1px solid #2a2926", color: "#f2efe8" },
      }}
    />
  </StrictMode>,
);
