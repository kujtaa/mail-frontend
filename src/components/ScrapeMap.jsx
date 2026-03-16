import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CITY_COORDS = {
  // Switzerland
  "Zurich": [47.3769, 8.5417],
  "Zug": [47.1724, 8.5181],
  "Lucerne": [47.0502, 8.3093],
  "Schwyz": [47.0207, 8.6530],
  "Aargau": [47.3900, 8.0455],
  "Basel": [47.5596, 7.5886],
  "St. Gallen": [47.4245, 9.3767],
  "Bern": [46.9480, 7.4474],
  "Geneva": [46.2044, 6.1432],
  "Lausanne": [46.5197, 6.6323],
  "Winterthur": [47.5001, 8.7240],
  "Biel": [47.1368, 7.2467],
  "Thun": [46.7580, 7.6280],
  "Aarau": [47.3925, 8.0444],
  "Schaffhausen": [47.6960, 8.6340],
  "Fribourg": [46.8065, 7.1620],
  "Chur": [46.8508, 9.5320],
  "Neuchatel": [46.9920, 6.9311],
  "Solothurn": [47.2088, 7.5371],
  "Sion": [46.2330, 7.3600],
  "Lugano": [46.0037, 8.9511],
  "Bellinzona": [46.1955, 9.0186],
  "Baden": [47.4734, 8.3064],
  "Olten": [47.3500, 7.9020],
  "Rapperswil": [47.2267, 8.8184],
  "Davos": [46.8003, 9.8355],
  "Interlaken": [46.6863, 7.8632],
  "Köniz": [46.9204, 7.4155],
  "Emmen": [47.0833, 8.3050],
  "Kriens": [47.0358, 8.2769],
  "Uster": [47.3474, 8.7217],
  "Dübendorf": [47.3970, 8.6180],
  "Dietikon": [47.4044, 8.3950],
  "Wädenswil": [47.2308, 8.6720],
  "Horgen": [47.2559, 8.5973],
  "Wil": [47.4615, 9.0453],
  "Frauenfeld": [47.5570, 8.8990],
  "Kreuzlingen": [47.6500, 9.1750],
  "Herisau": [47.3860, 9.2780],
  "Liestal": [47.4847, 7.7343],
  "Delémont": [47.3643, 7.3445],
  "Montreux": [46.4312, 6.9108],
  "Vevey": [46.4628, 6.8432],
  "Nyon": [46.3833, 6.2396],
  "Morges": [46.5109, 6.4989],
  "Yverdon-les-Bains": [46.7785, 6.6410],
  "Brig": [46.3176, 7.9873],
  "Martigny": [46.0977, 7.0708],
  "Sierre": [46.2920, 7.5350],
  "Locarno": [46.1708, 8.7953],
  "Mendrisio": [45.8717, 8.9816],
  "Chiasso": [45.8333, 9.0333],
  "Wetzikon": [47.3264, 8.7978],
  "Kloten": [47.4515, 8.5849],
  "Bülach": [47.5213, 8.5390],
  "Illnau-Effretikon": [47.4119, 8.7283],
  "Volketswil": [47.3923, 8.6863],
  "Adliswil": [47.3103, 8.5238],
  "Thalwil": [47.2920, 8.5620],
  "Langenthal": [47.2156, 7.7874],
  "Burgdorf": [47.0596, 7.6258],
  "Steffisburg": [46.7770, 7.6310],
  "Spiez": [46.6862, 7.6767],
  "Muri bei Bern": [46.9310, 7.4870],
  "Ostermundigen": [46.9560, 7.4870],
  "Lyss": [47.0748, 7.3062],
  "Grenchen": [47.1917, 7.3953],
  "Rheinfelden": [47.5540, 7.7930],
  "Wohlen": [47.3520, 8.2770],
  "Lenzburg": [47.3880, 8.1750],
  "Brugg": [47.4860, 8.2070],
  "Muttenz": [47.5224, 7.6460],
  "Reinach": [47.4927, 7.5926],
  "Allschwil": [47.5510, 7.5356],
  "Binningen": [47.5410, 7.5690],
  "Pratteln": [47.5210, 7.6930],
  "Arbon": [47.5167, 9.4333],
  "Amriswil": [47.5480, 9.3000],
  "Weinfelden": [47.5665, 9.1052],
  "Gossau": [47.4167, 9.2500],
  // Germany
  "Berlin": [52.5200, 13.4050],
  "München": [48.1351, 11.5820],
  "Hamburg": [53.5511, 9.9937],
  "Frankfurt": [50.1109, 8.6821],
  "Köln": [50.9375, 6.9603],
  "Düsseldorf": [51.2277, 6.7735],
  "Stuttgart": [48.7758, 9.1829],
  "Leipzig": [51.3397, 12.3731],
  "Dresden": [51.0504, 13.7373],
  "Hannover": [52.3759, 9.7320],
  "Nürnberg": [49.4521, 11.0767],
  "Bremen": [53.0793, 8.8017],
  "Dortmund": [51.5136, 7.4653],
  "Essen": [51.4556, 7.0116],
  "Duisburg": [51.4344, 6.7624],
};

