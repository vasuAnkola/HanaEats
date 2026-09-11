"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getTourSlides, useWelcomeTour } from "@/lib/tour";
import { SpotlightTour } from "@/components/onboarding/spotlight-tour";
import { SIDEBAR_STEPS } from "@/lib/page-tour-steps";
import type { UserRole } from "@/lib/auth";

interface WelcomeTourProps {
  userId: string;
  role: UserRole;
}

export function WelcomeTour({ userId, role }: WelcomeTourProps) {
  const { open, close } = useWelcomeTour(userId);
  const [step, setStep] = useState(0);
  const [sidebarTour, setSidebarTour] = useState(false);
  const slides = getTourSlides(role);

  function finishWithSidebarTour() {
    close();
    setSidebarTour(true);
  }

  if (slides.length === 0) {
    return <SpotlightTour steps={SIDEBAR_STEPS[role] ?? []} run={sidebarTour} onFinish={() => setSidebarTour(false)} />;
  }

  const isLast = step === slides.length - 1;
  const slide = slides[step];

  function handleOpenChange(next: boolean) {
    if (!next) close();
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden gap-0">
        <button
          onClick={close}
          aria-label="Skip tour"
          className="absolute right-3 top-3 z-10 text-gray-400 hover:text-gray-600 bg-white/80 rounded-full p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-br from-[#5C432B] to-[#D98C3B] px-6 pt-9 pb-7 text-center">
          <div className="text-4xl mb-3">{slide.emoji}</div>
          <h2 className="text-white font-bold text-lg leading-snug">{slide.title}</h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed min-h-[3.2rem]">{slide.body}</p>

          <div className="flex items-center justify-center gap-1.5 mt-4 mb-5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-brand-primary" : "w-1.5 bg-gray-200"}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-gray-400 ml-auto" onClick={close}>
              Skip
            </Button>
            {isLast ? (
              <Button size="sm" onClick={finishWithSidebarTour}>Show me around</Button>
            ) : (
              <Button size="sm" className="gap-1" onClick={() => setStep(s => s + 1)}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <SpotlightTour steps={SIDEBAR_STEPS[role] ?? []} run={sidebarTour} onFinish={() => setSidebarTour(false)} />
    </>
  );
}
