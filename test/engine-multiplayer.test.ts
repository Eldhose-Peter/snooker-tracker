import assert from 'node:assert';
import { 
  createInitialFrameState, 
  handlePot, 
  handleMiss, 
  handleFoul, 
  handleSwitchPlayer, 
  handleConcede, 
  checkSnookersNeeded
} from '../src/lib/snooker-engine';
import { INITIAL_PLAYERS } from '../src/lib/storage';

console.log('--- Starting Snooker Tracker Verification Suite ---');

// 1. Roster Verification
console.log('\n[1] Verifying Member Roster...');
const memberNames = INITIAL_PLAYERS.map(p => p.name);
const expectedMembers = ['Eldho', 'Thoma', 'Raju', 'Adi', 'BM', 'Sam'];
for (const name of expectedMembers) {
  assert(memberNames.includes(name), `Expected member ${name} to be in roster, found: ${memberNames.join(', ')}`);
}
assert.strictEqual(INITIAL_PLAYERS.length, 6, 'Should have exactly 6 initial members');
console.log('✓ All 6 members (Eldho, Thoma, Raju, Adi, BM, Sam) present and no dummy users found.');

// 2. Multiplayer Frame State Creation
console.log('\n[2] Verifying Multiplayer Engine Initialization (3 and 4 players)...');
const state3P = createInitialFrameState(3, 15);
assert.strictEqual(state3P.playerScores.length, 3);
assert.deepStrictEqual(state3P.playerScores, [0, 0, 0]);
assert.strictEqual(state3P.activePlayerIndex, 0);
assert.strictEqual(state3P.pointsRemaining, 147); // 15*8 + 27 = 147
assert.strictEqual(state3P.redsRemaining, 15);

const state4P = createInitialFrameState(4, 10);
assert.strictEqual(state4P.playerScores.length, 4);
assert.deepStrictEqual(state4P.playerScores, [0, 0, 0, 0]);
assert.strictEqual(state4P.pointsRemaining, 107); // 10*8 + 27 = 107
assert.strictEqual(state4P.redsRemaining, 10);
console.log('✓ Multiplayer Frame State initializes correctly for any player count and red count.');

// 3. Multiplayer Potting & Turns
console.log('\n[3] Verifying Multiplayer Potting & Turn Rotation...');
// Player 1 pots Red (1 pt)
let st = handlePot(state3P, 'red');
assert.deepStrictEqual(st.playerScores, [1, 0, 0]);
assert.strictEqual(st.currentBreak, 1);
assert.strictEqual(st.tablePhase, 'COLOR_AFTER_RED');
assert.strictEqual(st.activePlayerIndex, 0); // Still player 0's break

// Player 1 pots Black (7 pts)
st = handlePot(st, 'black');
assert.deepStrictEqual(st.playerScores, [8, 0, 0]);
assert.strictEqual(st.currentBreak, 8);
assert.strictEqual(st.tablePhase, 'RED');
assert.strictEqual(st.playerHighestBreaks[0], 8);

// Player 1 Misses -> Turn passes to Player 2 (index 1)
st = handleMiss(st);
assert.strictEqual(st.activePlayerIndex, 1);
assert.strictEqual(st.currentBreak, 0);
assert.deepStrictEqual(st.playerScores, [8, 0, 0]);

// Player 2 pots Red (1 pt) and Blue (5 pts)
st = handlePot(st, 'red');
st = handlePot(st, 'blue');
assert.deepStrictEqual(st.playerScores, [8, 6, 0]);
assert.strictEqual(st.currentBreak, 6);
assert.strictEqual(st.playerHighestBreaks[1], 6);

// Player 2 Misses -> Turn passes to Player 3 (index 2)
st = handleMiss(st);
assert.strictEqual(st.activePlayerIndex, 2);
assert.strictEqual(st.currentBreak, 0);

