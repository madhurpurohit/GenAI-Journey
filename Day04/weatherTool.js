import axios from "axios";

async function weatherInfo({ city }) {
  const response = await axios.get(
    `http://api.weatherapi.com/v1/current.json?key=4f402af89dcc4737b06193548252309&q=${city}&aqi=no`
  );

  return response.data;
}

export default weatherInfo;
