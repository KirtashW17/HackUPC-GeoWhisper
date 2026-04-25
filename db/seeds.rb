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
