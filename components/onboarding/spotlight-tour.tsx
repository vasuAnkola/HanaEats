"use client";

import { useCallback } from "react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";

interface SpotlightTourProps {
  steps: Step[];
  run: boolean;
  onFinish: () => void;
}

// One shared, brand-styled Joyride instance for every button-by-button tour
// in the app — each page just supplies its own list of real DOM targets.
export function SpotlightTour({ steps, run, onFinish }: SpotlightTourProps) {
  const handleEvent = useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      onFinish();
    }
  }, [onFinish]);

  if (steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      locale={{ back: "Back", close: "Close", last: "Done", next: "Next", skip: "Skip tour", open: "Open" }}
      options={{
        primaryColor: "#2563EB",
        textColor: "#111827",
        backgroundColor: "#ffffff",
        overlayColor: "rgba(17, 24, 39, 0.55)",
        zIndex: 10000,
        showProgress: true,
        spotlightRadius: 10,
        buttons: ["back", "skip", "close", "primary"],
      }}
      styles={{
        tooltip: { borderRadius: 12, fontSize: 13, padding: 18 },
        tooltipTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
        tooltipContent: { padding: "6px 0 2px" },
        buttonPrimary: { borderRadius: 8, fontWeight: 600, padding: "8px 14px" },
        buttonBack: { color: "#6B7280", marginRight: 8 },
        buttonSkip: { color: "#9CA3AF" },
      }}
    />
  );
}
