import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";

const isOverlay = new URLSearchParams(window.location.search).get("window") === "overlay";

const App = lazy(() => import("./App"));
const Overlay = lazy(() => import("./Overlay"));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {isOverlay ? <Overlay /> : <App />}
    </Suspense>
  </React.StrictMode>
);
