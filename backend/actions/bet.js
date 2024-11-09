module.exports = (socket, gameState, broadcastGameState) => {
    return (amount) => {
        const player = gameState.players.find((p) => p.id === socket.id);

        if (!player) {
            socket.emit("error", "Player not found.");
            return;
        }

        if (player.chips < amount) {
            socket.emit("error", "Not enough chips to bet.");
            return;
        }

        player.chips -= amount;
        player.currentBet = amount;
        gameState.pot += amount;

        console.log(`${player.name} bet ${amount}. Remaining chips: ${player.chips}`);
        broadcastGameState();
    };
};
