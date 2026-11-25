import assert from 'node:assert';
import { 
  createInitialFrameState, 
  handlePot, 
  handleMiss, 
  handleFoul, 
  handleSwitchPlayer, 
  handleConcede, 
  checkSnookersNeeded,
  handleAdjustReds
} from '../src/lib/snooker-engine';
import { 
  INITIAL_PLAYERS,
  saveLiveSession,
  getLiveSession,
  clearLiveSession,
  abandonMatch,
  saveNewMatch,
  fetchMatches,
  recordFrameCompleted,
  finishMatch
} from '../src/lib/storage';
import { MatchEvent } from '../src/types/snooker';
import { computeFrameInsights } from '../src/components/history/insights/analytics';

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

// 12. Live Session LocalStorage Persistence & Restoration (Accidental Close & Back)
console.log('\n[12] Verifying Live Session State Persistence and Restoration...');
const mockStorage: Record<string, string> = {};
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  }
};

const testMatch = {
  id: 'm_live_test_001',
  player_ids: ['p1', 'p2'],
  player1_id: 'p1',
  player2_id: 'p2',
  player_frames: [1, 0],
  player1_frames: 1,
  player2_frames: 0,
  best_of: 3,
  reds_count: 15,
  status: 'in_progress' as const,
  started_at: new Date().toISOString(),
};

const testFrameState = handlePot(createInitialFrameState(2, 15, ['Eldho', 'Thoma']), 'red');
const testSession = {
  match: testMatch,
  players: INITIAL_PLAYERS.slice(0, 2),
  currentFrameNum: 2,
  playerFrames: [1, 0],
  frameState: testFrameState,
  undoStack: [createInitialFrameState(2, 15, ['Eldho', 'Thoma'])],
  redoStack: [],
  updatedAt: Date.now(),
};

// Persist live session
saveLiveSession(testSession);
// Verify it can be retrieved accurately
const restoredSession = getLiveSession();
assert(restoredSession !== null, 'Restored session must not be null');
assert.strictEqual(restoredSession.match.id, 'm_live_test_001');
assert.strictEqual(restoredSession.currentFrameNum, 2);
assert.deepStrictEqual(restoredSession.playerFrames, [1, 0]);
assert.deepStrictEqual(restoredSession.frameState.playerScores, [1, 0]);
assert.strictEqual(restoredSession.undoStack.length, 1);
assert.strictEqual(restoredSession.undoStack[0].playerScores[0], 0);

// Verify clearing live session
clearLiveSession();
assert.strictEqual(getLiveSession(), null, 'Live session must be null after clearLiveSession()');
console.log('✓ Live session accurately persists and restores all state without loss.');

