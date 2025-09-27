import { NextResponse } from "next/server";
import { getSponsorData } from "@/utils/afdian/sponsors";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const page = Number(searchParams.get("page")) || 1;

	try {
		const data = await getSponsorData(page);
		return NextResponse.json(data);
	} catch {
		return NextResponse.json(
			{ error: "Failed to fetch sponsors" },
			{ status: 500 },
		);
	}
}
