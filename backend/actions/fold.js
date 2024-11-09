module.exports = (socket, table, broadcastGameState) => {
    return () => {
        const player = table.players.find((p) => p.id === socket.id);
        if (!player) {
            socket.emit("error", "Player not found.");
            return;
        }

        player.folded = true;
        console.log(`${player.name} folded.`);
        broadcastGameState();
    };
};
