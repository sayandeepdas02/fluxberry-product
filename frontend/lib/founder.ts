/**
 * Sayandeep Das: Fluxberry's founder and the author of the blog. One place for
 * the share metadata (the X handle credits shared links), the structured data
 * (author and founder profiles), the footer's social links and article bylines.
 */
export const FOUNDER = {
  name: 'Sayandeep Das',
  xHandle: '@deepmaxxing',
  xUrl: 'https://x.com/deepmaxxing',
  linkedinUrl: 'https://www.linkedin.com/in/sayandeep02/',
} as const;

/** The founder as a schema.org Person, for structured data. */
export const FOUNDER_PERSON = {
  '@type': 'Person',
  name: FOUNDER.name,
  url: FOUNDER.linkedinUrl,
  sameAs: [FOUNDER.xUrl, FOUNDER.linkedinUrl],
} as const;
