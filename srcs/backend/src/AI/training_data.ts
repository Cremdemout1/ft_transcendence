/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   training_data.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/04 12:55:31 by yohan             #+#    #+#             */
/*   Updated: 2025/09/04 13:26:45 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import neural_ai from "./neural_network";
// import {state, action} from "./neural_network";

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
//             console.log(`✅ Paddle intercepted the ball at step ${t + 1}`);
//             break;
//         }
//     }

//     const accuracy = (correctMoves / stepsTracked) * 100;
//     console.log(`AI action accuracy until intercept: ${accuracy.toFixed(2)}%`);
// }

// interface trainingStep {
//     state: state;
//     idealAction: action;
// }

// function generateTrajectory(steps = 50): trainingStep[] {
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

// function actionScore(pred: action, ideal: action): number {
//     const dx = (pred.includes('left') ? -1 : pred.includes('right') ? 1 : 0) -
//                (ideal.includes('left') ? -1 : ideal.includes('right') ? 1 : 0);
//     const dy = (pred.includes('down') ? -1 : pred.includes('up') ? 1 : 0) -
//                (ideal.includes('down') ? -1 : ideal.includes('up') ? 1 : 0);
//     return 1 - (Math.abs(dx) + Math.abs(dy)) / 2; // 1 = perfect, 0 = opposite
// }

// function evaluateAI(ai: neural_ai, testStates: state[], testActions: action[]): number {
//     let totalScore = 0;
//     for (let i = 0; i < testStates.length; i++) {
//         const pred = ai.predict(testStates[i]);
//         totalScore += actionScore(pred, testActions[i]);
//     }
//     return totalScore / testStates.length; // average score between 0 and 1
// }

// Example: generate 1000 trajectories for training
// const trainingData: trainingStep[] = [];
// for (let i = 0; i < 1000; i++) {
//     trainingData.push(...generateTrajectory(50));
// }


// const X_train: state[] = trainingData.map(step => step.state);
// const Y_train: action[] = trainingData.map(step => step.idealAction);

// ai.fitWithTracking(X_train, Y_train, 50, (aiInstance) => evaluateAI(aiInstance, X_train, Y_train));
// ai.saveToFile('best_ai_weights.json');

// testTrajectory(ai, 100); 

const ai = new neural_ai(0.1); // learning rate with best result is 0.1
ai.loadFromFile('best_ai_weights.json'); // loads best performing weights for Neural network

//test and training data generated by chatGPT
//must train (fit) AI once when project is created