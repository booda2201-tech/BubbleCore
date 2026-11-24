export const environment = {
  production: false,
  /** Trailing slash required — paths are appended after `/api/`. */
  apiBaseUrl: 'https://alhendalcompany-001-site11.jtempurl.com/api/',
  /** Main store / permanent Bubble Hope survey. */
  surveySlug: 'bubble-hope',
  /**
   * Exhibition-only survey — keep separate so responses & discount codes
   * never mix with the main Bubble Hope flow.
   * Create this survey on the API with the same slug.
   */
  expoSurveySlug: 'bubble-hope-exhibition',
};
