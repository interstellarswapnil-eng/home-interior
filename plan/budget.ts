/**
 * Mid-case ~₹9 lakh interior fit-out for Ahilyanagar 2BHK.
 * Every major visible 3D object should map to a line item.
 * Band: ₹8–10 lakh (meta.inBand() must stay true).
 */

export type BudgetLine = {
  id: string;
  head: string;
  amountInr: number;
  notes?: string;
  visibleInModel: string[];
};

export const budgetLines: BudgetLine[] = [
  {
    id: "kitchen",
    head: "Modular kitchen (L-shape, pale artificial granite @ ~₹110/sqft, chimney, sink)",
    amountInr: 190_000,
    visibleInModel: ["kit-counter-s", "kit-counter-e", "kit-wall-e", "hob", "sink", "fridge", "chimney"],
  },
  {
    id: "wardrobes",
    head: "Wardrobes — master + kids (light laminate)",
    amountInr: 170_000,
    visibleInModel: ["master-wardrobe", "kids-wardrobe"],
  },
  {
    id: "flooring",
    head: "Flooring — vitrified dry areas + anti-skid wet/balconies",
    amountInr: 110_000,
    visibleInModel: [
      "living",
      "kitchen",
      "master",
      "kids",
      "foyer",
      "storage",
      "masterBath",
      "guestBath",
      "livingBalcony",
      "kitchenBalcony",
    ],
  },
  {
    id: "baths",
    head: "Master ensuite + guest bath (tiles, sanitary, mid CP fittings)",
    amountInr: 95_000,
    visibleInModel: [
      "masterBath",
      "guestBath",
      "mb-basin",
      "mb-wc",
      "mb-shower",
      "mb-shower-glass",
      "gb-shower",
      "gb-wc",
      "gb-basin",
    ],
  },
  {
    id: "storage",
    head: "Storage room shutters + internals",
    amountInr: 30_000,
    visibleInModel: ["storage", "storage-door", "storage-shelves", "storage-utility"],
  },
  {
    id: "ceiling-lights",
    head: "False ceiling + LED lighting (living, kitchen, bedrooms)",
    amountInr: 85_000,
    visibleInModel: ["living", "kitchen", "master", "kids"],
  },
  {
    id: "paint",
    head: "Paint / wall finish (warm off-white)",
    amountInr: 55_000,
    visibleInModel: [],
  },
  {
    id: "living-furniture",
    head: "Living furniture — sofa set, centre table, TV unit",
    amountInr: 100_000,
    visibleInModel: ["sofa-3", "chair-l", "chair-r", "coffee", "tv-unit"],
  },
  {
    id: "beds-desk",
    head: "Beds, study desk, side tables, mattresses",
    amountInr: 75_000,
    visibleInModel: [
      "master-bed",
      "master-st-l",
      "master-st-r",
      "kids-bed",
      "kids-desk",
      "kids-chair",
    ],
  },
  {
    id: "doors",
    head: "Internal doors / hardware (solid-core bedrooms for lift noise)",
    amountInr: 40_000,
    visibleInModel: ["master-door", "kids-door", "master-ensuite", "guest-bath-door"],
  },
  {
    id: "curtains",
    head: "Sheers + light blackout",
    amountInr: 25_000,
    visibleInModel: ["living-curtain-n", "living-curtain-e", "master-curtain", "kids-curtain"],
  },
  {
    id: "balcony-misc",
    head: "South balcony shade + contingency / misc",
    amountInr: 25_000,
    visibleInModel: ["south-shade", "kitchen-balcony", "wash-zone", "kitchenBalcony"],
  },
];

export function budgetTotalInr(lines = budgetLines): number {
  return lines.reduce((s, l) => s + l.amountInr, 0);
}

export const budgetMeta = {
  currency: "INR",
  min: 800_000,
  max: 1_000_000,
  target: 900_000,
  get total() {
    return budgetTotalInr();
  },
  inBand() {
    const t = budgetTotalInr();
    return t >= this.min && t <= this.max;
  },
};
