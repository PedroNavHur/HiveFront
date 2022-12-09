// React imports
import * as React from 'react';
import { Map, Set, List } from 'immutable'

// UI Imports
import { Button, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { HexGrid, Layout } from 'react-hexgrid';

// Local Imports
import { ORIGIN, PIECE_SIZE } from './constants';
import IMGRenders from './IMGRenders';
import { ManualUpdater } from './ManualUpdater';
import { Axes } from './position';
import { Color, Insect, Piece, renderPiece } from './Piece';
import { useSnackbar, withSnackbar } from 'notistack';

type Hive = Map<Axes, [Piece]>
type UniqueMoves = Set<Axes>
type PieceCallback = (pos: Axes, piece: Piece) => void

const getHeight = (key: Axes, hive: Hive) => {
  return hive.get(key)?.length ?? 0
}

const getBeeMoves = (hive: Hive, pos: Axes): UniqueMoves => {
  let moves: UniqueMoves = Set()

  for (const [left, move, right] of pos.neighboringGates) {
    if (!hive.has(move) && hive.has(left) !== hive.has(right)) {
      moves = moves.add(move)
    }
  }

  return moves
}

const getAntMoves = (hive: Hive, startPiece: Axes): UniqueMoves => {
  const tempHive = hive.delete(startPiece)

  let visited: Set<Axes> = Set()
  let result: UniqueMoves = Set()
  let queue: Axes[] = [startPiece]


  while (queue.length) {
    const curPiece = queue.shift()!
    visited = visited.add(curPiece)

    for (const move of getBeeMoves(tempHive, curPiece)) {
      if (!visited.has(move)) {
        queue.push(move)
      }
    }

    if (!curPiece.equals(startPiece)) {
      result = result.add(curPiece)
    }
  }

  return result
}

const getSpiderMoves = (hive: Hive, startPiece: Axes): UniqueMoves => {
  const LIMIT = 3
  const tempHive = hive.delete(startPiece)

  let distance: Map<Axes, number> = Map()
  let result: UniqueMoves = Set()

  let queue: Axes[] = [startPiece]
  distance = distance.set(startPiece, 0)

  while (queue.length) {
    const curPiece = queue.shift()!
    const curDist = distance.get(curPiece)!

    for (const move of getBeeMoves(tempHive, curPiece)) {
      if (!distance.has(move)) {
        distance = distance.set(move, curDist + 1)
        queue.push(move)
      }
    }

    if (curDist === LIMIT) {
      result = result.add(curPiece)
    }
  }

  return result
}

const getHopperMoves = (hive: Hive, hex: Axes): UniqueMoves => {
  let result: UniqueMoves = Set()

  for (const dir of Axes.DIRECTIONS) {
    let piece = hex.add(dir)

    // Hopper must jump over at least one other bug - Hive like a Champ pg.9
    if (hive.has(piece)) {

      // Hopper must jump to first unocupied space on the direction - Hive like a Champ pg.9
      while (hive.has(piece)) {
        piece = piece.add(dir)
      }

      result = result.add(piece)
    }
  }
  return result
}

const getBeetleMoves = (hive: Hive, hex: Axes): UniqueMoves => {
  // Following Randy Ingersoll Chapter 10.1 - Bug Movement atop the Hive
  let result: UniqueMoves = Set()
  const startH = getHeight(hex, hive)

  for (const [left, piece, right] of hex.neighboringGates) {
    const leftH = getHeight(left, hive)
    const finalH = getHeight(piece, hive) + 1
    const rightH = getHeight(right, hive)

    // Sliding Same Level
    if (startH == finalH) {
      if ((leftH < startH) || (rightH < startH)) {
        if (leftH || rightH) {
          result = result.add(piece)
        }
      }
    }

    // Sliding Down
    if (startH > finalH) {
      if ((leftH < startH) || (rightH < startH)) {
        result = result.add(piece)
      }
    }

    // Climbing Up
    if (startH < finalH) {
      if ((leftH < finalH) || (rightH < finalH)) {
        result = result.add(piece)
      }
    }
  }

  return result
}

const getLockedPieces = (hive: Hive, last_move: Axes): UniqueMoves => {
  // Don't break the hive rule, same problem as critical connections
  // Using Tarjan's Algorithm
  // Adapted from: https://leetcode.com/problems/critical-connections-in-a-network/solutions/1087281/critical-connections-in-a-network/

  let graph: Map<Axes, number> = Map()
  let seen: Set<Axes> = Set()
  let index: Map<Axes, number> = Map()
  let lockedPieces: UniqueMoves = Set()

  const dfs = (rank: number, node: Axes, parent?: Axes) => {
    seen = seen.add(node)
    rank += 1

    index = index.set(node, rank)
    graph = graph.set(node, rank)

    // Consider succesors of node
    for (const child of node.neighbors) {
      // That are in the hive
      if (!hive.has(child)) continue
      if (parent && child.equals(parent)) continue

      // Already been visited, update rank
      if (seen.has(child)) {
        const minRank = Math.min(graph.get(node)!, index.get(child)!)
        graph = graph.set(node, minRank)

      } else {
        // Not been visited? recurse
        dfs(rank, child, node)

        const minRank = Math.min(graph.get(node)!, graph.get(child)!)
        graph = graph.set(node, minRank)

        if (graph.get(child)! >= index.get(node)! && parent) {
          lockedPieces = lockedPieces.add(node)
        }
      }
    }
  }

  dfs.call(this, 0, last_move)

  console.log(seen.toJS())
  console.log(lockedPieces.toJS())

  return lockedPieces
}

const getPlaceSpots = (hive: Hive, color: Color) => {
  let allySpots: UniqueMoves = Set()
  let enemySpots: UniqueMoves = Set()

  for (const [pos, piece] of hive.entries()) {
    if (piece[piece.length - 1].color == color) {
      // Add all sorrounding pieces of matching color to ally spots
      for (const neighbor of pos.neighbors) {
        allySpots = allySpots.add(neighbor)
      }
    } else {
      // Add others to enemy spots
      for (const neighbor of pos.neighbors) {
        enemySpots = enemySpots.add(neighbor)
      }
    }
  }

  // remove pieces already in hive
  allySpots = allySpots.filterNot((piece) => hive.has(piece))

  // remove enemy spots from ours
  allySpots = allySpots.filterNot((piece) => enemySpots.has(piece))

  return allySpots
}

const generateMoves = (hive: Hive, pos: Axes) => {
  let availableMoves: UniqueMoves = Set()

  const pieces = hive.get(pos)!
  const piece = pieces[pieces.length - 1]

  if (piece.type == 'BEE') {
    availableMoves = getBeeMoves(hive, pos)
  } else if (piece.type == 'ANT1' || piece.type == 'ANT2' || piece.type == 'ANT3') {
    availableMoves = getAntMoves(hive, pos)
  } else if (piece.type == 'HOPPER1' || piece.type == 'HOPPER2' || piece.type == 'HOPPER3') {
    availableMoves = getHopperMoves(hive, pos)
  } else if (piece.type == 'BEETLE1' || piece.type == 'BEETLE2') {
    availableMoves = getBeetleMoves(hive, pos)
  } else if (piece.type == 'SPIDER1' || piece.type == 'SPIDER2') {
    availableMoves = getSpiderMoves(hive, pos)
  }

  return availableMoves
}

const getMoveHints = (hive: Hive, pos: Axes, piece: Piece) => {
  let availableMoves: UniqueMoves = Set()

  if (piece.type == 'BEE') {
    availableMoves = getBeeMoves(hive, pos)
  } else if (piece.type == 'ANT1' || piece.type == 'ANT2' || piece.type == 'ANT3') {
    availableMoves = getAntMoves(hive, pos)
  } else if (piece.type == 'HOPPER1' || piece.type == 'HOPPER2' || piece.type == 'HOPPER3') {
    availableMoves = getHopperMoves(hive, pos)
  } else if (piece.type == 'BEETLE1' || piece.type == 'BEETLE2') {
    availableMoves = getBeetleMoves(hive, pos)
  } else if (piece.type == 'SPIDER1' || piece.type == 'SPIDER2') {
    availableMoves = getSpiderMoves(hive, pos)
  }

  let hintColor: Color = 'LIGHT'
  if (piece.color == 'BLACK') {
    hintColor = 'DARK'
  }
  const hintPiece = { color: hintColor, type: piece.type }

  // Initializing Immutable Map with Set Iterator
  // More at: https://untangled.io/immutable-js-every-way-to-create-an-immutable-map/
  const hintHive: Hive = Map(availableMoves.map((pos) => ([pos, [hintPiece]])))

  return hintHive
}

const getPlaceHints = (hive: Hive) => {
  const whitePlaces = getPlaceSpots(hive, 'WHITE')
  const blackPlaces = getPlaceSpots(hive, 'BLACK')

  const whiteHintHive: Hive = Map(whitePlaces.map(pos => ([pos, [{ color: 'LIGHT', type: 'BEE' }]])))
  const blackHintHive: Hive = Map(blackPlaces.map(pos => ([pos, [{ color: 'DARK', type: 'BEE' }]])))

  console.log('WP', whitePlaces.toJS())
  console.log('BP', blackPlaces.toJS())
  console.log('WHH', whiteHintHive.toJS())
  console.log('BHH', blackHintHive.toJS())

  const placeHints = whiteHintHive.merge(blackHintHive)

  return placeHints
}

const getAvailablePieces = (hive: Hive, color: Color) => {
  // Looks for available pieces
  let bee = 1
  let ant = 3
  let hopper = 3
  let beetle = 2
  let spider = 2

  // Filter our pieces
  let used_pieces = hive.filter((value) => value[value.length - 1].color == color)

  // Iterate trough the piece and substract piece counts
  used_pieces.forEach((value, key) => {
    const piece = value[value.length - 1].type

    if (piece == 'BEE') {
      bee -= 1
    } else if (piece == 'ANT1' || piece == 'ANT2' || piece == 'ANT3') {
      ant -= 1
    } else if (piece == 'HOPPER1' || piece == 'HOPPER2' || piece == 'HOPPER3') {
      hopper -= 1
    } else if (piece == 'BEETLE1' || piece == 'BEETLE2') {
      beetle -= 1
    } else if (piece == 'SPIDER1' || piece == 'SPIDER2') {
      spider -= 1
    }
  })

  let available: Set<Insect> = Set()

  // Add available pieces
  if (bee > 0) available = available.add('BEE')
  if (ant > 0) available = available.add('ANT1')
  if (hopper > 0) available = available.add('HOPPER1')
  if (beetle > 0) available = available.add('BEETLE1')
  if (spider > 0) available = available.add('SPIDER1')

  return available
}

const renderHive = (hive: Hive, callback: PieceCallback) => {
  // Iterating and casting to arary over immutable map https://stackoverflow.com/a/49022743/9761716
  const hiveArray = [...hive.entries()]

  // map and render every piece in the hive
  const renderedHive = hiveArray.map((element) => {
    const [pos, piece] = element
    return renderPiece(pos, piece[piece.length - 1], callback)
  })

  return <>
    {renderedHive}
  </>
}

const hasSomebodyWon = (hive: Hive) => {
  hive.forEach((pieces, pos) => {
    pieces.forEach((piece) => {
      if (piece.type == 'BEE') {
        // We got a Bee piece, now check neighbors
        const surrounded = pos.neighbors.every((nei_pos) =>
          hive.has(nei_pos))

        if (surrounded) {
          if (piece.color === 'BLACK') {
            console.log('White has Won!')
            return true
          } else {
            console.log('Black has Won!')
            return true
          }
        }
      }
    })
  })
  return false
}

const getHeuristicValue = (hive: Hive) => {
  let value = 0

  // Add Safety / Offence Points
  hive.forEach((pieces, pos) => {
    pieces.forEach((piece) => {
      if (piece.type == 'BEE') {
        // For each piece surrounding
        const surrounded = pos.neighbors.forEach((nei_pos) => {
          if (hive.has(nei_pos)) {
            // Take away points if they surround us
            if (piece.color === 'BLACK') {
              value -= 100
            // Give points for surrounding the enemy
            } else {
              value += 100
            }
          }
        })
      }
    })
  })

  // Add Mobility Calculation
  const move = hive.keySeq().first()!
  const lockedPieces = getLockedPieces(hive, move)
  lockedPieces.forEach((pos) => {
    const pieces = hive.get(pos)!
    const piece = pieces[pieces?.length - 1]
    // For every piece we can't move penalize us
    if (piece.color == 'BLACK') {
      value -= 10
    } else {
    // Reward for every piece they cannot move
      value += 10
    }
  })

  return value
}

// Hive is immutable, no need to undo
const negamax = (hiveNode: Hive, depth: number, alpha: number, beta: number, player: number) => {
  if (depth === 0 || hasSomebodyWon(hiveNode)) {
    return player * getHeuristicValue(hiveNode)
  }

  const rootMove = hiveNode.keySeq().first()!
  const childMoves = generateMoves(hiveNode, rootMove)

  let value = Number.NEGATIVE_INFINITY
  for (const move of childMoves) {
    const childHiveNode = hiveNode.set(move, hiveNode.get(rootMove)!)
    value = Math.max(value, -negamax(childHiveNode, depth - 1, alpha * -1, beta * -1, player * -1))
    alpha = Math.max(alpha, value)

    if (alpha >= beta) {
      break
    }
  }

  return value
}

const HexBoard = () => {
  // Board States
  const emptySet: UniqueMoves = Set()
  const emptyHive: Hive = Map()

  // Hive states
  const [turn, setTurn] = React.useState(0)
  const [board, setBoard] = React.useState(emptyHive)
  const [hintHive, setHintHive] = React.useState(emptyHive)

  const [showingPlace, setShowingPlace] = React.useState(false)
  const [lockedMoves, setLockedHive] = React.useState(emptySet)
  const [activeMoves, setActivePiece] = React.useState(emptySet)

  // Snackbar States (Notifications)
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()

  const handlePlaceHints = () => {
    setShowingPlace(true)
    const updatedHintHive = getPlaceHints(board)
    setHintHive(updatedHintHive)
  }

  // Handle when pieces are clicked
  const pieceCallback = (pos: Axes, piece: Piece) => {

    if (piece.color == 'BLACK' || piece.color == 'WHITE') {
      const updatedPiece = emptySet.add(pos)
      setActivePiece(updatedPiece)
      setShowingPlace(false)

      // Clear last message
      closeSnackbar()

      // Send Warning Message that you can't move that piece
      if (lockedMoves.has(pos)) {
        enqueueSnackbar("Can't move that piece!", { variant: 'error' })
      } else {
        const updatedHintHive = getMoveHints(board, pos, piece)
        if (updatedHintHive.size === 0) {
          enqueueSnackbar("Can't move that piece!", { variant: 'error' })
        }
        setHintHive(updatedHintHive)
      }

    } else {
      if (showingPlace) {

      } else {
        if (piece.color == 'LIGHT') {
          console.log('moving', pos)
          const prevPos = activeMoves.first()!
          updatePiece(prevPos, pos, { color: 'WHITE', type: piece.type })
        }
      }
    }
  }

  const updatePiece = (prev: Axes, curr: Axes, piece: Piece) => {
    // Reset Hints
    setHintHive(emptyHive)

    // Increment Turn
    setTurn(turn + 1)

    let updatedBoard = board

    // Remove Prev
    let prevPieces = updatedBoard.get(prev)!
    if (prevPieces.length > 1) {
      prevPieces.pop()
      updatedBoard = updatedBoard.set(prev, prevPieces)
    } else {
      updatedBoard = updatedBoard.delete(prev)
    }

    // Add curr
    // Managing Immutable State in React
    // source: https://github.com/immutable-js/immutable-js/wiki/Immutable-as-React-state
    if (board.has(curr)) {
      let pieces = updatedBoard.get(curr)!
      pieces.push(piece)
      updatedBoard = updatedBoard.set(curr, pieces)
      setBoard(updatedBoard)
    } else {
      updatedBoard = updatedBoard.set(curr, [piece])
    }

    setBoard(updatedBoard)

    // Update Critical Connections
    const critical = getLockedPieces(updatedBoard, curr)
    setLockedHive(critical)
  }

  const addPiece = (pos: Axes, piece: Piece) => {
    // Reset Hints
    setHintHive(emptyHive)

    // Increment Turn
    setTurn(turn + 1)

    let updatedBoard = board
    // Managing Immutable State in React
    // source: https://github.com/immutable-js/immutable-js/wiki/Immutable-as-React-state
    if (board.has(pos)) {
      let pieces = board.get(pos)!
      pieces.push(piece)
      updatedBoard = board.set(pos, pieces)
    } else {
      updatedBoard = board.set(pos, [piece])
    }

    // update board
    setBoard(updatedBoard)

    // Update Critical Connections
    const critical = getLockedPieces(updatedBoard, pos)
    setLockedHive(critical)
  }

  const handleAIMove = () => {
    // For now only works with black

    // Detect AI color
    let ai_color: Color = 'WHITE'
    let vs_color: Color = 'BLACK'

    if (turn % 2) {
      ai_color = 'BLACK'
      vs_color = 'WHITE'
    } else {
      return
    }

    // Filtering our moves
    // https://immutable-js.com/docs/v4.1.0/Map/#filter()
    const ai_pieces = Set(board.filter((value) => value[value.length - 1].color == ai_color).keySeq())
    const ai_movable = ai_pieces.subtract(lockedMoves)

    const ai_new_places = List(getPlaceSpots(board, ai_color))
    const ai_new_pieces = List(getAvailablePieces(board, ai_color))

    console.log('AI board pieces', ai_pieces.toJS())
    console.log('AI free places', ai_new_places.toJS())
    console.log('AI free pieces', ai_new_pieces.toJS())
    console.log('AI movable pieces', ai_movable.toJS())

    // Following Hive like a Champion Chapter 9 - Opening Theory

    if (turn == 1) {
      // Black's first move is recommended to be Spider
      const vs_new_places = getPlaceSpots(board, vs_color)
      const position = vs_new_places.first()
      addPiece(position!, { color: ai_color, type: 'SPIDER1' })
      console.log('Placing Opening Spider')

    } else if (turn == 3) {
      // Black's second move is recommended to be the Bee
      const i_pos = Math.floor(Math.random() * ai_new_places.size)
      const position = ai_new_places.get(i_pos)
      addPiece(position!, { color: ai_color, type: 'BEE' })
      console.log('Placing Opening Bee')

    } else {
      // Black can now place and move pieces
      if (ai_pieces.size < 5) {
        // always place a piece when under 5
        const i_piece = Math.floor(Math.random() * ai_new_pieces.size)
        const i_pos = Math.floor(Math.random() * ai_new_places.size)

        const type = ai_new_pieces.get(i_piece)
        const position = ai_new_places.get(i_pos)
        addPiece(position!, { color: ai_color, type: type! })
      } else {

        let ai_legal_moves: Map<Axes, Set<Axes>> = Map()
        ai_movable.forEach((value) => {
          const generatedMoves = generateMoves(board, value)
          ai_legal_moves = ai_legal_moves.set(value, generatedMoves)
        })
      }

    }
  }

  return (
    <>
      <ManualUpdater addPiece={addPiece} />

      <Stack direction='row' spacing={2}>
        <Button variant='outlined' onClick={handlePlaceHints}>Show Placements</Button>
        <Button variant='contained' onClick={handleAIMove}>Get AI Move</Button>
      </Stack>

      <HexGrid width={800} height={800} viewBox="-75 -75 150 150">
        <Layout size={PIECE_SIZE} flat={false} spacing={1.1} origin={ORIGIN}>
          {renderHive(board, pieceCallback)}
          {renderHive(hintHive, pieceCallback)}
        </Layout>
        <IMGRenders />
      </HexGrid>
    </>
  );
}

export default withSnackbar(HexBoard);