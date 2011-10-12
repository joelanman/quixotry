exports.state = {
	
	"_init" : function(){
		
		quicklog("states.lobby._init");
		
		// cull inactive users
		
		var inactiveClients = channels.active.getInactive();
		
		if (inactiveClients.length){
			
			var inactiveUserIds = [];
			
			for (var i = 0; i < inactiveClients.length; i++){
							
				var client = inactiveClients[i];
			
				channels.active.remove(client);
				channels.inactive.add(client);
				
				client.send(JSON.stringify({'action':'timeout'}));
				
				inactiveUserIds.push(client.user.id);
			
			}
			
			/*
			channels.active.broadcast(JSON.stringify({
				action: "closed",
				users: inactiveUserIds
			}));
			*/
		}
												   					   
		channels.active.broadcast(JSON.stringify({action: "state",
												  state: "lobby",
												  leaderboards: round.leaderboards}));
		
		var startGame = function(){
	
			if (channels.active.count() == 0) {
				
				sys.log("No players - waiting...");
				
			} else {
					
				clearInterval(startGameInterval);
						
				changeState('chooseLetters');
				
			}
		};
				
		startGameInterval = setInterval(startGame, 10000);
		
	},
	
	"_end" : function(){
		
		channels.active.endRound();
		
		initRound();
		
	}
};