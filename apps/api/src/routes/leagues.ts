import { Router } from "express";
import { z } from "zod";
import { getOpenWeek, getState } from "../store";
import { badRequest, notFound } from "../lib/http-error";
import { parseOrThrow } from "../lib/validate";
import { makeId } from "../lib/ids";
import { round1 } from "../domain/scoring";
import type { League, LeagueMember } from "../domain/types";

const router = Router();

function pctVsBaseline(totalKg: number, baselineKg: number): number {
  return round1(((totalKg - baselineKg) / baselineKg) * 100);
}

/**
 * Seeded members are static (no live account behind them), but "you" are
 * live state — recompute your own streak/pctVsBaseline from the current
 * open week on every read instead of trusting the value baked in at seed
 * time, which otherwise goes stale the moment a receipt is scanned.
 */
function withLiveSelf(members: LeagueMember[]): LeagueMember[] {
  const { user, streak } = getState();
  const openWeek = getOpenWeek();
  return members.map((m) =>
    m.userId === user.id
      ? { ...m, streak: streak.current, pctVsBaseline: pctVsBaseline(openWeek.totalKg, streak.baselineKg) }
      : m,
  );
}

router.get("/leagues", (_req, res) => {
  const leagues = getState().leagues.map((l) => ({ ...l, members: withLiveSelf(l.members) }));
  res.json(leagues);
});

router.get("/leagues/:id", (req, res, next) => {
  const league = getState().leagues.find((l) => l.id === req.params.id);
  if (!league) return next(notFound(`League ${req.params.id} not found`));
  const sorted = {
    ...league,
    members: withLiveSelf(league.members).sort((a, b) => a.pctVsBaseline - b.pctVsBaseline),
  };
  res.json(sorted);
});

const createSchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(["friends", "campus", "global"]),
  })
  .strict();

router.post("/leagues", (req, res) => {
  const body = parseOrThrow(createSchema, req.body);
  const state = getState();
  const openWeek = getOpenWeek();

  const league: League = {
    id: makeId("league"),
    name: body.name,
    kind: body.kind,
    inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    members: [
      {
        userId: state.user.id,
        name: state.user.name,
        initials: state.user.initials,
        streak: state.streak.current,
        pctVsBaseline: pctVsBaseline(openWeek.totalKg, state.streak.baselineKg),
      },
    ],
  };
  state.leagues.push(league);
  res.status(201).json(league);
});

const joinSchema = z.object({ inviteCode: z.string().min(1) }).strict();

router.post("/leagues/join", (req, res, next) => {
  const body = parseOrThrow(joinSchema, req.body);
  const state = getState();
  const league = state.leagues.find((l) => l.inviteCode === body.inviteCode);
  if (!league) return next(badRequest("INVALID_CODE", "No league with that invite code"));

  const openWeek = getOpenWeek();
  if (!league.members.some((m) => m.userId === state.user.id)) {
    league.members.push({
      userId: state.user.id,
      name: state.user.name,
      initials: state.user.initials,
      streak: state.streak.current,
      pctVsBaseline: pctVsBaseline(openWeek.totalKg, state.streak.baselineKg),
    });
  }
  res.json(league);
});

export default router;
