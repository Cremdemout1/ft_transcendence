import * as fs from "fs";

type ActivationFunction = (x: number[]) => number[];

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export function relu2(x: number[]): number[] {
  return x.map((nbr) => Math.max(0, nbr));
}

// function softmax(x: number[]): number[] {
//   const highest = Math.max(...x);
//   const fix = x.map((n) => n - highest);
//   const exp = fix.map((n) => Math.exp(n));
//   const base = exp.reduce((sum, curr) => sum + curr, 0);
//   return exp.map((n) => n / base);
// }

// function sigmoid(x: number[]): number[] {
//   return x.map((nbr) => 1 / (1 + Math.exp(-nbr)));
// }

export function tanh(x: number[]): number[] {
  return x.map((nbr) =>Math.tanh(nbr));
}

function dotProduct(weights: number[][], inputs: number[]) {
  let outputs: Array<number> = [];
  for (let i = 0; i < weights.length; i++) {
	let output: number = 0;
	for (let j = 0; j < inputs.length; j++) output += weights[i][j] * inputs[j];
	outputs[i] = output;
  }
  return outputs;
}

function matrixDotProduct(inputs: number[][], weights: number[][]) {
  let outputs: Array<Array<number>> = [];
  for (let i = 0; i < inputs.length; i++)
	outputs[i] = dotProduct(weights, inputs[i]);
  return outputs;
}

function addVec(vector1: number[], vector2: number[]) {
  let output: Array<number> = [];
  for (let i = 0; i < vector1.length; i++) output[i] = vector1[i] + vector2[i];
  return output;
}

function addMatrixVec(matrix: number[][], vector: number[]) {
  let outputs: Array<Array<number>> = [];

  for (let i = 0; i < matrix.length; i++)
	outputs[i] = addVec(matrix[i], vector);
  return outputs;
}

export function calculateHitpoint(p_: Vec3, v_: Vec3) {

    let p = { ...p_ };
    let v = { ...v_ };

    while (1) {
 
        p.x += v.x;
        p.y += v.y;
        p.z += v.z;
        if (p.z <= -48 || p.z >= 48) {
            return { ...p };
        }


        if (p.y <= -50 || p.y >= 50) {
            p.y = Math.sign(p.y) * (50 - 3.25 - 0.01);
            v.y = -v.y;
			//console.log("hitpoint not x: "+ p.x+", "+p.y+ ", "+p.z);
        }

        if (p.x <= -50 || p.x >= 50) {
            p.x = Math.sign(p.x) * (50 - 3.25 - 0.01);
            v.x = -v.x;
			//console.log("hitpoint not x: "+ p.x+", "+p.y+ ", "+p.z);
        }
    }
}

export function sample_data2(amount: number, state: any |undefined) {
  let y: number[][] = [];
let x: number[][] = [];
  if(!state)
  {
  x = Array.from({ length: amount }, () => {
	const part1 = Array.from({ length: 3 }, () => Math.random() * 100 - 50);//ball pos
	const part2 = Array.from(
	  { length: 3 },
	  () => (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.7 + 0.4)//ball vel
	);
	const part3 = Array.from({ length: 2 }, () => Math.random() * 100 - 50);//paddle pos
	return [...part1, ...part2, ...part3];
  });
  }
  else
  {
	x[0] = [];
	x[0].push(-(state.ball.pos.z));
	x[0].push(state.ball.pos.y);
	x[0].push(-(state.ball.pos.x));
	x[0].push(-(state.ball.velocity.z));
	x[0].push(state.ball.velocity.y);
	x[0].push(-(state.ball.velocity.x));
	x[0].push(state.paddles[1].x);
	x[0].push(state.paddles[1].y);
  }
	  for (const row of x) {
	const [px, py, pz, vx, vy, vz] = row;

	const p_: Vec3 = { x:px, y:py, z:pz };
	const v_: Vec3 = { x: vx, y: vy, z: vz };

  	let hitPoint =calculateHitpoint(p_, v_);
	const output: number[]=[];
	if(hitPoint) output.push(hitPoint.x/50, hitPoint.y/50);
	y.push(output);
  }

  //console.log(x);
  //console.log(y);
  return [x, y];
}

