# Booking — minimal template

A tiny, dependency-free template for managing generic slot-based appointment
bookings. A booking is a **resource** held for a **time slot** (`start`/`end`)
for a **name**, persisted to a local JSON file.

## Requirements

Node **v24+** (runs `.ts` files natively via built-in type stripping — no
`npm install`, no build step).

## Layout

```
.
├── skill.md            # skill definition + usage for Claude
├── README.md           # this file
├── tsconfig.json       # editor/type-check support (not needed to run)
├── scripts/
│   └── booking.ts      # the CLI
└── data/
    └── bookings.json   # storage (a JSON array)
```

## Usage

Run from the project root:

```sh
# Create a booking (prints the new id, e.g. bk_0001)
node scripts/booking.ts add --resource room-a --start 2026-06-10T14:00 --end 2026-06-10T15:00 --name Alice

# Is a slot free? (AVAILABLE -> exit 0, CONFLICT -> exit 1)
node scripts/booking.ts availability --resource room-a --start 2026-06-10T14:00 --end 2026-06-10T15:00

# List bookings (hides cancelled by default)
node scripts/booking.ts list --date 2026-06-10

# Cancel (soft delete — kept with status: cancelled)
node scripts/booking.ts cancel --id bk_0001
```

Times are ISO-8601 local strings (`YYYY-MM-DDTHH:MM`). Two confirmed bookings for
the same resource may not overlap.
