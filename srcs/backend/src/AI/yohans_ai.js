"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   yohans_ai.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 06:59:30 by yohan             #+#    #+#             */
/*   Updated: 2025/09/04 09:52:55 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
var actions = ['up', 'down', 'left', 'right', 'none'];
// type ActionVector = [up: number, down: number, left: number, right: number, none: number];
var learning_ai_opponent = /** @class */ (function () {
    // private actionToVector(act: action): ActionVector {
    //     return [
    //         act === 'up' ? 1 : 0,
    //         act === 'down' ? 1 : 0,
    //         act === 'left' ? 1 : 0,
    //         act === 'right' ? 1 : 0,
    //         act === 'none' ? 1 : 0
    //     ];
    // }
    function learning_ai_opponent(learning_rate) {
        if (learning_rate === void 0) { learning_rate = 0.01; }
        this.up_weights = Array(6).fill(0).map(function () { return Math.random() - 0.5; });
        this.down_weights = Array(6).fill(0).map(function () { return Math.random() - 0.5; });
        this.left_weights = Array(6).fill(0).map(function () { return Math.random() - 0.5; });
        this.right_weights = Array(6).fill(0).map(function () { return Math.random() - 0.5; });
        this.none_weights = Array(6).fill(0).map(function () { return Math.random() - 0.5; });
        this.learning_rate = learning_rate;
        this.n_iter = 20;
    }
    learning_ai_opponent.prototype.state_to_vector = function (state) {
        return [
            1, //bias is always the first (0)
            state.X_pos,
            state.Y_pos,
            state.Z_pos,
            state.X_paddle,
            state.Y_paddle,
        ];
    };
    learning_ai_opponent.prototype.sigmoid = function (x) {
        return 1 / (1 + Math.exp(-x));
    };
    learning_ai_opponent.prototype.sigmoidDerivative = function (x) {
        var s = this.sigmoid(x);
        return s * (1 - s);
    };
    learning_ai_opponent.prototype.predict = function (state) {
        var _this = this;
        var input = this.state_to_vector(state);
        var results = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            none: 0
        };
        var _loop_1 = function (act) {
            var sum = 0;
            var weights = (function () {
                switch (act) {
                    case 'up': return _this.up_weights;
                    case 'down': return _this.down_weights;
                    case 'left': return _this.left_weights;
                    case 'right': return _this.right_weights;
                    case 'none': return _this.none_weights;
                }
            })();
            for (var i = 1; i < input.length; i++)
                sum += input[i] * weights[i];
            results[act] = this_1.sigmoid(sum);
        };
        var this_1 = this;
        for (var _i = 0, actions_1 = actions; _i < actions_1.length; _i++) {
            var act = actions_1[_i];
            _loop_1(act);
        }
        var bestAction = 'none';
        var maxScore = -Infinity;
        for (var _a = 0, actions_2 = actions; _a < actions_2.length; _a++) {
            var act = actions_2[_a];
            if (results[act] > maxScore) {
                maxScore = results[act];
                bestAction = act;
            }
        }
        return bestAction;
    };
    ;
    learning_ai_opponent.prototype.single_fit = function (state, correctAction) {
        var _this = this;
        var input = this.state_to_vector(state);
        // const targetVector = this.actionToVector(correctAction);
        var results = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            none: 0
        };
        var _loop_2 = function (act) {
            var sum = 0;
            var weights = (function () {
                switch (act) {
                    case 'up': return _this.up_weights;
                    case 'down': return _this.down_weights;
                    case 'left': return _this.left_weights;
                    case 'right': return _this.right_weights;
                    case 'none': return _this.none_weights;
                }
            })();
            for (var i = 1; i < input.length; i++)
                sum += input[i] * weights[i];
            results[act] = sum;
            //gradient descent:
            var output = this_2.sigmoid(sum);
            var target = act === correctAction ? 1 : 0;
            var error = target - output;
            for (var i = 0; i < weights.length; i++)
                weights[i] += this_2.learning_rate * error * this_2.sigmoidDerivative(sum) * input[i];
        };
        var this_2 = this;
        for (var _i = 0, actions_3 = actions; _i < actions_3.length; _i++) {
            var act = actions_3[_i];
            _loop_2(act);
        }
    };
    ;
    learning_ai_opponent.prototype.fit = function (states, correctActions, epochs) {
        if (epochs === void 0) { epochs = this.n_iter; }
        for (var i in states) {
            for (var iteration = 0; iteration < epochs; iteration++) {
                this.single_fit(states[i], correctActions[i]);
            }
        }
    };
    return learning_ai_opponent;
}());
exports.default = learning_ai_opponent;
function simulateTrainingData(numSamples) {
    if (numSamples === void 0) { numSamples = 500; }
    var gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
    var states = [];
    var correctActions = [];
    for (var i = 0; i < numSamples; i++) {
        // Random ball position
        var X_pos = (Math.random() - 0.5) * gameArea.width;
        var Y_pos = (Math.random() - 0.5) * gameArea.height;
        var Z_pos = (Math.random() - 0.5) * gameArea.depth;
        // Random paddle position
        var X_paddle = (Math.random() - 0.5) * gameArea.width;
        var Y_paddle = (Math.random() - 0.5) * gameArea.height;
        // Determine correct action
        var moveX = Math.abs(X_pos - X_paddle) > 0.05 ? (X_pos > X_paddle ? 'right' : 'left') : 'none';
        var moveY = Math.abs(Y_pos - Y_paddle) > 0.05 ? (Y_pos > Y_paddle ? 'up' : 'down') : 'none';
        // Prioritize vertical movement if ball is far vertically, else horizontal
        var chosenAction = void 0;
        if (moveY !== 'none')
            chosenAction = moveY;
        else if (moveX !== 'none')
            chosenAction = moveX;
        else
            chosenAction = 'none';
        states.push({ X_pos: X_pos, Y_pos: Y_pos, Z_pos: Z_pos, X_paddle: X_paddle, Y_paddle: Y_paddle });
        correctActions.push(chosenAction);
    }
    return { states: states, correctActions: correctActions };
}
// Usage:
var _a = simulateTrainingData(1000), states = _a.states, correctActions = _a.correctActions;
var ai = new learning_ai_opponent();
ai.fit(states, correctActions, 500);
for (var i = 0; i < 20; i++) { // just print first 20 for readability
    var predicted = ai.predict(states[i]);
    var correct = correctActions[i];
    console.log("Sample ".concat(i + 1, ": Predicted = ").concat(predicted, ", Correct = ").concat(correct));
}
// Optional: compute accuracy
var correctCount = 0;
for (var i = 0; i < states.length; i++) {
    if (ai.predict(states[i]) === correctActions[i])
        correctCount++;
}
console.log("Accuracy: ".concat((correctCount / states.length * 100).toFixed(2), "%"));
