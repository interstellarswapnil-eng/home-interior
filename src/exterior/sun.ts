/**
 * Sun position (NOAA solar calculator, simplified; accurate to ~0.1°) for a location and local clock time.
 * Plan convention: +y = north (true north assumed), +x = east. Indian Standard Time = UTC+5:30.
 */
const RAD = Math.PI / 180;

export type SunPos = {
  /** degrees above the horizon */
  altitude: number;
  /** degrees clockwise from north */
  azimuth: number;
};

/** Day of year (1..366) for a yyyy-mm-dd string. */
export function dayOfYear(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
}

function declinationAndEoT(doy: number, hour: number) {
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (hour - 12) / 24);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  return { decl, eqTime };
}

/** Sun altitude / azimuth at local clock time `hour` (e.g. 15.5 = 3:30 pm) on day `doy`. */
export function sunPosition(lat: number, lon: number, doy: number, hour: number, tz = 5.5): SunPos {
  const { decl, eqTime } = declinationAndEoT(doy, hour);
  const tst = hour * 60 + eqTime + 4 * lon - 60 * tz; // true solar time, minutes
  const ha = (tst / 4 - 180) * RAD;
  const phi = lat * RAD;
  const cosZen = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(Math.max(-1, Math.min(1, cosZen)));
  const altitude = 90 - zen / RAD;
  // azimuth clockwise from north
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180;
  return { altitude, azimuth: (az + 360) % 360 };
}

/** Sunrise / sunset clock hours (sun centre at −0.833°). */
export function sunTimes(lat: number, lon: number, doy: number, tz = 5.5): { sunrise: number; sunset: number } {
  const { decl, eqTime } = declinationAndEoT(doy, 12);
  const phi = lat * RAD;
  const cosH = (Math.cos(90.833 * RAD) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD; // degrees
  const noon = (720 - 4 * lon - eqTime + 60 * tz) / 60;
  return { sunrise: noon - (4 * H) / 60, sunset: noon + (4 * H) / 60 };
}

/** Unit direction TOWARDS the sun in world space (x east, y up, z = −north). */
export function sunDirection(p: SunPos): [number, number, number] {
  const alt = p.altitude * RAD;
  const az = p.azimuth * RAD;
  return [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)];
}

export const formatHour = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const am = hh < 12;
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm === 60 ? 0 : mm).padStart(2, "0")} ${am ? "am" : "pm"}`;
};
