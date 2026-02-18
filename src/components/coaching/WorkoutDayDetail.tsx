import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Loader2, 
  ArrowLeft, 
  Play, 
  MessageSquare,
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import LightningRating from "./LightningRating";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
}

interface ExerciseVideo {
  id: string;
  title: string;
  video_url: string;
}

interface WorkoutPlanExercise {
  id: string;
  sets: number | null;
  reps: string | null;
  notes: string | null;
  rest_seconds: number | null;
  order_index: number;
  exercise: Exercise;
  video: ExerciseVideo | null;
}

interface WeekCompletion {
  id?: string;
  week_number: number;
  client_notes: string;
  difficulty_rating: number;
  saved: boolean;
}

interface ExerciseWithWeeks extends WorkoutPlanExercise {
  weekCompletions: WeekCompletion[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

const WorkoutDayDetail = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithWeeks[]>([]);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [totalWeeks, setTotalWeeks] = useState(1);
  const [openExercises, setOpenExercises] = useState<Set<string>>(new Set());

  const dayNumber = parseInt(dayId || "1");

  // Calculate current week number based on plan start date
  const calculateCurrentWeek = (startDate: string): number => {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  };

  // Calculate total weeks in the plan
  const calculateTotalWeeks = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
  };

  useEffect(() => {
    if (profile?.user_id) {
      fetchDayExercises();
    }
  }, [profile?.user_id, dayId]);

  const fetchDayExercises = async () => {
    setLoading(true);
    const userId = profile?.user_id;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active workout plan with dates
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("id, name, start_date, end_date")
      .eq("client_id", userId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!plans || plans.length === 0) {
      setLoading(false);
      return;
    }

    const activePlan = plans[0];
    setPlan(activePlan);
    
    const weeks = calculateTotalWeeks(activePlan.start_date, activePlan.end_date);
    const current = Math.min(calculateCurrentWeek(activePlan.start_date), weeks);
    setTotalWeeks(weeks);
    setCurrentWeek(current);

    // Fetch exercises for this day
    const { data: planExercises } = await supabase
      .from("workout_plan_exercises")
      .select(`
        id,
        sets,
        reps,
        notes,
        rest_seconds,
        order_index,
        exercise_name,
        exercise:exercises(id, name, description, muscle_group),
        video:exercise_videos(id, title, video_url)
      `)
      .eq("workout_plan_id", activePlan.id)
      .eq("day_of_week", dayNumber)
      .order("order_index");

    if (planExercises) {
      // Fetch existing completions (now using set_number as week_number)
      const exerciseIds = planExercises.map(e => e.id);
      const { data: completions } = await supabase
        .from("workout_completions")
        .select("*")
        .eq("client_id", userId!)
        .in("workout_plan_exercise_id", exerciseIds);

      // Map exercises with their week completions
      const exercisesWithWeeks: ExerciseWithWeeks[] = planExercises.map(ex => {
        const existingCompletions = completions?.filter(c => c.workout_plan_exercise_id === ex.id) || [];
        
        // Create week slots for all weeks of the plan
        const weekCompletions: WeekCompletion[] = [];
        for (let w = 1; w <= weeks; w++) {
          const existing = existingCompletions.find(c => c.set_number === w);
          weekCompletions.push({
            id: existing?.id,
            week_number: w,
            client_notes: existing?.client_notes || "",
            difficulty_rating: existing?.difficulty_rating || 0,
            saved: !!existing
          });
        }

        // Usa exercise_name libero se disponibile, altrimenti il nome dal DB
        const exerciseFromDB = ex.exercise as unknown as Exercise | null;
        const exerciseName = (ex as any).exercise_name || exerciseFromDB?.name || "Esercizio";
        const exerciseObj: Exercise = exerciseFromDB
          ? { ...exerciseFromDB, name: exerciseName }
          : { id: ex.id, name: exerciseName, description: null, muscle_group: null };

        return {
          ...ex,
          exercise: exerciseObj,
          video: ex.video as unknown as ExerciseVideo | null,
          weekCompletions
        };
      });

      setExercises(exercisesWithWeeks);
    }

    setLoading(false);
  };

