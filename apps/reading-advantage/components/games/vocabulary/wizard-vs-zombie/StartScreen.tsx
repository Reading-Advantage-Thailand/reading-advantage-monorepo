import { VocabularyItem } from "@/store/useGameStore";
import { BookOpen, Trophy, Shield, Ghost, Skull } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/games/basePath";
import { Difficulty } from "@/lib/games/wizardZombie";
import { useScopedI18n } from "@/locales/client";

interface StartScreenProps {
  vocabulary: VocabularyItem[];
  onStart: (difficulty: Difficulty) => void;
}

type TabType = "briefing" | "rankings" | "vocabulary";

interface RankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
}

function SpriteAnimation({
  src,
  frameWidth,
  frameHeight,
  className,
}: {
  src: string;
  frameWidth: number;
  frameHeight: number;
  className?: string;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frameWidth);
    }, 200); // 150ms per frame
    return () => clearInterval(interval);
  }, [frameWidth]);

  return (
    <div className={cn("overflow-hidden relative", className)}>
      <img
        src={src}
        alt="sprite"
        className="max-w-none absolute top-0 left-0"
        style={{
          width: `${frameWidth * 100}%`,
          height: `${frameHeight * 100}%`,
          transform: `translate(-${frame * (100 / frameWidth)}%, 0)`,
        }}
      />
    </div>
  );
}

