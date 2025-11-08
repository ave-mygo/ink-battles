import antfu from "@antfu/eslint-config";

const atf = antfu({
	ignores: [
		"src/components/ui/**",
		".next/**",
		"node_modules/**",
		"dist/**",
		"out/**",
		"coverage/**",
		"AGENTS.md",
		"CLAUDE.md",
		"SEO_GEO_OPTIMIZATION.md",
	],
	unocss: true,
	react: true,
	formatters: true,
	stylistic: {
		indent: "tab",
		quotes: "double",
		semi: true,
	},
	rules: {
		"semi": ["warn", "always"],
		"antfu/top-level-function": "off",
		"react-hooks/exhaustive-deps": "off",
		"eslinttailwindcss/no-custom-classname": "off",
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
		"react/no-array-index-key": "off",
	},
});

export default atf;
