/* ─ Pose builder ─ */
function pose(ov = {}) {
  const b = [
    [.500, .105], [.476, .094], [.524, .094], [.448, .104], [.552, .104],
    [.383, .228], [.617, .228],
    [.361, .382], [.639, .382],
    [.362, .520], [.638, .520],
    [.432, .532], [.568, .532],
    [.432, .722], [.568, .722],
    [.432, .902], [.568, .902],
  ];
  return b.map((k, i) => ov[i] || k);
}

export const PLACES = [
  {
    id: 'beach', label: '🏖️ Beach', color: '#FF9A3C',
    poses: [
      { name: 'Victory Jump', emoji: '🏆', hint: 'Raise both arms in a big V — you own this beach!',
        kp: pose({ 7: [.27, .13], 8: [.73, .13], 9: [.19, .03], 10: [.81, .03] }) },
      { name: 'Wave Spread', emoji: '🌊', hint: 'Spread arms wide and level — like you\'re surfing!',
        kp: pose({ 7: [.20, .228], 8: [.80, .228], 9: [.06, .228], 10: [.94, .228] }) },
      { name: 'Sun Gaze', emoji: '☀️', hint: 'Raise one hand to shade your eyes, look up!',
        kp: pose({ 7: [.30, .15], 9: [.25, .06] }) },
    ]
  },
  {
    id: 'mountain', label: '⛰️ Mountain', color: '#66BB6A',
    poses: [
      { name: 'Summit Stand', emoji: '🏔️', hint: 'Both arms up high — you conquered the top!',
        kp: pose({ 7: [.27, .13], 8: [.73, .13], 9: [.19, .03], 10: [.81, .03] }) },
      { name: 'Point the Way', emoji: '🧭', hint: 'Extend one arm straight out, look that direction.',
        kp: pose({ 7: [.20, .228], 9: [.05, .228] }) },
      { name: 'Hiker Pose', emoji: '🥾', hint: 'Wide legs, both hands on knees, lean forward.',
        kp: pose({ 7: [.33, .40], 8: [.67, .40], 9: [.40, .56], 10: [.60, .56],
          13: [.38, .72], 14: [.62, .72], 15: [.36, .90], 16: [.64, .90] }) },
    ]
  },
  {
    id: 'cafe', label: '☕ Café', color: '#A1887F',
    poses: [
      { name: 'Cup Cradle', emoji: '☕', hint: 'Bring both hands together at chest height.',
        kp: pose({ 7: [.41, .30], 8: [.59, .30], 9: [.46, .40], 10: [.54, .40] }) },
      { name: 'Lean Back', emoji: '🛋️', hint: 'Elbows back, wrists behind — chill mode!',
        kp: pose({ 7: [.30, .31], 8: [.70, .31], 9: [.24, .44], 10: [.76, .44] }) },
      { name: 'Window Look', emoji: '🪟', hint: 'One arm up resting on the wall, look sideways.',
        kp: pose({ 7: [.30, .15], 9: [.27, .05] }) },
    ]
  },
  {
    id: 'city', label: '🏙️ City', color: '#7986CB',
    poses: [
      { name: 'Power Stance', emoji: '💪', hint: 'Hands on hips, legs wide, chin up — own the street!',
        kp: pose({ 7: [.30, .38], 8: [.70, .38], 9: [.43, .53], 10: [.57, .53],
          13: [.38, .72], 14: [.62, .72], 15: [.36, .90], 16: [.64, .90] }) },
      { name: 'Street Model', emoji: '🕶️', hint: 'Stand natural — confident, hands relaxed at sides.',
        kp: pose() },
      { name: 'Arms Wide', emoji: '🌆', hint: 'Stretch arms fully horizontal — T-pose for the skyline!',
        kp: pose({ 7: [.18, .228], 8: [.82, .228], 9: [.04, .228], 10: [.96, .228] }) },
    ]
  },
  {
    id: 'park', label: '🌿 Park', color: '#26C6A6',
    poses: [
      { name: 'Free Spirit', emoji: '🌸', hint: 'Arms swept wide and slightly up — feel the breeze!',
        kp: pose({ 7: [.24, .26], 8: [.76, .26], 9: [.10, .34], 10: [.90, .34] }) },
      { name: 'Leaf Twirl', emoji: '🍂', hint: 'One arm arching up, other sweeping out sideways.',
        kp: pose({ 7: [.29, .14], 8: [.72, .30], 9: [.23, .04], 10: [.90, .35] }) },
      { name: 'Grounded', emoji: '🌳', hint: 'Legs apart, arms relaxed out — rooted like a tree.',
        kp: pose({ 7: [.32, .34], 8: [.68, .34], 9: [.27, .46], 10: [.73, .46],
          13: [.40, .72], 14: [.60, .72], 15: [.38, .90], 16: [.62, .90] }) },
    ]
  },
  {
    id: 'night', label: '🌃 Night', color: '#AB47BC',
    poses: [
      { name: 'Neon Arms', emoji: '💜', hint: 'Both arms halfway up and out — bathe in the light!',
        kp: pose({ 7: [.29, .30], 8: [.71, .30], 9: [.23, .42], 10: [.77, .42] }) },
      { name: 'Dance Move', emoji: '🕺', hint: 'One arm high, one out — strike a dance pose!',
        kp: pose({ 7: [.29, .14], 8: [.76, .28], 9: [.22, .05], 10: [.90, .34] }) },
      { name: 'Star Power', emoji: '✨', hint: 'Full T-pose with attitude — you own this night!',
        kp: pose({ 7: [.18, .228], 8: [.82, .228], 9: [.04, .228], 10: [.96, .228] }) },
    ]
  },
];

export const CONN = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6],
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
];
