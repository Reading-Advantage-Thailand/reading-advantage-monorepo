"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserRoleManagement from "@/components/user-role-management";
import LineChartCustom from "@/components/line-chart";
import PieChartCustom from "@/components/pie-chart";
import LicesneUsageList from "@/components/license-usage-list";
import { UserActivityLog } from "../models/user-activity-log-model";
import { CloudHail } from "lucide-react";
import { Role } from "@prisma/client";

// Map CEFR levels to numerical values
const cefrToNumber = {
  "A0-": 0,
  A0: 1,
  "A0+": 2,
  A1: 3,
  "A1+": 4,
  "A2-": 5,
  A2: 6,
  "A2+": 7,
  "B1-": 8,
  B1: 9,
  "B1+": 10,
  "B2-": 11,
  B2: 12,
  "B2+": 13,
  "C1-": 14,
  C1: 15,
  "C1+": 16,
  "C2-": 17,
  C2: 18,
};

interface School {
  id: string;
  schoolName: string;
  maxUsers: number;
  usedLicenses: number;
}

interface SchoolList {
  message?: string;
  data: School[];
}

interface UserRole {
  id: string;
  name: string;
  email: string;
  role: string;
  licenseId: string;
  xp: string;
  cefrLevel: keyof typeof cefrToNumber;
}

interface UserRoleList {
  message?: string;
  results: UserRole[];
}

interface CefrLevelData {
  message?: string;
  data: UserActivityLog[];
}

