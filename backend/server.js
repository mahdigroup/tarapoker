const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors"); // Add CORS

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS for the frontend
app.use(cors({
    origin: "http://localhost:5173", // Allow frontend origin
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow WebSocket connections from frontend
        methods: ["GET", "POST"],
    },
});

const PORT = process.env.PORT || 3000;

// Store the game state
let gameState = {
    players: [],
    communityCards: [],
    currentPlayer: null,
    pot: 0,
};

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
    gameState.players.forEach((player) => {
        playerHands[player.id] = [deck.pop(), deck.pop()]; // Deal two cards
    });
    gameState.pot = 0;
    gameState.currentPlayer = gameState.players[0]?.id || null;
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
            if (gameState.players.length === 1) resetGame(); // Reset the game when first player joins
            io.emit("gameState", { ...gameState, playerHands }); // Send player hands to each client
            console.log(`${playerName} joined the game`);
        } else {
            socket.emit("error", "Game is full");
        }
    });

    // Deal community cards (flop, turn, river)
    socket.on("deal", () => {
        if (gameState.communityCards.length < 5) {
            const numCards =
                gameState.communityCards.length === 0 ? 3 : 1; // Deal 3 cards for flop, 1 for turn/river
            for (let i = 0; i < numCards; i++) {
                gameState.communityCards.push(deck.pop());
            }
            io.emit("gameState", { ...gameState, playerHands });
        }
    });

    // Player places a bet
    socket.on(ACTIONS.BET, (amount) => {
        const player = gameState.players.find((p) => p.id === socket.id);
        if (player) {
            player.chips -= amount;
            gameState.pot += amount;
            io.emit("gameState", gameState); // Broadcast updated game state
        }
    });

    // Player disconnects
    socket.on("disconnect", () => {
        gameState.players = gameState.players.filter((p) => p.id !== socket.id);
        io.emit("gameState", gameState); // Broadcast updated game state
        console.log("A user disconnected:", socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
