

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
					
					changeState("submissions");
				}
			}
			
			countdownInterval = setInterval(countdown, 1000);
			
		},
				
		"submitLetters" : function(client, msg){
					
			var word = "";
			
			for (var i=0; i < msg.letters.length; i++){
				word += game.round.letters.charAt(msg.letters[i]);
			}
			
			quicklog(" submitted: " + word);
			
			var user = client.user;
				
			if (word.length > 0){
				user.lastActive(new Date());
			}
			
			user.word(word);
			
	  		var hasValidWord = (words.indexOf(word.toLowerCase()) != -1);
	  		
	  		quicklog("Valid: " + hasValidWord);
			
			user.hasValidWord(hasValidWord);
			
			if (hasValidWord){
				game.round.usersWithValidWords.push(user);
				game.round.totalWordLength += word.length;
			} else {
				user.scoreChange(0);
			}
			
			user.status("submittedWord");
			
			if (game.channels.active.checkUserStatus("submittedWord")) {
							
				game.changeState('endRound');
				
			}
		}
	}
}
