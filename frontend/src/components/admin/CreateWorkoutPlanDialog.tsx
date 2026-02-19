import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ExerciseNameInput from "@/components/admin/ExerciseNameInput";

interface PlanExercise {
  exercise_name_free: string;
  day_of_week: number;
  sets: number;
  reps: string;
}

interface CreateWorkoutPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess: () => void;
}

const dayLabels = ["Giorno 1", "Giorno 2", "Giorno 3", "Giorno 4", "Giorno 5", "Giorno 6", "Giorno 7"];

const CreateWorkoutPlanDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess
}: CreateWorkoutPlanDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_weeks: "4",
    coach_notes: ""
  });

  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);

  useEffect(() => {
    if (open) {
      setFormData({ name: "", description: "", duration_weeks: "4", coach_notes: "" });
      setPlanExercises([]);
    }
  }, [open]);

  const addExercise = () => {
    setPlanExercises(prev => [
      ...prev,
      { exercise_name_free: "", day_of_week: 1, sets: 3, reps: "10" }
    ]);
  };

  const removeExercise = (index: number) => {
    setPlanExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof PlanExercise, value: string | number) => {
    setPlanExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: "Errore", description: "Inserisci un nome per la scheda", variant: "destructive" });
      return;
    }
    if (planExercises.length === 0) {
      toast({ title: "Errore", description: "Aggiungi almeno un esercizio", variant: "destructive" });
      return;
    }
    const invalidExercises = planExercises.filter(e => !e.exercise_name_free.trim());
    if (invalidExercises.length > 0) {
      toast({ title: "Errore", description: "Scrivi il nome per ogni esercizio", variant: "destructive" });
      return;
    }

    setSaving(true);

    const startDate = new Date();
    const weeks = parseInt(formData.duration_weeks) || 4;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeks * 7);

    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        client_id: clientId,
        coach_id: profile?.user_id,
        name: formData.name,
        description: formData.description || null,
        coach_notes: formData.coach_notes || null,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        is_active: true
      })
      .select()
      .single();

    if (planError) {
      toast({ title: "Errore", description: "Impossibile creare la scheda", variant: "destructive" });
      setSaving(false);
      return;
    }

    const exercisesToInsert = planExercises.map((ex, index) => ({
      workout_plan_id: plan.id,
      exercise_id: null,
      exercise_name: ex.exercise_name_free.trim(),
      day_of_week: ex.day_of_week,
      sets: ex.sets,
      reps: ex.reps,
      notes: null,
      order_index: index
    }));

    const { error: exercisesError } = await supabase
      .from("workout_plan_exercises")
      .insert(exercisesToInsert);

    if (exercisesError) {
      toast({ title: "Attenzione", description: "Scheda creata ma alcuni esercizi non salvati", variant: "destructive" });
    } else {
      toast({ title: "Scheda creata!" });
      onSuccess();
      onOpenChange(false);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">Nuova Scheda di Allenamento</DialogTitle>
          <DialogDescription>Crea una nuova scheda per {clientName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Scheda *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es. Scheda Forza - Febbraio"
              />
            </div>
            <div className="space-y-2">
              <Label>Durata (settimane)</Label>
              <Select value={formData.duration_weeks} onValueChange={(v) => setFormData({ ...formData, duration_weeks: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 4, 5, 6, 7, 8].map(w => (
                    <SelectItem key={w} value={w.toString()}>{w} settimane</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Obiettivi della scheda..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Note per il Cliente</Label>
            <Textarea value={formData.coach_notes} onChange={(e) => setFormData({ ...formData, coach_notes: e.target.value })} placeholder="Note tecniche che il cliente vedrà..." rows={2} />
          </div>

          {/* Esercizi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Esercizi della Scheda</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scrivi liberamente — includi il colore dell'elastico nel nome (es. "Elastico arancione - Squat")
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addExercise} className="gap-2">
                <Plus className="w-4 h-4" />
                Aggiungi
              </Button>
            </div>

            {planExercises.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                <p className="text-sm">Nessun esercizio aggiunto</p>
                <Button type="button" variant="ghost" size="sm" onClick={addExercise} className="mt-2">
                  + Aggiungi il primo esercizio
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {planExercises.map((ex, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-5">#{index + 1}</span>
                      <ExerciseNameInput
                        value={ex.exercise_name_free}
                        onChange={(val) => updateExercise(index, "exercise_name_free", val)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-7">
                      <div className="space-y-1">
                        <Label className="text-xs">Giorno</Label>
                        <Select value={ex.day_of_week.toString()} onValueChange={(v) => updateExercise(index, "day_of_week", parseInt(v))}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {dayLabels.map((label, i) => (
                              <SelectItem key={i} value={(i + 1).toString()}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Serie</Label>
                        <Input type="number" value={ex.sets} onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 3)} min={1} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ripetizioni</Label>
                        <Input value={ex.reps} onChange={(e) => updateExercise(index, "reps", e.target.value)} placeholder="10-12" className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Crea Scheda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkoutPlanDialog;
