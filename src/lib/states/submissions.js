
exports.state = {
	
	"_init" : function(){
		
		quicklog("states.submissions._init");
		
		var endRound = function(){
			changeState("endRound");
		}
		
		this.endRoundTimeout = setTimeout(endRound, 3 * 1000);
		
	},
	
	"_end" : function(){
		
		quicklog("states.submissions._end");
		clearTimeout(this.endRoundTimeout);
		
	}//,

	//"submitLetters" : states.game.submitLetters
	
}