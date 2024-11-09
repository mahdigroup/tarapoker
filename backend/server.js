const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);

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
let handsDealt = false;

// Player actions
const ACTIONS = {
    JOIN: "join",
    BET: "bet",
    FOLD: "fold",
    CALL: "call",
    RAISE: "raise",
    DEAL: "deal",
};

// Utility to create and shuffle a deck
const createDeck = () => {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
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

// Reset the game state
const resetGame = () => {
    deck = createDeck(); // Create a new shuffled deck
    gameState.communityCards = [];
    playerHands = {};
    handsDealt = false;
    activePlayers = [];
    gameState.players = [];
    gameState.pot = 0;
    currentBet = 0;
    gameState.currentPlayer = null;
    console.log("Game has been reset.");
};

// Reset players' current bets
const resetPlayerBets = () => {
    gameState.players.forEach((player) => {
        player.currentBet = 0;
    });
};

// Helper function to filter game state per player
const getFilteredGameState = (socketId) => {
    const filteredPlayerHands = {};
    Object.keys(playerHands).forEach((id) => {
        if (id === socketId) {
            filteredPlayerHands[id] = playerHands[id];
        }
    });

    return { ...gameState, playerHands: filteredPlayerHands };
};

// Emit game state to each player individually
const broadcastGameState = () => {
    gameState.players.forEach((player) => {
        const filteredState = {
            ...gameState,
            playerHands: { [player.id]: playerHands[player.id] || [] },
        };
        console.log(`Broadcasting to ${player.name}:`, filteredState); // Debug
        io.to(player.id).emit("gameState", filteredState);
    });
};

// Import action handlers
const betAction = require("./actions/bet");
const foldAction = require("./actions/fold");
const callAction = require("./actions/call");
const raiseAction = require("./actions/raise");

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle player joining the game
    socket.on(ACTIONS.JOIN, (playerName) => {
        if (gameState.players.length < 6) { // Limit to 6 players
            const newPlayer = {
                id: socket.id,
                name: playerName || `Player-${gameState.players.length + 1}`,
                chips: 1000,
                currentBet: 0,
                folded: false,
            };
            gameState.players.push(newPlayer);
            activePlayers.push(socket.id);
            console.log(`${playerName} joined the game`);
            broadcastGameState();
        } else {
            socket.emit("error", "Game is full");
        }
    });

    // Attach action handlers
    socket.on(ACTIONS.BET, (amount) => {
        betAction(socket, gameState, broadcastGameState)(amount);
    });

    socket.on(ACTIONS.FOLD, () => {
        foldAction(socket, gameState, broadcastGameState)();
    });

    socket.on(ACTIONS.CALL, () => {
        callAction(socket, gameState, broadcastGameState)();
    });

    socket.on(ACTIONS.RAISE, (amount) => {
        raiseAction(socket, gameState, broadcastGameState)(amount);
    });

    // Handle deal action
    socket.on(ACTIONS.DEAL, () => {
        if (deck.length === 0) deck = createDeck(); // Initialize deck if needed

        if (!handsDealt) {
            gameState.players.forEach((player) => {
                playerHands[player.id] = [deck.pop(), deck.pop()];
            });
            handsDealt = true; // Mark that hands have been dealt
        }

        if (gameState.communityCards.length < 5) {
            const numCards =
                gameState.communityCards.length === 0 ? 3 : 1; // Deal 3 cards for flop, 1 for turn/river
            for (let i = 0; i < numCards; i++) {
                gameState.communityCards.push(deck.pop());
            }
        }

        broadcastGameState();
    });

    // Handle player disconnect
    socket.on("disconnect", () => {
        gameState.players = gameState.players.filter((p) => p.id !== socket.id);
        activePlayers = activePlayers.filter((id) => id !== socket.id);
        console.log(`A player disconnected: ${socket.id}`);

        if (activePlayers.length === 0) {
            console.log("All players have left. Resetting game state...");
            resetGame();
        } else {
            broadcastGameState();
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
