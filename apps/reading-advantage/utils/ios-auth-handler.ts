/**
 * iOS Authentication Handler
 * Handles authentication issues specific to iOS devices
 */

import { Auth } from "firebase/auth";

/**
 * Check if the current environment has sessionStorage issues (common on iOS)
 */
export const hasSessionStorageIssues = (): boolean => {
  if (typeof window === "undefined") return false;
  
  try {
    // Test sessionStorage availability
    const test = "__sessionStorage_test__";
    sessionStorage.setItem(test, "test");
    sessionStorage.removeItem(test);
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * Check if the device is likely iOS
 */
export const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if the browser is in private/incognito mode
 */
export const isPrivateMode = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  
  try {
    // Try to use localStorage
    const test = "__private_mode_test__";
    localStorage.setItem(test, "test");
    localStorage.removeItem(test);
    
    // Try to open indexedDB
    if (window.indexedDB) {
      const db = indexedDB.open("test");
      return new Promise((resolve) => {
        db.onsuccess = () => resolve(false);
        db.onerror = () => resolve(true);
      });
    }
    
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * Get authentication error message based on error code and device type
 */
export const getAuthErrorMessage = (errorCode: string, isIOSDevice: boolean = false): string => {
  const iosMessages: Record<string, string> = {
    "auth/missing-or-invalid-nonce": "Authentication failed. This may happen in private browsing mode. Please try using Safari in normal mode or a different browser.",
    "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
    "auth/popup-blocked": "Pop-up was blocked. Please allow pop-ups for this site or try a different sign-in method.",
    "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
    "auth/invalid-credential": "Invalid credentials. Please check your login information and try again.",
    "auth/too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled. Please contact support.",
    "auth/user-disabled": "This account has been disabled. Please contact support.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
  };

  const defaultMessages: Record<string, string> = {
    "auth/missing-or-invalid-nonce": "Authentication error. Please try signing in again.",
    "auth/network-request-failed": "Network error. Please check your connection and try again.",
    "auth/popup-blocked": "Please disable popup blocker and try again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
    "auth/invalid-credential": "Invalid credentials. Please check your login information.",
    "auth/too-many-requests": "Too many unsuccessful login attempts. Please try again later.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
  };

  const messages = isIOSDevice ? iosMessages : defaultMessages;
  return messages[errorCode] || "An unexpected error occurred. Please try again.";
};

/**
 * Clear authentication state for iOS devices with sessionStorage issues
 */
export const clearAuthState = async (auth: Auth): Promise<void> => {
  try {
    // Clear any existing auth state
    await auth.signOut();
    
    // Clear local storage related to Firebase auth
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('firebase:')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage if available
      try {
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
          if (key.startsWith('firebase:')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        // SessionStorage not available, ignore
      }
    }
  } catch (e) {
    console.error("Error clearing auth state:", e);
  }
};

/**
 * Configuration for Firebase Auth on iOS devices
 */
export const getIOSAuthConfig = () => ({
  // Use redirect flow for iOS devices with sessionStorage issues
  useRedirectFlow: hasSessionStorageIssues() || isIOS(),
  // Timeout for authentication operations
  authTimeout: 30000,
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000,
});
