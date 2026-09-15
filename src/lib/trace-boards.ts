export type Board = {
  w: number;
  h: number;
  blocked: [number, number][];
  waypoints: { x: number; y: number; n: number }[];
};

/** Boards arrive as data — any width, height, blocked layout and waypoint set is valid. */
export const BOARDS: Board[] = [
  { w: 4, h: 4, blocked: [], waypoints: [{ x: 3, y: 0, n: 1 }, { x: 1, y: 3, n: 2 }, { x: 3, y: 1, n: 3 }] },
  { w: 5, h: 4, blocked: [], waypoints: [{ x: 2, y: 3, n: 1 }, { x: 4, y: 0, n: 2 }, { x: 1, y: 3, n: 3 }] },
  {
    w: 5,
    h: 5,
    blocked: [[2, 2]],
    waypoints: [{ x: 4, y: 3, n: 1 }, { x: 2, y: 1, n: 2 }, { x: 0, y: 3, n: 3 }, { x: 4, y: 0, n: 4 }],
  },
  {
    w: 6,
    h: 5,
    blocked: [[0, 4], [5, 0]],
    waypoints: [{ x: 2, y: 3, n: 1 }, { x: 2, y: 2, n: 2 }, { x: 5, y: 1, n: 3 }, { x: 0, y: 0, n: 4 }],
  },
  {
    w: 6,
    h: 6,
    blocked: [[2, 2], [3, 2]],
    waypoints: [
      { x: 2, y: 0, n: 1 },
      { x: 2, y: 3, n: 2 },
      { x: 0, y: 0, n: 3 },
      { x: 4, y: 5, n: 4 },
      { x: 3, y: 0, n: 5 },
    ],
  },
  {
    w: 6,
    h: 6,
    blocked: [[0, 0], [5, 5], [2, 3]],
    waypoints: [
      { x: 1, y: 2, n: 1 },
      { x: 3, y: 1, n: 2 },
      { x: 1, y: 4, n: 3 },
      { x: 5, y: 4, n: 4 },
      { x: 1, y: 0, n: 5 },
    ],
  },
];
