import { CheckCircle, Circle, XCircle } from "lucide-react";
import {
	calculatePasswordStrength,
	getPasswordStrengthColor,
	getPasswordStrengthText,
	isPasswordValid,
	type PasswordStrength,
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
	if (!password) {
		return null;
	}

	const strength = calculatePasswordStrength(password);
	const isValid = isPasswordValid(password);
	const progressColor = getPasswordStrengthColor(strength.level);
	const strengthText = getPasswordStrengthText(strength.level);

	return (
		<div className={`space-y-3 ${className}`}>
			{/* 强度进度条 */}
			<div className="space-y-2">
				<div className="flex justify-between items-center">
					<span className="text-sm text-muted-foreground">密码强度</span>
					<span className={`text-sm font-medium ${
						strength.level === 'weak' ? 'text-red-600' :
						strength.level === 'medium' ? 'text-yellow-600' :
						strength.level === 'strong' ? 'text-blue-600' :
						'text-green-600'
					}`}>
						{strengthText} ({strength.score}%)
					</span>
				</div>
				<div className="w-full bg-gray-200 rounded-full h-2">
					<div
						className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
						style={{ width: `${strength.score}%` }}
					/>
				</div>
			</div>

			{/* 要求检查列表 */}
			{showRequirements && (
				<div className="space-y-2">
					<div className="text-sm text-muted-foreground font-medium">密码要求：</div>
					<div className="grid grid-cols-1 gap-2">
						{/* 长度要求 */}
						<div className="flex items-center gap-2 text-sm">
							{strength.requirements.length ? (
								<CheckCircle className="h-4 w-4 text-green-600" />
							) : (
								<XCircle className="h-4 w-4 text-red-600" />
							)}
							<span className={strength.requirements.length ? 'text-green-600' : 'text-muted-foreground'}>
								至少 {PASSWORD_REQUIREMENTS.minLength} 位字符
							</span>
						</div>

						{/* 小写字母要求 */}
						<div className="flex items-center gap-2 text-sm">
							{strength.requirements.lowercase ? (
								<CheckCircle className="h-4 w-4 text-green-600" />
							) : (
								<XCircle className="h-4 w-4 text-red-600" />
							)}
							<span className={strength.requirements.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
								包含小写字母
							</span>
						</div>

						{/* 大写字母要求（可选） */}
						{PASSWORD_REQUIREMENTS.requireUppercase && (
							<div className="flex items-center gap-2 text-sm">
								{strength.requirements.uppercase ? (
									<CheckCircle className="h-4 w-4 text-green-600" />
								) : (
									<XCircle className="h-4 w-4 text-red-600" />
								)}
								<span className={strength.requirements.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
									包含大写字母
								</span>
							</div>
						)}

						{/* 数字要求 */}
						<div className="flex items-center gap-2 text-sm">
							{strength.requirements.number ? (
								<CheckCircle className="h-4 w-4 text-green-600" />
							) : (
								<XCircle className="h-4 w-4 text-red-600" />
							)}
							<span className={strength.requirements.number ? 'text-green-600' : 'text-muted-foreground'}>
								包含数字
							</span>
						</div>

						{/* 特殊字符要求 */}
						<div className="flex items-center gap-2 text-sm">
							{strength.requirements.special ? (
								<CheckCircle className="h-4 w-4 text-green-600" />
							) : (
								<XCircle className="h-4 w-4 text-red-600" />
							)}
							<span className={strength.requirements.special ? 'text-green-600' : 'text-muted-foreground'}>
								包含特殊字符 (!@#$%^&* 等)
							</span>
						</div>
					</div>
				</div>
			)}

			{/* 提示信息 */}
			{strength.feedback.length > 0 && (
				<div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
					{strength.feedback[0]}
				</div>
			)}

			{/* 总体验证状态 */}
			{password.length > 0 && (
				<div className="flex items-center gap-2 text-sm">
					{isValid ? (
						<>
							<CheckCircle className="h-4 w-4 text-green-600" />
							<span className="text-green-600">密码符合要求</span>
						</>
					) : (
						<>
							<XCircle className="h-4 w-4 text-red-600" />
							<span className="text-red-600">密码不符合要求</span>
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
			<div className="flex justify-between items-center">
				<span className="text-xs text-muted-foreground">密码强度</span>
				<span className={`text-xs font-medium ${
					strength.level === 'weak' ? 'text-red-600' :
					strength.level === 'medium' ? 'text-yellow-600' :
					strength.level === 'strong' ? 'text-blue-600' :
					'text-green-600'
				}`}>
					{getPasswordStrengthText(strength.level)}
				</span>
			</div>
			<div className="w-full bg-gray-200 rounded-full h-1.5">
				<div
					className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
					style={{ width: `${strength.score}%` }}
				/>
			</div>
		</div>
	);
};