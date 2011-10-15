Movieterminals::Application.routes.draw do
  match '/alien' => 'movieterminals#alien'
  root :to => 'movieterminals#home'
end
