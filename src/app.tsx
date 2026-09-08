import { Studio } from "./components/studio/studio";
import { NotFound } from "./components/not-found";

function isHomePath(pathname: string) {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/" || p === "/index.html";
}

export function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

  if (!isHomePath(pathname)) {
    return <NotFound />;
  }

  return <Studio />;
}
