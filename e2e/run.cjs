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
  for (let i = 0; i < 20; i++) {
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

async function signup(browser, name, email) {
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
  await page.goto(await emailLink(email, "verify-email"));
  await page.click('button:has-text("Confirm email address")');
  await page.waitForURL(/done=1/);
  return page;
}

async function createProfile(p, { occupation, summary, org, role }) {
  await p.goto(`${BASE}/create`);
  await p.click("text=Person Profile");
  await p.click('button:has-text("Continue")');
  await p.setInputFiles("input[name=image]", photo("blue"));
  await p.fill("#occupation", occupation);
  await p.fill("#summary", summary);
  await p.fill("#tags", "Engineer, Robotics");
  await p.fill("#sector", "Robotics & Automation");
  await p.click('button:has-text("Continue")');
  await p.click('button:has-text("Add position")');
  const item = p.locator(".repeat-item").first();
  await item.locator("input").nth(0).fill(org);
  await item.locator("input").nth(1).fill(role);
  await item.locator("input").nth(2).fill("2019");
  await item.locator("input[type=checkbox]").check();
  await p.fill("#body", `${summary}\n\n## Projects\n\n- WarehouseOS`);
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

  // ── Admin + CSV import
  const admin = await signup(browser, "Portfedia Admin", "admin@example.com");
  await admin.goto(`${BASE}/admin?section=import`);
  await admin.fill(
    "#csv",
    'name,type,sector,founded,headquarters,employees,website,summary,tags\nNorthwind Robotics,company,Robotics & Automation,2015,"Istanbul, Türkiye",201–500,https://northwind.example,Autonomous warehouse robots,Robotics;Logistics\nBluefin Bank,company,Banking,1990,Izmir,"1,001–5,000",https://bluefin.example,A retail bank,Banking',
  );
  await admin.click('button:has-text("Import companies")');
  await admin.waitForSelector(".notice--ok");
  check("CSV import", /2<\/b> created|2 created/.test(await admin.locator(".notice--ok").innerHTML()), await admin.locator(".notice--ok").innerText());

  // ── Ayşe applies
  const ayse = await signup(browser, "Ayşe Demir", "ayse@example.com");
  const aysePath = await createProfile(ayse, { occupation: "Robotics Engineer", summary: "Robotics engineer and CTO of [[Northwind Robotics]].", org: "Northwind Robotics", role: "CTO" });
  check("profile submitted for review", aysePath === "/ayse-demir" && (await ayse.locator(".review-banner").count()) === 1);
  check("uploaded photo is resized to WebP", /\.webp$/.test((await ayse.locator(".p-photo img").getAttribute("src")) || ""));
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
  await mert.click('button:has-text("Continue")');
  await mert.click('button:has-text("Save changes")');
  await mert.waitForURL(`${BASE}/org/northwind-robotics`);
  check("funding table with linked investor", (await mert.locator('#funding a[href="/ayse-demir"]').count()) === 1);
  await anon.goto(`${BASE}${aysePath}`);
  check("investor page lists the investment", (await anon.locator('#investments a[href="/org/northwind-robotics"]').count()) === 1);

  // ── Community page: website lock, vandalism and restore
  await ayse.goto(`${BASE}/org/bluefin-bank/edit`);
  check("website is locked for community editors", await ayse.locator("#website").isDisabled());
  await ayse.fill("#summary", "VANDALISED");
  await ayse.click('button:has-text("Continue")');
  await ayse.click('button:has-text("Continue")');
  await ayse.click('button:has-text("Save changes")');
  await ayse.waitForURL(`${BASE}/org/bluefin-bank`);
  await admin.goto(`${BASE}/org/bluefin-bank/history`);
  await admin.locator(".history li a").nth(1).click(); // the import revision
  await admin.waitForURL(/history\/[a-f0-9]{24}/);
  check("revision diff page", (await admin.locator("text=Restore this version").count()) === 1);
  await admin.click('button:has-text("Restore this version")');
  await admin.waitForURL(/history\?restored=1/);
  await anon.goto(`${BASE}/org/bluefin-bank`);
  check("restored previous version", (await anon.locator("text=VANDALISED").count()) === 0 && (await anon.locator("text=A retail bank").count()) > 0);

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
  await anon.waitForTimeout(2700);
  await anon.click('button:has-text("Send report")');
  await anon.waitForSelector(".notice--ok");
  await admin.goto(`${BASE}/admin?section=reports`);
  check("report reaches the admin", (await admin.locator("text=This profile contains a wrong job title.").count()) === 1);
  await admin.click('button:has-text("Dismiss")');
  await admin.locator("text=No open reports.").waitFor();

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