function ShcoolsDashboard({
  schoolList,
  userRoleList,
  averageCefrLevelData,
}: {
  schoolList: SchoolList;
  userRoleList: UserRoleList;
  averageCefrLevelData: CefrLevelData;
}) {

  React.useEffect(() => {
    console.log("SchoolsDashboard received data:");
    console.log("schoolList:", schoolList);
    console.log("userRoleList:", userRoleList);
    console.log("averageCefrLevelData:", averageCefrLevelData);
  }, [schoolList, userRoleList, averageCefrLevelData]);

  const [schoolSelected, setSchoolSelected] = React.useState<string>("all");
  const [schoolData, setSchoolData] = React.useState<School[]>(schoolList.data || []);
  const [userRoleData, setUserRoleData] = React.useState<UserRole[]>(
    userRoleList.results || []
  );
  const [averageCefrgraph, setAverageCefrgraph] = React.useState<
    UserActivityLog[]
  >(averageCefrLevelData.data || []);
  const [isLoading, setIsLoading] = React.useState(false);

  const totalLicenses = schoolData.reduce(
    (sum, item) => sum + (item?.maxUsers || 0),
    0
  );
  const usedLicenses = schoolData.reduce(
    (sum, item) => sum + (item?.usedLicenses || 0),
    0
  );
  const availableLicenses = totalLicenses - usedLicenses;

  const countTeachers = userRoleData.filter(
    (users) => users.role === Role.TEACHER
  ).length;

  const countActiveUsers = userRoleData.filter(
    (users) => users.licenseId && users.licenseId !== ""
  ).length;

  const sumXp = userRoleData.reduce((sum, user) => {
    const xp = parseInt(user.xp) || 0;
    return sum + xp;
  }, 0);

  // Map numerical values back to CEFR levels
  const numberToCefr = Object.fromEntries(
    Object.entries(cefrToNumber).map(([k, v]) => [v, k])
  );

  // Filter and calculate the average CEFR level with null checks
  const cefrValues = userRoleData
    .map((user) => user.cefrLevel ? cefrToNumber[user.cefrLevel] : undefined)
    .filter((value): value is number => value !== undefined && !isNaN(value)); // Type guard

  const averageCefrValue = cefrValues.length > 0 
    ? cefrValues.reduce((sum, value) => sum + value, 0) / cefrValues.length
    : 0;

  const averageCefrLevel = averageCefrValue > 0 ? numberToCefr[Math.round(averageCefrValue)] || "A0-" : "A0-";

  const handleSchoolChange = (value: string) => {
    setIsLoading(true);
    
    try {
      console.log("Selected school value:", value);
      console.log("Available schools:", schoolList.data);
      console.log("Available users:", userRoleList.results);
      
      // Filter school data
      const newData = value === "all" 
        ? schoolList.data || []
        : (schoolList.data || []).filter((school: any) => school?.id === value);
      
      console.log("Filtered school data:", newData);
      
      // Filter user data by licenseId
      const UserData = value === "all" 
        ? userRoleList.results || []
        : (userRoleList.results || []).filter((users: any) => {
            console.log("User licenseId:", users.licenseId, "comparing with:", value);
            return users.licenseId === value;
          });
      
      console.log("Filtered user data:", UserData);

      // Filter activity log data
      const userIds = UserData.map((users: any) => users.id);
      console.log("User IDs to filter:", userIds);
      
      const filteredActivityLog = (averageCefrLevelData.data || []).filter((activity: any) => {
        const included = userIds.includes(activity.userId);
        if (!included && userIds.length > 0) {
          console.log("Activity userId:", activity.userId, "not in filtered users");
        }
        return included;
      });
      
      console.log("Filtered activity log:", filteredActivityLog);
      
      setSchoolSelected(value);
      setAverageCefrgraph(filteredActivityLog);
      setUserRoleData(UserData);
      setSchoolData(newData);
    } catch (error) {
      console.error("Error filtering data:", error);
    } finally {
      setTimeout(() => setIsLoading(false), 100); // Small delay to show loading state
    }
  };

  return (
    <>
      <div className="py-2">
        <Card className="flex items-center">
          <CardHeader>
            <CardTitle>Selete School :</CardTitle>
          </CardHeader>
          <Select
            defaultValue={"all"}
            onValueChange={(value) => handleSchoolChange(value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All School.</SelectItem>
                {(schoolList.data || []).map(
                  (
                    school: { id: string; schoolName: string },
                    index: number
                  ) => (
                    <SelectItem key={index} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  )
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
          {isLoading && (
            <div className="ml-2 text-sm text-gray-500">Loading...</div>
          )}
        </Card>
      </div>
      <div className="py-2 grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 ">
        <Card>
          <CardHeader className="min-h-10">
            <CardTitle className="text-1xl text-center">
              Total Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-center">{countActiveUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-1xl text-center">
              Average User CEFR Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-center">
              {averageCefrLevel ? averageCefrLevel : "A0-"}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Based on user profiles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-1xl font-medium text-center">
              Total XP Gained (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-center">
              {sumXp.toLocaleString()} XP
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-1xl text-center">
              Active Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-center">{countTeachers}</p>
          </CardContent>
        </Card>
      </div>
      <div className="py-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-1xl text-center">
              Average Article CEFR Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartCustom data={averageCefrgraph} />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Based on articles read by users over time
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="py-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">License Usage by School</CardTitle>
          </CardHeader>
          <CardContent>
            <LicesneUsageList data={schoolData.map((school) => ({
              ...school,
              school_name: school.schoolName,
              total_licenses: school.maxUsers,
              used_licenses: school.usedLicenses,
            }))} />
          </CardContent>
        </Card>
      </div>
      <div className="py-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">License Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Total Licenses: {totalLicenses}</p>
            <p>Used Licenses: {usedLicenses}</p>
            <p>Available Licenses: {availableLicenses}</p>
            <PieChartCustom
              availableLicenses={availableLicenses}
              usedLicenses={usedLicenses}
            />
          </CardContent>
        </Card>
      </div>
      <div className="py-2">
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-xl">Users Role Management</CardTitle>
          </CardHeader>
          <CardContent>
            <UserRoleManagement
              data={(userRoleData || []).map((user) => {
                const school = schoolData.find((s) => s.id === user.licenseId);
                return {
                  ...user,
                  school_name: school ? school.schoolName : "-",
                  license_id: user.licenseId, // Map for compatibility
                };
              })}
              licenseId={schoolSelected}
              page="system"
              schoolList={(schoolList.data || []).map((school) => ({
                ...school,
                school_name: school.schoolName,
                total_licenses: school.maxUsers,
                used_licenses: school.usedLicenses,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default ShcoolsDashboard;
