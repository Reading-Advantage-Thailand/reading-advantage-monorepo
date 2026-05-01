"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type RankingType = {
  classroom: string;
  name: string;
  rank: number;
  xp: number;
  userId?: string;
};

type LeaderboardProps = {
  data: RankingType[];
  schoolName: string;
  userId: string;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .reduce((initials, word) => initials + word[0].toUpperCase() + ".", "")
    .slice(0, -1);
}

export default function Leaderboard({
  data,
  schoolName,
  userId,
}: LeaderboardProps) {
  const t = useTranslations("Leaderboard");
  const locale = useLocale();

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <p className="text-center text-2xl font-bold">{t("title")}</p>
        <p className="text-muted-foreground text-center">{schoolName}</p>
        <p className="text-muted-foreground text-center text-sm">
          {new Date().toLocaleString(locale, {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">{t("rank")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead className="text-center">{t("xp")}</TableHead>
              <TableHead className="text-center">{t("room")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <TableRow key={item.userId || index}>
                  <TableCell className="text-center font-medium">
                    {item.rank <= 3 ? (
                      <img
                        src={`/rank-${item.rank}.png`}
                        alt={`Rank ${item.rank}`}
                        className="mx-auto h-6 w-6"
                      />
                    ) : (
                      item.rank
                    )}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    {item.userId === userId ? (
                      <span className="text-green-500">{t("you")}</span>
                    ) : (
                      <span>{getInitials(item.name)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{item.xp}</TableCell>
                  <TableCell className="text-center">
                    {item.classroom}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground text-center"
                >
                  {t("noDataAvailable")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
