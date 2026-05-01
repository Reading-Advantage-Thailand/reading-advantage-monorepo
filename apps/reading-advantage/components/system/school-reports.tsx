"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AdminReports from "@/components/admin/reports";
import { Header } from "@/components/header";

interface SystemSchoolReportsProps {
  licenseId: string;
}

function SystemSchoolReports({ licenseId }: SystemSchoolReportsProps) {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");

  useEffect(() => {
    const fetchClassrooms = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/v1/system/school-classrooms?licenseId=${licenseId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch school classrooms');
        }

        const result = await response.json();
        setClassrooms(result.data || []);
        setSchoolName(result.schoolName || "Unknown School");
      } catch (error) {
        console.error('Error fetching school classrooms:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setClassrooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (licenseId) {
      fetchClassrooms();
    }
  }, [licenseId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to System Reports
          </Button>
          <Header heading={`${schoolName} - School Reports`} />
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading school reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to System Reports
          </Button>
          <Header heading={`${schoolName} - School Reports`} />
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading reports:</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to System Reports
        </Button>
        <Header heading={`${schoolName} - School Reports`} />
        <p className="text-muted-foreground mt-2">
          View comprehensive reports for {schoolName} including classroom performance and student analytics.
        </p>
      </div>
      
      <AdminReports classes={classrooms} />
    </div>
  );
}

export default SystemSchoolReports;
