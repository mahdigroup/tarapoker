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


// Function to move to the next player
const moveToNextPlayer = () => {
    const currentIndex = gameState.players.findIndex((p) => p.id === gameState.currentPlayer);
    let nextIndex = (currentIndex + 1) % gameState.players.length;

    while (
        gameState.players[nextIndex].folded || 
        gameState.players[nextIndex].chips <= 0
    ) {
        nextIndex = (nextIndex + 1) % gameState.players.length;

        // If we loop back to the current player, the round is over
        if (nextIndex === currentIndex) {
            console.log("All players have acted. Proceeding to the next stage.");
            return false; // Indicate the round is complete
        }
    }

    gameState.currentPlayer = gameState.players[nextIndex].id;
    console.log(`Next turn: ${gameState.players[nextIndex].name}`);
    return true;
};

// Enforce player turn
const enforceTurn = (socket, action) => {
    if (socket.id !== gameState.currentPlayer) {
        socket.emit("error", "It's not your turn!");
        return false;
    }
    return true;
};

// Handle player actions
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on(ACTIONS.JOIN, (playerName) => {
        if (gameState.players.length < 6) {
            const newPlayer = {
                id: socket.id,
                name: playerName || `Player-${gameState.players.length + 1}`,
                chips: 1000,
                currentBet: 0,
                folded: false,
            };
            gameState.players.push(newPlayer);
            activePlayers.push(socket.id);
            console.log(`${newPlayer.name} joined the game.`);

            // Set the first player to act if the game hasn't started
            if (!gameState.currentPlayer) {
                gameState.currentPlayer = newPlayer.id;
            }

            broadcastGameState();
        } else {
            socket.emit("error", "Game is full.");
        }
    });

    socket.on(ACTIONS.BET, (amount) => {
        if (!enforceTurn(socket, ACTIONS.BET)) return;

        // Handle bet logic here...

        if (moveToNextPlayer()) {
            broadcastGameState();
        } else {
            console.log("Betting round complete.");
            // Proceed to the next stage of the game...
        }
    });

    socket.on(ACTIONS.CALL, () => {
        if (!enforceTurn(socket, ACTIONS.CALL)) return;

        // Handle call logic here...

        if (moveToNextPlayer()) {
            broadcastGameState();
        } else {
            console.log("Betting round complete.");
            // Proceed to the next stage of the game...
        }
    });

    socket.on(ACTIONS.FOLD, () => {
        if (!enforceTurn(socket, ACTIONS.FOLD)) return;

        const player = gameState.players.find((p) => p.id === socket.id);
        if (player) {
            player.folded = true;
            console.log(`${player.name} folded.`);
        }

        if (moveToNextPlayer()) {
            broadcastGameState();
        } else {
            console.log("Betting round complete.");
            // Proceed to the next stage of the game...
        }
    });

    socket.on(ACTIONS.RAISE, (amount) => {
        if (!enforceTurn(socket, ACTIONS.RAISE)) return;

        // Handle raise logic here...

        if (moveToNextPlayer()) {
            broadcastGameState();
        } else {
            console.log("Betting round complete.");
            // Proceed to the next stage of the game...
        }
    });

    socket.on("disconnect", () => {
        gameState.players = gameState.players.filter((p) => p.id !== socket.id);
        activePlayers = activePlayers.filter((id) => id !== socket.id);
        console.log(`A player disconnected: ${socket.id}`);

        if (activePlayers.length === 0) {
            console.log("All players have left. Resetting game state...");
            resetGame();
        } else {
            if (socket.id === gameState.currentPlayer) {
                moveToNextPlayer();
            }
            broadcastGameState();
        }
    });
});



// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
