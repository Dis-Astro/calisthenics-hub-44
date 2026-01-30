import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Loader2, Edit, Trash2 } from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string | null;
  coach_id: string | null;
  color: string;
  max_participants: number | null;
  duration_minutes: number;
  is_active: boolean;
  schedule: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

const CourseManagement = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coach_id: "",
    color: "#10B981",
    max_participants: "",
    duration_minutes: "60",
    schedule: "",
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [coursesRes, coachesRes] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from("profiles").select("*").in("role", ["admin", "coach"])
    ]);

    if (coursesRes.data) setCourses(coursesRes.data);
    if (coachesRes.data) setCoaches(coachesRes.data);
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingCourse(null);
    setFormData({
      name: "",
      description: "",
      coach_id: "",
      color: "#10B981",
      max_participants: "",
      duration_minutes: "60",
      schedule: "",
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      description: course.description || "",
      coach_id: course.coach_id || "",
      color: course.color || "#10B981",
      max_participants: course.max_participants?.toString() || "",
      duration_minutes: course.duration_minutes.toString(),
      schedule: course.schedule || "",
      is_active: course.is_active
    });
    setIsDialogOpen(true);
  };

  const saveCourse = async () => {
    if (!formData.name) {
      toast({ title: "Errore", description: "Il nome è obbligatorio", variant: "destructive" });
      return;
    }

    setSaving(true);
    const courseData = {
      name: formData.name,
      description: formData.description || null,
      coach_id: formData.coach_id || null,
      color: formData.color,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      duration_minutes: parseInt(formData.duration_minutes) || 60,
      schedule: formData.schedule || null,
      is_active: formData.is_active
    };

    if (editingCourse) {
      const { error } = await supabase.from("courses").update(courseData).eq("id", editingCourse.id);
      if (error) {
        toast({ title: "Errore", description: "Impossibile aggiornare il corso", variant: "destructive" });
      } else {
        toast({ title: "Successo", description: "Corso aggiornato" });
        setIsDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("courses").insert(courseData);
      if (error) {
        toast({ title: "Errore", description: "Impossibile creare il corso", variant: "destructive" });
      } else {
        toast({ title: "Successo", description: "Corso creato" });
        setIsDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo corso?")) return;

    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare il corso", variant: "destructive" });
    } else {
      toast({ title: "Successo", description: "Corso eliminato" });
      fetchData();
    }
  };

  const getCoachName = (coachId: string | null) => {
    if (!coachId) return "-";
    const coach = coaches.find(c => c.user_id === coachId);
    return coach ? `${coach.first_name} ${coach.last_name}` : "-";
  };

  return (
    <AdminLayout title="CORSI" icon={<Users className="w-6 h-6" />}>
      <div className="flex justify-end mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />Nuovo Corso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Modifica Corso" : "Nuovo Corso"}</DialogTitle>
              <DialogDescription>
                {editingCourse ? "Modifica i dettagli del corso" : "Crea un nuovo corso di gruppo"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es. Yoga Mattutino"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrivi il corso..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coach</Label>
                  <Select value={formData.coach_id} onValueChange={(v) => setFormData({ ...formData, coach_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {coaches.map(c => (
                        <SelectItem key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durata (min)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Partecipanti</Label>
                  <Input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    placeholder="Illimitato"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Colore</Label>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Orario Ricorrente</Label>
                <Input
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="Es. Lun-Mer-Ven 18:00"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Corso attivo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
              <Button onClick={saveCourse} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCourse ? "Salva" : "Crea"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display tracking-wider">Corsi di Gruppo</CardTitle>
          <CardDescription>{courses.length} corsi</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessun corso creato</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Partecipanti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                        <span className="font-medium">{course.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getCoachName(course.coach_id)}</TableCell>
                    <TableCell>{course.duration_minutes} min</TableCell>
                    <TableCell>{course.max_participants || "∞"}</TableCell>
                    <TableCell>
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? "Attivo" : "Disattivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(course)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCourse(course.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default CourseManagement;
