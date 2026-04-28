# GeoWhisper — Geolocated, ephemeral Ghost Notes

**GeoWhisper** is a Progressive Web Application (PWA) — installable on mobile devices and designed mobile-first — for leaving digital notes anchored to a physical place. Notes only become visible when other users walk near the spot where they were dropped, and they self-destruct after a certain time or after being read a maximum number of times.

## Context

This project is being developed during **HackUPC** as a prototype for a social network based on geolocation and ephemeral messages. The full idea, mechanics and stretch goals are detailed in [`doc/inception.md`](doc/inception.md).

GeoWhisper lets you:
- **Create notes** anchored to the user's current location (browser lat/lng)
- **Discover nearby notes** within a configurable radius
- **Interactive map view** (Leaflet + OpenStreetMap) with nearby notes and clustering
- **Automatic expiration** by time (`expires_at`) and/or by view count (`max_views`)
- *(future)* Public visibility, friends-only, or single-recipient

---

## Prerequisites

- **Ruby 3.1.2** — managing it with [rbenv](https://github.com/rbenv/rbenv) is recommended
- **Bundler** — Ruby dependency manager
- **SQLite3** — database used in development and test

### Installing Ruby with rbenv

```bash
# Install rbenv (if you don't have it)
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'eval "$(~/.rbenv/bin/rbenv init - bash)"' >> ~/.bashrc
source ~/.bashrc

# Install ruby-build (plugin to install Ruby versions)
git clone https://github.com/rbenv/ruby-build.git "$(rbenv root)"/plugins/ruby-build

# Install the correct version (defined in .ruby-version) and system dependencies
sudo apt update
sudo apt install build-essential ruby-dev libyaml-dev ruby-bundler libsqlite3-dev pkg-config zlib1g-dev
rbenv install 3.1.2
```

Once inside the project directory, `rbenv` will automatically pick version `3.1.2` thanks to the `.ruby-version` file.

---

## Setting up the development environment

```bash
# Clone the repository
git clone https://github.com/<org>/GeoWhisper.git
cd GeoWhisper

# Install dependencies
# Option A — standard install (recommended if you have permissions)
bundle config set --local path ./vendor/bundle
bundle install

# Option B — install in a local directory (useful in shared environments)
bundle install --path vendor/bundle
```

> If you use option B, remember that all Rails commands must be prefixed with `bundle exec`.

```bash
# Create and initialize the database (SQLite)
bin/rails db:create db:migrate

# (Optional) Load seed data
bin/rails db:seed
```

---

## Running the application

In development the recommended way is `bin/dev`, which boots the Rails server and the Tailwind watcher in parallel (defined in `Procfile.dev`):

```bash
bin/dev
```

If you only need the server without the CSS watcher:

```bash
bin/rails server
# or, if you installed gems locally:
bundle exec rails server
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Tailwind CSS

Tailwind is managed via the **`tailwindcss-rails`** gem (no Node, no npm). The compiled CSS lives in `app/assets/builds/tailwind.css`, which is a **build artifact** and is **not checked into the repo** — every dev machine generates it locally and the deploy regenerates it during `assets:precompile`.

After cloning, if you see an error like "tailwind.css does not exist", generate the build:

```bash
# One-shot build
bin/rails tailwindcss:build

# Watch in parallel (recompiles when classes change)
bin/rails tailwindcss:watch
```

`bin/dev` already launches the watcher automatically, so in the normal flow you don't need to invoke them by hand.

> **Note on geolocation:** the browser's Geolocation API requires a *secure context*. It works on `localhost`; when deploying to another host you'll need HTTPS for the browser to deliver coordinates.

---

## Testing the app from a mobile device (HTTPS via tunnel)

The Geolocation API only activates in *secure contexts* (HTTPS). Your browser makes an exception for `localhost` / `127.0.0.1`, **but not for local network IPs** (such as `192.168.x.x`). If you open the dev server from your phone using your LAN IP, the location prompt never appears and the app stays blank. For the demo and any mobile testing we need an **HTTPS tunnel**.

### Recommended flow: `localhost.run` (no account)

You only need an SSH client (preinstalled on macOS/Linux; on Windows use the one from Git Bash or WSL).

1. **Terminal 1 — dev server:**
   ```bash
   bin/dev
   ```

2. **Terminal 2 — tunnel:**
   ```bash
   ssh -R 80:localhost:3000 nokey@localhost.run
   ```

   The first time, it will ask you to accept the host fingerprint (`yes`). Afterwards it prints something like:

   ```
   2c4e7f9a8d.lhr.life tunneled with tls termination, https://2c4e7f9a8d.lhr.life
   ```

3. Open **that `https://...lhr.life` URL** on your phone. The browser will ask for location permission when entering `/map`.

**Notes:**
- The URL **changes** every time you kill and relaunch the tunnel. If the URL stays in an old phone tab after a restart, you have to load the new URL.
- The SSH session can hang after a while of inactivity — `Ctrl+C` and relaunch.
- `*.lhr.life`, `*.ngrok-free.app`, `*.serveo.net` and `*.trycloudflare.com` are already authorized in `config/environments/development.rb` (`config.hosts`).

### Alternative: `ngrok`

```bash
npx ngrok http 3000
```

It asks for a free account the first time (`ngrok config add-authtoken …`). Same idea — it returns a `https://abc-123.ngrok-free.app` URL. If we demo in front of many people and `localhost.run`'s throughput can't keep up, ngrok's free plan usually performs better.

### When you *don't* need the tunnel

- If you test from your laptop/desktop pointing at `http://localhost:3000`, everything works without a tunnel — the browser treats `localhost` as a secure context.
- Automated tests don't call Geolocation (we can't mock `navigator.geolocation` without a real browser), so the tunnel is not relevant for the suite.

