"use client";
import type { Metadata } from "next";
import SponsorHeader from "@/components/layouts/Sponsor/SponsorHeader";
import SponsorList from "@/components/layouts/Sponsor/SponsorList";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	return createPageMetadata({
		pathname: "/sponsors",
		title: "赞助我们",
		description: "支持作家战力分析系统的发展，获得专属权益和感谢",
		keywords: ["赞助", "支持", "捐赠", "合作"],

	});
}

export default function SponsorPage() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<SponsorHeader />
				<SponsorList />
			</div>
		</div>
	);
}
