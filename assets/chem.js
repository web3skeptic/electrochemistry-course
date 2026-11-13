// Shared chemistry data + helpers for all lessons: window.Chem
// Values: standard reduction potentials are E° in volts vs the standard hydrogen electrode at 25 °C, 1 M / 1 bar
// (rounded textbook values, CRC Handbook). Use these numbers in lessons so the whole course agrees with itself.
(function () {
  const F = 96485;      // C per mole of electrons (Faraday constant)
  const R = 8.314;      // J / (mol K)
  const T0 = 298.15;    // K (25 °C)
  const E_CHARGE = 1.602e-19; // C
  const N_A = 6.022e23;

  // [Z, symbol, name, group, period, atomic mass, Pauling electronegativity (null = none), first ionisation energy kJ/mol, shells]
  const raw = [
    [1, "H", "hydrogen", 1, 1, 1.008, 2.20, 1312, [1]],
    [2, "He", "helium", 18, 1, 4.003, null, 2372, [2]],
    [3, "Li", "lithium", 1, 2, 6.94, 0.98, 520, [2, 1]],
    [4, "Be", "beryllium", 2, 2, 9.012, 1.57, 900, [2, 2]],
    [5, "B", "boron", 13, 2, 10.81, 2.04, 801, [2, 3]],
    [6, "C", "carbon", 14, 2, 12.011, 2.55, 1086, [2, 4]],
    [7, "N", "nitrogen", 15, 2, 14.007, 3.04, 1402, [2, 5]],
    [8, "O", "oxygen", 16, 2, 15.999, 3.44, 1314, [2, 6]],
    [9, "F", "fluorine", 17, 2, 18.998, 3.98, 1681, [2, 7]],
    [10, "Ne", "neon", 18, 2, 20.180, null, 2081, [2, 8]],
    [11, "Na", "sodium", 1, 3, 22.990, 0.93, 496, [2, 8, 1]],
    [12, "Mg", "magnesium", 2, 3, 24.305, 1.31, 738, [2, 8, 2]],
    [13, "Al", "aluminium", 13, 3, 26.982, 1.61, 578, [2, 8, 3]],
    [14, "Si", "silicon", 14, 3, 28.085, 1.90, 787, [2, 8, 4]],
    [15, "P", "phosphorus", 15, 3, 30.974, 2.19, 1012, [2, 8, 5]],
    [16, "S", "sulfur", 16, 3, 32.06, 2.58, 1000, [2, 8, 6]],
    [17, "Cl", "chlorine", 17, 3, 35.45, 3.16, 1251, [2, 8, 7]],
    [18, "Ar", "argon", 18, 3, 39.948, null, 1521, [2, 8, 8]],
    [19, "K", "potassium", 1, 4, 39.098, 0.82, 419, [2, 8, 8, 1]],
    [20, "Ca", "calcium", 2, 4, 40.078, 1.00, 590, [2, 8, 8, 2]],
    [21, "Sc", "scandium", 3, 4, 44.956, 1.36, 633, [2, 8, 9, 2]],
    [22, "Ti", "titanium", 4, 4, 47.867, 1.54, 659, [2, 8, 10, 2]],
    [23, "V", "vanadium", 5, 4, 50.942, 1.63, 651, [2, 8, 11, 2]],
    [24, "Cr", "chromium", 6, 4, 51.996, 1.66, 653, [2, 8, 13, 1]],
    [25, "Mn", "manganese", 7, 4, 54.938, 1.55, 717, [2, 8, 13, 2]],
    [26, "Fe", "iron", 8, 4, 55.845, 1.83, 762, [2, 8, 14, 2]],
    [27, "Co", "cobalt", 9, 4, 58.933, 1.88, 760, [2, 8, 15, 2]],
    [28, "Ni", "nickel", 10, 4, 58.693, 1.91, 737, [2, 8, 16, 2]],
    [29, "Cu", "copper", 11, 4, 63.546, 1.90, 745, [2, 8, 18, 1]],
    [30, "Zn", "zinc", 12, 4, 65.38, 1.65, 906, [2, 8, 18, 2]],
    [31, "Ga", "gallium", 13, 4, 69.723, 1.81, 579, [2, 8, 18, 3]],
    [32, "Ge", "germanium", 14, 4, 72.630, 2.01, 762, [2, 8, 18, 4]],
    [33, "As", "arsenic", 15, 4, 74.922, 2.18, 947, [2, 8, 18, 5]],
    [34, "Se", "selenium", 16, 4, 78.971, 2.55, 941, [2, 8, 18, 6]],
    [35, "Br", "bromine", 17, 4, 79.904, 2.96, 1140, [2, 8, 18, 7]],
    [36, "Kr", "krypton", 18, 4, 83.798, 3.00, 1351, [2, 8, 18, 8]],
    [47, "Ag", "silver", 11, 5, 107.868, 1.93, 731, [2, 8, 18, 18, 1]],
    [48, "Cd", "cadmium", 12, 5, 112.414, 1.69, 868, [2, 8, 18, 18, 2]],
    [50, "Sn", "tin", 14, 5, 118.710, 1.96, 709, [2, 8, 18, 18, 4]],
    [53, "I", "iodine", 17, 5, 126.904, 2.66, 1008, [2, 8, 18, 18, 7]],
    [55, "Cs", "caesium", 1, 6, 132.905, 0.79, 376, [2, 8, 18, 18, 8, 1]],
    [56, "Ba", "barium", 2, 6, 137.327, 0.89, 503, [2, 8, 18, 18, 8, 2]],
    [78, "Pt", "platinum", 10, 6, 195.084, 2.28, 870, [2, 8, 18, 32, 17, 1]],
    [79, "Au", "gold", 11, 6, 196.967, 2.54, 890, [2, 8, 18, 32, 18, 1]],
    [80, "Hg", "mercury", 12, 6, 200.592, 2.00, 1007, [2, 8, 18, 32, 18, 2]],
    [82, "Pb", "lead", 14, 6, 207.2, 2.33, 716, [2, 8, 18, 32, 18, 4]],
  ];
  const elements = {};
  for (const [Z, sym, name, group, period, mass, en, ie1, shells] of raw) elements[sym] = { Z, sym, name, group, period, mass, en, ie1, shells, valence: shells[shells.length - 1] };

  // Standard reduction potentials, sorted from strongest reducing agent (top) to strongest oxidising agent (bottom).
  // { id, ox, red, n, E, medium } : ox + n e⁻ → red. Formulas are in the plain notation Chem.f() understands.
  const E0 = [
    { id: "Li", ox: "Li^+", red: "Li", n: 1, E: -3.04 },
    { id: "K", ox: "K^+", red: "K", n: 1, E: -2.93 },
    { id: "Ba", ox: "Ba^2+", red: "Ba", n: 2, E: -2.91 },
    { id: "Ca", ox: "Ca^2+", red: "Ca", n: 2, E: -2.87 },
    { id: "Na", ox: "Na^+", red: "Na", n: 1, E: -2.71 },
    { id: "Mg", ox: "Mg^2+", red: "Mg", n: 2, E: -2.37 },
    { id: "Al", ox: "Al^3+", red: "Al", n: 3, E: -1.66 },
    { id: "ZnO", ox: "ZnO + H2O", red: "Zn + 2OH^-", n: 2, E: -1.26, medium: "base" },
    { id: "Mn", ox: "Mn^2+", red: "Mn", n: 2, E: -1.18 },
    { id: "H2O/H2", ox: "2H2O", red: "H2 + 2OH^-", n: 2, E: -0.83, medium: "base" },
    { id: "Cd(OH)2", ox: "Cd(OH)2", red: "Cd + 2OH^-", n: 2, E: -0.81, medium: "base" },
    { id: "Zn", ox: "Zn^2+", red: "Zn", n: 2, E: -0.76 },
    { id: "Cr", ox: "Cr^3+", red: "Cr", n: 3, E: -0.74 },
    { id: "Fe", ox: "Fe^2+", red: "Fe", n: 2, E: -0.44 },
    { id: "Cd", ox: "Cd^2+", red: "Cd", n: 2, E: -0.40 },
    { id: "PbSO4", ox: "PbSO4", red: "Pb + SO4^2-", n: 2, E: -0.36, medium: "acid" },
    { id: "Co", ox: "Co^2+", red: "Co", n: 2, E: -0.28 },
    { id: "Ni", ox: "Ni^2+", red: "Ni", n: 2, E: -0.26 },
    { id: "V3/V2", ox: "V^3+", red: "V^2+", n: 1, E: -0.26 },
    { id: "Sn", ox: "Sn^2+", red: "Sn", n: 2, E: -0.14 },
    { id: "Pb", ox: "Pb^2+", red: "Pb", n: 2, E: -0.13 },
    { id: "H", ox: "2H^+", red: "H2", n: 2, E: 0.00, medium: "acid" },
    { id: "Sn4/Sn2", ox: "Sn^4+", red: "Sn^2+", n: 2, E: 0.15 },
    { id: "AgCl", ox: "AgCl", red: "Ag + Cl^-", n: 1, E: 0.22 },
    { id: "Cu", ox: "Cu^2+", red: "Cu", n: 2, E: 0.34 },
    { id: "O2/OH", ox: "O2 + 2H2O", red: "4OH^-", n: 4, E: 0.40, medium: "base" },
    { id: "NiOOH", ox: "NiO(OH) + H2O", red: "Ni(OH)2 + OH^-", n: 1, E: 0.49, medium: "base" },
    { id: "Cu+", ox: "Cu^+", red: "Cu", n: 1, E: 0.52 },
    { id: "I2", ox: "I2", red: "2I^-", n: 2, E: 0.54 },
    { id: "Fe3/Fe2", ox: "Fe^3+", red: "Fe^2+", n: 1, E: 0.77 },
    { id: "Ag", ox: "Ag^+", red: "Ag", n: 1, E: 0.80 },
    { id: "Hg", ox: "Hg^2+", red: "Hg", n: 2, E: 0.85 },
    { id: "VO2/VO", ox: "VO2^+ + 2H^+", red: "VO^2+ + H2O", n: 1, E: 1.00, medium: "acid" },
    { id: "Br2", ox: "Br2", red: "2Br^-", n: 2, E: 1.07 },
    { id: "MnO2", ox: "MnO2 + 4H^+", red: "Mn^2+ + 2H2O", n: 2, E: 1.22, medium: "acid" },
    { id: "O2", ox: "O2 + 4H^+", red: "2H2O", n: 4, E: 1.23, medium: "acid" },
    { id: "Cr2O7", ox: "Cr2O7^2- + 14H^+", red: "2Cr^3+ + 7H2O", n: 6, E: 1.33, medium: "acid" },
    { id: "Cl2", ox: "Cl2", red: "2Cl^-", n: 2, E: 1.36 },
    { id: "Au", ox: "Au^3+", red: "Au", n: 3, E: 1.50 },
    { id: "MnO4", ox: "MnO4^- + 8H^+", red: "Mn^2+ + 4H2O", n: 5, E: 1.51, medium: "acid" },
    { id: "PbO2", ox: "PbO2 + SO4^2- + 4H^+", red: "PbSO4 + 2H2O", n: 2, E: 1.69, medium: "acid" },
    { id: "H2O2", ox: "H2O2 + 2H^+", red: "2H2O", n: 2, E: 1.78, medium: "acid" },
    { id: "F2", ox: "F2", red: "2F^-", n: 2, E: 2.87 },
  ];
  const E0by = Object.fromEntries(E0.map((c) => [c.id, c]));

  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };
  const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  // Chem.f("Cu^2+ + SO4^2-") → "Cu²⁺ + SO₄²⁻" (plain Unicode: safe in HTML and in SVG text).
  // Rules: ^… = charge (superscript); a digit right after a letter or ")" = subscript; leading coefficients stay
  // normal; "e-" → e⁻; "->" → →; "<->" → ⇌.
  function f(str) {
    return String(str)
      .replace(/<->/g, "⇌").replace(/->/g, "→")
      .replace(/(^|[\s\d(+])e-(?![A-Za-z^])/g, "$1e⁻")
      .replace(/\^([0-9]*[+-])/g, (m, c) => [...c].map((ch) => SUP[ch]).join(""))
      .replace(/([A-Za-z\)])([0-9]+)/g, (m, a, d) => a + [...d].map((ch) => SUB[ch]).join(""));
  }
  // half-reaction text for an E0 entry: "Zn²⁺ + 2e⁻ → Zn"
  function half(c, reverse) {
    c = typeof c === "string" ? E0by[c] : c;
    const e = (c.n === 1 ? "" : c.n) + "e⁻";
    return reverse ? `${f(c.red)} → ${f(c.ox)} + ${e}` : `${f(c.ox)} + ${e} → ${f(c.red)}`;
  }
  // Nernst: E for a reduction half-reaction (or whole cell) with reaction quotient Q at temperature T (K)
  function nernst(E0v, n, Q, T) { return E0v - (R * (T || T0)) / (n * F) * Math.log(Q); }
  // theoretical specific capacity in mAh per gram of an active material: n electrons per formula unit of molar mass M
  function capacity(n, M) { return (n * F) / (3.6 * M); }

  window.Chem = { F, R, T0, E_CHARGE, N_A, elements, E0, E0by, f, half, nernst, capacity };
})();
