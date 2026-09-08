import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { App } from "./app";
import { ErrorBoundary } from "./components/error-boundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster
      theme="dark"
      position="bottom-center"
      toastOptions={{
        style: { background: "#161614", border: "1px solid #2a2926", color: "#f2efe8" },
      }}
    />
  </StrictMode>,
);
