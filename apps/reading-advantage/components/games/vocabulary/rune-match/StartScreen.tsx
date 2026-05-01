import { VocabularyItem } from "@/store/useGameStore";
import { BookOpen, Swords, Trophy, Shield, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  RUNE_MATCH_CONFIG,
  type MonsterType,
} from "@/lib/games/runeMatchConfig";
import { withBasePath } from "@/lib/games/basePath";
import { useScopedI18n } from "@/locales/client";

// Helper for simplified monster metadata (could be shared or duplicated if simple enough)
const getMonsterMetadata = (
  t: any,
): Record<MonsterType, { label: string; image: string }> => ({
  goblin: {
    label: t("runeMatch.monsters.goblin"),
    image: "/games/vocabulary/rune-match/monsters/goblin_3x4_pose_sheet.png",
  },
  skeleton: {
    label: t("runeMatch.monsters.skeleton"),
    image: "/games/vocabulary/rune-match/monsters/skeleton_3x4_pose_sheet.png",
  },
  orc: {
    label: t("runeMatch.monsters.orc"),
    image: "/games/vocabulary/rune-match/monsters/orc_3x4_pose_sheet.png",
  },
  dragon: {
    label: t("runeMatch.monsters.dragon"),
    image: "/games/vocabulary/rune-match/monsters/dragon_3x4_pose_sheet.png",
  },
});

interface StartScreenProps {
  vocabulary: VocabularyItem[];
  onStart: () => void;
}

type TabType = "briefing" | "rankings" | "vocabulary";

interface RankingEntry {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
}

export function StartScreen({ vocabulary, onStart }: StartScreenProps) {
  const t = useScopedI18n("pages.student.gamesPage");
  const MONSTER_METADATA = getMonsterMetadata(t);
  const [activeTab, setActiveTab] = useState<TabType>("briefing");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [selectedMonster, setSelectedMonster] = useState<MonsterType>("goblin");

  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoadingRankings(true);
      try {
        const response = await fetch(
          `/api/v1/games/rune-match/ranking?difficulty=${selectedMonster}`,
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
  }, [activeTab, selectedMonster]);

  const tabs = [
    {
      id: "briefing" as TabType,
      label: t("runeMatch.tabs.briefing"),
      icon: Swords,
    },
    {
      id: "rankings" as TabType,
      label: t("runeMatch.tabs.rankings"),
      icon: Trophy,
    },
    {
      id: "vocabulary" as TabType,
      label: t("runeMatch.tabs.vocabulary"),
      icon: BookOpen,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900/70 backdrop-blur-md rounded-lg overflow-hidden border border-white/10">
      <div className="relative z-20 flex h-full flex-col">
        {/* Header Section */}
        <div className="px-6 py-4 flex-none border-b border-white/5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/60 mb-1 font-bold">
            Rune Match
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {t("runeMatch.adventureAwaits")}
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                {t("runeMatch.prepareRunes")}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm">
              {t("common.ready")}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-none px-6 pt-4 pb-0">
          <div className="flex gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300",
                    isActive
                      ? "bg-cyan-600/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)] border border-cyan-500/30"
                      : "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-300",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {tab.label}
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
                <div className="relative p-6 rounded-2xl border border-cyan-500/20 bg-cyan-900/10 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-[40px] -z-10" />
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    {t("runeMatch.missionObjective")}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {t("runeMatch.missionDescription")}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {t("runeMatch.gameplayTips")}
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{t("runeMatch.tip1")}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400 font-bold">•</span>
                      <span>
                        {t("runeMatch.tip2Prefix")}{" "}
                        <span className="text-green-400">
                          {t("runeMatch.tip2Heal")}
                        </span>{" "}
                        {t("runeMatch.tip2Suffix")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-400 font-bold">•</span>
                      <span>
                        {t("runeMatch.tip3Prefix")}{" "}
                        <span className="text-blue-400">
                          {t("runeMatch.tip3Shield")}
                        </span>{" "}
                        {t("runeMatch.tip3Suffix")}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-yellow-400 font-bold">•</span>
                      <span>{t("runeMatch.tip4")}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-center items-center p-6 rounded-2xl border border-white/10 bg-black/20 text-center">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] animate-pulse">
                  <Swords className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-white font-bold mb-1">
                  {t("runeMatch.combatReady")}
                </h3>
                <p className="text-xs text-slate-400 max-w-[200px]">
                  {t("runeMatch.combatReadyDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Rankings Tab */}
          {activeTab === "rankings" && (
            <div className="h-full flex flex-col gap-4">
              {/* Monster Selector */}
              <div className="flex-none grid grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
                {(Object.keys(MONSTER_METADATA) as MonsterType[]).map(
                  (type) => {
                    const meta = MONSTER_METADATA[type];
                    const isSelected = selectedMonster === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedMonster(type)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-2 rounded-xl border transition-all duration-300",
                          isSelected
                            ? "bg-white/10 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-105"
                            : "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10 opacity-70 hover:opacity-100",
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950/50 border border-white/5">
                          <div
                            style={{
                              backgroundImage: `url(${withBasePath(meta.image)})`,
                              backgroundSize: "300% 400%",
                              backgroundPosition: "50% 0", // Face forward
                              imageRendering: "pixelated",
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isSelected ? "text-white" : "text-slate-400",
                          )}
                        >
                          {meta.label}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    {t("runeMatch.topHeroes")} (
                    {MONSTER_METADATA[selectedMonster].label})
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {isLoadingRankings ? (
                    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                      {t("runeMatch.loadingRankings")}
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
                          <span className="text-sm font-bold text-cyan-400">
                            {entry.xp.toLocaleString()} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
                      <Trophy className="w-8 h-8 opacity-20 mb-2" />
                      {t("runeMatch.noRankings")}
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
                  {t("runeMatch.runeCollection")} ({vocabulary.length})
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
                    {t("runeMatch.noVocabulary")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none p-6 pt-4 border-t border-white/5 bg-black/20">
          <button
            onClick={onStart}
            className="w-full relative group overflow-hidden py-4 rounded-xl bg-cyan-600 text-white font-bold text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="flex items-center justify-center gap-2 relative z-10">
              {t("common.startGame")}
              <Swords className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
