"use client";

import type { UserProfileUpdate } from "@ink-battles/shared/types/users/user";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

export const updateUserProfile = async (profile: UserProfileUpdate): Promise<{ success: boolean; message: string }> => {
	const { data, error } = await createClientEden().api.v2.rpc["profile.update"].post(profile);
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "资料更新失败");
};
