"use client";
import TokenContent from "@/components/layouts/Token/TokenContent";
import TokenHeader from "@/components/layouts/Token/TokenHeader";

export default function TokenPage() {
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<TokenHeader />
				<TokenContent />
			</div>
		</div>
	);
}
