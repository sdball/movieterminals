//= require prototypal_inheritance
//= require jquery.min-1.4.2
//= require jquery.hotkeys-0.7.9
//= require cli
//= require_self

var alanone = Object.create(TerminalShell);
Terminal.config.prompt = "\n> ";
Terminal.config.unrecognized = "UNABLE TO PARSE INPUT.";
Terminal.config.typingSpeed = 80;
Terminal.config.spinnerCharacters = [];
Terminal.config.name = 'tron-alan';
Terminal.output = alanone;

alanone.address_file_empty = function(terminal) {
  terminal.print('ADDRESS FILE EMPTY');
  terminal.print('TRON PROGRAM UNAVAILABLE');
}

$(document).ready(function() {
  Terminal.promptActive = false;
  $('#screen').bind('cli-load', function(e) {
    alanone.address_file_empty(Terminal);
    Terminal.promptActive = true;
  });
});
