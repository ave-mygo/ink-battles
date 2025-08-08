import { NextResponse } from "next/server";
import { LoginUser } from "@/lib/utils-server";

export async function POST(req: Request) {
	const { email, password } = await req.json();
	const result = await LoginUser(email, password);
	return NextResponse.json(result);
}
