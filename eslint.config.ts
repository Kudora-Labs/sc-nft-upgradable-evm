import sheriff from "eslint-config-sheriff";
import { defineFlatConfig } from "eslint-define-config";

const sheriffOptions = {
    react: false,
    lodash: false,
    next: false,
    astro: false,
    playwright: false,
    jest: false,
    vitest: false,
};

const sheriffConfig = sheriff(sheriffOptions);

export default defineFlatConfig([
    ...sheriffConfig,
    {
        settings: {
            "import/resolver": {
                typescript: {
                    project: "./tsconfig.json",
                },
            },
        },
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "no-console": "off",
            "unicorn/prefer-top-level-await": "off",
            "sonarjs/no-duplicate-string": "off",
            "no-restricted-syntax": "off",
            "no-negated-condition": "off",

            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-misused-promises": "warn",

            "@typescript-eslint/consistent-type-definitions": ["error", "type"],
            "@typescript-eslint/default-param-last": "warn",
            "prefer-const": "error",
            eqeqeq: ["error", "always"],
            "@typescript-eslint/no-floating-promises": "error",

            "import/extensions": [
                "error",
                "ignorePackages",
                {
                    js: "always",
                    ts: "never",
                },
            ],
        },
    },
    {
        files: ["test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "sonarjs/no-duplicate-string": "off",
        },
    },
    {
        files: ["**/*.ts"],
        ignores: ["eslint.config.ts"],
    },
    {
        ignores: [
            "node_modules",
            "dist",
            "artifacts",
            "cache",
            "typechain-types",
            "eslint.config.ts",
        ],
    },
]);
