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

// calculate date with elapsing time
alanone.initial_epochtime = new Date().getTime();
alanone.in_universe_epochtime = new Date(1982, 06, 07, 11, 12, 43).getTime();
alanone.commands['date'] = function() {
  var elapsed_epochtime = new Date().getTime() - alanone.initial_epochtime;
  var universe_date = new Date(alanone.in_universe_epochtime + elapsed_epochtime);
  alanone.terminal.print(alanone.timestamp(universe_date));
}

// convert a date object to an EST timestamp
// can't just use toLocaleString here since I want all users to get the same experience
// Wed Jul 07 1982 11:12:43 GMT-0400 (EDT)
alanone.timestamp = function(date) {
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var timestamp = [];
  timestamp.push(days[date.getUTCDay()]);
  timestamp.push(months[date.getUTCMonth()]);
  timestamp.push(alanone.leading_zero(date.getUTCDate()));
  timestamp.push(date.getUTCFullYear());
  var hours = alanone.leading_zero(date.getUTCHours() - 4);
  var minutes = alanone.leading_zero(date.getUTCMinutes());
  var seconds = alanone.leading_zero(date.getUTCSeconds());
  timestamp.push(hours + ':' + minutes + ':' + seconds);
  timestamp.push('GMT-0400 (EDT)');
  return timestamp.join(' ');
}

alanone.leading_zero = function(number) {
  if (number <= 9) {
    return ['0', number].join('');
  } else {
    return number;
  }
}

$(document).ready(function() {
  Terminal.promptActive = false;
  $('#screen').bind('cli-load', function(e) {
    Terminal.runCommand("service start tron");
  });
});
