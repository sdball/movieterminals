Movieterminals::Application.routes.draw do
  match '/alien' => 'movieterminals#alien', :as => 'alien'
  match '/alien/reference' => 'references#alien', :as => 'alien_reference'

  match '/tron-alan' => 'movieterminals#tron_alan', :as => 'tron_alan'
  match '/tron-alan/reference' => 'references#tron_alan', :as => 'tron_alan_reference'
  root :to => 'pages#home'
  mount TestTrack::Engine => "test" unless Rails.env.production?
end
