# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**GeoWhisper** is a Rails 7.2 web app for dropping ephemeral, geolocated "ghost notes" that are only visible to users physically near the spot, and which self-destruct after a TTL (`expires_at`) and/or a max view count (`max_views`). Built during HackUPC.

Project docs (start here before changing anything substantial):
- [`doc/inception.md`](doc/inception.md) — product vision, MVP scope, stretch goals.
- [`doc/architecture.md`](doc/architecture.md) — high-level technical architecture.
- [`doc/decisions.md`](doc/decisions.md) — decision log: stack, auth, i18n, model conventions, the **why** behind each choice.
- [`doc/task_planning.md`](doc/task_planning.md) — flat phase list with checkboxes. The **what's left**.
- [`doc/future.md`](doc/future.md) — post-MVP backlog.
- [`doc/next-steps.md`](doc/next-steps.md) — small operational follow-ups.
- [`doc/plans/`](doc/plans/) — detailed plans per sprint.

## Non-negotiable working rules

These are project policy, not preferences. Apply them on every change.

- **TDD is mandatory.** Write a failing MiniTest test first, then the production code. Every feature — models, controllers, jobs, system flows — must be scrupulously covered. Do not submit code without tests.
- **i18n for all user-facing strings.** No hardcoded text in views, controllers, mailers, or flash messages. Use `t("...")` / `I18n.t(...)` with keys in `config/locales/*.yml`. Keep key parity across all locale files. Use the standard `activerecord.errors` / `activemodel.errors` keys for validation messages.
- **RuboCop must pass clean.** The project uses `rubocop-rails-omakase`. Run `bin/rubocop` before considering work done; no new warnings.
- **Brakeman must pass clean.** Run `bin/brakeman` before considering work done; no new alerts.
- **No inline styles.** Do not use `style="..."` attributes in views/partials/components, and do not inject CSS via Stimulus or ERB. All styling goes through the project stylesheet / CSS framework. If a needed style does not exist yet, add it to the stylesheet with a proper class and reuse it.
- **Plan before implementing.** Any non-trivial change (new feature, refactor, multi-file edit) starts with a written plan in `doc/plans/<descriptive_name>.md` that lays out the goal, the steps, the decisions taken and the open questions. Get the plan agreed upon before writing production code. Trivial fixes (typos, single-line bug) are exempt.
- **No Capybara / system tests.** Do not write tests under `test/system/`, do not use `Capybara`, `selenium-webdriver`, `ApplicationSystemTestCase`, `visit`, `click_on`, `fill_in`, or any browser-driven testing tooling. Cover behavior with model tests, controller tests, and integration tests (`ActionDispatch::IntegrationTest`) instead. If a flow seems hard to cover without a browser, narrow it: test the controller boundary, test the JavaScript unit (if any), and verify the rendered HTML structure with `assert_select` — but do not reach for Capybara.

## Common commands

```bash
# Setup
bundle install
bin/rails db:create db:migrate
bin/rails db:seed                       # optional

# Run the app
bin/rails server                        # http://localhost:3000

# Tests (MiniTest — Rails default)
bin/rails test                          # all unit/controller/integration tests
bin/rails test test/models/             # one directory
bin/rails test test/models/note_test.rb # one file
bin/rails test test/models/note_test.rb:42  # one test by line number

# Quality gates
bin/rubocop                             # lint
bin/rubocop -a                          # autocorrect trivial offenses
bin/brakeman                            # static security analysis
```

If gems were installed via `bundle install --path vendor/bundle`, prefix Rails commands with `bundle exec`.

## Architecture notes

- **Stack:** Rails 7.2 + Hotwire (Turbo + Stimulus), SQLite in dev/test (Postgres possible later), Leaflet + OpenStreetMap for the map view (no API key needed), browser Geolocation API for capturing coordinates (note: requires a secure context — works on `localhost`, needs HTTPS elsewhere). SolidQueue / Rails 8 native auth are deferred to a future upgrade — for now auth is hand-rolled with `has_secure_password` and background jobs use Active Job's default backend.
- **Planned domain model** (see `doc/inception.md`): `User`, `Note(content, latitude, longitude, expires_at, max_views, views_count, user_id, visibility)`, later `Friendship` and `NoteShare`.
- **"Nearby notes" query** is expected to use the **Haversine formula in SQL**, combined with an `active` scope filtering `expires_at > now AND views_count < max_views`. Expiration is enforced both at query time *and* by a periodic SolidQueue job that purges dead notes — keep both layers in sync when changing expiration semantics.
- **Geolocation capture** belongs in a Stimulus controller on the client side, not in server code.
- Ruby version is pinned to **3.1.2** via `.ruby-version` (rbenv-friendly).