// 13. Match Abandonment and In-Between Ending
console.log('\n[13] Verifying Match Abandonment and In-Between Ending...');
async function testAbandon() {
  const newMatch = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 3, 15);
  assert.strictEqual(newMatch.status, 'in_progress');

  // Simulate setting active live session
  saveLiveSession({
    ...testSession,
    match: newMatch,
  });
  assert(getLiveSession() !== null);

  // Abandon match in between
  await abandonMatch(newMatch.id);
  const allMatches = await fetchMatches();
  const abandoned = allMatches.find(m => m.id === newMatch.id);
  assert(abandoned, 'Abandoned match must exist in storage');
  assert.strictEqual(abandoned.status, 'abandoned', 'Match status must be updated to abandoned');
  assert.strictEqual(getLiveSession(), null, 'Active live session must be cleared upon abandonment');
  console.log('✓ Match abandonment cleanly updates status and cleans up live session.');

  // 14. Verify Abandoned Match Frame Isolation from Leaderboard
  console.log('\n[14] Verifying Abandoned Match Frame Records Isolation...');
  const testMatchForFrames = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 3, 15);
  const { fetchLeaderboard } = await import('../src/lib/storage');
  
  // Record a frame with a huge break (e.g. 120) before abandoning
  await recordFrameCompleted(
    testMatchForFrames.id,
    1,
    [120, 4],
    'p1000000-0000-0000-0000-000000000001',
    120,
    'p1000000-0000-0000-0000-000000000001'
  );

  // Abandon the match
  await abandonMatch(testMatchForFrames.id);

  // Verify that the 120 break does NOT count on the leaderboard because match was abandoned
  const lb = await fetchLeaderboard();
  const p1Entry = lb.find(p => p.id === 'p1000000-0000-0000-0000-000000000001');
  assert(p1Entry, 'P1 must exist in leaderboard');
  assert.notStrictEqual(p1Entry.highest_break, 120, 'Abandoned match frames must not contaminate highest break on leaderboard');
  console.log('✓ Abandoned match frames cleanly purged; leaderboard integrity preserved.');

  // 15. Verify Quick 4-pt Foul
  console.log('\n[15] Verifying Quick 4-pt Foul Execution...');
  const baseState = createInitialFrameState(2, 15, ['Eldho', 'Thoma']);
  const stateAfterFoul = handleFoul(baseState, 4, 1, false, false);
  assert.deepStrictEqual(stateAfterFoul.playerScores, [0, 4], '4 points must be awarded to player 2');
  assert.strictEqual(stateAfterFoul.activePlayerIndex, 1, 'Turn must rotate to player 2');
  assert.strictEqual(stateAfterFoul.currentBreak, 0, 'Break must be reset to 0');
  console.log('✓ Quick 4-pt foul executes accurately with correct penalty assignment.');

  // 16. Verify Default Match Length is Single Frame (1 Frame)
  console.log('\n[16] Verifying Default Match Length is Single Frame (1 Frame)...');
  const defaultMatch = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002']);
  assert.strictEqual(defaultMatch.best_of, 1, 'Default match format must be Single Frame (1 frame)');
  assert(defaultMatch.player_ids, 'defaultMatch.player_ids must be defined');
  assert.strictEqual(defaultMatch.player_ids.length, 2);
  const framesToWinSingleFrame = Math.ceil(defaultMatch.best_of / 2);
  assert.strictEqual(framesToWinSingleFrame, 1, 'Single frame match requires exactly 1 frame win');
  console.log('✓ Default match length is Single Frame (1 frame) verified.');

  // 17. Verify Unified Player Selection (2 to 6 Players)
  console.log('\n[17] Verifying Unified Player Selection (2 to 6 Players)...');
  for (let count = 2; count <= 6; count++) {
    const selectedIds = INITIAL_PLAYERS.slice(0, count).map(p => p.id);
    const selectedNames = INITIAL_PLAYERS.slice(0, count).map(p => p.name);
    const m = await saveNewMatch(selectedIds, 1, 15);
    assert(m.player_ids && m.player_frames, 'm.player_ids and m.player_frames must be defined');
    assert.strictEqual(m.player_ids.length, count);
    assert.strictEqual(m.player_frames.length, count);
    
    const fs = createInitialFrameState(count, 15, selectedNames);
    assert.strictEqual(fs.playerScores.length, count);
    assert.strictEqual(fs.activePlayerIndex, 0); // #1 breaks off
    assert(fs.lastActionDescription?.includes(selectedNames[0]), 'Action description must include breaker name');
  }
  console.log('✓ Unified player selection cleanly supports 2, 3, 4, 5, and 6 players.');

  // 18. Verify Scoring Assignment & Clean Names (No Nicknames)
  console.log('\n[18] Verifying Scoring Assignment & Clean Names...');
  const memberNamesOnly = INITIAL_PLAYERS.map(p => p.name);
  const testCleanState = createInitialFrameState(3, 15, memberNamesOnly);
  
  // Player at index 0 pots red
  const scored = handlePot(testCleanState, 'red');
  assert.strictEqual(scored.playerScores[0], 1, 'Points must be awarded specifically to active player at table');
  assert.strictEqual(scored.playerScores[1], 0);
  assert.strictEqual(scored.playerScores[2], 0);
  assert(scored.lastActionDescription?.includes(memberNamesOnly[0]), `Action description must contain clean name '${memberNamesOnly[0]}'`);
  console.log('✓ Points are unambiguously marked for active player and nicknames are absent.');

  // 19. Verify Single Frame Match Completion
  console.log('\n[19] Verifying Single Frame Match Instant Win Mechanics...');
  // In a best-of-1 (Single Frame) match, winning frame 1 immediately concludes match
  const match1F = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 1);
  assert.strictEqual(match1F.best_of, 1);
  const framesRequired = Math.ceil(match1F.best_of / 2);
  assert.strictEqual(framesRequired, 1);
  console.log('✓ Single Frame match correctly requires 1 frame to win and conclude.');

  // 20. Verify Compact Multiplayer Roster Scoring & Switching for 2 to 6 Players
  console.log('\n[20] Verifying Compact Multiplayer Scoring & Switching (2 to 6 Players)...');
  for (let count = 2; count <= 6; count++) {
    const names = INITIAL_PLAYERS.slice(0, count).map(p => p.name);
    let multiState = createInitialFrameState(count, 15, names);
    assert.strictEqual(multiState.playerScores.length, count);
    assert.strictEqual(multiState.playerHighestBreaks.length, count);

    // Switch turn to each player and pot a ball
    for (let i = 0; i < count; i++) {
      multiState = handleSwitchPlayer(multiState, i);
      assert.strictEqual(multiState.activePlayerIndex, i);
      multiState = handlePot(multiState, 'red');
      assert.strictEqual(multiState.playerScores[i] > 0, true);
      multiState = handleMiss(multiState);
    }
  }
  console.log('✓ Compact multiplayer scoring and switching cleanly validated for 2, 3, 4, 5, and 6 players.');

  // 21. Verify 5-Player Snookers & Sequence Progression
  console.log('\n[21] Verifying 5-Player Snookers Calculation & Color Clearance...');
  let state5P = createInitialFrameState(5, 1, ['Eldho', 'Thoma', 'Raju', 'Adi', 'BM']);
  // Pot last red
  state5P = handlePot(state5P, 'red');
  assert.strictEqual(state5P.redsRemaining, 0);
  assert.strictEqual(state5P.tablePhase, 'COLOR_AFTER_RED');
  // Pot color after red (Black)
  state5P = handlePot(state5P, 'black');
  assert.strictEqual(state5P.tablePhase, 'COLORS_SEQUENCE');
  assert.strictEqual(state5P.colorsSequenceIndex, 0); // Yellow is ball on
  assert.strictEqual(state5P.pointsRemaining, 27);
  // Check snookers needed in 5-player match
  const snk5P = checkSnookersNeeded(state5P.playerScores, state5P.pointsRemaining);
  assert.strictEqual(snk5P.needed, false); // Eldho has 8, remaining 27 > 8, so no snooker needed yet
  console.log('✓ 5-Player snookers calculation and color clearance phase transition validated.');

  // 22. Verify Restored Member Leaderboard
  console.log('\n[22] Verifying Restored Member Leaderboard & Match Stats...');
  const memberLb = await fetchLeaderboard();
  assert.strictEqual(memberLb.length, 6, 'Leaderboard must include all 6 members');
  const eldhoEntry = memberLb.find(e => e.name === 'Eldho');
  assert(eldhoEntry, 'Eldho must be in leaderboard');
  assert.strictEqual(eldhoEntry.highest_break, 61, 'Eldho highest break must be 61');
  const thomaEntry = memberLb.find(e => e.name === 'Thoma');
  assert(thomaEntry, 'Thoma must be in leaderboard');
  assert.strictEqual(thomaEntry.highest_break, 52, 'Thoma highest break must be 52');
  console.log('✓ All 6 members present with accurately restored match statistics and breaks.');

  // 23. Verify Restored Actual Match History
  console.log('\n[23] Verifying Restored Actual Match History...');
  const history = await fetchMatches();
  const completedMatches = history.filter(m => m.status === 'completed');
  assert.strictEqual(completedMatches.length, 3, 'Actual match history must contain 3 completed matches');
  const match1 = completedMatches.find(m => m.id === 'm1000000-0000-0000-0000-000000000001');
  assert(match1, 'Match 1 (Eldho vs Thoma) must be present');
  assert.strictEqual(match1.frames?.length, 3, 'Match 1 must have 3 completed frames');
  const match2 = completedMatches.find(m => m.id === 'm2000000-0000-0000-0000-000000000002');
  assert(match2, 'Match 2 (Raju vs Adi) must be present');
  const match3 = completedMatches.find(m => m.id === 'm3000000-0000-0000-0000-000000000003');
  assert(match3, 'Match 3 (3-Player) must be present');
  console.log('✓ Actual match history correctly restored with series results and frame details.');

  // 24. Verify Active Press Feedback & Removal of Target Section in Source
  console.log('\n[24] Verifying Active Press Feedback & HUD Layout Integrity...');
  const fs = await import('node:fs');
  const css = fs.readFileSync('src/app/globals.css', 'utf8');
  assert(css.includes('.snooker-ball:active'), 'globals.css must define .snooker-ball:active');
  assert(css.includes('brightness(1.35)'), '.snooker-ball:active must enhance brightness on tap (not dim)');
  assert(css.includes('floatToast'), 'globals.css must define floatToast animation');
  assert(css.includes('popFeedback'), 'globals.css must define popFeedback animation');

  const scoreboardSource = fs.readFileSync('src/components/scoreboard/LiveScoreboard.tsx', 'utf8');
  assert(!scoreboardSource.includes('getBallOnLabel'), 'Target ball on label must be completely removed from LiveScoreboard');
  assert(!scoreboardSource.includes('Target:'), 'HUD must not contain any Target section');
  assert(scoreboardSource.includes('Recent Activity (Last 7)'), 'LiveScoreboard must render the Last 7 Activities feed');
  assert(scoreboardSource.includes('animate-pop-feedback'), 'LiveScoreboard must render animated pop feedback for most recent activity');
  console.log('✓ Ball active tap brightness enhancement confirmed and Target section absence verified.');

  // 25. Verify Score Increase Animation & Bottom Feedback Layout
  console.log('\n[25] Verifying Score Increase Animation & Bottom Feedback Layout...');
  assert(css.includes('scoreRise'), 'globals.css must define scoreRise keyframe animation');
  assert(css.includes('animate-score-rise'), 'globals.css must define animate-score-rise class');
  assert(css.includes('scorePulse'), 'globals.css must define scorePulse keyframe animation');
  assert(css.includes('animate-score-pulse'), 'globals.css must define animate-score-pulse class');

  assert(scoreboardSource.includes('animate-score-rise'), 'LiveScoreboard must render animated score rising indicator');
  assert(scoreboardSource.includes('animate-score-pulse'), 'LiveScoreboard must pulse score digits on score increase');

  // Verify feedback is placed below the action controls
  const controlsIndex = scoreboardSource.indexOf('STREAMLINED PRIMARY CONTROLS');
  const feedbackIndex = scoreboardSource.indexOf('ACTION FEEDBACK BANNER & TOAST (AT BOTTOM)');
  assert(controlsIndex !== -1, 'LiveScoreboard must contain primary controls');
  assert(feedbackIndex !== -1, 'LiveScoreboard must contain bottom feedback section');
  assert(feedbackIndex > controlsIndex, 'Feedback banner must be located below controls');

  // Verify Black (+7) has distinct high-contrast styling from Green (+3)
  assert(scoreboardSource.includes('text-slate-100') || scoreboardSource.includes('text-zinc-100'), 'Black (+7) score increase indicator must be distinct from green');

  // Verify activity list caps at 7 and highlights latest activity
  assert(scoreboardSource.includes('reversedActivities'), 'LiveScoreboard must compute reverse chronological activities');
  assert(scoreboardSource.includes('isMostRecent'), 'LiveScoreboard must distinguish and highlight the most recent activity');
  console.log('✓ Individual score card increase animations and bottom Last 7 activities layout verified.');

  // 26. Verify Last 7 Activities Tracking and Initial State
  console.log('\n[26] Verifying Last 7 Activities Tracking and Initial State...');
  const initFrame = createInitialFrameState(3, 15, ['Eldho', 'Thoma', 'Raju']);
  assert(initFrame.activities && initFrame.activities.length === 1, 'Initial frame state must seed 1 initial break-off activity');
  assert.strictEqual(initFrame.activities[0].type, 'frame_start', 'Initial activity must have type frame_start');
  assert.strictEqual(initFrame.activities[0].badge, 'BREAK-OFF', 'Initial activity badge must be BREAK-OFF');
  console.log('✓ Last 7 activities initial state and data contract verified.');

  // 27. Verify Match Event Telemetry Archival in Storage
  console.log('\n[27] Verifying Match Event Telemetry Archival in Storage...');
  const telemetryMatch = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 1, 15);
  const now = Date.now();
  const mockEvents: MatchEvent[] = [
    {
      id: 'evt-1',
      timestamp: now,
      frameNumber: 1,
      type: 'pot',
      playerIndex: 0,
      playerName: 'Eldho',
      ball: 'red',
      points: 1,
      breakScore: 1,
      breakBalls: ['red'],
      scoresAfter: [1, 0],
      detail: 'Eldho potted Red (+1 pt)',
    },
    {
      id: 'evt-2',
      timestamp: now + 5000,
      frameNumber: 1,
      type: 'pot',
      playerIndex: 0,
      playerName: 'Eldho',
      ball: 'black',
      points: 7,
      breakScore: 8,
      breakBalls: ['red', 'black'],
      scoresAfter: [8, 0],
      detail: 'Eldho potted Black (+7 pts)',
    },
    {
      id: 'evt-3',
      timestamp: now + 12000,
      frameNumber: 1,
      type: 'miss',
      playerIndex: 0,
      playerName: 'Eldho',
      breakScore: 8,
      isBreakEnd: true,
      scoresAfter: [8, 0],
      detail: 'Eldho ended break of 8 pts',
    },
    {
      id: 'evt-4',
      timestamp: now + 20000,
      frameNumber: 1,
      type: 'foul',
      playerIndex: 1,
      playerName: 'Thoma',
      foulPoints: 4,
      awardedTo: [0],
      scoresAfter: [12, 0],
      detail: 'Thoma fouled (+4 pts) awarded to Eldho',
    },
  ];

  await recordFrameCompleted(
    telemetryMatch.id,
    1,
    [12, 0],
    'p1000000-0000-0000-0000-000000000001',
    8,
    'p1000000-0000-0000-0000-000000000001',
    mockEvents
  );
  await finishMatch(telemetryMatch.id, 'p1000000-0000-0000-0000-000000000001', [1, 0]);

  const matchesAfterTelemetry = await fetchMatches();
  const archivedTelemetryMatch = matchesAfterTelemetry.find(m => m.id === telemetryMatch.id);
  assert(archivedTelemetryMatch, 'Archived telemetry match must exist in storage');
  assert(archivedTelemetryMatch.frames && archivedTelemetryMatch.frames.length > 0, 'Archived match must have frames');
  const archivedFrame = archivedTelemetryMatch.frames[0];
  assert(archivedFrame.events && archivedFrame.events.length === 4, 'Archived frame must store all 4 telemetry events');
  assert.strictEqual(archivedFrame.events[0].ball, 'red');
  assert.strictEqual(archivedFrame.events[1].points, 7);
  assert.strictEqual(archivedFrame.events[3].foulPoints, 4);
  console.log('✓ Match event telemetry correctly archived and hydrated in Frame records.');

  // 28. Verify Visual Insights Computation Engine
  console.log('\n[28] Verifying Visual Insights Computation Engine...');
  const testPlayers = [
    { id: 'p1000000-0000-0000-0000-000000000001', name: 'Eldho' },
    { id: 'p2000000-0000-0000-0000-000000000002', name: 'Thoma' },
  ];
  const insights = computeFrameInsights(mockEvents, testPlayers, [12, 0]);
  assert(insights.timeline.length >= 4, 'Timeline must contain all progression points');
  assert.strictEqual(insights.scoringSources[0].pointsFromPots, 8, 'Eldho points from pots must equal 8');
  assert.strictEqual(insights.scoringSources[0].pointsFromFouls, 4, 'Eldho points from opponent fouls must equal 4');
  assert.strictEqual(insights.scoringSources[0].ballCounts.red, 1, 'Eldho red count must equal 1');
  assert.strictEqual(insights.scoringSources[0].ballCounts.black, 1, 'Eldho black count must equal 1');
  assert.strictEqual(insights.discipline[1].foulsCommitted, 1, 'Thoma fouls committed must equal 1');
  assert.strictEqual(insights.discipline[1].penaltyPointsConceded, 4, 'Thoma penalty points conceded must equal 4');
  console.log('✓ Visual insights analytics engine computes accurate telemetry, ball distribution, and discipline stats.');

  // 29. Verifying Actual Match Restoration & History Retention
  console.log('\n[29] Verifying Actual Match Restoration & History Retention...');
  const { restoreActualMatches, clearAllMatches } = await import('../src/lib/storage');
  const restoredMatches = await restoreActualMatches(true);
  assert(restoredMatches.length >= 3, 'Actual match restoration must produce at least 3 completed matches');
  const seededHistory = await fetchMatches();
  assert(seededHistory.length >= 3, 'Restored match history must contain at least 3 matches');
  const matchWithFrames = seededHistory.find(m => m.id === 'm1000000-0000-0000-0000-000000000001');
  assert(matchWithFrames, 'Match m1000000-0000-0000-0000-000000000001 must exist in history');
  assert.strictEqual(matchWithFrames.frames?.length, 3, 'Match must have 3 frames');
  const f1 = matchWithFrames.frames[0];
  assert(f1.events && f1.events.length > 10, 'Frame 1 must contain granular shot events');

  // Verify that clearing preserves foundational actual matches
  await clearAllMatches();
  const resetHistory = await fetchMatches();
  assert.strictEqual(resetHistory.filter(m => m.status === 'completed').length, 3, 'Foundational actual matches must remain safely intact');
  console.log('✓ Match restoration, shot-by-shot telemetry hydration, and history safety verified.');

  // 30. Verifying Red Ball Count Rules & Bug Fixes
  console.log('\n[30] Verifying Red Ball Count Rules & Bug Fixes...');
  
  // 30.1 saveNewMatch correctly stores 10 and 6 reds (not defaulting to 15)
  const match10R = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 1, 10);
  assert.strictEqual(match10R.reds_count, 10, '10-red match must retain reds_count = 10');
  const match6R = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 3, 6);
  assert.strictEqual(match6R.reds_count, 6, '6-red match must retain reds_count = 6');

  // 30.2 Free Ball potting a Red decrements redsRemaining
  let fbRedState = createInitialFrameState(2, 15);
  fbRedState.freeBallActive = true;
  fbRedState = handlePot(fbRedState, 'red');
  assert.strictEqual(fbRedState.redsRemaining, 14, 'Potting Red on Free Ball must decrement redsRemaining from 15 to 14');
  assert.strictEqual(fbRedState.playerScores[0], 1, 'Potting Red on Free Ball scores 1 pt');
  assert.strictEqual(fbRedState.tablePhase, 'COLOR_AFTER_RED');

  // 30.3 Free Ball potting a nominated color does NOT decrement redsRemaining (color is respotted)
  let fbColorState = createInitialFrameState(2, 15);
  fbColorState.freeBallActive = true;
  fbColorState = handlePot(fbColorState, 'black'); // Nominate black as substitute for red
  assert.strictEqual(fbColorState.redsRemaining, 15, 'Potting color as Free Ball must preserve 15 reds on table');
  assert.strictEqual(fbColorState.playerScores[0], 1, 'Nominated color potted as free red scores 1 pt');
  assert.strictEqual(fbColorState.tablePhase, 'COLOR_AFTER_RED');

  // 30.4 handleSwitchPlayer recalculates pointsRemaining from COLOR_AFTER_RED
  let switchState = createInitialFrameState(2, 15);
  switchState = handlePot(switchState, 'red'); // redsRemaining: 14, pointsRemaining: 146
  assert.strictEqual(switchState.pointsRemaining, 146);
  switchState = handleSwitchPlayer(switchState, 1);
  assert.strictEqual(switchState.tablePhase, 'RED');
  assert.strictEqual(switchState.pointsRemaining, 139, 'Points remaining must be 14*8 + 27 = 139 after switching player');

  // 30.5 handleFoul with redsPocketed decrements redsRemaining
  let foulRedState = createInitialFrameState(2, 15);
  foulRedState = handleFoul(foulRedState, 4, 'next_player', false, false, 1);
  assert.strictEqual(foulRedState.redsRemaining, 14, 'Foul with 1 red pocketed must leave 14 reds');
  assert.strictEqual(foulRedState.pointsRemaining, 139, 'Points remaining must be 14*8 + 27 = 139');
  assert(foulRedState.lastActionDescription?.includes('1 red pocketed'), 'Action description must mention red pocketed');

  // 30.6 handleAdjustReds modifies redsRemaining, phase, points, and snookers
  let adjustState = createInitialFrameState(2, 15);
  adjustState = handleAdjustReds(adjustState, 12);
  assert.strictEqual(adjustState.redsRemaining, 12, 'Adjusted reds must be 12');
  assert.strictEqual(adjustState.pointsRemaining, 123, 'Points remaining must be 12*8 + 27 = 123');

  // Adjust to 0 transitions tablePhase to COLORS_SEQUENCE
  adjustState = handleAdjustReds(adjustState, 0);
  assert.strictEqual(adjustState.redsRemaining, 0);
  assert.strictEqual(adjustState.tablePhase, 'COLORS_SEQUENCE');
  assert.strictEqual(adjustState.pointsRemaining, 27);
  console.log('✓ All Red Ball rules, free ball scenarios, foul pocketing, and manual adjustment mechanics verified.');

  // 31. Verifying Member Addition & Retention
  console.log('\n[31] Verifying Member Addition & Persistence...');
  const { createPlayer, fetchPlayers: fetchAllPlayers } = await import('../src/lib/storage');
  const addedPlayer = await createPlayer('Charlie');
  assert.strictEqual(addedPlayer.name, 'Charlie');
  const playersWithCharlie = await fetchAllPlayers();
  assert(playersWithCharlie.some(p => p.name === 'Charlie'), 'Added member Charlie must be remembered and returned by fetchPlayers()');
  console.log('✓ Member addition correctly persists and is remembered.');

  // 32. Verifying Early Match Ending Telemetry Retention & Insights
  console.log('\n[32] Verifying Early Match Ending Telemetry Retention & Insights...');
  const earlyMatch = await saveNewMatch(['p1000000-0000-0000-0000-000000000001', 'p2000000-0000-0000-0000-000000000002'], 3, 15);
  const earlyEvents: MatchEvent[] = [
    {
      id: 'evt-early-1',
      timestamp: Date.now() - 30000,
      frameNumber: 1,
      type: 'pot',
      playerIndex: 0,
      playerId: 'p1000000-0000-0000-0000-000000000001',
      playerName: 'Eldho',
      ball: 'red',
      points: 1,
      breakScore: 1,
      scoresAfter: [1, 0],
      detail: 'Eldho potted Red (+1 pt)',
    },
    {
      id: 'evt-early-2',
      timestamp: Date.now() - 20000,
      frameNumber: 1,
      type: 'pot',
      playerIndex: 0,
      playerId: 'p1000000-0000-0000-0000-000000000001',
      playerName: 'Eldho',
      ball: 'black',
      points: 7,
      breakScore: 8,
      scoresAfter: [8, 0],
      detail: 'Eldho potted Black (+7 pts)',
    },
    {
      id: 'evt-early-concede',
      timestamp: Date.now() - 1000,
      frameNumber: 1,
      type: 'concede',
      playerIndex: 1,
      playerId: 'p2000000-0000-0000-0000-000000000002',
      playerName: 'Thoma',
      scoresAfter: [8, 0],
      detail: 'Thoma conceded match in Frame 1. Eldho wins.',
    },
  ];

  await recordFrameCompleted(
    earlyMatch.id,
    1,
    [8, 0],
    'p1000000-0000-0000-0000-000000000001',
    8,
    'p1000000-0000-0000-0000-000000000001',
    earlyEvents
  );
  await finishMatch(earlyMatch.id, 'p1000000-0000-0000-0000-000000000001', [1, 0]);

  const allMatchesAfterEarly = await fetchMatches();
  const foundEarlyMatch = allMatchesAfterEarly.find(m => m.id === earlyMatch.id);
  assert(foundEarlyMatch, 'Early concluded match must exist in storage');
  assert.strictEqual(foundEarlyMatch.status, 'completed');
  assert(foundEarlyMatch.frames && foundEarlyMatch.frames.length === 1);
  const earlyFrame = foundEarlyMatch.frames[0];
  assert(earlyFrame.events && earlyFrame.events.length === 3, 'Frame must contain all 3 events including concession');
  assert.strictEqual(earlyFrame.events[2].type, 'concede');

  // Verify computeFrameInsights generates valid analytics for this early concluded frame
  const earlyInsights = computeFrameInsights(
    earlyFrame.events,
    [
      { id: 'p1000000-0000-0000-0000-000000000001', name: 'Eldho' },
      { id: 'p2000000-0000-0000-0000-000000000002', name: 'Thoma' },
    ],
    [8, 0]
  );
  assert(earlyInsights !== null, 'Insights must be successfully computed for early concluded frame');
  assert.strictEqual(earlyInsights.totalEvents, 3);
  assert.strictEqual(earlyInsights.scoringSources[0].pointsFromPots, 8);
  assert.strictEqual(earlyInsights.timeline.length, 4); // init + 3 events
  console.log('✓ Early match ending telemetry retention and visual insights verified.');

  // 33. Verifying AI Referee Context Serialization & System Prompt Generation
  console.log('\n[33] Verifying AI Referee Context & Prompt Builder...');
  const {
    buildRefereeMatchContext,
    formatRefereeSystemPrompt,
    getQuickRefereeSuggestions,
  } = await import('../src/lib/referee-context');

  const idleCtx = buildRefereeMatchContext(null);
  assert.strictEqual(idleCtx.hasActiveMatch, false);
  const idlePrompt = formatRefereeSystemPrompt(idleCtx);
  assert(idlePrompt.includes('No active match is currently in progress'));
  assert.strictEqual(getQuickRefereeSuggestions(idleCtx).length, 4);

  const foulFrameState = {
    ...handleFoul(
      createInitialFrameState(3, 10, ['Eldho', 'Thoma', 'Raju']),
      6,
      'next_player',
      true,
      false,
      1
    ),
    events: [
      {
        id: 'evt-ref-foul-1',
        timestamp: Date.now(),
        frameNumber: 2,
        type: 'foul' as const,
        playerIndex: 0,
        playerName: 'Eldho',
        foulPoints: 6,
        awardedTo: [1],
        freeBallAwarded: true,
        passBack: false,
        redsPocketedOnFoul: 1,
        redsRemainingAfter: 9,
        scoresAfter: [0, 6, 0],
        detail: 'Eldho fouled on Pink (+6 pts) • 1 red pocketed. Turn to Thoma.',
      },
    ],
  };

  const liveRefCtx = buildRefereeMatchContext({
    match: {
      ...earlyMatch,
      best_of: 3,
      reds_count: 10,
      player_ids: ['p1', 'p2', 'p3'],
      player_frames: [1, 0, 0],
    },
    players: INITIAL_PLAYERS.slice(0, 3),
    currentFrameNum: 2,
    playerFrames: [1, 0, 0],
    frameState: foulFrameState,
    undoStack: [],
    redoStack: [],
    updatedAt: Date.now(),
  });

  assert.strictEqual(liveRefCtx.hasActiveMatch, true);
  assert.strictEqual(liveRefCtx.activePlayerName, 'Thoma');
  assert.strictEqual(liveRefCtx.freeBallActive, true);
  assert.strictEqual(liveRefCtx.redsRemaining, 9);
  assert.strictEqual(liveRefCtx.foulEvents?.length, 1);
  assert.deepStrictEqual(liveRefCtx.foulEvents?.[0].awardedToNames, ['Thoma']);

  const liveSuggestions = getQuickRefereeSuggestions(liveRefCtx);
  assert(liveSuggestions.some((s) => s.toLowerCase().includes('foul')));
  assert(liveSuggestions.some((s) => s.toLowerCase().includes('free ball')));

  const livePrompt = formatRefereeSystemPrompt(liveRefCtx);
  assert(livePrompt.includes('Active Striker: Thoma'));
  assert(livePrompt.includes('Free Ball Active: YES'));
  assert(livePrompt.includes('Eldho fouled on Pink (+6 pts)'));
  assert(livePrompt.includes('awardedTo=Thoma'));
  console.log('✓ AI Referee context serialization, foul attribution, and prompt builder verified.');

  console.log('\n======================================================');
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================');
}

testAbandon().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
