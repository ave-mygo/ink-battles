const FORWARDED_FOR_SEPARATOR = ",";

export const getRequestIp = (request: Request) => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor)
		return forwardedFor.split(FORWARDED_FOR_SEPARATOR)[0]?.trim() || null;
	return request.headers.get("x-real-ip") || null;
};

export const getRequestUserAgent = (request: Request) =>
	request.headers.get("user-agent");
