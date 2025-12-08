import { getUsernameFromJwt } from "./chat";
import { checkLoginState } from "./dashboard";

async function renderWinScreen() { // playerIDX is undefined
    await checkLoginState(null);
    const winner = sessionStorage.getItem("lastMatchWinner");
    let self;
    if (sessionStorage.getItem("vanilla") === "1") {
        if (winner === "PLAYER 1 -RED-")
            self = "player 2 -BLUE-";
        else
            self = "player 1 -RED-";
    }
    else
        self = getUsernameFromJwt();
    if (!winner || winner === "-1")
        location.href = "#dashboard";
    const app = document.getElementById("app");
    if (!app) return;
    // If server provided a custom message (e.g. forfeit), show it instead of generic text
    const customMsg = sessionStorage.getItem('lastMatchMessage');
    let congratulations: string;
    if (customMsg) {
        if (winner === self) {
            congratulations = `<strong>${self}</strong><h3>${customMsg}</h3>`;
        } else {
            congratulations = `<h3>${customMsg}</h3><h4><strong>${winner}</strong></h4>`;
        }
        // remove after consumption so it doesn't persist
        sessionStorage.removeItem('lastMatchMessage');
    } else {
        if (winner === self)
            congratulations = `Congratulations<br></br><strong>${self}!</strong> <h3>You fought hard, surmounted obstacles and returned victorious!</h3>`;
        else
            congratulations = `<strong>${self}</strong><h3>You fought like a true warrior... Unfortunately</h3> <h4><strong>${winner}</strong></h4> <h3>got the best of you this time!</h3>`;
    }
    
    app.innerHTML = `
        <div class="menu-container">
            <h2>${congratulations}</h2>
            <a href="#dashboard" class="btn">Back to Dashboard</a>
        </div>
    `;
	sessionStorage.setItem('ended', '1');

	// sessionStorage.removeItem('lastMatchWinner');
	// sessionStorage.removeItem('roomCode');
	// sessionStorage.removeItem('numPlayers');
	// sessionStorage.removeItem('vanilla');
}


//win screen contains:
// congratulations message
// winner username or alias
// befriend winner
// play again
// back to menu (dashboard)

export { renderWinScreen };