import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Edit, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface WorkoutPlanExercise {
  id: string;
  day_of_week: number | null;
  sets: number | null;
  reps: string | null;
  notes: string | null;
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
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  onEdit: (planId: string) => void;
  onView: (planId: string) => void;
}

const dayLabels: Record<number, string> = {
  1: "G1",
  2: "G2",
  3: "G3",
  4: "G4",
  5: "G5",
  6: "G6",
  7: "G7"
};

const WorkoutPlanCard = ({ plan, onEdit, onView }: WorkoutPlanCardProps) => {
  const [exercises, setExercises] = useState<WorkoutPlanExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, [plan.id]);

  const fetchExercises = async () => {
    const { data, error } = await supabase
      .from("workout_plan_exercises")
      .select(`
        id,
        day_of_week,
        sets,
        reps,
        notes,
        exercise:exercises(id, name, muscle_group)
      `)
      .eq("workout_plan_id", plan.id)
      .order("day_of_week")
      .order("order_index");

    if (!error && data) {
      setExercises(data as unknown as WorkoutPlanExercise[]);
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

  const uniqueDays = Object.keys(exercisesByDay).length;
  const totalExercises = exercises.length;

  return (
    <Card className={plan.is_active ? "border-primary" : ""}>
      <CardContent className="p-4">
        {/* Header con info base */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{plan.name}</h4>
              {plan.is_active && (
                <Badge variant="default">Attiva</Badge>
              )}
            </div>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {plan.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(plan.start_date), "dd/MM/yyyy")} - {format(new Date(plan.end_date), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(plan.id)} className="gap-1">
              <Edit className="w-3 h-3" />
              Modifica
            </Button>
            <Button variant="default" size="sm" onClick={() => onView(plan.id)} className="gap-1">
              <Eye className="w-3 h-3" />
              Visualizza
            </Button>
          </div>
        </div>

        {/* Preview esercizi compatta */}
        <div 
          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-sm">
              <strong>{totalExercises}</strong> esercizi in <strong>{uniqueDays}</strong> giorni
            </span>
            {!loading && exercises.length > 0 && (
              <div className="flex gap-1">
                {Object.keys(exercisesByDay).slice(0, 5).map(day => (
                  <Badge key={day} variant="secondary" className="text-xs px-1.5">
                    {dayLabels[parseInt(day)] || `G${day}`}: {exercisesByDay[parseInt(day)].length}
                  </Badge>
                ))}
                {Object.keys(exercisesByDay).length > 5 && (
                  <Badge variant="secondary" className="text-xs px-1.5">+{Object.keys(exercisesByDay).length - 5}</Badge>
                )}
              </div>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Lista esercizi espansa */}
        {expanded && !loading && (
          <div className="mt-3 space-y-3">
            {Object.entries(exercisesByDay).map(([day, dayExercises]) => (
              <div key={day} className="p-3 border rounded-lg bg-background">
                <h5 className="font-medium text-sm mb-2 text-primary">
                  Giorno {day}
                </h5>
                <div className="space-y-1">
                  {dayExercises.map((ex, idx) => (
                    <div key={ex.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                        <span>{ex.exercise?.name || "Esercizio"}</span>
                        {ex.exercise?.muscle_group && (
                          <Badge variant="outline" className="text-xs">
                            {ex.exercise.muscle_group}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{ex.sets}x{ex.reps}</span>
                        {ex.notes && (
                          <span className="text-xs italic max-w-[150px] truncate" title={ex.notes}>
                            {ex.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkoutPlanCard;
