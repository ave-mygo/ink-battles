import { USER_LIMITS, UserType } from "@/lib/constants";

interface WriterUploadLimits {
  guestPerRequestChars?: number;
  loggedPerRequestChars?: number;
  guestDailyChars?: number;
}

export function getDynamicUserLimits(uploadLimits: WriterUploadLimits | null | undefined) {
  return {
    ...USER_LIMITS,
    [UserType.GUEST]: {
      ...USER_LIMITS[UserType.GUEST],
      perRequest: uploadLimits?.guestPerRequestChars ?? USER_LIMITS[UserType.GUEST].perRequest,
      dailyLimit: uploadLimits?.guestDailyChars ?? USER_LIMITS[UserType.GUEST].dailyLimit,
    },
    [UserType.REGULAR]: {
      ...USER_LIMITS[UserType.REGULAR],
      perRequest: uploadLimits?.loggedPerRequestChars ?? USER_LIMITS[UserType.REGULAR].perRequest,
    },
  };
}
