import axios from "axios";

async function cryptoCurrency({ coin, curr }) {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${curr}&ids=${coin}`
  );

  return response.data;
}

export default cryptoCurrency;
