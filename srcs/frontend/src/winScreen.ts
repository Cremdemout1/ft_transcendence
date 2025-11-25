import { checkLoginState } from "./dashboard";

async function renderWinScreen(playerIdx: string) {
    // await checkLoginState("http://localhost:8080/api/gameEnd");
    const app = document.getElementById("app");
    if (!app) return;
    const storage = localStorage.getItem("lastMatchWinner");
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
            <a href="#dashboard" class="btn">Signup instead</a>
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