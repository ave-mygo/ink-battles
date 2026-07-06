export interface PasswordStrength {
	score: number;
	level: "weak" | "medium" | "strong" | "very-strong";
	requirements: {
		length: boolean;
		lowercase: boolean;
		uppercase: boolean;
		number: boolean;
		special: boolean;
	};
	feedback: string[];
}
