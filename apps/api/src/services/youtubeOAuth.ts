import { google } from "googleapis";
import { config } from "../config";

export const oauthClient = new google.auth.OAuth2(
  config.youtubeClientId,
  config.youtubeClientSecret,
  config.youtubeRedirectUri
);

export function buildYoutubeConsentUrl(state: string): string {
  return oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube"],
    state
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauthClient.getToken(code);
  return tokens;
}
