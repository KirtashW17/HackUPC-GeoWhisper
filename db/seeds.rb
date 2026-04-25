# Seeds — idempotent. Safe to run multiple times.
# Usage: bin/rails db:seed
#
# Creates one user per supported locale, all with the same password ("ghost123")
# so they're easy to log in with during demos and manual testing.

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
    password_confirmation: DEMO_PASSWORD
  )
  user.save!
end

puts "Seeded #{User.count} users (password: #{DEMO_PASSWORD})."
USERS.each { |u| puts "  - #{u[:email]} (#{u[:language]})" }

NOTES = [
  {content: "Secret note in Plaça Reial", latitude: 41.3809, longitude: 2.1774},
  {content: "Hidden message in Parc Güell", latitude: 41.4145, longitude: 2.1527},
  {content: "This note expires soon!", latitude: 41.4036, longitude: 2.1744, expires_at: DateTime.current + 1.hour},
]

Note.destroy_all
NOTES.each do |attrs|
  Note.create!(
    content: attrs[:content],
    user: User.find_by(email: USERS.sample[:email]),
    latitude: attrs[:latitude],
    longitude: attrs[:longitude],
    expires_at: attrs[:expires_at]
  )
end