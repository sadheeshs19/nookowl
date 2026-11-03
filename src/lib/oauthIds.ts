import ids from '../../oauth.json';

/**
 * Google OAuth client IDs (public, not secrets), kept in oauth.json at the project root
 * so the app config can use the iOS one too. Empty = the Google button stays hidden.
 */
export const GOOGLE_WEB_CLIENT_ID: string = ids.googleWebClientId;
export const GOOGLE_IOS_CLIENT_ID: string = ids.googleIosClientId;
