import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
}

interface PlanExercise {
  exercise_id: string | null;    // null se nome libero
  exercise_name_free: string;    // nome scritto liberamente
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

// Campo esercizio con autosuggest opzionale
const ExerciseNameInput = ({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: Exercise[];
  onSelectSuggestion: (ex: Exercise) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      const f = suggestions.filter(s => s.name.toLowerCase().includes(value.toLowerCase()));
      setFiltered(f.slice(0, 6));
      setOpen(f.length > 0);
    } else {
      setOpen(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Es. Squat sotto 90° lento con pausa..."
        className="w-full"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-44 overflow-auto">
          {filtered.map(ex => (
            <button
              key={ex.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
              onMouseDown={() => {
                onSelectSuggestion(ex);
                setOpen(false);
              }}
            >
              <span>{ex.name}</span>
              {ex.muscle_group && <span className="text-xs text-muted-foreground">{ex.muscle_group}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
      setFormData({ name: "", description: "", duration_weeks: "4", coach_notes: "" });
      setPlanExercises([]);
    }
  }, [open]);

  const fetchExercises = async () => {
    const { data } = await supabase.from("exercises").select("id, name, muscle_group").order("name");
    setExercises(data || []);
  };

  const addExercise = () => {
    setPlanExercises([
      ...planExercises,
      { exercise_id: null, exercise_name_free: "", day_of_week: 1, sets: 3, reps: "10", notes: "" }
    ]);
  };

  const removeExercise = (index: number) => {
    setPlanExercises(planExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof PlanExercise, value: string | number | null) => {
    const updated = [...planExercises];
    updated[index] = { ...updated[index], [field]: value };
    setPlanExercises(updated);
  };

  const handleSelectSuggestion = (index: number, ex: Exercise) => {
    const updated = [...planExercises];
    updated[index] = { ...updated[index], exercise_id: ex.id, exercise_name_free: ex.name };
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
    const invalidExercises = planExercises.filter(e => !e.exercise_name_free.trim());
    if (invalidExercises.length > 0) {
      toast({ title: "Errore", description: "Scrivi il nome per ogni esercizio", variant: "destructive" });
      return;
    }

    setSaving(true);

    const startDate = new Date();
    const weeks = parseInt(formData.duration_weeks) || 4;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7));

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

    // Prepara gli esercizi: se esercizio non è nel DB, exercise_id è null
    const exercisesToInsert = await Promise.all(planExercises.map(async (ex, index) => {
      let exerciseId = ex.exercise_id;

      // Se non esiste nel DB, crealo
      if (!exerciseId && ex.exercise_name_free.trim()) {
        const { data: newEx } = await supabase
          .from("exercises")
          .insert({ name: ex.exercise_name_free.trim() })
          .select("id")
          .single();
        exerciseId = newEx?.id || null;
      }

      return {
        workout_plan_id: plan.id,
        exercise_id: exerciseId,
        exercise_name: ex.exercise_name_free.trim(),
        day_of_week: ex.day_of_week,
        sets: ex.sets,
        reps: ex.reps,
        notes: ex.notes || null,
        order_index: index
      };
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
                <p className="text-xs text-muted-foreground mt-0.5">Scrivi liberamente il nome — il suggerimento è opzionale</p>
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
                  <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-5">#{index + 1}</span>
                      <ExerciseNameInput
                        value={ex.exercise_name_free}
                        onChange={(val) => {
                          updateExercise(index, "exercise_name_free", val);
                          // Reset FK se si digita manualmente
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
