#!/usr/bin/env node
// Minimal booking CLI — generic slot-based appointments stored in data/bookings.json.
// Zero dependencies: runs on Node v24+ via built-in TypeScript type stripping.
//   node scripts/booking.ts <command> [--flag value ...]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type Status = "confirmed" | "cancelled";

type Booking = {
  id: string;
  resource: string;
  start: string; // ISO-8601 local, e.g. "2026-06-10T14:00"
  end: string;
  name: string;
  status: Status;
  createdAt: string;
};

const DATA_FILE = join(import.meta.dirname, "..", "data", "bookings.json");

function load(): Booking[] {
  if (!existsSync(DATA_FILE)) return [];
  const raw = readFileSync(DATA_FILE, "utf8").trim();
  return raw ? (JSON.parse(raw) as Booking[]) : [];
}

function save(bookings: Booking[]): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2) + "\n");
}

// Tiny `--flag value` parser. Flags without a following value become `true`.
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

function require(args: Record<string, string>, keys: string[]): void {
  const missing = keys.filter((k) => args[k] === undefined);
  if (missing.length) fail(`missing required flag(s): ${missing.map((k) => "--" + k).join(", ")}`);
}

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

const ms = (iso: string): number => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) fail(`invalid date/time: "${iso}" (expected e.g. 2026-06-10T14:00)`);
  return t;
};

// Two slots overlap when each starts before the other ends.
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return ms(aStart) < ms(bEnd) && ms(aEnd) > ms(bStart);
}

function nextId(bookings: Booking[]): string {
  let max = 0;
  for (const b of bookings) {
    const n = Number(b.id.replace(/^bk_/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `bk_${String(max + 1).padStart(4, "0")}`;
}

function fmt(b: Booking): string {
  return `${b.id}  ${b.status.padEnd(9)}  ${b.resource.padEnd(12)}  ${b.start} → ${b.end}  ${b.name}`;
}

function cmdAdd(args: Record<string, string>): void {
  require(args, ["resource", "start", "end", "name"]);
  if (ms(args.start) >= ms(args.end)) fail("--start must be before --end");

  const bookings = load();
  const clash = bookings.find(
    (b) =>
      b.status === "confirmed" &&
      b.resource === args.resource &&
      overlaps(args.start, args.end, b.start, b.end),
  );
  if (clash) fail(`slot conflicts with ${clash.id} (${clash.start} → ${clash.end})`);

  const booking: Booking = {
    id: nextId(bookings),
    resource: args.resource,
    start: args.start,
    end: args.end,
    name: args.name,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  save(bookings);
  console.log(booking.id);
}

function cmdList(args: Record<string, string>): void {
  let bookings = load();
  if (args.resource) bookings = bookings.filter((b) => b.resource === args.resource);
  if (args.date) bookings = bookings.filter((b) => b.start.startsWith(args.date));
  bookings = bookings.filter((b) =>
    args.status ? b.status === args.status : b.status !== "cancelled",
  );
  if (!bookings.length) {
    console.log("(no bookings)");
    return;
  }
  bookings.sort((a, b) => ms(a.start) - ms(b.start));
  for (const b of bookings) console.log(fmt(b));
}

function cmdAvailability(args: Record<string, string>): void {
  require(args, ["resource", "start", "end"]);
  const bookings = load();
  const clash = bookings.find(
    (b) =>
      b.status === "confirmed" &&
      b.resource === args.resource &&
      overlaps(args.start, args.end, b.start, b.end),
  );
  if (clash) {
    console.log(`CONFLICT  ${fmt(clash)}`);
    process.exit(1);
  }
  console.log("AVAILABLE");
}

function cmdCancel(args: Record<string, string>): void {
  require(args, ["id"]);
  const bookings = load();
  const booking = bookings.find((b) => b.id === args.id);
  if (!booking) fail(`no booking with id ${args.id}`);
  if (booking.status === "cancelled") {
    console.log(`${booking.id} already cancelled`);
    return;
  }
  booking.status = "cancelled";
  save(bookings);
  console.log(`${booking.id} cancelled`);
}

function usage(): void {
  console.log(`booking — minimal slot-based appointment manager

Usage:
  node scripts/booking.ts add          --resource R --start S --end E --name N
  node scripts/booking.ts list         [--resource R] [--date YYYY-MM-DD] [--status confirmed|cancelled]
  node scripts/booking.ts availability --resource R --start S --end E
  node scripts/booking.ts cancel       --id ID

Times are ISO-8601 local strings, e.g. 2026-06-10T14:00`);
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (command) {
    case "add":
      return cmdAdd(args);
    case "list":
      return cmdList(args);
    case "availability":
      return cmdAvailability(args);
    case "cancel":
      return cmdCancel(args);
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return usage();
    default:
      console.error(`error: unknown command "${command}"\n`);
      usage();
      process.exit(1);
  }
}

main();
