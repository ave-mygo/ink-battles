import { NextResponse } from "next/server";
import { RegisterUser } from "@/lib/utils-server";

export async function POST(req: Request) {
	const { email, password, code } = await req.json();
	const result = await RegisterUser(email, password, code);
	return NextResponse.json(result);
}
