"use client";
import { useEffect } from "react";

export default function BeforeUnloadWarning() {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        "Are you sure you want to leave this page? Unsaved data may be lost.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return null; // This component only adds behavior, not UI
}
