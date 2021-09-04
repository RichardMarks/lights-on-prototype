import React, {
  useState,
  useCallback,
  useMemo,
  useReducer,
  useEffect
} from 'react';
import './style.css';

const WIDTH = 512;
const HEIGHT = 512;

const rowCount = 4;
const colCount = 4;
const numCells = rowCount * colCount;

const spacing = 4;
const cellWidth = (WIDTH - spacing) / colCount;
const cellHeight = (HEIGHT - spacing) / rowCount;

export const getAffectedCoordinates = (column, row) => {
  const affected = [[column, row], [0, 0]];

  if (column === 0) {
    // first column
    affected.push([1, 0]);
    if (row === 0) {
      // first row
      affected.push([0, 1]);
    } else if (row === rowCount - 1) {
      // last row
      affected.push([0, -1]);
    } else {
      // middle row
      affected.push([0, -1], [0, 1]);
    }
  } else if (column === colCount - 1) {
    // last column
    affected.push([-1, 0]);
    if (row === 0) {
      // first row
      affected.push([0, 1]);
    } else if (row === rowCount - 1) {
      // last row
      affected.push([0, -1]);
    } else {
      // middle row
      affected.push([0, -1], [0, 1]);
    }
  } else {
    // middle column
    affected.push([-1, 0]);
    if (row === 0) {
      // first row
      affected.push([1, 0], [0, 1]);
    } else if (row === rowCount - 1) {
      // last row
      affected.push([1, 0], [0, -1]);
    } else {
      // middle row
      affected.push([1, 0], [0, 1], [0, -1]);
    }
  }

  return affected;
};

export const applyAffectedCoordinatesToState = (affected, state) => {
  const [column, row] = affected.shift();
  const nextState = affected.reduce(
    (s, [dx, dy]) => {
      const id = `${column + dx}_${row + dy}`;
      const lastValue = Boolean(s[id]);
      return { ...s, [id]: !lastValue };
    },
    { ...state }
  );
  return nextState;
};

export const flipLogic = (state, column, row) => {
  const affected = getAffectedCoordinates(column, row);
  return applyAffectedCoordinatesToState(affected, state);
};

const puzzleReducerActionHandlers = {
  RESET_PUZZLE() {
    return {};
  },

  FLIP(state, action) {
    return flipLogic(state, action.column, action.row);
  }
};

export const puzzleReducer = (state, action) => {
  const handler = puzzleReducerActionHandlers[action.type];

  if (handler) {
    return handler(state, action);
  }

  return state;
};

export const calculatePuzzleCellsFromState = state => {
  const cells = [];

  for (let i = 0; i < numCells; i++) {
    const colIndex = ~~(i % colCount);
    const rowIndex = ~~(i / colCount);
    const id = `${colIndex}_${rowIndex}`;
    const cell = {
      id,
      column: colIndex,
      row: rowIndex,
      x: spacing + colIndex * cellWidth,
      y: spacing + rowIndex * cellHeight,
      width: cellWidth - spacing,
      height: cellHeight - spacing,
      color: state[id] ? 'seagreen' : 'black',
      lit: !!state[id]
    };
    cells.push(cell);
  }

  return cells;
};

export const usePuzzleReducer = () => {
  const [state, dispatch] = useReducer(puzzleReducer, {});

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_PUZZLE' });
  }, [dispatch]);

  const flip = useCallback(
    (column, row) => {
      dispatch({ column, row, type: 'FLIP' });
    },
    [dispatch]
  );

  return {
    state,
    flip,
    reset
  };
};

export const usePuzzleState = () => {
  const puzzle = usePuzzleReducer();

  const data = useMemo(() => {
    return calculatePuzzleCellsFromState(puzzle.state);
  }, [puzzle]);

  return {
    puzzle,
    rows: data,
    cells: data
  };
};

export const PuzzleCellView = ({ cell, flip }) => {
  const handleFlip = useCallback(() => {
    flip(cell.column, cell.row);
  }, [cell, flip]);

  const { id, x, y, width, height, color } = cell;

  return (
    <rect
      key={id}
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      onClick={handleFlip}
    />
  );
};

export const PuzzleView = ({ width, height }) => {
  const [cleared, setCleared] = useState(false);
  const puzzle = usePuzzleState();

  useEffect(() => {
    const numLights = puzzle.cells.filter(cell => cell.lit).length;
    if (numLights === numCells) {
      setCleared(true);
    }
  }, [puzzle.cells]);

  const viewBox = `0 0 ${width} ${height}`;

  return (
    <svg viewBox={viewBox} width={width} height={height}>
      <rect x={0} y={0} width={width} height={height} fill="white" />
      {puzzle.cells.map(cell => (
        <PuzzleCellView
          key={cell.id}
          cell={cell}
          flip={cleared ? () => {} : puzzle.puzzle.flip}
        />
      ))}

      {cleared && (
        <>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="black"
            opacity={0.4}
          />
          <text
            x={width * 0.15}
            y={height * 0.5}
            fill="green"
            stroke="lime"
            strokeWidth={3}
            textLength={width * 0.7}
            lengthAdjust="spacingAndGlyphs"
            fontSize={height * 0.2}
            pointerEvents="none"
          >
            You Win!
          </text>

          <text
            x={width * 0.25}
            y={height * 0.745}
            fill="white"
            stroke="#aaa"
            strokeWidth={2}
            textLength={width * 0.5}
            lengthAdjust="spacingAndGlyphs"
            fontSize={height * 0.15}
            cursor="pointer"
            onClick={() => {
              puzzle.puzzle.reset();
              setCleared(false);
            }}
          >
            Play Again
          </text>
        </>
      )}
    </svg>
  );
};

export default function App() {
  return <PuzzleView width={WIDTH} height={HEIGHT} />;
}
