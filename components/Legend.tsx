import { finishes, palette, roomFloorMaterial } from "../plan/materials";
import { roomById, type RoomId } from "../plan/plan";

export function Legend() {
  return (
    <div className="panel">
      <h3>Material &amp; finish schedule — lighter modern</h3>
      <ul className="legend">
        {Object.entries(finishes).map(([key, f]) => (
          <li key={key}>
            <span className="swatch" style={{ background: f.code }} />
            <div>
              <div>{f.name}</div>
              <div className="muted small">{f.areas.map((a) => roomById[a as RoomId]?.label ?? a).join(", ")}</div>
            </div>
          </li>
        ))}
      </ul>
      <h3>Floor by room</h3>
      <table className="floors">
        <tbody>
          {Object.entries(roomFloorMaterial).map(([room, mat]) => (
            <tr key={room}>
              <td>{roomById[room as RoomId]?.label ?? room}</td>
              <td>
                <span className="swatch sm" style={{ background: palette[mat] }} /> {mat}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Notes</h3>
      <ul className="muted small notes">
        <li>Kitchen counter: artificial granite ~₹110/sq ft, pale white with faint grey vein, straight edge, matching splash strip.</li>
        <li>Handles: thin black (primary) or brushed nickel; no ornate brass.</li>
        <li>Wet areas (both baths, kitchen, balconies): anti-skid light tile; baths in 300 mm module, dry areas 600×600.</li>
        <li>Lift-adjacent walls: kids wardrobe on the lift wall and solid-core bedroom doors act as acoustic buffer.</li>
        <li>South kitchen balcony: exterior roller shade + full shutter door against afternoon heat.</li>
        <li>Curtains: sheers + light blackout in greige; no dark heavy drapes.</li>
      </ul>
    </div>
  );
}
