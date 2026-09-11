"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";

const SignInErrorHandler = () => {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const t = useScopedI18n("components.signInError");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      setError(decodedError);
    }
  }, [searchParams]);

  if (!error) return null;

  const getErrorTitle = (error: string): string => {
    if (error.includes("session_error")) return t("sessionErrorTitle");
    if (error.includes("network_error")) return t("networkErrorTitle");
    return t("authErrorTitle");
  };

  const getErrorDescription = (error: string): string => {
    if (error.includes("session_error")) {
      return t("sessionErrorDescription");
    }
    if (error.includes("network_error")) {
      return t("networkErrorDescription");
    }
    return error;
  };

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {getErrorTitle(error)}
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {getErrorDescription(error)}
          </p>
          {error.includes("session_error") && (
            <div className="mt-2 text-xs text-red-600">
              <strong>{t("iosUsersNote")}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignInErrorHandler;
