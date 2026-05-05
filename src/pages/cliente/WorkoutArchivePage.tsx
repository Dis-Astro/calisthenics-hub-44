import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ClientLayout from "@/components/coaching/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell, Calendar, ChevronRight, Archive } from "lucide-react";
import { format, isPast, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status?: string;
  plan_type?: string;
}

const WorkoutArchivePage = () => {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile?.user_id) return;
      const { data } = await supabase
        .from("workout_plans")
        .select("id, name, description, start_date, end_date, status, plan_type")
        .eq("client_id", profile.user_id)
        .is("deleted_at" as any, null)
        .order("end_date", { ascending: false });
      setPlans((data as any) || []);
      setLoading(false);
    };
    load();
  }, [profile?.user_id]);

  const today = new Date();

  return (
    <ClientLayout title="ARCHIVIO SCHEDE">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-lg p-6 border border-border">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Archive className="w-5 h-5" />
            <span className="text-sm font-medium tracking-wider uppercase">Storico</span>
          </div>
          <h2 className="font-display text-2xl tracking-wider">Tutte le tue schede e test</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consulta in sola lettura tutte le schede passate. I tuoi commenti restano visibili.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20">
            <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nessuna scheda nello storico</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {plans.map((p) => {
              const start = new Date(p.start_date);
              const end = new Date(p.end_date);
              const isCurrent =
                isWithinInterval(today, { start, end }) && p.status === "attiva";
              const expired = isPast(end);
              return (
                <Link key={p.id} to={`/coaching/scheda?planId=${p.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {p.plan_type === "test" ? (
                          <span className="text-xl">🧪</span>
                        ) : (
                          <Dumbbell className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display text-lg tracking-wide truncate">{p.name}</h3>
                          {p.plan_type === "test" && (
                            <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400">TEST</Badge>
                          )}
                          {isCurrent && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">In corso</Badge>
                          )}
                          {expired && !isCurrent && (
                            <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Scaduta</Badge>
                          )}
                          {p.status === "in_pausa" && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">In pausa</Badge>
                          )}
                          {p.status === "sospesa" && (
                            <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Sospesa</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(start, "dd MMM yyyy", { locale: it })} – {format(end, "dd MMM yyyy", { locale: it })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default WorkoutArchivePage;
