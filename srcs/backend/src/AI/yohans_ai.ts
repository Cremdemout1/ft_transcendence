/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   yohans_ai.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 06:59:30 by yohan             #+#    #+#             */
/*   Updated: 2025/09/04 10:00:20 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// const difficulty: number = 1.0;
// const paddle_speed: number = 0.1;

// const dataset: { state: state; correctAction: action }[] = [
//     // Ball above paddle -> move up
//     { state: { X_pos: 0.5, Y_pos: 0.6, Z_pos: 0, X_paddle: 0.5, Y_paddle: 0.2}, correctAction: 'up' },
    
//     // Ball below paddle -> move down
//     { state: { X_pos: 0.5, Y_pos: 0.1, Z_pos: 0, X_paddle: 0.5, Y_paddle: 0.5}, correctAction: 'down' },
    
//     // Ball to the right -> move right
//     { state: { X_pos: 0.7, Y_pos: 0.5, Z_pos: 0, X_paddle: 0.3, Y_paddle: 0.5}, correctAction: 'right' },
    
//     // Ball to the left -> move left
//     { state: { X_pos: 0.2, Y_pos: 0.5, Z_pos: 0, X_paddle: 0.5, Y_paddle: 0.5}, correctAction: 'left' },
    
//     // Paddle aligned with ball -> no movement
//     { state: { X_pos: 0.5, Y_pos: 0.5, Z_pos: 0, X_paddle: 0.5, Y_paddle: 0.5}, correctAction: 'none' },
  
//     // Ball diagonally up-right
//     { state: { X_pos: 0.7, Y_pos: 0.6, Z_pos: 0, X_paddle: 0.4, Y_paddle: 0.3}, correctAction: 'up' },
  
//     // Ball diagonally down-left
//     { state: { X_pos: 0.2, Y_pos: 0.1, Z_pos: 0, X_paddle: 0.5, Y_paddle: 0.5}, correctAction: 'down' },
//   ];

type state = {
    X_pos: number,
    Y_pos: number,
    Z_pos: number,
    X_paddle: number,
    Y_paddle: number,
}

type action = 'up' | 'down' | 'left' | 'right' | 'none';
const actions: action[] = ['up', 'down', 'left', 'right', 'none'];
// type ActionVector = [up: number, down: number, left: number, right: number, none: number];


class learning_ai_opponent {
    // private gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
    public up_weights: number[];
    public down_weights: number[];
    public left_weights: number[];
    public right_weights: number[];
    public none_weights: number[];
    public learning_rate: number;
    public n_iter: number; // number of epochs

    private state_to_vector (state: state): number[] {
        return [
            1, //bias is always the first (0)
            state.X_pos,
            state.Y_pos,
            state.Z_pos,
            state.X_paddle,
            state.Y_paddle,
        ];
    }

    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }

    private sigmoidDerivative(x: number): number {
        const s = this.sigmoid(x);
        return s * (1 - s);
    }
    
    // private actionToVector(act: action): ActionVector {
    //     return [
    //         act === 'up' ? 1 : 0,
    //         act === 'down' ? 1 : 0,
    //         act === 'left' ? 1 : 0,
    //         act === 'right' ? 1 : 0,
    //         act === 'none' ? 1 : 0
    //     ];
    // }
    
    constructor(learning_rate = 0.01) {
        this.up_weights = Array(6).fill(0).map(() => Math.random() - 0.5);
        this.down_weights = Array(6).fill(0).map(() => Math.random() - 0.5);
        this.left_weights = Array(6).fill(0).map(() => Math.random() - 0.5);
        this.right_weights = Array(6).fill(0).map(() => Math.random() - 0.5);
        this.none_weights = Array(6).fill(0).map(() => Math.random() - 0.5);
        this.learning_rate = learning_rate;
        this.n_iter = 20;
    }
    
    public predict(state: state): action {
        const input = this.state_to_vector(state);
        const results: Record<action, number> = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            none: 0
        };
        for (const act of actions) {
            let sum = 0;
            const weights = (() => {
                switch(act) {
                    case 'up': return this.up_weights;
                    case 'down': return this.down_weights;
                    case 'left': return this.left_weights;
                    case 'right': return this.right_weights;
                    case 'none': return this.none_weights;
                }})();
            for (let i = 1; i < input.length; i++)
                sum += input[i] * weights[i];
            
            results[act] = this.sigmoid(sum);
        }
        let bestAction: action = 'none';
        let maxScore = -Infinity;
        for (const act of actions)
            if (results[act] > maxScore) {
                maxScore = results[act];
                bestAction = act;
            }
        return bestAction;    
    };
    
    private single_fit(state: state, correctAction: action) {
        const input = this.state_to_vector(state);
        // const targetVector = this.actionToVector(correctAction);
        
        const results: Record<action, number> = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            none: 0
        };
                
        for (const act of actions) {
            let sum = 0;
            const weights = (() => {
                switch(act) {
                    case 'up': return this.up_weights;
                    case 'down': return this.down_weights;
                    case 'left': return this.left_weights;
                    case 'right': return this.right_weights;
                    case 'none': return this.none_weights;
                }})();
            for (let i = 1; i < input.length; i++)
                sum += input[i] * weights[i];
            results[act] = sum;
            
            //gradient descent:
            const output = this.sigmoid(sum);
            const target = act === correctAction ? 1 : 0;
            const error = target - output;
            for (let i = 0; i < weights.length; i++)
                weights[i] += this.learning_rate * error * this.sigmoidDerivative(sum) * input[i];
        }
    };
    
    public fit(states: Array<state>, correctActions: Array<action>, epochs = this.n_iter) {
        
        for (const i in states) {
            for (let iteration = 0; iteration < epochs; iteration++) {
                this.single_fit(states[i], correctActions[i]);
            }
        }            
    }
}

export default learning_ai_opponent;
  
//   function simulateTrainingData(numSamples: number = 500) {
//     const gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
  
//     const states: state[] = [];
//     const correctActions: action[] = [];
  
//     for (let i = 0; i < numSamples; i++) {
//       // Random ball position
//       let X_pos = (Math.random() - 0.5) * gameArea.width;
//       let Y_pos = (Math.random() - 0.5) * gameArea.height;
//       let Z_pos = (Math.random() - 0.5) * gameArea.depth;
  
//       // Random paddle position
//       let X_paddle = (Math.random() - 0.5) * gameArea.width;
//       let Y_paddle = (Math.random() - 0.5) * gameArea.height;
  
//       // Determine correct action
//       let moveX = Math.abs(X_pos - X_paddle) > 0.05 ? (X_pos > X_paddle ? 'right' : 'left') : 'none';
//       let moveY = Math.abs(Y_pos - Y_paddle) > 0.05 ? (Y_pos > Y_paddle ? 'up' : 'down') : 'none';
  
//       // Prioritize vertical movement if ball is far vertically, else horizontal
//       let chosenAction: action;
//       if (moveY !== 'none') chosenAction = moveY as action;
//       else if (moveX !== 'none') chosenAction = moveX as action;
//       else chosenAction = 'none';
  
//       states.push({ X_pos, Y_pos, Z_pos, X_paddle, Y_paddle });
//       correctActions.push(chosenAction);
//     }
  
//     return { states, correctActions };
//   }
  
//   const { states, correctActions } = simulateTrainingData(1000);
//   const ai = new learning_ai_opponent();
//   ai.fit(states, correctActions, 500);
  
//   // Compare predictions vs correct actions
//   for (let i = 0; i < 20; i++) { // just print first 20 for readability
//       const predicted = ai.predict(states[i]);
//       const correct = correctActions[i];
//       console.log(`Sample ${i + 1}: Predicted = ${predicted}, Correct = ${correct}`);
//   }
  
//   // Optional: compute accuracy
//   let correctCount = 0;
//   for (let i = 0; i < states.length; i++) {
//       if (ai.predict(states[i]) === correctActions[i]) correctCount++;
//   }
//   console.log(`Accuracy: ${(correctCount / states.length * 100).toFixed(2)}%`);


function simulateWallBounceData(numSamples: number = 200) {
    const gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
    const states: state[] = [];
    const correctActions: action[] = [];

    for (let i = 0; i < numSamples; i++) {
        // Random paddle position
        const X_paddle = (Math.random() - 0.5) * gameArea.width;
        const Y_paddle = (Math.random() - 0.5) * gameArea.height;

        // Ball near top or bottom wall
        const nearTop = Math.random() < 0.5;
        const Y_pos = nearTop ? gameArea.height / 2 - 0.02 : -gameArea.height / 2 + 0.02;
        const X_pos = (Math.random() - 0.5) * gameArea.width;
        const Z_pos = (Math.random() - 0.5) * gameArea.depth;

        // Decide correct action: if ball is above paddle -> move up, below -> move down
        let chosenAction: action;
        if (Y_pos > Y_paddle + 0.05) chosenAction = 'up';
        else if (Y_pos < Y_paddle - 0.05) chosenAction = 'down';
        else chosenAction = 'none';

        states.push({ X_pos, Y_pos, Z_pos, X_paddle, Y_paddle });
        correctActions.push(chosenAction);
    }

    return { states, correctActions };
}

// Usage example
const { states: wallStates, correctActions: wallActions } = simulateWallBounceData(300);
const ai = new learning_ai_opponent();
ai.fit(wallStates, wallActions, 500);

// Check predictions near walls and log first 20
for (let i = 0; i < 20; i++) {
    const predicted = ai.predict(wallStates[i]);
    console.log(`Wall Sample ${i + 1}: Predicted = ${predicted}, Correct = ${wallActions[i]}`);
}

// Compute overall accuracy for the wall-bounce dataset
let correctCount = 0;
for (let i = 0; i < wallStates.length; i++) {
    if (ai.predict(wallStates[i]) === wallActions[i]) correctCount++;
}

console.log(`Wall-bounce dataset Accuracy: ${(correctCount / wallStates.length * 100).toFixed(2)}%`);
