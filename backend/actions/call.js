module.exports = (socket, gameState, broadcastGameState) => {
    return () => {
        const player = gameState.players.find((p) => p.id === socket.id);

        if (!player) {
            socket.emit("error", "Player not found.");
            return;
        }

        if (!gameState.currentBet || gameState.currentBet === 0) {
            socket.emit("error", "No bet to call.");
            return;
        }

        console.log(`Player state before call:`, player);

        const callAmount = gameState.currentBet - (player.currentBet || 0);

        if (player.chips < callAmount) {
            socket.emit("error", "Not enough chips to call.");
            return;
        }

        // Update player's chips and current bet
        player.chips -= callAmount;
        player.currentBet = gameState.currentBet;

        // Add the call amount to the pot
        gameState.pot += callAmount;

        console.log(`Player ${player.name} called ${callAmount}. Remaining chips: ${player.chips}`);

        broadcastGameState();
    };
};
