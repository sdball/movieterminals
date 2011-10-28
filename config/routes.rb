Movieterminals::Application.routes.draw do
  match '/alien' => 'movieterminals#alien', :as => 'alien'
  match '/alien/reference' => 'references#alien', :as => 'alien_reference'
  root :to => 'pages#home'
  mount TestTrack::Engine => "test" unless Rails.env.production?
end
