"use client";
import SponsorHeader from "@/components/layouts/Sponsor/SponsorHeader";
import SponsorList from "@/components/layouts/Sponsor/SponsorList";

export default function SponsorPage() {
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<SponsorHeader />
				<SponsorList />
			</div>
		</div>
	);
}
