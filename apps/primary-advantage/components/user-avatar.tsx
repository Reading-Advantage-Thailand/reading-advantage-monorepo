import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarProps } from "@radix-ui/react-avatar";
import { User as IconUser } from "lucide-react";

interface UserAvatarProps extends AvatarProps {
  user: { name?: string | null; image?: string | null };
}

export function UserAvatar({ user, ...props }: UserAvatarProps) {
  return (
    <Avatar {...props}>
      {user.image ? (
        <AvatarImage
          alt="Picture"
          src={user.image}
          referrerPolicy="no-referrer"
        />
      ) : (
        <AvatarFallback>
          <span className="sr-only">{user.name}</span>
          <IconUser className="h-4 w-4" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
