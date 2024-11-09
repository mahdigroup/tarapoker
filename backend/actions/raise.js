module.exports = (socket, gameState, broadcastGameState) => {
    return (amount) => {
        const player = gameState.players.find((p) => p.id === socket.id);

        if (!player) {
            socket.emit("error", "Player not found.");
            return;
        }

        if (!gameState.currentBet || gameState.currentBet === 0) {
            socket.emit("error", "No active bet to raise.");
            return;
        }

        if (typeof amount !== "number" || amount <= 0) {
            socket.emit("error", "Invalid raise amount.");
            return;
        }

        const raiseAmount = gameState.currentBet - (player.currentBet || 0) + amount;

        if (player.chips < raiseAmount) {
            socket.emit("error", "Not enough chips to raise.");
            return;
        }

        // Deduct chips and update player's current bet
        player.chips -= raiseAmount;
        player.currentBet = gameState.currentBet + amount;

        // Update the game state
        gameState.currentBet += amount;
        gameState.pot += raiseAmount;

        console.log(`${player.name} raised to ${gameState.currentBet}. Remaining chips: ${player.chips}`);
        broadcastGameState();
    };
};
