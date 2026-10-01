import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ExteriorApp } from "./ExteriorApp";
import "../styles.css";
import "./exterior.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExteriorApp />
  </StrictMode>,
);
