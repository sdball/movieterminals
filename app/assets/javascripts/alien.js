//= require jquery.min-1.4.2
//= require jquery.hotkeys-0.7.9
//= require cli
//= require_self

function pathFilename(path) {
	var match = /\/([^\/]+)$/.exec(path);
	if (match) {
		return match[1];
	}
}

function getRandomInt(min, max) {
	// via https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Math/random#Examples
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
	return items[getRandomInt(0, items.length-1)];
}

TerminalShell.commands['next'] = function(terminal) {
	xkcdDisplay(terminal, xkcd.last.num+1);
};

TerminalShell.commands['previous'] =
TerminalShell.commands['prev'] = function(terminal) {
	xkcdDisplay(terminal, xkcd.last.num-1);
};

TerminalShell.commands['first'] = function(terminal) {
	xkcdDisplay(terminal, 1);
};

TerminalShell.commands['latest'] =
TerminalShell.commands['last'] = function(terminal) {
	xkcdDisplay(terminal, xkcd.latest.num);
};

TerminalShell.commands['random'] = function(terminal) {
	xkcdDisplay(terminal, getRandomInt(1, xkcd.latest.num));
};

TerminalShell.commands['goto'] = function(terminal, subcmd) {
	$('#screen').one('cli-ready', function(e) {
		terminal.print('Did you mean "display"?');
	});
	xkcdDisplay(terminal, 292);
};


TerminalShell.commands['sudo'] = function(terminal) {
	var cmd_args = Array.prototype.slice.call(arguments);
	cmd_args.shift(); // terminal
	if (cmd_args.join(' ') == 'make me a sandwich') {
		terminal.print('Okay.');
	} else {
		var cmd_name = cmd_args.shift();
		cmd_args.unshift(terminal);
		cmd_args.push('sudo');
		if (TerminalShell.commands.hasOwnProperty(cmd_name)) {
			this.sudo = true;
			this.commands[cmd_name].apply(this, cmd_args);
			delete this.sudo;
		} else if (!cmd_name) {
			terminal.print('sudo what?');
		} else {
			terminal.print('sudo: '+cmd_name+': command not found');
		}
	}
};

TerminalShell.filters.push(function (terminal, cmd) {
	if (/!!/.test(cmd)) {
		var newCommand = cmd.replace('!!', this.lastCommand);
		terminal.print(newCommand);
		return newCommand;
	} else {
		return cmd;
	}
});

TerminalShell.commands['shutdown'] = TerminalShell.commands['poweroff'] = function(terminal) {
	if (this.sudo) {
		terminal.print('Broadcast message from guest@xkcd');
		terminal.print();
		terminal.print('The system is going down for maintenance NOW!');
		return $('#screen').fadeOut();
	} else {
		terminal.print('Must be root.');
	}
};

TerminalShell.commands['logout'] =
TerminalShell.commands['exit'] =
TerminalShell.commands['quit'] = function(terminal) {
	terminal.print('Bye.');
	$('#prompt, #cursor').hide();
	terminal.promptActive = false;
};

TerminalShell.commands['restart'] = TerminalShell.commands['reboot'] = function(terminal) {
	if (this.sudo) {
		TerminalShell.commands['poweroff'](terminal).queue(function(next) {
			window.location.reload();
		});
	} else {
		terminal.print('Must be root.');
	}
};

function linkFile(url) {
	return {type:'dir', enter:function() {
		window.location = url;
	}};
}

Filesystem = {
	'welcome.txt': {type:'file', read:function(terminal) {
		terminal.print($('<h4>').text('Welcome to the unixkcd console.'));
		terminal.print('To navigate the comics, enter "next", "prev", "first", "last", "display", or "random".');
		terminal.print('Use "ls", "cat", and "cd" to navigate the filesystem.');
	}},
	'license.txt': {type:'file', read:function(terminal) {
		terminal.print($('<p>').html('Client-side logic for Wordpress CLI theme :: <a href="http://thrind.xamai.ca/">R. McFarland, 2006, 2007, 2008</a>'));
		terminal.print($('<p>').html('jQuery rewrite and overhaul :: <a href="http://www.chromakode.com/">Chromakode, 2010</a>'));
		terminal.print();
		$.each([
			'This program is free software; you can redistribute it and/or',
			'modify it under the terms of the GNU General Public License',
			'as published by the Free Software Foundation; either version 2',
			'of the License, or (at your option) any later version.',
			'',
			'This program is distributed in the hope that it will be useful,',
			'but WITHOUT ANY WARRANTY; without even the implied warranty of',
			'MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the',
			'GNU General Public License for more details.',
			'',
			'You should have received a copy of the GNU General Public License',
			'along with this program; if not, write to the Free Software',
			'Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.'
		], function(num, line) {
			terminal.print(line);
		});
	}}
};
Filesystem['blog'] = Filesystem['blag'] = linkFile('http://blag.xkcd.com');
Filesystem['forums'] = Filesystem['fora'] = linkFile('http://forums.xkcd.com/');
Filesystem['store'] = linkFile('http://store.xkcd.com/');
Filesystem['about'] = linkFile('http://xkcd.com/about/');
TerminalShell.pwd = Filesystem;

