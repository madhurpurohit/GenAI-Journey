# Deep Learning From First Principles

## Table of Contents

- [Why Can Humans Write Code?](#why-can-humans-write-code)
  - [What Is Deterministic Output?](#what-is-deterministic-output)
- [Why Do We Need Deep Learning?](#why-do-we-need-deep-learning)
  - [Problem 1: Character Recognition From Images](#problem-1-character-recognition-from-images)
  - [Problem 2: Animal Recognition From Images](#problem-2-animal-recognition-from-images)
- [How Do Humans Learn To Recognize Things?](#how-do-humans-learn-to-recognize-things)
  - [Why Can't We Define Human Learning Logically?](#why-cant-we-define-human-learning-logically)
  - [What About Language Acquisition?](#what-about-language-acquisition)
  - [Why Haven't We Built AGI Yet?](#why-havent-we-built-agi-yet)
- [How Do We Solve Non-Deterministic Problems?](#how-do-we-solve-non-deterministic-problems)
- [Some Worked Examples](#some-worked-examples)
  - [Problem 1: Single Input Prediction](#problem-1-single-input-prediction)
  - [Problem 2: Multi-Input Prediction](#problem-2-multi-input-prediction)
- [How Is The Formula Actually Generated?](#how-is-the-formula-actually-generated)
- [Why Don't We Directly Divide To Correct The Error?](#why-dont-we-directly-divide-to-correct-the-error)
  - [What Is A Loss Function?](#what-is-a-loss-function)
- [How Do We Decide The Movement Size (Step Size)?](#how-do-we-decide-the-movement-size-step-size)
  - [Step-By-Step Weight Update (Iteration 1)](#step-by-step-weight-update-iteration-1)
  - [Step-By-Step Weight Update (Iteration 2)](#step-by-step-weight-update-iteration-2)
  - [The Problem With Uniform Updates](#the-problem-with-uniform-updates)
  - [The Solution: Input-Weighted Updates](#the-solution-input-weighted-updates)
  - [The Final Trained Formula (Single Neuron)](#the-final-trained-formula-single-neuron)
- [What Is An Epoch?](#what-is-an-epoch)

---

## Why Can Humans Write Code?

As humans, we can write working code for normal problems like checking for prime numbers, generating Fibonacci series, implementing sliding window algorithms, tree traversals, and so on. However, we can only write this code when we know the underlying logic behind it. And if we know the logic, we can implement it in any programming language. Furthermore, since we wrote the code ourselves, we can confirm what output a given input will produce, which allows us to cross-check our logic. If there's a mistake somewhere, we can easily fix it. The key point here is that the output is known to us in advance — this is what we call **Deterministic Output**.

### What Is Deterministic Output?

**Deterministic Output** simply means that we know in advance what output a given input will produce. The core concept is that no matter how many times we provide the same input, the system will always return the same output. For example, if we write code for `2 + 2`, it will always return `4`, even if we run it 100 times.

---

## Why Do We Need Deep Learning?

So far, as humans, we could solve problems whose outputs are deterministic. But in the real world, we encounter many problems whose outputs are **non-deterministic** — problems for which writing a fixed logic is simply impossible. Here are some examples:

### Problem 1: Character Recognition From Images

Suppose we need to take an image as input in which a single character is written, and we need to return that character as output. And we have to build this using only a specific programming language — no third-party libraries. This problem exists in real life: think about how CCTV cameras issue traffic challans, or how cameras at toll booths recognize FasTags. In all these situations, the vehicle's number plate is just an image for the CCTV, and the system needs to extract the data (i.e., the number) from that image.

### Problem 2: Animal Recognition From Images

Or suppose we need to build a system that takes an image as input and returns the name of the animal shown in that image. This is also a non-deterministic problem because we don't know in advance what input will arrive, and the output is also non-deterministic.

> **In short:** Deterministic input always produces deterministic output, and non-deterministic input produces non-deterministic output.

---

## How Do Humans Learn To Recognize Things?

Let's think about how we, as humans, recognize images and objects. For instance, if we need to teach a baby the difference between a Dog and a Cat, how would we do it?

We use the **repetition method**. We repeatedly show the baby images of Dogs and Cats, and through this process, a neural network gets built inside the baby's mind, which then enables the baby to easily identify whether something is a Dog or a Cat.

Now if we think about it, we never gave the baby any hard-and-fast rules like "if something is round and red, it's an apple" or "if something is round, it's a ball." Because if we had, then when we placed a Red Ball in front of the baby, it would have called it an Apple, which would be incorrect.

So how does a baby actually learn? It learns through **observation**. Whatever the baby sees repeatedly, it starts accepting as reality. For example, by repeatedly showing the baby images of a Dog and telling it "this is a Dog," the baby eventually becomes able to easily distinguish between a Dog and a Wolf, because it has seen the Dog repeatedly.

### Why Can't We Define Human Learning Logically?

But if we think logically, we don't actually know what's going on inside the baby's mind — how it learns. There is no defined logic for this process. Similarly, even for emotions, there is no logic for when a human feels anger, when they feel happiness, etc. We only know that certain hormones get released and that's why these emotions occur. But the underlying logic — when exactly those hormones are released — is unknown. For instance, if someone jokingly says something offensive, we laugh at that moment. But if someone says the same thing seriously, we get angry. What is the logic behind this? And even within anger, how angry do we get — are we just yelling, or are we getting into a physical fight?

### What About Language Acquisition?

Similarly, as humans, we don't even know what our "original language" is. If we speak random words in front of both a baby and a dog, how does the baby identify and adapt to those words? Both a baby and a dog understand what we're saying, but the baby eventually learns to speak while the dog cannot. And we don't actually teach the baby its mother tongue directly — whether it's Hindi, English, Urdu, Russian, French, etc. We simply repeat certain words or sentences in front of the baby, and the baby then starts speaking different types of sentences and even entirely new words that we never taught it. How is this possible? There is no defined logic for this.

> Similarly, as humans, we don't even understand how we think, how we learn things. We also cannot define consciousness.

### Why Haven't We Built AGI Yet?

If we were able to define all of these things (learning, thinking, consciousness), couldn't we use that logic to replicate it in code? If we could, we would have already built **AGI (Artificial General Intelligence)** by now.

---

## How Do We Solve Non-Deterministic Problems?

For this, we use a specific method: we provide a large number of inputs along with their corresponding outputs, and we get a **function** built that we can then use to find the output for similar types of data.

$$
\text{input} \xrightarrow{\text{function}(x)} \text{output}
$$

For deterministic problems, we write the function ourselves. But for non-deterministic problems, we don't write the function ourselves — instead, we get the **machine** to build it. To do this, we provide the machine with a large number of inputs and their corresponding outputs.

> **In short:** In Deep Learning, we are essentially finding that **Function(X)**.

---

## Some Worked Examples

### Problem 1: Single Input Prediction

If we are given Study Hours and their corresponding Marks, can we predict the marks for a given number of study hours?

| Study (X) | Marks (Y) |
| --------- | --------- |
| 2         | 22        |
| 3         | 32        |
| 4         | 42        |
| 5         | 52        |
| 6         | 62        |
| 7         | ?         |

If we observe the data carefully, a formula becomes visible:

```formula
Y = 2*X + 2
```

So the output for X=7 would be **16** (Note: applying the visible pattern from the data).

### Problem 2: Multi-Input Prediction

If we are given Study Hours and Sleep Hours along with corresponding Marks, can we predict the Marks when both Study Hours and Sleep Hours are provided?

| Study(X) | Sleep(Y) | Marks(Z) |
| -------- | -------- | -------- |
| 3        | 2        | 25       |
| 4        | 5        | 39       |
| 5        | 8        | 53       |
| 8        | 2        | 50       |
| 6        | 6        | 52       |
| 7        | 3        | ?        |

We can find a pattern here too, though it takes more effort:

```formula
Z = 5*X + 3*Y + 4
```

So the output for X=7, Y=3 would be **48**.

> **This is exactly what Deep Learning does** — it generates this formula (i.e., the function) automatically. That's precisely why we feed it a large number of inputs and their corresponding outputs beforehand.

---

## How Is The Formula Actually Generated?

Let's understand this using Problem 2. We don't know the pattern or relationship between the inputs and output. But we do know that we have 2 known input variables X and Y. Based on this, we create a generalized formula:

```formula
Z = W1*X + W2*Y + B
```

Here, **W1**, **W2**, and **B** are unknown — these are what we need to find. Since the values of X and Y are given along with their corresponding outputs, we start by assigning random initial values to W1, W2, and B. We then use a **hit-and-trial** approach to find the actual values of W1, W2, and B.

Suppose we initially set **W1 = 15**, **W2 = 2**, and **B = 1**. Plugging in X = 3, Y = 2:

```solution
Z = 15*3 + 2*2 + 1
Z = 50
```

But we know the actual output is **25**. So the output we received is 2 times the actual output. A natural thought would be: "If we divide all of W1, W2, and B by 2, we'll get the desired output."

But we **should not** do this. The reason is that this idea came from looking at just 1 input-output pair. In the real world, data doesn't always follow a clean pattern. We need to reach the **nearest approximation** of the actual pattern. And most of the time in Deep Learning, we don't get a perfectly accurate pattern.

### Why Did We Introduce W1, W2, And B?

We introduced W1, W2, and B because it's simply not possible for the inputs X and Y to directly convert into the output Z. The output will always depend on some percentage of X, some percentage of Y, and some constant value. That's why we use W1, W2, and B. And if any input were truly not contributing to the output, its weight (W1 or W2) would naturally become 0 or 1.

> **In Deep Learning, we are always finding the values of weights (like W1, W2) and biases (like B).**

---

## Why Don't We Directly Divide To Correct The Error?

Because real-world data contains **Noise**. **Noise** means that in the real world, there is a huge amount of data, and within it, there can be plenty of incorrect data points — many values could be wrong, there could be many outliers, or there could be many missing values, etc.

![Explanation](Why-we-not-divide.svg)

The problem with dividing directly is that it causes an **instant jump**. Suppose there's some noisy/wrong data in between — then according to that wrong data, our entire function would go wrong. That's why we don't divide or make instant jumps.

As a solution, we take **very small steps**. So if there's any wrong data present in between, we make very minimal movement, and if the data is correct, we continue progressing accordingly.

### What Is A Loss Function?

So how do we decide these small steps? We do this by finding the **error** — the difference between the expected output and the actual output. This is called the **Loss Function**.

```
Loss Function/Error = Actual Output - Expected Output
```

---

## How Do We Decide The Movement Size (Step Size)?

### Step-By-Step Weight Update (Iteration 1)

```
W1New = W1Old + (0.01 * Error)

W2New = W2Old + (0.01 * Error)

BNew = BOld + (0.01 * Error)
```

So we get the new values: **W1 = 14.75**, **W2 = 1.75**, and **B = 0.75**. Our new formula becomes:

```formula
Z = 14.75*X + 1.75*Y + 0.75
```

### Step-By-Step Weight Update (Iteration 2)

Now we take the next pair of X and Y values:

```
Z = 14.75 * 4 + 1.75 * 5 + 0.75
Z = 59 + 8.75 + 0.75
Z = 68.5
```

And the **Loss Function** is:

```
Loss Function/Error = 39 - 68.5
Loss Function/Error = -29.5, So we take a roundOf -30.
```

So the new values of W1, W2, and B become:

```
W1New = 14.75 + (0.01 * -30) => 14.45

W2New = 1.75 + (0.01 * -30) => 1.45

BNew = 0.75 + (0.01 * -30) => 0.45
```

### The Problem With Uniform Updates

However, if we look at this approach, we'll never actually reach the correct formula this way, because we are always adding/subtracting only `0.01 * Error`. That's why we also use a **Learning Rate**, which tells us how large each step should be.

Suppose X=0 and Y=5. We can clearly see that W1 has **no contribution** to the error/loss function at all, yet we are still punishing it. With the previous method, we are updating W1New, W2New, and BNew all by `0.01 * Error`. But the error actually came because of W2 and B — so why are we updating W1 at all, since it made no contribution to the error?

### The Solution: Input-Weighted Updates

The solution is to multiply the error by the corresponding input. This way, whoever contributed more to the error gets proportionally more punishment. The new formula becomes:

```
W1New = W1Old + (0.01 * Error * X)

W2New = W2Old + (0.01 * Error * Y)

BNew = BOld + (0.01 * Error * 1)
```

So if X=3, Y=2, B=1 and Error = -25, the new values of W1, W2, and B become:

```
W1New = 15 + (0.01 * -25 * 3) => 14.25

W2New = 2 + (0.01 * -25 * 2) => 1.5

BNew = 1 + (0.01 * -25 * 1) => 0.75
```

So now all three — W1, W2, and B — are moving at their own respective speeds. We will then use these updated values in the next iteration, and in this way, we keep getting closer and closer to the actual output.

### The Final Trained Formula (Single Neuron)

So if we have 1000 data points, it's not guaranteed that a 100% accurate formula will be generated. Rather, in Deep Learning, we try to get as close to an accurate formula as possible. Because real-world data contains noise, we can never build a 100% accurate formula.

So maybe after training on 100 data points, the formula becomes:

```
Z = 4.98*X + 3.01*Y + 4.2
```

This formula is what we call a **Single Neuron**. So basically, in **Deep Learning**, we are finding the values of W1, W2, and B. We can also have many weights such as W1, W2, W3, and so on.

![Single Neuron Working](Single-Neuron-Working.svg)

---

## What Is An Epoch?

An **Epoch** means how many times we have trained our model on the entire dataset. For example, if we trained our model 100 times over the whole dataset, that means 100 epochs. It's similar to how we, as humans, read a book a certain number of times until we stop learning new things from it — likewise, we train our model for a specific number of epochs.

> **So far, we are only finding a single straight-line equation**, because at the end, our formula is still a straight-line equation like `y = mx + c`. We have not yet found complex functions like **Quadratic Functions** or **Cubic Functions**, etc.

---
