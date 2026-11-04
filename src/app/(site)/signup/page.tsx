import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/create");
  return (
    <div className="auth">
      <h1>Create your account</h1>
      <p className="muted">Join Portfedia and publish your profile in minutes.</p>
      <div className="card"><div className="card__body"><SignupForm /></div></div>
    </div>
  );
}
