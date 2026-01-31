import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ArrowLeft, 
  Play, 
  MessageSquare,
  CheckCircle2,
  Save
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
      
      // Mark as saved
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
    } catch (error) {
      toast.error("Errore nel salvataggio");
    }

    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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

      {/* Exercises List */}
      <div className="space-y-6">
        {exercises.map((exercise, index) => (
          <Card key={exercise.id} className="overflow-hidden border-border">
            {/* Exercise Header */}
            <div className="bg-gradient-to-r from-card to-muted/30 p-4 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {exercise.exercise.muscle_group || "Generale"}
                    </Badge>
                  </div>
                  <h3 className="font-display text-xl tracking-wider">
                    {exercise.exercise.name}
                  </h3>
                  <p className="text-primary font-medium mt-1">
                    {exercise.sets}x{exercise.reps}
                  </p>
                </div>
                
                {exercise.video && (
                  <a 
                    href={exercise.video.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <Play className="w-4 h-4" />
                      Video
                    </Button>
                  </a>
                )}
              </div>

              {/* Coach Notes - Read Only */}
              {exercise.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg opacity-80">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <MessageSquare className="w-4 h-4" />
                    Nota del Coach
                  </div>
                  <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                </div>
              )}
            </div>

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
                    disabled={saving === `${exercise.id}-${set.set_number}` || (set.saved && !set.client_notes && set.difficulty_rating === 0)}
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
          </Card>
        ))}
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
