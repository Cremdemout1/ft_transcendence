/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   predicting_wall_bounce_training.ts                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/06 21:53:47 by yohan             #+#    #+#             */
/*   Updated: 2025/09/06 23:21:43 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// import neural_ai from "./neural_network";
import {neural_intercept} from "./neural_network";
import {state_intercept, action} from "./neural_network";

interface trainingStep {
  state: state_intercept;
  idealAction: action;
}

// ===== Intercept Prediction =====
function predictIntercept(
  X_pos: number, Y_pos: number, Z_pos: number,
  Vx: number, Vy: number, Vz: number,
  gameArea: { width: number, height: number, depth: number },
  paddleZ: number
): { x: number, y: number } {
  let x = X_pos, y = Y_pos, z = Z_pos;
  let vx = Vx, vy = Vy, vz = Vz;

  while (true) {
    // stop if ball going away or already past paddle
    if (vz >= 0 || z <= paddleZ) return { x, y };

    const t = (paddleZ - z) / vz; // vz < 0 so t > 0

    // time to hit walls
    let tx = Infinity, ty = Infinity;
    if (vx > 0) tx = (gameArea.width / 2 - x) / vx;
    else if (vx < 0) tx = (-gameArea.width / 2 - x) / vx;
    if (vy > 0) ty = (gameArea.height / 2 - y) / vy;
    else if (vy < 0) ty = (-gameArea.height / 2 - y) / vy;

    const tWall = Math.min(tx, ty);

    if (t < tWall) {
      // paddle reached before wall
      return { x: x + vx * t, y: y + vy * t };
    } else {
      // bounce first
      if (tx < ty) {
        x += vx * tx; y += vy * tx; z += vz * tx;
        vx *= -1;
      } else {
        x += vx * ty; y += vy * ty; z += vz * ty;
        vy *= -1;
      }
    }
  }
}

// ===== Generate Training Data =====
function generateTrajectory(steps = 50): trainingStep[] {
    const gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
    const paddleZ = -0.9;
  
    // initial ball state
    let X_pos = (Math.random() - 0.5) * gameArea.width;
    let Y_pos = (Math.random() - 0.5) * gameArea.height;
    let Z_pos = 0.9;
  
    // random velocities
    let Vx = (Math.random() - 0.5) * 0.2;
    let Vy = (Math.random() - 0.5) * 0.2;
    let Vz = -0.05 - Math.random() * 0.05;
  
    // paddle starts random
    let X_paddle = (Math.random() - 0.5) * gameArea.width;
    let Y_paddle = (Math.random() - 0.5) * gameArea.height;
  
    const paddle_speed = 0.05;
    const paddle_height = 0.3;
    const paddle_width = paddle_height;
  
    const samples: trainingStep[] = [];
  
    // maximum time horizon for normalization
    const maxTime = 50; // or steps * dt if you have dt
  
    for (let t = 0; t < steps; t++) {
  
      // compute next wall in direction of motion
      let wall_x = Vx > 0 ? gameArea.width / 2 : -gameArea.width / 2;
      let wall_y = Vy > 0 ? gameArea.height / 2 : -gameArea.height / 2;
  
      let d_wall_x = wall_x - X_pos;
      let d_wall_y = wall_y - Y_pos;
  
      // time to reach wall (avoid division by zero)
      let time_to_wall_x = Vx !== 0 ? d_wall_x / Vx : Infinity;
      let time_to_wall_y = Vy !== 0 ? d_wall_y / Vy : Infinity;
  
      // normalize times to [0,1]
      time_to_wall_x = Math.min(Math.max(time_to_wall_x / maxTime, 0), 1);
      time_to_wall_y = Math.min(Math.max(time_to_wall_y / maxTime, 0), 1);
  
      const intercept = predictIntercept(X_pos, Y_pos, Z_pos, Vx, Vy, Vz, gameArea, paddleZ);
      const dx = intercept.x - X_paddle; // horizontal distance to goal
      const dy = intercept.y - Y_paddle; // vertical distance to goal
      
      const x_dist_to_paddle = dx / gameArea.width;  // normalized [-1,1]
      const y_dist_to_paddle = dy / gameArea.height; // normalized [-1,1]
      // choose ideal action
      let idealMoveX: action = 'none';
      let idealMoveY: action = 'none';
      if (Math.abs(intercept.x - X_paddle) > 0.05)
        idealMoveX = intercept.x > X_paddle ? 'right' : 'left';
      if (Math.abs(intercept.y - Y_paddle) > 0.05)
        idealMoveY = intercept.y > Y_paddle ? 'up' : 'down';
  
      let idealAction: action;
      if (idealMoveX !== 'none' && idealMoveY !== 'none') {
        if (idealMoveX === 'right' && idealMoveY === 'up') idealAction = 'up-right';
        else if (idealMoveX === 'right' && idealMoveY === 'down') idealAction = 'down-right';
        else if (idealMoveX === 'left' && idealMoveY === 'up') idealAction = 'up-left';
        else idealAction = 'down-left';
      } else if (idealMoveX !== 'none') idealAction = idealMoveX;
      else if (idealMoveY !== 'none') idealAction = idealMoveY;
      else idealAction = 'none';
  
      const state: state_intercept = {
        X_pos, Y_pos, Z_pos,
        Vx, Vy, Vz,
        X_paddle, Y_paddle,
        paddle_speed, paddle_width, paddle_height,
        time_to_wall_x, time_to_wall_y,
        x_dist_to_paddle, y_dist_to_paddle
      };
  
      samples.push({ state, idealAction });
  
      // move paddle toward target
      switch (idealAction) {
        case 'up': Y_paddle += paddle_speed; break;
        case 'down': Y_paddle -= paddle_speed; break;
        case 'left': X_paddle -= paddle_speed; break;
        case 'right': X_paddle += paddle_speed; break;
        case 'up-right': Y_paddle += paddle_speed; X_paddle += paddle_speed; break;
        case 'up-left': Y_paddle += paddle_speed; X_paddle -= paddle_speed; break;
        case 'down-right': Y_paddle -= paddle_speed; X_paddle += paddle_speed; break;
        case 'down-left': Y_paddle -= paddle_speed; X_paddle -= paddle_speed; break;
      }
  
      // move ball with bounce + clamp
      X_pos += Vx; Y_pos += Vy; Z_pos += Vz;
  
      if (X_pos < -gameArea.width / 2 || X_pos > gameArea.width / 2) {
        Vx *= -1;
        X_pos = Math.max(Math.min(X_pos, gameArea.width / 2), -gameArea.width / 2);
      }
      if (Y_pos < -gameArea.height / 2 || Y_pos > gameArea.height / 2) {
        Vy *= -1;
        Y_pos = Math.max(Math.min(Y_pos, gameArea.height / 2), -gameArea.height / 2);
      }
    }
  
    return samples;
  }
  
// ===== Action Scoring =====
// function actionScore(pred: action, ideal: action): number {
//   const dx = (pred.includes('left') ? -1 : pred.includes('right') ? 1 : 0) -
//              (ideal.includes('left') ? -1 : ideal.includes('right') ? 1 : 0);
//   const dy = (pred.includes('down') ? -1 : pred.includes('up') ? 1 : 0) -
//              (ideal.includes('down') ? -1 : ideal.includes('up') ? 1 : 0);
//   return 1 - (Math.abs(dx) + Math.abs(dy)) / 2;
// }

// function evaluateAI(ai: neural_intercept, testStates: state_intercept[], testActions: action[]): number {
//   let totalScore = 0;
//   for (let i = 0; i < testStates.length; i++) {
//     const pred = ai.predict(testStates[i]);
//     totalScore += actionScore(pred, testActions[i]);
//   }
//   return totalScore / testStates.length;
// }

// ===== Simulation for Debugging =====
function testTrajectory(ai: neural_intercept, steps = 50) {
    const gameArea = { width: 1.8, height: 1.8, depth: 1.8 };
    const paddleZ = -0.9;
  
    let X_pos = 0, Y_pos = 0, Z_pos = 0.8;
    let Vx = (Math.random() - 0.5) * 0.2;
    let Vy = (Math.random() - 0.5) * 0.2;
    let Vz = -0.05 - Math.random() * 0.05;
  
    let X_paddle = (Math.random() - 0.5) * gameArea.width;
    let Y_paddle = (Math.random() - 0.5) * gameArea.height;
  
    const paddle_speed = 0.05;
    const paddle_height = 0.3;
    const paddle_width = paddle_height;
  
    const maxTime = 50; // same as in training
  
    const colors = {
      reset: "\x1b[0m", blue: "\x1b[34m", magenta: "\x1b[35m",
      green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m"
    };
  
    console.log("=== Simulated Trajectory ===");
  
    let correctMoves = 0, stepsTracked = 0;
  
    for (let t = 0; t < steps; t++) {
  
      // compute wall times
      let wall_x = Vx > 0 ? gameArea.width / 2 : -gameArea.width / 2;
      let wall_y = Vy > 0 ? gameArea.height / 2 : -gameArea.height / 2;
      let d_wall_x = wall_x - X_pos;
      let d_wall_y = wall_y - Y_pos;
      let time_to_wall_x = Vx !== 0 ? d_wall_x / Vx : Infinity;
      let time_to_wall_y = Vy !== 0 ? d_wall_y / Vy : Infinity;
        // normalize
        time_to_wall_x = Math.min(Math.max(time_to_wall_x / maxTime, 0), 1);
        time_to_wall_y = Math.min(Math.max(time_to_wall_y / maxTime, 0), 1);
        const intercept = predictIntercept(X_pos, Y_pos, Z_pos, Vx, Vy, Vz, gameArea, paddleZ);

        const dx = intercept.x - X_paddle; // horizontal distance to goal
        const dy = intercept.y - Y_paddle; // vertical distance to goal
      
        const x_dist_to_paddle = dx / gameArea.width;  // normalized [-1,1]
        const y_dist_to_paddle = dy / gameArea.height; // normalized [-1,1]
  
        const state: state_intercept = {
        X_pos, Y_pos, Z_pos, Vx, Vy, Vz,
        X_paddle, Y_paddle, paddle_speed, paddle_width, paddle_height,
        time_to_wall_x, time_to_wall_y,
        x_dist_to_paddle, y_dist_to_paddle
      };
  
      const action = ai.predict(state);
  
      // ideal action
      let idealMoveX: action = 'none', idealMoveY: action = 'none';
      if (Math.abs(intercept.x - X_paddle) > 0.05)
        idealMoveX = intercept.x > X_paddle ? 'right' : 'left';
      if (Math.abs(intercept.y - Y_paddle) > 0.05)
        idealMoveY = intercept.y > Y_paddle ? 'up' : 'down';
  
      let idealAction: action;
      if (idealMoveX !== 'none' && idealMoveY !== 'none') {
        if (idealMoveX === 'right' && idealMoveY === 'up') idealAction = 'up-right';
        else if (idealMoveX === 'right' && idealMoveY === 'down') idealAction = 'down-right';
        else if (idealMoveX === 'left' && idealMoveY === 'up') idealAction = 'up-left';
        else idealAction = 'down-left';
      } else if (idealMoveX !== 'none') idealAction = idealMoveX;
      else if (idealMoveY !== 'none') idealAction = idealMoveY;
      else idealAction = 'none';
  
      if (action === idealAction) correctMoves++;
      stepsTracked++;
  
      // move paddle
      switch (action) {
        case 'up': Y_paddle += paddle_speed; break;
        case 'down': Y_paddle -= paddle_speed; break;
        case 'left': X_paddle -= paddle_speed; break;
        case 'right': X_paddle += paddle_speed; break;
        case 'up-right': Y_paddle += paddle_speed; X_paddle += paddle_speed; break;
        case 'up-left': Y_paddle += paddle_speed; X_paddle -= paddle_speed; break;
        case 'down-right': Y_paddle -= paddle_speed; X_paddle += paddle_speed; break;
        case 'down-left': Y_paddle -= paddle_speed; X_paddle -= paddle_speed; break;
      }
  
      // move ball
      X_pos += Vx; Y_pos += Vy; Z_pos += Vz;
  
      let bounceInfo = "";
      if (X_pos < -gameArea.width / 2 || X_pos > gameArea.width / 2) {
        Vx *= -1;
        bounceInfo = `${colors.yellow}[X-bounce]${colors.reset}`;
        X_pos = Math.max(Math.min(X_pos, gameArea.width / 2), -gameArea.width / 2);
      }
      if (Y_pos < -gameArea.height / 2 || Y_pos > gameArea.height / 2) {
        Vy *= -1;
        bounceInfo = `${colors.yellow}[Y-bounce]${colors.reset}`;
        Y_pos = Math.max(Math.min(Y_pos, gameArea.height / 2), -gameArea.height / 2);
      }
  
      console.log(
        `Step ${t + 1}: ` +
        `${colors.blue}Ball=(${X_pos.toFixed(2)}, ${Y_pos.toFixed(2)})${colors.reset} ` +
        `${colors.magenta}Intercept=(${intercept.x.toFixed(2)}, ${intercept.y.toFixed(2)})${colors.reset} ` +
        `${colors.green}Paddle=(${X_paddle.toFixed(2)}, ${Y_paddle.toFixed(2)})${colors.reset} ` +
        `${colors.cyan}AI=${action}${colors.reset} ` +
        (action === idealAction
          ? `${colors.green}Ideal=${idealAction}${colors.reset}`
          : `${colors.red}Ideal=${idealAction}${colors.reset}`) +
        ` ${bounceInfo}`
      );
  
      // check intercept
      if (
        Math.abs(X_pos - X_paddle) < paddle_width / 2 &&
        Math.abs(Y_pos - Y_paddle) < paddle_height / 2 &&
        Z_pos < paddleZ
      ) {
        console.log(`✅ Paddle intercepted the ball at step ${t + 1}`);
        break;
      }
    }
  
    const accuracy = (correctMoves / stepsTracked) * 100;
    console.log(`AI action accuracy until intercept: ${accuracy.toFixed(2)}%`);
    return accuracy;
  }

  function testMultipleTrajectories(ai: neural_intercept, nExperiences = 100, steps = 50) {
    let totalAccuracy = 0;
  
    for (let i = 0; i < nExperiences; i++) {
      const acc = testTrajectory(ai, steps);
      totalAccuracy += acc;
    }
  
    const avgAccuracy = totalAccuracy / nExperiences;
    console.log(`\n=== AI average accuracy over ${nExperiences} experiences: ${avgAccuracy.toFixed(2)}% ===`);
  }
  
  

// ===== Training Example =====
const trainingData: trainingStep[] = [];
for (let i = 0; i < 1000; i++) trainingData.push(...generateTrajectory(50));

const ai = new neural_intercept(0.01);
ai.loadFromFile('best_ai_weights_wall_bounces.json')
// const X_train: state_intercept[] = trainingData.map(s => s.state);
// const Y_train: action[] = trainingData.map(s => s.idealAction);

// ai.fitWithTracking(X_train, Y_train, 100, (ai) =>
//   evaluateAI(ai, X_train, Y_train)
// );

testMultipleTrajectories(ai, 15);