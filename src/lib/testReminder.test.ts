import { describe, expect, it, vi } from "vitest";
import { getReminderAppointmentCopy } from "./testReminder";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

describe("getReminderAppointmentCopy", () => {
  it("asks the coach to prepare a test when a workout plan expires", () => {
    const copy = getReminderAppointmentCopy({
      planType: "workout_plan",
      clientName: "Mario Rossi",
      planName: "Forza",
      endDate: "2026-07-15",
    });

    expect(copy.title).toContain("Prepara test");
    expect(copy.title).toContain("Mario Rossi");
    expect(copy.description).toBe('Scheda "Forza" in scadenza il 15/07/2026. Prepara il test di valutazione.');
  });

  it("asks the coach to prepare a workout plan when a test expires", () => {
    const copy = getReminderAppointmentCopy({
      planType: "test",
      clientName: "Mario Rossi",
      planName: "Test forza",
      endDate: "2026-07-15",
    });

    expect(copy.title).toContain("Prepara scheda");
    expect(copy.title).toContain("Mario Rossi");
    expect(copy.description).toBe('Test "Test forza" in scadenza il 15/07/2026. Prepara la prossima scheda di allenamento.');
  });
});
