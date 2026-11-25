/**
 * Decides whether a typed answer matches the expected sentence, ignoring
 * things that aren't really mistakes: punctuation (including the curly quotes
 * phones insert), capitals, spacing, contractions ("I'm" = "I am") and
 * British vs American English ("colour" = "color", "mum" = "mom",
 * "flat" = "apartment").
 */

// Curly and other apostrophe-like characters → a plain apostrophe.
const APOSTROPHES = /[‘’‛ʼ`´′]/g;

// Expanded before punctuation is stripped. Both sides go through the same
// rules, so ambiguous ones ("'d" = would/had) still match like for like.
const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, "will not"],
  [/\bcan't\b/g, "can not"],
  [/\bshan't\b/g, "shall not"],
  [/\bain't\b/g, "is not"],
  [/n't\b/g, " not"],
  [/\bi'm\b/g, "i am"],
  [/\blet's\b/g, "let us"],
  [/\b(it|that|there|here|what|where|who|how|he|she|this)'s\b/g, "$1 is"],
  [/'re\b/g, " are"],
  [/'ve\b/g, " have"],
  [/'ll\b/g, " will"],
  [/'d\b/g, " would"],
  [/\bcannot\b/g, "can not"],
];

// British spelling or word → the single form both sides are compared in.
const SAME_WORD: Record<string, string> = {
  // -our / -or
  colour: "color", colours: "colors", coloured: "colored", colourful: "colorful",
  favourite: "favorite", favourites: "favorites",
  flavour: "flavor", flavours: "flavors",
  neighbour: "neighbor", neighbours: "neighbors", neighbourhood: "neighborhood",
  behaviour: "behavior", honour: "honor", humour: "humor", labour: "labor",
  harbour: "harbor", rumour: "rumor", odour: "odor", vapour: "vapor",
  // -re / -er
  centre: "center", centres: "centers", theatre: "theater", theatres: "theaters",
  metre: "meter", metres: "meters", litre: "liter", litres: "liters",
  kilometre: "kilometer", kilometres: "kilometers", fibre: "fiber",
  // -ise / -ize (only words where that's the whole difference)
  realise: "realize", realised: "realized", realising: "realizing",
  recognise: "recognize", recognised: "recognized", recognising: "recognizing",
  organise: "organize", organised: "organized", organising: "organizing",
  apologise: "apologize", apologised: "apologized", apologising: "apologizing",
  memorise: "memorize", memorised: "memorized", memorising: "memorizing",
  practise: "practice", practised: "practiced", practising: "practicing",
  // doubled consonants and other spellings
  travelling: "traveling", travelled: "traveled", traveller: "traveler",
  cancelled: "canceled", cancelling: "canceling", jewellery: "jewelry",
  grey: "gray", programme: "program", programmes: "programs",
  cheque: "check", tyre: "tire", tyres: "tires", pyjamas: "pajamas",
  catalogue: "catalog", dialogue: "dialog", analyse: "analyze",
  aluminium: "aluminum", mould: "mold", plough: "plow", doughnut: "donut",
  // everyday British / American word pairs
  mum: "mom", mums: "moms", mummy: "mommy",
  flat: "apartment", flats: "apartments",
  holiday: "vacation", holidays: "vacations",
  film: "movie", films: "movies", cinema: "movies",
  biscuit: "cookie", biscuits: "cookies",
  sweets: "candy", lift: "elevator", trousers: "pants",
  jumper: "sweater", jumpers: "sweaters",
  shop: "store", shops: "stores",
  rubbish: "trash", garbage: "trash", bin: "trash can",
  petrol: "gas", lorry: "truck", autumn: "fall", football: "soccer",
  motorway: "highway", pavement: "sidewalk", postcode: "zip code",
  timetable: "schedule", fortnight: "two weeks", toilet: "bathroom",
};

/** The form an answer is compared in. */
export function canonicalAnswer(text: string): string {
  let s = text.normalize("NFC").toLowerCase().replace(APOSTROPHES, "'");
  for (const [pattern, replacement] of CONTRACTIONS) {
    s = s.replace(pattern, replacement);
  }
  // Any remaining punctuation or symbol becomes a space (\p{P} covers
  // dashes, quotes of every kind, ellipses and Bulgarian „…“ quotes).
  s = s.replace(/[\p{P}\p{S}]/gu, " ");
  const words = s.split(/\s+/).filter(Boolean).map((w) => SAME_WORD[w] ?? w);
  // Joined without spaces, so "o clock" = "oclock" and a missed space is fine.
  return words.join("").replace(/\s+/g, "");
}

export function answersMatch(typed: string, expected: string): boolean {
  return canonicalAnswer(typed) === canonicalAnswer(expected);
}
