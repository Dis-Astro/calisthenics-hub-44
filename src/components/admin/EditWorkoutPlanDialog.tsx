import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import ExerciseNameInput from "@/components/admin/ExerciseNameInput";
import type { ExerciseSuggestion } from "@/components/admin/ExerciseNameInput";

type Exercise = ExerciseSuggestion;

interface PlanExercise {
  id?: string;
  exercise_id: string | null;
  exercise_name_free: string;
  day_of_week: number;
  sets: number;
  reps: string;
  notes: string;
  order_index: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface EditWorkoutPlanDialogProps {
  planId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const dayLabels = ["Giorno 1", "Giorno 2", "Giorno 3", "Giorno 4", "Giorno 5", "Giorno 6", "Giorno 7"];

const EditWorkoutPlanDialog = ({ 
  planId,
  open, 
  onOpenChange, 
  onSuccess 
}: EditWorkoutPlanDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coach_notes: "",
    is_active: true
  });

  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);

  useEffect(() => {
    if (open && planId) fetchData();
  }, [open, planId]);

  const fetchData = async () => {
    if (!planId) return;
    setLoading(true);

    const [exercisesRes, planRes, planExercisesRes] = await Promise.all([
      supabase.from("exercises").select("id, name, muscle_group").order("name"),
      supabase.from("workout_plans").select("*").eq("id", planId).single(),
      supabase
        .from("workout_plan_exercises")
        .select("id, exercise_id, exercise_name, day_of_week, sets, reps, notes, order_index")
        .eq("workout_plan_id", planId)
        .order("day_of_week").order("order_index")
    ]);

    setExercises(exercisesRes.data || []);

    if (planRes.data) {
      setFormData({
        name: planRes.data.name,
        description: planRes.data.description || "",
        coach_notes: planRes.data.coach_notes || "",
        is_active: planRes.data.is_active
      });
    }

    if (planExercisesRes.data) {
      // Mappa exercise_name dal DB o, se mancante, cerca nel dizionario esercizi
      const exMap = new Map((exercisesRes.data || []).map(e => [e.id, e.name]));
      setPlanExercises(planExercisesRes.data.map(ex => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
        exercise_name_free: (ex as any).exercise_name || (ex.exercise_id ? exMap.get(ex.exercise_id) || "" : ""),
        day_of_week: ex.day_of_week || 1,
        sets: ex.sets || 3,
        reps: ex.reps || "10",
        notes: ex.notes || "",
        order_index: ex.order_index
      })));
    }

    setLoading(false);
  };

  const addExercise = () => {
    const maxOrder = Math.max(0, ...planExercises.map(e => e.order_index));
    setPlanExercises([
      ...planExercises,
      { exercise_id: null, exercise_name_free: "", day_of_week: 1, sets: 3, reps: "10", notes: "", order_index: maxOrder + 1, isNew: true }
    ]);
  };

  const removeExercise = (index: number) => {
    const updated = [...planExercises];
    if (updated[index].id) {
      updated[index].isDeleted = true;
    } else {
      updated.splice(index, 1);
    }
    setPlanExercises(updated);
  };

  const updateExercise = (index: number, field: keyof PlanExercise, value: string | number | null | boolean) => {
    const updated = [...planExercises];
    updated[index] = { ...updated[index], [field]: value };
    setPlanExercises(updated);
  };

  const handleSelectSuggestion = (index: number, ex: Exercise) => {
    const updated = [...planExercises];
    updated[index] = { ...updated[index], exercise_id: ex.id, exercise_name_free: ex.name };
    setPlanExercises(updated);
  };

  const resolveExerciseId = async (ex: PlanExercise): Promise<string | null> => {
    if (ex.exercise_id) return ex.exercise_id;
    if (!ex.exercise_name_free.trim()) return null;

    // Cerca tra esercizi esistenti (case insensitive)
    const found = exercises.find(e => e.name.toLowerCase() === ex.exercise_name_free.toLowerCase().trim());
    if (found) return found.id;

    // Crea nuovo esercizio
    const { data } = await supabase
      .from("exercises")
      .insert({ name: ex.exercise_name_free.trim() })
      .select("id")
      .single();
    return data?.id || null;
  };

  const handleSubmit = async () => {
    if (!planId || !formData.name) {
      toast({ title: "Errore", description: "Inserisci un nome per la scheda", variant: "destructive" });
      return;
    }

    const activeExercises = planExercises.filter(e => !e.isDeleted);
    if (activeExercises.length === 0) {
      toast({ title: "Errore", description: "Aggiungi almeno un esercizio", variant: "destructive" });
      return;
    }

    const invalidExercises = activeExercises.filter(e => !e.exercise_name_free.trim());
    if (invalidExercises.length > 0) {
      toast({ title: "Errore", description: "Scrivi il nome per ogni esercizio", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Update plan
    const { error: planError } = await supabase
      .from("workout_plans")
      .update({ name: formData.name, description: formData.description || null, coach_notes: formData.coach_notes || null, is_active: formData.is_active, updated_at: new Date().toISOString() })
      .eq("id", planId);

    if (planError) {
      toast({ title: "Errore", description: "Impossibile aggiornare la scheda", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Delete removed
    const toDelete = planExercises.filter(e => e.isDeleted && e.id);
    if (toDelete.length > 0) {
      await supabase.from("workout_plan_exercises").delete().in("id", toDelete.map(e => e.id!));
    }

    // Update existing
    const toUpdate = planExercises.filter(e => !e.isDeleted && !e.isNew && e.id);
    for (const ex of toUpdate) {
      const exerciseId = await resolveExerciseId(ex);
      await supabase.from("workout_plan_exercises").update({
        exercise_id: exerciseId,
        exercise_name: ex.exercise_name_free.trim(),
        day_of_week: ex.day_of_week,
        sets: ex.sets,
        reps: ex.reps,
        notes: ex.notes || null,
        order_index: ex.order_index
      }).eq("id", ex.id!);
    }

    // Insert new
    const toInsert = planExercises.filter(e => !e.isDeleted && e.isNew);
    if (toInsert.length > 0) {
      const insertData = await Promise.all(toInsert.map(async ex => ({
        workout_plan_id: planId,
        exercise_id: await resolveExerciseId(ex),
        exercise_name: ex.exercise_name_free.trim(),
        day_of_week: ex.day_of_week,
        sets: ex.sets,
        reps: ex.reps,
        notes: ex.notes || null,
        order_index: ex.order_index
      })));
      await supabase.from("workout_plan_exercises").insert(insertData);
    }

    toast({ title: "Scheda aggiornata!" });
    onSuccess();
    onOpenChange(false);
    setSaving(false);
  };

  const visibleExercises = planExercises.filter(e => !e.isDeleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display tracking-wider">Modifica Scheda</DialogTitle>
              <DialogDescription>Modifica i dettagli e gli esercizi della scheda</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Scheda *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Es. Scheda Forza - Febbraio" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label>Scheda Attiva</Label>
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
                    <p className="text-xs text-muted-foreground mt-0.5">Scrivi liberamente il nome — il suggerimento è opzionale</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addExercise} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </Button>
                </div>

                {visibleExercises.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                    <p className="text-sm">Nessun esercizio</p>
                    <Button type="button" variant="ghost" size="sm" onClick={addExercise} className="mt-2">
                      + Aggiungi il primo esercizio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {planExercises.map((ex, index) => {
                      if (ex.isDeleted) return null;
                      const visibleIndex = visibleExercises.indexOf(ex);
                      return (
                        <div key={ex.id || `new-${index}`} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-5">#{visibleIndex + 1}</span>
                            <ExerciseNameInput
                              value={ex.exercise_name_free}
                              onChange={(val) => {
                                updateExercise(index, "exercise_name_free", val);
                                if (exercises.find(e => e.name === val) === undefined) {
                                  updateExercise(index, "exercise_id", null);
                                }
                              }}
                              suggestions={exercises}
                              onSelectSuggestion={(e) => handleSelectSuggestion(index, e)}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeExercise(index)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
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
                            <div className="space-y-1">
                              <Label className="text-xs">Note</Label>
                              <Input value={ex.notes} onChange={(e) => updateExercise(index, "notes", e.target.value)} placeholder="Tecnica..." className="h-8 text-sm" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salva Modifiche
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditWorkoutPlanDialog;
