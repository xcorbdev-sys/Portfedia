"use client";

import { useEffect, useState } from "react";

/** Light by default; the visitor can switch to dark (remembered in this browser). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return (
    <button
      type="button"
      className="linklike"
      onClick={() => {
        const next = !dark;
        setDark(next);
        if (next) document.documentElement.dataset.theme = "dark";
        else delete document.documentElement.dataset.theme;
        try {
          localStorage.setItem("pf-theme", next ? "dark" : "light");
        } catch {
          /* ignore */
        }
      }}
    >
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
