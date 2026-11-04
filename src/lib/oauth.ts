import "server-only";
import { connectDB } from "./db";
import { Session, User } from "./models";
import { siteUrl } from "./site";

/**
 * "Sign in with Google" and "Sign in with LinkedIn" via standard OpenID Connect
 * (authorization code flow). Both are free; a provider is enabled when its client id/secret are set.
 */
export type ProviderId = "google" | "linkedin";

interface Provider {
  id: ProviderId;
  label: string;
  authUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
  extraAuthParams?: Record<string, string>;
}

function providers(): Record<ProviderId, Provider> {
  return {
    google: {
      id: "google",
      label: "Google",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      extraAuthParams: { prompt: "select_account" },
    },
    linkedin: {
      id: "linkedin",
      label: "LinkedIn",
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfoUrl: "https://api.linkedin.com/v2/userinfo",
      scope: "openid profile email",
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    },
  };
}

export function getProvider(id: string): Provider | null {
  const p = providers()[id as ProviderId];
  return p && p.clientId && p.clientSecret ? p : null;
}

export function enabledProviders(): { id: ProviderId; label: string }[] {
  return Object.values(providers())
    .filter((p) => p.clientId && p.clientSecret)
    .map((p) => ({ id: p.id, label: p.label }));
}

export const redirectUri = (p: ProviderId) => `${siteUrl()}/api/auth/${p}/callback`;

export function authorizationUrl(p: Provider, state: string): string {
  const u = new URL(p.authUrl);
  u.search = new URLSearchParams({
    response_type: "code",
    client_id: p.clientId!,
    redirect_uri: redirectUri(p.id),
    scope: p.scope,
    state,
    ...p.extraAuthParams,
  }).toString();
  return u.toString();
}

export interface OAuthProfile {
  provider: ProviderId;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export async function fetchProfile(p: Provider, code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(p.id),
      client_id: p.clientId!,
      client_secret: p.clientSecret!,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new Error(`token exchange failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("no access token");

  const infoRes = await fetch(p.userinfoUrl, { headers: { Authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(10_000) });
  if (!infoRes.ok) throw new Error(`userinfo failed (${infoRes.status})`);
  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    given_name?: string;
    family_name?: string;
  };
  if (!info.sub || !info.email) throw new Error("profile has no id or email");
  return {
    provider: p.id,
    providerId: String(info.sub),
    email: info.email.trim().toLowerCase(),
    emailVerified: info.email_verified === true || info.email_verified === "true",
    name: (info.name || [info.given_name, info.family_name].filter(Boolean).join(" ") || info.email.split("@")[0]).slice(0, 120),
  };
}

const idField = (p: ProviderId) => (p === "google" ? "googleId" : "linkedinId");

/**
 * Finds the account for an OAuth profile, linking it to an existing account with the same
 * verified email. Returns null when a new account must be created (after the age screen).
 */
export async function resolveOAuthUser(profile: OAuthProfile): Promise<string | null> {
  await connectDB();
  const field = idField(profile.provider);
  const byId = await User.findOne({ [field]: profile.providerId }, { _id: 1 }).lean<{ _id: unknown }>();
  if (byId) return String(byId._id);
  if (!profile.emailVerified) return null;

  const byEmail = await User.findOne({ email: profile.email });
  if (!byEmail) return null;
  // The provider proved this person owns the address. If the existing account never verified it,
  // someone else may have registered it first: drop that password and its sessions (pre-hijacking protection).
  if (!byEmail.emailVerifiedAt) {
    byEmail.passwordHash = "";
    await Session.deleteMany({ userId: byEmail._id });
  }
  byEmail.set(field, profile.providerId);
  byEmail.emailVerifiedAt ??= new Date();
  await byEmail.save();
  return String(byEmail._id);
}

export async function createOAuthUser(profile: OAuthProfile, name: string): Promise<string> {
  await connectDB();
  const user = await User.create({
    email: profile.email,
    name,
    passwordHash: "",
    emailVerifiedAt: profile.emailVerified ? new Date() : null,
    ageConfirmedAt: new Date(),
    [idField(profile.provider)]: profile.providerId,
  });
  return String(user._id);
}
