import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Dumbbell, 
  Calendar, 
  TrendingUp,
  Play,
  FileText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Flame,
  Target,
  Trophy,
  ChevronRight,
  Clock,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";

// Dashboard PREMIUM per clienti coaching
const CoachingDashboard = () => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { icon: Target, label: "Dashboard", href: "/coaching", active: true },
    { icon: Dumbbell, label: "La Mia Scheda", href: "/coaching/scheda" },
    { icon: Play, label: "Video Esercizi", href: "/coaching/video" },
    { icon: TrendingUp, label: "I Miei Progressi", href: "/coaching/progressi" },
    { icon: Calendar, label: "Appuntamenti", href: "/coaching/appuntamenti" },
    { icon: MessageSquare, label: "Segnala Problema", href: "/coaching/segnala" },
    { icon: FileText, label: "Documenti", href: "/coaching/documenti" },
  ];

  // Mock data for demo
  const weekProgress = 60; // 3 of 5 workouts completed
  const currentStreak = 0;
  
  const todayWorkout = {
    name: "Nessun allenamento oggi",
    description: "Attendi la tua scheda personalizzata",
    exercises: 0,
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Premium Sidebar with gradient */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 
        bg-gradient-to-b from-sidebar-background via-sidebar-background to-card
        border-r border-sidebar-border
        transform transition-transform duration-300 lg:translate-x-0 lg:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Premium Logo */}
          <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
            <Link to="/coaching" className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <Flame className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-2xl tracking-wider text-sidebar-foreground block">COACHING</span>
                <span className="text-xs text-primary font-medium tracking-widest">PREMIUM</span>
              </div>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="ml-auto lg:hidden text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Premium User Card */}
          <div className="p-4">
            <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-lg p-4 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-display text-xl text-primary">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary fill-primary" />
                    <span className="text-xs text-primary">Cliente Premium</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Streak</span>
                <span className="font-display text-lg text-foreground flex items-center gap-1">
                  <Flame className="w-4 h-4 text-primary" />
                  {currentStreak} giorni
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200
                  ${item.active 
                    ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-l-2 border-primary' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5" />
              Esci
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Premium Header */}
        <header className="h-16 bg-gradient-to-r from-card to-background border-b border-border flex items-center px-6">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden text-foreground mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h1 className="font-display text-xl tracking-wider">LA TUA GIORNATA</h1>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Hero Card - Today's Workout */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border-border">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <CardHeader>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Dumbbell className="w-5 h-5" />
                <span className="text-sm font-medium tracking-wider uppercase">Allenamento di Oggi</span>
              </div>
              <CardTitle className="font-display text-3xl tracking-wider">
                {todayWorkout.name}
              </CardTitle>
              <CardDescription className="text-base">
                {todayWorkout.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayWorkout.exercises > 0 ? (
                <Link to="/coaching/scheda">
                  <Button size="lg" className="gap-2 font-display tracking-wider">
                    <Play className="w-5 h-5" />
                    INIZIA ALLENAMENTO
                  </Button>
                </Link>
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
            {/* Weekly Progress */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Progresso Settimanale</span>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-display">{weekProgress}%</span>
                    <span className="text-sm text-muted-foreground">3/5 sessioni</span>
                  </div>
                  <Progress value={weekProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Current Streak */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Streak Attuale</span>
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-display">{currentStreak}</span>
                  <span className="text-muted-foreground pb-1">giorni consecutivi</span>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Obiettivi</span>
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-display">0</span>
                  <span className="text-muted-foreground pb-1">raggiunti</span>
                </div>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun appuntamento in programma</p>
                  <Link to="/coaching/appuntamenti">
                    <Button variant="link" className="mt-2 text-primary">
                      Vedi calendario
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Video Recenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun video disponibile</p>
                  <Link to="/coaching/video">
                    <Button variant="link" className="mt-2 text-primary">
                      Esplora libreria video
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoachingDashboard;
