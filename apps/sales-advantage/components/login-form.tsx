import { useTranslations } from "next-intl";
import { Button } from "@reading-advantage/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { Mic } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("login");
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <Mic className="h-5 w-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Use your Reading Advantage company account to continue.
          </p>
          <Button asChild className="w-full">
            <a href="/api/auth/company/start">{t("submit")}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
