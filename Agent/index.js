import readlineSync from "readline-sync";

function sum(num1, num2) {
  return num1 + num2;
}

function prime(num) {
  for (let i = 2; i < num; i++) {
    if (num % i === 0) {
      return false;
    }
  }
  return true;
}

async function getCryptoPrice(coin) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`;
  const response = await fetch(url);
  const data = await response.json();
  return data[0].current_price;
}

const userQuestion = readlineSync.question("What is your question? ");
console.log(userQuestion);
