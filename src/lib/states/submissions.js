
exports.state = function(game){
		
	return {
		
		"_init" : function(){
			
			quicklog("states.submissions._init");
			
			var endRound = function(){
				game.changeState("endRound");
			}
			
			this.endRoundTimeout = setTimeout(endRound, 3 * 1000);
			
		},
		
		"_end" : function(){
			
			quicklog("states.submissions._end");
			clearTimeout(this.endRoundTimeout);
			
		}//,
	
		//"submitLetters" : states.game.submitLetters
		
	}
};