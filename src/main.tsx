import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Vite / React SPA — use /react, NOT /next (Next.js only).
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "sonner";
import { App } from "./app";
import { ErrorBoundary } from "./components/error-boundary";
import { initClarity } from "./lib/clarity";
import { recordPageView } from "./lib/cards/views";
import "./styles.css";

// Dashboards only — never shown on the public UI.
initClarity();
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
