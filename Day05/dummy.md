Command ko run karne ke liye hume Node.js ke under ek child process package hota hai jo ki ye cmd ko execute kar sakta hai, jiski wajah se hi React me abhi vulnerability aayi thi, & is child process wale ko ek or dependency ki need hoti hai util. To hum in dono ko install karenge.

```bash
npm i child_process
npm i util
```

child-process wala callback function expect karta hai jisse ye callback hell ki tarah work karta hai, & isko async-await ki tarah use karne ke liye hume util dependency ki need hoti hai.

Ab command bhi alag alag OS ke liye different hoti hai to hume LLM ko apne current OS ka context means version batana padega, iske liye hum os npm package ko install karenge.

```bash
npm i os
```
