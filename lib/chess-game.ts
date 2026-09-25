import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';

export const PIECE_NAMES: Record<PieceSymbol, string> = { k: 'ንጉስ', q: 'ንግስቲ', r: 'ግምቢ', b: 'ጳጳስ', n: 'ፈረስ', p: 'ወተሃደር' };
export const squareAt = (index: number): Square => `${'abcdefgh'[index % 8]}${8 - Math.floor(index / 8)}` as Square;
export const squareIndex = (square: Square) => (8 - Number(square[1])) * 8 + 'abcdefgh'.indexOf(square[0]);
export function chessFromHistory(moves: string[]): Chess {
  const game = new Chess();
  for (const move of moves) game.move(move);
  return game;
}
export function chessStatus(game: Chess, computerTurn: boolean): string {
  const side = game.turn() === 'w' ? 'ጻዕዳ' : 'ጸሊም';
  if (game.isCheckmate()) return `${game.turn() === 'w' ? 'ጸሊም' : 'ጻዕዳ'} ተዓዊቱ!`;
  if (game.isDraw()) return 'ማዕረ!';
  if (game.isCheck()) return `ናይ ${side} ንጉስ ኣብ ሓደጋ ኣሎ!`;
  return computerTurn ? 'ኮምፒተር ይጻወት ኣሎ…' : `ተራ ናይ ${side}`;
}
const VALUES: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const priority = (move: Move) => (move.captured ? VALUES[move.captured] * 10 - VALUES[move.piece] : 0) + (move.promotion ? VALUES[move.promotion] : 0) + (move.san.includes('+') ? 25 : 0);

/** Small, deterministic two-ply opponent. Search on a clone so the live game never mutates. */
export function chooseChessMove(source: Chess): Move | null {
  if (source.isGameOver()) return null;
  const game = new Chess(source.fen());
  const me = game.turn();
  function evaluate() {
    return game.board().flat().reduce((score, p) => {
      if (!p) return score;
      const file = 'abcdefgh'.indexOf(p.square[0]);
      const rank = Number(p.square[1]);
      const central = (3.5 - Math.abs(file - 3.5)) + (3.5 - Math.abs(rank - 4.5));
      const position = p.type === 'p' ? (p.color === 'w' ? rank - 2 : 7 - rank) * 9 + central * 2 : p.type === 'n' || p.type === 'b' ? central * 10 : 0;
      return score + (p.color === me ? 1 : -1) * (VALUES[p.type] + position);
    }, 0);
  }
  function search(depth: number, alpha: number, beta: number): number {
    if (game.isCheckmate()) return game.turn() === me ? -100000 - depth : 100000 + depth;
    if (game.isDraw()) return 0;
    if (!depth) return evaluate();
    const maximizing = game.turn() === me;
    let best = maximizing ? -Infinity : Infinity;
    for (const move of game.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a))) {
      game.move(move);
      const score = search(depth - 1, alpha, beta);
      game.undo();
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
      if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best: Move | null = null, bestScore = -Infinity;
  for (const move of game.moves({ verbose: true }).sort((a, b) => priority(b) - priority(a))) {
    game.move(move);
    const score = search(1, bestScore, Infinity);
    game.undo();
    if (score > bestScore) { bestScore = score; best = move; }
  }
  return best;
}
