"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/store/auth";

interface ProfileAvatarProps {
  className?: string;
  alt?: string;
  avatar?: string | null;
  fallbackName?: string;
}

export default function ProfileAvatar({
  className,
  alt,
  avatar,
  fallbackName,
}: ProfileAvatarProps) {
  const user = useCurrentUser();

  const displayName = user?.nickname || fallbackName || "User";
  const avatarUrl = avatar ?? user?.avatar;
  const initials = displayName
    .split(" ")
    .map((name: string) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl} alt={alt || displayName} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
