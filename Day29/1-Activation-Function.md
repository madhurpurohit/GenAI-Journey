# Learn about Activation Function

Humne abhi tak sirf ek single neuron ke baare mein padha hai, or hum kaise ek straight line ki equation ko find karte the, jo hi hamara actual function/formula hota tha.

**Problem1:-**

| Study Hour (X) | Marks (Y) |
| -------------- | --------- |
| 1              | 3         |
| 2              | 5         |
| 3              | 7         |
| 4              | 9         |
| 5              | 11        |
| 6              | 13        |
| 7              | ?         |

So hum isme ek straight line equation `y=mx+c`, ki tarah hi iska answer find karte hai.

```equation
Y = 2*X + 1,   (Y = W1*X + B)
```

So agar hum iska graph build kare to wo ek straight line hogi, isliye hi hum kahte hai ki ek single neuron se hum kewal straight line hi build kar sakte hai.

![Single Neuron Graph](./Single%20Neuron%20Graph.svg)

Lekin humne abhi tak dekha ki hum ek single neuron se kewal straight line hi build kar sakte hai, lekin real life me hume kewal straight line hi nahi chahiye hoti hai, balki real life me equation quadratic, circle, eclipse etc type ki bhi hoti hai so hum unko kaise generate karenge.

But ab ek real world scenerio wali problem lete hai.

**Problem2:-** Suppose koi person hai jo ki ek certain amount of time tak kaam karta hai to usko koi extra pay nahi milta, but jaise hi wo us time limit se extra kaam karta hai to usko per hour extra kaam karne ke hisaab se payment milta hai.

| Time (X) | Payment (Y) |
| -------- | ----------- |
| 1        | 0           |
| 2        | 0           |
| 3        | 0           |
| 4        | 1           |
| 5        | 2           |
| 6        | 3           |
| 7        | 4           |
| 8        | 5           |
| 9        | ?           |

So agar hum iska graph representation dekhe to. Isme hume do straight line dikhayi deti hai jo ek point ke baad bend hone se ek single line form kar rahi hai. Is bend ko hi hum activation function kahte hai.

![Visual of Problem](./Dual-Neuron-Bend.svg)

So ab hume ye dekhna hai ki hum is bend ko kaise build kar sakte hai, matlab hum iske liye kaise equation find karenge. So hum isko agar normal coding me write karne ki koshish kare to ye kuch is tarah se hoga.

```syntax
if(X<=3){
return 0;
}else {
return X-3;
}
```

To ab main question ye hai ki kya hum **Deep Learning** me hum ye if-else ko equation ke form me likh sakte hai, iska answer hai **Yes**. Lekin agar hume condition pata hai means hume pattern pata hai, to hum isko to code me khud bhi likh sakte hai. But **Deep Learning** ka hum tab use karte hai jab hume khud ko pattern nahi pata ho, so iska matlab ki hum isko khud nahi likh sakte. To ab main question ki phir hum iske liye equation kaise create karenge.

Ab agar hum ye soche ki kya ho agar hum do neuron ka use kare, first neuron ka output dusare neuron ka input ho to kya hum isko solve kar sakte hai.

![Visual Solution-1](./Eq-2.svg)

So isse humko ye pata chala ki hum kitne bhi neuron ki chain bana le at the end wo ek straight line hi generate karegi. Or agar hum multiple neuron ko parallel me use kare to bhi wo ek straight line hi generate hogi.

![Visual Solution-2](./Eq-3.svg)

So hum multiple neuron ko kaise bhi connect kare at the end wo ek straight line hi generate karegi.

Yeh same problem 1960-70 me aayi thi. & is tarah ki problem ko solve karne ke liye hi humne **Activation Function** ko invent kiya.

---

## What is Activation Function?

**Activation Function** ek mathematical function hai jo ki ek neuron ke output ko determine karta hai. Matlab ye simple kahta hai ki agar output <=0 hai to usko 0 bana do, otherwise output ko wahi rehne do.

```logic
if(output<=0){
    return 0;
}else {
    output;
}
```

Ye function hume kewal ek bend hi provide karta hai. & ya hamesh output per lagta hai. Matlab pahale input per neuron lagega, phir uska output per activation function lagega.

![ReLU Activation Function](./ReLU-Activation-Function.svg)

Isse function ko hum **ReLU Activation Function** kahte hai.

---

## What is ReLU?

