---
name: booking
description: Manage generic slot-based appointment bookings stored in a local JSON file. Use when the user wants to book/reserve a time slot, check availability, list bookings, or cancel a reservation in this project.
version: 0.1.0
---

# Booking

A minimal, self-contained template for managing generic appointment bookings.

## Model

A booking is a **resource** held for a **time slot**, for someone:

- `resource` — what's being booked (a room, a person, a machine…)
- `start` / `end` — ISO-8601 local times, e.g. `2026-06-10T14:00`
- `name` — who the booking is for
- `status` — `confirmed` or `cancelled`

Two confirmed bookings for the **same resource** may not overlap. Overlap means
`start < other.end && end > other.start` (back-to-back slots are fine).

## Storage

All bookings live in `data/bookings.json` (a JSON array). It is created
automatically on first write.

## Runtime

The CLI is a single TypeScript file run directly by **Node v24+**, which strips
types natively — no `npm install`, no build step, no dependencies.

Run all commands from the project root.

## Commands

Create a booking (prints the new id, e.g. `bk_0001`; fails on conflict):

```
node scripts/booking.ts add --resource room-a --start 2026-06-10T14:00 --end 2026-06-10T15:00 --name Alice
```

Check whether a slot is free (prints `AVAILABLE` and exits 0, or `CONFLICT`
with the clashing booking and exits 1):

```
node scripts/booking.ts availability --resource room-a --start 2026-06-10T14:00 --end 2026-06-10T15:00
```

List bookings (hides cancelled by default; filterable):

```
node scripts/booking.ts list
node scripts/booking.ts list --resource room-a
node scripts/booking.ts list --date 2026-06-10
node scripts/booking.ts list --status cancelled
```

Cancel a booking (soft delete — the record is kept with `status: cancelled`,
preserving history):

```
node scripts/booking.ts cancel --id bk_0001
```

## Extending

`scripts/booking.ts` is intentionally small. Common next steps: add fields to the
`Booking` type, enforce business hours in `cmdAdd`, or swap `load`/`save` for a
real database while keeping the command surface unchanged.
