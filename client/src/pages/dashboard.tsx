import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAchievements } from "@/hooks/use-achievements";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAchievementSchema, type InsertAchievement, type Achievement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { LogOut, Plus, Award, Calendar, Loader2, MessageSquare, ChevronDown, ChevronUp, Star, Shield, Trophy, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Dashboard() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { achievements, isLoading: isAchievementsLoading, createAchievement, requestCoaching } = useAchievements();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isAuthLoading, setLocation]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedAchievements = achievements ? [...achievements].sort((a, b) => {
    const dateA = a.achievementDate ? new Date(a.achievementDate).getTime() : 0;
    const dateB = b.achievementDate ? new Date(b.achievementDate).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return (b.id || 0) - (a.id || 0);
  }) : [];

  const coachingRemaining = 5 - (user.coachingCount || 0);
  const xpProgress = user?.xp ? (user.xp % 50) : 0;
  const xpNeeded = 50;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 glass-panel border-b border-white/20 px-4 md:px-8 py-4 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg relative">
              <Award className="w-6 h-6 text-primary" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white cursor-help">
                      {user?.level || 1}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Current Level: {user?.level || 1}</p>
                    <p className="text-xs text-muted-foreground">Every 50 XP increases your level!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold flex items-center gap-2">🧭 Career Compass</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-medium">@{user?.username}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-700 dark:text-yellow-500 cursor-help">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {user?.xp || 0} XP
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total Experience: {user?.xp || 0}</p>
                      <p className="text-xs text-muted-foreground">Earn 10 XP per achievement!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-muted/30 rounded-full border border-white/20">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col gap-1 w-32 cursor-help">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                      <span>LVL {user?.level || 1}</span>
                      <span>{xpProgress}/{xpNeeded} XP</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${(xpProgress / xpNeeded) * 100}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{xpNeeded - xpProgress} XP until next Level!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <div className="flex gap-1">
                {(user as any)?.badges?.map((badge: any) => (
                  <TooltipProvider key={badge.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-help"
                        >
                          <Shield className="w-3 h-3 text-primary" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="capitalize">{badge.type.replace('_', ' ')} Badge</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {!(user as any)?.badges?.length && <span className="text-[10px] text-muted-foreground italic">No badges yet</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coaching Requests</p>
              <p className="text-sm font-bold">{coachingRemaining} / 5 remaining</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => logout.mutate()}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4">
        <section className="mb-12">
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-3xl font-display font-bold">Log a win or feedback</h2>
            <p className="text-muted-foreground">Capture it now — wins, kudos, or constructive feedback.</p>
          </div>
          
          <Card className="p-4 shadow-lg border-primary/10 bg-white/80 backdrop-blur-sm">
            <CreateAchievementForm 
              onSubmit={(data) => createAchievement.mutate(data)} 
              isPending={createAchievement.isPending} 
            />
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              History <span className="text-muted-foreground font-normal text-sm">({sortedAchievements.length})</span>
            </h3>
          </div>

          {isAchievementsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {sortedAchievements.map((achievement, index) => (
                  <AchievementCard 
                    key={achievement.id} 
                    achievement={achievement} 
                    index={index}
                    onRequestCoaching={() => requestCoaching.mutate(achievement.id)}
                    isCoachingPending={requestCoaching.isPending && requestCoaching.variables === achievement.id}
                  />
                ))}
              </AnimatePresence>
              
              {sortedAchievements.length === 0 && (
                <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
                  <Award className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No achievements yet</h3>
                  <p className="text-sm text-muted-foreground/70">Add your first win above!</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AchievementCard({ 
  achievement, 
  index, 
  onRequestCoaching,
  isCoachingPending
}: { 
  achievement: Achievement; 
  index: number;
  onRequestCoaching: () => void;
  isCoachingPending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse date safely, accounting for potential timezone shifts
  const displayDate = achievement.achievementDate 
    ? format(new Date(achievement.achievementDate + 'T00:00:00'), "MMM d, yyyy") 
    : "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group p-5 hover:shadow-md transition-all duration-300 border-transparent hover:border-primary/10 bg-white/60">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <p className="font-medium text-lg leading-snug">{achievement.title}</p>
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                {displayDate}
              </div>
            </div>
            {!achievement.coachingResponse && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRequestCoaching}
                disabled={isCoachingPending}
                className="shrink-0"
              >
                {isCoachingPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="w-4 h-4 mr-2" />
                )}
                Get Coaching
              </Button>
            )}
          </div>

          {achievement.coachingResponse && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-primary/80 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  AI Coach Feedback
                </p>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-3">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {achievement.coachingResponse}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function CreateAchievementForm({ 
  onSubmit, 
  isPending 
}: { 
  onSubmit: (data: InsertAchievement) => void, 
  isPending: boolean 
}) {
  const { toast } = useToast();
  const form = useForm<InsertAchievement>({
    resolver: zodResolver(insertAchievementSchema),
    defaultValues: {
      title: "",
      achievementDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const handleSubmit = (data: InsertAchievement) => {
    onSubmit(data);
    form.reset({
      title: "",
      achievementDate: format(new Date(), "yyyy-MM-dd"),
    });
    toast({
      title: "Success",
      description: "Achievement saved!",
    });
  };

  const titleValue = form.watch("title") || "";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">What did you achieve?</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="I shipped a new feature..." 
                      className="text-lg h-12 px-4"
                      {...field} 
                      autoComplete="off"
                    />
                    <div className="absolute right-3 bottom-[-1.5rem] text-[10px] font-medium text-muted-foreground">
                      {titleValue.length} characters
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="achievementDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">When?</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    className="h-12"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button 
          type="submit" 
          size="lg" 
          className="w-full h-12 shadow-lg shadow-primary/20"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          Save Achievement
        </Button>
      </form>
    </Form>
  );
}
