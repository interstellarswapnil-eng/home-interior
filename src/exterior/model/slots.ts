/** Named slots: places on the building where elements can go (shown in plain words in the app). */
import { FLATS } from "./building";
import type { Slot } from "./types";

const FLOORS = Array.from({ length: FLATS }, (_, i) => i + 1);
const ALL = [0, ...FLOORS];

export const SLOTS: Slot[] = [
  { id: "wall:frontName", label: "Front wall facing the road (master bedroom side)", side: "S", kind: "wall", floors: FLOORS },
  { id: "wall:featureRecess", label: "Feature recess beside the balconies", side: "S", kind: "wall", floors: FLOORS },
  { id: "wall:balconyBack-S", label: "Wall behind the front balconies", side: "S", kind: "wall", floors: FLOORS },
  { id: "wall:balconyBack-N", label: "Wall behind the rear balconies", side: "N", kind: "wall", floors: FLOORS },
  { id: "wall:west", label: "West side wall (bedrooms)", side: "W", kind: "wall", floors: FLOORS },
  { id: "wall:east", label: "East side wall (living + kitchen)", side: "E", kind: "wall", floors: FLOORS },
  { id: "wall:stairTower", label: "Staircase tower", side: "W", kind: "wall", floors: [...ALL, 4] },
  { id: "wall:groundCore", label: "Ground-floor lift and stair lobby walls", side: "S", kind: "wall", floors: [0] },
  { id: "wall:columns", label: "Parking columns", side: "under", kind: "wall", floors: [0] },
  { id: "wall:plinth", label: "Plinth (raised parking floor edge)", side: "S", kind: "wall", floors: [0] },
  { id: "entrance:lobby", label: "Building entrance (ground-floor lobby)", side: "S", kind: "entrance", floors: [0] },
  { id: "balcony:S", label: "Front balconies (road side)", side: "S", kind: "balcony", floors: FLOORS },
  { id: "balcony:N", label: "Rear balconies", side: "N", kind: "balcony", floors: FLOORS },
  { id: "balconySide:S", label: "Side of the front balconies", side: "S", kind: "balcony", floors: FLOORS },
  { id: "balconySide:N", label: "Side of the rear balconies", side: "N", kind: "balcony", floors: FLOORS },
  { id: "edge:terrace", label: "Terrace edge (parapet)", side: "roof", kind: "edge", floors: [4] },
  { id: "edge:balconyRoof-S", label: "Roof edge over the front balconies", side: "S", kind: "edge", floors: [4] },
  { id: "edge:balconyRoof-N", label: "Roof edge over the rear balconies", side: "N", kind: "edge", floors: [4] },
  { id: "edge:stiltBand", label: "Band above the parking", side: "S", kind: "edge", floors: [0] },
  { id: "edge:parkingCeiling", label: "Parking ceiling", side: "under", kind: "edge", floors: [0] },
  { id: "site:compoundFront", label: "Front compound wall", side: "S", kind: "site", floors: [-1] },
  { id: "site:compoundSides", label: "Side and rear compound walls", side: "S", kind: "site", floors: [-1] },
  { id: "site:gate", label: "Gates and gate pillars", side: "S", kind: "site", floors: [-1] },
  { id: "site:driveway", label: "Driveway and parking floor", side: "S", kind: "site", floors: [-1] },
  { id: "site:garden", label: "Garden strips", side: "S", kind: "site", floors: [-1] },
  { id: "site:road", label: "Road and footpath", side: "S", kind: "site", floors: [-1] },
  { id: "site:surroundings", label: "Surroundings", side: "S", kind: "site", floors: [-1] },
  { id: "win:win-master-w", label: "Master bedroom window", side: "W", kind: "window", floors: FLOORS, openingPlanId: "win-master-w" },
  { id: "win:win-mbath-w", label: "Master bath ventilator", side: "W", kind: "window", floors: FLOORS, openingPlanId: "win-mbath-w" },
  { id: "win:win-kids-w", label: "Kids bedroom window", side: "W", kind: "window", floors: FLOORS, openingPlanId: "win-kids-w" },
  { id: "win:win-living-e", label: "Living room window", side: "E", kind: "window", floors: FLOORS, openingPlanId: "win-living-e" },
  { id: "win:win-kitchen-e", label: "Kitchen window (east)", side: "E", kind: "window", floors: FLOORS, openingPlanId: "win-kitchen-e" },
  { id: "win:win-kitchen-s", label: "Kitchen window (onto balcony)", side: "S", kind: "window", floors: FLOORS, openingPlanId: "win-kitchen-s" },
  { id: "win:win-gbath-s", label: "Guest bath ventilator", side: "S", kind: "window", floors: FLOORS, openingPlanId: "win-gbath-s" },
  { id: "win:kitchen-balcony", label: "Kitchen balcony door", side: "S", kind: "window", floors: FLOORS, openingPlanId: "kitchen-balcony" },
  { id: "win:living-balcony", label: "Living balcony door", side: "N", kind: "window", floors: FLOORS, openingPlanId: "living-balcony" },
  { id: "win:stair-a", label: "Staircase window (lower)", side: "W", kind: "window", floors: ALL, openingPlanId: "stair-a" },
  { id: "win:stair-b", label: "Staircase window (upper)", side: "W", kind: "window", floors: ALL, openingPlanId: "stair-b" },
  { id: "win:lobby-door", label: "Building entrance door", side: "S", kind: "entrance", floors: [0], openingPlanId: "lobby-door" },
];

export const slotById = (id?: string) => SLOTS.find((s) => s.id === id);

export const floorName = (f: number) =>
  f === -1 ? "Site" : f === 0 ? "Ground (parking)" : f === 4 ? "Terrace" : `${f === 1 ? "1st" : f === 2 ? "2nd" : "3rd"} floor`;
