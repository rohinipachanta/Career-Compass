import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAchievements } from "@/hooks/use-achievements";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAchievementSchema, type InsertAchievement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { LogOut, Plus, Award, Calendar, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { achievements, isLoading: isAchievementsLoading, createAchievement } = useAchievements();
  const [, setLocation] = useLocation();

  // Redirect if not logged in
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

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-panel border-b border-white/20 px-4 md:px-8 py-4 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Achievement Tracker</h1>
              <p className="text-xs text-muted-foreground font-medium">@{user.username}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => logout.mutate()}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4">
        {/* Input Section */}
        <section className="mb-12">
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-3xl font-display font-bold">What have you achieved recently?</h2>
            <p className="text-muted-foreground">Document your wins, big or small.</p>
          </div>
          
          <Card className="p-2 shadow-lg border-primary/10 bg-white/80 backdrop-blur-sm">
            <CreateAchievementForm 
              onSubmit={(data) => createAchievement.mutate(data)} 
              isPending={createAchievement.isPending} 
            />
          </Card>
        </section>

        {/* List Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              History <span className="text-muted-foreground font-normal text-sm">({achievements?.length || 0})</span>
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
                {achievements?.slice().reverse().map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="group p-5 hover:shadow-md transition-all duration-300 border-transparent hover:border-primary/10 bg-white/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-medium text-lg leading-snug">{achievement.title}</p>
                        </div>
                        <div className="flex items-center text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md shrink-0">
                          <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                          {achievement.createdAt ? format(new Date(achievement.createdAt), "MMM d, yyyy") : "Just now"}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {achievements?.length === 0 && (
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

function CreateAchievementForm({ 
  onSubmit, 
  isPending 
}: { 
  onSubmit: (data: InsertAchievement) => void, 
  isPending: boolean 
}) {
  const form = useForm<InsertAchievement>({
    resolver: zodResolver(insertAchievementSchema),
    defaultValues: {
      title: "",
    },
  });

  const handleSubmit = (data: InsertAchievement) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-2">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="flex-1 space-y-0">
              <FormControl>
                <Input 
                  placeholder="I shipped a new feature..." 
                  className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-lg h-12 px-4 placeholder:text-muted-foreground/60"
                  {...field} 
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage className="px-4 pb-2" />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          size="lg" 
          className="rounded-lg px-6 h-12 shadow-lg shadow-primary/20"
          disabled={isPending || !form.formState.isDirty}
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
        </Button>
      </form>
    </Form>
  );
}
