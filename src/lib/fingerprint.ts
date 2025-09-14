"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

export const getFingerprintId = async () => {
	const fp = await FingerprintJS.load();
	const result = await fp.get();
	return result.visitorId;
};

export default getFingerprintId;
