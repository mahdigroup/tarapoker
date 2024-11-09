import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import "./PokerTable.css";

// Define TypeScript interfaces
interface Player {
    id: string;
    name: string;
    chips: number;
}

interface GameState {
    players: Player[];
    communityCards: string[];
    pot: number;
    playerHands?: Record<string, string[]>;
}

// Initialize the socket connection outside the component
const socket: Socket = io("http://localhost:3000");

const PokerTable: React.FC = () => {
    const [playerName, setPlayerName] = useState<string>("");
    const [isJoined, setIsJoined] = useState<boolean>(false);
    const [gameState, setGameState] = useState<GameState>({
        players: [],
        communityCards: [],
        pot: 0,
    });
    const [playerHand, setPlayerHand] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        // Listen for game state updates
        socket.on("gameState", (state: GameState) => {
            setGameState(state);
            if (state.playerHands && state.playerHands[socket.id]) {
                setPlayerHand(state.playerHands[socket.id]);
            }
        });

        // Handle server errors
        socket.on("error", (message: string) => {
            setErrorMessage(message);
        });

        return () => {
            // Clean up socket listeners on component unmount
            socket.off("gameState");
            socket.off("error");
        };
    }, []);

    const joinGame = () => {
        if (playerName.trim()) {
            socket.emit("join", playerName);
            setIsJoined(true);
            setErrorMessage(""); // Clear any previous errors
        } else {
            setErrorMessage("Please enter a valid name.");
        }
    };

    const dealCards = () => {
        socket.emit("deal");
    };

    return (
        <div className="poker-table">
            {!isJoined ? (
                <div className="join-game">
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button onClick={joinGame}>Join Game</button>
                    {errorMessage && <p className="error">{errorMessage}</p>}
                </div>
            ) : (
                <>
                    <h2>Pot: ${gameState.pot}</h2>
                    <div className="community-cards">
                        {gameState.communityCards.map((card: string, index: number) => (
                            <div className="card" key={index}>
                                {card}
                            </div>
                        ))}
                    </div>
                    <div className="player-hand">
                        <h3>Your Hand:</h3>
                        <div className="cards">
                            {playerHand.map((card, index) => (
                                <div className="card" key={index}>
                                    {card}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="players">
                        {gameState.players.map((player) => (
                            <div className="player" key={player.id}>
                                {player.name} (${player.chips})
                            </div>
                        ))}
                    </div>
                    <div className="betting-panel">
                        <button onClick={dealCards}>Deal Cards</button>
                        <button onClick={() => socket.emit("bet", 10)}>Bet $10</button>
                        <button onClick={() => socket.emit("fold")}>Fold</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PokerTable;
