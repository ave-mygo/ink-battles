import { CheckCircle, XCircle } from "lucide-react";
import {
	calculatePasswordStrength,
	getPasswordStrengthColor,
	getPasswordStrengthText,
	isPasswordValid,
	PASSWORD_REQUIREMENTS,
} from "@/lib/password-strength";

interface PasswordStrengthIndicatorProps {
	password: string;
	showRequirements?: boolean;
	className?: string;
}

/**
 * 密码强度指示器组件
 * 显示密码强度进度条和具体要求
 */
export const PasswordStrengthIndicator = ({
	password,
	showRequirements = true,
	className = "",
}: PasswordStrengthIndicatorProps) => {
	if (!password)
		return null;

	const strength = calculatePasswordStrength(password);
	const isValid = isPasswordValid(password);
	const progressColor = getPasswordStrengthColor(strength.level);

	const categoriesMet = [
		strength.requirements.lowercase,
		strength.requirements.uppercase,
		strength.requirements.number,
		strength.requirements.special,
	].filter(Boolean).length;

	return (
		<div className={`rounded-lg border bg-white/70 backdrop-blur p-3 sm:p-4 space-y-3 ${className}`}>
			<div className="flex items-center justify-between">
				<div className="text-sm text-slate-700 font-medium">密码要求（满足任意两项即可）</div>
				<div className={`text-xs px-2 py-0.5 rounded-full border ${
					categoriesMet >= 2 ? "text-green-700 border-green-200 bg-green-50" : "text-amber-700 border-amber-200 bg-amber-50"
				}`}
				>
					已满足
					{" "}
					{categoriesMet}
					/4 项
				</div>
			</div>

			{/* 进度条：更纤细，颜色柔和 */}
			<div className="rounded-full bg-slate-200/70 h-1.5 w-full">
				<div
					className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
					style={{ width: `${strength.score}%` }}
				/>
			</div>

			{showRequirements && (
				<div className="text-xs gap-2 grid grid-cols-2 sm:text-sm">
					{/* 长度要求 */}
					<div className="flex gap-2 items-center">
						{strength.requirements.length
							? (
									<CheckCircle className="text-green-600 h-4 w-4" />
								)
							: (
									<XCircle className="text-amber-600 h-4 w-4" />
								)}
						<span className={strength.requirements.length ? "text-green-700" : "text-slate-500"}>
							至少
							{" "}
							{PASSWORD_REQUIREMENTS.minLength}
							{" "}
							位
						</span>
					</div>

					{/* 小写 */}
					<div className="flex gap-2 items-center">
						{strength.requirements.lowercase
							? (
									<CheckCircle className="text-green-600 h-4 w-4" />
								)
							: (
									<XCircle className="text-slate-400 h-4 w-4" />
								)}
						<span className={strength.requirements.lowercase ? "text-green-700" : "text-slate-500"}>小写字母</span>
					</div>

					{/* 大写 */}
					<div className="flex gap-2 items-center">
						{strength.requirements.uppercase
							? (
									<CheckCircle className="text-green-600 h-4 w-4" />
								)
							: (
									<XCircle className="text-slate-400 h-4 w-4" />
								)}
						<span className={strength.requirements.uppercase ? "text-green-700" : "text-slate-500"}>大写字母</span>
					</div>

					{/* 数字 */}
					<div className="flex gap-2 items-center">
						{strength.requirements.number
							? (
									<CheckCircle className="text-green-600 h-4 w-4" />
								)
							: (
									<XCircle className="text-slate-400 h-4 w-4" />
								)}
						<span className={strength.requirements.number ? "text-green-700" : "text-slate-500"}>数字</span>
					</div>

					{/* 特殊字符 */}
					<div className="flex gap-2 items-center">
						{strength.requirements.special
							? (
									<CheckCircle className="text-green-600 h-4 w-4" />
								)
							: (
									<XCircle className="text-slate-400 h-4 w-4" />
								)}
						<span className={strength.requirements.special ? "text-green-700" : "text-slate-500"}>特殊字符</span>
					</div>
				</div>
			)}

			{/* 总体验证状态：更温和的提示 */}
			{password.length > 0 && (
				<div className="text-xs flex gap-2 items-center sm:text-sm">
					{isValid
						? (
								<>
									<CheckCircle className="text-green-600 h-4 w-4" />
									<span className="text-green-700">可使用该密码</span>
								</>
							)
						: (
								<>
									<XCircle className="text-amber-600 h-4 w-4" />
									<span className="text-slate-600">需满足“长度 + 任意两项”</span>
								</>
							)}
				</div>
			)}
		</div>
	);
};

interface PasswordStrengthMeterProps {
	password: string;
	className?: string;
}

/**
 * 简化的密码强度计组件（仅显示进度条）
 */
export const PasswordStrengthMeter = ({
	password,
	className = "",
}: PasswordStrengthMeterProps) => {
	if (!password) {
		return null;
	}

	const strength = calculatePasswordStrength(password);
	const progressColor = getPasswordStrengthColor(strength.level);

	return (
		<div className={`space-y-1 ${className}`}>
			<div className="flex items-center justify-between">
				<span className="text-muted-foreground text-xs">密码强度</span>
				<span className={`text-xs font-medium ${
					strength.level === "weak"
						? "text-red-600"
						: strength.level === "medium"
							? "text-yellow-600"
							: strength.level === "strong"
								? "text-blue-600"
								: "text-green-600"
				}`}
				>
					{getPasswordStrengthText(strength.level)}
				</span>
			</div>
			<div className="rounded-full bg-gray-200 h-1.5 w-full">
				<div
					className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
					style={{ width: `${strength.score}%` }}
				/>
			</div>
		</div>
	);
};
