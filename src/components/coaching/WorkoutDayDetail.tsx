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

interface SetCompletion {
  id?: string;
  set_number: number;
  client_notes: string;
  difficulty_rating: number;
  saved: boolean;
}

interface ExerciseWithSets extends WorkoutPlanExercise {
  setCompletions: SetCompletion[];
}

const WorkoutDayDetail = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [planName, setPlanName] = useState("");
  const [openExercises, setOpenExercises] = useState<Set<string>>(new Set());

  const dayNumber = parseInt(dayId || "1");

  useEffect(() => {
    if (profile?.user_id) {
      fetchDayExercises();
    }
  }, [profile?.user_id, dayId]);

  const fetchDayExercises = async () => {
    setLoading(true);
    const userId = profile?.user_id;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active workout plan
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("id, name")
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

    setPlanName(plans[0].name);

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
        exercise:exercises(id, name, description, muscle_group),
        video:exercise_videos(id, title, video_url)
      `)
      .eq("workout_plan_id", plans[0].id)
      .eq("day_of_week", dayNumber)
      .order("order_index");

    if (planExercises) {
      // Fetch existing completions
      const exerciseIds = planExercises.map(e => e.id);
      const { data: completions } = await supabase
        .from("workout_completions")
        .select("*")
        .eq("client_id", userId!)
        .in("workout_plan_exercise_id", exerciseIds);

      // Map exercises with their set completions
      const exercisesWithSets: ExerciseWithSets[] = planExercises.map(ex => {
        const numSets = ex.sets || 3;
        const existingCompletions = completions?.filter(c => c.workout_plan_exercise_id === ex.id) || [];
        
        const setCompletions: SetCompletion[] = [];
        for (let i = 1; i <= numSets; i++) {
          const existing = existingCompletions.find(c => c.set_number === i);
          setCompletions.push({
            id: existing?.id,
            set_number: i,
            client_notes: existing?.client_notes || "",
            difficulty_rating: existing?.difficulty_rating || 0,
            saved: !!existing
          });
        }

        return {
          ...ex,
          exercise: ex.exercise as unknown as Exercise,
          video: ex.video as unknown as ExerciseVideo | null,
          setCompletions
        };
      });

      setExercises(exercisesWithSets);
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

  const updateSetCompletion = (exerciseId: string, setNumber: number, field: 'client_notes' | 'difficulty_rating', value: string | number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        setCompletions: ex.setCompletions.map(set => {
          if (set.set_number !== setNumber) return set;
          return { ...set, [field]: value, saved: false };
        })
      };
    }));
  };

  const saveSetCompletion = async (exerciseId: string, setNumber: number) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    const setData = exercise?.setCompletions.find(s => s.set_number === setNumber);
    if (!exercise || !setData || !profile?.user_id) return;

    setSaving(`${exerciseId}-${setNumber}`);

    try {
      if (setData.id) {
        // Update existing
        await supabase
          .from("workout_completions")
          .update({
            client_notes: setData.client_notes,
            difficulty_rating: setData.difficulty_rating
          })
          .eq("id", setData.id);
      } else {
        // Insert new
        const { data } = await supabase
          .from("workout_completions")
          .insert({
            workout_plan_exercise_id: exerciseId,
            client_id: profile.user_id,
            set_number: setNumber,
            client_notes: setData.client_notes,
            difficulty_rating: setData.difficulty_rating
          })
          .select()
          .single();

        if (data) {
          setExercises(prev => prev.map(ex => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              setCompletions: ex.setCompletions.map(set => {
                if (set.set_number !== setNumber) return set;
                return { ...set, id: data.id, saved: true };
              })
            };
          }));
        }
      }

      toast.success("Salvato!");
      
      // Mark as saved and close the exercise accordion
      setExercises(prev => prev.map(ex => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          setCompletions: ex.setCompletions.map(set => {
            if (set.set_number !== setNumber) return set;
            return { ...set, saved: true };
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

  const getExerciseCompletionStatus = (exercise: ExerciseWithSets) => {
    const completed = exercise.setCompletions.filter(s => s.saved).length;
    const total = exercise.setCompletions.length;
    return { completed, total, isComplete: completed === total };
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
          <p className="text-sm text-muted-foreground">{planName}</p>
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
                              Completato
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display text-lg tracking-wider">
                          {exercise.exercise.name}
                        </h3>
                        <p className="text-primary font-medium text-sm">
                          {exercise.sets}x{exercise.reps}
                          <span className="text-muted-foreground ml-2">
                            ({status.completed}/{status.total} set)
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

                  {/* Sets - Client Editable */}
                  <CardContent className="p-4 space-y-4">
                    {exercise.setCompletions.map((set) => (
                      <div 
                        key={set.set_number} 
                        className={`
                          p-4 rounded-lg border transition-all
                          ${set.saved 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'bg-muted/30 border-border'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-display text-lg">
                            Set {String(set.set_number).padStart(2, '0')}
                          </span>
                          {set.saved && (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          )}
                        </div>

                        {/* Rating */}
                        <div className="mb-3">
                          <label className="text-sm text-muted-foreground block mb-2">
                            Come ti sei sentito? (1-10)
                          </label>
                          <LightningRating
                            value={set.difficulty_rating}
                            onChange={(val) => updateSetCompletion(exercise.id, set.set_number, 'difficulty_rating', val)}
                          />
                        </div>

                        {/* Notes */}
                        <div className="mb-3">
                          <Textarea
                            placeholder="Note su questo set (opzionale)..."
                            value={set.client_notes}
                            onChange={(e) => updateSetCompletion(exercise.id, set.set_number, 'client_notes', e.target.value)}
                            className="min-h-[60px] resize-none"
                          />
                        </div>

                        {/* Save Button */}
                        <Button
                          size="sm"
                          onClick={() => saveSetCompletion(exercise.id, set.set_number)}
                          disabled={saving === `${exercise.id}-${set.set_number}` || set.difficulty_rating === 0}
                          className="w-full gap-2"
                        >
                          {saving === `${exercise.id}-${set.set_number}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {set.saved ? "Aggiorna" : "Salva Set"}
                        </Button>
                      </div>
                    ))}
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