// Player 3 pots Red (1 pt) and Pink (6 pts)
st = handlePot(st, 'red');
st = handlePot(st, 'pink');
assert.deepStrictEqual(st.playerScores, [8, 6, 7]);
assert.strictEqual(st.currentBreak, 7);
assert.strictEqual(st.playerHighestBreaks[2], 7);

// Player 3 Misses -> Turn wraps around to Player 1 (index 0)
st = handleMiss(st);
assert.strictEqual(st.activePlayerIndex, 0);
assert.strictEqual(st.currentBreak, 0);
console.log('✓ Potting, break tracking, and 3-player turn rotation pass successfully.');

// 4. Multiplayer Fouls
console.log('\n[4] Verifying Multiplayer Foul Penalty Distribution...');
// Current scores: P1: 8, P2: 6, P3: 7. Active: P1 (index 0).
// P1 commits a 4-pt foul with target 'all_opponents' (default for cutthroat/ring games)
let foulState = handleFoul(st, 4, 'all_opponents');
// P1 remains 8. P2 gets +4 = 10. P3 gets +4 = 11. Turn passes to P2 (index 1).
assert.deepStrictEqual(foulState.playerScores, [8, 10, 11]);
assert.strictEqual(foulState.activePlayerIndex, 1);

// P2 commits a 5-pt foul with target 'next_player'
foulState = handleFoul(foulState, 5, 'next_player');
// P3 (next player) gets +5 = 16. Turn passes to P3 (index 2).
assert.deepStrictEqual(foulState.playerScores, [8, 10, 16]);
assert.strictEqual(foulState.activePlayerIndex, 2);

// P3 commits foul with passBackToSamePlayer = true
foulState = handleFoul(foulState, 4, 'all_opponents', false, true);
// P1: 8+4=12, P2: 10+4=14, P3: 16. Active player remains P3!
assert.deepStrictEqual(foulState.playerScores, [12, 14, 16]);
assert.strictEqual(foulState.activePlayerIndex, 2);
console.log('✓ Multiplayer foul options (all opponents, next player, pass back) work accurately.');

// 5. Snookers Needed Math for Multiple Players
console.log('\n[5] Verifying Multiplayer Snookers Calculation...');
// Scores: [100, 50, 40], Table Remaining: 27 pts.
// P0 lead: 100.
// P1 max possible: 50 + 27 = 77 < 100 -> Deficit: 23 -> Snookers: ceil(23/4) = 6 snookers.
// P2 max possible: 40 + 27 = 67 < 100 -> Deficit: 33 -> Snookers: ceil(33/4) = 9 snookers.
const snk = checkSnookersNeeded([100, 50, 40], 27);
assert.strictEqual(snk.needed, true);
assert.strictEqual(snk.leaderIndex, 0);
assert.strictEqual(snk.trailers.length, 2);
assert.strictEqual(snk.trailers[0].playerIndex, 1);
assert.strictEqual(snk.trailers[0].count, 6);
assert.strictEqual(snk.trailers[1].playerIndex, 2);
assert.strictEqual(snk.trailers[1].count, 9);
console.log('✓ Multi-player snooker math correctly identifies all trailing players and exact snookers required.');

// 6. Undo and Redo Mechanics
console.log('\n[6] Verifying Undo & Redo History Stack Mechanics...');
const undoStack: typeof state3P[] = [];
let redoStack: typeof state3P[] = [];
let cur = createInitialFrameState(3, 15);

function applyAction(next: typeof state3P) {
  undoStack.push(cur);
  redoStack = []; // clear redo on new action
  cur = next;
}

function undo() {
  assert(undoStack.length > 0, 'Cannot undo empty stack');
  const prev = undoStack.pop()!;
  redoStack.push(cur);
  cur = prev;
}

function redo() {
  assert(redoStack.length > 0, 'Cannot redo empty stack');
  const next = redoStack.pop()!;
  undoStack.push(cur);
  cur = next;
}

// Action 1: Pot Red
applyAction(handlePot(cur, 'red'));
assert.strictEqual(cur.playerScores[0], 1);
assert.strictEqual(undoStack.length, 1);
assert.strictEqual(redoStack.length, 0);