function transposeMatrix(m: number[][])
{
	let new_m: Array<Array<number>> = [];
	for(let i=0; i<m.length; i++)
	{
		for(let j=0; j<m[i].length; j++)
		{
			if (!new_m[j]) new_m[j] = [];
			new_m[j][i]=m[i][j];
		}
	}
	return new_m;
}

// function loss_categoricalCrossEntropy(ohe_target: number [][], curr_output: number[][]){//one hot encoded target output, current output
// 	let losses: number[]=[];
// 	let indexes: number[]=[];
// 	ohe_target.map(item =>{
// 		item.map((nbr, idx) =>{ 
// 			if(nbr==1)
// 				indexes.push(idx);
// 		});
// 	});
// 	let accuracy=0;
// 	curr_output.map((item, idx) =>{
// 		let target= item[indexes[idx]]==0 ? 0.0000001 : item[indexes[idx]];
// 		losses.push(-Math.log(target));
// 		let choice = item.indexOf(Math.max(...item));
// 		if(choice==indexes[idx])
// 			accuracy+=1/indexes.length;
// 	});
// 	console.log("accuracy:"+ accuracy);
// 	return losses.reduce((prev, current) => prev + current) / losses.length;
// }

// function outputLayer_backward(dvalues: number[][], y_true: number[][])//combined derivative of cross entropy loss function and softmax function
// {
// 	let samples= dvalues.length;
// 	let labels= dvalues[0].length;

// 	let discrete_labels: number []= [];
// 	y_true.map((item, idx) =>{
// 		discrete_labels.push(item.indexOf(Math.max(...item)));
// 	});

// 	let res: number [][]=[];
// 	res= dvalues.map(row => [...row]);
// 	res.map((item, idx)=>{
// 		res[idx][discrete_labels[idx]]-=1;
// 	});
// 	for (let i = 0; i < samples; i++) {
// 		for (let j = 0; j < res[i].length; j++) {
// 			res[i][j] /= samples;
// 		}
// 	}
// 	return res;
// }

// function mean(arr: number[]): number {
//     return arr.reduce((a, b) => a + b, 0) / arr.length;
// }

// function meanRows(arr: number[][]){
//     return arr.map(row => row.reduce((sum, num) => sum + num, 0) / row.length);//mean of every row
// }

// function MSE(ohe_target: number [][], curr_output: number[][]) {
//     const squaredDiff: number[][] = ohe_target.map((item, idx) =>
//         item.map((val, j) => (val - curr_output[idx][j]) ** 2)//(y_true - y_predicted)^2
//     );
//     return mean(meanRows(squaredDiff));
// }

// function outputLayer_backward_MSE(dvalues: number[][], y_true: number[][]){
// 	let samples= dvalues.length;
// 	let outputs= dvalues[0].length;

// 	let res: number[][] = y_true.map((item, idx) =>
//     item.map((val, j) => (-2 * (val - dvalues[idx][j])) / outputs)//gradient on values (mse derivative: -2(y_true - y_predicted))
// );
//     res = res.map(item =>
//     item.map(val => val / samples)
// );
// 	return res;
// }

// function regressionAccuracy(
//     predictions: number[][],
//     y_true: number[][],
//     threshold: number =0.2//10/50 for normalization
// ): number {

//     const errors = predictions.map((p, i) => {//distance
//         const dx = p[0] - y_true[i][0];
//         const dy = p[1] - y_true[i][1];
//         return Math.sqrt(dx*dx + dy*dy);
//     });

//     const correct = errors.map(e => e < threshold ? 1 : 0);

//     return mean(correct);
// }


export class Layer_Dense2 {
  weights: Array<Array<number>> = [];
  biases: Array<number> = [];
  output: Array<Array<number>> = [];
  actFunc: ActivationFunction;
  layer_inputs: number[][]= [];
  drelu: number[][]= [];
  dweights: number[][] = [];
  dinputs: number[][] = [];
  dbiases: number[][] = [];
  w_momentums: number[][] = [];
  b_momentums: number[][] = [];

