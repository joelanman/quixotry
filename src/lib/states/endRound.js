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

exports.state = {
	
	"_init" : function(){
		
		quicklog("states.endRound._init");
		
		var averageWordLength = round.totalWordLength/channels.active.count();
			
		quicklog("Average word length: " + averageWordLength);
		
		for (i = 0; i < round.usersWithValidWords.length; i++){
			var user = round.usersWithValidWords[i];
			var word = user.word();
			if (word.length > averageWordLength) {
				var scoreChange = Math.ceil(word.length-averageWordLength) * 10;
				user.scoreChange(scoreChange);
			} else {
				user.scoreChange(0);
			}
		}
		
		var activeUserArray = channels.active.usersToArray();
		
		round.leaderboards.round   = activeUserArray.slice(0);
		round.leaderboards.overall = activeUserArray.slice(0);
		
		round.leaderboards.round.sort(compareScore);
		round.leaderboards.overall.sort(compareTotalScore);
		
		changeState("lobby");
	}
}