"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useScopedI18n } from "@/locales/client";
import { 
  ChevronLeft, 
  ChevronRight, 
  School, 
  Users, 
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface License {
  id: string;
  schoolName: string;
  licenseType: string;
  usedLicenses: number;
  maxUsers: number;
  expiresAt: string;
}

export default function ModernLicenseUsage() {
  const t = useScopedI18n("components.modernLicenseUsage") as any;
  const [licenses, setLicenses] = useState<License[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`);
        const data = await response.json();
        setLicenses(data.data || []);
      } catch (error) {
        console.error('Error fetching licenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, []);

  const nextLicense = () => {
    setCurrentIndex((prev) => (prev + 1) % licenses.length);
  };

  const prevLicense = () => {
    setCurrentIndex((prev) => (prev - 1 + licenses.length) % licenses.length);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!licenses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <School className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg mb-2">{t("noLicenses.title")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("noLicenses.description")}
        </p>
      </div>
    );
  }

  const currentLicense = licenses[currentIndex];
  const usagePercentage = (currentLicense.usedLicenses / currentLicense.maxUsers) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isExpiringSoon = new Date(currentLicense.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">
            {licenses.length} {t("schools.total", { count: licenses.length })}
          </p>
        </div>
        
        {licenses.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevLicense}
              disabled={licenses.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentIndex + 1} {t("of")} {licenses.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextLicense}
              disabled={licenses.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* License details */}
      <div className="space-y-4">
        {/* School info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{currentLicense.schoolName}</span>
          </div>
          <Badge variant={currentLicense.licenseType === 'PREMIUM' ? 'default' : 'secondary'}>
            {currentLicense.licenseType}
          </Badge>
        </div>

        {/* Usage progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{t("labels.usage")}</span>
          </div>
            <span className="font-medium">
              {currentLicense.usedLicenses} / {currentLicense.maxUsers}
            </span>
          </div>
          
          <Progress 
            value={usagePercentage} 
            className={`h-3 ${isNearLimit ? 'progress-warning' : ''}`}
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className={`font-medium ${isNearLimit ? 'text-orange-600' : ''}`}>
              {usagePercentage.toFixed(1)}% {t("labels.used")}
            </span>
            <span>{currentLicense.maxUsers}</span>
          </div>
        </div>

        {/* Expiration info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t("labels.expires")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {new Date(currentLicense.expiresAt).toLocaleDateString()}
            </span>
            {isExpiringSoon ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Warnings */}
        {(isNearLimit || isExpiringSoon) && (
          <div className="space-y-2">
            {isNearLimit && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800 dark:text-orange-200">
                  {t("warnings.nearLimit")}
                </span>
              </div>
            )}
            {isExpiringSoon && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <Calendar className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t("warnings.expiresSoon")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}