//= require jquery.min-1.4.2
//= require jquery.hotkeys-0.7.9
//= require cli
//= require_self

function getRandomInt(min, max) {
	// via https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Math/random#Examples
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
	return items[getRandomInt(0, items.length-1)];
}

function oneLiner(terminal, msg, msgmap) {
  if (msgmap.hasOwnProperty(msg)) {
    terminal.print('');
    terminal.print(msgmap[msg]);
    return true;
  } else {
    return false;
  }
}

// No peeking!
TerminalShell.commands['help'] = TerminalShell.commands['halp'] = function(terminal) {
  terminal.print('');
  terminal.print('NOSTROMO INTERFACE 2037');
  terminal.print('COPYRIGHT WEYLAND-YUTANI CORPORATION');
};

TerminalShell.commands['emergency'] = function(terminal) {
  var cmd_args = Array.prototype.slice.call(arguments);
  cmd_args.shift(); // terminal
  var full = cmd_args.join(' ');
  console.log(full);
  if (full == 'command override 100375') {
    script.command_override = true;
  } else {
    if (full == 'command override') {
      terminal.print('');
      terminal.print('MISSING OVERRIDE ACCESS CODE');
    } else {
      var regex = /command override \d+/;
      if (regex.test(full)) {
        terminal.print('');
        terminal.print('INVALID COMMAND OVERRIDE ACCESS');
        terminal.print($('<ins>').text('SESSION LOGGED'));
        terminal.print('ACCESS LOCKED');
        $('#inputline').remove();
      } else {
        unrecognized_command(terminal);
      }
    }
  }
}

function ship_status(terminal) {
  terminal.print('');
  terminal.print('INPUTF         POWER/12492.2                 SHIP:');
  terminal.print('                                             WEYLAN YUTANI');
  terminal.print('ACTUAL TIME:   3 JUN                         NOSTROMO 180245');
  terminal.print('FLIGHT TIME:   5 NOV');
  terminal.print('');
  terminal.print('###########################################  FUNCTION:');
  terminal.print('#     I ==I                  -II -        #  TANKER/REFINERY');
  terminal.print('#               I=.-.----                 #');
  terminal.print('#  -I.              -II=-                 #  CAPACITY:');
  terminal.print('#                                . .-.    #  200 000 000 TONNES');
  terminal.print('#                  #+*$..  I              #');
  terminal.print('#             . I  -                      #  GALACTIC POSITION:');
  terminal.print('#        .II I                            #  270%Rx883\'P');
  terminal.print('#                               .- -I     #');
  terminal.print('#                                   II .I #  VELOCITY STATUS:');
  terminal.print('###########################################  59.09% SOL');
}

function address_matrix(terminal) {
  terminal.print('OVERMONITORING ADDRESS MATRIX');
  terminal.print('');
  terminal.print('CRFX         OM2077AM     LALLIGNMENT    SM2093');
  terminal.print('ATTITUDE     SM2078       PHOTO F        SM2094');
  terminal.print('WASTE HEAT   2080         MAINS');
  terminal.print('RAD          2081         IUA            SM2096');
  terminal.print('VENT         2082AM       2LA            SM2097');
  terminal.print('NAVIGATION   M2083        3RA            SM2098');
  terminal.print('TIME         M2084        4LHA           SM2099');
  terminal.print('GAL POS                   GRAY GRIDS');
  terminal.print('COMMAND      20865C       INERTIAL DAMP  3002AM');
  $('#display').append('<p><span class="selection_option">INTERFACE    2037</span>         DECK A         A3003</p>');
  terminal.print('ATTN         2087SC       DECK B         A3004');
  terminal.print('ALERT        2088SC       DECK C         A3005');
  terminal.print('MATRIAL      2090         LIFE SUPPORT');
  terminal.print('OVERLOCK     M2091        0%             M3003AM');
}

var evaluate_procedures = function(terminal) {
  script.procedures_evaluated = true
  terminal.setWorking(true);
  window.setTimeout(function() {
    terminal.setWorking(false);
    terminal.print('UNABLE TO COMPUTE');
    terminal.print($('<ins>').text('AVAILABLE DATA INSUFFICIENT'));
  }, 1000);
}

