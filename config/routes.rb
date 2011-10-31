Movieterminals::Application.routes.draw do
  match '/alien' => 'movieterminals#alien', :as => 'alien'
  match '/alien/reference' => 'references#alien', :as => 'alien_reference'
  match '/tron-alan' => 'movieterminals#tron_alan', :as => 'tron_alan'
  root :to => 'pages#home'
  mount TestTrack::Engine => "test" unless Rails.env.production?
end
