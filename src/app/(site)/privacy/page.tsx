import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <div className="narrow prose">
      <h1>Privacy notice</h1>
      <p className="muted">This is a summary for the beta version and must be reviewed by a lawyer before launch (GDPR / KVKK).</p>
      <h2>What we store</h2>
      <ul>
        <li>Account data: your name, email address and a hash of your password.</li>
        <li>Profile data you choose to publish: photo, career, education, biography, links and sources.</li>
        <li>The revision history of the pages you edit.</li>
      </ul>
      <h2>What is public</h2>
      <p>Your profile is public. Your birth year and email are only shown if you enable them. You can hide your profile from search engines.</p>
      <h2>Your rights</h2>
      <p>
        You can edit your profile at any time. Deleting your account permanently removes your account, profile, all of its revisions and uploaded
        images. Edits you made to organization pages are kept but anonymized.
      </p>
      <h2>Storage</h2>
      <p>Data is stored in MongoDB; images are stored on Cloudflare R2. We do not sell data and the site shows no advertising.</p>
    </div>
  );
}
