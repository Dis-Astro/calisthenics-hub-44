import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Dumbbell,
  Calendar,
  Zap,
  Loader2,
  Activity,
  Target
} from "lucide-react";
import ClientLayout from "@/components/coaching/ClientLayout";
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface WorkoutCompletion {
  id: string;
  completed_at: string;
  difficulty_rating: number | null;
  workout_plan_exercise_id: string;
}

interface WeeklyData {
  day: string;
  completions: number;
  avgDifficulty: number;
}

const ProgressPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [stats, setStats] = useState({
    totalCompletions: 0,
    thisWeek: 0,
    avgDifficulty: 0,
    streak: 0
  });

  useEffect(() => {
    if (profile?.user_id) {
      fetchProgress();
    }
  }, [profile?.user_id]);

  const fetchProgress = async () => {
    setLoading(true);
    const userId = profile?.user_id;
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const { data: completionsData } = await supabase
      .from("workout_completions")
      .select("*")
      .eq("client_id", userId)
      .gte("completed_at", thirtyDaysAgo)
      .order("completed_at", { ascending: false });

    setCompletions(completionsData || []);

    // Calculate weekly data
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyDataCalc: WeeklyData[] = weekDays.map(day => {
      const dayCompletions = (completionsData || []).filter(c => 
        isSameDay(parseISO(c.completed_at), day)
      );
      const difficulties = dayCompletions
        .map(c => c.difficulty_rating)
        .filter(Boolean) as number[];
      
      return {
        day: format(day, "EEE", { locale: it }),
        completions: dayCompletions.length,
        avgDifficulty: difficulties.length > 0 
          ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length 
          : 0
      };
    });

    setWeeklyData(weeklyDataCalc);

    // Calculate stats
    const thisWeekCompletions = (completionsData || []).filter(c => {
      const date = parseISO(c.completed_at);
      return date >= weekStart && date <= weekEnd;
    });

    const allDifficulties = (completionsData || [])
      .map(c => c.difficulty_rating)
      .filter(Boolean) as number[];

    // Simple streak calculation
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDay = subDays(today, i);
      const hasCompletion = (completionsData || []).some(c => 
        isSameDay(parseISO(c.completed_at), checkDay)
      );
      if (hasCompletion) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    setStats({
      totalCompletions: (completionsData || []).length,
      thisWeek: thisWeekCompletions.length,
      avgDifficulty: allDifficulties.length > 0 
        ? Math.round(allDifficulties.reduce((a, b) => a + b, 0) / allDifficulties.length * 10) / 10
        : 0,
      streak
    });

    setLoading(false);
  };

  const statCards = [
    { label: "Esercizi Completati", value: stats.totalCompletions, icon: Dumbbell, color: "text-primary" },
    { label: "Questa Settimana", value: stats.thisWeek, icon: Calendar, color: "text-blue-500" },
    { label: "Difficoltà Media", value: `${stats.avgDifficulty}/10`, icon: Activity, color: "text-orange-500" },
    { label: "Streak (giorni)", value: stats.streak, icon: Zap, color: "text-yellow-500" },
  ];

  return (
    <ClientLayout title="I MIEI PROGRESSI">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-display tracking-wider mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Attività Settimanale
                </CardTitle>
                <CardDescription>Esercizi completati per giorno</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyData.every(d => d.completions === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna attività questa settimana</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="completions" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        name="Esercizi"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Difficoltà Percepita
                </CardTitle>
                <CardDescription>Andamento medio giornaliero</CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyData.every(d => d.avgDifficulty === 0) ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun dato sulla difficoltà</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={weeklyData}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgDifficulty" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="Difficoltà"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider">Attività Recente</CardTitle>
              <CardDescription>Ultimi 30 giorni</CardDescription>
            </CardHeader>
            <CardContent>
              {completions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna attività registrata</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {completions.slice(0, 20).map(completion => (
                    <div 
                      key={completion.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Dumbbell className="w-4 h-4 text-primary" />
                        <span className="text-sm">
                          {format(parseISO(completion.completed_at), "dd MMM 'alle' HH:mm", { locale: it })}
                        </span>
                      </div>
                      {completion.difficulty_rating && (
                        <Badge variant="outline" className="gap-1">
                          <Zap className="w-3 h-3" />
                          {completion.difficulty_rating}/10
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ClientLayout>
  );
};

export default ProgressPage;
