import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";
import { isModerator, requireUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { claimDomainOf, listOrgAdmins, listPositions } from "@/lib/org-admin";
import { decidePositionAction, removeOrgAdminAction } from "@/lib/actions/org";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { InviteAdminForm } from "@/components/forms/OrgAdminForms";

export const metadata: Metadata = { title: "Manage organization", robots: { index: false } };

const range = (a?: number | null, b?: number | null, current?: boolean) =>
  a || b || current ? `${a ?? "?"} – ${current ? "Present" : (b ?? "?")}` : "";

function DecisionButton({ org, person, index, decision, children }: { org: string; person: string; index: number; decision: string; children: React.ReactNode }) {
  return (
    <form action={decidePositionAction}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="person" value={person} />
      <input type="hidden" name="index" value={index} />
      <input type="hidden" name="decision" value={decision} />
      <button className={`btn btn--sm${decision === "verified" ? " btn--primary" : ""}`} type="submit">
        {children}
      </button>
    </form>
  );
}

export default async function ManageOrgPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ claimed?: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/org/${slug}/manage`);
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) notFound();
  if (!page.orgAdmins.includes(user.id) && !isModerator(user)) redirect(`/org/${slug}/claim`);
  const [positions, admins] = await Promise.all([listPositions(slug), listOrgAdmins(page)]);
  const domain = claimDomainOf(page);
  const pending = positions.filter((p) => p.entry.verification === "unverified").length;
  const { claimed } = await searchParams;

  return (
    <div className="container" style={{ maxWidth: 980, paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: page.title, href: `/org/${slug}` }, { label: "Manage" }]} />
      {claimed && <div className="notice notice--ok" style={{ margin: "8px 0 16px" }}>You now manage {page.title} on Portfedia. 🎉</div>}
      <div className="section__head" style={{ marginTop: 8 }}>
        <div>
          <h1 className="section__title">Manage {page.title}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Only admins of this organization and Portfedia moderators can see this page.</p>
        </div>
        <Link className="btn" href={`/org/${slug}/edit`}>Edit page</Link>
      </div>

      <section className="card" id="people" style={{ marginTop: 18 }}>
        <div className="card__body">
          <div className="card__title">People ({positions.length}) {pending > 0 && <span className="status-pill status-pill--pending">{pending} to review</span>}</div>
          <p className="small muted">
            Verify the positions people list on their profiles. Verified positions get a ✓; rejected ones are hidden from your page.
          </p>
          {positions.length === 0 ? (
            <div className="empty">Nobody has added {page.title} to their profile yet.</div>
          ) : (
            <ul className="app-list">
              {positions.map((p) => (
                <li key={`${p.personSlug}-${p.index}`} className="app-card__head" style={{ alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <Thumb image={p.image} name={p.personTitle} variant="round" />
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/${p.personSlug}`} style={{ fontWeight: 700 }}>{p.personTitle}</Link>
                    <div className="small" style={{ color: "var(--text-2)" }}>
                      {[p.entry.role, range(p.entry.startYear, p.entry.endYear, p.entry.current)].filter(Boolean).join(" · ")}
                    </div>
                    <span className={`status-pill status-pill--${p.entry.verification === "verified" ? "published" : p.entry.verification === "rejected" ? "rejected" : "pending"}`}>
                      {p.entry.verification === "verified"
                        ? `Verified${p.entry.verifiedVia === "work_email" ? " (work email)" : ""}`
                        : p.entry.verification === "rejected"
                          ? "Rejected"
                          : "Not reviewed"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {p.entry.verification !== "verified" && (
                      <DecisionButton org={slug} person={p.personSlug} index={p.index} decision="verified"><Check size={14} /> Verify</DecisionButton>
                    )}
                    {p.entry.verification !== "rejected" && (
                      <DecisionButton org={slug} person={p.personSlug} index={p.index} decision="rejected"><X size={14} /> Reject</DecisionButton>
                    )}
                    {p.entry.verification !== "unverified" && (
                      <DecisionButton org={slug} person={p.personSlug} index={p.index} decision="unverified"><RotateCcw size={14} /> Reset</DecisionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card" id="admins" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div className="card__title">Admins</div>
          <ul className="plain-list" style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
            {admins.map((a) => (
              <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span>
                  <b>{a.name}</b> <span className="muted small">{a.email}</span>
                </span>
                <form action={removeOrgAdminAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="userId" value={a.id} />
                  <button className="btn btn--sm btn--ghost" type="submit">{a.id === user.id ? "Leave" : "Remove"}</button>
                </form>
              </li>
            ))}
            {admins.length === 0 && <li className="muted small">No admins yet.</li>}
          </ul>
          {domain.ok ? <InviteAdminForm slug={slug} domain={domain.domain} /> : <p className="small muted">{domain.reason}</p>}
        </div>
      </section>
    </div>
  );
}
