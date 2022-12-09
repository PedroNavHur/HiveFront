import { Button, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { COLOR_OPTIONS, PIECE_OPTIONS } from "./constants";
import {Axes} from './position'
import {Color, Insect, Piece} from './Piece'

interface ManualUpdaterProps {
  addPiece: (pos: Axes, piece: Piece) => void
}

export const ManualUpdater = (props: ManualUpdaterProps) => {
  const { addPiece } = props;

  const defaultColor = 'WHITE' as Color
  const defaultPiece = 'BEE' as Insect

  const [pieceType, setPieceType] = React.useState(defaultPiece);
  const [pieceColor, setPieceColor] = React.useState(defaultColor);
  const [qAxis, setQAxis] = React.useState(0)
  const [rAxis, setRAxis] = React.useState(0)

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPieceType(event.target.value as Insect);
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPieceColor(event.target.value as Color);
  };

  const handleQAxisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQAxis(parseInt(event.target.value));
  };

  const handleRAxisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRAxis(parseInt(event.target.value));
  };

  const addPieceUpdate = () => {
    console.log('updating')
    addPiece(new Axes(qAxis, rAxis), {color: pieceColor, type: pieceType})
  }

  return (
    <>
      <Typography variant='body1'>
        'test' {pieceColor} {pieceType} {qAxis} {rAxis}
      </Typography>
      <Stack spacing={2} direction="row" m={2} justifyContent="center">
        <TextField
          id="player"
          select
          label="Player"
          value={pieceColor}
          onChange={handleColorChange}
          SelectProps={{ native: true }}
          variant="filled"
        >
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </TextField>
        <TextField
          id="type"
          select
          label="Type"
          value={pieceType}
          onChange={handleTypeChange}
          SelectProps={{ native: true }}
          variant="filled"
        >
          {PIECE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </TextField>
        <TextField
          id="axis-q"
          label="Q Axis"
          type="number"
          defaultValue='0'
          style={{ width: 75 }}
          onChange={handleQAxisChange}
          variant="filled"
        />
        <TextField
          id="axis-q"
          label="R Axis"
          type="number"
          defaultValue='0'
          style={{ width: 75 }}
          onChange={handleRAxisChange}
          variant="filled"
        />
        <Button variant="contained" onClick={addPieceUpdate}>UPDATE</Button>
      </Stack>
    </>
  )
}