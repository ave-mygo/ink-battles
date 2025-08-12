"use client";
import TokenContent from "@/components/layouts/Token/TokenContent";
import TokenHeader from "@/components/layouts/Token/TokenHeader";

export default function TokenPage() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-gradient-to-br">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<TokenHeader />
				<TokenContent />
			</div>
		</div>
	);
}