  constructor(
	n_inputs: number,
	n_neurons: number,
	activation: ActivationFunction
  ) {
	this.weights = Array.from({ length: n_neurons }, () =>
	  Array.from({ length: n_inputs }, () => Math.random() - 0.5)
	);
	this.biases = Array.from({ length: n_neurons }, () => Math.random() - 0.5);
	this.actFunc = activation;
  }

  public forward(inputs: number[][]) {
	this.layer_inputs=inputs;
	this.output = addMatrixVec(
	  matrixDotProduct(inputs, this.weights),
	  this.biases
	);
	this.output = this.output.map((item) => this.actFunc(item));
  }

  public backward(dvalues: number[][]){
	this.drelu= dvalues.map(row => [...row]);
	if(this.actFunc==relu2)
	{
		this.drelu.map((item, idx) => {
		item.map((pos) => {
			if(this.output[idx][pos]<=0) this.drelu[idx][pos]=0;//actually should be only ==0
		})
		});
	}

	this.dweights = transposeMatrix(matrixDotProduct(transposeMatrix(this.layer_inputs), transposeMatrix(this.drelu)));
	this.dbiases = [Array(this.drelu[0].length).fill(0)];
	for (let i = 0; i < this.drelu.length; i++) {
		for (let j = 0; j < this.drelu[0].length; j++) {
			this.dbiases[0][j] += this.drelu[i][j];
		}
	}
	this.dinputs = matrixDotProduct(this.drelu, transposeMatrix(this.weights));
  }

}

// class Optimizer_SGD {
// 	learning_rate=1;
// 	decay=0.0000001;
// 	weights_upd:number [][]=[];
// 	biases_upd:number [][]=[];
// 	momentum=0.5;

// 	public update_params(layer: Layer_Dense, iterations:number){

// 		if(iterations==0)
// 		{
// 			layer.w_momentums= layer.dweights.map(row => row.map(() => 0));
// 			layer.b_momentums= layer.dbiases.map(row => row.map(() => 0));
// 		}

// 		this.weights_upd= layer.dweights.map(row => row.map(() => 0));
// 		this.biases_upd= layer.dbiases.map(row => row.map(() => 0));

// 		for (let i = 0; i < layer.dweights.length; i++) {
// 			for (let j = 0; j < layer.dweights[0].length; j++) {
// 				this.weights_upd[i][j] = this.momentum* layer.w_momentums[i][j]-this.learning_rate*layer.dweights[i][j];
// 			}
// 		}
// 		layer.w_momentums=this.weights_upd;

// 		for (let i = 0; i < layer.dbiases.length; i++) {
// 			for (let j = 0; j < layer.dbiases[0].length; j++) {
// 				this.biases_upd[i][j] = this.momentum* layer.b_momentums[i][j]-this.learning_rate*layer.dbiases[i][j];
// 			}
// 		}
// 		layer.b_momentums=this.biases_upd;

// 		for (let i = 0; i < layer.weights.length; i++) {
// 			for (let j = 0; j < layer.weights[0].length; j++) {
// 				// layer.weights[i][j] += -this.learning_rate * layer.dweights[i][j];
// 				layer.weights[i][j] += this.weights_upd[i][j];
// 			}
// 		}
// 		for (let i = 0; i < layer.biases.length; i++) {
// 				// layer.biases[i] += -this.learning_rate * layer.dbiases[0][i];
// 				layer.biases[i] += this.biases_upd[0][i];
// 		}
// 	}

// 	public update_lr(iterations: number){
// 		this.learning_rate=this.learning_rate*1/(1+this.decay*iterations);
// 		if(iterations%100==0)
// 			console.log("lr: "+ this.learning_rate);
// 	}
// }

