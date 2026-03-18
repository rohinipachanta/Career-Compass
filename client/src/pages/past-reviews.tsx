import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronLeft, Calendar, Loader2, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type Season = {
  id: number;
  name: string;
  reviewContent: string | null;
  archivedAt: string | null;
};

type Achievement = {
  id: number;
  title: string;
  achievementDate: string;
  feedbackType: string;
  fromPerson: string | null;
};

function SeasonCard({ season }: { season: Season }) {
  const [open, setOpen]           = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [wins, setWins]           = useState<Achievement[]>([]);
  const [loadingWins, setLoadingWins] = useState(false);

  const typeLabel: Record<string, { bg: string; text: string; label: string }> = {
    win:          { bg: "#dcfce7", text: "#166534", label: "Win"      },
    constructive: { bg: "#fef9c3", text: "#854d0e", label: "Feedback" },
    coaching:     { bg: "#dbeafe", text: "#1e40af", label: "Coaching" },
  };

  const toggleOpen = async () => {
    if (!open && wins.length === 0) {
      setLoadingWins(true);
      try {
        const res = await fetch(`/api/seasons/${season.id}/achievements`);
        if (res.ok) {
          const data = await res.json();
          setWins(data);
        }
      } finally {
        setLoadingWins(false);
      }
    }
    setOpen(v => !v);
  };

  const archivedDate = season.archivedAt
    ? format(new Date(season.archivedAt), "MMM d, yyyy")
    : "";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "hsl(36,40%,98%)", border: "1px solid hsl(36,20%,88%)" }}
    >
      {/* Season header — click to expand */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={toggleOpen}
      >
        <span className="text-2xl">📦</span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-base" style={{ color: "hsl(25,20%,16%)" }}>
            {season.name}
          </p>
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "hsl(36,10%,52%)" }}>
            <Calendar className="w-3 h-3" />
            Archived {archivedDate}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "hsl(36,10%,52%)" }} />
          : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "hsl(36,10%,52%)" }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: "1px solid hsl(36,20%,90%)" }}>

              {/* Review draft section */}
              {season.reviewContent && (
                <div className="p-4" style={{ borderBottom: "1px solid hsl(36,20%,90%)" }}>
                  <button
                    className="w-full flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-xl mb-2"
                    style={{ background: "hsl(36,20%,92%)", color: "hsl(25,40%,35%)" }}
                    onClick={() => setReviewOpen(v => !v)}
                  >
                    <span>✦ Self Review Draft</span>
                    {reviewOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <AnimatePresence>
                    {reviewOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ background: "hsl(36,30%,94%)", color: "hsl(25,20%,22%)", maxHeight: "400px", overflowY: "auto" }}
                        >
                          {season.reviewContent}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Wins list */}
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(36,10%,52%)" }}>
                  Archived wins {wins.length > 0 ? `(${wins.length})` : ""}
                </p>

                {loadingWins ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(25,40%,45%)" }} />
                  </div>
                ) : wins.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: "hsl(36,10%,56%)" }}>
                    No wins were archived in this season.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {wins.map(w => {
                      const colours = typeLabel[w.feedbackType ?? "win"] ?? typeLabel.win;
                      const displayDate = w.achievementDate
                        ? format(new Date(w.achievementDate + "T00:00:00"), "MMM d, yyyy")
                        : "";
                      return (
                        <div
                          key={w.id}
                          className="rounded-xl p-3 flex items-start gap-2"
                          style={{ background: "hsl(36,25%,94%)", border: "1px solid hsl(36,20%,88%)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: colours.bg, color: colours.text }}
                            >
                              {colours.label}
                            </span>
                            {w.fromPerson && (
                              <span className="text-xs ml-2" style={{ color: "hsl(36,10%,52%)" }}>
                                from {w.fromPerson}
                              </span>
                            )}
                            <p className="text-sm font-medium mt-1.5 leading-snug" style={{ color: "hsl(25,20%,18%)" }}>
                              {w.title}
                            </p>
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(36,10%,56%)" }}>
                              <Calendar className="w-3 h-3" />
                              {displayDate}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PastReviews() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isAuthLoading, setLocation]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch("/api/seasons");
        if (res.ok) {
          const data = await res.json();
          setSeasons(data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(36,33%,96%)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(25,55%,42%)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(36,33%,96%)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "hsl(36,33%,96%)" }}
      >
        <button
          onClick={() => setLocation("/")}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ background: "hsl(36,20%,88%)", color: "hsl(25,40%,38%)" }}
          title="Back to dashboard"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display font-bold text-lg" style={{ color: "hsl(25,20%,16%)" }}>Past Reviews</h1>
          <p className="text-xs" style={{ color: "hsl(36,10%,52%)" }}>Your archived review seasons</p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-10">
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(25,40%,45%)" }} />
          </div>
        ) : seasons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <Trophy className="w-12 h-12 mb-4" style={{ color: "hsl(36,20%,78%)" }} />
            <h2 className="font-display font-bold text-lg mb-2" style={{ color: "hsl(25,20%,22%)" }}>
              No archived seasons yet
            </h2>
            <p className="text-sm max-w-xs" style={{ color: "hsl(36,10%,52%)" }}>
              When you finish a review cycle, go to My Wins and tap "Wrap up this season" to archive your wins and draft here.
            </p>
            <Button
              className="mt-6 h-10 px-5 rounded-xl font-semibold"
              style={{ background: "hsl(25,55%,42%)", color: "white" }}
              onClick={() => setLocation("/")}
            >
              Back to dashboard
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-2"
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "hsl(36,10%,52%)" }}>
              {seasons.length} archived season{seasons.length !== 1 ? "s" : ""}
            </p>
            {seasons.map(s => (
              <SeasonCard key={s.id} season={s} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
