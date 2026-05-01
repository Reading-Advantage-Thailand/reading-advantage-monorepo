import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Difficulty } from "@/store/useGameStore";

type RankingEntry = {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
};

type RankingData = Record<string, RankingEntry[]>;

interface RankingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RankingDialog({ open, onOpenChange }: RankingDialogProps) {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRankings();
    }
  }, [open]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/games/magic-defense/ranking");
      if (res.ok) {
        const json = await res.json();
        setData(json.rankings);
      }
    } catch (error) {
      console.error("Failed to fetch rankings", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-300" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return (
      <span className="text-sm font-bold text-white/50">#{index + 1}</span>
    );
  };

  const difficulties: Difficulty[] = ["easy", "normal", "hard", "extreme"];

  const DifficultyTab = ({ diff }: { diff: Difficulty }) => {
    const rankings = data?.[diff] || [];

    if (loading) {
      return (
        <div className="flex flex-col gap-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg bg-white/5 p-3"
            >
              <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (rankings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-white/40">
          <Trophy className="h-12 w-12 mb-2 opacity-20" />
          <p>No wizards yet.</p>
          <p className="text-xs">Be the first to defend the kingdom!</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px] pr-4">
        <div className="flex flex-col gap-2">
          {rankings.map((user, index) => (
            <div
              key={user.userId}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-3 transition-colors",
                index === 0
                  ? "border-yellow-500/30 bg-yellow-500/10"
                  : "border-purple-500/10 bg-purple-900/10 hover:bg-purple-900/20"
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center shrink-0">
                {getRankIcon(index)}
              </div>

              <Avatar className="h-10 w-10 border border-purple-500/20">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-purple-900 text-purple-100 text-xs">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-purple-100">
                  {user.name}
                </div>
                <div className="text-xs text-purple-300/50">Wizard</div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-emerald-400">
                  {user.xp.toLocaleString()} XP
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-950 border-purple-500/20 text-white shadow-[0_0_50px_rgba(168,85,247,0.15)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-purple-100">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Hall of Wizards
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="normal" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-purple-900/20">
            {difficulties.map((diff) => (
              <TabsTrigger
                key={diff}
                value={diff}
                className="uppercase text-[10px] data-[state=active]:bg-purple-600 data-[state=active]:text-white text-purple-300/50"
              >
                {diff}
              </TabsTrigger>
            ))}
          </TabsList>

          {difficulties.map((diff) => (
            <TabsContent key={diff} value={diff} className="mt-4">
              <DifficultyTab diff={diff} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
