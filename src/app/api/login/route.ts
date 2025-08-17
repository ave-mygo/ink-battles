import { NextResponse } from "next/server";
import { LoginUser } from "@/utils/auth-server";

export async function POST(req: Request) {
	const { email, password } = await req.json();
	const result = await LoginUser(email, password);
	return NextResponse.json(result);
}
