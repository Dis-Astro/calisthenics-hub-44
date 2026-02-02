import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface WorkoutPlanExercise {
  id: string;
  day_of_week: number | null;
  sets: number | null;
  reps: string | null;
  notes: string | null;
  order_index: number;
  exercise: {
    id: string;
    name: string;
    muscle_group: string | null;
  };
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  coach_notes: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface WorkoutPlanViewDialogProps {
  planId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dayLabels: Record<number, string> = {
  1: "Giorno 1",
  2: "Giorno 2",
  3: "Giorno 3",
  4: "Giorno 4",
  5: "Giorno 5",
  6: "Giorno 6",
  7: "Giorno 7"
};

const WorkoutPlanViewDialog = ({ planId, open, onOpenChange }: WorkoutPlanViewDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<WorkoutPlanExercise[]>([]);

  useEffect(() => {
    if (open && planId) {
      fetchPlanDetails();
    }
  }, [open, planId]);

  const fetchPlanDetails = async () => {
    if (!planId) return;
    
    setLoading(true);

    const [planRes, exercisesRes] = await Promise.all([
      supabase
        .from("workout_plans")
        .select("*")
        .eq("id", planId)
        .single(),
      supabase
        .from("workout_plan_exercises")
        .select(`
          id,
          day_of_week,
          sets,
          reps,
          notes,
          order_index,
          exercise:exercises(id, name, muscle_group)
        `)
        .eq("workout_plan_id", planId)
        .order("day_of_week")
        .order("order_index")
    ]);

    if (planRes.data) {
      setPlan(planRes.data);
    }
    if (exercisesRes.data) {
      setExercises(exercisesRes.data as unknown as WorkoutPlanExercise[]);
    }
    
    setLoading(false);
  };

  // Group exercises by day
  const exercisesByDay = exercises.reduce((acc, ex) => {
    const day = ex.day_of_week || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(ex);
    return acc;
  }, {} as Record<number, WorkoutPlanExercise[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plan ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="font-display tracking-wider">{plan.name}</DialogTitle>
                {plan.is_active && <Badge variant="default">Attiva</Badge>}
              </div>
              <DialogDescription>
                Dal {format(new Date(plan.start_date), "d MMMM yyyy", { locale: it })} al {format(new Date(plan.end_date), "d MMMM yyyy", { locale: it })}
              </DialogDescription>
            </DialogHeader>

            {plan.description && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{plan.description}</p>
              </div>
            )}

            {plan.coach_notes && (
              <div className="p-3 bg-primary/10 border-l-4 border-primary rounded-lg">
                <p className="text-sm font-medium mb-1">Note del Coach</p>
                <p className="text-sm text-muted-foreground">{plan.coach_notes}</p>
              </div>
            )}

            <div className="space-y-4 mt-4">
              {Object.entries(exercisesByDay).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun esercizio in questa scheda</p>
                </div>
              ) : (
                Object.entries(exercisesByDay).map(([day, dayExercises]) => (
                  <div key={day} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 font-medium">
                      {dayLabels[parseInt(day)] || `Giorno ${day}`}
                      <span className="text-muted-foreground ml-2 font-normal">
                        ({dayExercises.length} esercizi)
                      </span>
                    </div>
                    <div className="divide-y">
                      {dayExercises.map((ex, idx) => (
                        <div key={ex.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-medium">{ex.exercise?.name || "Esercizio"}</p>
                              {ex.exercise?.muscle_group && (
                                <Badge variant="outline" className="text-xs mt-0.5">
                                  {ex.exercise.muscle_group}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm">
                              {ex.sets} × {ex.reps}
                            </p>
                            {ex.notes && (
                              <p className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                                {ex.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Scheda non trovata</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutPlanViewDialog;