  const toggleExercise = (exerciseId: string) => {
    setOpenExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const updateWeekCompletion = (exerciseId: string, weekNumber: number, field: 'client_notes' | 'difficulty_rating', value: string | number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        weekCompletions: ex.weekCompletions.map(week => {
          if (week.week_number !== weekNumber) return week;
          return { ...week, [field]: value, saved: false };
        })
      };
    }));
  };

  const saveWeekCompletion = async (exerciseId: string, weekNumber: number) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    const weekData = exercise?.weekCompletions.find(w => w.week_number === weekNumber);
    if (!exercise || !weekData || !profile?.user_id) return;

    setSaving(`${exerciseId}-${weekNumber}`);

    try {
      if (weekData.id) {
        // Update existing
        await supabase
          .from("workout_completions")
          .update({
            client_notes: weekData.client_notes,
            difficulty_rating: weekData.difficulty_rating
          })
          .eq("id", weekData.id);
      } else {
        // Insert new - using set_number field to store week_number
        const { data } = await supabase
          .from("workout_completions")
          .insert({
            workout_plan_exercise_id: exerciseId,
            client_id: profile.user_id,
            set_number: weekNumber, // Reusing set_number as week_number
            client_notes: weekData.client_notes,
            difficulty_rating: weekData.difficulty_rating
          })
          .select()
          .single();

        if (data) {
          setExercises(prev => prev.map(ex => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              weekCompletions: ex.weekCompletions.map(week => {
                if (week.week_number !== weekNumber) return week;
                return { ...week, id: data.id, saved: true };
              })
            };
          }));
        }
      }

      toast.success("Salvato!");
      
      // Mark as saved
      setExercises(prev => prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          weekCompletions: ex.weekCompletions.map(week => {
            if (week.week_number !== weekNumber) return week;
            return { ...week, saved: true };
          })
        };
      }));

      // Auto-close accordion after saving
      setOpenExercises(prev => {
        const newSet = new Set(prev);
        newSet.delete(exerciseId);
        return newSet;
      });
    } catch (error) {
      toast.error("Errore nel salvataggio");
    }

    setSaving(null);
  };

  const getExerciseCompletionStatus = (exercise: ExerciseWithWeeks) => {
    const completed = exercise.weekCompletions.filter(w => w.saved).length;
    const total = exercise.weekCompletions.length;
    return { completed, total, isComplete: completed === total };
  };

  // Check if a week can be rated (only current or past weeks)
  const canRateWeek = (weekNumber: number): boolean => {
    return weekNumber <= currentWeek;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/coaching/scheda">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl tracking-wider">Giorno {dayNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {plan?.name} • Settimana {currentWeek} di {totalWeeks}
          </p>
        </div>
      </div>

      {/* Exercises List - Collapsible */}
      <div className="space-y-3">
        {exercises.map((exercise, index) => {
          const status = getExerciseCompletionStatus(exercise);
          const isOpen = openExercises.has(exercise.id);

          return (
            <Collapsible key={exercise.id} open={isOpen} onOpenChange={() => toggleExercise(exercise.id)}>
              <Card className="overflow-hidden border-border">
                {/* Exercise Header - Always visible, clickable */}
                <CollapsibleTrigger className="w-full">
                  <div className="bg-gradient-to-r from-card to-muted/30 p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-display text-lg text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-xs">
                            {exercise.exercise.muscle_group || "Generale"}
                          </Badge>
                          {status.isComplete && (
                            <Badge variant="default" className="text-xs gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Tutte le settimane
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display text-lg tracking-wider">
                          {exercise.exercise.name}
                        </h3>
                        <p className="text-primary font-medium text-sm">
                          {exercise.sets}x{exercise.reps}
                          <span className="text-muted-foreground ml-2">
                            ({status.completed}/{status.total} sett. valutate)
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {exercise.video && (
                        <a 
                          href={exercise.video.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm" className="gap-2">
                            <Play className="w-4 h-4" />
                            Video
                          </Button>
                        </a>
                      )}
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {/* Coach Notes - Read Only */}
                  {exercise.notes && (
                    <div className="px-4 py-3 bg-muted/50 border-t border-border">
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <MessageSquare className="w-4 h-4" />
                        Nota del Coach
                      </div>
                      <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                    </div>
                  )}

                  {/* Weeks - Client Editable */}
                  <CardContent className="p-4 space-y-4">
                    {exercise.weekCompletions.map((week) => {
                      const isCurrentWeek = week.week_number === currentWeek;
                      const isPastWeek = week.week_number < currentWeek;
                      const isFutureWeek = week.week_number > currentWeek;

                      return (
                        <div 
                          key={week.week_number} 
                          className={`
                            p-4 rounded-lg border transition-all
                            ${week.saved 
                              ? 'bg-primary/5 border-primary/30' 
                              : isCurrentWeek
                                ? 'bg-accent/10 border-accent/50 ring-2 ring-accent/30'
                                : isFutureWeek
                                  ? 'bg-muted/20 border-border/50 opacity-60'
                                  : 'bg-muted/30 border-border'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-lg">
                                Settimana {week.week_number}
                              </span>
                              {isCurrentWeek && !week.saved && (
                                <Badge variant="secondary" className="text-xs">
                                  Corrente
                                </Badge>
                              )}
                              {isFutureWeek && (
                                <Badge variant="outline" className="text-xs">
                                  Non ancora disponibile
                                </Badge>
                              )}
                            </div>
                            {week.saved && (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            )}
                          </div>

                          {canRateWeek(week.week_number) ? (
                            <>
                              {/* Rating */}
                              <div className="mb-3">
                                <label className="text-sm text-muted-foreground block mb-2">
                                  Come è andato l'esercizio questa settimana? (1-10)
                                </label>
                                <LightningRating
                                  value={week.difficulty_rating}
                                  onChange={(val) => updateWeekCompletion(exercise.id, week.week_number, 'difficulty_rating', val)}
                                />
                              </div>

                              {/* Notes */}
                              <div className="mb-3">
                                <Textarea
                                  placeholder="Note sulla settimana (opzionale)..."
                                  value={week.client_notes}
                                  onChange={(e) => updateWeekCompletion(exercise.id, week.week_number, 'client_notes', e.target.value)}
                                  className="min-h-[60px] resize-none"
                                />
                              </div>

                              {/* Save Button */}
                              <Button
                                size="sm"
                                onClick={() => saveWeekCompletion(exercise.id, week.week_number)}
                                disabled={saving === `${exercise.id}-${week.week_number}` || week.difficulty_rating === 0}
                                className="w-full gap-2"
                              >
                                {saving === `${exercise.id}-${week.week_number}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                {week.saved ? "Aggiorna valutazione" : "Salva valutazione"}
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Potrai valutare questa settimana quando sarà iniziata
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Nessun esercizio per questo giorno</p>
        </div>
      )}
    </div>
  );
};

export default WorkoutDayDetail;
