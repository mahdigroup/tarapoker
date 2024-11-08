import React from "react";
import "./PokerTable.css";

const PokerTable: React.FC = () => {
    return (
        <div className="poker-table">
            <div className="community-cards">
                <div className="card">🂠</div>
                <div className="card">🂠</div>
                <div className="card">🂠</div>
                <div className="card">🂠</div>
                <div className="card">🂠</div>
            </div>
            <div className="players">
                <div className="player player-1">Player 1</div>
                <div className="player player-2">Player 2</div>
                <div className="player player-3">Player 3</div>
                <div className="player player-4">Player 4</div>
                <div className="player player-5">Player 5</div>
            </div>
            <div className="betting-panel">
                <button>Fold</button>
                <button>Call</button>
                <button>Raise</button>
            </div>
        </div>
    );
};

export default PokerTable;
