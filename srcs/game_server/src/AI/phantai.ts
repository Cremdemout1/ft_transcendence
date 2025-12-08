import * as fs from "fs";

type ActivationFunction = (x: number[]) => number[];

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export function relu(x: number[]): number[] {
  return x.map((nbr) => Math.max(0, nbr));
}

export function softmax(x: number[]): number[] {
  const highest = Math.max(...x);
  const fix = x.map((n) => n - highest);
  const exp = fix.map((n) => Math.exp(n));
  const base = exp.reduce((sum, curr) => sum + curr, 0);
  return exp.map((n) => n / base);
}

export function sigmoid(x: number[]): number[] {
  return x.map((nbr) => 1 / (1 + Math.exp(-nbr)));
}

export function tanh(x: number[]): number[] {
  return x.map((nbr) =>Math.tanh(nbr));
}

export function dotProduct(weights: number[][], inputs: number[]) {
  let outputs: Array<number> = [];
  for (let i = 0; i < weights.length; i++) {
	let output: number = 0;
	for (let j = 0; j < inputs.length; j++) output += weights[i][j] * inputs[j];
	outputs[i] = output;
  }
  return outputs;
}

export function matrixDotProduct(inputs: number[][], weights: number[][]) {
  let outputs: Array<Array<number>> = [];
  for (let i = 0; i < inputs.length; i++)
	outputs[i] = dotProduct(weights, inputs[i]);
  return outputs;
}

export function addVec(vector1: number[], vector2: number[]) {
  let output: Array<number> = [];
  for (let i = 0; i < vector1.length; i++) output[i] = vector1[i] + vector2[i];
  return output;
}

