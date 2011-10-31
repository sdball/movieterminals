class MovieterminalsController < ApplicationController
  layout 'terminal'

  def alien
    @head_title = 'Alien'
    @movie_script = @movie_style = 'alien'
    render 'alien'
  end

  def tron_alan
    @head_title = "Alan's Terminal in TRON"
    @movie_script = @movie_style = 'tron-alan'
    render 'tron_alan'
  end

end
