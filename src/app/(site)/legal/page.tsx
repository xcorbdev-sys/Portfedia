import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, operator } from "@/lib/legal";
import { LegalOperator } from "@/components/LegalOperator";

export const metadata: Metadata = { title: "Legal notice", description: "Who operates Portfedia and how to contact us (künye / impressum)." };

export default async function LegalNoticePage() {
  await connection();
  const o = operator();
  return (
    <div className="narrow prose">
      <h1>Legal notice</h1>
      <p className="muted">Künye · Last updated: {LEGAL_UPDATED}</p>

      <h2>Operator</h2>
      <p>Portfedia is operated by:</p>
      <LegalOperator />
      <p className="small muted">
        Information provided under Turkish Law No. 6563 on the Regulation of Electronic Commerce and Law No. 5651, and the EU Digital
        Services Act.
      </p>

      <h2>Single point of contact</h2>
      <p>
        Authorities, courts and users can reach us at <a href={`mailto:${o.email}`}>{o.email}</a> (EU Digital Services Act, Articles 11
        and 12). We answer in English and Turkish.
      </p>
      {o.euRepresentative && <p>Representative in the European Union (GDPR Article 27): {o.euRepresentative}.</p>}

      <h2>Reporting illegal content</h2>
      <p>
        Portfedia hosts content published by its users. To report content you believe is illegal or infringes your rights, use the{" "}
        <Link href="/report">report form</Link>, the &ldquo;Report&rdquo; link on the page, or for copyright the{" "}
        <Link href="/copyright">takedown form</Link>. We review every notice and remove or disable access to illegal content promptly.
        Turkish authorities can send removal decisions under Law No. 5651 to the address above.
      </p>

      <h2>Responsibility for content</h2>
      <p>
        Profiles are written by the people they are about, and organization pages by the community and the organizations themselves.
        Portfedia does not check every statement before publication and is not responsible for user content it does not know to be
        illegal. Links to other websites are provided for convenience; we are not responsible for their content.
      </p>

      <h2>Commercial messages</h2>
      <p>
        We only send emails that are needed for your account and notifications you can turn off. We don&apos;t send commercial
        electronic messages (advertising) without your prior consent.
      </p>

      <p>
        See also: <Link href="/terms">Terms of Use</Link> · <Link href="/privacy">Privacy Policy</Link> ·{" "}
        <Link href="/kvkk">KVKK Aydınlatma Metni</Link> · <Link href="/cookies">Cookie Policy</Link>
      </p>
    </div>
  );
}