export function addMatrixVec(matrix: number[][], vector: number[]) {
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
        if (p.z <= -50 || p.z >= 50) {
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

export function sample_data(amount: number, state: any | undefined) {
  let y: number[][] = [];
let x: number[][] = [];
  if(!state)
  {
  x = Array.from({ length: amount }, () => {
	const part1 = Array.from({ length: 3 }, () => Math.random() * 100 - 50);//ball pos
	const part2 = Array.from(
	  { length: 3 },
	  () => (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5)//ball vel
	);
	const part3 = Array.from({ length: 2 }, () => Math.random() * 100 - 50);//paddle pos
	return [...part1, ...part2, ...part3];
  });
  }
  else
  {
	// console.log("state");
	// console.log(state);
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
	const [px, py, pz, vx, vy, vz, a, b] = row;

	const p_: Vec3 = { x:px, y:py, z:pz };
	const v_: Vec3 = { x: vx, y: vy, z: vz };

  	let hitPoint =calculateHitpoint(p_, v_);
	let up=0;
	let right=0;
	let correct=0;
	if(a<hitPoint!.x)
		right++;
	else if(a>hitPoint!.x)
		right--;
	if(b<hitPoint!.y)
		up++;
	else if(b>hitPoint!.y)
		up--;

	//console.log("up: "+up);
	//console.log("right: "+right);
	if(up==0 && right==0)//none
		correct=8;
	else if(up>0 && right==0)//w
		correct=0;
	else if(up>0 && right<0)//wa
		correct=1;
	else if(up==0 && right<0)//a
		correct=2;
	else if(up<0 && right<0)//as
		correct=3;
	else if(up<0 && right==0)//s
		correct=4;
	else if(up<0 && right>0)//sd
		correct=5;
	else if(up==0 && right>0)//d
		correct=6;
	else if(up>0 && right>0)//wd
		correct=7;

	const output=Array.from({ length: 9 }, () => 0);
	output[correct]=1;
	//console.log(output);
	y.push(output);
  }

  //console.log(x);
  //console.log(y);
  return [x, y];
}

export function transposeMatrix(m: number[][])
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

export function loss_categoricalCrossEntropy(ohe_target: number [][], curr_output: number[][]){//one hot encoded target output, current output
	let losses: number[]=[];
	let indexes: number[]=[];
	ohe_target.map(item =>{
		item.map((nbr, idx) =>{ 
			if(nbr==1)
				indexes.push(idx);
		});
	});
	let accuracy=0;
	curr_output.map((item, idx) =>{
		let target= item[indexes[idx]]==0 ? 0.0000001 : item[indexes[idx]];
		losses.push(-Math.log(target));
		let choice = item.indexOf(Math.max(...item));
		if(choice==indexes[idx])
			accuracy+=1/indexes.length;
	});
	// console.log("accuracy:"+ accuracy);
	return losses.reduce((prev, current) => prev + current) / losses.length;
}

export function outputLayer_backward(dvalues: number[][], y_true: number[][])//combined derivative of cross entropy loss function and softmax function
{
	let samples= dvalues.length;
	let labels= dvalues[0].length;
	void(labels);
	let discrete_labels: number []= [];
	y_true.map((item, idx) =>{
		void(idx);
		discrete_labels.push(item.indexOf(Math.max(...item)));
	});

	let res: number [][]=[];
	res= dvalues.map(row => [...row]);
	res.map((item, idx)=>{
		void(item)
		res[idx][discrete_labels[idx]]-=1;
	});
	for (let i = 0; i < samples; i++) {
		for (let j = 0; j < res[i].length; j++) {
			res[i][j] /= samples;
		}
	}
	return res;
}

export class Layer_Dense {
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
	if(this.actFunc==relu)
	{
		this.drelu.map((item, idx) => {
		item.map((nbr, pos) => {
			void(nbr);
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

export class Optimizer_SGD {
	learning_rate=1;
	decay=0.0000001;
	weights_upd:number [][]=[];
	biases_upd:number [][]=[];
	momentum=0.5;

	public update_params(layer: Layer_Dense, iterations:number){

		if(iterations==0)
		{
			layer.w_momentums= layer.dweights.map(row => row.map(() => 0));
			layer.b_momentums= layer.dbiases.map(row => row.map(() => 0));
		}

		this.weights_upd= layer.dweights.map(row => row.map(() => 0));
		this.biases_upd= layer.dbiases.map(row => row.map(() => 0));

		for (let i = 0; i < layer.dweights.length; i++) {
			for (let j = 0; j < layer.dweights[0].length; j++) {
				this.weights_upd[i][j] = this.momentum* layer.w_momentums[i][j]-this.learning_rate*layer.dweights[i][j];
			}
		}
		layer.w_momentums=this.weights_upd;

		for (let i = 0; i < layer.dbiases.length; i++) {
			for (let j = 0; j < layer.dbiases[0].length; j++) {
				this.biases_upd[i][j] = this.momentum* layer.b_momentums[i][j]-this.learning_rate*layer.dbiases[i][j];
			}
		}
		layer.b_momentums=this.biases_upd;

		for (let i = 0; i < layer.weights.length; i++) {
			for (let j = 0; j < layer.weights[0].length; j++) {
				// layer.weights[i][j] += -this.learning_rate * layer.dweights[i][j];
				layer.weights[i][j] += this.weights_upd[i][j];
			}
		}
		for (let i = 0; i < layer.biases.length; i++) {
				// layer.biases[i] += -this.learning_rate * layer.dbiases[0][i];
				layer.biases[i] += this.biases_upd[0][i];
		}
	}

	public update_lr(iterations: number){
		this.learning_rate=this.learning_rate*1/(1+this.decay*iterations);

	}
}

export function LoadWeights(layer1: Layer_Dense, layer2: Layer_Dense, layer3: Layer_Dense)
{
	const raw = fs.readFileSync("/home/game_server/src/AI/new_w.json", "utf8");
const saved = JSON.parse(raw);

layer1.weights = saved.layer1.weights;
layer1.biases  = saved.layer1.biases;

layer2.weights = saved.layer2.weights;
layer2.biases  = saved.layer2.biases;

layer3.weights = saved.layer3.weights;
layer3.biases  = saved.layer3.biases;

// console.log("Model loaded!");
}

export function oheToDiscreet(output: number[][]){
	// console.log("ohe output:");
	// console.log(output);
	let indexes: number[]=[];
	let choice:number;
	output.map((item, idx) =>{
		void(idx)
		choice = item.indexOf(Math.max(...item));
	});
	output.map(item =>{
		item.map((nbr, idx) =>{ 
			void(nbr);
			if(idx==choice)
				indexes.push(1);
			else
				indexes.push(0);
		});
	});

	return indexes;
}

// let layer1 = new Layer_Dense(8, 64, relu);
// let layer2 = new Layer_Dense(64, 32, relu);
// let layer3 = new Layer_Dense(32, 9, softmax);
// let samples = sample_data(2000, null);
// let fixed= samples[0].map((input) => input.map((nbr, idx) => {
// 	if(idx<3 || idx > 5) return nbr/50;
// 	else return nbr/0.5;
// }));
// let optimizer = new Optimizer_SGD();

//LoadWeights(layer1, layer2, layer3);

// let epochs=10000;
// for (let epoch = 0; epoch < epochs; epoch++) {
// 	samples = sample_data(2000, null);
// 	fixed= samples[0].map((input) => input.map((nbr, idx) => {
// 	if(idx<3 || idx > 5) return nbr/50;
// 	else return nbr/0.5;
// }));
// 	layer1.forward(fixed);
// 	layer2.forward(layer1.output);
// 	layer3.forward(layer2.output);
// 	if(epoch % 100==0)
// 		console.log("epoch: "+epoch+", loss: "+loss_categoricalCrossEntropy(samples[1], layer3.output));
// 	let doutputs = outputLayer_backward(layer3.output, samples[1]);
// 	layer3.backward(doutputs);
// 	layer2.backward(layer3.dinputs);
// 	layer1.backward(layer2.dinputs);
// 	optimizer.update_params(layer1, epoch);
// 	optimizer.update_params(layer2, epoch);
// 	optimizer.update_params(layer3, epoch);
// 	optimizer.update_lr(epoch);
// }

// console.log("-------------------------");
// samples = sample_data(2000, null);
// fixed= samples[0].map((input) => input.map((nbr, idx) => {
// 	if(idx<3 || idx > 5) return nbr/50;
// 	else return nbr/0.5;
// }));


// 	layer1.forward(fixed);
// 	layer2.forward(layer1.output);
// 	layer3.forward(layer2.output);
// 	let loss= loss_categoricalCrossEntropy(samples[1], layer3.output);
// 	console.log("loss: "+loss);

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

// fs.writeFileSync("momentum.json", JSON.stringify(modelData));
// console.log("Model saved!");