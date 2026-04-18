import type { SafeUser } from "../types";

export const ok = <T>(data?: T, message?: string) => ({ success: true, data, message });
export const fail = (message: string, status = 400) => Response.json({ success: false, message }, { status });

export const serializeDate = (value: unknown) => value ? new Date(value as string | Date).toISOString() : null;

export const safeUser = (user: Record<string, unknown> | null): SafeUser | null => {
	if (!user)
		return null;
	return {
		uid: user.uid as number,
		email: user.email as string | null | undefined,
		qqOpenid: user.qqOpenid as string | null | undefined,
		afdId: user.afdId as string | null | undefined,
		nickname: user.nickname as string | null | undefined,
		bio: user.bio as string | null | undefined,
		avatar: user.avatar as string | null | undefined,
		loginMethod: user.loginMethod as SafeUser["loginMethod"],
		isActive: user.isActive as boolean | undefined,
		createdAt: serializeDate(user.createdAt),
		updatedAt: serializeDate(user.updatedAt),
	};
};

export const redirectWithMessage = (path: string, status: string, message: string, baseUrl: string) => {
	const url = new URL(path, baseUrl);
	url.searchParams.set("status", status);
	url.searchParams.set("msg", message);
	return Response.redirect(url, 302);
};
