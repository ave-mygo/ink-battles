import { Check, X } from "lucide-react";
import {
	calculatePasswordStrength,
	getPasswordStrengthColor,
	getPasswordStrengthText,
	isPasswordValid,
	PASSWORD_REQUIREMENTS,
} from "@/lib/password-strength";
import { cn } from "@/lib/utils";

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

	return (
		<div className={cn("space-y-3", className)}>
			{/* 进度条部分 */}
			<div className="space-y-1.5">
				<div className="text-xs flex items-center justify-between">
					<span className="text-muted-foreground font-medium">密码强度</span>
					<span className={cn(
						"font-medium",
						isValid ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
					)}
					>
						{getPasswordStrengthText(strength.level)}
					</span>
				</div>
				<div className="bg-secondary/50 rounded-full h-1.5 w-full overflow-hidden">
					<div
						className={cn("h-full transition-all duration-500 ease-out", progressColor)}
						style={{ width: `${Math.max(5, strength.score)}%` }}
					/>
				</div>
			</div>

			{showRequirements && (
				<div className="pt-1 gap-2 grid grid-cols-2">
					<RequirementItem
						met={strength.requirements.length}
						text={`至少 ${PASSWORD_REQUIREMENTS.minLength} 位字符`}
					/>
					<RequirementItem
						met={strength.requirements.lowercase}
						text="小写字母"
					/>
					<RequirementItem
						met={strength.requirements.uppercase}
						text="大写字母"
					/>
					<RequirementItem
						met={strength.requirements.number}
						text="数字"
					/>
					<RequirementItem
						met={strength.requirements.special}
						text="特殊字符"
					/>
					<div className="text-xs flex gap-2 items-center">
						<span className="text-muted-foreground text-[10px]">
							(满足长度 + 任意两项即可)
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
	<div className="text-xs flex gap-2 transition-colors duration-200 items-center">
		{met
			? (
					<Check className="text-green-500 shrink-0 h-3.5 w-3.5" />
				)
			: (
					<X className="text-muted-foreground/40 shrink-0 h-3.5 w-3.5" />
				)}
		<span className={cn(
			"truncate",
			met ? "text-foreground" : "text-muted-foreground",
		)}
		>
			{text}
		</span>
	</div>
);

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
		<div className={cn("space-y-1.5", className)}>
			<div className="bg-secondary/50 rounded-full h-1 w-full overflow-hidden">
				<div
					className={cn("h-full transition-all duration-500 ease-out", progressColor)}
					style={{ width: `${Math.max(5, strength.score)}%` }}
				/>
			</div>
		</div>
	);
};
