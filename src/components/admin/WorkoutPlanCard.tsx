import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Edit, Eye, Pause, Play, CheckCircle, Trash2, FileText } from "lucide-react";
import CoachTestNotesDialog from "@/components/admin/CoachTestNotesDialog";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const COLOR_MAP: Record<string, string> = {
  arancione: "#f97316",
  azzurro:   "#38bdf8",
  verde:     "#22c55e",
  giallo:    "#eab308",
  rosso:     "#ef4444",
  blu:       "#3b82f6",
  viola:     "#a855f7",
};

function renderColoredText(value: string) {
  const tokens = value.split(/(\s+)/);
  return tokens.map((token, i) => {
    const color = COLOR_MAP[token.toLowerCase().replace(/[^a-zàèéìòù]/gi, "")];
    if (color) return <span key={i} style={{ color, fontWeight: 700 }}>{token}</span>;
    return <span key={i}>{token}</span>;
  });
}

interface WorkoutPlanExercise {
  id: string;
  day_of_week: number | null;
  exercise_name: string | null;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status?: string;
  plan_type?: string;
}

interface WorkoutPlanCardProps {
  plan: WorkoutPlan;
  onEdit: (planId: string) => void;
  onView: (planId: string) => void;
  onDelete?: () => void;
}

const WorkoutPlanCard = ({ plan, onEdit, onView, onDelete }: WorkoutPlanCardProps) => {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<WorkoutPlanExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, [plan.id]);

  const fetchExercises = async () => {
    const { data } = await supabase
      .from("workout_plan_exercises")
      .select("id, day_of_week, exercise_name")
      .eq("workout_plan_id", plan.id)
      .order("day_of_week")
      .order("order_index");

    if (data) setExercises(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("workout_plans")
      .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
      .eq("id", plan.id);

    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare la scheda", variant: "destructive" });
    } else {
      toast({ title: "Scheda eliminata" });
      onDelete?.();
    }
    setDeleting(false);
  };

  const exercisesByDay = exercises.reduce((acc, ex) => {
    const day = ex.day_of_week || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(ex);
    return acc;
  }, {} as Record<number, WorkoutPlanExercise[]>);

  const uniqueDays = Object.keys(exercisesByDay).length;
  const totalExercises = exercises.length;

  const status = (plan as any).status || (plan.is_active ? "attiva" : "conclusa");
  const isTest = plan.plan_type === "test";

  const statusBadge = () => {
    switch (status) {
      case "attiva": return <Badge variant="default" className="gap-1"><Play className="w-3 h-3" />Attiva</Badge>;
      case "in_pausa": return <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 border-yellow-500/30"><Pause className="w-3 h-3" />In Pausa</Badge>;
      case "conclusa": return <Badge variant="outline" className="gap-1"><CheckCircle className="w-3 h-3" />Conclusa</Badge>;
      default: return null;
    }
  };

  return (
    <Card className={status === "attiva" ? "border-primary" : status === "in_pausa" ? "border-yellow-500/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{plan.name}</h4>
              {statusBadge()}
              {isTest && <Badge variant="secondary" className="text-xs">Test</Badge>}
            </div>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(plan.start_date), "dd/MM/yyyy")} - {format(new Date(plan.end_date), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isTest && (
              <CoachTestNotesDialog planId={plan.id} planName={plan.name} onNotesUpdated={onDelete} />
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(plan.id)} className="gap-1">
              <Edit className="w-3 h-3" /> Modifica
            </Button>
            <Button variant="default" size="sm" onClick={() => onView(plan.id)} className="gap-1">
              <Eye className="w-3 h-3" /> Visualizza
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare questa scheda?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare questa scheda? L'operazione è irreversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-start gap-2">
            <Dumbbell className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">Esercizi: </span>
              {loading ? (
                <span className="text-sm text-muted-foreground">Caricamento...</span>
              ) : exercises.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">Nessun esercizio</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {exercises.map((ex, idx) => (
                    <span key={ex.id}>
                      {idx + 1}-{ex.exercise_name ? renderColoredText(ex.exercise_name) : "Esercizio"}
                      {idx < exercises.length - 1 && ", "}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Totale: <strong>{totalExercises}</strong> esercizi in <strong>{uniqueDays}</strong> giorni
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutPlanCard;
