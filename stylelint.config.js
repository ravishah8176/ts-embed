/**
 * Guards the Radiant migration against regression.
 *
 * Deliberately not extending a shared config: the standard SCSS preset would
 * report hundreds of stylistic findings unrelated to design tokens and bury the
 * rules that matter. Every rule here exists to stop one specific class of
 * backslide.
 *
 * Token *names* need no rule — `rd-sys-color('nope')` is a compile-time @error
 * in `_tokens-system.scss`, so an invalid token already fails the build.
 */
export default {
  customSyntax: 'postcss-scss',
  rules: {
    // Colours must come from rd-sys-color() / rd-comp-color() / $rd-ref-*.
    'color-no-hex': true,
    'color-named': 'never',

    // The scales are tokenised; a raw value here means someone bypassed them.
    'declaration-property-value-disallowed-list': {
      'font-size': [/^\d+(\.\d+)?px$/],
      'font-weight': [/^\d+$/],
      'border-radius': [/\d+px/],
    },

    'custom-property-pattern': '^([a-z][a-z0-9]*)(-+[a-z0-9]+)*$',
  },
  overrides: [
    {
      // The token layer is where literals are supposed to live — it is the one
      // place a hex is the correct answer, and _fontfaces declares the families.
      files: ['src/styles/**/*.scss'],
      rules: {
        'color-no-hex': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
  ],
}
