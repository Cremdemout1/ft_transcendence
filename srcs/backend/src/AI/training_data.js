"use strict";
/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   training_data.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 12:55:31 by yohan             #+#    #+#             */
/*   Updated: 2025/11/19 22:50:47 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_ideal_action = get_ideal_action;
exports.getRandInt = getRandInt;
var neural_network_1 = require("./neural_network");
var neural_network_2 = require("./neural_network");
var gameAreaSize = { width: 100, height: 100, depth: 100 };
var paddleZ = -50;
var paddle_dimension = 20;
// function testTrajectory(ai: neural_ai, steps = 50) {
//     const gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
//     // initial ball state
//     let X_pos = 0.0;
//     let Y_pos = 0.0;
//     let Z_pos = 0.0;
//     let Vx = 0.08;
//     let Vy = 0.06;
//     let Vz = -0.05;
//     // paddle starts random
//     let X_paddle = (Math.random() - 0.5) * gameArea.width;
//     let Y_paddle = (Math.random() - 0.5) * gameArea.height;
//     const paddle_speed = 0.05;
//     const paddle_height = 0.3;
//     const paddle_width = paddle_height;
//     console.log("=== Simulated Trajectory ===");
//     let correctMoves = 0;
//     let stepsTracked = 0;
//     for (let t = 0; t < steps; t++) {
//         // Build state
//         const state: state = {
//             X_pos, Y_pos, Z_pos,
//             Vx, Vy, Vz,
//             X_paddle, Y_paddle,
//             paddle_speed, paddle_width, paddle_height
//         };
//         // AI predicts
//         const action = ai.predict(state);
//         // Compute ideal action
//         let idealMoveX: action = 'none';
//         let idealMoveY: action = 'none';
//         if (Math.abs(X_pos - X_paddle) > 0.05) idealMoveX = X_pos > X_paddle ? 'right' : 'left';
//         if (Math.abs(Y_pos - Y_paddle) > 0.05) idealMoveY = Y_pos > Y_paddle ? 'up' : 'down';
//         let idealAction: action;
//         if (idealMoveX !== 'none' && idealMoveY !== 'none') {
//             if (idealMoveX === 'right' && idealMoveY === 'up') idealAction = 'up-right';
//             else if (idealMoveX === 'right' && idealMoveY === 'down') idealAction = 'down-right';
//             else if (idealMoveX === 'left' && idealMoveY === 'up') idealAction = 'up-left';
//             else if (idealMoveX === 'left' && idealMoveY === 'down') idealAction = 'down-left';
//             else idealAction = 'none';
//         } else {
//             idealAction = idealMoveX !== 'none' ? idealMoveX : idealMoveY;
//         }
//         if (action === idealAction) correctMoves++;
//         stepsTracked++;
//         // Move paddle according to action
//         switch (action) {
//             case 'up': Y_paddle += paddle_speed; break;
//             case 'down': Y_paddle -= paddle_speed; break;
//             case 'left': X_paddle -= paddle_speed; break;
//             case 'right': X_paddle += paddle_speed; break;
//             case 'up-right': Y_paddle += paddle_speed; X_paddle += paddle_speed; break;
//             case 'up-left': Y_paddle += paddle_speed; X_paddle -= paddle_speed; break;
//             case 'down-right': Y_paddle -= paddle_speed; X_paddle += paddle_speed; break;
//             case 'down-left': Y_paddle -= paddle_speed; X_paddle -= paddle_speed; break;
//         }
//         // Ball moves
//         X_pos += Vx;
//         Y_pos += Vy;
//         Z_pos += Vz;
//         // Bounce off walls
//         if (X_pos < -gameArea.width / 2 || X_pos > gameArea.width / 2) Vx *= -1;
//         if (Y_pos < -gameArea.height / 2 || Y_pos > gameArea.height / 2) Vy *= -1;
//         // Print state
//         console.log(
//             `Step ${t + 1}: Ball=(${X_pos.toFixed(2)}, ${Y_pos.toFixed(2)}), Paddle=(${X_paddle.toFixed(2)}, ${Y_paddle.toFixed(2)}), AI=${action}, Ideal=${idealAction}`
//         );
//         // Check intercept
//         if (
//             Math.abs(X_pos - X_paddle) < paddle_width / 2 &&
//             Math.abs(Y_pos - Y_paddle) < paddle_height / 2 &&
//             Z_pos < 0
//         ) {
//             break;
//         }
//     }
//     const accuracy = (correctMoves / stepsTracked) * 100;
//     console.log(`AI action accuracy until intercept: ${accuracy.toFixed(2)}%`);
// }
// this testTrajectory teaches to predict position if wall is encountered instead of only following ball:
// Utility: predict where the ball will cross the paddle Z-plane
// interface trainingStep {
//     state: state;
//     idealAction: action;
// }
// function generateTrajectory(steps = 100): trainingStep[] {
//     const gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
//     let X_pos = 0.0, Y_pos = 0.0, Z_pos = 0.0;
//     let Vx = (Math.random() * 0.04 - 0.02), Vy = (Math.random() * 0.04 - 0.02), Vz = -0.01;
//     let X_paddle = (Math.random() - 0.5) * gameArea.width;
//     let Y_paddle = (Math.random() - 0.5) * gameArea.height;
//     const paddle_speed = 0.05;
//     const paddle_height = 0.3;
//     const paddle_width = paddle_height;
//     const trajectory: trainingStep[] = [];
//     for (let t = 0; t < steps; t++) {
//         // Compute ideal move
//         let idealMoveX: action = 'none';
//         let idealMoveY: action = 'none';
//         if (Math.abs(X_pos - X_paddle) > 0.05) idealMoveX = X_pos > X_paddle ? 'right' : 'left';
//         if (Math.abs(Y_pos - Y_paddle) > 0.05) idealMoveY = Y_pos > Y_paddle ? 'up' : 'down';
//         let idealAction: action;
//         if (idealMoveX !== 'none' && idealMoveY !== 'none') {
//             if (idealMoveX === 'right' && idealMoveY === 'up') idealAction = 'up-right';
//             else if (idealMoveX === 'right' && idealMoveY === 'down') idealAction = 'down-right';
//             else if (idealMoveX === 'left' && idealMoveY === 'up') idealAction = 'up-left';
//             else if (idealMoveX === 'left' && idealMoveY === 'down') idealAction = 'down-left';
//             else idealAction = 'none';
//         } else {
//             idealAction = idealMoveX !== 'none' ? idealMoveX : idealMoveY;
//         }
//         trajectory.push({
//             state: {
//                 X_pos, Y_pos, Z_pos, Vx, Vy, Vz,
//                 X_paddle, Y_paddle, paddle_speed, paddle_width, paddle_height
//             },
//             idealAction
//         });
//         // Move paddle (simulate perfect movement for training purposes)
//         switch (idealAction) {
//             case 'up': Y_paddle += paddle_speed; break;
//             case 'down': Y_paddle -= paddle_speed; break;
//             case 'left': X_paddle -= paddle_speed; break;
//             case 'right': X_paddle += paddle_speed; break;
//             case 'up-right': Y_paddle += paddle_speed; X_paddle += paddle_speed; break;
//             case 'up-left': Y_paddle += paddle_speed; X_paddle -= paddle_speed; break;
//             case 'down-right': Y_paddle -= paddle_speed; X_paddle += paddle_speed; break;
//             case 'down-left': Y_paddle -= paddle_speed; X_paddle -= paddle_speed; break;
//         }
//         // Ball moves
//         X_pos += Vx;
//         Y_pos += Vy;
//         Z_pos += Vz;
//         // Bounce walls
//         if (X_pos < -gameArea.width / 2 || X_pos > gameArea.width / 2) Vx *= -1;
//         if (Y_pos < -gameArea.height / 2 || Y_pos > gameArea.height / 2) Vy *= -1;
//     }
//     return trajectory;
// }
function actionScore(pred, ideal) {
    var dx = (pred.includes('left') ? -1 : pred.includes('right') ? 1 : 0) -
        (ideal.includes('left') ? -1 : ideal.includes('right') ? 1 : 0);
    var dy = (pred.includes('down') ? -1 : pred.includes('up') ? 1 : 0) -
        (ideal.includes('down') ? -1 : ideal.includes('up') ? 1 : 0);
    return 1 - (Math.abs(dx) + Math.abs(dy)) / 2; // 1 = perfect, 0 = opposite
}
function evaluateAI(ai, testStates, testActions) {
    var totalScore = 0;
    for (var i = 0; i < testStates.length; i++) {
        var pred = ai.predict(testStates[i]);
        totalScore += actionScore(pred, testActions[i]);
    }
    return totalScore / testStates.length; // average score between 0 and 1
}
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
        return neural_network_2.actions[2]; // left
    else if (paddleXCenter < intercept.x && // intercept on the right of paddle
        intercept.y > paddleYCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.y < paddleYCenter + paddle_dimension / 2)
        return neural_network_2.actions[3]; // right
    else if (paddleYCenter > intercept.y && // intercept down
        intercept.x > paddleXCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.x < paddleXCenter + paddle_dimension / 2)
        return neural_network_2.actions[1]; // down
    else if (paddleYCenter < intercept.y && // intercept up
        intercept.x > paddleXCenter - paddle_dimension / 2 && // ball within vertical range
        intercept.x < paddleXCenter + paddle_dimension / 2)
        return neural_network_2.actions[0]; // up
    else if (paddleXCenter > intercept.x && paddleYCenter > intercept.y)
        return neural_network_2.actions[7]; // down-left
    else if (paddleXCenter > intercept.x && paddleYCenter < intercept.y)
        return neural_network_2.actions[6]; // up-left
    else if (paddleXCenter < intercept.x && paddleYCenter > intercept.y)
        return neural_network_2.actions[5]; // down-right
    else if (paddleXCenter < intercept.x && paddleYCenter < intercept.y)
        return neural_network_2.actions[4]; //up-right
    return neural_network_2.actions[8];
}
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
    var ai = new neural_network_1.neural_intercept(0.1);
    var accumulatedStates = [];
    var accumulatedActions = [];
    var initialLR = 0.1;
    var decay = 0.005;
    for (var i = 0; i < trials; i++) {
        // Update learning rate
        ai.learning_rate = lr_schedule(initialLR, decay, i);
        // Generate a batch of random states
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
        }
        // Train on the batch
        ai.batch_fit(batchStates, batchActions, 10); // 3 epochs per batch
        // Evaluate periodically
        if (i % 50 === 0) {
            var score = evaluateAI(ai, accumulatedStates, accumulatedActions) * 100;
            console.log("Step ".concat(i, " | Accuracy: ").concat(score.toFixed(2), "% | LR: ").concat(ai.learning_rate.toFixed(4)));
        }
    }
    console.log("Training complete!");
    return ai;
}
train_AI_model(2000);