TerminalShell.commands['cd'] = function(terminal, path) {
	if (path in this.pwd) {
		if (this.pwd[path].type == 'dir') {
			this.pwd[path].enter(terminal);
		} else if (this.pwd[path].type == 'file') {
			terminal.print('cd: '+path+': Not a directory');
		}
	} else {
		terminal.print('cd: '+path+': No such file or directory');
	}
};

TerminalShell.commands['dir'] =
TerminalShell.commands['ls'] = function(terminal, path) {
	var name_list = $('<ul>');
	$.each(this.pwd, function(name, obj) {
		if (obj.type == 'dir') {
			name += '/';
		}
		name_list.append($('<li>').text(name));
	});
	terminal.print(name_list);
};

TerminalShell.commands['cat'] = function(terminal, path) {
	if (path in this.pwd) {
		if (this.pwd[path].type == 'file') {
			this.pwd[path].read(terminal);
		} else if (this.pwd[path].type == 'dir') {
			terminal.print('cat: '+path+': Is a directory');
		}
	} else if (pathFilename(path) == 'alt.txt') {
		terminal.setWorking(true);
		num = Number(path.match(/^\d+/));
		xkcd.get(num, function(data) {
			terminal.print(data.alt);
			terminal.setWorking(false);
		}, function() {
			terminal.print($('<p>').addClass('error').text('cat: "'+path+'": No such file or directory.'));
			terminal.setWorking(false);
		});
	} else {
		terminal.print('You\'re a kitty!');
	}
};

TerminalShell.commands['rm'] = function(terminal, flags, path) {
	if (flags && flags[0] != '-') {
		path = flags;
	}
	if (!path) {
		terminal.print('rm: missing operand');
	} else if (path in this.pwd) {
		if (this.pwd[path].type == 'file') {
			delete this.pwd[path];
		} else if (this.pwd[path].type == 'dir') {
			if (/r/.test(flags)) {
				delete this.pwd[path];
			} else {
				terminal.print('rm: cannot remove '+path+': Is a directory');
			}
		}
	} else if (flags == '-rf' && path == '/') {
		if (this.sudo) {
			TerminalShell.commands = {};
		} else {
			terminal.print('rm: cannot remove /: Permission denied');
		}
	}
};

TerminalShell.commands['cheat'] = function(terminal) {
	terminal.print($('<a>').text('*** FREE SHIPPING ENABLED ***').attr('href', 'http://store.xkcd.com/'));
};

TerminalShell.commands['reddit'] = function(terminal, num) {
	num = Number(num);
	if (num) {
		url = 'http://xkcd.com/'+num+'/';
	} else {
		var url = window.location;
	}
	terminal.print($('<iframe src="http://www.reddit.com/static/button/button1.html?width=140&url='+encodeURIComponent(url)+'&newwindow=1" height="22" width="140" scrolling="no" frameborder="0"></iframe>'));
};

TerminalShell.commands['wget'] = TerminalShell.commands['curl'] = function(terminal, dest) {
	if (dest) {
		terminal.setWorking(true);
		var browser = $('<div>')
			.addClass('browser')
			.append($('<iframe>')
					.attr('src', dest).width("100%").height(600)
					.one('load', function() {
						terminal.setWorking(false);
					}));
		terminal.print(browser);
		return browser;
	} else {
		terminal.print("Please specify a URL.");
	}
};

TerminalShell.commands['write'] =
TerminalShell.commands['irc'] = function(terminal, nick) {
	if (nick) {
		$('.irc').slideUp('fast', function() {
			$(this).remove();
		});
		var url = "http://widget.mibbit.com/?server=irc.foonetic.net&channel=%23xkcd";
		if (nick) {
			url += "&nick=" + encodeURIComponent(nick);
		}
		TerminalShell.commands['curl'](terminal, url).addClass('irc');
	} else {
		terminal.print('usage: irc <nick>');
	}
};

TerminalShell.commands['unixkcd'] = function(terminal, nick) {
	TerminalShell.commands['curl'](terminal, "http://www.xkcd.com/unixkcd/");
};

