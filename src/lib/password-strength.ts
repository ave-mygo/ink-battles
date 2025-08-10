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
	// 仅用于提示展示，不做强制：校验规则改为“长度达标 + 任意两类”
	requireLowercase: true,
	requireUppercase: true,
	requireNumber: true,
	requireSpecial: true,
};

/**
 * 计算密码强度
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
	const requirements = {
		length: password.length >= PASSWORD_REQUIREMENTS.minLength,
		lowercase: /[a-z]/.test(password),
		uppercase: /[A-Z]/.test(password),
		number: /\d/.test(password),
		// “特殊字符”定义为非字母、非数字（不区分大小写），且排除点号 '.'
		special: /[^a-z0-9]/i.test(password),
	};

	const feedback: string[] = [];
	if (!requirements.length) {
		feedback.push(`至少需要 ${PASSWORD_REQUIREMENTS.minLength} 位字符`);
	}

	// 仅用于提示（不影响是否通过）：
	if (!requirements.lowercase)
		feedback.push("建议包含小写字母");
	if (!requirements.uppercase)
		feedback.push("建议包含大写字母");
	if (!requirements.number)
		feedback.push("建议包含数字");
	if (!requirements.special)
		feedback.push("建议包含特殊字符 (!@#$%^&* 等)");

	const categories = [
		requirements.lowercase,
		requirements.uppercase,
		requirements.number,
		requirements.special,
	];
	const categoriesMet = categories.filter(Boolean).length;
	// 不进行加权打分，仅用于 UI 进度条展示（0-100 基于满足的类别数）
	const score = requirements.length ? Math.round((categoriesMet / 4) * 100) : 0;

	let level: PasswordStrength["level"] = "weak";
	if (categoriesMet >= 4)
		level = "very-strong";
	else if (categoriesMet === 3)
		level = "strong";
	else if (categoriesMet === 2 && requirements.length)
		level = "medium";

	return { score, level, requirements, feedback };
};

/**
 * 检查密码是否满足最低要求
 */
export const isPasswordValid = (password: string): boolean => {
	const strength = calculatePasswordStrength(password);
	const categoriesMet = [
		strength.requirements.lowercase,
		strength.requirements.uppercase,
		strength.requirements.number,
		strength.requirements.special,
	].filter(Boolean).length;

	// 要求：长度达标，且四类中任意满足两类即可
	return strength.requirements.length && categoriesMet >= 2;
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
