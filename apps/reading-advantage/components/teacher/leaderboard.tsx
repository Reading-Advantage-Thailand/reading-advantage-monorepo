import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

type RankingType = {
  classroom: string;
  name: string;
  rank: number;
  xp: number;
  userId?: string;
};

type LeaderboardProps = {
  data: RankingType[];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .reduce((initials, word) => initials + word[0].toUpperCase() + ".", "")
    .slice(0, -1);
}

export default function Leaderboard({ data }: LeaderboardProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <p className="text-center text-2xl font-bold">Leaderboard</p>
        <p className="text-center">
          {new Date().toLocaleString("en-US", { month: "long" })}
        </p>
      </div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">XP</TableHead>
              <TableHead className="text-center">Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item, index) => (
                <TableRow key={item.userId || index}>
                  <TableCell className="font-medium text-center">
                    {item.rank <= 3 ? (
                      <img
                        src={`/rank-${item.rank}.png`}
                        alt={`Rank ${item.rank}`}
                        className="h-6 w-6 mx-auto"
                      />
                    ) : (
                      item.rank
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2 items-center">
                    {getInitials(item.name)}
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
                  className="text-center text-muted-foreground"
                >
                  No data available for this month
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
