class MovieterminalsController < ApplicationController
  def home
  end

  def alien
    @movie_title = 'Alien'
    @movie_script = @movie_style = 'alien'
    render 'alien'
  end

end
