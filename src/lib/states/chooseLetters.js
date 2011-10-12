exports.state = {
	
	"_init" : function(){
		
		quicklog("Starting game");
		
		var dealer = channels.active.newDealer();
		
		var msg = JSON.stringify({
			"action": "state",
			"state": "chooseLetters",
			"dealerId": dealer.id,
			"dealerName": dealer.name()
		});
		
		channels.active.broadcast(msg);
		
		dealerDead = function(){
		
			quicklog("Dealer dead!");
			
			clearTimeout(dealerDeadTimeout);
			
			var letters = "";
			
			var numLetters = 8 - round.letters.length;
			
			quicklog("Selected letters : " + round.letters);
			
			var numConsonants = 5 - round.consonants;
			var numVowels = 5 - round.vowels;
			
			if (numLetters < numConsonants) {
				numConsonants = numLetters;
			}
			
			for (var i = 0; i < numConsonants; i++) {
			
				var index = Math.floor(Math.random() * consonants.length);
				letters += consonants.substring(index, index + 1);
				
			}
			
			numLetters = numLetters - numConsonants;
			
			for (var i = 0; i < numLetters; i++) {
			
				var index = Math.floor(Math.random() * vowels.length);
				letters += vowels.substring(index, index + 1);
				
			}
			
			var index = round.letters.length;
			
			round.letters += letters;
			
			var msgOut = JSON.stringify({
				"action": 	  "dealerDead",
				"letters": 	  letters,
				"startIndex": index
			});
			
			channels.active.broadcast(msgOut);
						
			changeState("game");
			
		};
		
		dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
	},
	
	"chooseLetter" : function(client, msg){
		
		clearTimeout(dealerDeadTimeout);
		dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
		
		if (msg.type == "vowel") {
			if (round.vowels >= round.maxVowels){
				msg.type = "consonant";
			}
		} else {
			if (round.consonants >= round.maxConsonants){
				msg.type = "vowel";
			}
		}
		
		if (msg.type == "vowel"){
			round.vowels += 1 ;
		} else {
			round.consonants += 1;
		}
		
		var letters = (msg.type == "vowel") ? vowels : consonants;
		var index = Math.floor(Math.random()*letters.length);
		var letter = letters.substring(index, index+1);
		
		round.letters += letter;
		
		var index = round.letters.length - 1;
		
		quicklog("Add tile: " + letter);
		
		channels.active.broadcast(JSON.stringify({'action':	'addTile',
												  'letter':	letter,
												  'index':	index}));
		
		if (round.letters.length >= 8) {
			
			clearTimeout(dealerDeadTimeout);
						
			changeState("game");

		}	
	}
}