// Action 2: Pot Black
applyAction(handlePot(cur, 'black'));
assert.strictEqual(cur.playerScores[0], 8);
assert.strictEqual(undoStack.length, 2);

// Action 3: Miss (Player 2's turn)
applyAction(handleMiss(cur));
assert.strictEqual(cur.activePlayerIndex, 1);
assert.strictEqual(undoStack.length, 3);

// Test Undo #1: Revert Miss
undo();
assert.strictEqual(cur.activePlayerIndex, 0);
assert.strictEqual(cur.playerScores[0], 8);
assert.strictEqual(undoStack.length, 2);
assert.strictEqual(redoStack.length, 1);

// Test Undo #2: Revert Black pot
undo();
assert.strictEqual(cur.playerScores[0], 1);
assert.strictEqual(cur.currentBreak, 1);
assert.strictEqual(undoStack.length, 1);
assert.strictEqual(redoStack.length, 2);

// Test Redo #1: Restore Black pot
redo();
assert.strictEqual(cur.playerScores[0], 8);
assert.strictEqual(cur.currentBreak, 8);
assert.strictEqual(undoStack.length, 2);
assert.strictEqual(redoStack.length, 1);

// Test Redo #2: Restore Miss
redo();
assert.strictEqual(cur.activePlayerIndex, 1);
assert.strictEqual(cur.currentBreak, 0);
assert.strictEqual(undoStack.length, 3);
assert.strictEqual(redoStack.length, 0);

// Test Branching: After undoing, a new action clears redo stack
undo(); // cur is now back to black pot
assert.strictEqual(redoStack.length, 1);
applyAction(handlePot(cur, 'red')); // player 1 pots red instead
assert.strictEqual(cur.playerScores[0], 9);
assert.strictEqual(redoStack.length, 0, 'Redo stack must be cleared after new branching action');
console.log('✓ Undo and Redo stacks perform flawlessly across pots, turns, and branch mutations.');

// 7. Randomise Sequence Verification
console.log('\n[7] Verifying Sequence Randomisation / Shuffle Algorithm...');
const players = [...INITIAL_PLAYERS];
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const shuffled = shuffleArray(players);
assert.strictEqual(shuffled.length, players.length);
// All original members must still be present
for (const p of players) {
  assert(shuffled.some(sp => sp.id === p.id), `Player ${p.name} missing from shuffled array`);
}
console.log('✓ Randomisation preserves all players with zero dropouts or duplicates.');

// 8. Manual Player Switch & Concession
console.log('\n[8] Verifying Manual Player Switch and Multiplayer Concession...');
let sConcede = createInitialFrameState(3, 15);
sConcede = handlePot(sConcede, 'red'); // P1 has 1 pt
sConcede = handleSwitchPlayer(sConcede, 2); // Switch to P3
assert.strictEqual(sConcede.activePlayerIndex, 2);
assert.strictEqual(sConcede.currentBreak, 0); // break reset

// P2 concedes
const afterConcede = handleConcede(sConcede, 1);
assert.strictEqual(afterConcede.isFrameOver, true);
assert.strictEqual(afterConcede.winnerIndex, 0); // P1 had highest score
console.log('✓ Manual switch and multiplayer concede behave correctly.');

// 9. Re-spotted Black on Tied Scores & Shootout Resolution
console.log('\n[9] Verifying Tied Scores on Final Black & Re-spotted Black...');
// Setup state on final black with scores tied: Eldho: 50, Thoma: 43. Thoma pots Black (+7) -> 50 - 50.
const sTie = createInitialFrameState(2, 0, ['Eldho', 'Thoma']);
sTie.playerScores = [50, 43];
sTie.activePlayerIndex = 1; // Thoma at table
sTie.tablePhase = 'COLORS_SEQUENCE';
sTie.colorsSequenceIndex = 5; // Black ball
sTie.redsRemaining = 0;
sTie.pointsRemaining = 7;

