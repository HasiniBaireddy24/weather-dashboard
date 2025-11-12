import { kelvinToCelsius, kelvinToFahrenheit, aggregateForecastToDaily } from '../script.js';

describe('Temperature conversions', () => {
  test('kelvinToCelsius: 273.15K => 0°C', () => {
    expect(kelvinToCelsius(273.15)).toBeCloseTo(0, 2);
  });
  test('kelvinToFahrenheit: 255.372K => 0°F approx', () => {
    expect(kelvinToFahrenheit(255.372)).toBeCloseTo(0, 1);
  });
});

describe('Forecast aggregation', () => {
  test('aggregates multiple times in same day', () => {
    const list = [
      { dt_txt: '2025-11-12 00:00:00', main: { temp: 280 }, weather: [{description:'clear'}] },
      { dt_txt: '2025-11-12 03:00:00', main: { temp: 282 }, weather: [{description:'clear'}] },
      { dt_txt: '2025-11-13 00:00:00', main: { temp: 290 }, weather: [{description:'cloudy'}] }
    ];
    const agg = aggregateForecastToDaily(list);
    expect(agg.find(d => d.date === '2025-11-12').avgTempK).toBeCloseTo(281, 1);
    expect(agg.length).toBe(2);
  });
});
