"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { connectDB } from "../db";
import { User } from "../models";
import { createSession, destroySession, getCurrentUser, safeNext } from "../auth";
import { deleteAccount } from "../pages";
import { email as cleanEmail, str } from "../validate";
import { rateLimit } from "../rate-limit";

export type FormState = { error?: string; ok?: string } | undefined;

// A valid bcrypt hash that matches nothing: used so unknown e-mails take as long as known ones
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Q7ZUYzCZq4hbX9JhB6Wz1QZr0q0e1W";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd.get("name"), 120);
  const email = cleanEmail(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your full name." };
  if (!email) return { error: "Please enter a valid email address." };
  if (password.length < 8 || password.length > 200) return { error: "Password must be at least 8 characters." };
  if (fd.get("consent") !== "on") return { error: "Please accept the privacy notice to continue." };
  if (!rateLimit(`register:${await clientIp()}`, 10, 60 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }

  await connectDB();
  if (await User.exists({ email })) return { error: "An account with this email already exists. Try logging in." };
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  await createSession(String(user._id));
  redirect("/create?welcome=1");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = cleanEmail(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  const next = safeNext(fd.get("next"));
  if (!email || !password) return { error: "Email and password are required." };
  if (!rateLimit(`login:${email}`, 8, 15 * 60_000) || !rateLimit(`login-ip:${await clientIp()}`, 30, 15 * 60_000)) {
    return { error: "Too many failed attempts. Please try again in 15 minutes." };
  }
  await connectDB();
  const user = await User.findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Incorrect email or password." };
  await createSession(String(user._id));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc || !(await bcrypt.compare(String(fd.get("password") ?? ""), doc.passwordHash))) {
    return { error: "Incorrect password." };
  }
  await deleteAccount(user.id);
  await destroySession();
  redirect("/?deleted=1");
}
