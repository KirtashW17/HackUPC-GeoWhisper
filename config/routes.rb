Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  # Authentication
  resource :registration, only: %i[new create]
  resource :session,      only: %i[new create destroy]
  resource :locale,       only: :update

  get  "/welcome", to: "welcome#show",     as: :welcome
  post "/welcome", to: "welcome#complete", as: :complete_onboarding
  get  "/map",     to: "map#show",         as: :map
  get  "/yourself", to: "yourself#show",   as: :yourself

  # Notes — JSON nearby feed for the map and the compose/detail surface.
  # See doc/plans/phase_2_map_and_compose.md.
  get  "/notes/nearby", to: "notes#nearby", as: :nearby_notes, defaults: { format: :json }
  resources :notes, only: %i[new create show destroy]

  root "sessions#new"
end