Iska full form Rectified Linear Unit, Iska mathematical formula hota hai:

$$f(x) = \max(0, x)$$

Iska matlab:

- Agar input ($x$) Positive hai (0 se bada), toh output wahi rahega ($x$).
- Agar input ($x$) Negative hai (0 se chota), toh output seedha 0 ho jayega.

ReLU ke saath ek issue aata hai jise Dying ReLU kehte hain.

- Agar koi neuron hamesha negative input dene lage, toh uska output hamesha 0 rahega aur uska gradient bhi 0 ho jayega.
- Iska matlab wo neuron "mar" gaya hai aur training ke dauran kabhi update nahi hoga.

Is problem ko solve karne ke liye iske variants use hote hain, jaise:

- **Leaky ReLU:** Negative values ko bilkul 0 karne ki jagah ek bahut choti value (jaise $0.01x$) di jaati hai.
- **ELU (Exponential Linear Unit):** Jo curve ko thoda smooth banata hai.

> ReLU neural networks ko non-linearity deta hai (taaki wo complex patterns samajh sake) aur ye sabse fast aur reliable choice mana jaata hai.

#### Ye industry me itna popular kyo hai?

1. **Sparcity:** Kyunki negative values 0 ho jaati hain, iska matlab hai ki ek time par network ke saare neurons "fire" nahi hote. Isse model "lightweight" aur efficient banta hai.

In short iski wajah se sirf wahi neuron activate hoga jiska output me kuch contribution ho, & baaki sabhi neuron deactivate rahenge. Isse model "lightweight" aur efficient banta hai.

2. **Computational Efficiency:** Sigmoid ya Tanh jaise functions mein complex math (exponentials) lagta hai. ReLU mein bas ek if condition chahiye (if x > 0 return x else 0). Ye training ko bahut fast bana deta hai.

> In short agar hum bahut saare ReLU ko ek saath use kare to hum ek circle bhi bana sakte hai. Kyoki ek ReLU sirf ek bend hi create karta hai.

---

Achha ek or most important doubt ki hum hamesha ek straight line equation hi kyo find karte hai. Matlab ye kisne rule banaya ki humari equation hamesha (W1*X+B) hi hogi. Kyoki agar hum apni equation ko `W1*X+W2*X^2+W3*X^3+W4*X^4+B`ya equation kyo use nahi ki, kyoki agar hume isme`Y=X^2`iska formula chahiye to hum`W2*X^2` ko hi consider karenge or baaki sabhi ko 0 kar denge.

Humne straight line equation isliye li, kyoki agar hum `W1*X+W2*X^2+W3*X^3+W4*X^4+....+B` is equation ko use karte to hume pata kaise chalta ki hume `X^?` X ki kis power tak include karna chahiye, kyoki ye to infinite tak bhi ho sakti hai, or iski wajah se humare resources kitne use honge, kyoki hume kitni saari computation karni padti. Or iska koi fix rule nahi hai ki hume kis power tak hi use karna hai.

Lekin agar hum ek linear equation hi rakhe `Y=m*X+C`, to hamare pass jitne bhi input hone us hisaab se hum is equation ko bana sakte hai, jaise suppose agar hamare pass teen input hai to `Y=W1*X1+W2*X2+W3*X3+B` is tarah se hum is equation ko bana sakte hai, or aise hi hum multiple inputs ke liye bhi easily equation create kar sakte hai `Y=W1*X1+W2*X2+W3*X3+W4*X4+W5*X5+....+B`.

---

## How ReLU helps to solve Problem 2?

| Time (X) | Payment (Y) |
| -------- | ----------- |
| 1        | 0           |
| 2        | 0           |
| 3        | 0           |
| 4        | 1           |
| 5        | 2           |
| 6        | 3           |
| 7        | 4           |
| 8        | 5           |
| 9        | ?           |

So ReLU ke karan hamari equation kuch is tarah se banegi.

```equation
ReLU(X-3)

OR

ReLU(max(0, X-3))
```

> So ek neuron se hum ek bend create kar sakte hai, to agar hume bahut saare bend chahiye to hume bahut saare neuron use karne padenge. Iska matlab jitne zyada neuron utna zyada bend, jitna zyada bend utna zyada complex pattern hum learn kar sakte hai.

---

## Problem-3

