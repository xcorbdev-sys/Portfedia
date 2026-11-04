/**
 * End-to-end test of the main Portfedia flows against a running app with a fresh database.
 *
 *   BASE_URL=http://localhost:3000 E2E_LOG=/tmp/app.log node e2e/run.cjs
 *
 * The app must run with ADMIN_EMAILS=admin@example.com and without RESEND_API_KEY:
 * emails are then written to the server log, which this script reads (E2E_LOG file,
 * or `docker logs $E2E_CONTAINER` when E2E_LOG is not set).
 */
const { chromium } = require("playwright");
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = process.env.E2E_SHOTS || "";
let failures = 0;

function check(label, ok, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

function logs() {
  if (process.env.E2E_LOG) return fs.readFileSync(process.env.E2E_LOG, "utf8");
  return execSync(`docker logs ${process.env.E2E_CONTAINER || "portfedia-app-1"} 2>&1`, { maxBuffer: 64 * 1024 * 1024 }).toString();
}

/** Latest emailed link of a kind (e.g. "verify-email") sent to an address. */
async function emailLink(to, kind) {
  for (let i = 0; i < 60; i++) {
    const text = logs();
    const at = text.lastIndexOf(`To: ${to}`);
    if (at >= 0) {
      const m = text.slice(at).match(new RegExp(`(https?://[^\\s]+/${kind}[^\\s]*token=[A-Za-z0-9_-]+)`));
      if (m) return m[1].replace(/^https?:\/\/[^/]+/, BASE);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No ${kind} email for ${to}`);
}

function photo(color) {
  // Tiny valid PNG generated without dependencies (1x1, upscaled by the server)
  const file = path.join(os.tmpdir(), `pf-${color}.png`);
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc0000003010100c9fe92ef0000000049454e44ae426082",
    "hex",
  );
  fs.writeFileSync(file, png);
  return file;
}

/** Creates an organization page through the regular four-step form. */
async function createOrg(page, o) {
  await page.goto(`${BASE}/create?type=${o.type || "org"}&title=${encodeURIComponent(o.name)}`);
  if (o.kind) await page.selectOption("#type", o.kind);
  await page.fill("#sector", o.sector);
  await page.fill("#tags", o.tags);
  await page.fill("#summary", o.summary);
  await page.click('button:has-text("Continue")');
  await page.fill("#founded", o.founded);
  await page.fill("#headquarters", o.hq);
  await page.selectOption("#employees", o.employees);
  await page.fill("#website", o.website);
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Create page")');
  await page.waitForURL(/\/org\/[a-z0-9-]+$/);
}

async function signup(browser, name, email, { confirm = true } = {}) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "correct-horse-9");
  await page.selectOption("#birthYear", "1990");
  await page.check("input[name=consent]");
  await page.waitForTimeout(2700); // the bot check rejects instant submits
  await page.click("button[type=submit]");
  await page.waitForURL(/\/create/);
  if (!confirm) return page;
  await page.goto(await emailLink(email, "verify-email"));
  await page.click('button:has-text("Confirm email address")');
  await page.waitForURL(/done=1/);
  return page;
}

const visible = (p) => p.locator(".step:not([hidden])");

async function createProfile(p, opts) {
  const { occupation, summary, org, role } = opts;
  await p.goto(`${BASE}/create`);
  await p.click("text=Person Profile");
  await p.click('button:has-text("Continue")');
  await p.setInputFiles("input[name=image]", photo("blue"));
  await p.click('button:has-text("Use photo")'); // square crop dialog
  await p.fill("#occupation", occupation);
  await p.fill("#summary", summary);
  await p.fill("#tags", "Engineer, Robotics");
  await p.fill("#sector", "Robotics & Automation");
  if (opts.rich) await p.check('input[name=openTo][value="speaking"]');
  await p.click('button:has-text("Continue")');
  await p.click('button:has-text("Add position")');
  const item = p.locator(".repeat-item").first();
  await item.locator("input").nth(0).fill(org);
  await item.locator("input").nth(1).fill(role);
  await item.locator("input").nth(2).fill("2019");
  await item.locator("input[type=checkbox]").check();
  await p.fill("#body", `${summary}\n\n## Projects\n\n- WarehouseOS`);
  if (opts.rich) {
    await p.click('button:has-text("Add language")');
    await visible(p).getByPlaceholder("Language (e.g. English)").fill("English");
    await visible(p).locator('select[aria-label="Level"]').selectOption("C1");
  }
  await p.click('button:has-text("Continue")');
  if (opts.rich) {
    const step = visible(p);
    await p.click('button:has-text("Add project")');
    await step.getByPlaceholder("Project name *").fill("WarehouseOS");
    await step.locator('input[type=file][name^="projectImage_"]').setInputFiles(photo("blue"));
    await p.click('button:has-text("Add publication")');
    await step.getByPlaceholder("Title *", { exact: true }).fill("Fleet routing at scale");
    await p.click('button:has-text("Add award or certification")');
    await step.getByPlaceholder("Name *", { exact: true }).fill("Young Engineer of the Year");
    await step.getByPlaceholder("Issued by").fill("Northwind Robotics");
    await p.click('button:has-text("Add volunteering")');
    await step.getByPlaceholder("Organization *").fill("Code Club");
    await step.getByPlaceholder("From").fill("2016");
  }
  await p.click('button:has-text("Continue")');
  await p.click('button:has-text("Submit for review")');
  await p.waitForURL((u) => !u.pathname.startsWith("/create"), { timeout: 20000 });
  return new URL(p.url()).pathname;
}

(async () => {
  const browser = await chromium.launch();
  const anon = await (await browser.newContext()).newPage();

  // ── Age screen & bot check
  const kid = await (await browser.newContext()).newPage();
  await kid.goto(`${BASE}/signup`);
  await kid.fill("#name", "Young Person");
  await kid.fill("#email", "kid@example.com");
  await kid.fill("#password", "correct-horse-9");
  await kid.selectOption("#birthYear", String(new Date().getFullYear() - 13));
  await kid.check("input[name=consent]");
  await kid.waitForTimeout(2700);
  await kid.click("button[type=submit]");
  await kid.waitForSelector(".notice--error");
  check("under-16 sign-up is refused", /at least 16/.test(await kid.locator(".notice--error").innerText()));

  // ── Weak passwords are refused
  const weak = await (await browser.newContext()).newPage();
  await weak.goto(`${BASE}/signup`);
  await weak.fill("#name", "Weak Password");
  await weak.fill("#email", "weak@example.com");
  await weak.fill("#password", "password1");
  check("strength meter warns", /Very weak/.test(await weak.locator(".field .hint").first().innerText()));
  await weak.selectOption("#birthYear", "1990");
  await weak.check("input[name=consent]");
  await weak.waitForTimeout(2700);
  await weak.click("button[type=submit]");
  await weak.waitForSelector(".notice--error");
  check("weak password refused", /too easy/.test(await weak.locator(".notice--error").innerText()));

  // ── Admin account; organization pages are created by users through the normal form
  const admin = await signup(browser, "Portfedia Admin", "admin@example.com");
  await createOrg(admin, { name: "Northwind Robotics", sector: "Robotics & Automation", tags: "Robotics, Logistics", summary: "Autonomous warehouse robots", founded: "2015", hq: "Istanbul, Türkiye", employees: "201–500", website: "https://northwind.example" });
  await createOrg(admin, { name: "Bluefin Bank", sector: "Banking", tags: "Banking", summary: "A retail bank", founded: "1990", hq: "Izmir", employees: "1,001–5,000", website: "https://bluefin.example" });
  check("organization pages created by a user", (await anon.goto(`${BASE}/org/bluefin-bank`)).status() === 200 && (await anon.locator("text=A retail bank").count()) > 0);

  // ── A profile saved before the email is confirmed is kept and goes to review after confirming
  const deniz = await signup(browser, "Deniz Aksoy", "deniz@example.com", { confirm: false });
  const denizPath = await createProfile(deniz, { occupation: "Product Designer", summary: "Product designer at [[Bluefin Bank]].", org: "Bluefin Bank", role: "Designer" });
  check("unconfirmed user can save the profile", denizPath === "/deniz-aksoy" && (await deniz.locator("text=Your profile is saved.").count()) === 1);
  await admin.goto(`${BASE}/admin`);
  check("not in the review queue before confirming", (await admin.locator('.app-card a[href="/deniz-aksoy"]').count()) === 0);
  await deniz.goto(await emailLink("deniz@example.com", "verify-email"));
  await deniz.click('button:has-text("Confirm email address")');
  await deniz.waitForURL(/done=1/);
  await admin.goto(`${BASE}/admin`);
  check("in the review queue after confirming", (await admin.locator('.app-card a[href="/deniz-aksoy"]').count()) === 1);
  await admin.locator(".app-card", { has: admin.locator('a[href="/deniz-aksoy"]') }).locator('button:has-text("Approve")').click();
  await admin.locator('.app-card a[href="/deniz-aksoy"]').waitFor({ state: "detached" });

  // ── Autosave: a profile being filled in is saved on its own, privately, and isn't in the review queue
  const elif = await signup(browser, "Elif Sahin", "elif@example.com");
  await elif.goto(`${BASE}/create`);
  await elif.click("text=Person Profile");
  await elif.click('button:has-text("Continue")');
  await elif.fill("#occupation", "Data Analyst");
  await elif.fill("#summary", "Data analyst who should never lose her work.");
  await elif.locator("text=✓ Saved automatically at").waitFor({ timeout: 20000 });
  check("profile is saved automatically", true);
  await elif.goto(`${BASE}/edit`);
  check("autosaved values come back", (await elif.inputValue("#occupation")) === "Data Analyst");
  await elif.goto(`${BASE}/elif-sahin`);
  check("autosaved draft is private and labelled", (await elif.locator("text=Your profile is saved as a draft.").count()) === 1 && (await anon.goto(`${BASE}/elif-sahin`)).status() === 404);
  await admin.goto(`${BASE}/admin`);
  check("draft is not in the review queue", (await admin.locator('.app-card a[href="/elif-sahin"]').count()) === 0);

  // ── Limits: one company page and one SaaS project per account; admins can upgrade an account
  await createOrg(elif, { type: "saas", name: "Elif Analytics", sector: "Analytics", tags: "SaaS, Analytics", summary: "Dashboards for small shops", founded: "2024", hq: "Ankara", employees: "1–10", website: "https://elif-analytics.example" });
  check("SaaS project created and managed by its maker", (await elif.locator('a[href="/org/elif-analytics/manage"]').count()) > 0 && (await elif.locator("text=Pricing").count()) > 0);
  await anon.goto(`${BASE}/saas`);
  check("SaaS projects have their own section", (await anon.locator('a[href="/org/elif-analytics"]').count()) === 1);
  await anon.goto(`${BASE}/companies`);
  check("SaaS projects are not listed as companies", (await anon.locator('a[href="/org/elif-analytics"]').count()) === 0);
  await elif.goto(`${BASE}/create?type=saas&title=${encodeURIComponent("Elif Forms")}`);
  check("second SaaS project is blocked", (await elif.locator("text=Limit reached").count()) === 1 && (await elif.locator('button:has-text("Continue")').isDisabled()));
  await createOrg(elif, { name: "Sahin Consulting", sector: "Consulting", tags: "Consulting", summary: "A small consultancy", founded: "2020", hq: "Ankara", employees: "1–10", website: "https://sahin.example" });
  await elif.goto(`${BASE}/create?type=org&title=${encodeURIComponent("Another Company")}`);
  check("second company page is blocked", (await elif.locator('label.choice:has(input[value="org"]) .quota--full').count()) === 1 && (await elif.locator('button:has-text("Continue")').isDisabled()));
  await admin.goto(`${BASE}/admin?section=users&q=elif`);
  await admin.click('button:has-text("Upgrade account")');
  await admin.waitForSelector(".notice--ok");
  check("admin upgrades an account", /Account upgraded/.test(await admin.locator(".notice--ok").first().innerText()));
  await createOrg(elif, { type: "saas", name: "Elif Forms", sector: "Productivity", tags: "SaaS", summary: "Forms for teams", founded: "2025", hq: "Ankara", employees: "1–10", website: "https://elif-forms.example" });
  check("upgraded account can add more SaaS projects", new URL(elif.url()).pathname === "/org/elif-forms");

  // ── Renaming from the edit form (the page's own admin; moderators can too)
  await elif.goto(`${BASE}/org/elif-forms/edit`);
  await elif.fill("#title", "Elif Forms Pro");
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Save changes")');
  await elif.waitForURL(`${BASE}/org/elif-forms-pro`);
  check("page renamed from the edit form", (await elif.locator("h1:has-text('Elif Forms Pro')").count()) === 1);
  check("old address redirects after renaming", (await anon.goto(`${BASE}/org/elif-forms`)) && new URL(anon.url()).pathname === "/org/elif-forms-pro");

  // ── A member shows their SaaS project in the Projects section of their profile
  await elif.goto(`${BASE}/edit`);
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("+ Elif Analytics")');
  check("own SaaS projects are offered in Projects", (await elif.locator('button:has-text("+ Elif Forms")').count()) === 1 && (await elif.locator('a:has-text("your SaaS page on Portfedia")').count()) === 1);
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Submit for review")');
  await elif.waitForURL(`${BASE}/elif-sahin`);
  await admin.goto(`${BASE}/admin`);
  await admin.locator(".app-card", { has: admin.locator('a[href="/elif-sahin"]') }).locator('button:has-text("Approve")').click();
  await admin.locator('.app-card a[href="/elif-sahin"]').waitFor({ state: "detached" });
  await anon.goto(`${BASE}/elif-sahin`);
  check("profile project links to the SaaS page", (await anon.locator('#projects a[href="/org/elif-analytics"]').count()) === 1);
  await anon.goto(`${BASE}/org/elif-analytics`);
  check("SaaS page shows its maker in the team", (await anon.locator('#key-people a[href="/elif-sahin"]').count()) === 1);

  // ── Ayşe applies
  const ayse = await signup(browser, "Ayşe Demir", "ayse@example.com");
  const aysePath = await createProfile(ayse, { occupation: "Robotics Engineer", summary: "Robotics engineer and CTO of [[Northwind Robotics]].", org: "Northwind Robotics", role: "CTO", rich: true });
  check("profile submitted for review", aysePath === "/ayse-demir" && (await ayse.locator(".review-banner").count()) === 1);
  check("uploaded photo is resized to WebP", /\.webp$/.test((await ayse.locator(".p-head .p-photo img").getAttribute("src")) || ""));
  check("pending profile is hidden", (await anon.goto(`${BASE}${aysePath}`)).status() === 404);

  // ── Approval
  await admin.goto(`${BASE}/admin`);
  await admin.locator(".app-card").first().locator('button:has-text("Approve")').click();
  await admin.locator("text=No applications waiting for review.").waitFor();
  check("approved profile is public", (await anon.goto(`${BASE}${aysePath}`)).status() === 200);
  const ld = await anon.locator('script[type="application/ld+json"]').allInnerTexts();
  check("ProfilePage structured data", ld.some((t) => t.includes('"ProfilePage"')) && ld.some((t) => t.includes('"BreadcrumbList"')));
  const ogUrl = (await anon.locator('meta[property="og:image"]').first().getAttribute("content")) || "";
  const og = await anon.request.get(ogUrl.replace(/^https?:\/\/[^/]+/, BASE));
  check("share card image", og.status() === 200 && (og.headers()["content-type"] || "").includes("image/png"));
  check("application email sent", logs().includes("Your Portfedia profile is live"));
  await anon.goto(`${BASE}${aysePath}`);
  check(
    "achievement sections",
    (await anon.locator("#projects .project-card__img").count()) === 1 &&
      (await anon.locator("#publications").count()) === 1 &&
      (await anon.locator('#awards a[href="/org/northwind-robotics"]').count()) === 1 &&
      (await anon.locator("#volunteering").count()) === 1,
  );
  check("timeline, open-to photo frame and language level", (await anon.locator("#timeline .tl__bar").count()) >= 2 && (await anon.locator(".p-head .p-photo--open .open-ribbon").count()) === 1 && (await anon.locator("text=(C1)").count()) === 1);
  await ayse.goto(`${BASE}${aysePath}`);
  check("profile strength card for the owner", (await ayse.locator(".completeness").count()) === 1 && (await anon.locator(".completeness").count()) === 0);
  const short = await anon.request.get(`${BASE}/@ayse-demir`, { maxRedirects: 0 });
  check("@ short link redirects", [301, 308].includes(short.status()) && (short.headers().location || "").endsWith("/ayse-demir"));
  await anon.goto(`${BASE}${aysePath}/qr`);
  check("QR card", (await anon.locator(".qr svg").count()) === 1);
  await anon.goto(`${BASE}/tag/robotics`);
  check("tag page", (await anon.locator('a.entity[href="/ayse-demir"]').count()) === 1 && (await anon.locator('a.entity[href="/org/northwind-robotics"]').count()) === 1);
  await ayse.goto(`${BASE}/edit`);
  await ayse.fill("#summary", "Total asshole of an engineer");
  await ayse.click('button:has-text("save now")');
  await ayse.waitForSelector(".notice--error");
  check("offensive language refused", /offensive/.test(await ayse.locator(".notice--error").innerText()));

  // ── Position verification with a work email
  await ayse.goto(`${BASE}/account#positions`);
  await ayse.fill("#positions input[name=email]", "ayse@gmail.com");
  await ayse.click('#positions button:has-text("Verify")');
  await ayse.waitForSelector("#positions .notice--error");
  check("personal email refused for verification", /work email/.test(await ayse.locator("#positions .notice--error").innerText()));
  await ayse.fill("#positions input[name=email]", "ayse@northwind.example");
  await ayse.click('#positions button:has-text("Verify")');
  await ayse.waitForSelector("#positions .notice--ok");
  await ayse.goto(await emailLink("ayse@northwind.example", "verify-work"));
  await ayse.click('button:has-text("Verify position")');
  await ayse.waitForURL(/done=/);
  await anon.goto(`${BASE}${aysePath}`);
  check("position shows as verified", (await anon.locator(".timeline .badge-ok").count()) === 1);

  // ── Mert claims Northwind with his work email
  const mert = await signup(browser, "Mert Kaya", "mert@example.com");
  await mert.goto(`${BASE}/org/northwind-robotics/claim`);
  await mert.fill("input[name=email]", "mert@gmail.com");
  await mert.click('button:has-text("Send link")');
  await mert.waitForSelector(".notice--error");
  check("claim with personal email refused", /work email/.test(await mert.locator(".notice--error").innerText()));
  await mert.fill("input[name=email]", "mert@other.example");
  await mert.click('button:has-text("Send link")');
  // wait for the new message (the previous error is still on screen until the server answers)
  const domainError = await mert.locator('.notice--error:has-text("@northwind.example")').waitFor({ timeout: 10000 }).then(() => true, () => false);
  check("claim with another domain refused", domainError);
  await mert.fill("input[name=email]", "mert@northwind.example");
  await mert.click('button:has-text("Send link")');
  await mert.waitForSelector(".notice--ok");
  await mert.goto(await emailLink("mert@northwind.example", "claim/confirm"));
  await mert.click('button:has-text("Confirm and manage page")');
  await mert.waitForURL(/manage\?claimed=1/);
  check("organization claimed", (await mert.locator("text=You now manage").count()) === 1);
  const rows = mert.locator("#people .app-card__head");
  check("manage screen lists positions", (await rows.count()) === 1);
  await rows.first().locator('button:has-text("Reject")').click();
  await mert.locator("#people .status-pill--rejected").waitFor();
  await anon.goto(`${BASE}/org/northwind-robotics`);
  check("rejected position hidden from company page", (await anon.locator("#key-people .person-row").count()) === 0);
  await mert.locator("#people .app-card__head").first().locator('button:has-text("Verify")').click();
  await mert.locator("#people .status-pill--published").waitFor();

  // ── Claimed page: only admins edit; funding with linked investors
  await ayse.goto(`${BASE}/org/northwind-robotics/edit`);
  check("non-admin can't edit a claimed page", new URL(ayse.url()).pathname === "/org/northwind-robotics");
  await mert.goto(`${BASE}/org/northwind-robotics/edit`);
  await mert.click('button:has-text("Continue")');
  await mert.click('button:has-text("Add funding round")');
  const round = mert.locator(".repeat-item").first();
  await round.locator("select").selectOption("Series A");
  await round.locator("input").nth(0).fill("2021");
  await round.locator("input").nth(1).fill("$12M");
  await round.locator("input").nth(2).fill("Ayşe Demir, Atlas Ventures");
  await mert.fill("#body", "Northwind Robotics builds warehouse robots. CTO [[Ayşe Demir]] leads engineering.");
  await mert.click('button:has-text("Continue")');
  const more = visible(mert);
  await mert.click('button:has-text("Add product")');
  await more.getByPlaceholder("Product name *").fill("Northwind Carrier");
  await mert.click('button:has-text("Add person")');
  await more.getByPlaceholder("Full name *", { exact: true }).fill("Ayşe Demir");
  await more.getByPlaceholder("Role (e.g. CEO, Chair)").fill("CTO");
  await mert.click('button:has-text("Add milestone")');
  await more.getByPlaceholder("What happened? *").fill("First robots shipped");
  await mert.fill("#formerNames", "Northwind Labs");
  await mert.click('button:has-text("Add position")');
  await more.getByPlaceholder("Job title *").fill("Robotics Engineer");
  await more.getByPlaceholder("Location (or Remote)").fill("Istanbul");
  await mert.click('button:has-text("Continue")');
  await mert.click('button:has-text("Save changes")');
  await mert.waitForURL(`${BASE}/org/northwind-robotics`);
  check("funding table with linked investor", (await mert.locator('#funding a[href="/ayse-demir"]').count()) === 1);
  await anon.goto(`${BASE}${aysePath}`);
  check("investor page lists the investment", (await anon.locator('#investments a[href="/org/northwind-robotics"]').count()) === 1);
  await anon.goto(`${BASE}/org/northwind-robotics`);
  check("org sections: products, leadership link, milestones, jobs", (await anon.locator("#products").count()) === 1 && (await anon.locator('#leadership a[href="/ayse-demir"]').count()) === 1 && (await anon.locator("#milestones").count()) === 1 && (await anon.locator("#jobs").count()) === 1);
  await anon.goto(`${BASE}/jobs`);
  check("job on /jobs", (await anon.locator("text=Robotics Engineer").count()) >= 1);
  check("former name redirects", (await anon.goto(`${BASE}/org/northwind-labs`)) && new URL(anon.url()).pathname === "/org/northwind-robotics");
  const badge = await anon.request.get(`${BASE}/org-badge/northwind-robotics`);
  check("verified badge SVG", badge.status() === 200 && (await badge.text()).includes("Verified on Portfedia"));
  await ayse.goto(`${BASE}/notifications`);
  check("mention notification", (await ayse.locator("text=Mert Kaya mentioned you on Northwind Robotics.").count()) === 1);

  // ── Only a page's owner can edit it; history and restore
  await ayse.goto(`${BASE}/org/bluefin-bank/edit`);
  check("only the owner can edit an organization page", new URL(ayse.url()).pathname === "/org/bluefin-bank" && (await ayse.locator('a[href="/org/bluefin-bank/edit"]').count()) === 0);
  await admin.goto(`${BASE}/org/bluefin-bank/edit`);
  await admin.fill("#summary", "VANDALISED");
  for (let i = 0; i < 3; i++) await admin.click('button:has-text("Continue")');
  await admin.click('button:has-text("Save changes")');
  await admin.waitForURL(`${BASE}/org/bluefin-bank`);
  await admin.goto(`${BASE}/org/bluefin-bank/history`);
  await admin.locator(".history li a").nth(1).click(); // the version before the bad edit
  await admin.waitForURL(/history\/[a-f0-9]{24}/);
  check("revision diff page", (await admin.locator("text=Restore this version").count()) === 1);
  await admin.click('button:has-text("Restore this version")');
  await admin.waitForURL(/history\?restored=1/);
  await anon.goto(`${BASE}/org/bluefin-bank`);
  check("restored previous version", (await anon.locator("text=VANDALISED").count()) === 0 && (await anon.locator("text=A retail bank").count()) > 0);

  // ── Link spam from a new account is refused (on a page they own)
  await mert.goto(`${BASE}/org/northwind-robotics/edit`);
  await mert.click('button:has-text("Continue")');
  await mert.fill("#body", Array.from({ length: 10 }, (_, i) => `https://spam${i}.example/x`).join("\n"));
  await mert.click('button:has-text("Continue")');
  await mert.click('button:has-text("Continue")');
  await mert.click('button:has-text("Save changes")');
  await mert.waitForSelector(".notice--error");
  check("link spam refused and reported", /links per day/.test(await mert.locator(".notice--error").innerText()));

  // ── Page protection: even the organization's own admins see the notice; members can't edit
  await admin.goto(`${BASE}/org/bluefin-bank/edit`);
  for (let i = 0; i < 3; i++) await admin.click('button:has-text("Continue")');
  await admin.selectOption("#protectDays", "7");
  await admin.fill("#protectReason", "Repeated vandalism");
  await admin.click('button:has-text("Save changes")');
  await admin.waitForURL(`${BASE}/org/bluefin-bank`);
  await ayse.goto(`${BASE}/org/bluefin-bank/edit`);
  check("protected page can't be edited by members", new URL(ayse.url()).pathname === "/org/bluefin-bank" && (await ayse.locator("text=This page is protected").count()) === 1);

  // ── Thanks, recommendation, suggested edit
  await mert.goto(`${BASE}${aysePath}`);
  await mert.click('button[aria-label="Say thanks"]');
  await mert.locator('button[aria-label="You thanked this person"]').waitFor();
  await mert.goto(`${BASE}${aysePath}/recommend`);
  await mert.fill("#relationship", "Colleague at Northwind");
  await mert.fill("#text", "Ayşe is the best robotics engineer I have worked with. Calm, precise and generous.");
  await mert.click('button:has-text("Send recommendation")');
  await mert.waitForSelector(".notice--ok");
  await admin.goto(`${BASE}${aysePath}/suggest`);
  await admin.fill("#message", "Please mention your talk at RoboConf.");
  await admin.locator('label:has-text("I also want to propose") input').check();
  await admin.fill("#body", "Robotics engineer and CTO of [[Northwind Robotics]]. Speaker at RoboConf.");
  await admin.click('button:has-text("Send suggestion")');
  await admin.waitForSelector(".notice--ok");
  await ayse.goto(`${BASE}/inbox`);
  check("inbox shows suggestion and recommendation", (await ayse.locator("text=Please mention your talk at RoboConf.").count()) === 1 && (await ayse.locator("text=Calm, precise and generous").count()) === 1);
  await ayse.click('button:has-text("Accept change")');
  await ayse.waitForURL(/inbox/);
  await ayse.click('button:has-text("Show on profile")');
  await ayse.locator('#recommendations .status-pill--published').waitFor();
  await anon.goto(`${BASE}${aysePath}`);
  check("accepted suggestion is live", (await anon.locator("text=Speaker at RoboConf").count()) === 1);
  check("recommendation shown after approval", (await anon.locator("#recommendations").count()) === 1);
  check("thanks counted", (await anon.locator("text=1 thanks").count()) === 1);

  // ── Impersonation flag
  const fake = await signup(browser, "Ayşe Demir", "fake-ayse@example.com");
  await createProfile(fake, { occupation: "CEO", summary: "Totally the real one.", org: "Bluefin Bank", role: "CEO" });
  await admin.goto(`${BASE}/admin`);
  check("possible impersonation flagged", (await admin.locator("text=Possible impersonation").count()) === 1);

  // ── Follow → notification
  await mert.goto(`${BASE}${aysePath}`);
  await mert.click('button:has-text("Follow")');
  await mert.waitForSelector('button:has-text("Following")');
  await ayse.goto(`${BASE}/`);
  check("bell shows unread notification", (await ayse.locator(".bell__count").count()) === 1);
  await ayse.goto(`${BASE}/notifications`);
  check("follower notification", (await ayse.locator("text=Mert Kaya started following you.").count()) === 1);

  // ── Report → moderation
  await anon.goto(`${BASE}/report?page=ayse-demir`);
  await anon.selectOption("#reason", "false_info");
  await anon.fill("#details", "This profile contains a wrong job title.");
  await anon.fill("#email", "someone@example.com");
  await anon.check("input[name=accurate]");
  await anon.waitForTimeout(2700);
  await anon.click('button:has-text("Send report")');
  await anon.waitForSelector(".notice--ok");
  await admin.goto(`${BASE}/admin?section=reports`);
  check("report reaches the admin", (await admin.locator("text=This profile contains a wrong job title.").count()) === 1);
  check("automatic link-spam report", (await admin.locator("text=Automatic flag").count()) === 1);
  const reportCard = admin.locator('.app-card:has-text("This profile contains a wrong job title.")');
  await reportCard.locator('button:has-text("Dismiss")').click();
  await admin.locator("text=This profile contains a wrong job title.").waitFor({ state: "detached" });

  // ── Collections
  await admin.goto(`${BASE}/admin/collections/new`);
  await admin.fill("#title", "Robotics in Türkiye");
  await admin.fill("#items", `${BASE}/org/northwind-robotics\nayse-demir\nDoes Not Exist`);
  await admin.click('button:has-text("Save collection")');
  await admin.waitForURL(/admin\/collections\/robotics-in-turkiye/);
  await anon.goto(`${BASE}/collections/robotics-in-turkiye`);
  check("collection page", (await anon.locator(".entity").count()) === 2);

  // ── Data export & profile address change
  const exp = await ayse.request.get(`${BASE}/api/account/export`);
  check("data export", exp.status() === 200 && (await exp.text()).includes('"ayse-demir"'));

  // ── Ban
  await admin.goto(`${BASE}/admin?section=users&q=mert`);
  await admin.fill("input[name=reason]", "Testing bans");
  await admin.click('button:has-text("Ban")');
  await admin.locator('.status-pill--rejected:has-text("banned")').waitFor();
  await mert.goto(`${BASE}/account`);
  check("banned user is signed out", new URL(mert.url()).pathname === "/login");
  await mert.fill("#email", "mert@example.com");
  await mert.fill("#password", "correct-horse-9");
  await mert.click("button[type=submit]");
  await mert.waitForSelector(".notice--error");
  check("banned user can't log in", /suspended/.test(await mert.locator(".notice--error").innerText()));

  // ── Home page globe: only profiles an admin picks
  await anon.goto(`${BASE}/`);
  check("globe shows no photos until an admin picks them", (await anon.locator(".globe-avatar").count()) === 0);
  await elif.goto(`${BASE}/org/elif-analytics/edit`);
  await elif.setInputFiles("input[name=image]", photo("blue"));
  for (let i = 0; i < 3; i++) await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Save changes")');
  await elif.waitForURL(`${BASE}/org/elif-analytics`);
  await admin.goto(`${BASE}/admin?section=home`);
  await admin.fill("#globe-people", `ayse-demir\n${BASE}/org/elif-analytics\nno-such-person`);
  await admin.click('button:has-text("Save")');
  await admin.waitForSelector(".notice--error");
  check("admin picks people and companies for the globe (invalid ones are reported)", /Saved 2 entries/.test(await admin.locator(".notice--error").innerText()) && /no-such-person/.test(await admin.locator(".notice--error").innerText()));
  await anon.goto(`${BASE}/`);
  check(
    "picked profile and company are on the globe",
    (await anon.locator('.globe-avatar[href="/ayse-demir"]').count()) === 1 && (await anon.locator('.globe-avatar--logo[href="/org/elif-analytics"]').count()) === 1 && (await anon.locator(".globe-avatar").count()) === 2,
  );

  // ── My pages: a member's own companies and SaaS projects
  await elif.goto(`${BASE}/my-pages`);
  check("my pages lists own companies and SaaS projects", (await elif.locator('#companies a[href="/org/sahin-consulting/edit"]').count()) === 1 && (await elif.locator('#saas a[href="/org/elif-analytics/edit"]').count()) === 1);

  // ── The owner can hide the profile views card
  await ayse.goto(`${BASE}${aysePath}`);
  await ayse.click('.stats-hide button');
  const hidden = await ayse.locator(".stats-hide").waitFor({ state: "detached", timeout: 10000 }).then(() => true, () => false);
  check("profile views card can be hidden", hidden && (await ayse.locator(".card__title:has-text('Profile views')").count()) === 0);
  await ayse.goto(`${BASE}/account`);
  await ayse.click('button:has-text("Show it again")');
  await ayse.goto(`${BASE}${aysePath}`);
  check("and shown again from Account", (await ayse.locator(".card__title:has-text('Profile views')").count()) === 1);

  // ── Leadership names link to the person's profile
  const people = await (await anon.request.get(`${BASE}/api/people?q=elif`)).json();
  check("people suggestions for leadership", people.some((p) => p.slug === "elif-sahin"));
  await elif.goto(`${BASE}/org/sahin-consulting/edit`);
  for (let i = 0; i < 2; i++) await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Add person")');
  await visible(elif).getByPlaceholder("Full name *").fill("Elif Sahin");
  await visible(elif).getByPlaceholder("Role (e.g. CEO, Chair)").fill("Founder");
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Save changes")');
  await elif.waitForURL(`${BASE}/org/sahin-consulting`);
  check("leadership name links to the profile", (await elif.locator('#leadership a[href="/elif-sahin"]').count()) === 1);

  // ── Universities and schools have their own Education section
  await createOrg(admin, { kind: "school", name: "Ankara Technical University", sector: "Education", tags: "University", summary: "A public university", founded: "1956", hq: "Ankara", employees: "1,001–5,000", website: "https://atu.example" });
  await anon.goto(`${BASE}/education`);
  check("universities are listed under Education", (await anon.locator('a[href="/org/ankara-technical-university"]').count()) === 1);
  await anon.goto(`${BASE}/companies`);
  check("universities are not listed as companies", (await anon.locator('a[href="/org/ankara-technical-university"]').count()) === 0);

  // ── Followers and following on profiles and company pages
  await elif.goto(`${BASE}${aysePath}`);
  await elif.click('button:has-text("Follow")');
  await elif.waitForSelector('button:has-text("Following")');
  await elif.goto(`${BASE}/org/northwind-robotics`);
  await elif.click('button:has-text("Follow")');
  await elif.waitForSelector('button:has-text("Following")');
  await anon.goto(`${BASE}${aysePath}`);
  check("profile lists its followers", (await anon.locator('#network a[href="/elif-sahin"]').count()) === 1);
  await anon.goto(`${BASE}/elif-sahin`);
  check("profile lists what the person follows", (await anon.locator(`#network a[href="${aysePath}"]`).count()) === 1 && (await anon.locator('#network a[href="/org/northwind-robotics"]').count()) === 1);
  await anon.goto(`${BASE}/org/northwind-robotics`);
  check("company page lists its followers", (await anon.locator('#network a[href="/elif-sahin"]').count()) === 1);

  // ── A company can't be both the parent and a subsidiary of another
  await elif.goto(`${BASE}/org/elif-analytics/edit`);
  for (let i = 0; i < 2; i++) await elif.click('button:has-text("Continue")');
  await visible(elif).getByPlaceholder("e.g. Atlas Holding").fill("Elif Forms Pro");
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Save changes")');
  await elif.waitForURL(`${BASE}/org/elif-analytics`);
  await elif.goto(`${BASE}/org/elif-forms-pro/edit`);
  for (let i = 0; i < 2; i++) await elif.click('button:has-text("Continue")');
  await visible(elif).getByPlaceholder("e.g. Atlas Holding").fill("Elif Analytics");
  await elif.click('button:has-text("Continue")');
  await elif.click('button:has-text("Save changes")');
  await elif.waitForSelector(".notice--error");
  check("circular parent companies are refused", /already listed as part of this company/.test(await elif.locator(".notice--error").innerText()));

  // ── Legal pages (privacy, KVKK, terms, cookies, legal notice)
  for (const path of ["/privacy", "/kvkk", "/terms", "/cookies", "/legal"]) {
    const res = await anon.goto(`${BASE}${path}`);
    check(`legal page ${path}`, res.status() === 200 && (await anon.locator("h1").count()) === 1);
  }

  // ── Mobile layout
  const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await mobile.goto(`${BASE}${aysePath}`);
  check("no horizontal scroll on mobile", !(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));

  if (SHOTS) {
    await anon.goto(`${BASE}/org/northwind-robotics`);
    await anon.screenshot({ path: path.join(SHOTS, "org-funding.png"), fullPage: true });
    await mert.goto(`${BASE}/`);
  }
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("E2E crashed:", e);
  process.exit(1);
});
