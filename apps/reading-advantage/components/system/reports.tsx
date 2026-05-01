"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  TrendingUp,
  School,
  Eye,
  MoreHorizontal,
  Copy,
  Check,
} from "lucide-react";
import { CaretSortIcon } from "@radix-ui/react-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { SystemReportsSkeleton } from "./reports-skeleton";

type SchoolXpData = {
  school: string;
  xp: number;
};

type LicenseData = {
  id: string;
  key: string;
  schoolName: string;
  expiresAt: Date | null;
  maxUsers: number;
  licenseType: string;
  currentUsers: number;
  totalXp: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner?: {
    id: string;
    name: string | null;
  } | null;
};
const chartConfig = {
  xp: {
    label: "Total XP",
    theme: {
      light: "hsl(var(--primary))",
      dark: "hsl(var(--primary))",
    },
  },
} satisfies ChartConfig;

interface SystemReportsProps {}

function SystemReports({}: SystemReportsProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isClient, setIsClient] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [schoolXpData, setSchoolXpData] = React.useState<SchoolXpData[]>([]);
  const [licensesData, setLicensesData] = React.useState<LicenseData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [isChartLoading, setIsChartLoading] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = React.useState<LicenseData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const t = useScopedI18n("components.articleRecordsTable");
  React.useEffect(() => {
    setIsClient(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  React.useEffect(() => {
    if (!isClient) return;

    const checkScreenSize = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setColumnVisibility({
          key: false,
          totalXp: false,
          licenseType: false,
          createdAt: false,
          currentUsers: false,
          expiresAt: false,
          isActive: false,
        });
      } else if (width < 768) {
        setColumnVisibility({
          key: true,
          totalXp: true,
          licenseType: true,
          createdAt: true,
          currentUsers: true,
          expiresAt: true,
          isActive: true,
        });
      } else if (width < 1024) {
        setColumnVisibility({
          key: true,
          totalXp: true,
          licenseType: true,
          createdAt: true,
          currentUsers: true,
          expiresAt: true,
          isActive: true,
        });
      } else {
        setColumnVisibility({
          key: true,
          totalXp: true,
          licenseType: true,
          createdAt: true,
          currentUsers: true,
          expiresAt: true,
          isActive: true,
        });
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isClient]);

  const fetchSchoolXpData = React.useCallback(
    async (period?: string, dateFrom?: string, dateTo?: string) => {
      setIsChartLoading(true);
      try {
        const params = new URLSearchParams();
        if (period) params.append("period", period);
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);

        const response = await fetch(
          `/api/v1/system/school-xp?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch school XP data");
        }

        const result = await response.json();
        setSchoolXpData(result.data || []);
      } catch (error) {
        console.error("Error fetching school XP data:", error);
        setSchoolXpData([]);
      } finally {
        setIsChartLoading(false);
      }
    },
    []
  );

  const fetchLicensesData = React.useCallback(async () => {
    try {
      const response = await fetch("/api/v1/system/licenses", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch licenses data");
      }

      const result = await response.json();
      setLicensesData(result.data || []);
    } catch (error) {
      console.error("Error fetching licenses data:", error);
      setLicensesData([]);
    }
  }, []);

  const handlePeriodChange = React.useCallback(
    (period: string) => {
      setSelectedPeriod(period);
      setDateRange(undefined);
      fetchSchoolXpData(period);
    },
    [fetchSchoolXpData]
  );

  const handleDateRangeChange = React.useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      if (range?.from && range?.to) {
        setSelectedPeriod("custom");
        fetchSchoolXpData(
          undefined,
          range.from.toISOString(),
          range.to.toISOString()
        );
      }
    },
    [fetchSchoolXpData]
  );

  React.useEffect(() => {
    fetchSchoolXpData("all");
  }, [fetchSchoolXpData]);

  React.useEffect(() => {
    fetchLicensesData();
  }, [fetchLicensesData]);

  React.useEffect(() => {
    if (schoolXpData.length >= 0 && licensesData.length >= 0) {
      setIsLoading(false);
    }
  }, [schoolXpData, licensesData]);

  const formatXP = (xp: number) => {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    } else if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    // Use ISO format to avoid hydration mismatch between server and client
    return dateObj.toLocaleDateString("th-TH", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Bangkok'
    });
  };

  const ActionsCell = ({ school }: { school: LicenseData }) => {
    const router = useRouter();

    const handleViewReports = () => {
      router.push(`/system/reports/${school.id}`);
    };

    const handleViewDetail = () => {
      setSelectedSchool(school);
      setDetailOpen(true);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail();
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Detail
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              handleViewReports();
            }} 
            className="cursor-pointer"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Reports
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columns: ColumnDef<LicenseData>[] = [
    {
      accessorKey: "schoolName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            School Name
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("schoolName")}</div>
      ),
    },
    {
      accessorKey: "key",
      header: "License Key",
      cell: ({ row }) => {
        const fullKey = row.getValue("key") as string;
        const truncatedKey = fullKey.substring(0, 10) + "...";
        const isCopied = copiedKey === fullKey;

        const handleCopy = async (e: React.MouseEvent) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(fullKey);
            setCopiedKey(fullKey);
            setTimeout(() => setCopiedKey(null), 2000);
          } catch (err) {
            console.error("Failed to copy:", err);
          }
        };

        return (
          <div className="font-mono text-sm hidden sm:flex items-center gap-2">
            <span>{truncatedKey}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCopy}
              title="Copy license key"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "totalXp",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hidden sm:flex"
          >
            Total XP
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-semibold text-blue-600 ml-5 hidden sm:block">
          {formatXP(row.getValue("totalXp") || 0)}
        </div>
      ),
    },
    {
      accessorKey: "currentUsers",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hidden sm:flex"
          >
            Users
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const currentUsers = row.getValue("currentUsers") as number;
        const maxUsers = row.original.maxUsers;
        return (
          <div className="items-center space-x-2 hidden sm:flex">
            <span>
              {currentUsers}/{maxUsers}
            </span>
            <Badge
              variant={currentUsers >= maxUsers ? "destructive" : "secondary"}
            >
              {currentUsers >= maxUsers ? "Full" : "Available"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "licenseType",
      header: "License Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="hidden sm:block">
          {row.getValue("licenseType")}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => (
        <div className="hidden sm:block">
          {formatDate(row.getValue("createdAt"))}
        </div>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "Expires At",
      cell: ({ row }) => {
        const expiresAt = row.getValue("expiresAt") as Date | null;
        if (!expiresAt) return <div className="hidden sm:block">Never</div>;

        const isExpired = new Date(expiresAt) < new Date();
        return (
          <div
            className={`hidden sm:block ${isExpired ? "text-red-600 font-semibold" : ""}`}
          >
            {formatDate(expiresAt)}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="hidden sm:block"
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <ActionsCell school={row.original} />,
    },
  ];

  const table = useReactTable({
    data: licensesData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (isLoading || !isClient) {
    return <SystemReportsSkeleton />;
  }

  const totalXp = schoolXpData.reduce((sum, school) => sum + school.xp, 0);
  const totalSchools = schoolXpData.length;
  const totalLicenses = licensesData.length;
  const activeLicenses = licensesData.filter(
    (license) => license.isActive
  ).length;

  return (
    <>
      <div className="container mx-auto py-6 px-4">
        <Header heading="System Reports" />
        <CardDescription className="text-muted-foreground mt-2 ml-2">
          View comprehensive system analytics including school performance,
          license usage, and XP statistics across all registered schools.
        </CardDescription>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatXP(totalXp)}
            </div>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Schools
            </CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalSchools}</div>
            <p className="text-xs text-muted-foreground">With XP activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Licenses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totalLicenses}</div>
            <p className="text-xs text-muted-foreground">
              {activeLicenses} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {licensesData.reduce(
                (sum, license) => sum + license.currentUsers,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Across all licenses</p>
          </CardContent>
        </Card>
      </div>

      {/* XP Chart */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <CardTitle className="text-lg md:text-xl">
              Top Schools by XP
            </CardTitle>

            {/* Date filter controls */}
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {/* Period buttons */}
              <div className="flex flex-wrap gap-2">
                {["day", "week", "month", "all"].map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodChange(period)}
                    disabled={isChartLoading}
                    className="flex-1 sm:flex-none min-w-[80px]"
                  >
                    {period === "day"
                      ? "Today"
                      : period === "week"
                        ? "7 Days"
                        : period === "month"
                          ? "30 Days"
                          : "All Time"}
                  </Button>
                ))}
              </div>

              {/* Custom date range picker */}
              <div className="w-full lg:w-auto">
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={handleDateRangeChange}
                  className="w-full lg:w-auto"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[400px]">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading chart data...
                  </p>
                </div>
              </div>
            ) : schoolXpData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={schoolXpData.slice(0, 10)} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="school"
                    angle={isMobile ? -90 : -45}
                    textAnchor="end"
                    height={isMobile ? 120 : 100}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    fontSize={isMobile ? 10 : 12}
                  />
                  <YAxis
                    tickFormatter={formatXP}
                    tickLine={false}
                    axisLine={false}
                    fontSize={isMobile ? 10 : 12}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          formatXP(value as number),
                          name as string,
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="xp"
                    fill="var(--color-xp)"
                    name="Total XP"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  No data available for the selected period
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schools Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Schools Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center py-4">
            <Input
              placeholder="Filter schools..."
              value={
                (table.getColumn("schoolName")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("schoolName")
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead
                              key={header.id}
                              className="whitespace-nowrap"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className="whitespace-nowrap"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {licensesData.length}{" "}
              schools
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Detail Dialog - Outside table */}
      <Dialog open={detailOpen} onOpenChange={(open) => {
        setDetailOpen(open);
        if (!open) {
          setSelectedSchool(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              School Details
            </DialogTitle>
          </DialogHeader>
          {selectedSchool && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  School Name
                </h4>
                <p className="text-base font-medium">{selectedSchool.schoolName}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  License Key
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono bg-muted p-2 rounded flex-1 break-all">
                    {selectedSchool.key}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(selectedSchool.key);
                        setCopiedKey(selectedSchool.key);
                        setTimeout(() => setCopiedKey(null), 2000);
                      } catch (err) {
                        console.error("Failed to copy:", err);
                      }
                    }}
                    title="Copy license key"
                  >
                    {copiedKey === selectedSchool.key ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Total XP
                </h4>
                <p className="text-lg font-semibold text-blue-600">
                  {formatXP(selectedSchool.totalXp || 0)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Current Users
                </h4>
                <p className="text-base">{selectedSchool.currentUsers}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Max Users
                </h4>
                <p className="text-base">{selectedSchool.maxUsers}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  License Type
                </h4>
                <Badge variant="outline">{selectedSchool.licenseType}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Created Date
                </h4>
                <p className="text-base">{formatDate(selectedSchool.createdAt)}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Expires At
                </h4>
                <p className="text-base">
                  {selectedSchool.expiresAt ? (
                    <span
                      className={
                        new Date(selectedSchool.expiresAt) < new Date()
                          ? "text-red-600 font-semibold"
                          : ""
                      }
                    >
                      {formatDate(selectedSchool.expiresAt)}
                    </span>
                  ) : (
                    "Never"
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Status
                </h4>
                <Badge variant={selectedSchool.isActive ? "default" : "secondary"}>
                  {selectedSchool.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SystemReports;