const CH_CENTER = [46.8182, 8.2275];
const DE_CENTER = [51.1657, 10.4515];

function FitBounds({ bounds }) {
  const map = useMap();
  useMemo(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }
  }, [bounds, map]);
  return null;
}

export default function ScrapeMap({ source, cities, scrapedCombos, categoryCount, selectedCity, onSelectCity }) {
  const [hoveredCity, setHoveredCity] = useState(null);

  const cityStats = useMemo(() => {
    return cities.map((c) => {
      const coords = CITY_COORDS[c.name];
      if (!coords) return null;
      const scrapedCount = scrapedCombos.filter((s) => s.city === c.name).length;
      const pct = categoryCount > 0 ? (scrapedCount / categoryCount) * 100 : 0;
      return {
        ...c,
        lat: coords[0],
        lng: coords[1],
        scrapedCount,
        pct,
        status: pct === 0 ? 'none' : pct >= 100 ? 'full' : 'partial',
      };
    }).filter(Boolean);
  }, [cities, scrapedCombos, categoryCount]);

  const bounds = useMemo(() => {
    if (cityStats.length === 0) return null;
    return cityStats.map((c) => [c.lat, c.lng]);
  }, [cityStats]);

  const center = source === 'gelbeseiten.de' ? DE_CENTER : CH_CENTER;
  const zoom = source === 'gelbeseiten.de' ? 6 : 8;

  const getColor = (status) => {
    if (status === 'full') return '#16a34a';
    if (status === 'partial') return '#f59e0b';
    return '#ef4444';
  };

  const getRadius = (status, isHovered, isSelected) => {
    let base = status === 'full' ? 8 : status === 'partial' ? 10 : 12;
    if (isHovered || isSelected) base += 3;
    return base;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
          Fully scraped
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          Partially scraped
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Not scraped
        </div>
        {selectedCity && (
          <button
            onClick={() => onSelectCity('')}
            className="ml-auto text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            Clear selection: {selectedCity}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ height: 420 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {bounds && <FitBounds bounds={bounds} />}
          {cityStats.map((city) => {
            const isSelected = selectedCity === city.name;
            const isHovered = hoveredCity === city.name;
            return (
              <CircleMarker
                key={city.name}
                center={[city.lat, city.lng]}
                radius={getRadius(city.status, isHovered, isSelected)}
                pathOptions={{
                  fillColor: isSelected ? '#4f46e5' : getColor(city.status),
                  color: isSelected ? '#312e81' : getColor(city.status),
                  fillOpacity: isHovered || isSelected ? 0.9 : 0.7,
                  weight: isSelected ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => onSelectCity(isSelected ? '' : city.name),
                  mouseover: () => setHoveredCity(city.name),
                  mouseout: () => setHoveredCity(null),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="text-center">
                    <div className="font-bold text-sm">{city.name}</div>
                    <div className="text-xs text-gray-600">
                      {city.scrapedCount} / {categoryCount} categories scraped
                    </div>
                    <div className="text-xs font-medium" style={{ color: getColor(city.status) }}>
                      {city.pct.toFixed(0)}% coverage
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
