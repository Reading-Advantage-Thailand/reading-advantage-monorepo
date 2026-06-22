"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { Input } from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft } from "lucide-react";

export default function CreateRepPage() {
  const t = useTranslations("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [done, setDone] = useState(false);

  const createRep = trpc.sales.admin.createRep.useMutation({
    onSuccess: () => setDone(true),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createRep.mutate({ username, password, displayName });
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("createRep")}</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3">
              <p className="text-green-700">Rep created. Share their credentials.</p>
              <Button onClick={() => { setDone(false); setUsername(""); setPassword(""); setDisplayName(""); }}>
                Create another
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              <Input type="password" placeholder="Initial password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              {createRep.error && (
                <p className="text-sm text-destructive">{createRep.error.message}</p>
              )}
              <Button type="submit" disabled={createRep.isPending} className="w-full">
                Create Rep
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}