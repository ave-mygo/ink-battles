import SponsorHeader from "@/components/layouts/Sponsor/SponsorHeader";
import SponsorList from "@/components/layouts/Sponsor/SponsorList";
import { getSponsorData } from "@/lib/api-server";

export default async function SponsorPage() {
	// 在服务端获取初始数据
	const initialData = await getSponsorData(1);

	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<SponsorHeader />
				<SponsorList initialData={initialData} />
			</div>
		</div>
	);
}
