export interface Sponsor {
	user: {
		user_id: string;
		name: string;
		avatar: string;
	};
	all_sum_amount: string;
	last_pay_time: number;
	current_plan: {
		name: string;
	};
}

export interface SponsorData {
	data: {
		list: Sponsor[];
		total_page: number;
	};
}
