import antfu from "@antfu/eslint-config";

export default antfu({
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
		"node/prefer-global/process": "error",
		"ts/no-use-before-define": "off",
		"react-hooks/exhaustive-deps": "off",
		"eslinttailwindcss/no-custom-classname": "off",
		"no-console": "off",
		"style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
		"react/no-array-index-key": "off",
	},
});