var request_options = function(terminal) {
  if (script.procedures_evaluated) {
    terminal.setWorking(true);
    window.setTimeout(function() {
      terminal.setWorking(false);
      terminal.print('UNABLE TO COMPUTE');
      terminal.print($('<ins>').text('AVAILABLE DATA INSUFFICIENT'));
    }, 1000);
  } else {
    terminal.print('UNABLE TO COMPUTE');
    terminal.print($('<ins>').text('PARAMETERS UNDEFINED'));
  }
}

var my_chances = function(terminal) {
  if (script.procedures_evaluated) {
    terminal.print($('<ins>').text('DOES NOT COMPUTE'));
  } else {
    terminal.print('UNABLE TO COMPUTE');
    terminal.print($('<ins>').text('PARAMETERS UNDEFINED'));
  }
}

var request_science_clarification = function(terminal) {
  script.clarification_requested = true;
  terminal.print($('<ins>').text('UNABLE TO CLARIFY'));
}

var request_enhancement = function(terminal) {
  if (script.clarification_requested) {
    terminal.setWorking(true);
    window.setTimeout(function() {
      terminal.print('NO FURTHER ENHANCEMENT')
      window.setTimeout(function() {
        terminal.setWorking(false);
        terminal.print('');
         terminal.print('SPECIAL ORDER 937');
         terminal.print('');
         terminal.print($('<ins>').text('SCIENCE OFFICER EYES ONLY'));
      }, 1500)
    }, 1000)
  } else {
    unable_to_compute(terminal);
  }
}

var special_order_937 = function(terminal) {
  if (script.command_override) {
    terminal.print('NOSTROMO REROUTED TO NEW CO-ORDINATES.');
    terminal.print('');
    terminal.print('INVESTIGATE LIFE FORM. GATHER SPECIMEN.');
    terminal.print('');
    terminal.print('PRIORITY ONE');
    terminal.print('');
    terminal.print('ENSURE RETURN OF ORGANISM FOR ANALYSIS.');
    terminal.print('');
    terminal.print('ALL OTHER CONSIDERATIONS SECONDARY.');
    terminal.print('');
    terminal.print('CREW EXPENDABLE.');
  } else {
    terminal.print($('<ins>').text('SCIENCE OFFICER EYES ONLY'));
  }
}

var the_story = function(terminal) {
  terminal.print('NOSTROMO REROUTED TO NEW CO-ORDINATES.');
  terminal.print('');
  terminal.print('INVESTIGATE LIFE FORM. GATHER SPECIMEN.');
}

var unable_to_compute = function(terminal) {
  terminal.print('UNABLE TO COMPUTE');
  terminal.print($('<ins>').text('PARAMETERS UNDEFINED'));
}

var unrecognized_command = function(terminal) {
  terminal.print('COULD NOT PARSE COMMAND');
}

var script = {
  procedures_evaluated: false,
  clarification_requested: false,
  command_override: false,
  commands: {
    "what's the story mother?": the_story,
    "request evaluation of current procedures to terminate alien": evaluate_procedures,
    "can we kill the alien?": evaluate_procedures,
    "request options for possible procedure": request_options,
    "what are my chances?": my_chances,
    "request clarification on science inability to neutralize alien": request_science_clarification,
    "request enhancement": request_enhancement,
    "what is special order 937 ?": special_order_937,
    "what is special order 937?": special_order_937
  }
}

var oneliners = {
  'ship registration': 'NOSTROMO 182246',
  'ship name': 'NOSTROMO 182246'
};

var script_line = function (terminal, command) {
  if (command in script.commands) {
    script.commands[command](terminal);
    return true;
  } else {
    return false;
  }
}

TerminalShell.fallback = function(terminal, cmd) {
  cmd = cmd.toLowerCase();
  if (script_line(terminal, cmd)) {
    return true;
  } else if (oneLiner(terminal, cmd, oneliners)) {
    return true;
  } else {
    if ("ship status" == cmd) {
      ship_status(terminal);
      return true;
    }
    return false;
  }
};

Terminal.config.prompt = "\nINTERFACE 2037 READY FOR INQUIRY\n\n> ";
Terminal.config.unrecognized = "UNPARSED INPUT";
Terminal.config.typingSpeed = 80;
Terminal.config.spinnerCharacters = [];

$(document).ready(function() {
	Terminal.promptActive = false;
	$('#screen').bind('cli-load', function(e) {
    address_matrix(Terminal);
    Terminal.runCommand("WHAT'S THE STORY MOTHER?");
	});
});
