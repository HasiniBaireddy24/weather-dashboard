// script.js — Fixed: top-level exports + browser guarded caller
// IMPORTANT: Replace the API key string below with your OpenWeatherMap API key.
const API_KEY = '0906c8d9e8b3d8ee16b58b9722e2dee4'; // <-- REPLACE THIS
const DEFAULT_CITY = 'New York';

// --------- Exported pure/testable functions ----------
export function kelvinToCelsius(k){ return +(k - 273.15).toFixed(2); }
export function kelvinToFahrenheit(k){ return +((k - 273.15) * 9/5 + 32).toFixed(2); }
export function cToF(c){ return +((c * 9/5) + 32).toFixed(2); }
export function fToC(f){ return +((f - 32) * 5/9).toFixed(2); }

export async function fetchCurrentWeatherByCity(city){
  if(!API_KEY || API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
    throw new Error('Missing OpenWeatherMap API key. Set API_KEY in script.js');
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}`;
  const res = await fetch(url);
  if(!res.ok) {
    const errText = await res.text();
    throw new Error(`API error: ${res.status} ${errText}`);
  }
  return res.json();
}

export async function fetch5DayForecastByCity(city){
  if(!API_KEY || API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
    throw new Error('Missing OpenWeatherMap API key. Set API_KEY in script.js');
  }
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}`;
  const res = await fetch(url);
  if(!res.ok) {
    const errText = await res.text();
    throw new Error(`API error: ${res.status} ${errText}`);
  }
  return res.json();
}

export function aggregateForecastToDaily(list){
  const days = {};
  list.forEach(item => {
    const date = item.dt_txt ? item.dt_txt.split(' ')[0] : new Date(item.dt * 1000).toISOString().split('T')[0];
    if(!days[date]) days[date] = { temps: [], descriptions: [] };
    days[date].temps.push(item.main.temp);
    days[date].descriptions.push(item.weather[0].description);
  });
  return Object.keys(days).map(date => {
    const d = days[date];
    const avgTempK = d.temps.reduce((a,b)=>a+b,0)/d.temps.length;
    const freq = {};
    d.descriptions.forEach(s => freq[s] = (freq[s] || 0) + 1);
    const description = Object.keys(freq).reduce((a,b)=>freq[a]>=freq[b]?a:b);
    return { date, avgTempK: +avgTempK.toFixed(2), description };
  });
}

// --------- Exported init (top-level) ----------
export async function init(defaultCity = DEFAULT_CITY){
  try {
    const current = await fetchCurrentWeatherByCity(defaultCity);
    // if running in browser, try to render using DOM helpers defined below
    if (typeof document !== 'undefined') {
      // call the browser renderer if available
      try {
        // renderCurrent is defined in the guarded block below
        if (typeof renderCurrent === 'function') {
          renderCurrent(current, currentUnit || 'C');
        }
      } catch (e) {
        // swallow render errors here; console for debug
        // (renderCurrent will be defined only in browser context)
        // eslint-disable-next-line no-console
        console.error('Render on init failed:', e);
      }
    }
    return current;
  } catch(err) {
    // eslint-disable-next-line no-console
    console.error('Initialization error', err);
    throw err;
  }
}

// --------- Browser-only UI code (guarded) ----------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // DOM elements
  const elements = {
    cityForm: document.getElementById('city-form'),
    cityInput: document.getElementById('city-input'),
    cityName: document.getElementById('city-name'),
    currentDesc: document.getElementById('current-desc'),
    tempEl: document.getElementById('temp'),
    toggleUnit: document.getElementById('toggle-unit'),
    forecastCards: document.getElementById('forecast-cards'),
  };

  // expose renderCurrent and currentUnit for init() above
  // (these names are intentionally in outer scope)
  window.currentUnit = 'C';

  // define renderCurrent as a global function (so top-level init can call it)
  window.renderCurrent = function renderCurrent(data, unit='C'){
    elements.cityName.textContent = `${data.name}, ${data.sys?.country || ''}`;
    elements.currentDesc.textContent = data.weather?.[0]?.description || '—';
    const tempK = data.main.temp;
    const c = kelvinToCelsius(tempK);
    const f = kelvinToFahrenheit(tempK);
    elements.tempEl.textContent = unit === 'C' ? `${c} °C` : `${f} °F`;
    elements.toggleUnit.textContent = unit === 'C' ? '°C' : '°F';
    elements.toggleUnit.setAttribute('aria-pressed', unit === 'F' ? 'true' : 'false');
  };

  function renderForecast(agg){
    elements.forecastCards.innerHTML = '';
    agg.slice(0,5).forEach(day => {
      const card = document.createElement('div');
      card.className = 'forecast-card';
      const date = new Date(day.date).toLocaleDateString();
      const c = kelvinToCelsius(day.avgTempK);
      card.innerHTML = `<strong>${date}</strong><p>${c} °C</p><p>${day.description}</p>`;
      elements.forecastCards.appendChild(card);
    });
  }

  // keep currentUnit in module scope (mirror to window for init access)
  let currentUnit = window.currentUnit || 'C';

  elements.toggleUnit.addEventListener('click', () => {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    window.currentUnit = currentUnit;
    const cityText = elements.cityName.textContent;
    if(cityText && cityText !== 'City'){
      const city = elements.cityName.textContent.split(',')[0];
      fetchCurrentWeatherByCity(city).then(data => renderCurrent(data, currentUnit)).catch(err => console.error(err));
    }
  });

  elements.cityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = elements.cityInput.value.trim();
    if(!city) return;
    try {
      const [current, forecast] = await Promise.all([
        fetchCurrentWeatherByCity(city),
        fetch5DayForecastByCity(city)
      ]);
      renderCurrent(current, currentUnit);
      const agg = aggregateForecastToDaily(forecast.list);
      renderForecast(agg);
    } catch(err) {
      console.error(err);
      alert('Error fetching weather. See console for details.');
    }
  });

  // Call init to preload default city once DOM is ready
  // (init is exported at top-level so tests can import it without executing this)
  init(DEFAULT_CITY).catch(()=>{});
}
