import { useState, useEffect } from "react";

interface ClassroomData {
  id: string;
  classroomName: string;
  classCode: string;
  grade: string;
  archived: boolean;
  title: string;
  importedFromGoogle: boolean;
  alternateLink: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  isOwner: boolean;
  teachers: Array<{
    teacherId: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
  student: Array<{
    studentId: string;
    email: string;
    lastActivity: string;
  }>;
  xpData?: {
    today: number;
    week: number;
    month: number;
    allTime: number;
    customRange?: number;
  };
}

interface UseCustomDateRangeXpProps {
  fromDate?: Date;
  toDate?: Date;
  licenseId?: string;
}

interface UseCustomDateRangeXpResult {
  data: ClassroomData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCustomDateRangeXp({
  fromDate,
  toDate,
  licenseId,
}: UseCustomDateRangeXpProps): UseCustomDateRangeXpResult {
  const [data, setData] = useState<ClassroomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!fromDate || !toDate) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from: fromDate.toISOString().split('T')[0], // YYYY-MM-DD format
        to: toDate.toISOString().split('T')[0],
      });

      if (licenseId) {
        params.append('licenseId', licenseId);
      }

      const response = await fetch(`/api/v1/classroom/xp-custom-range?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      console.error('Error fetching custom date range XP data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, licenseId]);

  const refetch = () => {
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}
