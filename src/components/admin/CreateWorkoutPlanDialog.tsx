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
import { format, addMonths } from "date-fns";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
}

interface PlanExercise {
  exercise_id: string;
  day_of_week: number;
  sets: number;
  reps: string;
  notes: string;
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_weeks: "4",
    coach_notes: ""
  });

  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);

  useEffect(() => {
    if (open) {
      fetchExercises();
      // Reset form
      setFormData({ name: "", description: "", duration_weeks: "4", coach_notes: "" });
      setPlanExercises([]);
    }
  }, [open]);

  const fetchExercises = async () => {
    const { data } = await supabase
      .from("exercises")
      .select("id, name, muscle_group")
      .order("name");
    setExercises(data || []);
  };

  const addExercise = () => {
    setPlanExercises([
      ...planExercises,
      { exercise_id: "", day_of_week: 1, sets: 3, reps: "10", notes: "" }
    ]);
  };

  const removeExercise = (index: number) => {
    setPlanExercises(planExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof PlanExercise, value: string | number) => {
    const updated = [...planExercises];
    updated[index] = { ...updated[index], [field]: value };
    setPlanExercises(updated);
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

    const invalidExercises = planExercises.filter(e => !e.exercise_id);
    if (invalidExercises.length > 0) {
      toast({ title: "Errore", description: "Seleziona un esercizio per ogni riga", variant: "destructive" });
      return;
    }

    setSaving(true);

    const startDate = new Date();
    const weeks = parseInt(formData.duration_weeks) || 4;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7));

    // Create workout plan
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
      console.error("Plan error:", planError);
      toast({ title: "Errore", description: "Impossibile creare la scheda", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Create exercises
    const exercisesToInsert = planExercises.map((ex, index) => ({
      workout_plan_id: plan.id,
      exercise_id: ex.exercise_id,
      day_of_week: ex.day_of_week,
      sets: ex.sets,
      reps: ex.reps,
      notes: ex.notes || null,
      order_index: index
    }));

    const { error: exercisesError } = await supabase
      .from("workout_plan_exercises")
      .insert(exercisesToInsert);

    if (exercisesError) {
      console.error("Exercises error:", exercisesError);
      toast({ title: "Attenzione", description: "Scheda creata ma alcuni esercizi non sono stati salvati", variant: "destructive" });
    } else {
      toast({ title: "Successo", description: "Scheda di allenamento creata!" });
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
          <DialogDescription>
            Crea una nuova scheda per {clientName}
          </DialogDescription>
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
              <Select 
                value={formData.duration_weeks} 
                onValueChange={(v) => setFormData({ ...formData, duration_weeks: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 5, 6, 7, 8].map(w => (
                    <SelectItem key={w} value={w.toString()}>{w} settimane</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrivi gli obiettivi della scheda..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Note per il Cliente</Label>
            <Textarea
              value={formData.coach_notes}
              onChange={(e) => setFormData({ ...formData, coach_notes: e.target.value })}
              placeholder="Note tecniche che il cliente vedrà..."
              rows={2}
            />
          </div>

          {/* Esercizi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Esercizi della Scheda</Label>
              <Button type="button" variant="outline" size="sm" onClick={addExercise} className="gap-2">
                <Plus className="w-4 h-4" />
                Aggiungi Esercizio
              </Button>
            </div>

            {planExercises.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                <p>Nessun esercizio aggiunto</p>
                <Button type="button" variant="ghost" size="sm" onClick={addExercise} className="mt-2">
                  + Aggiungi il primo esercizio
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {planExercises.map((ex, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <Select 
                        value={ex.exercise_id} 
                        onValueChange={(v) => updateExercise(index, "exercise_id", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleziona esercizio" />
                        </SelectTrigger>
                        <SelectContent>
                          {exercises.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} {e.muscle_group && `(${e.muscle_group})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExercise(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Giorno</Label>
                        <Select 
                          value={ex.day_of_week.toString()} 
                          onValueChange={(v) => updateExercise(index, "day_of_week", parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dayLabels.map((label, i) => (
                              <SelectItem key={i} value={(i + 1).toString()}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Serie</Label>
                        <Input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 3)}
                          min={1}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ripetizioni</Label>
                        <Input
                          value={ex.reps}
                          onChange={(e) => updateExercise(index, "reps", e.target.value)}
                          placeholder="10-12"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Note</Label>
                        <Input
                          value={ex.notes}
                          onChange={(e) => updateExercise(index, "notes", e.target.value)}
                          placeholder="Tecnica..."
                        />
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
