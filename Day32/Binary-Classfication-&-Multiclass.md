# Binary Classification vs Multi-Class Classification

## Why we don't calculate Loss Function as we calculate in ReLU?

Suppose hum placement prediction ka model bana rahe hai. Jisme 4 features hai - DSA, Attendance, Projects, Aptitude. And each feature has a certain weightage - for example, DSA has 40% weightage, Attendance has 20%, Projects has 20%, and Aptitude has 20%. So ab hum pahale **Raw Output** nikalte hai jaise hum **ReLU** ke time bhi karte the `Y=m*X+C` se or phir us per **Activation Function** lagate hai.

To suppose karo ki placement wale ke liye hamara general output wali equation hai,

```eq
Output = W1*X + W2*Y + W3*Z + W4*A + B
```

Or is general equation se answer aaya 120, to hum **ReLU** me sirf ye dekhte the ki wo agar 0 se bada hai to hum general output hi le lete the, or agar chhota hai to usko 0 le lete the. Uske liye **ReLU** ki equation,

```eq
ReLU(X) = max(0, X-Threshold)
```

To **ReLU** me hum loss function calculate karte the to usme original input ka bhi contribution hota tha jisse wo linear hi calculate hota tha, & waha punishment linear hi hoti thi.

But **Sigmoid Function** me hum ye nahi kar sakte, kyuki sigmoid function me hume 0 se 1 ke beech me answer chahiye hota hai. To jab hum General Output ko sigmoid function se pass karte hai to wo compress hokar 0 se 1 ke bich hi answer deta hai.

**Sigmoid Function:** $$\sigma(x) = \frac{1}{1 + e^{-x}}$$

To agar hum yaha ab agar **loss function** calculate karte hai to usme original input ka contribution nahi hota hai, balki uski jagah uski compress value jo ki **Sigmoid Function** se mili hai uska contribution hota hai, & agar humne **Loss Function** ko **ReLU** ki tarah hi calculate kiya to wo linear hi punish karega, jabki yaha input me bahut difference bhi kyo na ho, tab bhi wo linear punishment hi karega.

Or agar hum **Sigmoid** ka graph dekhe to wo exponential curve hai, so hume uske hisaab se loss function calculate karna hoga, matlab ki wo jo hume **Sigmoid** se output mila hai, jis per **Loss Function** calculate karenge to usko exponentially punish karna chahiye. Or isliye hi hum **Log** ka use karte hai **Loss Function** me.

> In short **ReLU** me hum normal **Loss Function** isliye calculate kar sakte hai kyuki usme original input ka contribution hota hai, lekin **Sigmoid** me hum normal **Loss Function** calculate nahi kar sakte kyuki usme original input ka contribution nahi hota hai, balki uski compress value jo ki **Sigmoid Function** se mili hai uska contribution hota hai. To agar humne us value jo ki 0 se 1 ke beech hogi usse normal **Loss Function** calculate kiya to wo kaafi kam punishment dega, or iski wajah se usse actual output tak pahuchane me hi kaafi jyada epochs lag jayenge. So isliye hum **Log** ka use karte hai **Loss Function** me.

Kyoki log us sigmoid wale output ko jo ki compress hokar aaya hai, usko same raw output ki tarah hi treat karega, or uske hisaab se loss function calculate karega. Jisse wo exponentially punish karega.

Ab ye log islye liya kyoki **sigmoid** ke output 0 se 1 ke beech hote hai, to suppose ki Output1=0.6, Output2=0.1, or Actual Output=1 hai, to hume Output2 ko thoda jyada tezi se push karna padega 1 ki taraf, or Output1 ko thoda kam tezi se push karna padega 1 ki taraf. Matlab ki jo bhi 1 ke kaafi nearest hoga usko thoda kam push karna padega, or jo 0 ki taraf jyada honge unko thoda jyada push karna padega, to is tarah ka graph hume sirf **Log** me hi milta hai.

![Log Graph](./Log-Graph.webp)

So agar actual output 1 hai, to **Loss Function**

```eq
Loss Function/Error = - log(P), here P is the value of sigmoid function
```

Ab humne yaha isko substract isliye kiya kyoki log ke graph ko agar hum dekhe to 1 ke niche ki saari value -ve hai means 0 se 1 ki saari values -ve hoti hai, but agar hume isko push karna hai to hume **Loss Function** +ve me calculate karna padega, so log ki -ve value ko +ve banane ke liye hi humne substract kiya hai.

## Problem-2

Ab suppose ki Sigmoid se predicted output hai, A=0.2, B=0.4, C=0.8, D=0.9, or Actual Output 0 hai. To is situation me sabse jyada push hume D, usse kam C, usse bhi kam B, or sabse kam A ko push karna padega 0 ki taraf.

Lekin agar hum un sabhi values ka log calculate kare to wo approx,

```
Log(A) => Log(0.2) => -1.609

Log(B) => Log(0.4) => -0.916

Log(C) => Log(0.8) => -0.223

Log(D) => Log(0.9) => -0.105
```

So agar hum dekhe to yaha to sabse jyada push A ko mil raha hai, matlab ye to pura reverse hi ho gaya, ab isko solve karne ke liye hi hum `log(1-P)` formula ka use karte hai. So iske baad humara Loss Function,

```eq
Log(A) => Log(1-0.2) => Log(0.8) => -0.223

Log(B) => Log(1-0.4) => Log(0.6) => -0.510

Log(C) => Log(1-0.8) => Log(0.2) => -1.609

Log(D) => Log(1-0.9) => Log(0.1) => -2.302
```

To ab ye actual me D ko jyada push karega 0 ki taraf, usse kam C, usse bhi kam B, or sabse kam A ko push karega 0 ki taraf. Isliye hmne yaha formula thoda change kiya hai.

In Short:-

```eq
// Agar Actual Output = 1 hai to,
Loss Function = -log(P)

// Agar Actual Output = 0 hai to,
Loss Function = log(1-P)
```

---

## What is the original Loss Function Formula for Sigmoid Function?

```formula
Loss Function/Error= -(Y*log(P) - (1-Y)*log(1-P))

// Here Y means Actual Output
// P means Predicted Output, which is get from sigmoid function
```

Isi **Loss Function** ko hum **Binary Cross Entropy** bhi bolte hai.

Or hamara weights ko update karne ka formula hai:-

```eq
New Weight = Old Weight - Learning Rate * Error * Input
```

---