---

## Running the tests

The project uses **MiniTest**, Rails' default testing framework.

> **TDD methodology is mandatory:** all features are developed following *Test-Driven Development* (red → green → refactor). Before writing production code there must be a failing test, and every feature — models, controllers, views, jobs and system flows — must be **scrupulously tested**. PRs with uncovered code are not accepted.

```bash
# All tests
bin/rails test

# By directory
bin/rails test test/models/
bin/rails test test/controllers/
bin/rails test test/integration/

# A specific file
bin/rails test test/models/note_test.rb

# A single test by line number (useful for tight iteration)
bin/rails test test/models/note_test.rb:42

# Filter by name (regex on the test name)
bin/rails test test/models/note_test.rb -n /view/
```

> If you installed gems with `bundle install --path vendor/bundle`, remember to prefix commands with `bundle exec` (e.g. `bundle exec bin/rails test`).

The suite runs **in parallel** (one worker per CPU, configured in `test/test_helper.rb`) and automatically loads every fixture in `test/fixtures/*.yml`.

> **No system tests.** The project does **not** use system tests. All coverage goes through model, controller and integration tests (`ActionDispatch::IntegrationTest`).

### Test data: prefer fixtures

When a test needs a persisted record, the idiomatic approach is to use a **fixture** in `test/fixtures/*.yml` rather than building the record inline with `Model.create!`. Fixtures are loaded once per run and keep tests focused on the behavior under test.

```ruby
class NotesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:alice)   # fixture from test/fixtures/users.yml
    sign_in_as(@user)       # helper defined in test/test_helper.rb
  end
end
```

The shared password used by user fixtures is exposed as `ActiveSupport::TestCase::FIXTURE_PASSWORD` for tests that need to authenticate with an email different from the fixture's.

Inline construction (`User.new(...)`, `Note.create!(...)`) is still appropriate when the test specifically exercises the creation/validation path, or when it needs an attribute that no fixture should carry; in that case, keep identifiers (emails, etc.) distinct from those of the fixtures to avoid colliding with uniqueness validation.

---

## Code quality tools

The project requires the use of the following tools. Any change must pass **RuboCop** with no warnings and **Brakeman** with no new alerts before being merged.

```bash
# Ruby/Rails style linting (RuboCop) — mandatory
bin/rubocop

# Autocorrect trivial violations
bin/rubocop -a

# Static security analysis (Brakeman) — mandatory
bin/brakeman
```

---

## Code documentation (YARD)

Every public function, class and module must be documented with **[YARD](https://yardoc.org/)**. It is **mandatory**:

- Every public definition (methods, classes, modules) carries a docstring with:
  - A one-line summary.
  - One `@param` tag per argument, with type and description.
  - A `@return` tag with type and description.
  - `@example` when the call site isn't obvious.
- `private` methods may skip the docstring if the name and signature are self-explanatory.
- When you touch existing undocumented code, **add YARD** as part of the change.

Minimal example:

```ruby
# Returns the canonical post-login redirect URL for the current user.
#
# @return [String] welcome URL when the user has not completed onboarding,
#   otherwise the map URL.
def post_authentication_url
  return welcome_url unless Current.user&.onboarded_at
  map_url
end
```

To generate the HTML documentation locally:

```bash
gem install yard          # first time
yardoc 'app/**/*.rb'      # generates ./doc/yard
```

---

## Internationalization (i18n)

GeoWhisper uses Rails' **i18n internationalization** system for every user-visible string. It is **mandatory**:

- **Do not hardcode strings** in views, controllers, mailers or flash messages. All text must go through `t("translation.key")` or `I18n.t(...)`.
- Define keys in the files under `config/locales/` (`es.yml`, `en.yml`, ...) following the resource hierarchy (`notes.create.success`, etc.).
- Maintain **key parity** across all supported languages; a new key in `es.yml` must also be added to the rest of the locales.
- Model validation messages must use the standard `activerecord.errors` / `activemodel.errors` keys.

---

## Project structure

```
app/
  controllers/    # HTTP request logic
  models/         # ActiveRecord models (User, Note, ...)
  views/          # ERB templates
  javascript/     # Stimulus controllers (geolocation, map, ...)
config/
  routes.rb       # RESTful route definitions
db/
  migrate/        # Database migrations
doc/
  inception.md    # Project vision, MVP and stretch goals
test/             # MiniTest tests
```

---

## Tech stack

- **Ruby on Rails 7.2** + Hotwire/Turbo + Stimulus
- **SQLite** as the database (development, test and MVP)
- **Tailwind CSS** via `tailwindcss-rails` (standalone binary, no Node)
- **Active Job** (default backend) for background jobs such as purging expired notes
- **Leaflet + OpenStreetMap** for the map view (no API key)
- Browser **Geolocation API** to capture coordinates
- **Progressive Web App (PWA)** — installable on mobile devices (Android/iOS) with a web manifest and service worker, so users can add GeoWhisper to their home screen and use it like a native app