export function StartScreen({ vocabulary, onStart }: StartScreenProps) {
  const t = useScopedI18n("pages.student.gamesPage");
  const [activeTab, setActiveTab] = useState<TabType>("briefing");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);

  const DIFFICULTY_CONFIG = {
    easy: {
      label: t("wizardVsZombie.difficulty.easy"),
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      description: t("wizardVsZombie.difficulty.easyDesc"),
    },
    normal: {
      label: t("wizardVsZombie.difficulty.normal"),
      color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
      description: t("wizardVsZombie.difficulty.normalDesc"),
    },
    hard: {
      label: t("wizardVsZombie.difficulty.hard"),
      color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
      description: t("wizardVsZombie.difficulty.hardDesc"),
    },
    extreme: {
      label: t("wizardVsZombie.difficulty.extreme"),
      color: "text-red-400 bg-red-400/10 border-red-400/20",
      description: t("wizardVsZombie.difficulty.extremeDesc"),
    },
  };

  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoadingRankings(true);
      try {
        const response = await fetch(
          `/api/v1/games/wizard-vs-zombie/ranking?difficulty=${difficulty}`,
        );
        const data = await response.json();
        if (response.ok && data.rankings) {
          setRankings(data.rankings);
        } else {
          setRankings([]);
        }
      } catch (error) {
        console.error("Error fetching rankings:", error);
        setRankings([]);
      } finally {
        setIsLoadingRankings(false);
      }
    };

    if (activeTab === "rankings") {
      fetchRankings();
    }
  }, [activeTab, difficulty]);

  const tabs = [
    {
      id: "briefing" as TabType,
      label: t("wizardVsZombie.tabs.briefing"),
      icon: Shield,
    },
    {
      id: "rankings" as TabType,
      label: t("wizardVsZombie.tabs.rankings"),
      icon: Trophy,
    },
    {
      id: "vocabulary" as TabType,
      label: t("wizardVsZombie.tabs.vocabulary"),
      icon: BookOpen,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative z-20 flex h-full flex-col">
        {/* Header Section */}
        <div className="px-6 py-4 flex-none border-b border-white/5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-purple-300/60 mb-1 font-bold">
            Wizard vs Zombie
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {t("wizardVsZombie.arcaneDefense")}
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                {t("wizardVsZombie.prepareSpells")}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm">
              {t("common.ready")}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-none px-3 sm:px-6 pt-4 pb-0">
          <div className="flex gap-1 sm:gap-2 bg-slate-900/60 p-1 sm:p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300",
                    isActive
                      ? "bg-purple-600/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)] border border-purple-500/30"
                      : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-300",
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-sm font-bold uppercase tracking-wider">
                    {tab.label}
                  </span>
                  <span className="inline sm:hidden text-[10px] font-bold uppercase tracking-wider">
                    {tab.label.slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          {/* Briefing Tab */}
          {activeTab === "briefing" && (
            <div className="h-full grid gap-4 lg:gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="relative p-6 rounded-2xl border border-purple-500/20 bg-purple-900/10 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px] -z-10" />
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Ghost className="w-5 h-5 text-purple-400" />
                    {t("wizardVsZombie.missionObjective")}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {t("wizardVsZombie.missionDescription")}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {t("wizardVsZombie.difficultySelection")}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(
                      (d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-lg border transition-all text-left",
                            difficulty === d
                              ? DIFFICULTY_CONFIG[d].color
                              : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10",
                          )}
                        >
                          <span className="text-sm font-bold uppercase mb-1">
                            {DIFFICULTY_CONFIG[d].label}
                          </span>
                          <span className="text-[10px] opacity-70 leading-tight">
                            {DIFFICULTY_CONFIG[d].description}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center items-center p-6 rounded-2xl border border-white/10 bg-black/20 text-center">
                {/* Placeholder for visual or tips */}
                <div className="w-24 h-24 mb-4 relative overflow-hidden flex justify-center items-center">
                  <div className="w-full h-full relative">
                    {/* Sprite Animation */}
                    <SpriteAnimation
                      src={withBasePath(
                        "/games/vocabulary/wizard-vs-zombie/zombie_3x3_pose_sheet.png",
                      )}
                      frameWidth={3}
                      frameHeight={3}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h3 className="text-white font-bold mb-2">
                  {t("wizardVsZombie.surviveHorde")}
                </h3>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>
                    {t("wizardVsZombie.instructions.useArrowKeys")}{" "}
                    <span className="text-yellow-400">
                      {t("wizardVsZombie.instructions.arrowKeys")}
                    </span>
                    /{t("wizardVsZombie.instructions.wasd")}{" "}
                    {t("wizardVsZombie.instructions.toMove")}
                  </li>
                  <li>
                    {t("wizardVsZombie.instructions.press")}{" "}
                    <span className="text-yellow-400">
                      {t("wizardVsZombie.instructions.space")}
                    </span>{" "}
                    {t("wizardVsZombie.instructions.toCastShockwave")}
                  </li>
                  <li>{t("wizardVsZombie.instructions.collectOrbs")}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Rankings Tab */}
          {activeTab === "rankings" && (
            <div className="h-full flex flex-col gap-4">
              {/* Difficulty Filter for Rankings */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold uppercase border transition-all whitespace-nowrap",
                      difficulty === d
                        ? DIFFICULTY_CONFIG[d].color
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
                    )}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    {t("wizardVsZombie.topSurvivors")} (
                    {DIFFICULTY_CONFIG[difficulty].label})
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {isLoadingRankings ? (
                    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                      {t("wizardVsZombie.loadingRankings")}
                    </div>
                  ) : rankings.length > 0 ? (
                    <div className="space-y-2">
                      {rankings.map((entry, index) => (
                        <div
                          key={entry.userId}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div
                            className={cn(
                              "flex-none w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                              index === 0
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                : index === 1
                                  ? "bg-slate-400/20 text-slate-300 border border-slate-400/30"
                                  : index === 2
                                    ? "bg-orange-600/20 text-orange-400 border border-orange-600/30"
                                    : "bg-slate-800 text-slate-400 border border-slate-700",
                            )}
                          >
                            {index + 1}
                          </div>
                          {entry.image && (
                            <img
                              src={entry.image}
                              alt={entry.name}
                              className="w-8 h-8 rounded-full border border-white/10"
                            />
                          )}
                          <span className="flex-1 text-sm font-medium text-slate-200 truncate">
                            {entry.name}
                          </span>
                          <span className="text-sm font-bold text-purple-400">
                            {entry.xp.toLocaleString()} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                      <Trophy className="w-8 h-8 opacity-20 mb-2" />
                      {t("wizardVsZombie.noRecords")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vocabulary Tab */}
          {activeTab === "vocabulary" && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  {t("wizardVsZombie.activeVocabulary")} ({vocabulary.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {vocabulary.length > 0 ? (
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {vocabulary.slice(0, 50).map((item, index) => (
                      <div
                        key={`${item.term}-${index}`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10"
                      >
                        <span className="text-sm font-medium text-slate-200">
                          {item.term}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.translation}
                        </span>
                      </div>
                    ))}
                    {vocabulary.length > 50 && (
                      <div className="col-span-full text-center py-2 text-xs text-slate-500 italic">
                        + {vocabulary.length - 50} more words...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                    <BookOpen className="w-8 h-8 opacity-20 mb-2" />
                    {t("wizardVsZombie.noVocabulary")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-6 pt-4 border-t border-white/5 bg-black/20">
          <button
            onClick={() => onStart(difficulty)}
            className="w-full relative group overflow-hidden py-4 rounded-xl bg-purple-600 text-white font-bold text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="flex items-center justify-center gap-2 relative z-10">
              {t("wizardVsZombie.startGame")} (
              {DIFFICULTY_CONFIG[difficulty].label})
              <Skull className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
