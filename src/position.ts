/// Following Hexagonal Grids math logic, available at: https://www.redblobgames.com/grids/hexagons/

// Using Axial coordinate system for simplicity and efficiency, following redbloggames logic
// Avaliable at: https://www.redblobgames.com/grids/hexagons/#coordinates-axial
export class Axes {
  q: number
  r: number

  constructor(q: number, r: number) {
    this.q = q
    this.r = r
  }

  /**
   * Check two hexes have the same coordinate.
   * Typescript doesn't have operator overloading, so we use this.
   */
  equals(other: Axes) {
    return this.q === other.q && this.r === other.r
  }

  /**
   * Check two hexes have the same coordinate.
   * Typescript doesn't have operator overloading, so we use this.
   */
  add(other: Axes) {
    return new Axes(this.q + other.q, this.r + other.r)
  }

  /**
   * Encodes the position as a JSON String
   * Used for comparison and as keys in dictionary and set.
   * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf
   */
  valueOf() {
    return JSON.stringify({ q: this.q, r: this.r })
  }

  // Axial direction vectors and neighbor logic from redbloggames
  // Source: https://www.redblobgames.com/grids/hexagons/#neighbors-axial
  static readonly DIRECTIONS = [
    new Axes(1, 0),
    new Axes(1, -1),
    new Axes(0, -1),
    new Axes(-1, 0),
    new Axes(-1, 1),
    new Axes(0, 1),
  ]

  // Axial direction vectors and neighbor logic from redbloggames
  // Source: https://www.redblobgames.com/grids/hexagons/#neighbors-axial
  get neighbors() {
    return Axes.DIRECTIONS.map(dir => this.add(dir))
  }

  // Axial direction vectors and neighbor logic from redbloggames
  // Source: https://www.redblobgames.com/grids/hexagons/#neighbors-axial
  get neighboringGates() {
    const neighbors = this.neighbors
    return neighbors.map((pos, i) => [pos, neighbors[(i + 1) % 6], neighbors[(i + 2) % 6]])
  }

}