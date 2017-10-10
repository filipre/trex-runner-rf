# README

just paste `trexBot.js` into the Chrome Console of [chrome://dino](chrome://dino) and the bot will start to learn.

## Random Strategy (baseline):

*see randomBot.js*

`100` Iterations: `42.978`

## Bot:

Config:
```js
const gamma = 0.9;
const alpha = 0.1;
const epsilon = 0.01;
const positive_award = 1;
const negative_award = -100;
const fps = 30;
```
