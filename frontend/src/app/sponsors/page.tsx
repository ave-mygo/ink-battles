import type { SponsorData } from "@ink-battles/shared/types/common/sponsor";
import type { Metadata } from "next";
import SponsorHeader from "@/components/layouts/Sponsor/SponsorHeader";
import SponsorList from "@/components/layouts/Sponsor/SponsorList";
import { createPageMetadata } from "@/lib/seo";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

const EMPTY_SPONSOR_DATA: SponsorData = {
  data: {
    list: [],
    total_page: 0,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    pathname: "/sponsors",
    title: "赞助我们",
    description: "支持作家战力分析系统的发展，获得专属权益和感谢",
    keywords: ["赞助", "支持", "捐赠", "合作"],

  });
}

export default async function SponsorPage() {
  const api = await createServerEden();
  const response = await api.api.v2.sponsors.get({
    query: { page: 1 },
  });
  const initialData = await unwrapEdenPayload<SponsorData>(response.data, response.error, EMPTY_SPONSOR_DATA);

  return (
    <div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto px-4 py-8 container max-w-6xl">
        <SponsorHeader />
        <SponsorList initialData={initialData} />
      </div>
    </div>
  );
}
