// const { getNetto, round, sumUp } = require("./utils"),
//   example_data = {
//     "2957650661025766": 298.26,
//     "4485460018168025": 50.42,
//     "4997699950244511": 0,
//   };
const { round } = require("./utils");

it("rounds correctly", () => {
  expect(round(1.23456789)).toBe(1.24);
  expect(round(-1.276357625376453)).toBe(-1.28);
});

// it("calculates netto properly", () => {
//   expect(getNetto(example_data)).toEqual({
//     "2957650661025766": -182.0333333333333,
//     "4485460018168025": 65.80666666666667,
//     "4997699950244511": 116.22666666666667,
//   });

//   expect(getNetto(example_data, true)).toEqual({
//     "2957650661025766": -182.04,
//     "4485460018168025": 65.81,
//     "4997699950244511": 116.23,
//   });
// });

// it("sumUp calculates transactions correctly", () => {
//   expect(sumUp(example_data)).toEqual([
//     {
//       amount: 65.81,
//       from: "4485460018168025",
//       to: "2957650661025766",
//     },
//     {
//       amount: 116.23,
//       from: "4997699950244511",
//       to: "2957650661025766",
//     },
//   ]);
// });
