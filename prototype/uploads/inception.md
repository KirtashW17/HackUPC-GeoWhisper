# GeoWhisper — Inception

## Concept

**GeoWhisper** (a.k.a. *Ghost Notes*) is a location-aware app for leaving
ephemeral digital notes tied to a place. A note only becomes visible to other
users when they are physically near the spot where it was dropped, and it
disappears once it has been read enough times or after a given amount of time.

The app sits at the intersection of three ideas:

- **Social network** — users create and discover content from others.
- **Geolocation** — content is anchored to coordinates in the real world.
- **Ephemerality** — notes are short-lived by design, which encourages
  spontaneity and presence over permanence.

## Why it's interesting

Most social platforms reward content that lives forever and travels globally.
GeoWhisper does the opposite: messages are bound to a place and a moment.
This creates new use cases:

- Leaving a tip for whoever sits at this café next.
- Dropping a memory at a meaningful spot for a friend to find later.
- A treasure-hunt style game where notes hint at the next location.
- Anonymous local micro-communication ("the queue is huge today, go around the back").

## Core mechanics

1. **Drop a note** at your current location (lat/lng captured from the browser).
2. **Discover notes nearby** within a configurable radius.
3. **Notes self-destruct** based on:
   - A time-to-live (`expires_at`), and/or
   - A maximum view count (`max_views`).
4. Once destroyed, a note is gone — no archive, no feed history.

## MVP scope (hackathon)

The minimum demo-able product:

- Create a note with text + current geolocation.
- List notes within X meters of the user.
- Expire notes by timestamp and/or view count.
- Responsive UI that works on mobile (since the use case is inherently mobile).

## Stretch goals

- **Authentication & friends** — add a friendship graph so a note can be
  targeted at a specific friend instead of being public.
- **Visibility modes** — public, friends-only, single-recipient.
- **Map view** — show nearby notes on an interactive map (Leaflet).
- **Media notes** — images or short audio clips ("whispers"), not just text.
- **Reactions** — lightweight, also ephemeral.
- **Geofenced events** — notes that only unlock during a time window
  (e.g. only readable between 20:00 and 22:00).

## Technical sketch

- **Stack:** Ruby on Rails 8 (already scaffolded), Hotwire/Turbo, Stimulus,
  SolidQueue for background jobs, SQLite/Postgres.
- **Models:** `User`, `Note(content, latitude, longitude, expires_at,
  max_views, views_count, user_id, visibility)`, later `Friendship` and
  `NoteShare`.
- **Nearby query:** Haversine formula in SQL, filtered by an `active` scope
  (`expires_at > now AND views_count < max_views`).
- **Geolocation:** browser Geolocation API, captured via a Stimulus controller.
- **Map:** Leaflet + OpenStreetMap tiles (no API key required).
- **Expiration:** filter at query time + a periodic job that purges dead notes.

## Differentiators

- **Place + time as a filter**, not just a tag.
- **Disappearing by design** — content is meant to be missed if you weren't
  there.
- **Low-friction creation** — drop a note in two taps.
