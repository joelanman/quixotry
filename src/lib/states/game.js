

exports.state = {
	
	"_init" :  function(){
		
		channels.active.setUserStatus("game");
		
		round.time = 30;
		
		channels.active.broadcast(JSON.stringify({'action': 	'state',
												 'state': 	'game',
												 'time': 	round.time}));
		
		var countdown = function(){
			round.time = round.time - 1;
			
			quicklog("Time left: " + round.time);
			
			if (round.time == 0){
				clearInterval(countdownInterval);
				
				changeState("submissions");
			}
		}
		
		countdownInterval = setInterval(countdown, 1000);
		
	},
			
	"submitLetters" : function(client, msg){
				
		var word = "";
		
		for (var i=0; i < msg.letters.length; i++){
			word += round.letters.charAt(msg.letters[i]);
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
			round.usersWithValidWords.push(user);
			round.totalWordLength += word.length;
		} else {
			user.scoreChange(0);
		}
		
		user.status("submittedWord");
		
		if (channels.active.checkUserStatus("submittedWord")) {
						
			changeState('endRound');
			
		}
	}
}
