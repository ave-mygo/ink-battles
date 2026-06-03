export type PublicQuoteType = "recommended" | "public";

export interface PublicQuote {
	id: string;
	content: string;
	authorName: string;
	workName?: string | null;
	reason?: string;
	type: PublicQuoteType;
}

export interface PublicQuotesResponse {
	success: boolean;
	data: {
		quotes: PublicQuote[];
		count: number;
		type: PublicQuoteType;
	};
}
