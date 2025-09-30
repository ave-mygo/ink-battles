import { NextResponse } from "next/server";
import { registerUserWithEmail } from "@/utils/common/mail";

export async function POST(req: Request) {
	const { email, password, code } = await req.json();
	const result = await registerUserWithEmail(email, password, code);
	return NextResponse.json(result);
}
