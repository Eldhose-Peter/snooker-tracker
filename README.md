# SnookerTrack 🎱

A modern, mobile-friendly **Snooker Game Tracker & Leaderboard** web application built for friend groups. Features a live touch scoreboard, real snooker math & points-remaining calculations, snookers-required alerts, fouls & free ball mechanics, undo stack, and persistent group rankings.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**, ready to deploy to **Vercel**.

---

## 🌟 Key Features

* **Mobile-First Live Scoreboard**: Large, touch-friendly ball buttons (1 pt Red through 7 pt Black) with 3D baize styling and active player indicators.
* **Snooker Math & Break Engine**:
  * Real-time break accumulator and potted ball sequence chips.
  * Maximum table points remaining calculation (accounting for red/color phases and strict color clearance).
  * Automatic **Snookers Required** detection (`ceil(deficit / 4)`).
* **Fouls & Tactical Penalties**:
  * Award 4–7 penalty points to opponent.
  * Free Ball nomination toggle for snookered scenarios.
  * Option to pass shot back to fouled player.
* **Unlimited Undo History**: Fully reversible snapshot state stack to instantly fix mis-taps.
* **Match & Frame Management**: Pre-game setup for Single Frame or Best of 3/5/7/9 matches with custom red counts (15, 10, or 6 reds).
* **"The Chart Board" (Leaderboard)**:
  * Global friend rankings: Matches Won/Lost, Win Rate %, Frames Won/Lost, and All-Time Highest Break.
  * Head-to-Head (H2H) direct comparison tool.
* **Dual Storage (Cloud + Offline Fallback)**:
  * Seamlessly connects to **Supabase** (PostgreSQL with RLS & views).
  * Automatically falls back to LocalStorage with pre-populated sample friend data when offline or before Supabase keys are configured.

---

## 🚀 Quick Start

### 1. Install & Run Locally

```bash
git clone <repo-url>
cd snooker-tracker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app works immediately in offline/demo mode!

---

## 🗄️ Supabase Setup (Cloud Database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, paste it into the SQL Editor, and click **Run**.
4. (Optional) Run `supabase/seed.sql` to populate sample friend matches and players.
5. In Supabase, navigate to **Project Settings** → **API** and copy:
   - `Project URL`
   - `anon public key`
6. Create `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Restart your dev server (`npm run dev`). The status indicator in the top navbar will display **Supabase (Connected)**.

---

## 🚢 Deploy to Vercel

1. Push this repository to GitHub or GitLab.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Add the two environment variables in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Your Snooker Tracker will be live in seconds!

---

## 📐 Database Schema Overview

* `players`: Friend profiles (id, name, nickname, avatar_url, created_at).
* `matches`: Match series tracking (player1_id, player2_id, best_of, status, winner_id, player1_frames, player2_frames).
* `frames`: Frame-level scores and highest breaks (match_id, frame_number, scores, winner_id, highest_break).
* `breaks`: High runs log for breaks ≥ 20 points.
* `player_leaderboard`: Real-time PostgreSQL View computing matches played, won, win rate %, frame differential, and high breaks.
