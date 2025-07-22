const API_KEY = 'ae9ab3d43e480394a3331fe43ce0306f';
const weatherInfo = document.getElementById('weather-info');
const cityName = document.getElementById('city-name');
const description = document.getElementById('description');
const temp = document.getElementById('temp');
const icon = document.getElementById('icon');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const feelsLike = document.getElementById('feels-like');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const chartCanvas = document.getElementById('chart');
const hourlyForecastContainer = document.getElementById('hourly-forecast-container');
let chartInstance;
let isMetric = true;

document.getElementById('search-btn').addEventListener('click', async () => {
  const city = document.getElementById('city-input').value.trim();
  if (!city) return alert('Please enter a city name.');
  fetchWeather(city);
});

document.getElementById('geo-btn').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByCoords(latitude, longitude);
    }, () => {
      alert("Geolocation access denied. Please enter a city manually.");
    });
  } else {
    alert("Geolocation is not supported by this browser.");
  }
});

document.getElementById('unit-toggle').addEventListener('click', () => {
  isMetric = !isMetric;
  const city = cityName.textContent;
  if (city) {
    fetchWeather(city);
    fetchHourlyForecast(city);
  }
  document.getElementById('unit-toggle').textContent = isMetric ? 'Switch to °F' : 'Switch to °C';
});

async function fetchWeather(city) {
  const unit = isMetric ? 'metric' : 'imperial';
  try {
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}`);
    const weatherData = await weatherResponse.json();
    if (weatherData.cod !== 200) throw new Error(weatherData.message);
    displayWeather(weatherData);
    const { lat, lon } = weatherData.coord;
    fetchForecast(lat, lon);
    fetchHourlyForecast(city);
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  const unit = isMetric ? 'metric' : 'imperial';
  try {
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`);
    const weatherData = await weatherResponse.json();
    displayWeather(weatherData);
    fetchForecast(lat, lon);
    fetchHourlyForecastByCoords(lat, lon);
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

function displayWeather(data) {
  const unitSymbol = isMetric ? '°C' : '°F';
  weatherInfo.hidden = false;
  cityName.textContent = data.name;
  description.textContent = data.weather[0].description;
  temp.textContent = `${Math.round(data.main.temp)}${unitSymbol}`;
  humidity.textContent = data.main.humidity;
  windSpeed.textContent = (data.wind.speed * (isMetric ? 3.6 : 2.237)).toFixed(2);
  feelsLike.textContent = Math.round(data.main.feels_like);
  pressure.textContent = data.main.pressure;
  sunrise.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
  sunset.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString();
  
  const iconCode = data.weather[0].icon;
  icon.innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${data.weather[0].description}">`;

  setBackground(data.weather[0].description.toLowerCase());
}

async function fetchForecast(lat, lon) {
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${API_KEY}&units=metric`);
      
      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`Failed to fetch forecast: ${response.statusText}`);
      }
  
      const data = await response.json();
  
      // Log the API response to check the structure
      console.log('Forecast API Response:', data);
  
      // Ensure 'daily' data exists and is in the correct format
      if (data && data.daily && Array.isArray(data.daily)) {
        const labels = data.daily.slice(0, 7).map(item => new Date(item.dt * 1000).toLocaleDateString());
        const temps = data.daily.slice(0, 7).map(item => Math.round(item.temp.day));
  
        const ctx = chartCanvas.getContext('2d');
        chartCanvas.hidden = false;
  
        if (chartInstance) {
          chartInstance.destroy();
        }
  
        chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Temperature (°C)',
              data: temps,
              borderColor: '#007acc',
              backgroundColor: 'rgba(0, 122, 204, 0.2)',
              fill: true
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true }
            }
          }
        });
      } else {
        console.error('Error: "daily" data is missing or not in the correct format:', data);
        alert('Could not fetch daily forecast data. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
      alert(`Error fetching forecast: ${error.message}`);
    }
  }
  

async function fetchHourlyForecast(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    
    hourlyForecastContainer.innerHTML = '';
    data.list.slice(0, 8).forEach(item => {
      const time = new Date(item.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const temp = Math.round(item.main.temp);
      const iconCode = item.weather[0].icon;
      const weatherDesc = item.weather[0].description;

      const hourlyCard = `
        <div class="hourly-card">
          <p>${time}</p>
          <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${weatherDesc}">
          <p>${temp}°C</p>
          <p>${weatherDesc}</p>
        </div>`;
      hourlyForecastContainer.innerHTML += hourlyCard;
    });
    document.getElementById('hourly-forecast').hidden = false;
  } catch (error) {
    alert(`Error fetching hourly forecast: ${error.message}`);
  }
}

function setBackground(condition) {
  document.body.className = '';
  if (condition.includes('rain')) {
    document.body.classList.add('rainy');
  } else if (condition.includes('clear')) {
    document.body.classList.add('sunny');
  } else if (condition.includes('cloud')) {
    document.body.classList.add('cloudy');
  }
}
