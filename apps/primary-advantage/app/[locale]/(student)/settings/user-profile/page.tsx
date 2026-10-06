import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChangeUsernameForm } from "@/components/change-username-form";
import { UpdateUserLicenseForm } from "@/components/update-user-license";
import { BadgeCheck } from "lucide-react";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { ART } from "@/lib/rpg/places";
import { Icons } from "@/components/icons";
import { redirect } from "@/i18n/navigation";
import ChangeRole from "@/components/shared/change-role";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@/types/enum";
import { getTranslations } from "next-intl/server";

export default async function UserProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  const t = await getTranslations("Settings.userProfile");

  // check if user is not logged in and redirect to signin page
  if (!user) {
    return redirect({ href: "/auth/signin", locale });
  }

  // The hero's room at the inn: profile fields on parchment, the avatar link is the hero's chest
  // (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="inn">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <div className="flex flex-wrap gap-3">
        {user.role === "STUDENT" ? (
          <RpgLink href="/student/avatar?from=me" tone="gold">
            <img src={ART.chest} alt="" />
            {t("avatar")}
          </RpgLink>
        ) : null}
        <RpgLink href="/student/read" tone="iron">
          {t("backToReading")}
        </RpgLink>
      </div>
      <Panel className="md:flex-row md:gap-4">
        <div className="w-full">
          <ChangeUsernameForm
            username={user.name || ""}
            userId={user.id}
          />
          <DisplaySettingInfo
            title={t("username")}
            data={user.username}
            resetPassword
          />
          <UpdateUserLicenseForm
            username={user.name || ""}
            userId={user.id}
          />
        </div>
        {process.env.NODE_ENV === "development" && (
          <ChangeRole
            className="md:w-[38rem]"
            userId={user.id}
            userRole={user.role as Role}
          />
        )}
      </Panel>
    </Scene>
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
  translations?: {
    verified: string;
    notVerified: string;
  };
}

// const handleSendEmailVerification = async () => {
//   const user = getAuth(firebaseApp).currentUser;




const DisplaySettingInfo: React.FC<DisplaySettingInfoProps> = ({
  title,
  desc,
  data,
  badge,
  verified,
  resetPassword,
  showVerified = false,
  translations,
}) => (
  <>
    <div className="mt-3 text-sm font-medium">
      {title}
      {badge && (
        <Badge className="ml-2" variant="secondary">
          {badge}
        </Badge>
      )}
    </div>
    {desc && <p className="text-muted-foreground mt-2 text-[0.8rem]">{desc}</p>}
    {data && (
      <div className="text-muted-foreground bg-card my-2 flex items-center justify-between rounded-lg border px-3 py-2 text-[0.8rem] shadow">
        <p>{data}</p>
        {showVerified && (
          <div className="flex items-center gap-1">
            {verified ? (
              <span className="flex items-center gap-1 text-green-800 dark:text-green-300">
                <BadgeCheck size={16} />
                {translations?.verified || "Verified"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-800 dark:text-red-300">
                {/* <Icons.unVerified size={16} /> */}
                {translations?.notVerified || "Not verified"}
              </span>
            )}
          </div>
        )}
      </div>
    )}

    <div className="flex gap-2">
      {/* {resetPassword && (
        <Button
          variant="secondary"
          size="sm"
        >
          Reset Password
        </Button>
      )} */}
      {/* {showVerified && !verified && (
        <Button
          //onClick={() => handleSendEmailVerification()}
          variant="secondary"
          size="sm"
        >
          Resend verification email
        </Button>
      )} */}
    </div>
  </>
);
