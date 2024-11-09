class Table {
    constructor(maxPlayers) {
        this.maxPlayers = maxPlayers; // Maximum number of players
        this.players = []; // List of players at the table
        this.communityCards = []; // Community cards on the table
        this.pot = 0; // Total chips in the pot
        this.currentPlayer = null; // ID of the current player
    }

    addPlayer(player) {
        if (this.players.length < this.maxPlayers) {
            this.players.push(player);
        } else {
            throw new Error("Table is full");
        }
    }

    removePlayer(playerId) {
        this.players = this.players.filter((player) => player.id !== playerId);
    }

    handleAction(action) {
        // Placeholder for handling actions like betting, folding, etc.
        console.log(`Handling action: ${action.type} from ${action.playerId}`);
    }

    deal() {
        // Placeholder for dealing cards to players
        console.log("Dealing cards...");
        this.communityCards = ["AH", "KC", "QD", "JS", "10H"]; // Example cards
    }

    reset() {
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentPlayer = null;
    }
}

module.exports = Table;
