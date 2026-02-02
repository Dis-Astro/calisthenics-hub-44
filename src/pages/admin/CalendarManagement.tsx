import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, ChevronLeft, ChevronRight, Loader2, Clock, User, ExternalLink } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO, addHours } from "date-fns";
import { it } from "date-fns/locale";

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  coach_id: string;
  client_id: string | null;
  color: string;
  location: string | null;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  coach_id: string | null;
  color: string;
  max_participants: number | null;
  duration_minutes: number;
}

interface CourseSession {
  id: string;
  course_id: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
  course?: Course;
}

const CalendarManagement = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isCourseSessionDialogOpen, setIsCourseSessionDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [newAppointment, setNewAppointment] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    coach_id: "",
    client_id: "",
    color: "#3B82F6",
    location: ""
  });
  
  const [newCourseSession, setNewCourseSession] = useState({
    course_id: "",
    start_time: "",
    end_time: ""
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    
    const startRange = format(weekStart, "yyyy-MM-dd");
    const endRange = format(addHours(weekEnd, 24), "yyyy-MM-dd");

    const [appointmentsRes, sessionsRes, coachesRes, clientsRes, coursesRes] = await Promise.all([
      supabase.from("appointments").select("*").gte("start_time", startRange).lte("start_time", endRange),
      supabase.from("course_sessions").select("*, course:courses(*)").gte("start_time", startRange).lte("start_time", endRange),
      supabase.from("profiles").select("*").in("role", ["admin", "coach"]),
      supabase.from("profiles").select("*").in("role", ["cliente_palestra", "cliente_coaching"]),
      supabase.from("courses").select("*").eq("is_active", true)
    ]);

    if (appointmentsRes.data) setAppointments(appointmentsRes.data);
    if (sessionsRes.data) setCourseSessions(sessionsRes.data as CourseSession[]);
    if (coachesRes.data) setCoaches(coachesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);

    setLoading(false);
  };

  const createAppointment = async () => {
    if (!newAppointment.title || !newAppointment.start_time || !newAppointment.end_time || !newAppointment.coach_id) {
      toast({ title: "Errore", description: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      title: newAppointment.title,
      description: newAppointment.description || null,
      start_time: newAppointment.start_time,
      end_time: newAppointment.end_time,
      coach_id: newAppointment.coach_id,
      client_id: newAppointment.client_id || null,
      color: newAppointment.color,
      location: newAppointment.location || null
    });

    if (error) {
      toast({ title: "Errore", description: "Impossibile creare l'appuntamento", variant: "destructive" });
    } else {
      toast({ title: "Successo", description: "Appuntamento creato" });
      setIsAppointmentDialogOpen(false);
      setNewAppointment({ title: "", description: "", start_time: "", end_time: "", coach_id: "", client_id: "", color: "#3B82F6", location: "" });
      fetchData();
    }
    setSaving(false);
  };

  const createCourseSession = async () => {
    if (!newCourseSession.course_id || !newCourseSession.start_time || !newCourseSession.end_time) {
      toast({ title: "Errore", description: "Compila tutti i campi", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("course_sessions").insert({
      course_id: newCourseSession.course_id,
      start_time: newCourseSession.start_time,
      end_time: newCourseSession.end_time
    });

    if (error) {
      toast({ title: "Errore", description: "Impossibile creare la sessione", variant: "destructive" });
    } else {
      toast({ title: "Successo", description: "Sessione corso creata" });
      setIsCourseSessionDialogOpen(false);
      setNewCourseSession({ course_id: "", start_time: "", end_time: "" });
      fetchData();
    }
    setSaving(false);
  };

  const getEventsForDay = (day: Date) => {
    const dayAppointments = appointments.filter(a => isSameDay(parseISO(a.start_time), day));
    const daySessions = courseSessions.filter(s => isSameDay(parseISO(s.start_time), day));
    return { appointments: dayAppointments, sessions: daySessions };
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.user_id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : null;
  };

  const handleAppointmentClick = (apt: Appointment) => {
    if (apt.client_id) {
      navigate(`/admin/utenti/${apt.client_id}`);
    }
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  return (
    <AdminLayout title="CALENDARIO" icon={<Calendar className="w-6 h-6" />}>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-display text-lg tracking-wider min-w-[200px] text-center">
            {format(weekStart, "d MMM", { locale: it })} - {format(weekEnd, "d MMM yyyy", { locale: it })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Oggi</Button>
        </div>

        <div className="flex gap-2">
          <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />Appuntamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nuovo Appuntamento</DialogTitle>
                <DialogDescription>Crea un appuntamento con un cliente</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input value={newAppointment.title} onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })} placeholder="Es. Sessione PT" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inizio *</Label>
                    <Input type="datetime-local" value={newAppointment.start_time} onChange={(e) => setNewAppointment({ ...newAppointment, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fine *</Label>
                    <Input type="datetime-local" value={newAppointment.end_time} onChange={(e) => setNewAppointment({ ...newAppointment, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Coach *</Label>
                  <Select value={newAppointment.coach_id} onValueChange={(v) => setNewAppointment({ ...newAppointment, coach_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona coach" /></SelectTrigger>
                    <SelectContent>
                      {coaches.map(c => (
                        <SelectItem key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={newAppointment.client_id} onValueChange={(v) => setNewAppointment({ ...newAppointment, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona cliente (opzionale)" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea value={newAppointment.description} onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Luogo</Label>
                    <Input value={newAppointment.location} onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })} placeholder="Es. Sala 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Colore</Label>
                    <Input type="color" value={newAppointment.color} onChange={(e) => setNewAppointment({ ...newAppointment, color: e.target.value })} className="h-10" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>Annulla</Button>
                <Button onClick={createAppointment} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCourseSessionDialogOpen} onOpenChange={setIsCourseSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2"><Plus className="w-4 h-4" />Sessione Corso</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nuova Sessione Corso</DialogTitle>
                <DialogDescription>Aggiungi una sessione per un corso esistente</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Corso *</Label>
                  <Select value={newCourseSession.course_id} onValueChange={(v) => setNewCourseSession({ ...newCourseSession, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona corso" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inizio *</Label>
                    <Input type="datetime-local" value={newCourseSession.start_time} onChange={(e) => setNewCourseSession({ ...newCourseSession, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fine *</Label>
                    <Input type="datetime-local" value={newCourseSession.end_time} onChange={(e) => setNewCourseSession({ ...newCourseSession, end_time: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCourseSessionDialogOpen(false)}>Annulla</Button>
                <Button onClick={createCourseSession} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 border-b border-border">
                <div className="p-3 text-sm text-muted-foreground text-center border-r border-border">Ora</div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className={`p-3 text-center border-r border-border last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary/10' : ''}`}>
                    <div className="text-xs text-muted-foreground uppercase">{format(day, "EEE", { locale: it })}</div>
                    <div className={`text-lg font-display ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>{format(day, "d")}</div>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
                  <div className="p-2 text-xs text-muted-foreground text-center border-r border-border">
                    {hour}:00
                  </div>
                  {weekDays.map((day) => {
                    const events = getEventsForDay(day);
                    const hourAppointments = events.appointments.filter(a => new Date(a.start_time).getHours() === hour);
                    const hourSessions = events.sessions.filter(s => new Date(s.start_time).getHours() === hour);

                    return (
                      <div key={`${day.toISOString()}-${hour}`} className="p-1 min-h-[60px] border-r border-border last:border-r-0 relative">
                        {hourAppointments.map((apt) => {
                          const clientName = getClientName(apt.client_id);
                          return (
                            <div
                              key={apt.id}
                              className="text-xs p-1.5 rounded mb-1 text-white cursor-pointer hover:opacity-90 group"
                              style={{ backgroundColor: apt.color }}
                              title={`${apt.title}${clientName ? ` - ${clientName}` : ''}`}
                              onClick={() => handleAppointmentClick(apt)}
                            >
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{apt.title}</span>
                                {apt.client_id && <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
                              </div>
                              {clientName && (
                                <div className="text-[10px] opacity-80 truncate mt-0.5">
                                  {clientName}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {hourSessions.map((session) => (
                          <div
                            key={session.id}
                            className="text-xs p-1.5 rounded mb-1 text-white truncate cursor-pointer hover:opacity-90"
                            style={{ backgroundColor: session.course?.color || '#10B981' }}
                            title={session.course?.name}
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="truncate">{session.course?.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default CalendarManagement;
