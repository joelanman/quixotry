

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
			
		}
	}
}
