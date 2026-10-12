import { Suspense } from "react";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import SchoolProfileSettings from "@/components/school/school-profile-settings";
import { getCurrentUser } from "@/lib/session";
import { getSchoolDetail } from "@/server/models/schoolModel";
import { getLicenseViewForCaller } from "@/server/models/schoolLicenseView";

/**
 * Fetches the current user's school on the server and renders the settings.
 * @returns The school profile settings with server-fetched initial data.
 */
async function SchoolProfileData() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  // The license view and the license key go to a school admin only.
  const licenseView = await getLicenseViewForCaller(user);
  const initialSchool = user.schoolId
    ? await getSchoolDetail(user.schoolId, { withLicense: licenseView !== null })
    : null;

  return (
    <SchoolProfileSettings
      initialSchool={initialSchool}
      initialLicenseView={licenseView}
    />
  );
}

/**
 * School profile settings page. Streams the server-fetched school under
 * Suspense so the skeleton covers real data loading.
 * @returns The school profile settings page.
 */
export default function SchoolProfileSettingsPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true">
          <div className="h-9 w-48 animate-pulse rounded bg-gray-200" />
          <div className="my-4 h-px bg-gray-200" />
          <div className="space-y-6">
            <div className="h-64 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      }
    >
      <SchoolProfileData />
    </Suspense>
  );
}
