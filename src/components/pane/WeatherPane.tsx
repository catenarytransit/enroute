import React, { useState, useEffect } from "react";

export const metadata = {
  type: "weather" as const,
  title: "Weather",
  description: "Displays current weather conditions",
};

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
}

interface WeatherPaneProps {
  location?: { lat: number; lon: number };
  [key: string]: any;
}

const WeatherPane: React.FC<WeatherPaneProps> = ({ location }) => {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 72,
    condition: "Partly Cloudy",
    humidity: 65,
    windSpeed: 8,
    icon: "🌤️",
  });
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState("Current Location");

  // Fetch weather when location changes
  React.useEffect(() => {
    if (!location) return;
    
    setLoading(true);
    // TODO: Fetch real weather data from API using location.lat and location.lon
    // For now using mock data
    setTimeout(() => {
      setLocationName(`${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`);
      setLoading(false);
    }, 500);
  }, [location?.lat, location?.lon]);

  return (
    <div className="grow overflow-auto scrollbar-hide" style={{ padding: "var(--compact-padding)" }}>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-white/50 text-xs animate-pulse">Loading weather...</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--compact-gap)" }}>
          {/* Location */}
          <div className="text-center border-b border-slate-700" style={{ paddingBottom: "var(--compact-padding)" }}>
            <span className="text-sm font-bold text-slate-300">{locationName}</span>
          </div>

          {/* Main Temperature */}
          <div className="text-center" style={{ display: "flex", flexDirection: "column", gap: "var(--compact-gap)" }}>
            <div className="text-5xl font-bold">{weather.icon}</div>
            <div className="text-4xl font-bold text-white">{weather.temp}°</div>
            <div className="text-sm text-slate-300">{weather.condition}</div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 border-t border-slate-700" style={{ gap: "var(--compact-gap)", paddingTop: "var(--compact-padding)" }}>
            <div className="bg-slate-700/50 rounded" style={{ padding: "var(--compact-padding)" }}>
              <div className="text-xs text-slate-400" style={{ marginBottom: "var(--compact-gap)" }}>Humidity</div>
              <div className="text-lg font-bold text-white">{weather.humidity}%</div>
            </div>
            <div className="bg-slate-700/50 rounded" style={{ padding: "var(--compact-padding)" }}>
              <div className="text-xs text-slate-400" style={{ marginBottom: "var(--compact-gap)" }}>Wind</div>
              <div className="text-lg font-bold text-white">{weather.windSpeed} mph</div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center border-t border-slate-700" style={{ paddingTop: "var(--compact-padding)" }}>
            <span className="text-[10px] text-slate-500">Mock data - API integration coming soon</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherPane;
