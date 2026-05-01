"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, User, Mail } from "lucide-react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface User {
  id: string;
  name: string;
  email: string;
  roles: Array<{
    role: {
      name: string;
    };
  }>;
}

interface AddAdminDialogProps {
  schoolId: string;
  onAdminAdded: () => void;
}

export function AddAdminDialog({
  schoolId,
  onAdminAdded,
}: AddAdminDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const t = useTranslations("Settings.schoolProfile");

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to search users");
      }
      const users = await response.json();
      setSearchResults(users);
    } catch (error) {
      toast.error("Failed to search users", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addAdmin = async (userId: string) => {
    setIsAdding(userId);
    try {
      const response = await fetch(`/api/users/me/school/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add admin");
      }

      toast.success("Admin added successfully!");
      onAdminAdded();
      setOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      toast.error("Failed to add admin", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsAdding(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchUsers();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          {t("addsAdmins")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("addAdminHeader")}</DialogTitle>
          <DialogDescription>{t("addsAdminsDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">{t("searchUsers")}</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder={t("searchUsersPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
              />
              <Button
                onClick={searchUsers}
                disabled={isSearching || !searchQuery.trim()}
                size="sm"
              >
                {isSearching ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-muted rounded-full p-2">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {user.email}
                        </p>
                        <div className="mt-1 flex gap-1">
                          {user.roles.map((userRole, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {userRole.role.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => addAdmin(user.id)}
                      disabled={isAdding === user.id}
                      size="sm"
                    >
                      {isAdding === user.id ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add Admin"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div className="text-muted-foreground py-4 text-center">
              No users found matching "{searchQuery}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