TerminalShell.commands['apt-get'] = function(terminal, subcmd) {
	if (!this.sudo && (subcmd in {'update':true, 'upgrade':true, 'dist-upgrade':true})) {
		terminal.print('E: Unable to lock the administration directory, are you root?');
	} else {
		if (subcmd == 'update') {
			terminal.print('Reading package lists... Done');
		} else if (subcmd == 'upgrade') {
			if (($.browser.name == 'msie') || ($.browser.name == 'firefox' && $.browser.versionX < 3)) {
				terminal.print($('<p>').append($('<a>').attr('href', 'http://abetterbrowser.org/').text('To complete installation, click here.')));
			} else {
				terminal.print('This looks pretty good to me.');
			}
		} else if (subcmd == 'dist-upgrade') {
			var longNames = {'win':'Windows', 'mac':'OS X', 'linux':'Linux'};
			var name = $.os.name;
			if (name in longNames) {
				name = longNames[name];
			} else {
				name = 'something fancy';
			}
			terminal.print('You are already running '+name+'.');
		} else if (subcmd == 'moo') {
			terminal.print('        (__)');
			terminal.print('        (oo)');
			terminal.print('  /------\\/ ');
			terminal.print(' / |    ||  ');
			terminal.print('*  /\\---/\\  ');
			terminal.print('   ~~   ~~  ');
			terminal.print('...."Have you mooed today?"...');
		} else if (!subcmd) {
			terminal.print('This APT has Super Cow Powers.');
		} else {
			terminal.print('E: Invalid operation '+subcmd);
		}
	}
};

function oneLiner(terminal, msg, msgmap) {
	if (msgmap.hasOwnProperty(msg)) {
		terminal.print(msgmap[msg]);
		return true;
	} else {
		return false;
	}
}

TerminalShell.commands['man'] = function(terminal, what) {
	pages = {
		'last': 'Man, last night was AWESOME.',
		'help': 'Man, help me out here.',
		'next': 'Request confirmed; you will be reincarnated as a man next.',
		'cat':  'You are now riding a half-man half-cat.'
	};
	if (!oneLiner(terminal, what, pages)) {
		terminal.print('Oh, I\'m sure you can figure it out.');
	}
};

TerminalShell.commands['locate'] = function(terminal, what) {
	keywords = {
		'ninja': 'Ninja can not be found!',
		'keys': 'Have you checked your coat pocket?',
		'joke': 'Joke found on user.',
		'problem': 'Problem exists between keyboard and chair.',
		'raptor': 'BEHIND YOU!!!'
	};
	if (!oneLiner(terminal, what, keywords)) {
		terminal.print('Locate what?');
	}
};

Adventure = {
	rooms: {
		0:{description:'You are at a computer using unixkcd.', exits:{west:1, south:10}},
		1:{description:'Life is peaceful there.', exits:{east:0, west:2}},
		2:{description:'In the open air.', exits:{east:1, west:3}},
		3:{description:'Where the skies are blue.', exits:{east:2, west:4}},
		4:{description:'This is what we\'re gonna do.', exits:{east:3, west:5}},
		5:{description:'Sun in wintertime.', exits:{east:4, west:6}},
		6:{description:'We will do just fine.', exits:{east:5, west:7}},
		7:{description:'Where the skies are blue.', exits:{east:6, west:8}},
		8:{description:'This is what we\'re gonna do.', exits:{east:7}},
		10:{description:'A dark hallway.', exits:{north:0, south:11}, enter:function(terminal) {
				if (!Adventure.status.lamp) {
					terminal.print('You are eaten by a grue.');
					Adventure.status.alive = false;
					Adventure.goTo(terminal, 666);
				}
			}
		},
		11:{description:'Bed. This is where you sleep.', exits:{north:10}},
		666:{description:'You\'re dead!'}
	},

	status: {
		alive: true,
		lamp: false
	},

	goTo: function(terminal, id) {
		Adventure.location = Adventure.rooms[id];
		Adventure.look(terminal);
		if (Adventure.location.enter) {
			Adventure.location.enter(terminal);
		}
	}
};
Adventure.location = Adventure.rooms[0];

TerminalShell.commands['look'] = Adventure.look = function(terminal) {
	terminal.print(Adventure.location.description);
	if (Adventure.location.exits) {
		terminal.print();

		var possibleDirections = [];
		$.each(Adventure.location.exits, function(name, id) {
			possibleDirections.push(name);
		});
		terminal.print('Exits: '+possibleDirections.join(', '));
	}
};

TerminalShell.commands['go'] = Adventure.go = function(terminal, direction) {
	if (Adventure.location.exits && direction in Adventure.location.exits) {
		Adventure.goTo(terminal, Adventure.location.exits[direction]);
	} else if (!direction) {
		terminal.print('Go where?');
	} else if (direction == 'down') {
		terminal.print("On our first date?");
	} else {
		terminal.print('You cannot go '+direction+'.');
	}
};

