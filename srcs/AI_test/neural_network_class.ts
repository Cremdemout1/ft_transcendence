type ActivationFunction = (x: number) => number;

function relu(x: number): number {
  return Math.max(0, x);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function tanh(x: number): number {
  return Math.tanh(x);
}

class HiddenLayer {
  nodes: number;
  weights: number[][];
  values?: number[];
  biases: number[];

  constructor(prevNodes: number, nodes: number) {
    this.nodes = nodes;
    this.weights = Array.from(
      { length: prevNodes },
      () =>
        //each row is all the weights that connect to the each neuron in the present layer (incoming connections), each column is the weights of each neuron that connect it to every neuron in the present layer (outgoing connections)
        Array.from({ length: nodes }, () => Math.random() - 0.5) //with this shape i don't need to transpose my arrays to use dot product (I THINK)
    );
    this.biases = Array.from({ length: nodes }, () => Math.random() - 0.5);
  }

  //   private normal_dist(): number {
  //     //normal distribution (need to implement box-muller transform here)
  //   }

  //   private initWeight(prevNodes: number): number {//better weight initialization
  //     const stddev = 1 / Math.sqrt(prevNodes);
  //     return this.normal_dist() * stddev;
  //   }
}

export default class NeuralNet {
  //i tried to make this as flexible as possible to allow for easier correction of design mistakes while i try to figure out how to shape the net exactly
  inodes: number;
  onodes: number;
  learning_rate: number;
  hidden_layers: HiddenLayer[] = [];
  acti_func: ActivationFunction; //for hidden layers prefer reLU, but try others as well
  output_acti_func: ActivationFunction; //keep sigmoid
  epochs: number;

  constructor(
    input_nodes: number,
    output_nodes: number,
    hidden_layers: number[], //include output layer but not input
    l_r: number,
    activation: "relu" | "sigmoid" | "tanh" = "relu",
    epochs: number
  ) {
    this.inodes = input_nodes;
    this.onodes = output_nodes;
    this.learning_rate = l_r;
    this.output_acti_func = sigmoid;
    this.epochs = epochs;

    switch (activation) {
      case "relu":
        this.acti_func = relu;
        break;
      case "sigmoid":
        this.acti_func = sigmoid;
        break;
      case "tanh":
        this.acti_func = tanh;
        break;
    }

    let prev_nodes = this.inodes;

    for (let i = 0; i < hidden_layers.length; i++) {
      this.hidden_layers.push(new HiddenLayer(prev_nodes, hidden_layers[i]));
      prev_nodes = hidden_layers[i];
    }
  }

  public predict(input_array: number[]): number[] {
    let curr_values = input_array;

    for (let layer of this.hidden_layers) {
      //updates the whole layer at once! god bless matrix math
      let z = this.addBias(
        this.dotProd(curr_values, layer.weights),
        layer.biases
      );
      curr_values = z.map(this.acti_func);
      layer.values = curr_values;
    }
    const output_values = curr_values;

    return output_values;
  }

  private dotProd(v: number[], mat: number[][]): number[] {
    //vector by matrix dot product
    const result: number[] = [];
    for (let j = 0; j < mat[0].length; j++) {
      //each row is all incoming connections, so this loops over all present layers neurons and calculates its value
      let sum = 0;
      for (let i = 0; i < v.length; i++) {
        sum += v[i] * mat[i][j];
      }
      result[j] = sum;
    }
    return result;
  }

  private addBias(vec: number[], bias: number[]): number[] {
    return vec.map((v, i) => v + bias[i]);
  }

  public parse_output(output: number[]): string {
    const chosen = output.reduce(
      (bestIndex, currentValue, currentIndex, array) => {
        return currentValue > array[bestIndex] ? currentIndex : bestIndex;
      },
      0
    );

    switch (chosen) {
      case 0:
        return "w";
        break;
      case 1:
        return "wa";
        break;
      case 2:
        return "a";
        break;
      case 3:
        return "as";
        break;
      case 4:
        return "s";
        break;
      case 5:
        return "sd";
        break;
      case 6:
        return "d";
        break;
      case 7:
        return "wd";
        break;
      case 8:
        return "none";
        break;
      default:
        return "something's wrong bro";
        break;
    }
  }

  public parse_input() {
    //decide on what raw input even is, parse to (0,1) range values
  }

  public train(
    data: Array<{ input: number[]; output: number[]}>, //for now assume already parsed input/non parsed output (0,0,0,0,1,0,0) smth like this
    batchSize: number = 1
  ) {
    for (let epoch = 0; epoch < this.epochs; epoch++) {

      for (let i = 0; i < data.length; i += batchSize) {
		const batch = data.slice(i, i + batchSize);
		for (const sample of batch) {
			let predicted_output= this.predict(sample.input);
			//omg i'm getting sleepy but here calculate diff between predicted output vector and data output vec
			//then do the mean with that and bam cost function 
		}
		//update weights and biases with backprop (partial derivative of aforementioned cost function with respect to [every single weight and bias there is])
	  }
    }
  }
}

//make a map to store training data (correct input/output pairs basically)
