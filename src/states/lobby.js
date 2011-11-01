exports.state = function(game){
	
	return {
	
		"_init" : function(){
			
			quicklog("states.lobby._init");
			
			// cull inactive users
			
			var inactiveClients = game.channels.active.getInactive();
			
			if (inactiveClients.length){
				
				var inactiveUserIds = [];
				
				for (var i = 0; i < inactiveClients.length; i++){
								
					var client = inactiveClients[i];
				
					game.channels.active.remove(client);
					game.channels.inactive.add(client);
					
					client.send(JSON.stringify({'action':'timeout'}));
					
					inactiveUserIds.push(client.user.id);
				
				}
				
				game.channels.active.broadcast(JSON.stringify({
					action: "closed",
					users: inactiveUserIds
				}));
			}
			
			var round = game.round;
													   					   
			game.channels.active.broadcast(JSON.stringify({action: "state",
														   state: "lobby",
														   leaderboards: round.leaderboards,
														   longestWord: round.longestWord.toUpperCase()}));
			
			var startGame = function(){
		
				if (game.channels.active.count() == 0) {
					
					quicklog("No players - waiting...");
					
				} else {
						
					clearInterval(startGameInterval);
							
					game.changeState('chooseLetters');
					
				}
			};
					
			startGameInterval = setInterval(startGame, 10000);
			
		},
		
		"_end" : function(){
			
			game.channels.active.endRound();
			
			game.initRound();
			
		}
	}
};