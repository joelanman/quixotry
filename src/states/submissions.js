
exports.state = function(game){
		
	return {
		
		"_init" : function(){
			
			quicklog("states.submissions._init");
			
			game.channels.active.broadcast(JSON.stringify({'action': 'state',
													 	   'state':  'submissions'}));
			var endRound = function(){
				game.changeState("endRound");
			}
			
			this.endRoundTimeout = setTimeout(endRound, 3 * 1000);
			
		},
		
		"_end" : function(){
			
			quicklog("states.submissions._end");
			clearTimeout(this.endRoundTimeout);
			
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
			
	  		var hasValidWord = (game.words.indexOf(word.toLowerCase()) != -1);
	  		
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
};
