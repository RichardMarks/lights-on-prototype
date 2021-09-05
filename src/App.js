import React, {
  useState,
  useCallback,
  useMemo,
  useReducer,
  useEffect,
  createContext,
  useContext
} from 'react';
import './style.css';

const WIDTH = 512;
const HEIGHT = 512;

const rowCount = 5;
const colCount = 5;
const numCells = rowCount * colCount;

const spacing = 4;
const cellWidth = (WIDTH - spacing) / colCount;
const cellHeight = (HEIGHT - spacing) / rowCount;

export const getColumnRowFromIndex = index => {
  const column = ~~(index % colCount);
  const row = ~~(index / colCount);
  return { column, row };
};

export const getPuzzleCellIdFromCooordinate = (column, row) =>
  `${column}_${row}`;

export const decodeMagicValueToTable = magicValue =>
  magicValue
    .toString(2)
    .split('')
    .map(Number);

export const magicValues = [0x15a82b5, 0x1b06c1b].map(decodeMagicValueToTable);

export const puzzleStateToCheckTable = state => {
  const check = [];

  for (let i = 0; i < numCells; i++) {
    const { column, row } = getColumnRowFromIndex(i);
    const id = getPuzzleCellIdFromCooordinate(column, row);
    check.push(state[id] ? 1 : 0);
  }

  return check;
};

export const compareCheckTableAgainstMagicValueTable = (
  check,
  magicValueTable
) => {
  let dotProduct = 0;

  for (let i = 0; i < numCells; i++) {
    dotProduct = (dotProduct + check[i] * magicValueTable[i]) % 2;
  }

  return dotProduct === 0;
};

export const isPuzzleSolvable = state => {
  const check = puzzleStateToCheckTable(state);

  return (
    compareCheckTableAgainstMagicValueTable(check, magicValues[0]) &&
    compareCheckTableAgainstMagicValueTable(check, magicValues[1])
  );
};

export const getAffectedCoordinates = (column, row) => {
  const affected = [[column, row], [0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]];
  return affected;
};

export const isOutOfBounds = (column, row) => ([dx, dy]) =>
  !(
    column + dx < 0 ||
    column + dx >= colCount ||
    row + dy < 0 ||
    row + dy >= rowCount
  );

export const applyAffectedCoordinatesToState = (affected, state) => {
  const [column, row] = affected.shift();
  const outOfBounds = isOutOfBounds(column, row);
  const nextState = affected.filter(outOfBounds).reduce(
    (s, [dx, dy]) => {
      const id = getPuzzleCellIdFromCooordinate(column + dx, row + dy);
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
  },

  FLIP_SINGLE(state, action) {
    const { column, row } = action;
    return applyAffectedCoordinatesToState([[column, row], [0, 0]], state);
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
    const { column, row } = getColumnRowFromIndex(i);
    const id = getPuzzleCellIdFromCooordinate(column, row);

    const cell = {
      id,
      column,
      row,
      x: spacing + column * cellWidth,
      y: spacing + row * cellHeight,
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

  const flipSingle = useCallback(
    (column, row) => {
      dispatch({ column, row, type: 'FLIP_SINGLE' });
    },
    [dispatch]
  );

  return {
    state,
    flip,
    flipSingle,
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
  const editor = usePuzzleEditorContext();
  const [cleared, setCleared] = useState(false);

  const puzzle = editor.puzzle;

  const onCellClick = useMemo(() => {
    if (editor.editorMode === 'play') {
      if (cleared) {
        return () => {};
      }
      return puzzle.puzzle.flip;
    }
    return puzzle.puzzle.flipSingle;
  }, [editor.editorMode, cleared, puzzle.puzzle.state]);

  useEffect(() => {
    if (editor.editorMode === 'editor') {
      return;
    }
    const numLights = puzzle.cells.filter(cell => cell.lit).length;
    if (numLights === numCells) {
      setCleared(true);
    }
  }, [puzzle.cells, editor.editorMode]);

  const viewBox = `0 0 ${width} ${height}`;

  return (
    <svg viewBox={viewBox} width={width} height={height}>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={editor.editorMode === 'editor' ? 'red' : 'white'}
      />
      {puzzle.cells.map(cell => (
        <PuzzleCellView key={cell.id} cell={cell} flip={onCellClick} />
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

export const PuzzleEditorContext = createContext({});
export const usePuzzleEditorContext = () => useContext(PuzzleEditorContext);

export const PuzzleEditorContextProvider = ({ children }) => {
  const [editorMode, setEditorModeState] = useState('play');
  const puzzle = usePuzzleState();

  const setEditorMode = useCallback(changeEvent => {
    setEditorModeState(changeEvent.target.value);
  }, []);

  const isSolvable = useMemo(() => {
    return isPuzzleSolvable(puzzle.puzzle.state);
  }, [editorMode, puzzle.puzzle.state]);

  const contextValue = {
    editorMode,
    setEditorMode,
    isSolvable,
    puzzle
  };

  return (
    <PuzzleEditorContext.Provider value={contextValue}>
      {children}
    </PuzzleEditorContext.Provider>
  );
};

export const PuzzleEditorToolbar = () => {
  const editor = usePuzzleEditorContext();

  return (
    <div style={{ display: 'flex', marginBottom: 10 }}>
      <label style={{ marginRight: 10 }}>Mode:</label>
      <select
        style={{ flex: 1 }}
        value={editor.editorMode}
        onChange={editor.setEditorMode}
      >
        <option value="play">Play Game</option>
        <option value="editor">Edit Puzzle</option>
      </select>
      <div style={{ flex: 1 }} />
      <label>Solvable Puzzle: {editor.isSolvable ? 'Yes' : 'No'}</label>
    </div>
  );
};

export default function App() {
  return (
    <div>
      <PuzzleEditorContextProvider>
        <PuzzleEditorToolbar />
        <PuzzleView width={WIDTH} height={HEIGHT} />
      </PuzzleEditorContextProvider>
    </div>
  );
}
