class MovieterminalsController < ApplicationController
  layout 'terminal'

  def alien
    @head_title = 'Alien'
    @movie_script = @movie_style = 'alien'
    render 'alien'
  end

end
