import { describe, expect, it } from "vitest";
import { dayOfYear, sunDirection, sunPosition, sunTimes } from "../../src/exterior/sun";

const LAT = 19.09;
const LON = 74.74;

describe("sun position for Ahilyanagar", () => {
  it("day of year", () => {
    expect(dayOfYear("2026-01-01")).toBe(1);
    expect(dayOfYear("2026-06-21")).toBe(172);
  });

  it("solar noon is around 12:35 IST (longitude 74.7° E vs the 82.5° E time meridian)", () => {
    const { sunrise, sunset } = sunTimes(LAT, LON, dayOfYear("2026-03-20"));
    const noon = (sunrise + sunset) / 2;
    expect(noon).toBeGreaterThan(12.4);
    expect(noon).toBeLessThan(12.75);
  });

  it("equinox noon altitude ≈ 90 − latitude, sun due south", () => {
    const { sunrise, sunset } = sunTimes(LAT, LON, dayOfYear("2026-03-20"));
    const p = sunPosition(LAT, LON, dayOfYear("2026-03-20"), (sunrise + sunset) / 2);
    expect(p.altitude).toBeGreaterThan(69.5);
    expect(p.altitude).toBeLessThan(72);
    expect(Math.abs(p.azimuth - 180)).toBeLessThan(3);
  });

  it("winter noon sun is low in the south; June noon sun is slightly NORTH of overhead", () => {
    const dec = sunPosition(LAT, LON, dayOfYear("2026-12-21"), 12.6);
    expect(dec.altitude).toBeGreaterThan(46);
    expect(dec.altitude).toBeLessThan(49);
    expect(dec.azimuth).toBeGreaterThan(170);
    expect(dec.azimuth).toBeLessThan(190);
    const jun = sunPosition(LAT, LON, dayOfYear("2026-06-21"), 12.6);
    expect(jun.altitude).toBeGreaterThan(84);
    expect(jun.azimuth < 30 || jun.azimuth > 330).toBe(true); // north
  });

  it("day length: ~13 h in June, ~11 h in December", () => {
    const j = sunTimes(LAT, LON, dayOfYear("2026-06-21"));
    const d = sunTimes(LAT, LON, dayOfYear("2026-12-21"));
    expect(j.sunset - j.sunrise).toBeGreaterThan(12.8);
    expect(j.sunset - j.sunrise).toBeLessThan(13.4);
    expect(d.sunset - d.sunrise).toBeGreaterThan(10.8);
    expect(d.sunset - d.sunrise).toBeLessThan(11.3);
  });

  it("afternoon sun is in the west; direction vector points west and up", () => {
    const p = sunPosition(LAT, LON, dayOfYear("2026-10-01"), 16);
    expect(p.azimuth).toBeGreaterThan(230);
    expect(p.azimuth).toBeLessThan(280);
    const [x, y] = sunDirection(p);
    expect(x).toBeLessThan(0);
    expect(y).toBeGreaterThan(0);
  });
});
