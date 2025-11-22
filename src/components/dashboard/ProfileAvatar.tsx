"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/store/auth";

interface ProfileAvatarProps {
	className?: string;
	alt?: string;
	fallbackName?: string;
}

export default function ProfileAvatar({
	className,
	alt,
	fallbackName,
}: ProfileAvatarProps) {
	const user = useCurrentUser();

	const displayName = user?.nickname || fallbackName || "User";
	const initials = displayName
		.split(" ")
		.map(n => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<Avatar className={className}>
			<AvatarImage src={user?.avatar} alt={alt || displayName} />
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	);
}
