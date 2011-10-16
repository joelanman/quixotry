var compareScore = function(a,b){
	
	if (a.scoreChange() > b.scoreChange()){
		return -1;
	} else
	if (a.scoreChange() < b.scoreChange()){
		return 1;
	} else {
		return 0;
	}
}

var compareTotalScore = function(a,b){
	
	if (a.totalScore() > b.totalScore()){
		return -1;
	} else
	if (a.totalScore() < b.totalScore()){
		return 1;
	} else {
		return 0;
	}
}

exports.state = function(game){
	
	return {
	
		"_init" : function(){
			
			quicklog("states.endRound._init");
			
			var averageWordLength = game.round.totalWordLength/game.channels.active.count();
				
			quicklog("Average word length: " + averageWordLength);
			
			for (var i = 0; i < game.round.usersWithValidWords.length; i++){
				var user = game.round.usersWithValidWords[i];
				var word = user.word();
				if (word.length > averageWordLength) {
					var scoreChange = Math.ceil(word.length-averageWordLength) * 10;
					user.scoreChange(scoreChange);
				} else {
					user.scoreChange(0);
				}
			}
			
			var activeUserArray = game.channels.active.usersToArray();
			var leaderboards = game.round.leaderboards;
			
			leaderboards.round   = activeUserArray.slice(0);
			leaderboards.overall = activeUserArray.slice(0);
			
			leaderboards.round.sort(compareScore);
			leaderboards.overall.sort(compareTotalScore);
			
			game.changeState("lobby");
		}
	}
}