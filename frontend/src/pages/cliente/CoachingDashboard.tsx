import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Calendar,
  TrendingUp,
  Play,
  MessageSquare,
  Clock,
  Loader2,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import ClientLayout from "@/components/coaching/ClientLayout";

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  coach_id: string;
}

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
}

interface Coach {
  first_name: string;
  last_name: string;
}

const CoachingDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [myCoach, setMyCoach] = useState<Coach | null>(null);
  const [weekProgress, setWeekProgress] = useState(0);
  const [completedWorkouts, setCompletedWorkouts] = useState(0);

  useEffect(() => {
    if (profile?.user_id) {
      fetchData();
    }
  }, [profile?.user_id]);

  const fetchData = async () => {
    setLoading(true);
    const userId = profile?.user_id;
    const today = new Date().toISOString();

    // Fetch active workout plan
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("client_id", userId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (plans && plans.length > 0) {
      setActivePlan(plans[0]);

      // Fetch coach info
      const { data: coachData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", plans[0].coach_id)
        .single();

      if (coachData) setMyCoach(coachData);
    }

    // Fetch upcoming appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_id", userId)
      .gte("start_time", today)
      .order("start_time")
      .limit(3);

    if (appointments) setUpcomingAppointments(appointments);

    // Calculate actual week progress from workout_completions
    if (plans && plans.length > 0) {
      const planId = plans[0].id;
      
      // Get all exercises in the plan
      const { data: planExercises } = await supabase
        .from("workout_plan_exercises")
        .select("id, sets")
        .eq("workout_plan_id", planId);
      
      if (planExercises && planExercises.length > 0) {
        // Calculate total expected sets
        const totalExpectedSets = planExercises.reduce((sum, ex) => sum + (ex.sets || 3), 0);
        
        // Get completions for this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        const exerciseIds = planExercises.map(e => e.id);
        const { data: completions } = await supabase
          .from("workout_completions")
          .select("id")
          .eq("client_id", userId!)
          .in("workout_plan_exercise_id", exerciseIds)
          .gte("completed_at", weekStart.toISOString());
        
        const completedSets = completions?.length || 0;
        const progress = totalExpectedSets > 0 ? Math.round((completedSets / totalExpectedSets) * 100) : 0;
        
        setWeekProgress(Math.min(progress, 100));
        setCompletedWorkouts(completedSets);
      } else {
        setWeekProgress(0);
        setCompletedWorkouts(0);
      }
    } else {
      setWeekProgress(0);
      setCompletedWorkouts(0);
    }

    setLoading(false);
  };

  const getDaysRemaining = () => {
    if (!activePlan) return 0;
    return differenceInDays(new Date(activePlan.end_date), new Date());
  };

  return (
    <ClientLayout title="LA TUA GIORNATA">
      <div className="space-y-6">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Active Plan Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border-border">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Dumbbell className="w-5 h-5" />
                    <span className="text-sm font-medium tracking-wider uppercase">Scheda Attiva</span>
                  </div>
                  <CardTitle className="font-display text-3xl tracking-wider">
                    {activePlan?.name || "Nessuna scheda attiva"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {activePlan?.description || "Attendi la tua scheda personalizzata dal coach"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activePlan ? (
                    <div className="flex items-center gap-6">
                      <Link to="/coaching/scheda">
                        <Button size="lg" className="gap-2 font-display tracking-wider">
                          <Play className="w-5 h-5" />VEDI SCHEDA
                        </Button>
                      </Link>
                      <Badge variant="secondary" className="text-sm">
                        {getDaysRemaining()} giorni rimanenti
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Clock className="w-5 h-5" />
                      <span>In attesa della scheda dal tuo coach</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Progresso Settimanale</span>
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-end justify-between">
                        <span className="text-3xl font-display">{weekProgress}%</span>
                        <span className="text-sm text-muted-foreground">{completedWorkouts}/5 sessioni</span>
                      </div>
                      <Progress value={weekProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Prossimo Appuntamento</span>
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    {upcomingAppointments.length > 0 ? (
                      <div>
                        <p className="text-lg font-medium">{upcomingAppointments[0].title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(upcomingAppointments[0].start_time), "d MMMM 'alle' HH:mm", { locale: it })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Nessun appuntamento</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Il Tuo Coach</span>
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    {myCoach ? (
                      <div>
                        <p className="text-lg font-medium">{myCoach.first_name} {myCoach.last_name}</p>
                        <Link to="/coaching/segnala">
                          <Button variant="link" className="p-0 h-auto text-primary">Invia messaggio</Button>
                        </Link>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Non assegnato</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="font-display tracking-wider flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Prossimi Appuntamenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingAppointments.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Nessun appuntamento in programma</p>
                        <p className="text-sm">Prenota o attendi una nuova sessione.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingAppointments.map(apt => (
                          <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">{apt.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(apt.start_time), "EEEE d MMMM 'alle' HH:mm", { locale: it })}
                              </p>
                            </div>
                            {apt.location && (
                              <Badge variant="outline">{apt.location}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="font-display tracking-wider flex items-center gap-2">
                      <Play className="w-5 h-5 text-primary" />
                      Azioni Rapide
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-3">
                    <Link to="/coaching/scheda">
                      <Button className="w-full justify-start gap-3" variant="secondary">
                        <Dumbbell className="w-5 h-5" />Vedi Scheda Allenamento
                      </Button>
                    </Link>
                    <Link to="/coaching/progressi">
                      <Button className="w-full justify-start gap-3" variant="secondary">
                        <TrendingUp className="w-5 h-5" />I Miei Progressi
                      </Button>
                    </Link>
                    <Link to="/coaching/segnala">
                      <Button className="w-full justify-start gap-3" variant="secondary">
                        <MessageSquare className="w-5 h-5" />Segnala Problema
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </ClientLayout>
  );
};

export default CoachingDashboard;
