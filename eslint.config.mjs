import antfu from "@antfu/eslint-config";

const atf = antfu({
	unocss: true,
	react: true,
	formatters: true,
	stylistic: {
		indent: "tab",
		quotes: "double",
		semi: true,
	},
	rules: {
		"antfu/top-level-function": "off",
		"react-hooks/exhaustive-deps": "off",
		"eslinttailwindcss/no-custom-classname": "off",
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
		"react/no-array-index-key": "off",
	},
});

export default atf;
