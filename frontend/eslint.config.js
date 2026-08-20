const expoConfig = require('eslint-config-expo/flat');

// Guardrail against v1's failure mode: colors were frozen into StyleSheet.create
// at module load, making a runtime theme toggle structurally impossible. Every
// color must come from src/theme/ (via useThemedStyles / useTheme), never a
// hardcoded hex literal in a screen or component.
const noHexOutsideTheme = {
  files: ['src/screens/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/navigation/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
        message: 'Hex color literals are not allowed outside src/theme/. Use theme tokens via useThemedStyles/useTheme instead.',
      },
    ],
  },
};

module.exports = [...expoConfig, noHexOutsideTheme];
