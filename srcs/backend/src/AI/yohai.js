"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   neural_network.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 06:59:30 by yohan             #+#    #+#             */
/*   Updated: 2025/11/19 22:55:46 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
exports.neural_intercept = exports.actions = void 0;
var fs = require("fs");
exports.actions = [
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
var neural_ai = /** @class */ (function () {
    //______________________________________________________________________________//
    // learning //
    //______________________________________________________________________________//
    function neural_ai(learning_rate) {
        if (learning_rate === void 0) { learning_rate = 0.1; }
        var _this = this;
        this.num_inputs = 10;
        this.num_of_hidden_neurons = 12;
        this.num_outputs = 9; //possible outcomes
        this.best_W_hidden_input = [];
        this.best_W_hidden_output = [];
        this.best_bias_hidden_layer = [];
        this.best_bias_output_layer = [];
        this.bestScore = -Infinity;
        //weights:
        this.W_hidden_input = []; // hidden_neurons * num_inputs
        this.W_hidden_output = []; // num_outputs * hidden_neurons
        this.bias_hidden_layer = [];
        this.bias_output_layer = []; //allows neurons to function even when all weights are 0
        this.W_hidden_input = Array(this.num_of_hidden_neurons).fill(0).map(function () { return Array(_this.num_inputs).fill(0).map(function () { return Math.random() - 0.5; }); });
        this.W_hidden_output = Array(this.num_outputs).fill(0).map(function () { return Array(_this.num_of_hidden_neurons).fill(0).map(function () { return Math.random() - 0.5; }); });
        this.bias_hidden_layer = Array(this.num_of_hidden_neurons).fill(0).map(function () { return Math.random() - 0.5; });
        this.bias_output_layer = Array(this.num_outputs).fill(0).map(function () { return Math.random() - 0.5; });
        this.learning_rate = learning_rate;
        this.n_iter = 100;
    }
    //______________________________________________________________________________//
    // keeping best weights //
    //______________________________________________________________________________//
    neural_ai.prototype.saveBestWeights = function () {
        this.best_W_hidden_input = JSON.parse(JSON.stringify(this.W_hidden_input));
        this.best_W_hidden_output = JSON.parse(JSON.stringify(this.W_hidden_output));
        this.best_bias_hidden_layer = JSON.parse(JSON.stringify(this.bias_hidden_layer));
        this.best_bias_output_layer = JSON.parse(JSON.stringify(this.bias_output_layer));
    };
    // Restore best weights
    neural_ai.prototype.loadBestWeights = function () {
        if (this.best_W_hidden_input.length === 0)
            return; // no best saved yet
        this.W_hidden_input = JSON.parse(JSON.stringify(this.best_W_hidden_input));
        this.W_hidden_output = JSON.parse(JSON.stringify(this.best_W_hidden_output));
        this.bias_hidden_layer = JSON.parse(JSON.stringify(this.best_bias_hidden_layer));
        this.bias_output_layer = JSON.parse(JSON.stringify(this.best_bias_output_layer));
    };
    // Save to disk
    neural_ai.prototype.saveToFile = function (filename) {
        var data = {
            W_hidden_input: this.W_hidden_input,
            W_hidden_output: this.W_hidden_output,
            bias_hidden_layer: this.bias_hidden_layer,
            bias_output_layer: this.bias_output_layer
        };
        fs.writeFileSync(filename, JSON.stringify(data));
        console.log("Weights saved to ".concat(filename));
    };
    // Load from disk
    neural_ai.prototype.loadFromFile = function (filename) {
        var data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        this.W_hidden_input = data.W_hidden_input;
        this.W_hidden_output = data.W_hidden_output;
        this.bias_hidden_layer = data.bias_hidden_layer;
        this.bias_output_layer = data.bias_output_layer;
        console.log("Weights loaded from ".concat(filename));
    };
    // Optional: fit with tracking best score
    neural_ai.prototype.fitWithTracking = function (states, correctActions, epochs, scoreFunc) {
        if (epochs === void 0) { epochs = this.n_iter; }
        for (var epoch = 0; epoch < epochs; epoch++) {
            for (var i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
            if (scoreFunc) {
                var score = scoreFunc(this);
                if (score > this.bestScore) {
                    this.bestScore = score;
                    this.saveBestWeights();
                    console.log("New best score: ".concat(score.toFixed(2), " at epoch ").concat(epoch + 1));
                    this.saveToFile('best_ai_weights.json');
                }
            }
        }
        // After training, restore best weights
        this.loadBestWeights();
    };
    //______________________________________________________________________________//
    // mathematical helpers //
    //______________________________________________________________________________//
    neural_ai.prototype.dotProduct = function (a, b) {
        if (a.length !== b.length) {
            throw new Error("Vectors must have the same length for dot product");
        }
        var sum = 0;
        for (var i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    };
    neural_ai.prototype.state_to_vector = function (state) {
        return [
            state.X_pos, state.Y_pos, state.Z_pos,
            state.Vx, state.Vy, state.Vz,
            state.X_paddle, state.Y_paddle,
            state.paddle_speed, state.paddle_height
        ];
    };
    neural_ai.prototype.sigmoid = function (x) {
        return 1 / (1 + Math.exp(-x));
    };
    neural_ai.prototype.softmax = function (logits) {
        var maxLogit = Math.max.apply(Math, logits); // for numerical stability
        var expScores = logits.map(function (v) { return Math.exp(v - maxLogit); });
        var sumExp = expScores.reduce(function (a, b) { return a + b; }, 0);
        return expScores.map(function (v) { return v / sumExp; });
    };
    neural_ai.prototype.predict = function (state) {
        var input = this.state_to_vector(state);
        var hidden = [];
        for (var i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);
        }
        var logits = [];
        for (var i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        var outputs = this.softmax(logits);
        var bestAction = 'none';
        var maxScore = -Infinity;
        var secondScore = -Infinity;
        var bestIndex = -1;
        var secondIndex = -1;
        for (var i = 0; i < outputs.length; i++) {
            if (outputs[i] > maxScore) {
                secondScore = maxScore;
                secondIndex = bestIndex;
                maxScore = outputs[i];
                bestIndex = i;
            }
            else if (outputs[i] > secondScore) {
                secondScore = outputs[i];
                secondIndex = i;
            }
        }
        var delta = 0.2;
        if (secondIndex !== -1 && maxScore - secondScore < delta) {
            var combo = [exports.actions[bestIndex], exports.actions[secondIndex]].sort().join('-');
            switch (combo) {
                case 'up-right':
                    bestAction = 'up-right';
                    break;
                case 'up-left':
                    bestAction = 'up-left';
                    break;
                case 'down-right':
                    bestAction = 'down-right';
                    break;
                case 'down-left':
                    bestAction = 'down-left';
                    break;
                default:
                    bestAction = exports.actions[bestIndex];
                    break;
            }
        }
        else
            bestAction = exports.actions[bestIndex];
        return bestAction;
    };
    ;
    neural_ai.prototype.single_fit = function (state, correctAction) {
        var input = this.state_to_vector(state);
        var hidden = [];
        for (var i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);
        }
        var logits = [];
        for (var i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        var outputs = this.softmax(logits);
        // stochastic gradient descent: (is stochastic because I update after every pass)
        var target = [];
        // let error = [];
        for (var i = 0; i < this.num_outputs; i++) {
            target[i] = exports.actions[i] === correctAction ? 1 : 0;
            // error[i] = target[i] - outputs[i];
        }
        //back propagation:
        var delta_output = [];
        for (var k = 0; k < this.num_outputs; k++) {
            delta_output[k] = target[k] - outputs[k];
        }
        var delta_hidden = [];
        for (var j = 0; j < this.num_of_hidden_neurons; j++) {
            var sum = 0;
            for (var k = 0; k < this.num_outputs; k++) {
                sum += delta_output[k] * this.W_hidden_output[k][j];
            }
            delta_hidden[j] = hidden[j] * (1 - hidden[j]) * sum; //sigmoid derivative * sum
        }
        // Update weights:
        for (var k = 0; k < this.num_outputs; k++) {
            for (var j = 0; j < this.num_of_hidden_neurons; j++) {
                this.W_hidden_output[k][j] += this.learning_rate * delta_output[k] * hidden[j];
            }
            this.bias_output_layer[k] += this.learning_rate * delta_output[k];
        }
        for (var j = 0; j < this.num_of_hidden_neurons; j++) {
            for (var i = 0; i < this.num_inputs; i++) {
                this.W_hidden_input[j][i] += this.learning_rate * delta_hidden[j] * input[i];
            }
            this.bias_hidden_layer[j] += this.learning_rate * delta_hidden[j];
        }
    };
    neural_ai.prototype.fit = function (states, correctActions, epochs) {
        if (epochs === void 0) { epochs = this.n_iter; }
        for (var epoch = 0; epoch < epochs; epoch++) {
            for (var i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
        }
    };
    ;
    neural_ai.prototype.partial_fit = function () { };
    ; // to do 
    return neural_ai;
}());
var neural_intercept = /** @class */ (function () {
    //______________________________________________________________________________//
    // learning //
    //______________________________________________________________________________//
    function neural_intercept(learning_rate) {
        if (learning_rate === void 0) { learning_rate = 0.1; }
        var _this = this;
        this.num_inputs = 14;
        this.num_of_hidden_neurons = 25;
        this.num_outputs = 9; //possible outcomes
        this.best_W_hidden_input = [];
        this.best_W_hidden_output = [];
        this.best_bias_hidden_layer = [];
        this.best_bias_output_layer = [];
        this.bestScore = -Infinity;
        this.loss = 0;
        this.outputs = [];
        this.target = [];
        //weights:
        this.W_hidden_input = []; // hidden_neurons * num_inputs
        this.W_hidden_output = []; // num_outputs * hidden_neurons
        this.bias_hidden_layer = [];
        this.bias_output_layer = []; //allows neurons to function even when all weights are 0
        this.W_hidden_input = Array(this.num_of_hidden_neurons).fill(0).map(function () { return Array(_this.num_inputs).fill(0).map(function () { return Math.random() - 0.5; }); });
        this.W_hidden_output = Array(this.num_outputs).fill(0).map(function () { return Array(_this.num_of_hidden_neurons).fill(0).map(function () { return Math.random() - 0.5; }); });
        this.bias_hidden_layer = Array(this.num_of_hidden_neurons).fill(0).map(function () { return Math.random() - 0.5; });
        this.bias_output_layer = Array(this.num_outputs).fill(0).map(function () { return Math.random() - 0.5; });
        this.learning_rate = learning_rate;
        this.n_iter = 100;
    }
    //______________________________________________________________________________//
    // keeping best weights //
    //______________________________________________________________________________//
    neural_intercept.prototype.saveBestWeights = function () {
        this.best_W_hidden_input = JSON.parse(JSON.stringify(this.W_hidden_input));
        this.best_W_hidden_output = JSON.parse(JSON.stringify(this.W_hidden_output));
        this.best_bias_hidden_layer = JSON.parse(JSON.stringify(this.bias_hidden_layer));
        this.best_bias_output_layer = JSON.parse(JSON.stringify(this.bias_output_layer));
    };
    // Restore best weights
    neural_intercept.prototype.loadBestWeights = function () {
        if (this.best_W_hidden_input.length === 0)
            return; // no best saved yet
        this.W_hidden_input = JSON.parse(JSON.stringify(this.best_W_hidden_input));
        this.W_hidden_output = JSON.parse(JSON.stringify(this.best_W_hidden_output));
        this.bias_hidden_layer = JSON.parse(JSON.stringify(this.best_bias_hidden_layer));
        this.bias_output_layer = JSON.parse(JSON.stringify(this.best_bias_output_layer));
    };
    // Save to disk
    neural_intercept.prototype.saveToFile = function (filename) {
        var data = {
            W_hidden_input: this.W_hidden_input,
            W_hidden_output: this.W_hidden_output,
            bias_hidden_layer: this.bias_hidden_layer,
            bias_output_layer: this.bias_output_layer
        };
        fs.writeFileSync(filename, JSON.stringify(data));
        console.log("Weights saved to ".concat(filename));
    };
    // Load from disk
    neural_intercept.prototype.loadFromFile = function (filename) {
        var data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        this.W_hidden_input = data.W_hidden_input;
        this.W_hidden_output = data.W_hidden_output;
        this.bias_hidden_layer = data.bias_hidden_layer;
        this.bias_output_layer = data.bias_output_layer;
        console.log("Weights loaded from ".concat(filename));
    };
    // Optional: fit with tracking best score
    neural_intercept.prototype.fitWithTracking = function (states, correctActions, epochs, scoreFunc) {
        if (epochs === void 0) { epochs = this.n_iter; }
        for (var epoch = 0; epoch < epochs; epoch++) {
            for (var i = 0; i < states.length; i++) {
                this.single_fit(states[i], correctActions[i]);
            }
            if (scoreFunc) {
                var score = scoreFunc(this);
                if (score > this.bestScore) {
                    this.bestScore = score;
                    this.saveBestWeights();
                    console.log("New best score: ".concat(score.toFixed(2), " at epoch ").concat(epoch + 1));
                    this.saveToFile('best_ai_weights_wall_bounces.json');
                }
            }
        }
        // After training, restore best weights
        this.loadBestWeights();
    };
    //______________________________________________________________________________//
    // mathematical helpers //
    //______________________________________________________________________________//
    neural_intercept.prototype.dotProduct = function (a, b) {
        if (a.length !== b.length) {
            throw new Error("Vectors must have the same length for dot product");
        }
        var sum = 0;
        for (var i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    };
    neural_intercept.prototype.state_to_vector = function (state) {
        return [
            state.X_pos / 50, state.Y_pos / 50, state.Z_pos / 50,
            state.Vx / 0.5, state.Vy / 0.5, state.Vz / 0.5,
            state.X_paddle / 50, state.Y_paddle / 50,
            state.paddle_speed, state.paddle_height / 20,
            state.time_to_wall_x, state.time_to_wall_y,
            state.x_dist_to_paddle / 50, state.y_dist_to_paddle / 50
        ];
    };
    neural_intercept.prototype.sigmoid = function (x) {
        return 1 / (1 + Math.exp(-x));
    };
    neural_intercept.prototype.softmax = function (logits) {
        var maxLogit = Math.max.apply(Math, logits); // for numerical stability
        var expScores = logits.map(function (v) { return Math.exp(v - maxLogit); });
        var sumExp = expScores.reduce(function (a, b) { return a + b; }, 0);
        return expScores.map(function (v) { return v / sumExp; });
    };
    neural_intercept.prototype.predict = function (state) {
        var input = this.state_to_vector(state);
        var hidden = [];
        for (var i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);
        }
        var logits = [];
        for (var i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        var outputs = this.softmax(logits);
        var bestAction = 'none';
        var maxScore = -Infinity;
        var secondScore = -Infinity;
        var bestIndex = -1;
        var secondIndex = -1;
        for (var i = 0; i < outputs.length; i++) {
            if (outputs[i] > maxScore) {
                secondScore = maxScore;
                secondIndex = bestIndex;
                maxScore = outputs[i];
                bestIndex = i;
            }
            else if (outputs[i] > secondScore) {
                secondScore = outputs[i];
                secondIndex = i;
            }
        }
        var delta = 0.2;
        if (secondIndex !== -1 && maxScore - secondScore < delta) {
            var combo = [exports.actions[bestIndex], exports.actions[secondIndex]].sort().join('-');
            switch (combo) {
                case 'up-right':
                    bestAction = 'up-right';
                    break;
                case 'up-left':
                    bestAction = 'up-left';
                    break;
                case 'down-right':
                    bestAction = 'down-right';
                    break;
                case 'down-left':
                    bestAction = 'down-left';
                    break;
                default:
                    bestAction = exports.actions[bestIndex];
                    break;
            }
        }
        else
            bestAction = exports.actions[bestIndex];
        return bestAction;
    };
    ;
    neural_intercept.prototype.single_fit = function (state, correctAction) {
        var accuracy = 0;
        var input = this.state_to_vector(state);
        var hidden = [];
        for (var i = 0; i < this.num_of_hidden_neurons; i++) {
            hidden[i] = this.sigmoid(this.dotProduct(input, this.W_hidden_input[i]) + this.bias_hidden_layer[i]);
        }
        var logits = [];
        for (var i = 0; i < this.num_outputs; i++) {
            logits[i] = this.dotProduct(hidden, this.W_hidden_output[i]) + this.bias_output_layer[i];
        }
        var outputs = this.softmax(logits);
        this.outputs = outputs;
        // stochastic gradient descent: (is stochastic because I update after every pass)
        var target = [];
        for (var i = 0; i < this.num_outputs; i++) {
            target[i] = exports.actions[i] === correctAction ? 1 : 0;
        }
        this.target = target;
        //back propagation:
        var delta_output = [];
        for (var k = 0; k < this.num_outputs; k++) {
            delta_output[k] = target[k] - outputs[k];
            this.loss = -Math.log(outputs[k]);
        }
        var highestPred = outputs.indexOf(Math.max.apply(Math, outputs));
        if (target[highestPred] === 1)
            accuracy = 1;
        var delta_hidden = [];
        for (var j = 0; j < this.num_of_hidden_neurons; j++) {
            var sum = 0;
            for (var k = 0; k < this.num_outputs; k++) {
                sum += delta_output[k] * this.W_hidden_output[k][j];
            }
            delta_hidden[j] = hidden[j] * (1 - hidden[j]) * sum; //sigmoid derivative * sum
        }
        // Update weights:
        for (var k = 0; k < this.num_outputs; k++) {
            for (var j = 0; j < this.num_of_hidden_neurons; j++) {
                this.W_hidden_output[k][j] += this.learning_rate * delta_output[k] * hidden[j];
            }
            this.bias_output_layer[k] += this.learning_rate * delta_output[k];
        }
        for (var j = 0; j < this.num_of_hidden_neurons; j++) {
            for (var i = 0; i < this.num_inputs; i++) {
                this.W_hidden_input[j][i] += this.learning_rate * delta_hidden[j] * input[i];
            }
            this.bias_hidden_layer[j] += this.learning_rate * delta_hidden[j];
        }
        return accuracy;
    };
    neural_intercept.prototype.fit = function (state, correctAction, epochs) {
        if (epochs === void 0) { epochs = this.n_iter; }
        var accuracy = 0;
        for (var epoch = 0; epoch < epochs; epoch++) {
            accuracy = this.single_fit(state, correctAction);
        }
        return accuracy;
    };
    ;
    neural_intercept.prototype.shuffleBatch = function (states, actions) {
        var _a, _b;
        for (var i = states.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            // swap states
            _a = [states[j], states[i]], states[i] = _a[0], states[j] = _a[1];
            // swap matching actions
            _b = [actions[j], actions[i]], actions[i] = _b[0], actions[j] = _b[1];
        }
    };
    neural_intercept.prototype.batch_fit = function (state, correctAction, epochs) {
        if (epochs === void 0) { epochs = this.n_iter; }
        var accuracy = 0;
        for (var epoch = 0; epoch < epochs; epoch++) {
            this.shuffleBatch(state, correctAction);
            for (var i = 0; i < state.length; i++)
                accuracy += this.single_fit(state[i], correctAction[i]);
        }
        return accuracy / (state.length * epochs);
    };
    ;
    neural_intercept.prototype.predictIntercept = function (X_pos, Y_pos, Z_pos, Vx, Vy, Vz, paddleV, gameW, gameH, gameD) {
        var gameAreaSize = { width: gameW, height: gameH, depth: gameD };
        var x = X_pos, y = Y_pos, z = Z_pos;
        var vx = Vx, vy = Vy, vz = Vz;
        var iterations = 0;
        var maxIterations = 100;
        while (iterations < maxIterations) {
            if (vz >= 0 || z <= paddleV)
                return { x: x, y: y };
            var t = (paddleV - z) / vz;
            // Time to hit walls
            var tx = Infinity, ty = Infinity;
            if (vx > 0)
                tx = (gameAreaSize.width / 2 - x) / vx;
            else if (vx < 0)
                tx = (-gameAreaSize.width / 2 - x) / vx;
            if (vy > 0)
                ty = (gameAreaSize.height / 2 - y) / vy;
            else if (vy < 0)
                ty = (-gameAreaSize.height / 2 - y) / vy;
            var tWall = Math.min(tx, ty);
            if (t < tWall) {
                return { x: x + vx * t, y: y + vy * t };
            }
            else {
                if (tx < ty) {
                    x += vx * tx;
                    y += vy * tx;
                    z += vz * tx;
                    vx *= -1;
                }
                else {
                    x += vx * ty;
                    y += vy * ty;
                    z += vz * ty;
                    vy *= -1;
                }
            }
            iterations++;
        }
        return { x: x, y: y };
    };
    neural_intercept.prototype.getState = function (ballX, ballY, ballZ, Vx, Vy, Vz, paddleX, paddleY, paddleSpeed, paddleW, paddleH, areaW, areaH, areaD) {
        var maxTime = 50;
        var wall_x = Vx > 0 ? areaW / 2 : -areaW / 2;
        var wall_y = Vy > 0 ? areaH / 2 : -areaH / 2;
        var d_wall_x = wall_x - ballX;
        var d_wall_y = wall_y - ballY;
        var time_to_wall_x = Vx !== 0 ? d_wall_x / Vx : Infinity;
        var time_to_wall_y = Vy !== 0 ? d_wall_y / Vy : Infinity;
        time_to_wall_x = Math.min(Math.max(time_to_wall_x / maxTime, 0), 1);
        time_to_wall_y = Math.min(Math.max(time_to_wall_y / maxTime, 0), 1);
        var intercept = this.predictIntercept(ballX, ballY, ballZ, Vx, Vy, Vz, paddleSpeed, areaW, areaH, areaD);
        var dx = intercept.x - paddleX;
        var dy = intercept.y - paddleY;
        var x_dist_to_paddle = dx / areaW;
        var y_dist_to_paddle = dy / areaH;
        var state = {
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
    };
    neural_intercept.prototype.partial_fit = function () { };
    ; // to do 
    return neural_intercept;
}());
exports.neural_intercept = neural_intercept;
exports.default = neural_ai;
