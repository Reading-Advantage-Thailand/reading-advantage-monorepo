import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChangeUsernameForm } from "@/components/change-username-form";
import { UpdateUserLicenseForm } from "@/components/update-user-license";
import { BadgeCheck } from "lucide-react";
import { Icons } from "@/components/icons";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import ChangeRole from "@/components/shared/change-role";
import ResetDialog from "@/components/reset-xp-dialog";
import { cookies } from "next/headers";
import GoogleClassroomButtonLink from "@/components/googleClassroomButtonLink";
export default async function UserProfileSettingsPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const googleActive = cookieStore.get("google_refresh_token")?.value;

  // check if user is not logged in and redirect to signin page
  if (!user) {
    return redirect("/auth/signin");
  }

  return (
    <div>
      <Header
        heading="Personal information"
        text="Information about your personal profile"
      />
      <Link
        href="/student/read"
        className="inline-block mb-4 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
      >
        &larr; Back to Reading Page
      </Link>
      <Separator className="my-4" />
      <div className="mx-2 flex gap-4 flex-col md:flex-row">
        <div className="w-full">
          <ChangeUsernameForm username={user.display_name} userId={user.id} />
          <DisplaySettingInfo
            title="Email"
            data={user.email}
            verified={user.email_verified}
            resetPassword
            showVerified
          />
          <DisplaySettingInfo title="Google Classroom Link" />
          <GoogleClassroomButtonLink status={Boolean(googleActive)} />
          <DisplaySettingInfo
            title="Reading advantage level"
            data={user.cefr_level || "unknown"}
          />
          <DisplaySettingInfo
            title="Reading advantage XP"
            desc="The XP is used to level up."
            data={user.xp?.toString() || "0"}
          />
          <ResetDialog users={user.id} />
          <UpdateUserLicenseForm
            username={user.display_name}
            userId={user.id}
            expired={user.expired_date}
          />
        </div>
        {process.env.NODE_ENV === "development" && (
          <ChangeRole
            className="md:w-[38rem]"
            userId={user.id}
            userRole={user.role}
          />
        )}
      </div>
    </div>
  );
}

interface DisplaySettingInfoProps {
  title: string;
  desc?: string;
  data?: string;
  badge?: string;
  verified?: boolean;
  showVerified?: boolean;
  resetPassword?: boolean;
}

const DisplaySettingInfo: React.FC<DisplaySettingInfoProps> = ({
  title,
  desc,
  data,
  badge,
  verified,
  resetPassword,
  showVerified = false,
}) => (
  <>
    <div className="text-sm font-medium mt-3">
      {title}
      {badge && (
        <Badge className="ml-2" variant="secondary">
          {badge}
        </Badge>
      )}
    </div>
    {desc && <p className="text-[0.8rem] text-muted-foreground mt-2">{desc}</p>}
    {data && (
      <div className="flex justify-between items-center text-[0.8rem] text-muted-foreground rounded-lg border bg-card shadow px-3 py-2 my-2">
        <p>{data}</p>
        {showVerified && (
          <div className="flex items-center gap-1">
            {verified ? (
              <span className="text-green-800 dark:text-green-300 flex items-center gap-1">
                <BadgeCheck size={16} />
                Verified
              </span>
            ) : (
              <span className="text-red-800 dark:text-red-300 flex items-center gap-1">
                <Icons.unVerified size={16} />
                Not verified
              </span>
            )}
          </div>
        )}
      </div>
    )}
  </>
);