Real life me kai baar aisa hota hai ki hum ek particular point tak kitna bhi input de output hamesha 0 hhi rahta hai, or us point ke baad hamara output change hone lagta hai. & phir ek point aisa aata hai jiske baad bhi hum kitna hi input kyo na de humara output change nahi hota. Means wo apne sturation point ko hit kar chuka hota hai, jiske baad hame hamesha same output hi milta hai.

| Time (X) | Payment (Y) |
| -------- | ----------- |
| 1        | 0           |
| 2        | 0           |
| 3        | 0           |
| 4        | 1           |
| 5        | 2           |
| 6        | 3           |
| 7        | 4           |
| 8        | 5           |
| 9        | 5           |
| 10       | 5           |
| 11       | 5           |
| 12       | 5           |

![Visual Presentaion of Problem 3](./Eq-4.svg)

So ab isme hume pata chal gaya ki yaha 2 bend hai, ek bend 3 se 4 ke beech me hai, or dusra bend 8 se 9 ke beech me hai. To hume yaha 2 neuron use karne padenge. & un dono neuron per ReLU function use karna padega. So at the end hume kuch is tarah ka equation milega.

```equation
ReLU = ReLU(X-3) - ReLU(X-8)

OR

ReLU = max(0, X-3) - max(0, X-8)
```

Ab hum isko cross verify karte hai multiple X input ke liye.

| Time (X) | ReLU(X-3) | ReLU(X-8) | Total (Y = ReLU(X-3) - ReLU(X-8)) |
| -------- | --------- | --------- | --------------------------------- |
| 1        | 0         | 0         | 0                                 |
| 2        | 0         | 0         | 0                                 |
| 3        | 0         | 0         | 0                                 |
| 4        | 1         | 0         | 1                                 |
| 5        | 2         | 0         | 2                                 |
| 6        | 3         | 0         | 3                                 |
| 7        | 4         | 0         | 4                                 |
| 8        | 5         | 0         | 5                                 |
| 9        | 6         | 1         | 5                                 |
| 10       | 7         | 2         | 5                                 |
| 11       | 8         | 3         | 5                                 |
| 12       | 9         | 4         | 5                                 |

---

## Problem-4

| Time (X) | Result (Y) |
| -------- | ---------- |
| 1        | 0          |
| 2        | 0          |
| 3        | 0          |
| 4        | 1          |
| 5        | 2          |
| 6        | 3          |
| 7        | 4          |
| 8        | 5          |
| 9        | 5          |
| 10       | 5          |
| 11       | 5          |
| 12       | 6          |
| 13       | 7          |
| 14       | 8          |
| 15       | 9          |
| 16       | 10         |

So ab agar hum dhyaan se dekhe to is problem me 3 bend hai. Pehla bend 3 se 4 ke beech me, dusra bend 8 se 9 ke beech me, & teesra bend 11 se 12 ke beech me hai. To hume yaha 3 neuron use karne padenge. & un teeno neuron per ReLU function use karna padega. So at the end hume kuch is tarah ka equation milega.

```equation
ReLU = ReLU(X-3) + ReLU(X-8) + ReLU(X-11)

OR

ReLU = max(0, X-3) - max(0, X-8) + max(0, X-11)
```

Ab hum isko cross verify karte hai.

| Time (X) | ReLU(X-3) | ReLU(X-8) | ReLU(X-11) | Total (Y = ReLU(X-3) - ReLU(X-8) + ReLU(X-11)) |
| -------- | --------- | --------- | ---------- | ---------------------------------------------- |
| 1        | 0         | 0         | 0          | 0                                              |
| 2        | 0         | 0         | 0          | 0                                              |
| 3        | 0         | 0         | 0          | 0                                              |
| 4        | 1         | 0         | 0          | 1                                              |
| 5        | 2         | 0         | 0          | 2                                              |
| 6        | 3         | 0         | 0          | 3                                              |
| 7        | 4         | 0         | 0          | 4                                              |
| 8        | 5         | 0         | 0          | 5                                              |
| 9        | 6         | 1         | 0          | 5                                              |
| 10       | 7         | 2         | 0          | 5                                              |
| 11       | 8         | 3         | 0          | 5                                              |
| 12       | 9         | 4         | 1          | 6                                              |
| 13       | 10        | 5         | 2          | 7                                              |
| 14       | 11        | 6         | 3          | 8                                              |
| 15       | 12        | 7         | 4          | 9                                              |
| 16       | 13        | 8         | 5          | 10                                             |

---
