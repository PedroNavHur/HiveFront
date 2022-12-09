import { Hexagon, Text } from 'react-hexgrid';
import { Axes } from './position';

// Typscript Union Types
// Source: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
type Bee = 'BEE'
type Ant = 'ANT1' | 'ANT2' | 'ANT3'
type Hopper = 'HOPPER1' | 'HOPPER2' | 'HOPPER3'
type Spider = 'SPIDER1' | 'SPIDER2'
type Beetle = 'BEETLE1' | 'BEETLE2'
export type Insect = Bee | Ant | Hopper | Spider | Beetle
export type Color = 'WHITE' | 'BLACK' | 'LIGHT' | 'DARK'

// Typescript Interface
// Source: https://www.typescriptlang.org/docs/handbook/2/objects.html
export interface Piece {
  color: Color
  type: Insect
}

export const getPieceKind = (type: Insect) => {
  if (type == 'BEE') {
    return 'bee'
  } else if (type == 'ANT1' || type == 'ANT2' || type == 'ANT3') {
    return 'ant'
  } else if (type == 'SPIDER1' || type == 'SPIDER2') {
    return 'spider'
  } else if (type == 'BEETLE1' || type == 'BEETLE2') {
    return 'beetle'
  } else {
    return 'hopper'
  }
}

type PieceCallback = (pos: Axes, piece: Piece) => void

export const renderPiece = (pos: Axes, piece: Piece, callback: PieceCallback) => {
  // coordinates
  const q = pos.q
  const r = pos.r
  const s = - q - r

  // color, picture, and key
  const color = piece.color
  const img = getPieceKind(piece.type)
  const reactKey = pos.valueOf() + piece

  // if dark or light show position
  if (color == 'DARK' || color == 'LIGHT') {
    return (
      <Hexagon q={q} r={r} s={s} className={color} onClick={() => callback(pos, piece)}  key={reactKey} >
        <Text>{q}, {r}</Text>
      </Hexagon>
    )

    // show insect and background
  } else {
    return <>
      <Hexagon q={q} r={r} s={s} className={color} key={reactKey + 'a'} />
      <Hexagon q={q} r={r} s={s} className={color} fill={img} key={reactKey + 'b'} onClick={() => callback(pos, piece)} />
    </>
  }
}