

exports.state = function(game){
	
	return {
	
		"_init" :  function(){
			
			game.channels.active.setUserStatus("game");
			
			game.round.time = 30;
			
			game.channels.active.broadcast(JSON.stringify({'action': 'state',
													 	   'state':  'game',
													 	   'time': 	  game.round.time}));
			
			var countdown = function(){
				game.round.time = game.round.time - 1;
				
				quicklog("Time left: " + game.round.time);
				
				if (game.round.time == 0){
					clearInterval(countdownInterval);
					
					game.changeState("submissions");
				}
			}
			
			countdownInterval = setInterval(countdown, 1000);
			
			game.round.longestWord = "";
			
			var anagramList = game.anagramList;
			
			var letters = game.round.letters.split("").sort().join("").toLowerCase();
			
			var placeBlanks = function(letters, blanks, start){
			
				var blanks = (blanks) ? blanks : [],
					start = (start) ? start : 0;				
				var test = letters;
				var logTest = test;
				
				if (blanks.length == letters.length-1){
					
					// not interested in 1 letter words
					return false;
				}
				
				for (var i = blanks.length-1; i >= 0; i--){
					
					var index = blanks[i];
					test = test.substr(0, index) + test.substr(index+1);
					logTest = logTest.substr(0, index) + "-" + logTest.substr(index+1);
					
				}
				
				quicklog(logTest);
				
				if (game.anagramList[test]){
					
					// found!
					game.round.longestWord = game.anagramList[test][0];
					quicklog("Longest word: " + game.round.longestWord);
					return;
					
				}
					
				// look for valid last blank to move
				
				for (var i = blanks.length-1; i >= 0; i--){
					
					if (blanks[i] < (letters.length - 1) - (blanks.length-1-i)){
						
						if (i == 0){
							// increment start and reset the blanks
							start++;
							for (var j = 0; j < blanks.length; j++){
								blanks[j] = j+start;
							}
						} else {
							//move blank across
							blanks[i]++;
						}
						
						placeBlanks(letters, blanks, start);
						return;
						
					}
									
				}
				
				// no valid blanks to move - reset start to 0 and add a blank
						
				for (var i = 0; i<blanks.length; i++){
					blanks[i] = i;
				}
				
				blanks.push(blanks.length);
				
				placeBlanks(letters, blanks, 0);
				
			}
			
			placeBlanks(letters);
			
		}
	}
}
