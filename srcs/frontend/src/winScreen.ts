import { checkLoginState } from "./dashboard";

async function renderWinScreen(playerIdx: string) {
    const storage = localStorage.getItem("lastMatchWinner");
    if (!storage)
        location.href = "#dashboard";
    const app = document.getElementById("app");
    if (!app) return;
    const winner = storage ? JSON.parse(storage) : null;
    // { winnerIdx: winner, winnerSocketId }
    let congratulations: string;
    if (winner && winner.winnerIdx === playerIdx)
        congratulations = `Congratulations! You fought hard, surmounted obstacles and returned victorious!`;
    else
        congratulations = "Fought like a true warrior... Better luck next time!"
    
    app.innerHTML = `
        <div class="menu-container">
            <h1>${congratulations}</h1>
            <a href="#dashboard" class="btn">Back to Dashboard</a>
        </div>
    `;
}

//win screen contains:
// congratulations message
// winner username or alias
// befriend winner
// play again
// back to menu (dashboard)

export { renderWinScreen };