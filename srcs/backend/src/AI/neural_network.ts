/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   neural_network.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 06:59:30 by yohan             #+#    #+#             */
/*   Updated: 2025/11/12 17:55:32 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as fs from 'fs';

export type state = {
    X_pos: number,
    Y_pos: number,
    Z_pos: number,
    Vx: number,
    Vy: number,
    Vz: number,
    X_paddle: number,
    Y_paddle: number,
    paddle_speed: number,
    paddle_width: number,
    paddle_height: number
};

export type state_intercept = {
    X_pos: number,
    Y_pos: number,
    Z_pos: number,
    Vx: number,
    Vy: number,
    Vz: number,
    X_paddle: number,
    Y_paddle: number,
    paddle_speed: number,
    paddle_width: number,
    paddle_height: number,
    time_to_wall_x: number,
    time_to_wall_y: number,
    x_dist_to_paddle: number,
    y_dist_to_paddle: number
};

export type action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-right'
  | 'up-left'
  | 'down-right'
  | 'down-left'
  | 'none';

export const actions: action[] = [
  'up',
  'down',
  'left',
  'right',
  'up-right',
  'up-left',
  'down-right',
  'down-left',
  'none',
];



class neural_ai { // plays similarly to a human (can lose)
    public num_inputs = 10;
    public num_of_hidden_neurons = 12;
    public num_outputs = 9 //possible outcomes
    public learning_rate: number;
    public n_iter: number; // number of epochs

    public best_W_hidden_input: number[][] = [];
    public best_W_hidden_output: number[][] = [];
    public best_bias_hidden_layer: number[] = [];
    public best_bias_output_layer: number[] = [];
    public bestScore: number = -Infinity;

    //weights:
    public W_hidden_input: number[][] = []; // hidden_neurons * num_inputs
    public W_hidden_output: number[][] = []; // num_outputs * hidden_neurons
    public bias_hidden_layer: number[] = [];
    public bias_output_layer: number[] = []; //allows neurons to function even when all weights are 0

    //______________________________________________________________________________//
                                // keeping best weights //
    //______________________________________________________________________________//

    public saveBestWeights() {
        this.best_W_hidden_input = JSON.parse(JSON.stringify(this.W_hidden_input));
        this.best_W_hidden_output = JSON.parse(JSON.stringify(this.W_hidden_output));
        this.best_bias_hidden_layer = JSON.parse(JSON.stringify(this.bias_hidden_layer));
        this.best_bias_output_layer = JSON.parse(JSON.stringify(this.bias_output_layer));
    }

    // Restore best weights
    public loadBestWeights() {
        if (this.best_W_hidden_input.length === 0) return; // no best saved yet
        this.W_hidden_input = JSON.parse(JSON.stringify(this.best_W_hidden_input));
        this.W_hidden_output = JSON.parse(JSON.stringify(this.best_W_hidden_output));
        this.bias_hidden_layer = JSON.parse(JSON.stringify(this.best_bias_hidden_layer));
        this.bias_output_layer = JSON.parse(JSON.stringify(this.best_bias_output_layer));
    }

    // Save to disk
    public saveToFile(filename: string) {
        const data = {
            W_hidden_input: this.W_hidden_input,
            W_hidden_output: this.W_hidden_output,
            bias_hidden_layer: this.bias_hidden_layer,
            bias_output_layer: this.bias_output_layer
        };
        fs.writeFileSync(filename, JSON.stringify(data));
        console.log(`Weights saved to ${filename}`);
    }

    // Load from disk
    public loadFromFile(filename: string) {
        const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        this.W_hidden_input = data.W_hidden_input;
        this.W_hidden_output = data.W_hidden_output;
        this.bias_hidden_layer = data.bias_hidden_layer;
        this.bias_output_layer = data.bias_output_layer;
        console.log(`Weights loaded from ${filename}`);
    }

    // Optional: fit with tracking best score
    public fitWithTracking(states: state[], correctActions: action[], epochs = this.n_iter, scoreFunc?: (ai: neural_ai) => number) {
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
            if (scoreFunc) {
                const score = scoreFunc(this);
                if (score > this.bestScore) {
                    this.bestScore = score;
                    this.saveBestWeights();
                    console.log(`New best score: ${score.toFixed(2)} at epoch ${epoch + 1}`);
                    this.saveToFile('best_ai_weights.json');
                }
            }
        }
        // After training, restore best weights
        this.loadBestWeights();
    }
    //______________________________________________________________________________//
                                // mathematical helpers //
    //______________________________________________________________________________//
    
    public dotProduct(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error("Vectors must have the same length for dot product");
        }
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }
    
    private state_to_vector (state: state): number[] {
        return [ 
            state.X_pos, state.Y_pos, state.Z_pos,
            state.Vx, state.Vy, state.Vz,
            state.X_paddle, state.Y_paddle,
            state.paddle_speed, state.paddle_height
        ];
    }

    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }

    private softmax(logits: number[]): number[] {
        const maxLogit = Math.max(...logits); // for numerical stability
        const expScores = logits.map(v => Math.exp(v - maxLogit));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        return expScores.map(v => v / sumExp);
    }
    
    //______________________________________________________________________________//
                                // learning //
    //______________________________________________________________________________//
    
    constructor(learning_rate = 0.1) {
        this.W_hidden_input = Array(this.num_of_hidden_neurons).fill(0).map(() => Array(this.num_inputs).fill(0).map(() => Math.random() - 0.5));
        this.W_hidden_output = Array(this.num_outputs).fill(0).map(() => Array(this.num_of_hidden_neurons).fill(0).map(() => Math.random() - 0.5));
        this.bias_hidden_layer = Array(this.num_of_hidden_neurons).fill(0).map(() => Math.random() - 0.5);
        this.bias_output_layer = Array(this.num_outputs).fill(0).map(() => Math.random() - 0.5);
        this.learning_rate = learning_rate;
        this.n_iter = 100;
    }
    
    public predict(state: state): action {
        const input = this.state_to_vector(state);
        
        const hidden: number[] = [];
        for (let i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);     
        }
        
        const logits: number[] = [];
        for (let i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        const outputs = this.softmax(logits);
        
        let bestAction: action = 'none';
        let maxScore = -Infinity;
        let secondScore = -Infinity;
        let bestIndex = -1;
        let secondIndex = -1;

        for (let i = 0; i < outputs.length; i++) {
            if (outputs[i] > maxScore) {
                secondScore = maxScore;
                secondIndex = bestIndex;
                maxScore = outputs[i];
                bestIndex = i;
            } else if (outputs[i] > secondScore) {
                secondScore = outputs[i];
                secondIndex = i;
            }
        }

        const delta = 0.2;
        if (secondIndex !== -1 && maxScore - secondScore < delta) {
            const combo = [actions[bestIndex], actions[secondIndex]].sort().join('-');
            switch (combo) {
                case 'up-right': bestAction = 'up-right'; break;
                case 'up-left': bestAction = 'up-left'; break;
                case 'down-right': bestAction = 'down-right'; break;
                case 'down-left': bestAction = 'down-left'; break;
                default: bestAction = actions[bestIndex]; break;
            }
        }
        else
            bestAction = actions[bestIndex];
        return bestAction;
    };

    public single_fit(state: state, correctAction: action) {
        const input = this.state_to_vector(state);
        
        const hidden: number[] = [];
        for (let i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);     
        }
        
        const logits: number[] = [];
        for (let i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        const outputs = this.softmax(logits);
        
    // stochastic gradient descent: (is stochastic because I update after every pass)
        let target = [];
        // let error = [];
        for (let i = 0; i < this.num_outputs; i++) {
            target[i] = actions[i] === correctAction ? 1 : 0;
            // error[i] = target[i] - outputs[i];
        }

            //back propagation:
        const delta_output: number[] = [];
        for (let k = 0; k < this.num_outputs; k++) {
            delta_output[k] = target[k] - outputs[k];
        }

        const delta_hidden: number[] = [];
        for (let j = 0; j < this.num_of_hidden_neurons; j++) {
            let sum = 0;
            for (let k = 0; k < this.num_outputs; k++) {
                sum += delta_output[k] * this.W_hidden_output[k][j];
            }
            delta_hidden[j] = hidden[j] * (1 - hidden[j]) * sum; //sigmoid derivative * sum
        }
        
            // Update weights:
        for (let k = 0; k < this.num_outputs; k++) {
            for (let j = 0; j < this.num_of_hidden_neurons; j++) {
                this.W_hidden_output[k][j] += this.learning_rate * delta_output[k] * hidden[j];
            }
            this.bias_output_layer[k] += this.learning_rate * delta_output[k];
        }
        
        for (let j = 0; j < this.num_of_hidden_neurons; j++) {
            for (let i = 0; i < this.num_inputs; i++) {
                this.W_hidden_input[j][i] += this.learning_rate * delta_hidden[j] * input[i];
            }
            this.bias_hidden_layer[j] += this.learning_rate * delta_hidden[j];
        }
    }
    
    public fit(states: state[], correctActions: action[], epochs = this.n_iter) {
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
        }        
    };

    public partial_fit(){}; // to do 
}


class neural_intercept { // is acc OP, like it's not even funny. I'll need to add a shit ton of noise or reduce paddle speed to allow losses
    public num_inputs = 14;
    public num_of_hidden_neurons = 12;
    public num_outputs = 9 //possible outcomes
    public learning_rate: number;
    public n_iter: number; // number of epochs

    public best_W_hidden_input: number[][] = [];
    public best_W_hidden_output: number[][] = [];
    public best_bias_hidden_layer: number[] = [];
    public best_bias_output_layer: number[] = [];
    public bestScore: number = -Infinity;

    //weights:
    public W_hidden_input: number[][] = []; // hidden_neurons * num_inputs
    public W_hidden_output: number[][] = []; // num_outputs * hidden_neurons
    public bias_hidden_layer: number[] = [];
    public bias_output_layer: number[] = []; //allows neurons to function even when all weights are 0

    //______________________________________________________________________________//
                                // keeping best weights //
    //______________________________________________________________________________//

    public saveBestWeights() {
        this.best_W_hidden_input = JSON.parse(JSON.stringify(this.W_hidden_input));
        this.best_W_hidden_output = JSON.parse(JSON.stringify(this.W_hidden_output));
        this.best_bias_hidden_layer = JSON.parse(JSON.stringify(this.bias_hidden_layer));
        this.best_bias_output_layer = JSON.parse(JSON.stringify(this.bias_output_layer));
    }

    // Restore best weights
    public loadBestWeights() {
        if (this.best_W_hidden_input.length === 0) return; // no best saved yet
        this.W_hidden_input = JSON.parse(JSON.stringify(this.best_W_hidden_input));
        this.W_hidden_output = JSON.parse(JSON.stringify(this.best_W_hidden_output));
        this.bias_hidden_layer = JSON.parse(JSON.stringify(this.best_bias_hidden_layer));
        this.bias_output_layer = JSON.parse(JSON.stringify(this.best_bias_output_layer));
    }

    // Save to disk
    public saveToFile(filename: string) {
        const data = {
            W_hidden_input: this.W_hidden_input,
            W_hidden_output: this.W_hidden_output,
            bias_hidden_layer: this.bias_hidden_layer,
            bias_output_layer: this.bias_output_layer
        };
        fs.writeFileSync(filename, JSON.stringify(data));
        console.log(`Weights saved to ${filename}`);
    }

    // Load from disk
    public loadFromFile(filename: string) {
        const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        this.W_hidden_input = data.W_hidden_input;
        this.W_hidden_output = data.W_hidden_output;
        this.bias_hidden_layer = data.bias_hidden_layer;
        this.bias_output_layer = data.bias_output_layer;
        console.log(`Weights loaded from ${filename}`);
    }

    // Optional: fit with tracking best score
    public fitWithTracking(states: state_intercept[], correctActions: action[], epochs = this.n_iter, scoreFunc?: (ai: neural_intercept) => number) {
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
            if (scoreFunc) {
                const score = scoreFunc(this);
                if (score > this.bestScore) {
                    this.bestScore = score;
                    this.saveBestWeights();
                    console.log(`New best score: ${score.toFixed(2)} at epoch ${epoch + 1}`);
                    this.saveToFile('best_ai_weights_wall_bounces.json');
                }
            }
        }
        // After training, restore best weights
        this.loadBestWeights();
    }
    //______________________________________________________________________________//
                                // mathematical helpers //
    //______________________________________________________________________________//
    
    public dotProduct(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error("Vectors must have the same length for dot product");
        }
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }
    
    private state_to_vector (state: state_intercept): number[] {
        return [ 
            state.X_pos, state.Y_pos, state.Z_pos,
            state.Vx, state.Vy, state.Vz,
            state.X_paddle, state.Y_paddle,
            state.paddle_speed, state.paddle_height, 
            state.time_to_wall_x, state.time_to_wall_y,
            state.x_dist_to_paddle, state.y_dist_to_paddle
        ];
    }

    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }

    private softmax(logits: number[]): number[] {
        const maxLogit = Math.max(...logits); // for numerical stability
        const expScores = logits.map(v => Math.exp(v - maxLogit));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        return expScores.map(v => v / sumExp);
    }
    
    //______________________________________________________________________________//
                                // learning //
    //______________________________________________________________________________//
    
    constructor(learning_rate = 0.1) {
        this.W_hidden_input = Array(this.num_of_hidden_neurons).fill(0).map(() => Array(this.num_inputs).fill(0).map(() => Math.random() - 0.5));
        this.W_hidden_output = Array(this.num_outputs).fill(0).map(() => Array(this.num_of_hidden_neurons).fill(0).map(() => Math.random() - 0.5));
        this.bias_hidden_layer = Array(this.num_of_hidden_neurons).fill(0).map(() => Math.random() - 0.5);
        this.bias_output_layer = Array(this.num_outputs).fill(0).map(() => Math.random() - 0.5);
        this.learning_rate = learning_rate;
        this.n_iter = 100;
    }
    
    public predict(state: state_intercept): action {
        const input = this.state_to_vector(state);
        
        const hidden: number[] = [];
        for (let i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);     
        }
        
        const logits: number[] = [];
        for (let i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        const outputs = this.softmax(logits);
        
        let bestAction: action = 'none';
        let maxScore = -Infinity;
        let secondScore = -Infinity;
        let bestIndex = -1;
        let secondIndex = -1;

        for (let i = 0; i < outputs.length; i++) {
            if (outputs[i] > maxScore) {
                secondScore = maxScore;
                secondIndex = bestIndex;
                maxScore = outputs[i];
                bestIndex = i;
            } else if (outputs[i] > secondScore) {
                secondScore = outputs[i];
                secondIndex = i;
            }
        }

        const delta = 0.2;
        if (secondIndex !== -1 && maxScore - secondScore < delta) {
            const combo = [actions[bestIndex], actions[secondIndex]].sort().join('-');
            switch (combo) {
                case 'up-right': bestAction = 'up-right'; break;
                case 'up-left': bestAction = 'up-left'; break;
                case 'down-right': bestAction = 'down-right'; break;
                case 'down-left': bestAction = 'down-left'; break;
                default: bestAction = actions[bestIndex]; break;
            }
        }
        else
            bestAction = actions[bestIndex];
        return bestAction;
    };

    public single_fit(state: state_intercept, correctAction: action) {
        const input = this.state_to_vector(state);
        
        const hidden: number[] = [];
        for (let i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);     
        }
        
        const logits: number[] = [];
        for (let i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        const outputs = this.softmax(logits);
        
    // stochastic gradient descent: (is stochastic because I update after every pass)
        let target = [];
        for (let i = 0; i < this.num_outputs; i++) {
            target[i] = actions[i] === correctAction ? 1 : 0;
        }

            //back propagation:
        const delta_output: number[] = [];
        for (let k = 0; k < this.num_outputs; k++) {
            delta_output[k] = target[k] - outputs[k];
        }

        const delta_hidden: number[] = [];
        for (let j = 0; j < this.num_of_hidden_neurons; j++) {
            let sum = 0;
            for (let k = 0; k < this.num_outputs; k++) {
                sum += delta_output[k] * this.W_hidden_output[k][j];
            }
            delta_hidden[j] = hidden[j] * (1 - hidden[j]) * sum; //sigmoid derivative * sum
        }
        
            // Update weights:
        for (let k = 0; k < this.num_outputs; k++) {
            for (let j = 0; j < this.num_of_hidden_neurons; j++) {
                this.W_hidden_output[k][j] += this.learning_rate * delta_output[k] * hidden[j];
            }
            this.bias_output_layer[k] += this.learning_rate * delta_output[k];
        }
        
        for (let j = 0; j < this.num_of_hidden_neurons; j++) {
            for (let i = 0; i < this.num_inputs; i++) {
                this.W_hidden_input[j][i] += this.learning_rate * delta_hidden[j] * input[i];
            }
            this.bias_hidden_layer[j] += this.learning_rate * delta_hidden[j];
        }
    }
    
    public fit(states: state_intercept[], correctActions: action[], epochs = this.n_iter) {
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
        }        
    };

    public predictIntercept(X_pos: number, Y_pos: number, Z_pos: number, Vx: number, Vy: number, Vz: number, paddleV: number, gameW: number, gameH: number, gameD: number) {
        const gameAreaSize = { width: gameW, height: gameH, depth: gameD };
        let x = X_pos, y = Y_pos, z = Z_pos;
        let vx = Vx, vy = Vy, vz = Vz;

        let iterations = 0;
        const maxIterations = 100;

        while (iterations < maxIterations) {
            if (vz >= 0 || z <= paddleV) return { x, y };

            const t = (paddleV - z) / vz;

            // Time to hit walls
            let tx = Infinity, ty = Infinity;
            if (vx > 0) tx = (gameAreaSize.width / 2 - x) / vx;
            else if (vx < 0) tx = (-gameAreaSize.width / 2 - x) / vx;
            if (vy > 0) ty = (gameAreaSize.height / 2 - y) / vy;
            else if (vy < 0) ty = (-gameAreaSize.height / 2 - y) / vy;

            const tWall = Math.min(tx, ty);

            if (t < tWall) {
                return { x: x + vx * t, y: y + vy * t };
            } else {
                if (tx < ty) {
                    x += vx * tx; y += vy * tx; z += vz * tx;
                    vx *= -1;
                } else {
                    x += vx * ty; y += vy * ty; z += vz * ty;
                    vy *= -1;
                }
            }
            iterations++;
        }

        return { x, y };
    }

    public  getState(ballX: number, ballY: number, ballZ: number, Vx: number, Vy: number, Vz: number, paddleX: number, paddleY: number, paddleSpeed: number, paddleW: number, paddleH: number, areaW: number, areaH: number, areaD: number): state_intercept {
        
        let maxTime = 50;
        let wall_x = Vx > 0 ? areaW / 2 : -areaW / 2;
        let wall_y = Vy > 0 ? areaH / 2 : -areaH / 2;
        
        let d_wall_x = wall_x - ballX;
        let d_wall_y = wall_y - ballY;
        
        let time_to_wall_x = Vx !== 0 ? d_wall_x / Vx : Infinity;
        let time_to_wall_y = Vy !== 0 ? d_wall_y / Vy : Infinity;
        
        time_to_wall_x = Math.min(Math.max(time_to_wall_x / maxTime, 0), 1);
        time_to_wall_y = Math.min(Math.max(time_to_wall_y / maxTime, 0), 1);
        
        const intercept = this.predictIntercept(ballX, ballY, ballZ, Vx, Vy, Vz, paddleSpeed, areaW, areaH, areaD);
        
        const dx = intercept.x - paddleX;
        const dy = intercept.y - paddleY;
        
        const x_dist_to_paddle = dx / areaW;
        const y_dist_to_paddle = dy / areaH;
        
        const state: state_intercept = {
                                            X_pos: ballX, 
                                            Y_pos: ballY,
                                            Z_pos: ballZ,
                                            Vx: Vx,
                                            Vy: Vy,
                                            Vz: Vz,
                                            X_paddle: paddleX,
                                            Y_paddle: paddleY,
                                            paddle_speed: paddleSpeed,
                                            paddle_height: paddleH,
                                            paddle_width: paddleW,
                                            time_to_wall_x: time_to_wall_x,
                                            time_to_wall_y: time_to_wall_y,
                                            x_dist_to_paddle: x_dist_to_paddle,
                                            y_dist_to_paddle: y_dist_to_paddle
                                        };
        return state;
    }

    public partial_fit(){}; // to do 
}

export default neural_ai;
export {neural_intercept};