TerminalShell.commands['light'] = function(terminal, what) {
	if (what == "lamp") {
		if (!Adventure.status.lamp) {
			terminal.print('You set your lamp ablaze.');
			Adventure.status.lamp = true;
		} else {
			terminal.print('Your lamp is already lit!');
		}
	} else {
		terminal.print('Light what?');
	}
};

TerminalShell.commands['sleep'] = function(terminal, duration) {
	duration = Number(duration);
	if (!duration) {
		duration = 5;
	}
	terminal.setWorking(true);
	terminal.print("You take a nap.");
	$('#screen').fadeOut(1000);
	window.setTimeout(function() {
		terminal.setWorking(false);
		$('#screen').fadeIn();
		terminal.print("You awake refreshed.");
	}, 1000*duration);
};

// No peeking!
TerminalShell.commands['help'] = TerminalShell.commands['halp'] = function(terminal) {
	terminal.print('That would be cheating!');
};

TerminalShell.fallback = function(terminal, cmd) {
	oneliners = {
	  'ship registration': 'NOSTROMO 182246',
	  'ship name': 'NOSTROMO 182246'
	};
	cmd = cmd.toLowerCase();
	if (!oneLiner(terminal, cmd, oneliners)) {
	  if (cmd == "what's the story mother?") {
	    terminal.print;
	    terminal.print('XNPUTXXXXXXXXXXXXDEF/12492.2               SHIP ');
      terminal.print('                                           KEYLAN TITAN2');
      terminal.print('XTUAL TIME:   3 JUN                        NOSTROMO 182246');
      terminal.print('XIGHT TIME:   5 NOV');
      terminal.print('');
      terminal.print('#########################################  FUNCTION:');
      terminal.print('    I ==I                  -II -        #  TANKER/REFINERY');
      terminal.print('              I=.-.----                 #');
      terminal.print(' -I.              -II=-                 #  CAPACITY:');
      terminal.print('                               . .-.    #  200 000 000 TONNES');
      terminal.print('                 #+*$..  I              #');
      terminal.print('            . I  -                      #  GALACTIC POSITION');
      terminal.print('       .II I                            #  27023x983^9');
      terminal.print('                              .- -I     #');
      terminal.print('                                  II .I #  VELOCITY STATUS');
      terminal.print('#########################################  58 092 STL');
	  } else if (cmd == 'ship status') {
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
      terminal.print('INTERFACE    2037         DECK A         A3003');
      terminal.print('ATTN         2087SC       DECK B         A3004');
      terminal.print('ALERT        2088SC       DECK C         A3005');
      terminal.print('MATRIAL      2090         LIFE SUPPORT');
      terminal.print('OVERLOCK     M2091        096            M3003AM');
	  } else if (cmd == "request evaluation of current procedures to terminate alien" || cmd == "can we kill the alien?") {
      // TODO replace this with an "Adventure" query sequence
	    terminal.setWorking(true);
	    window.setTimeout(function() {
	      terminal.setWorking(false);
    		terminal.print('UNABLE TO COMPUTE');
    		$('#display').append('<ins>AVAILABLE DATA INSUFFICIENT</ins>');
    	}, 1000);
	  } else if (cmd == "request options for possible procedure") {
	    terminal.setWorking(true);
	    window.setTimeout(function() {
	      terminal.setWorking(false);
    		terminal.print('UNABLE TO COMPUTE');
    		$('#display').append('<ins>AVAILABLE DATA INSUFFICIENT</ins>');
    	}, 1000);
	  } else if (cmd == "what are my chances ?" || cmd == "what are my chances?") {
	    $('#display').append('<ins>DOES NOT COMPUTE</ins>');
	  } else if (cmd == "request clarification on science inability to neutralize alien") {
	    $('#display').append('<ins>UNABLE TO CLARIFY</ins>');
	  } else if (cmd == 'request enhancement') {
	    terminal.setWorking(true);
	    window.setTimeout(function() {
	      terminal.print('NO FURTHER ENHANCEMENT')
	      window.setTimeout(function() {
	        terminal.setWorking(false);
	        terminal.print('');
    	    terminal.print('SPECIAL ORDER 937');
    	    terminal.print('');
    	    $('#display').append('<ins>SCIENCE OFFICER EYES ONLY</ins>');
	      }, 1500)
	    }, 1000)
	  } else {
	    return false;
	  }
	}
	return true;
};

Terminal.config.prompt = "\nINTERFACE 2037 READY FOR INQUIRY\n\n> ";
Terminal.config.unrecognized = "UNPARSED INPUT";
Terminal.config.typingSpeed = 80;
Terminal.config.spinnerCharacters = [];

$(document).ready(function() {
  $('#screen').css('text-transform', 'uppercase');
	Terminal.promptActive = false;
	$('#screen').bind('cli-load', function(e) {
	  Terminal.runCommand("WHAT'S THE STORY MOTHER?");
	});
});
