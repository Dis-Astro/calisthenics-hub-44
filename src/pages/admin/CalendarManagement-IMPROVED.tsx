// NOTA: Questo file contiene le migliorie per il CalendarManagement.tsx
// Le modifiche principali riguardano:
// 1. Responsiveness mobile migliorata
// 2. Vista mobile dedicata per il calendario settimanale
// 3. Pannello scadenze dedicato
// 4. Modal intelligente per scadenze critiche
// 5. Visualizzazione ultima scheda acquistata

// COMPONENTE PER LA VISTA MOBILE DEL CALENDARIO SETTIMANALE
export const MobileWeeklyCalendar = ({ 
  days, 
  appointments, 
  courseSessions, 
  workoutDeadlines, 
  subscriptionDeadlines,
  onDayClick,
  getEventsForDay,
  getClientName,
  getClientPackage 
}: any) => {
  return (
    <div className="space-y-3">
      {days.map((day) => {
        const events = getEventsForDay(day);
        const isToday = isSameDay(day, new Date());
        const totalEvents = events.appointments.length + events.sessions.length + events.deadlines.length + events.subDeadlines.length;
        
        return (
          <Card 
            key={day.toISOString()} 
            className={cn(
              "cursor-pointer transition-all",
              isToday && "border-primary bg-primary/5"
            )}
            onClick={() => onDayClick(day)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {format(day, "EEEE", { locale: it })}
                  </div>
                  <div className={cn(
                    "text-2xl font-display",
                    isToday && "text-primary"
                  )}>
                    {format(day, "d MMM", { locale: it })}
                  </div>
                </div>
                {totalEvents > 0 && (
                  <Badge variant="secondary">{totalEvents} eventi</Badge>
                )}
              </div>

              {totalEvents === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun evento</p>
              ) : (
                <div className="space-y-2">
                  {events.appointments.map((apt) => {
                    const clientName = getClientName(apt.client_id);
                    const clientPkg = getClientPackage(apt.client_id);
                    return (
                      <div
                        key={apt.id}
                        className="text-xs p-2 rounded text-white truncate"
                        style={{ backgroundColor: apt.color }}
                        title={apt.title}
                      >
                        <div className="font-medium">{apt.title}</div>
                        {clientName && <div className="opacity-80">{clientName}</div>}
                        {clientPkg && (
                          <div className="opacity-70">📦 {clientPkg.remaining_lessons}/{clientPkg.total_lessons}</div>
                        )}
                        <div className="opacity-70">
                          {format(new Date(apt.start_time), "HH:mm", { locale: it })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {events.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="text-xs p-2 rounded text-white truncate"
                      style={{ backgroundColor: session.course?.color || '#10B981' }}
                      title={session.course?.name}
                    >
                      <div className="font-medium">{session.course?.name}</div>
                      <div className="opacity-70">
                        {format(new Date(session.start_time), "HH:mm", { locale: it })}
                      </div>
                    </div>
                  ))}
                  
                  {events.deadlines.slice(0, 1).map((deadline) => {
                    const clientName = getClientName(deadline.client_id);
                    return (
                      <div
                        key={deadline.id}
                        className="text-xs p-2 rounded bg-destructive/20 text-destructive"
                      >
                        <div className="font-medium">Scadenza Scheda</div>
                        <div>{clientName || deadline.name}</div>
                      </div>
                    );
                  })}
                  
                  {events.subDeadlines.slice(0, 1).map((sub) => {
                    const clientName = getClientName(sub.user_id);
                    return (
                      <div
                        key={`sub-${sub.id}`}
                        className="text-xs p-2 rounded bg-orange-500/20 text-orange-700 dark:text-orange-400"
                      >
                        <div className="font-medium">Scadenza Abbonamento</div>
                        <div>{sub.plan_name}</div>
                        {clientName && <div>{clientName}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// COMPONENTE PER IL PANNELLO SCADENZE
export const DeadlinesPanel = ({
  subscriptionDeadlines,
  workoutDeadlines,
  getClientName,
  onRenewSubscription,
  onDeadlineClick
}: any) => {
  const allDeadlines = [
    ...subscriptionDeadlines.map(d => ({ ...d, type: 'subscription', endDate: d.end_date })),
    ...workoutDeadlines.map(d => ({ ...d, type: 'workout', endDate: d.end_date }))
  ].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  const upcomingDeadlines = allDeadlines.filter(d => 
    differenceInDays(new Date(d.endDate), new Date()) <= 7 && differenceInDays(new Date(d.endDate), new Date()) >= 0
  ).slice(0, 5);

  if (upcomingDeadlines.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
          <AlertTriangle className="w-5 h-5" />
          Scadenze Imminenti (Prossimi 7 Giorni)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {upcomingDeadlines.map((deadline) => {
            const daysLeft = differenceInDays(new Date(deadline.endDate), new Date());
            const clientName = getClientName(deadline.user_id || deadline.client_id);
            const isUrgent = daysLeft <= 1;

            return (
              <div
                key={`${deadline.type}-${deadline.id}`}
                className={cn(
                  "p-3 rounded-lg flex items-center justify-between",
                  isUrgent ? "bg-red-100 dark:bg-red-900/30" : "bg-white dark:bg-slate-800"
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {deadline.type === 'subscription' ? deadline.plan_name : deadline.name}
                  </div>
                  {clientName && (
                    <div className="text-xs text-muted-foreground">{clientName}</div>
                  )}
                  <div className={cn(
                    "text-xs font-semibold mt-1",
                    isUrgent ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
                  )}>
                    {daysLeft === 0 ? "Scade oggi" : daysLeft === 1 ? "Scade domani" : `Scade tra ${daysLeft} giorni`}
                  </div>
                </div>
                {deadline.type === 'subscription' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRenewSubscription(deadline)}
                    className="ml-2"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Rinnova
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// COMPONENTE PER MOSTRARE L'ULTIMA SCHEDA ACQUISTATA
export const LastWorkoutPlanCard = ({
  lastPlan,
  getClientName
}: any) => {
  if (!lastPlan) return null;

  const daysLeft = differenceInDays(new Date(lastPlan.end_date), new Date());
  const isExpiring = daysLeft <= 7;
  const isExpired = daysLeft < 0;

  return (
    <Card className={cn(
      "mb-6",
      isExpired && "border-destructive bg-destructive/5",
      isExpiring && !isExpired && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
    )}>
      <CardHeader>
        <CardTitle className="text-lg">Ultima Scheda Acquistata</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nome Scheda</p>
            <p className="font-medium">{lastPlan.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data Inizio</p>
              <p className="font-medium">
                {format(new Date(lastPlan.start_date), "dd MMM yyyy", { locale: it })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Scadenza</p>
              <p className={cn(
                "font-medium",
                isExpired && "text-destructive",
                isExpiring && !isExpired && "text-yellow-600 dark:text-yellow-500"
              )}>
                {format(new Date(lastPlan.end_date), "dd MMM yyyy", { locale: it })}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Giorni Rimanenti</p>
            <p className={cn(
              "text-2xl font-display",
              isExpired && "text-destructive",
              isExpiring && !isExpired && "text-yellow-600 dark:text-yellow-500",
              !isExpiring && !isExpired && "text-green-600 dark:text-green-400"
            )}>
              {isExpired ? "Scaduto" : daysLeft > 0 ? `${daysLeft} giorni` : "Scade oggi"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default {
  MobileWeeklyCalendar,
  DeadlinesPanel,
  LastWorkoutPlanCard
};
