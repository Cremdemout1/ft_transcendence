"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   training_data.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 12:55:31 by yohan             #+#    #+#             */
/*   Updated: 2025/11/19 23:20:03 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_ideal_action = get_ideal_action;
exports.getRandInt = getRandInt;
var yohai_1 = require("./yohai");
var yohai_2 = require("./yohai");
var gameAreaSize = { width: 100, height: 100, depth: 100 };
var paddleZ = -50;
var paddle_dimension = 20;
var bestScore = 0;
// function actionScore(pred: action, ideal: action): number {
//     const dx = (pred.includes('left') ? -1 : pred.includes('right') ? 1 : 0) -
//                (ideal.includes('left') ? -1 : ideal.includes('right') ? 1 : 0);
//     const dy = (pred.includes('down') ? -1 : pred.includes('up') ? 1 : 0) -
//                (ideal.includes('down') ? -1 : ideal.includes('up') ? 1 : 0);
//     return 1 - (Math.abs(dx) + Math.abs(dy)) / 2; // 1 = perfect, 0 = opposite
// }
// function evaluateAI(ai: neural_intercept, testStates: state_intercept[], testActions: action[]): number {
//     let totalScore = 0;
//     for (let i = 0; i < testStates.length; i++) {
//         const pred = ai.predict(testStates[i]);
//         totalScore += actionScore(pred, testActions[i]);
//     }
//     return totalScore / testStates.length; // average score between 0 and 1
// }
function predictIntercept(X_pos, Y_pos, Z_pos, Vx, Vy, Vz) {
    var x = X_pos, y = Y_pos, z = Z_pos;
    var vx = Vx, vy = Vy, vz = Vz;
    var iterations = 0;
    var maxIterations = 500;
    while (iterations < maxIterations) {
        if (vz >= 0 || z <= paddleZ)
            return { x: x, y: y };
        var t = (paddleZ - z) / vz;
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
}
// ai.saveToFile('best_ai_weights.json');
// const ai = new neural_ai(0.1); // learning rate with best result is 0.1
// ai.loadFromFile('best_ai_weights.json'); // loads best performing weights for Neural network
function get_ideal_action(ball_x, ball_y, ball_z, Vx, Vy, Vz, X_paddle, Y_paddle) {
    var intercept = predictIntercept(ball_x, ball_y, ball_z, Vx, Vy, Vz);
    var paddleXCenter = X_paddle + paddle_dimension / 2;
    var paddleYCenter = Y_paddle + paddle_dimension / 2;
    if (paddleXCenter > intercept.x && // intercept on the left of paddle
        intercept.y > paddleYCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.y < paddleYCenter + paddle_dimension / 2)
        return yohai_2.actions[2]; // left
    else if (paddleXCenter < intercept.x && // intercept on the right of paddle
        intercept.y > paddleYCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.y < paddleYCenter + paddle_dimension / 2)
        return yohai_2.actions[3]; // right
    else if (paddleYCenter > intercept.y && // intercept down
        intercept.x > paddleXCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.x < paddleXCenter + paddle_dimension / 2)
        return yohai_2.actions[1]; // down
    else if (paddleYCenter < intercept.y && // intercept up
        intercept.x > paddleXCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.x < paddleXCenter + paddle_dimension / 2)
        return yohai_2.actions[0]; // up
    else if (paddleXCenter > intercept.x && paddleYCenter > intercept.y)
        return yohai_2.actions[7]; // down-left
    else if (paddleXCenter > intercept.x && paddleYCenter < intercept.y)
        return yohai_2.actions[6]; // up-left
    else if (paddleXCenter < intercept.x && paddleYCenter > intercept.y)
        return yohai_2.actions[5]; // down-right
    else if (paddleXCenter < intercept.x && paddleYCenter < intercept.y)
        return yohai_2.actions[4]; //up-right
    return yohai_2.actions[8];
}
// export function get_ideal_action(ball_x: number, ball_y: number, ball_z: number, Vx: number, Vy: number, Vz: number, X_paddle: number, Y_paddle: number): action {
//     const intercept: {x: number, y: number} = predictIntercept(ball_x, ball_y, ball_z, Vx, Vy, Vz);
//     const paddleXCenter = X_paddle;
//     const paddleYCenter = Y_paddle;
//     if (paddleXCenter > intercept.x && // intercept on the left of paddle
//         intercept.y > paddleYCenter &&  // ball within vertical range
//         intercept.y < paddleYCenter)
//             return actions[2]; // left
//     else if (paddleXCenter < intercept.x && // intercept on the right of paddle
//             intercept.y > paddleYCenter &&  // ball within vertical range
//             intercept.y < paddleYCenter)
//                 return actions[3]; // right
//     else if (paddleYCenter > intercept.y && // intercept down
//             intercept.x > paddleXCenter &&  // ball within vertical range
//             intercept.x < paddleXCenter)
//                 return actions[1]; // down
//     else if (paddleYCenter < intercept.y && // intercept up
//             intercept.x > paddleXCenter &&  // ball within vertical range
//             intercept.x < paddleXCenter)
//                 return actions[0]; // up
//     else if (paddleXCenter > intercept.x && paddleYCenter > intercept.y)
//         return actions[7]; // down-left
//     else if (paddleXCenter > intercept.x && paddleYCenter < intercept.y)
//         return actions[6]; // up-left
//     else if (paddleXCenter < intercept.x && paddleYCenter > intercept.y)
//         return actions[5]; // down-right
//     else if (paddleXCenter < intercept.x && paddleYCenter < intercept.y)
//         return actions[4]; //up-right
//     return actions[8];
// }
function getRandInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function lr_schedule(initial, decay, step) {
    return initial * Math.exp(-decay * step);
}
function generate_random_valid_game_state() {
    var state = {};
    state.X_pos = getRandInt(-50, 50);
    state.Y_pos = getRandInt(-50, 50);
    state.Z_pos = getRandInt(-50, 50);
    state.X_paddle = getRandInt(-50, 50);
    state.Y_paddle = getRandInt(-50, 50);
    state.Vx = (Math.random() - 0.5) * 2;
    state.Vy = (Math.random() - 0.5) * 2;
    var Vz;
    if (state.Z_pos > -50) {
        Vz = -Math.random() * 2; // -2 to 0 (negative only)
    }
    else {
        // Ball is at or below paddle plane (shouldn't happen, but safety)
        Vz = -Math.random() * 2; // Force negative
    }
    state.Vz = Vz;
    state.paddle_height = paddle_dimension;
    state.paddle_width = paddle_dimension;
    state.paddle_speed = 0.15;
    var intercept = predictIntercept(state.X_pos, state.Y_pos, state.Z_pos, state.Vx, state.Vy, state.Vz);
    var maxTime = 50;
    var wall_x = state.Vx > 0 ? gameAreaSize.width / 2 : -gameAreaSize.width / 2;
    var wall_y = state.Vy > 0 ? gameAreaSize.height / 2 : -gameAreaSize.height / 2;
    var d_wall_x = wall_x - state.X_pos;
    var d_wall_y = wall_y - state.Y_pos;
    var time_to_wall_x = state.Vx !== 0 ? d_wall_x / state.Vx : Infinity;
    var time_to_wall_y = state.Vy !== 0 ? d_wall_y / state.Vy : Infinity;
    time_to_wall_x = Math.min(Math.max(time_to_wall_x / maxTime, 0), 1);
    time_to_wall_y = Math.min(Math.max(time_to_wall_y / maxTime, 0), 1);
    var dx = intercept.x - state.X_paddle;
    var dy = intercept.y - state.Y_paddle;
    var x_dist_to_paddle = dx / gameAreaSize.width;
    var y_dist_to_paddle = dy / gameAreaSize.height;
    state.time_to_wall_x = time_to_wall_x;
    state.time_to_wall_y = time_to_wall_y;
    state.x_dist_to_paddle = x_dist_to_paddle;
    state.y_dist_to_paddle = y_dist_to_paddle;
    return state;
}
// function train_AI_model(trials: number) {
//     const ai = new neural_intercept(0.1);
//     const accumulatedStates: state_intercept[] = [];
//     const accumulatedActions: action[] = [];
//     const initialLR = 0.1;
//     const decay = 0.005;
//     for (let i = 0; i < trials; i++) {
//         const lr = lr_schedule(initialLR, decay, i);
//         ai.learning_rate = lr;
//         const state: state_intercept = generate_random_valid_game_state();
//         accumulatedStates.push(state);
//         const expectedAction: action = get_ideal_action(state.X_pos, state.Y_pos, state.Z_pos, state.Vx, state.Vy, state.Vz, state.X_paddle, state.Y_paddle);
//         accumulatedActions.push(expectedAction);
//         ai.fit(state, expectedAction, 3);
//         console.log(evaluateAI(ai, accumulatedStates, accumulatedActions) * 100, "%");
//         console.log("learning rate: ", ai.learning_rate);
//     }
// };
function train_AI_model(trials, batchSize) {
    if (batchSize === void 0) { batchSize = 32; }
    var ai = new yohai_1.neural_intercept(0.1);
    ai.loadFromFile("weights.json");
    var accumulatedStates = [];
    var accumulatedActions = [];
    var initialLR = 0.1;
    var decay = 0.00009;
    var totalAccuracy = 0;
    var evalCount = 0;
    var downRightprob = 0;
    var Rightprob = 0;
    var upRightprob = 0;
    var downLeftprob = 0;
    var upLeftprob = 0;
    var Leftprob = 0;
    var Upprob = 0;
    var Downprob = 0;
    var noneprob = 0;
    // let bestScore = 0; // track best score
    for (var i = 0; i < trials; i++) {
        // Update learning rate
        ai.learning_rate = lr_schedule(initialLR, decay, i);
        var batchStates = [];
        var batchActions = [];
        for (var j = 0; j < batchSize; j++) {
            var state = generate_random_valid_game_state();
            var expectedAction = get_ideal_action(state.X_pos, state.Y_pos, state.Z_pos, state.Vx, state.Vy, state.Vz, state.X_paddle, state.Y_paddle);
            batchStates.push(state);
            batchActions.push(expectedAction);
            // Also accumulate for evaluation
            accumulatedStates.push(state);
            accumulatedActions.push(expectedAction);
            if (expectedAction == 'up')
                Upprob++;
            else if (expectedAction == 'down')
                Downprob++;
            else if (expectedAction == 'left')
                Leftprob++;
            else if (expectedAction == 'right')
                Rightprob++;
            else if (expectedAction == 'down-left')
                downLeftprob++;
            else if (expectedAction == 'down-right')
                downRightprob++;
            else if (expectedAction == 'up-left')
                upLeftprob++;
            else if (expectedAction == 'up-right')
                upRightprob++;
            else if (expectedAction == 'none')
                noneprob++;
        }
        // Train on the batch
        var acc = ai.batch_fit(batchStates, batchActions, 100); // 3 epochs per batch
        totalAccuracy += acc;
        evalCount++;
        if (i > 0 && i % 30 === 0) {
            var avgAccuracy = (totalAccuracy / evalCount) * 100;
            console.log("Step ".concat(i, " | Accuracy: ").concat(avgAccuracy.toFixed(2), "% | LR: ").concat(ai.learning_rate.toFixed(4), " | loss: ").concat(ai.loss.toFixed(6)));
            ai.outputs.forEach(function (value, idx) {
                console.log("Output[".concat(idx, "]: ").concat(value.toFixed(4), " | Target: ").concat(ai.target[idx].toFixed(4)));
            });
            console.log("Predicted action: ".concat(yohai_2.actions[ai.outputs.indexOf(Math.max.apply(Math, ai.outputs))], " | ") +
                "Expected action: ".concat(batchActions[batchActions.length - 1]));
            if (avgAccuracy > bestScore) {
                bestScore = avgAccuracy;
                ai.saveToFile("weights.json");
                console.log("Weights saved at accuracy:", avgAccuracy.toFixed(2), "%");
            }
            console.log("up: ".concat(Upprob / batchActions.length, "    |   down: ").concat(Downprob / batchActions.length, "    |   left: ").concat(Leftprob / batchActions.length, "    |   right: ").concat(Rightprob / batchActions.length, "    |   up-left: ").concat(upLeftprob / batchActions.length, "    |   up-right: ").concat(upRightprob / batchActions.length, "    |   down-left: ").concat(downLeftprob / batchActions.length, "    |   down-right: ").concat(downRightprob / batchActions.length, "    |   none: ").concat(noneprob / batchActions.length));
        }
    }
    console.log("Training complete!");
    return ai;
}
train_AI_model(4500);
