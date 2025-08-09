/**
 * 密码强度验证结果
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

/**
 * 密码要求配置
 */
export const PASSWORD_REQUIREMENTS = {
	minLength: 8,
	maxLength: 128,
	requireLowercase: true,
	requireUppercase: false, // 可选
	requireNumber: true,
	requireSpecial: true,
};

/**
 * 特殊字符集合
 */
const SPECIAL_CHARS = "!@#$%^&*()_=[]{}|;:,.<>?~`\"'\\|-";

/**
 * 计算密码强度
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
	const requirements = {
		length: password.length >= PASSWORD_REQUIREMENTS.minLength,
		lowercase: /[a-z]/.test(password),
		uppercase: /[A-Z]/.test(password),
		number: /\d/.test(password),
		// eslint-disable-next-line regexp/strict
		special: new RegExp(`[${SPECIAL_CHARS}]`).test(password),
	};

	const feedback: string[] = [];

	// 检查长度
	if (!requirements.length) {
		feedback.push(`至少需要 ${PASSWORD_REQUIREMENTS.minLength} 位字符`);
	}

	// 检查必填项
	if (PASSWORD_REQUIREMENTS.requireLowercase && !requirements.lowercase) {
		feedback.push("需要包含小写字母");
	}

	if (PASSWORD_REQUIREMENTS.requireUppercase && !requirements.uppercase) {
		feedback.push("需要包含大写字母");
	}

	if (PASSWORD_REQUIREMENTS.requireNumber && !requirements.number) {
		feedback.push("需要包含数字");
	}

	if (PASSWORD_REQUIREMENTS.requireSpecial && !requirements.special) {
		feedback.push("需要包含特殊字符 (!@#$%^&* 等)");
	}

	// 计算分数
	let score = 0;
	const metRequirements = Object.values(requirements).filter(Boolean).length;
	const totalRequirements = Object.keys(requirements).length;

	// 基础分数：满足要求的项目数
	score = (metRequirements / totalRequirements) * 60;

	// 额外分数：长度奖励
	if (password.length >= 12)
		score += 10;
	if (password.length >= 16)
		score += 10;

	// 额外分数：复杂度奖励
	if (requirements.uppercase)
		score += 5;
	if (requirements.special)
		score += 5;

	// 额外分数：组合奖励
	const hasMultipleTypes = [requirements.lowercase, requirements.uppercase, requirements.number, requirements.special]
		.filter(Boolean)
		.length;
	if (hasMultipleTypes >= 3)
		score += 10;

	// 确保分数在 0-100 范围内
	score = Math.min(100, Math.max(0, score));

	// 确定强度等级
	let level: PasswordStrength["level"] = "weak";
	if (score >= 80)
		level = "very-strong";
	else if (score >= 60)
		level = "strong";
	else if (score >= 40)
		level = "medium";

	return {
		score,
		level,
		requirements,
		feedback,
	};
};

/**
 * 检查密码是否满足最低要求
 */
export const isPasswordValid = (password: string): boolean => {
	const strength = calculatePasswordStrength(password);
	return strength.score >= 40 // 至少中等强度
		&& strength.requirements.length
		&& strength.requirements.lowercase
		&& strength.requirements.number
		&& strength.requirements.special;
};

/**
 * 获取密码强度颜色
 */
export const getPasswordStrengthColor = (level: PasswordStrength["level"]): string => {
	switch (level) {
		case "weak":
			return "bg-red-500";
		case "medium":
			return "bg-yellow-500";
		case "strong":
			return "bg-blue-500";
		case "very-strong":
			return "bg-green-500";
		default:
			return "bg-gray-300";
	}
};

/**
 * 获取密码强度文本
 */
export const getPasswordStrengthText = (level: PasswordStrength["level"]): string => {
	switch (level) {
		case "weak":
			return "弱";
		case "medium":
			return "中等";
		case "strong":
			return "强";
		case "very-strong":
			return "非常强";
		default:
			return "";
	}
};
