# Seeds — idempotent. Safe to run multiple times.
# Usage: bin/rails db:seed
#
# Creates:
#   • Three demo users (one per supported locale, password "ghost123").
#   • A handful of demo whispers anchored to the venues we use for the
#     hackathon demo (Campus Nord, EPSEVG, Plaça Reial, Parc Güell), plus
#     one already-expired note so the active-scope filter is observable
#     from the rails console.
#
# Idempotency strategy: notes are looked up by `(content, latitude,
# longitude)` — a hand-curated natural key. Re-running `db:seed` won't
# duplicate rows, but it also won't *update* attributes (max_views, etc.)
# of an existing match. If you want to refresh a seed: change the content
# string, or `Note.where(...).destroy_all` first.

DEMO_PASSWORD = "ghost123".freeze

USERS = [
  { email: "alice@example.com", language: "en" },
  { email: "ana@example.com",   language: "es" },
  { email: "anna@example.com",  language: "ca" }
].freeze

USERS.each do |attrs|
  user = User.find_or_initialize_by(email: attrs[:email])
  user.assign_attributes(
    language: attrs[:language],
    password: DEMO_PASSWORD,
    password_confirmation: DEMO_PASSWORD,
    onboarded_at: user.onboarded_at || Time.current
  )
  user.save!
end

puts "Seeded #{User.count} users (password: #{DEMO_PASSWORD})."
USERS.each { |u| puts "  - #{u[:email]} (#{u[:language]})" }

# ── Notes ──────────────────────────────────────────────────────────
# Use `find_or_create_by!` keyed on `(content, latitude, longitude)`. The
# block only runs on creation; existing rows keep their current attrs.

NOTES = [
  # Campus Nord (UPC, Barcelona) — the demo venue.
  { content: "The vending machine on B6 still takes coins. The one on A4 doesn't.",
    latitude: 41.3892, longitude: 2.1133,
    author_email: "anna@example.com", language: "en",
    expires_at: 7.days.from_now, max_views: nil },

  { content: "If you've made it this far into the term, you're going to be alright.",
    latitude: 41.3895, longitude: 2.1130,
    author_email: "alice@example.com", language: "en",
    expires_at: nil, max_views: 200 },

  # EPSEVG (Vilanova i la Geltrú).
  { content: "Sit by the window — they bring out the saffron buns at 4.",
    latitude: 41.2238, longitude: 1.7282,
    author_email: "alice@example.com", language: "en",
    expires_at: 4.hours.from_now, max_views: 8 },

  # Plaça Reial.
  { content: "Look up. The lampposts in this square were Gaudí's first commission.",
    latitude: 41.3801, longitude: 2.1749,
    author_email: "ana@example.com", language: "es",
    expires_at: 3.days.from_now, max_views: 100 },

  # Parc Güell.
  { content: "Cap a la cara nord, els bancs miren cap al mar. El millor moment és l'alba.",
    latitude: 41.4145, longitude: 2.1527,
    author_email: "anna@example.com", language: "ca",
    expires_at: 2.days.from_now, max_views: 50 },

  # Already-expired (open the rails console to verify the active scope
  # filters it out — `Note.count` includes it, `Note.active.count` doesn't).
  { content: "Hackathon brunch a les 10. (Ja ha passat.)",
    latitude: 41.3893, longitude: 2.1135,
    author_email: "anna@example.com", language: "ca",
    expires_at: 1.hour.ago, max_views: 50 },

  # ── More Campus Nord whispers ────────────────────────────────────
  # Two notes stacked at the canteen entrance (same coords) so the map
  # cluster/stack rendering has something to chew on.
  # Alice's already-expired note (pairs with her active ones below to
  # exercise the active-scope filter on a single author).
  { content: "The queue is huge today, go around the back.",
    latitude: 41.3890, longitude: 2.1138,
    author_email: "alice@example.com", language: "en",
    expires_at: 6.hours.ago, max_views: nil },

  { content: "The queue is on the left. The other one is for reservations.",
    latitude: 41.3890, longitude: 2.1138,
    author_email: "alice@example.com", language: "en",
    expires_at: 2.days.from_now, max_views: 80 },

  # ~80 m away — treasure hunt with a tight read budget.
  { content: "Treasure: 14 paces towards the fountain. Look low.",
    latitude: 41.3897, longitude: 2.1128,
    author_email: "alice@example.com", language: "en",
    expires_at: 14.days.from_now, max_views: 5 },

  # Single-read poetic note, no time limit — vanishes on the first
  # stranger who reads it.
  { content: "If you're reading this, the bench faces east. Wait for the 7am light.",
    latitude: 41.3888, longitude: 2.1140,
    author_email: "alice@example.com", language: "en",
    expires_at: nil, max_views: 1 },

  # Slightly more distant — long-lived, generous read cap.
  { content: "I've been sitting here thinking about you, I hope this makes you smile.",
    latitude: 41.3886, longitude: 2.1145,
    author_email: "alice@example.com", language: "en",
    expires_at: 30.days.from_now, max_views: 200 },

  # Philosophical reflection in Catalan — on transience, which is kind
  # of the whole point of this app.
  { content: "Tot lloc és nou per a qui s'hi atura. Aquesta pedra ha vist més primaveres que tu i jo, i seguirà aquí quan ningú ens recordi.",
    latitude: 41.3894, longitude: 2.1131,
    author_email: "anna@example.com", language: "ca",
    expires_at: 10.days.from_now, max_views: 40 }
].freeze

NOTES.each do |attrs|
  Note.find_or_create_by!(
    content: attrs[:content],
    latitude: attrs[:latitude],
    longitude: attrs[:longitude]
  ) do |note|
    note.user       = User.find_by!(email: attrs[:author_email])
    note.expires_at = attrs[:expires_at]
    note.max_views  = attrs[:max_views]
    note.language   = attrs[:language]
    note.visibility = :public_note
  end
end

puts "Seeded #{Note.count} notes (#{Note.active.count} currently active)."
