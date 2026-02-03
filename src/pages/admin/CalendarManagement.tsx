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
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Plus, ChevronLeft, ChevronRight, Loader2, Clock, User, ExternalLink, Trash2, Dumbbell, CalendarIcon, Repeat } from "lucide-react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths,
  isSameDay, 
  isSameMonth,
  parseISO, 
  addHours,
  addDays,
  setHours,
  setMinutes
} from "date-fns";
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

interface WorkoutPlan {
  id: string;
  name: string;
  client_id: string;
  end_date: string;
}

type ViewMode = 'weekly' | 'monthly';

const CalendarManagement = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [workoutDeadlines, setWorkoutDeadlines] = useState<WorkoutPlan[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isCourseSessionDialogOpen, setIsCourseSessionDialogOpen] = useState(false);
  const [deleteAppointmentId, setDeleteAppointmentId] = useState<string | null>(null);
  const [deleteCourseSessionId, setDeleteCourseSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>();
  const [appointmentStartTime, setAppointmentStartTime] = useState("09:00");
  const [appointmentEndTime, setAppointmentEndTime] = useState("10:00");
  const [newAppointment, setNewAppointment] = useState({
    title: "",
    description: "",
    coach_id: "",
    client_id: "",
    color: "#3B82F6",
    location: ""
  });
  
  const [courseSessionDate, setCourseSessionDate] = useState<Date | undefined>();
  const [courseSessionStartTime, setCourseSessionStartTime] = useState("09:00");
  const [courseSessionEndTime, setCourseSessionEndTime] = useState("10:00");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState("4");
  const [newCourseSession, setNewCourseSession] = useState({
    course_id: ""
  });

  // Calculate date ranges based on view mode
  const getDateRange = () => {
    if (viewMode === 'weekly') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  useEffect(() => {
    fetchData();
  }, [currentDate, viewMode]);

  const fetchData = async () => {
    setLoading(true);
    
    const startRange = format(rangeStart, "yyyy-MM-dd");
    const endRange = format(addHours(rangeEnd, 24), "yyyy-MM-dd");

    const [appointmentsRes, sessionsRes, coachesRes, clientsRes, coursesRes, workoutRes] = await Promise.all([
      supabase.from("appointments").select("*").gte("start_time", startRange).lte("start_time", endRange),
      supabase.from("course_sessions").select("*, course:courses(*)").gte("start_time", startRange).lte("start_time", endRange),
      supabase.from("profiles").select("*").in("role", ["admin", "coach"]),
      supabase.from("profiles").select("*").in("role", ["cliente_palestra", "cliente_coaching"]),
      supabase.from("courses").select("*").eq("is_active", true),
      supabase.from("workout_plans").select("id, name, client_id, end_date").gte("end_date", startRange).lte("end_date", endRange).eq("is_active", true)
    ]);

    if (appointmentsRes.data) setAppointments(appointmentsRes.data);
    if (sessionsRes.data) setCourseSessions(sessionsRes.data as CourseSession[]);
    if (coachesRes.data) setCoaches(coachesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (workoutRes.data) setWorkoutDeadlines(workoutRes.data);

    setLoading(false);
  };

  const createAppointment = async () => {
    if (!newAppointment.title || !appointmentDate || !newAppointment.coach_id) {
      toast({ title: "Errore", description: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }

    // Build datetime from date + time
    const [startH, startM] = appointmentStartTime.split(":").map(Number);
    const [endH, endM] = appointmentEndTime.split(":").map(Number);
    const startDateTime = setMinutes(setHours(appointmentDate, startH), startM);
    const endDateTime = setMinutes(setHours(appointmentDate, endH), endM);

    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      title: newAppointment.title,
      description: newAppointment.description || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
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
      setNewAppointment({ title: "", description: "", coach_id: "", client_id: "", color: "#3B82F6", location: "" });
      setAppointmentDate(undefined);
      setAppointmentStartTime("09:00");
      setAppointmentEndTime("10:00");
      fetchData();
    }
    setSaving(false);
  };

  const deleteAppointment = async () => {
    if (!deleteAppointmentId) return;

    const { error } = await supabase.from("appointments").delete().eq("id", deleteAppointmentId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'appuntamento", variant: "destructive" });
    } else {
      toast({ title: "Eliminato", description: "Appuntamento eliminato" });
      fetchData();
    }
    setDeleteAppointmentId(null);
  };

  const createCourseSession = async () => {
    if (!newCourseSession.course_id || !courseSessionDate) {
      toast({ title: "Errore", description: "Compila tutti i campi", variant: "destructive" });
      return;
    }

    // Build datetime from date + time
    const [startH, startM] = courseSessionStartTime.split(":").map(Number);
    const [endH, endM] = courseSessionEndTime.split(":").map(Number);
    
    setSaving(true);

    // Generate sessions (single or recurring)
    const sessionsToCreate = [];
    const weeks = isRecurring ? parseInt(recurringWeeks) : 1;
    
    for (let i = 0; i < weeks; i++) {
      const sessionDate = addDays(courseSessionDate, i * 7);
      const startDateTime = setMinutes(setHours(sessionDate, startH), startM);
      const endDateTime = setMinutes(setHours(sessionDate, endH), endM);
      
      sessionsToCreate.push({
        course_id: newCourseSession.course_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      });
    }

    const { error } = await supabase.from("course_sessions").insert(sessionsToCreate);

    if (error) {
      toast({ title: "Errore", description: "Impossibile creare la/le sessione/i", variant: "destructive" });
    } else {
      toast({ title: "Successo", description: isRecurring ? `Create ${weeks} sessioni ricorrenti` : "Sessione corso creata" });
      setIsCourseSessionDialogOpen(false);
      setNewCourseSession({ course_id: "" });
      setCourseSessionDate(undefined);
      setCourseSessionStartTime("09:00");
      setCourseSessionEndTime("10:00");
      setIsRecurring(false);
      setRecurringWeeks("4");
      fetchData();
    }
    setSaving(false);
  };

  const deleteCourseSession = async () => {
    if (!deleteCourseSessionId) return;

    const { error } = await supabase.from("course_sessions").delete().eq("id", deleteCourseSessionId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare la sessione", variant: "destructive" });
    } else {
      toast({ title: "Eliminato", description: "Sessione eliminata" });
      fetchData();
    }
    setDeleteCourseSessionId(null);
  };

  const getEventsForDay = (day: Date) => {
    const dayAppointments = appointments.filter(a => isSameDay(parseISO(a.start_time), day));
    const daySessions = courseSessions.filter(s => isSameDay(parseISO(s.start_time), day));
    const dayDeadlines = workoutDeadlines.filter(w => isSameDay(parseISO(w.end_date), day));
    return { appointments: dayAppointments, sessions: daySessions, deadlines: dayDeadlines };
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.user_id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : null;
  };

  const handleAppointmentClick = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (apt.client_id) {
      navigate(`/admin/utenti/${apt.client_id}`);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'weekly') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  return (
    <AdminLayout title="CALENDARIO" icon={<Calendar className="w-6 h-6" />}>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => handleNavigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-display text-lg tracking-wider min-w-[200px] text-center">
            {viewMode === 'weekly' 
              ? `${format(rangeStart, "d MMM", { locale: it })} - ${format(rangeEnd, "d MMM yyyy", { locale: it })}`
              : format(currentDate, "MMMM yyyy", { locale: it })
            }
          </h2>
          <Button variant="outline" size="icon" onClick={() => handleNavigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Oggi</Button>
        </div>

        <div className="flex gap-2 items-center">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'weekly' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('weekly')}
            >
              Settimana
            </Button>
            <Button 
              variant={viewMode === 'monthly' ? 'default' : 'ghost'} 
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('monthly')}
            >
              Mese
            </Button>
          </div>

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
                
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {appointmentDate ? format(appointmentDate, "PPP", { locale: it }) : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={appointmentDate}
                        onSelect={setAppointmentDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ora Inizio *</Label>
                    <Input type="time" value={appointmentStartTime} onChange={(e) => setAppointmentStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ora Fine *</Label>
                    <Input type="time" value={appointmentEndTime} onChange={(e) => setAppointmentEndTime(e.target.value)} />
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
                
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !courseSessionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {courseSessionDate ? format(courseSessionDate, "PPP", { locale: it }) : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={courseSessionDate}
                        onSelect={setCourseSessionDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ora Inizio *</Label>
                    <Input type="time" value={courseSessionStartTime} onChange={(e) => setCourseSessionStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ora Fine *</Label>
                    <Input type="time" value={courseSessionEndTime} onChange={(e) => setCourseSessionEndTime(e.target.value)} />
                  </div>
                </div>
                
                {/* Recurring option */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                    />
                    <Label className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Evento ricorrente
                    </Label>
                  </div>
                  
                  {isRecurring && (
                    <div className="space-y-2">
                      <Label>Ripeti per quante settimane?</Label>
                      <Select value={recurringWeeks} onValueChange={setRecurringWeeks}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 settimane</SelectItem>
                          <SelectItem value="4">4 settimane</SelectItem>
                          <SelectItem value="8">8 settimane</SelectItem>
                          <SelectItem value="12">12 settimane</SelectItem>
                          <SelectItem value="16">16 settimane</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Verranno create {recurringWeeks} sessioni, una per settimana a partire dalla data selezionata
                      </p>
                    </div>
                  )}
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
      ) : viewMode === 'weekly' ? (
        /* Weekly View */
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 border-b border-border">
                <div className="p-3 text-sm text-muted-foreground text-center border-r border-border">Ora</div>
                {days.map((day) => (
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
                  {days.map((day) => {
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
                              className="text-xs p-1.5 rounded mb-1 text-white cursor-pointer hover:opacity-90 group relative"
                              style={{ backgroundColor: apt.color }}
                              title={`${apt.title}${clientName ? ` - ${clientName}` : ''}`}
                              onClick={(e) => handleAppointmentClick(apt, e)}
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
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteAppointmentId(apt.id); }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        {hourSessions.map((session) => (
                          <div
                            key={session.id}
                            className="text-xs p-1.5 rounded mb-1 text-white truncate cursor-pointer hover:opacity-90 group relative"
                            style={{ backgroundColor: session.course?.color || '#10B981' }}
                            title={session.course?.name}
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="truncate">{session.course?.name}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteCourseSessionId(session.id); }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
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
      ) : (
        /* Monthly View */
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {days.map((day) => {
                const events = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`min-h-[100px] p-2 border rounded-lg ${
                      isToday ? 'bg-primary/10 border-primary' : 'border-border'
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {format(day, "d")}
                    </div>
                    
                    <div className="space-y-1">
                      {events.appointments.slice(0, 2).map(apt => {
                        const clientName = getClientName(apt.client_id);
                        return (
                          <div
                            key={apt.id}
                            className="text-[10px] p-1 rounded text-white truncate cursor-pointer hover:opacity-90 group relative"
                            style={{ backgroundColor: apt.color }}
                            onClick={(e) => handleAppointmentClick(apt, e)}
                          >
                            {apt.title}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteAppointmentId(apt.id); }}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-2 h-2" />
                            </button>
                          </div>
                        );
                      })}
                      
                      {events.sessions.slice(0, 2).map(session => (
                        <div
                          key={session.id}
                          className="text-[10px] p-1 rounded text-white truncate group relative"
                          style={{ backgroundColor: session.course?.color || '#10B981' }}
                        >
                          {session.course?.name}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteCourseSessionId(session.id); }}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Workout deadlines */}
                      {events.deadlines.map(deadline => (
                        <div
                          key={deadline.id}
                          className="text-[10px] p-1 rounded bg-destructive/20 text-destructive truncate flex items-center gap-1"
                          title={`Scadenza scheda: ${deadline.name}`}
                        >
                          <Dumbbell className="w-2 h-2" />
                          Scad. Scheda
                        </div>
                      ))}
                      
                      {(events.appointments.length + events.sessions.length) > 4 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{events.appointments.length + events.sessions.length - 4} altri
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#3B82F6]"></div>
          <span className="text-muted-foreground">Appuntamenti</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#10B981]"></div>
          <span className="text-muted-foreground">Corsi</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/50"></div>
          <span className="text-muted-foreground">Scadenza Schede</span>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAppointmentId} onOpenChange={() => setDeleteAppointmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'appuntamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. L'appuntamento verrà rimosso dal calendario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Course Session Confirmation */}
      <AlertDialog open={!!deleteCourseSessionId} onOpenChange={() => setDeleteCourseSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la sessione del corso?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La sessione verrà rimossa dal calendario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteCourseSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default CalendarManagement;
