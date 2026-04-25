# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"

# Leaflet 1.9.4 — vendored under vendor/javascript/leaflet.js so we don't
# depend on a CDN. CSS lives at app/assets/stylesheets/leaflet.css and is
# loaded by application.html.erb. Default marker images are NOT shipped:
# we use Leaflet `divIcon`s (see app/javascript/controllers/map_controller.js).
pin "leaflet", to: "leaflet.js"
