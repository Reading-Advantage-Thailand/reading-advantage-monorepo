"use client";
import React from "react";
import { Input } from "@/components/ui/input";

type Props = {
    t: any;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    dueDateFilter: string;
    onDueDateFilterChange: (value: string) => void;
};

export default function SearchFilterDashboard({
    t,
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    dueDateFilter,
    onDueDateFilterChange,
}: Props) {
    return (
        <div className="flex sm:justify-between sm:items-end items-center flex-col sm:flex-row gap-4">
            <Input
                placeholder={t("searchAssignments")}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="max-w-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
                <select
                    className="px-3 py-1 border rounded-md text-sm min-w-[120px]"
                    value={statusFilter}
                    onChange={(event) => {
                        onStatusFilterChange(event.target.value);
                    }}
                >
                    <option value="all">{t("allStatus")}</option>
                    <option value="0">{t("notFinished")}</option>
                    <option value="1">{t("inProgress")}</option>
                    <option value="2">{t("done")}</option>
                </select>
                <select
                    className="px-3 py-1 border rounded-md text-sm min-w-[120px]"
                    value={dueDateFilter}
                    onChange={(event) => {
                        onDueDateFilterChange(event.target.value);
                    }}
                >
                    <option value="all">{t("allDueDates")}</option>
                    <option value="overdue">{t("overdue")}</option>
                    <option value="today">{t("dueToday")}</option>
                    <option value="upcoming">{t("upcomming")}</option>
                </select>
            </div>
        </div>
    );
}