import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  User,
  Loader2,
  Zap,
  Dumbbell,
  Calendar,
  ChevronRight,
  ArrowLeft
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
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_id) fetchFeedbacks();
  }, [profile?.user_id]);

  const fetchFeedbacks = async () => {
    setLoading(true);

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

    const { data: completions } = await supabase
      .from("workout_completions")
      .select("*")
      .in("workout_plan_exercise_id", exerciseIds)
      .not("client_notes", "is", null)
      .order("completed_at", { ascending: false });

    const { data: ratedOnly } = await supabase
      .from("workout_completions")
      .select("*")
      .in("workout_plan_exercise_id", exerciseIds)
      .is("client_notes", null)
      .not("difficulty_rating", "is", null)
      .gt("difficulty_rating", 0)
      .order("completed_at", { ascending: false });

    const allCompletions = [...(completions || []), ...(ratedOnly || [])];

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

    items.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    setFeedbacks(items);
    setLoading(false);
  };

  const clients = useMemo(() => {
    const map = new Map<string, { name: string; count: number; lastDate: string }>();
    feedbacks.forEach(fb => {
      const existing = map.get(fb.client_id);
      if (!existing) {
        map.set(fb.client_id, { name: fb.client_name, count: 1, lastDate: fb.completed_at });
      } else {
        existing.count++;
        if (new Date(fb.completed_at) > new Date(existing.lastDate)) {
          existing.lastDate = fb.completed_at;
        }
      }
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    if (!selectedClientId) return [];
    return feedbacks.filter(fb => fb.client_id === selectedClientId);
  }, [feedbacks, selectedClientId]);

  const selectedClientName = clients.find(c => c.id === selectedClientId)?.name;

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
      ) : !selectedClientId ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">Seleziona un cliente per vedere i suoi feedback</p>
          {clients.map(client => (
            <Card
              key={client.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedClientId(client.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.count} feedback • ultimo: {format(parseISO(client.lastDate), "dd MMM yyyy", { locale: it })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedClientId(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna all'elenco clienti
          </button>
          <h2 className="text-lg font-semibold mb-3">{selectedClientName}</h2>
          {filteredFeedbacks.map(fb => (
            <Card key={fb.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
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
