import { NextResponse } from "next/server";
import { SendVerificationEmail } from "@/utils/common/mail";

export async function POST(req: Request) {
	const { email, type } = await req.json();
	const result = await SendVerificationEmail(email, type);
	return NextResponse.json(result);
}
