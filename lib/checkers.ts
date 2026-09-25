export type Side = 'red' | 'black';
export type Checker = { side: Side; king: boolean };
export type CheckersMove = { from: number; to: number; capture?: number };
export type CheckersState = {
  board: (Checker | null)[];
  turn: Side;
  forcedFrom: number | null;
  quietTurns: number;
  positions: string[];
};
const opposite = (side: Side): Side => side === 'red' ? 'black' : 'red';
const positionKey = (board: CheckersState['board'], turn: Side) =>
  turn + board.map(p => !p ? '.' : p.side === 'red' ? p.king ? 'R' : 'r' : p.king ? 'B' : 'b').join('');

export function newCheckers(): CheckersState {
  const board = Array.from({ length: 64 }, (_, i): Checker | null => {
    const row = Math.floor(i / 8), col = i % 8;
    return (row + col) % 2 === 1 && (row < 3 || row > 4)
      ? { side: row < 3 ? 'black' : 'red', king: false } : null;
  });
  return { board, turn: 'red', forcedFrom: null, quietTurns: 0, positions: [positionKey(board, 'red')] };
}

function pieceMoves(board: CheckersState['board'], from: number, capturesOnly = false): CheckersMove[] {
  const piece = board[from];
  if (!piece) return [];
  const row = Math.floor(from / 8), col = from % 8;
  const moves: CheckersMove[] = [];
  const directions = piece.king ? [-1, 1] : [piece.side === 'red' ? -1 : 1];
  for (const dr of directions) for (const dc of [-1, 1]) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r > 7 || c < 0 || c > 7) continue;
    const next = r * 8 + c;
    if (!board[next] && !capturesOnly) moves.push({ from, to: next });
    const rr = row + 2 * dr, cc = col + 2 * dc;
    if (board[next] && board[next]?.side !== piece.side && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !board[rr * 8 + cc]) {
      moves.push({ from, to: rr * 8 + cc, capture: next });
    }
  }
  return moves;
}

export function checkersMoves(state: CheckersState): CheckersMove[] {
  if (state.forcedFrom !== null) return pieceMoves(state.board, state.forcedFrom, true);
  const moves = state.board.flatMap((p, i) => p?.side === state.turn ? pieceMoves(state.board, i) : []);
  const captures = moves.filter(m => m.capture !== undefined);
  return captures.length ? captures : moves;
}

export function playCheckers(state: CheckersState, move: CheckersMove): CheckersState {
  const legal = checkersMoves(state).find(m => m.from === move.from && m.to === move.to);
  if (!legal) return state;
  const board = state.board.slice();
  const piece = { ...board[legal.from]! };
  board[legal.from] = null;
  if (legal.capture !== undefined) board[legal.capture] = null;
  const crowned = !piece.king && Math.floor(legal.to / 8) === (piece.side === 'red' ? 0 : 7);
  if (crowned) piece.king = true;
  board[legal.to] = piece;
  // Reaching the king row ends the turn; newly crowned kings cannot jump back immediately.
  if (legal.capture !== undefined && !crowned && pieceMoves(board, legal.to, true).length) {
    return { ...state, board, forcedFrom: legal.to, quietTurns: 0 };
  }
  const turn = opposite(state.turn);
  return { board, turn, forcedFrom: null,
    quietTurns: legal.capture !== undefined || crowned ? 0 : state.quietTurns + 1,
    positions: [...state.positions, positionKey(board, turn)] };
}

export function checkersResult(state: CheckersState): Side | 'draw' | null {
  if (!checkersMoves(state).length) return opposite(state.turn);
  if (state.quietTurns >= 80 || (state.forcedFrom === null && state.positions.filter(p => p === positionKey(state.board, state.turn)).length >= 3)) return 'draw';
  return null;
}

export function chooseCheckersMove(state: CheckersState): CheckersMove | null {
  if (checkersResult(state)) return null;
  const me = state.turn;
  function score(s: CheckersState, depth: number, alpha: number, beta: number): number {
    const result = checkersResult(s);
    if (result) return result === 'draw' ? 0 : result === me ? 10000 + depth : -10000 - depth;
    if (depth <= 0 && s.forcedFrom === null) return s.board.reduce((total, p, i) => {
      if (!p) return total;
      const row = Math.floor(i / 8), col = i % 8;
      const value = p.king ? 180 : 100 + (p.side === 'red' ? 7 - row : row) * 4;
      return total + (p.side === me ? 1 : -1) * (value + 3.5 - Math.abs(col - 3.5));
    }, 0);
    const maximizing = s.turn === me;
    let best = maximizing ? -Infinity : Infinity;
    for (const move of checkersMoves(s)) {
      const next = playCheckers(s, move);
      const value = score(next, depth - (next.turn === s.turn ? 0 : 1), alpha, beta);
      best = maximizing ? Math.max(best, value) : Math.min(best, value);
      if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best: CheckersMove | null = null, bestScore = -Infinity;
  for (const move of checkersMoves(state)) {
    const value = score(playCheckers(state, move), 3, -Infinity, Infinity);
    if (value > bestScore) { bestScore = value; best = move; }
  }
  return best;
}
