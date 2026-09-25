import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { newCheckers, checkersMoves, playCheckers, checkersResult, chooseCheckersMove } from '../lib/checkers.ts';
import { chessFromHistory, chessStatus, chooseChessMove, squareAt, squareIndex } from '../lib/chess-game.ts';

function position(pieces, turn = 'red') {
  const board = Array(64).fill(null);
  for (const [index, side, king = false] of pieces) board[index] = { side, king };
  return { board, turn, forcedFrom: null, quietTurns: 0, positions: [] };
}

test('checkers opens with 12 pieces per player and seven legal forward moves', () => {
  const game = newCheckers();
  assert.equal(game.board.filter(p => p?.side === 'red').length, 12);
  assert.equal(game.board.filter(p => p?.side === 'black').length, 12);
  assert.equal(checkersMoves(game).length, 7);
  assert.ok(checkersMoves(game).every(m => m.to < m.from));
  assert.equal(playCheckers(game, { from: 40, to: 42 }), game);
  assert.equal(checkersResult(game), null);
});

test('checkers forces captures and keeps the same piece for a multiple jump', () => {
  const game = position([[42, 'red'], [56, 'red'], [35, 'black'], [21, 'black'], [7, 'black']]);
  assert.deepEqual(checkersMoves(game), [{ from: 42, to: 28, capture: 35 }]);
  const jumped = playCheckers(game, { from: 42, to: 28 });
  assert.equal(game.board[35]?.side, 'black'); // immutable original
  assert.equal(jumped.board[35], null);
  assert.equal(jumped.turn, 'red');
  assert.equal(jumped.forcedFrom, 28);
  assert.deepEqual(checkersMoves(jumped), [{ from: 28, to: 14, capture: 21 }]);
  const finished = playCheckers(jumped, { from: 28, to: 14 });
  assert.equal(finished.turn, 'black');
  assert.equal(finished.forcedFrom, null);
  assert.equal(finished.board[21], null);
});

test('checkers crowning ends a capture turn and kings can move backward', () => {
  const game = position([[17, 'red'], [10, 'black'], [12, 'black']]);
  const crowned = playCheckers(game, { from: 17, to: 3 });
  assert.equal(crowned.board[3].king, true);
  assert.equal(crowned.turn, 'black');
  assert.equal(crowned.forcedFrom, null);
  assert.equal(crowned.board[12]?.side, 'black');
  const king = position([[26, 'red', true], [7, 'black']]);
  assert.ok(checkersMoves(king).some(m => m.to > m.from));
  assert.ok(checkersMoves(king).some(m => m.to < m.from));
});

test('checkers detects no-move losses and the quiet-move draw', () => {
  assert.equal(checkersResult(position([[1, 'red'], [62, 'black']])), 'black');
  assert.equal(checkersResult({ ...position([[26, 'red', true], [7, 'black', true]]), quietTurns: 80 }), 'draw');
});

test('checkers computer completes forced jumps and chooses legal moves without mutation', () => {
  const game = position([[21, 'black'], [28, 'red'], [42, 'red']], 'black');
  const original = JSON.stringify(game);
  const move = chooseCheckersMove(game);
  assert.deepEqual(move, { from: 21, to: 35, capture: 28 });
  const next = playCheckers(game, move);
  assert.equal(next.turn, 'black');
  assert.deepEqual(chooseCheckersMove(next), { from: 35, to: 49, capture: 42 });
  assert.equal(JSON.stringify(game), original);
  let playing = newCheckers();
  for (let i = 0; i < 12 && !checkersResult(playing); i++) {
    const picked = chooseCheckersMove(playing);
    assert.ok(checkersMoves(playing).some(m => m.from === picked.from && m.to === picked.to));
    playing = playCheckers(playing, picked);
  }
});

test('chess coordinates round-trip and replay/undo retains correct position', () => {
  for (let i = 0; i < 64; i++) assert.equal(squareIndex(squareAt(i)), i);
  const game = chessFromHistory(['e4', 'e5', 'Nf3', 'Nc6']);
  assert.equal(game.get('c6').type, 'n');
  assert.equal(chessFromHistory(game.history().slice(0, -2)).fen(), chessFromHistory(['e4', 'e5']).fen());
  assert.equal(chessFromHistory([]).moves().length, 20);
});

test('chess supports castling, en passant and every promotion choice', () => {
  const castle = chessFromHistory(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
  assert.ok(castle.moves({ square: 'e1' }).includes('O-O'));
  castle.move('O-O');
  assert.equal(castle.get('g1').type, 'k');
  assert.equal(castle.get('f1').type, 'r');
  const ep = chessFromHistory(['e4', 'a6', 'e5', 'd5']);
  ep.move({ from: 'e5', to: 'd6' });
  assert.equal(ep.get('d5'), undefined);
  assert.equal(ep.get('d6').type, 'p');
  const promotion = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
  assert.deepEqual(promotion.moves({ square: 'a7', verbose: true }).map(m => m.promotion).sort(), ['b', 'n', 'q', 'r']);
});

test('chess prevents self-check and recognizes mate, stalemate and repetition', () => {
  const pinned = new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.ok(!pinned.moves({ square: 'e2', verbose: true }).some(m => m.to === 'd2'));
  const mate = chessFromHistory(['f3', 'e5', 'g4', 'Qh4#']);
  assert.equal(mate.isCheckmate(), true);
  assert.equal(chessStatus(mate, false), 'ጸሊም ተዓዊቱ!');
  assert.equal(chooseChessMove(mate), null);
  const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(chessStatus(stalemate, false), 'ማዕረ!');
  const repeated = chessFromHistory(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']);
  assert.equal(repeated.isThreefoldRepetition(), true);
});

test('chess computer finds mate and preserves the live game/history', () => {
  const game = chessFromHistory(['f3', 'e5', 'g4']);
  const before = game.fen();
  assert.equal(chooseChessMove(game).san, 'Qh4#');
  assert.equal(game.fen(), before);
  assert.deepEqual(game.history(), ['f3', 'e5', 'g4']);
  const opening = chessFromHistory(['e4']);
  const move = chooseChessMove(opening);
  assert.ok(opening.moves().includes(move.san));
});
