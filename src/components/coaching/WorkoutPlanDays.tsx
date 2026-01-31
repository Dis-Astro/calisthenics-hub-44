import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  coach_notes: string | null;
}

interface DayExercise {
  day_of_week: number;
  exercise_count: number;
  completed_count: number;
}

const WorkoutPlanDays = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [dayExercises, setDayExercises] = useState<DayExercise[]>([]);

  useEffect(() => {
    if (profile?.user_id) {
      fetchWorkoutPlan();
    }
  }, [profile?.user_id]);

  const fetchWorkoutPlan = async () => {
    setLoading(true);
    const userId = profile?.user_id;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active workout plan
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("client_id", userId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (plans && plans.length > 0) {
      setActivePlan(plans[0]);

      // Fetch exercises grouped by day
      const { data: exercises } = await supabase
        .from("workout_plan_exercises")
        .select("id, day_of_week")
        .eq("workout_plan_id", plans[0].id);

      if (exercises) {
        // Group by day
        const dayMap = new Map<number, number>();
        exercises.forEach(ex => {
          const day = ex.day_of_week ?? 1;
          dayMap.set(day, (dayMap.get(day) || 0) + 1);
        });

        // Fetch completions
        const exerciseIds = exercises.map(e => e.id);
        const { data: completions } = await supabase
          .from("workout_completions")
          .select("workout_plan_exercise_id")
          .eq("client_id", userId!)
          .in("workout_plan_exercise_id", exerciseIds);

        const completedSet = new Set(completions?.map(c => c.workout_plan_exercise_id) || []);

        // Build day summary
        const dayCompletions = new Map<number, number>();
        exercises.forEach(ex => {
          const day = ex.day_of_week ?? 1;
          if (completedSet.has(ex.id)) {
            dayCompletions.set(day, (dayCompletions.get(day) || 0) + 1);
          }
        });

        const days: DayExercise[] = Array.from(dayMap.entries())
          .map(([day, count]) => ({
            day_of_week: day,
            exercise_count: count,
            completed_count: dayCompletions.get(day) || 0
          }))
          .sort((a, b) => a.day_of_week - b.day_of_week);

        setDayExercises(days);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="text-center py-20">
        <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h2 className="font-display text-2xl mb-2">Nessuna Scheda Attiva</h2>
        <p className="text-muted-foreground">Attendi la tua scheda personalizzata dal coach</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-lg p-6 border border-border">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Dumbbell className="w-5 h-5" />
          <span className="text-sm font-medium tracking-wider uppercase">Scheda Attiva</span>
        </div>
        <h2 className="font-display text-3xl tracking-wider mb-2">{activePlan.name}</h2>
        {activePlan.description && (
          <p className="text-muted-foreground">{activePlan.description}</p>
        )}
        {activePlan.coach_notes && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border-l-2 border-primary">
            <p className="text-sm font-medium mb-1">Note del Coach:</p>
            <p className="text-sm text-muted-foreground">{activePlan.coach_notes}</p>
          </div>
        )}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {dayExercises.map((day) => {
          const isComplete = day.completed_count >= day.exercise_count && day.exercise_count > 0;
          const progress = day.exercise_count > 0 
            ? Math.round((day.completed_count / day.exercise_count) * 100) 
            : 0;

          return (
            <Link 
              key={day.day_of_week} 
              to={`/coaching/scheda/${day.day_of_week}`}
            >
              <Card className={`
                relative overflow-hidden transition-all duration-200 cursor-pointer
                hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10
                ${isComplete ? 'border-primary/50 bg-primary/5' : 'border-border'}
              `}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-display text-4xl">
                      {day.day_of_week}
                    </span>
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Giorno {day.day_of_week}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                      {day.exercise_count} esercizi
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {day.completed_count}/{day.exercise_count} completati
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {dayExercises.length === 0 && (
        <div className="text-center py-10">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Nessun esercizio programmato in questa scheda</p>
        </div>
      )}
    </div>
  );
};

export default WorkoutPlanDays;
