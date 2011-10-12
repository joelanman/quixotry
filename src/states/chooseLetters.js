exports.state = function(game){
	
	var dealerDead = function(){
	
		quicklog("Dealer dead!");
		
		clearTimeout(dealerDeadTimeout);
		
		var letters = "";
		
		var numLetters = 8 - game.round.letters.length;
		
		quicklog("Selected letters : " + game.round.letters);
		
		var numConsonants = 5 - game.round.consonants,
			numVowels = 5 - game.round.vowels;
		
		if (numLetters < numConsonants) {
			numConsonants = numLetters;
		}
		
		for (var i = 0; i < numConsonants; i++) {
		
			var index = Math.floor(Math.random() * game.consonants.length);
			letters += game.consonants.substring(index, index + 1);
			
		}
		
		numLetters = numLetters - numConsonants;
		
		for (var i = 0; i < numLetters; i++) {
		
			var index = Math.floor(Math.random() * game.vowels.length);
			letters += game.vowels.substring(index, index + 1);
			
		}
		
		var index = game.round.letters.length;
		
		game.round.letters += letters;
		
		var msgOut = JSON.stringify({
			"action": 	  "dealerDead",
			"letters": 	  letters,
			"startIndex": index
		});
		
		game.channels.active.broadcast(msgOut);
					
		game.changeState("game");
		
	};
			
	return {
		
		"_init" : function(){
			
			quicklog("Starting game");
			
			var dealer = game.channels.active.newDealer();
			
			var msgOut = JSON.stringify({
				"action": "state",
				"state": "chooseLetters",
				"dealerId": dealer.id,
				"dealerName": dealer.name()
			});
			
			game.channels.active.broadcast(msgOut);
			
			dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
		},
		
		"chooseLetter" : function(client, msg){
			
			clearTimeout(dealerDeadTimeout);
			dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
			
			if (msg.type == "vowel") {
				if (game.round.vowels >= game.round.maxVowels){
					msg.type = "consonant";
				}
			} else {
				if (game.round.consonants >= game.round.maxConsonants){
					msg.type = "vowel";
				}
			}
			
			if (msg.type == "vowel"){
				game.round.vowels += 1 ;
			} else {
				game.round.consonants += 1;
			}
			
			var letters = (msg.type == "vowel") ? vowels : consonants;
			var index = Math.floor(Math.random()*letters.length);
			var letter = letters.substring(index, index+1);
			
			game.round.letters += letter;
			
			var index = game.round.letters.length - 1;
			
			quicklog("Add tile: " + letter);
			
			game.channels.active.broadcast(JSON.stringify({'action': 'addTile',
													  	   'letter': letter,
													  	   'index':	 index}));
			
			if (game.round.letters.length >= 8) {
				
				clearTimeout(dealerDeadTimeout);
							
				game.changeState("game");
	
			}	
		}
	}
}