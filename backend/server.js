const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "http://localhost:5173",
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

const PORT = process.env.PORT || 3000;

// Game state
let gameState = {
    players: [],
    communityCards: [],
    currentPlayer: null,
    pot: 0,
};

// Additional variables for gameplay
let currentBet = 0;
let activePlayers = [];

// Player actions
const ACTIONS = {
    JOIN: "join",
    BET: "bet",
    FOLD: "fold",
    CALL: "call",
    RAISE: "raise",
};

// Utility to create and shuffle a deck
const createDeck = () => {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = [
        "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
    ];
    const deck = [];
    suits.forEach((suit) => {
        ranks.forEach((rank) => {
            deck.push(`${rank}${suit}`);
        });
    });
    return deck.sort(() => Math.random() - 0.5); // Shuffle
};

// Store the deck and player hands
let deck = [];
let playerHands = {};

// Initialize game state
const resetGame = () => {
    deck = createDeck();
    gameState.communityCards = [];
    playerHands = {};
    activePlayers = [...gameState.players.map((p) => p.id)];
    gameState.players.forEach((player) => {
        playerHands[player.id] = [deck.pop(), deck.pop()]; // Deal two cards
    });
    gameState.pot = 0;
    currentBet = 0;
    gameState.currentPlayer = gameState.players[0]?.id || null;
};

// Determine the winner (simple: last active player wins)
const determineWinner = () => {
    if (activePlayers.length === 1) {
        const winner = gameState.players.find((p) => p.id === activePlayers[0]);
        if (winner) {
            winner.chips += gameState.pot;
            gameState.pot = 0;
            console.log(`${winner.name} wins the pot!`);
            resetGame(); // Reset the game for the next round
            io.emit("gameState", { ...gameState, playerHands });
        }
    }
};

// Handle socket connections
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Player joins the game
    socket.on(ACTIONS.JOIN, (playerName) => {
        if (gameState.players.length < 6) { // Limit to 6 players
            gameState.players.push({
                id: socket.id,
                name: playerName,
                chips: 1000, // Starting chips
            });
            if (gameState.players.length === 1) resetGame(); // Reset the game when the first player joins
            io.emit("gameState", { ...gameState, playerHands });
            console.log(`${playerName} joined the game`);
        } else {
            socket.emit("error", "Game is full");
        }
    });

    // Player places a bet
    socket.on(ACTIONS.BET, (amount) => {
        const player = gameState.players.find((p) => p.id === socket.id);
        if (player && amount >= currentBet) {
            player.chips -= amount;
            gameState.pot += amount;
            currentBet = amount; // Update the current bet
            io.emit("gameState", gameState);
        }
    });

    // Player folds
    socket.on(ACTIONS.FOLD, () => {
        activePlayers = activePlayers.filter((id) => id !== socket.id); // Remove player from active players
        io.emit("gameState", gameState);

        if (activePlayers.length === 1) {
            determineWinner(); // Determine the winner when only one player is left
        }
    });

    // Player calls
    socket.on(ACTIONS.CALL, () => {
        const player = gameState.players.find((p) => p.id === socket.id);
        if (player) {
            const difference = currentBet; // Amount to match the current bet
            player.chips -= difference;
            gameState.pot += difference;
            io.emit("gameState", gameState);
        }
    });

    // Player raises
    socket.on(ACTIONS.RAISE, (raiseAmount) => {
        const player = gameState.players.find((p) => p.id === socket.id);
        if (player && raiseAmount > currentBet) {
            player.chips -= raiseAmount;
            gameState.pot += raiseAmount;
            currentBet = raiseAmount; // Update the current bet
            io.emit("gameState", gameState);
        }
    });

    // Player disconnects
    socket.on("disconnect", () => {
        gameState.players = gameState.players.filter((p) => p.id !== socket.id);
        activePlayers = activePlayers.filter((id) => id !== socket.id);
        io.emit("gameState", gameState);
        console.log("A user disconnected:", socket.id);

        if (activePlayers.length === 1) {
            determineWinner();
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
