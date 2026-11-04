import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf } from "@/lib/pages";
import { PersonForm } from "@/components/forms/PersonForm";

export const metadata: Metadata = { title: "Edit profile", robots: { index: false } };

export default async function EditMyProfile() {
  const user = await requireUser("/edit");
  const page = await getPersonPageOf(user.id);
  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      <div className="wizard-head">
        <h1>{page ? "Edit your profile" : "Create your profile"}</h1>
        <p className="muted">
          {page ? (
            <>Changes are saved as a new revision of <Link href={`/${page.slug}`}>your profile</Link>.</>
          ) : (
            "It takes about five minutes. You can always come back and add more."
          )}
        </p>
      </div>
      <PersonForm page={page} defaultName={user.name} />
    </div>
  );
}
