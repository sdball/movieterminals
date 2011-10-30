//= require prototypal_inheritance
//= require jquery.min-1.4.2
//= require jquery.hotkeys-0.7.9
//= require cli
//= require_self

var alanone = Object.create(TerminalShell);
Terminal.config.prompt = "\n$ ";
Terminal.config.unrecognized = "UNABLE TO PARSE INPUT.";
Terminal.config.typingSpeed = 60;
Terminal.config.spinnerCharacters = [];
Terminal.config.name = 'tron-alan';
Terminal.config.fg_color = '#98d9f7';
Terminal.config.cursor_blink_time = 500;
Terminal.output = alanone;

Terminal.setCursorState = function() {
  $('#cursor').css({color:this.config.bg_color, backgroundColor:this.config.fg_color});
};

alanone.terminal = Terminal;
alanone.commands['service'] = function() {
  var cmd_args = Array.prototype.slice.call(arguments);
  cmd_args.shift();
  switch (cmd_args[0]) {
    case 'start':
      if (cmd_args[1]) {
        alanone.start_service(cmd_args[1]);
      } else {
        alanone.terminal.print('USAGE: SERVICE START COMMAND');
        alanone.terminal.print("My new control system isn't a mind reader. -Roy");
      }
      break;
    case 'stop':
      break;
  }
}
alanone.start_service = function(service) {
  switch (service) {
    case 'tron':
      alanone.terminal.print('ADDRESS FILE EMPTY');
      alanone.terminal.print('TRON PROGRAM UNAVAILABLE');
      break;
    default:
      alanone.terminal.print('SERVICE "' + service + '" NOT REGISTERED');
  }
}

$(document).ready(function() {
  Terminal.promptActive = false;
  $('#screen').bind('cli-load', function(e) {
    Terminal.runCommand("service start tron");
  });
});
