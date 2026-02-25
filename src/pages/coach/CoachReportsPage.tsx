import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  User,
  Loader2,
  Zap,
  Dumbbell,
  Calendar
} from "lucide-react";
import CoachLayout from "@/components/coach/CoachLayout";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface FeedbackItem {
  id: string;
  client_notes: string | null;
  difficulty_rating: number | null;
  completed_at: string;
  set_number: number;
  client_id: string;
  client_name: string;
  exercise_name: string;
  plan_name: string;
}

const CoachReportsPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (profile?.user_id) fetchFeedbacks();
  }, [profile?.user_id]);

  const fetchFeedbacks = async () => {
    setLoading(true);

    // Get all workout plans managed by this coach
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("id, name, client_id")
      .eq("coach_id", profile?.user_id);

    if (!plans || plans.length === 0) {
      setFeedbacks([]);
      setLoading(false);
      return;
    }

    const planIds = plans.map(p => p.id);
    const clientIds = [...new Set(plans.map(p => p.client_id))];

    // Fetch exercises for these plans
    const { data: exercises } = await supabase
      .from("workout_plan_exercises")
      .select("id, exercise_name, workout_plan_id")
      .in("workout_plan_id", planIds);

    if (!exercises || exercises.length === 0) {
      setFeedbacks([]);
      setLoading(false);
      return;
    }

    const exerciseIds = exercises.map(e => e.id);

    // Fetch completions with notes
    const { data: completions } = await supabase
      .from("workout_completions")
      .select("*")
      .in("workout_plan_exercise_id", exerciseIds)
      .not("client_notes", "is", null)
      .order("completed_at", { ascending: false });

    // Also get completions with ratings but no notes
    const { data: ratedOnly } = await supabase
      .from("workout_completions")
      .select("*")
      .in("workout_plan_exercise_id", exerciseIds)
      .is("client_notes", null)
      .not("difficulty_rating", "is", null)
      .gt("difficulty_rating", 0)
      .order("completed_at", { ascending: false });

    const allCompletions = [...(completions || []), ...(ratedOnly || [])];

    // Fetch client profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .in("user_id", clientIds);

    const clientMap = new Map(profiles?.map(p => [p.user_id, `${p.first_name} ${p.last_name}`]) || []);
    const exerciseMap = new Map(exercises.map(e => [e.id, { name: e.exercise_name || "Esercizio", planId: e.workout_plan_id }]));
    const planMap = new Map(plans.map(p => [p.id, { name: p.name, clientId: p.client_id }]));

    const items: FeedbackItem[] = allCompletions.map(c => {
      const ex = exerciseMap.get(c.workout_plan_exercise_id);
      const plan = ex ? planMap.get(ex.planId) : null;
      return {
        id: c.id,
        client_notes: c.client_notes,
        difficulty_rating: c.difficulty_rating,
        completed_at: c.completed_at,
        set_number: c.set_number,
        client_id: c.client_id,
        client_name: clientMap.get(c.client_id) || "Cliente",
        exercise_name: ex?.name || "Esercizio",
        plan_name: plan?.name || "Scheda",
      };
    });

    // Sort by date desc
    items.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    setFeedbacks(items);
    setLoading(false);
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <Zap key={i} className={`w-3 h-3 ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating}/10</span>
      </div>
    );
  };

  return (
    <CoachLayout title="FEEDBACK CLIENTI" icon={<MessageSquare className="w-6 h-6" />}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessun feedback ricevuto dai clienti</p>
            <p className="text-sm mt-1">I feedback appariranno qui quando i clienti valuteranno i loro esercizi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(fb => (
            <Card key={fb.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <User className="w-3 h-3" />
                        {fb.client_name}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Dumbbell className="w-3 h-3" />
                        {fb.exercise_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Settimana {fb.set_number} • {fb.plan_name}
                      </span>
                    </div>
                    {fb.difficulty_rating && fb.difficulty_rating > 0 && renderRating(fb.difficulty_rating)}
                    {fb.client_notes && (
                      <p className="text-sm bg-muted/50 rounded-lg p-3 border border-border">
                        {fb.client_notes}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3 h-3" />
                    {format(parseISO(fb.completed_at), "dd MMM yyyy", { locale: it })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CoachLayout>
  );
};

export default CoachReportsPage;
