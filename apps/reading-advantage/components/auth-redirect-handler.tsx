"use client";

import React, { useEffect } from "react";
import { getRedirectResult } from "firebase/auth";
import { signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase";
import {
  getAuthErrorMessage,
  isIOS,
  clearAuthState,
} from "@/utils/ios-auth-handler";

interface AuthRedirectHandlerProps {
  children: React.ReactNode;
}

export const AuthRedirectHandler: React.FC<AuthRedirectHandlerProps> = ({
  children,
}) => {
  const [isHandlingRedirect, setIsHandlingRedirect] = React.useState(false);
  const [showSkipOption, setShowSkipOption] = React.useState(false);
  const [hasHandledRedirect, setHasHandledRedirect] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isIOSDevice = isIOS();
  const isAuthPage = pathname?.includes("/auth/");
  const isAuthenticated = status === "authenticated";

  const skipRedirectHandling = () => {
    setIsHandlingRedirect(false);
    setShowSkipOption(false);
    setHasHandledRedirect(true);
  };

  useEffect(() => {
    if (isAuthPage || isAuthenticated || hasHandledRedirect) {
      return;
    }

    if (status === "loading") {
      return;
    }

    const handleRedirectResult = async () => {
      const timeoutId = setTimeout(() => {
        setIsHandlingRedirect(false);
        setHasHandledRedirect(true);
      }, 10000);

      const skipTimeoutId = setTimeout(() => {
        setShowSkipOption(true);
      }, 5000);

      try {
        setIsHandlingRedirect(true);
        const result = await getRedirectResult(firebaseAuth);

        if (result && result.user) {
          const idToken = await result.user.getIdToken(true);

          if (idToken) {
            await signIn("credentials", {
              idToken,
              callbackUrl: "/student/read",
            });
          }
        }
      } catch (error: any) {
        console.error("Redirect result error:", error);

        if (error.code === "auth/missing-or-invalid-nonce") {
          await clearAuthState(firebaseAuth);
          window.location.href = "/auth/signin?error=session_error";
        } else if (error.code === "auth/network-request-failed") {
          window.location.href = "/auth/signin?error=network_error";
        } else {
          const errorMessage = getAuthErrorMessage(error.code, isIOSDevice);
          console.error("Authentication error:", errorMessage);
          window.location.href = `/auth/signin?error=${encodeURIComponent(errorMessage)}`;
        }
      } finally {
        clearTimeout(timeoutId);
        clearTimeout(skipTimeoutId);
        setIsHandlingRedirect(false);
        setShowSkipOption(false);
        setHasHandledRedirect(true);
      }
    };

    handleRedirectResult();
  }, [isAuthPage, isAuthenticated, status, hasHandledRedirect]); // Add hasHandledRedirect dependency

  if (isHandlingRedirect) {
    return (
      <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Completing sign-in...</p>
          {showSkipOption && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">
                Taking longer than expected?
              </p>
              <button
                onClick={skipRedirectHandling}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
              >
                Continue to app
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirectHandler;
