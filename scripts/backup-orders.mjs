#!/usr/bin/env node
// Daily orders backup: downloads every order from Supabase and saves it as one CSV.
//
//   ~/PSGamingHub-Backups/orders.csv               every order, newest file (opens in Excel / Sheets)
//   ~/PSGamingHub-Backups/daily/orders-DATE.csv    a dated copy per day, the last 30 kept
//
// Reads SUPABASE_URL and SUPABASE_SECRET_KEY from ~/.psgaminghub-backup/.env (see install-backup.sh).
// No npm packages needed: plain Node 18+.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_FILE = join(homedir(), ".psgaminghub-backup", ".env");
const OUT_DIR = join(homedir(), "PSGamingHub-Backups");
const DAILY_DIR = join(OUT_DIR, "daily");
const KEEP_DAYS = 30;
const PAGE = 1000; // Supabase returns at most 1000 rows per request

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function readConfig() {
  if (!existsSync(CONFIG_FILE)) throw new Error(`Config not found: ${CONFIG_FILE}. Run scripts/install-backup.sh first.`);
  const env = {};
  for (const line of readFileSync(CONFIG_FILE, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\s+/g, "");
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY.includes("PASTE")) {
    throw new Error(`Set SUPABASE_URL and SUPABASE_SECRET_KEY in ${CONFIG_FILE}`);
  }
  return env;
}

async function fetchOrders({ SUPABASE_URL, SUPABASE_SECRET_KEY }) {
  const select = "*,order_items(title,platform,slot,unit_price,quantity,rent_ends_at)";
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=${encodeURIComponent(select)}&order=created_at.asc`, {
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    // Never echo the response headers or the key; the status and body are enough to debug.
    if (!res.ok) throw new Error(`Supabase returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

// India time, e.g. "05/11/2026, 19:08" — Excel and Sheets read it as a date.
function ist(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cell(v) {
  let s = v == null ? "" : String(v);
  // Customer-typed text starting with = + - @ could run as a formula in Excel; make it plain text.
  if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = [
  ["Order", (o) => o.order_number],
  ["Placed (IST)", (o) => ist(o.created_at)],
  ["Status", (o) => o.status],
  ["Customer", (o) => o.customer_name],
  ["Email", (o) => o.email],
  ["WhatsApp", (o) => o.whatsapp],
  ["Delivery name", (o) => o.delivery_name],
  ["Delivery phone", (o) => o.delivery_phone],
  ["Items", (o) => (o.order_items ?? []).map((i) => `${i.title} (${i.platform} ${i.slot})${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join("; ")],
  ["Subtotal", (o) => Number(o.subtotal)],
  ["Discount", (o) => Number(o.discount)],
  ["Total", (o) => Number(o.total)],
  ["UTR", (o) => o.utr],
  ["Payment submitted (IST)", (o) => ist(o.payment_submitted_at)],
  ["Verified (IST)", (o) => ist(o.verified_at)],
  ["Delivered (IST)", (o) => ist(o.delivered_at)],
  ["Rent ends (IST)", (o) => (o.order_items ?? []).filter((i) => i.rent_ends_at).map((i) => ist(i.rent_ends_at)).join("; ")],
  ["Customer notes", (o) => o.notes],
  ["Admin note", (o) => o.admin_note],
];

function toCsv(orders) {
  const lines = [COLUMNS.map(([h]) => cell(h)).join(",")];
  for (const o of orders) lines.push(COLUMNS.map(([, f]) => cell(f(o))).join(","));
  // BOM so Excel reads the file as UTF-8 and shows names like "Yōtei" correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function countRows(file) {
  if (!existsSync(file)) return 0;
  return Math.max(0, readFileSync(file, "utf8").split("\r\n").filter(Boolean).length - 1);
}

async function main() {
  const config = readConfig();
  mkdirSync(DAILY_DIR, { recursive: true });

  const orders = await fetchOrders(config);
  const csv = toCsv(orders);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD

  // Dated copy every day, so a bad day never overwrites the only good backup.
  writeFileSync(join(DAILY_DIR, `orders-${today}.csv`), csv);

  // If orders vanished since the last backup (e.g. deleted by mistake), keep the old orders.csv
  // and only write the dated copy, so the main file still has them.
  const main = join(OUT_DIR, "orders.csv");
  const before = countRows(main);
  if (orders.length < before) {
    log(`WARNING: ${orders.length} orders now vs ${before} in the last backup. Kept the old orders.csv; today's copy is in daily/.`);
  } else {
    writeFileSync(main + ".tmp", csv);
    renameSync(main + ".tmp", main);
  }

  // Keep the last KEEP_DAYS dated copies.
  const daily = readdirSync(DAILY_DIR).filter((f) => /^orders-\d{4}-\d{2}-\d{2}\.csv$/.test(f)).sort();
  for (const f of daily.slice(0, Math.max(0, daily.length - KEEP_DAYS))) unlinkSync(join(DAILY_DIR, f));

  log(`Saved ${orders.length} orders to ${main}`);
}

main().catch((e) => {
  log(`FAILED: ${e.message}`);
  process.exit(1);
});
