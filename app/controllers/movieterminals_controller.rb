class MovieterminalsController < ApplicationController
  def alien
    @movie_title = 'Alien'
    @movie_script = @movie_style = 'alien'
    render 'alien'
  end

end
