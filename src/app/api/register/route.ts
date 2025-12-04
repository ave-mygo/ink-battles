import { NextResponse } from "next/server";
import { registerUserWithEmail } from "@/utils/common/mail";

export async function POST(req: Request) {
	const { email, password, code, inviteCode } = await req.json();
	const result = await registerUserWithEmail(email, password, code, inviteCode);
	return NextResponse.json(result);
}