// Thoma pots black to tie the game at 50 - 50
const afterTiePot = handlePot(sTie, 'black');
assert.deepStrictEqual(afterTiePot.playerScores, [50, 50], 'Scores should now be tied 50-50');
assert.strictEqual(afterTiePot.isFrameOver, false, 'Frame must NOT be over when tied on final black');
assert.strictEqual(afterTiePot.winnerIndex, null, 'Winner must be null while tie is pending');
assert.strictEqual(afterTiePot.tablePhase, 'COLORS_SEQUENCE', 'Table must remain in colors sequence for re-spotted black');
assert.strictEqual(afterTiePot.colorsSequenceIndex, 5, 'Only Black ball must be active');
assert.strictEqual(afterTiePot.pointsRemaining, 7, 'Points remaining must be 7 for the re-spotted black');
assert(afterTiePot.lastActionDescription?.includes('Scores TIED'), 'Action description must state scores tied');

// Next shot on re-spotted black: Eldho pots Black for the win (+7) -> 57 - 50
let sShootout = handleSwitchPlayer(afterTiePot, 0); // Eldho to table
sShootout = handlePot(sShootout, 'black');
assert.deepStrictEqual(sShootout.playerScores, [57, 50]);
assert.strictEqual(sShootout.isFrameOver, true, 'Frame must be concluded after potting re-spotted black');
assert.strictEqual(sShootout.winnerIndex, 0, 'Eldho must be the winner');
assert(sShootout.lastActionDescription?.includes('Eldho'), 'Description must mention Eldho');
console.log('✓ Re-spotted black correctly activates on tie and resolves frame on subsequent pot.');

// 10. Foul Resolution on Re-spotted Black
console.log('\n[10] Verifying Foul on Re-spotted Black...');
const sTieFoul = createInitialFrameState(2, 0, ['Eldho', 'Thoma']);
sTieFoul.playerScores = [50, 50];
sTieFoul.activePlayerIndex = 1; // Thoma commits foul on re-spotted black
sTieFoul.tablePhase = 'COLORS_SEQUENCE';
sTieFoul.colorsSequenceIndex = 5;
sTieFoul.redsRemaining = 0;

const afterFoulOnTie = handleFoul(sTieFoul, 7, 'all_opponents');
assert.strictEqual(afterFoulOnTie.playerScores[0], 57, 'Eldho must receive 7 penalty points');
assert.strictEqual(afterFoulOnTie.isFrameOver, true, 'Frame must end immediately when foul breaks tie on re-spotted black');
assert.strictEqual(afterFoulOnTie.winnerIndex, 0, 'Eldho wins due to penalty points');
console.log('✓ Foul penalty on re-spotted black correctly concludes frame.');

// 11. Member Names in Action Descriptions
console.log('\n[11] Verifying Member Names in Action Descriptions...');
const sMembers = createInitialFrameState(3, 15, ['Eldho', 'Thoma', 'Raju']);
assert(sMembers.lastActionDescription?.includes('Eldho'), `Expected 'Eldho' in '${sMembers.lastActionDescription}'`);
const sPotted = handlePot(sMembers, 'red');
assert(sPotted.lastActionDescription?.includes('Eldho potted Red'), `Expected 'Eldho potted Red' in '${sPotted.lastActionDescription}'`);
const sMissed = handleMiss(sPotted);
assert(sMissed.lastActionDescription?.includes('Thoma to table'), `Expected 'Thoma to table' in '${sMissed.lastActionDescription}'`);
const sFoulToRaju = handleFoul(sMissed, 4, 2); // Thoma fouls, points to Raju (index 2)
assert.strictEqual(sFoulToRaju.playerScores[2], 4);
assert(sFoulToRaju.lastActionDescription?.includes('Raju'), `Expected 'Raju' in '${sFoulToRaju.lastActionDescription}'`);
console.log('✓ Member names accurately populate all game descriptions and foul targeting.');

console.log('\n======================================================');
console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('======================================================');
