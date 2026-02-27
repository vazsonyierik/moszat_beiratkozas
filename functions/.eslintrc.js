module.exports = {
    env: {
        es6: true,
        node: true,
    },
    parserOptions: {
        "ecmaVersion": 2020,
    },
    extends: [
        "eslint:recommended",
        "google",
    ],
    rules: {
        "no-restricted-globals": ["error", "name", "length"],
        "prefer-arrow-callback": "error",
        "quotes": ["error", "double", {"allowTemplateLiterals": true}],
        "max-len": ["off"], // Disable max length check
        "indent": ["error", 4], // Match project indentation (4 spaces)
        "require-jsdoc": "off", // Disable jsdoc requirement for now
        "comma-dangle": "off", // Disable trailing comma requirement
        "arrow-parens": "off", // Disable arrow function parens
        "operator-linebreak": "off", // Disable operator linebreak
        "no-irregular-whitespace": "off", // Disable irregular whitespace check (for email templates)
    },
    overrides: [
        {
            files: ["**/*.spec.*"],
            env: {
                mocha: true,
            },
            rules: {},
        },
    ],
    globals: {},
};
