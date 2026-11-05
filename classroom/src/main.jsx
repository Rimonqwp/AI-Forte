import React from "react";
import { createRoot } from "react-dom/client";
import { ClassroomApp } from "./SongDetail.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import "./styles.css";
import "./score-reference.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider><ClassroomApp /></AuthProvider>
  </React.StrictMode>,
);
