import React, { useEffect } from "react";
import PokerTable from "./PokerTable";
import { io } from "socket.io-client";

const App: React.FC = () => {
    useEffect(() => {
        // Connect to the backend server
        const socket = io("http://localhost:3000");

        socket.on("connect", () => {
            console.log("Connected to Tarapoker backend:", socket.id);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from Tarapoker backend");
        });

        // Cleanup the socket connection
        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div>
            <h1>Welcome to Tarapoker!</h1>
            <p>The game is under development.</p>
			<PokerTable />
        </div>
    );
};

export default App;
