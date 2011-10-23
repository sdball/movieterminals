//= require prototypal_inheritance
//= require jquery.min-1.4.2
//= require jquery.hotkeys-0.7.9
//= require cli
//= require_self

var muthur = Object.create(TerminalShell);
Terminal.config.prompt = "\nINTERFACE 2037 READY FOR INQUIRY\n\n";
Terminal.config.unrecognized = "UNABLE TO PARSE INPUT.";
Terminal.config.typingSpeed = 80;
Terminal.config.spinnerCharacters = [];
Terminal.output = muthur;
// modify how Terminal processes input to better recreate the muthur interface
Terminal.processInputBuffer = function(cmd) {
  $('#display').html('');
  var cmd = trim(this.buffer);
  this.clearInputBuffer();
  if (cmd.length == 0) {
    return false;
  }
  this.addHistory(cmd);
  if (this.output) {
    return this.output.process(this, cmd);
  } else {
    return false;
  }
}
muthur.terminal = Terminal;

muthur.randomInt = function(min, max) {
  min = min || 0;
  max = max || 9;
  // via https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Math/random#Examples
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
muthur.randomChoice = function(items) {
  return items[this.randomInt(0, items.length-1)];
}
muthur.oneLiner = function(terminal, msg) {
  if (this.oneliners.hasOwnProperty(msg)) {
    terminal.print('');
    terminal.print(this.oneliners[msg]);
    terminal.print('');
    terminal.print('');
    return true;
  } else {
    return false;
  }
}
muthur.commands['help'] = function(terminal) {
  terminal.print('');
  terminal.print('NOSTROMO INTERFACE 2037');
  terminal.print('WEYLAND-YUTANI HUMAN INTERFACE LABS');
  terminal.print('');
  terminal.print('');
}
muthur.commands['emergency'] = function(terminal) {
  var cmd_args = Array.prototype.slice.call(arguments);
  cmd_args.shift(); // terminal
  var full = cmd_args.join(' ');
  if (full == 'command override 100375' || full == 'command overide 100375') {
    muthur.script.command_override = true;
  } else {
    if (full == 'command override' || full == 'command overide') {
      terminal.print('');
      terminal.print('MISSING OVERRIDE ACCESS CODE');
      terminal.print('');
      terminal.print('');
    } else {
      var regex = /command overr?ide \d+/;
      if (regex.test(full)) {
        terminal.print('');
        terminal.print('INVALID COMMAND OVERRIDE ACCESS');
        terminal.print($('<ins>').text('SESSION LOGGED'));
        terminal.print('ACCESS LOCKED');
        terminal.print('');
        terminal.print('');
        $('#bottomline').fadeOut('fast', function() {
          $('#display').fadeOut('slow');
        });
      } else {
        muthur.unrecognized_command(terminal);
      }
    }
  }
}

muthur.ship_status = function(terminal) {
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
  terminal.print('');
  terminal.print('');
}

muthur.address_matrix = function(terminal) {
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
  terminal.print('');
  terminal.print('');
}

muthur.evaluate_procedures = function(terminal) {
  muthur.script.procedures_evaluated = true
  terminal.print('UNABLE TO COMPUTE');
  terminal.print($('<ins>').text('AVAILABLE DATA INSUFFICIENT'));
  terminal.print('');
  terminal.print('');
}

muthur.request_options = function(terminal) {
  if (muthur.script.procedures_evaluated) {
    terminal.setWorking(true);
    window.setTimeout(function() {
      terminal.setWorking(false);
      terminal.print('UNABLE TO COMPUTE');
      terminal.print($('<ins>').text('AVAILABLE DATA INSUFFICIENT'));
      terminal.print('');
      terminal.print('');
    }, 1000);
  } else {
    terminal.print('UNABLE TO COMPUTE');
    terminal.print($('<ins>').text('PARAMETERS UNDEFINED'));
    terminal.print('');
    terminal.print('');
  }
}

muthur.my_chances = function(terminal) {
  if (muthur.script.procedures_evaluated) {
    terminal.print($('<ins>').text('DOES NOT COMPUTE'));
    terminal.print('');
    terminal.print('');
  } else {
    terminal.print('UNABLE TO COMPUTE');
    terminal.print($('<ins>').text('PARAMETERS UNDEFINED'));
    terminal.print('');
    terminal.print('');
  }
}

muthur.request_science_clarification = function(terminal) {
  muthur.script.clarification_requested = true;
  terminal.print($('<ins>').text('UNABLE TO CLARIFY'));
  terminal.print('');
  terminal.print('');
}

muthur.request_enhancement = function(terminal) {
  if (muthur.script.clarification_requested) {
    terminal.print('NO FURTHER ENHANCEMENT')
    terminal.print('');
    terminal.print('SPECIAL ORDER 937');
    terminal.print('');
    terminal.print($('<ins>').text('SCIENCE OFFICER EYES ONLY'));
    terminal.print('');
    terminal.print('');
  } else {
    terminal.print('NO FURTHER ENHANCEMENT');
    terminal.print('');
    terminal.print('');
  }
}

muthur.special_order_937 = function(terminal) {
  if (muthur.script.command_override) {
    terminal.print("\n");
    terminal.print('NOSTROMO REROUTED');
    terminal.print('TO NEW CO-ORDINATES.');
    terminal.print('');
    terminal.print('INVESTIGATE LIFE FORM. GATHER SPECIMEN.');
    terminal.print("\n\n");
    terminal.print('PRIORITY ONE');
    terminal.print('');
    terminal.print('INSURE RETURN OF ORGANISM FOR ANALYSIS.');
    terminal.print('');
    terminal.print('ALL OTHER CONSIDERATIONS SECONDARY.');
    terminal.print("\n\n");
    terminal.print('CREW EXPENDABLE.');
    terminal.print('');
    terminal.print('');
  } else {
    terminal.print($('<ins>').text('SCIENCE OFFICER EYES ONLY'));
    terminal.print('');
    terminal.print('');
  }
}

muthur.the_story = function(terminal) {
  terminal.print('NOSTROMO REROUTED TO NEW CO-ORDINATES.');
  terminal.print('');
  terminal.print('INVESTIGATE LIFE FORM. GATHER SPECIMEN.');
  terminal.print('');
  terminal.print('');
}

muthur.unable_to_compute = function(terminal) {
  terminal.print('UNABLE TO COMPUTE');
  terminal.print($('<ins>').text('PARAMETERS UNDEFINED'));
  terminal.print('');
  terminal.print('');
}

muthur.unrecognized_command = function(terminal) {
  terminal.print('COULD NOT PARSE COMMAND');
  terminal.print('');
  terminal.print('');
}

muthur.script = {
  procedures_evaluated: false,
  clarification_requested: false,
  command_override: false,
  commands: {
    "what's the story mother?": muthur.the_story,
    "request evaluation of current procedures to terminate alien": muthur.evaluate_procedures,
    "can we kill the alien?": muthur.evaluate_procedures,
    "request options for possible procedure": muthur.request_options,
    "what are my chances?": muthur.my_chances,
    "request clarification on science inability to neutralize alien": muthur.request_science_clarification,
    "request enhancement": muthur.request_enhancement,
    "what is special order 937 ?": muthur.special_order_937,
    "what is special order 937?": muthur.special_order_937
  }
}

muthur.oneliners = {
  'ship registration': 'NOSTROMO 182246',
  'ship name': 'NOSTROMO 182246'
};

muthur.script_line = function (terminal, command) {
  if (command in muthur.script.commands) {
    muthur.script.commands[command](terminal);
    return true;
  } else {
    return false;
  }
}

muthur.fallback = function(terminal, cmd) {
  cmd = cmd.toLowerCase();
  if (this.script_line(terminal, cmd)) {
    return true;
  } else if (this.oneLiner(terminal, cmd)) {
    return true;
  } else {
    if ("ship status" == cmd) {
      this.ship_status(terminal);
      return true;
    }
    return false;
  }
};

$(document).ready(function() {
	Terminal.promptActive = false;
	$('#screen').bind('cli-load', function(e) {
    muthur.address_matrix(Terminal);
    Terminal.runCommand("WHAT'S THE STORY MOTHER?");
	});
});