export function LoadWeights2(layer1: Layer_Dense2, layer2: Layer_Dense2, layer3: Layer_Dense2)
{
	const raw = fs.readFileSync("/home/game_server/src/AI/xypos84.json", "utf8");
const saved = JSON.parse(raw);

layer1.weights = saved.layer1.weights;
layer1.biases  = saved.layer1.biases;

layer2.weights = saved.layer2.weights;
layer2.biases  = saved.layer2.biases;

layer3.weights = saved.layer3.weights;
layer3.biases  = saved.layer3.biases;

// console.log("Model loaded!");
}

// function oheToDiscreet(output: [][]){
// 	let indexes: number[]=[];
// 	output.map(item =>{
// 		item.map((nbr, idx) =>{ 
// 			if(nbr==1)
// 				indexes.push(idx);
// 		});
// 	});

// 	return indexes;
// }

// let layer1 = new Layer_Dense(8, 64, relu);
// let layer2 = new Layer_Dense(64, 32, relu);
// let layer3 = new Layer_Dense(32, 2, tanh);
// let samples = sample_data(300, null);

// // let [xSamples, ySamples] = sample_data(300, null);
// // let scaledYSamples = ySamples.map(output => output.map(value => value * 50));

// // for (let i = 0; i < 20; i++) {
// //   console.log(`Sample ${i + 1}:`);
// //   console.log("Input :", xSamples[i]);
// //   console.log("Output:", scaledYSamples[i]);
// //   console.log("-------------------------");
// // }

// let fixed= samples[0].map((input) => input.map((nbr, idx) => {
// 	if(idx<3 || idx > 5) return nbr/50;
// 	else return nbr/1.1;
// }));
// let optimizer = new Optimizer_SGD();

// //LoadWeights(layer1, layer2, layer3);

// let epochs=10000;
// for (let epoch = 0; epoch < epochs; epoch++) {
// 	samples = sample_data(300, null);
// 	fixed= samples[0].map((input) => input.map((nbr, idx) => {
// 	if(idx<3 || idx > 5) return nbr/50;
// 	else return nbr/1.1;
// }));
// 	layer1.forward(fixed);
// 	layer2.forward(layer1.output);
// 	layer3.forward(layer2.output);
// 	if(epoch % 100==0){
// 		console.log("epoch: "+epoch+", loss: "+MSE(samples[1], layer3.output)+", accuracy: "+regressionAccuracy(samples[1], layer3.output));

//     console.log("First 5 outputs (true vs predicted) in game coordinates:");
//     for (let i = 0; i < 5; i++) {
//         const trueXY = samples[1][i].map(v => v * 50);      // denormalize
//         const predXY = layer3.output[i].map(v => v * 50);   // denormalize
//         console.log(`Sample ${i + 1}: True: ${trueXY}, Pred: ${predXY}`);
//     }
// 	}
// 	let doutputs = outputLayer_backward_MSE(layer3.output, samples[1]);
// 	layer3.backward(doutputs);
// 	layer2.backward(layer3.dinputs);
// 	layer1.backward(layer2.dinputs);
// 	optimizer.update_params(layer1, epoch);
// 	optimizer.update_params(layer2, epoch);
// 	optimizer.update_params(layer3, epoch);
// 	optimizer.update_lr(epoch);
// }

// console.log("-------------------------");
// samples = sample_data(1000, null);
// fixed= samples[0].map((input) => input.map((nbr, idx) => {
// 	if(idx<3 || idx > 5) return nbr/50;
// 	else return nbr/1.1;
// }));


// 	layer1.forward(fixed);
// 	layer2.forward(layer1.output);
// 	layer3.forward(layer2.output);
// 	let loss= MSE(samples[1], layer3.output);
// 	console.log("oos loss: "+loss);
// 	console.log("oos accuracy: "+regressionAccuracy(samples[1], layer3.output));

// 	const modelData = {
//     layer1: { 
//         weights: layer1.weights,
//         biases: layer1.biases 
//     },
//     layer2: { 
//         weights: layer2.weights,
//         biases: layer2.biases 
//     },
//     layer3: { 
//         weights: layer3.weights,
//         biases: layer3.biases 
//     }
// };

// fs.writeFileSync("xypos.json", JSON.stringify(modelData));
// console.log("Model saved!");