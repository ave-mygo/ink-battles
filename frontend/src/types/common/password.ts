/**
 * 密码强度类型
 * 来源：password-strength.ts
 */
export interface PasswordStrength {
	score: number; // 0-100
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
