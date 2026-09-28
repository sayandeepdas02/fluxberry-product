'use client';

import { Fragment, useEffect, useReducer, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import {
  ArrowUp,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gift,
  Home,
  Plus,
  Search,
  Sparkles,
  UserSearch,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_IN_OUT, EASE_OUT, POP, Stage, enter, useAfter, useVisual, type VisualState } from './stage';

/*
 * The hero's product shot: a live rebuild of the Fluxberry dashboard mockup,
 * drawn on the mockup's own 1960×1208 pixel grid. The hero card shows only
 * its top 60% (SHOT_VISIBLE in ./hero), so only that part is built, and the
 * rows, events and cards near the cut are spaced so it never slices text.
 *
 * On load the numbers count up, the funnel fills, candidates and events slide
 * in, and today's date is found. Then, while the hero is on screen, the
 * dashboard runs a quiet loop, one beat at a time: an applicant arrives and
 * the AI scores them into Top Candidates, a candidate advances a stage, an
 * interview is about to start.
 */

const BLUE = '#2d62ff';
const INK = '#0b0d17';
const SLATE = '#3b4366';
const MUTED = '#5b6380';
const LINE = '#e6e9f0';
/** Geist's cap top sits this far (in em) below the top of a line-height-1 box. */
const CAP = 0.145;
/** The entrance starts once the frame's own fade-up (0.2s delay, 1s) is well under way. */
const LEAD = 0.75;

/** Text placed by the top of its capitals, which is what the mockup was measured by. */
function Txt({
  x,
  cap,
  size,
  className,
  style,
  children,
}: {
  x: number;
  cap: number;
  size: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span
      className={cn('absolute whitespace-nowrap leading-none', className)}
      style={{ left: x, top: cap - size * CAP, fontSize: size, ...style }}
    >
      {children}
    </span>
  );
}

/** A number that counts up on entrance, then eases to each new value. */
function LiveNumber({
  v,
  value,
  delay = 0,
  duration = 1.4,
  suffix = '',
}: {
  v: VisualState;
  value: number;
  delay?: number;
  duration?: number;
  suffix?: string;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (x) => `${Math.round(x)}${suffix}`);
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) return mv.set(value);
    const controls = counted
      ? animate(mv, value, { duration: 0.45, ease: EASE_OUT })
      : animate(mv, value, { delay, duration, ease: EASE_OUT, onComplete: () => setCounted(true) });
    return () => controls.stop();
    // `counted` only switches the tempo for later changes, so it isn't a dependency.
  }, [v.started, v.reduced, value, mv, delay, duration]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

/* ------------------------------------------------------------------ data */

const F_MARK = 'M616.3 335.5H1452.5V526H853V888.9H1337.6V1075.2H853V1630.5H616.3Z';
const NAV = [
  { label: 'Home', icon: Home },
  { label: 'Jobs', icon: Briefcase },
  { label: 'Candidates', icon: Users },
  { label: 'Talent Sourcing', icon: UserSearch },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Referrals', icon: Gift },
];

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
/** Stage centres, label and value cap tops, inside the pipeline card: the labels step down with the funnel. */
const STAGE_X = [87, 232, 376, 515, 653];
const STAGE_LABEL = [100, 124, 150, 167, 167];
const STAGE_VALUE = [129, 153, 179, 197, 197];
/** Funnel trapezoids [left x, right x, left top, left bottom, right top, right bottom], traced from the mockup. */
const BARS = [
  [25, 155, 170, 316, 188, 300],
  [170, 298, 195, 295, 212, 281],
  [313, 440, 221, 278, 233, 268],
  [454, 578, 239, 265, 244, 260],
  [594, 709, 245, 258, 248, 257],
];
const BAR_COLORS = ['#2f7cfc', '#78acff', '#a3c6fe', '#bdd5fb', '#d6e4ff'];
/** A trapezoid with its corners rounded by `r`: the path is inset by r and stroked 2r wide with round joins. */
const trapezoid = ([l, r, lt, lb, rt, rb]: number[], k = 4) =>
  `M${l + k} ${lt + k} L${r - k} ${rt + k} L${r - k} ${rb - k} L${l + k} ${lb - k} Z`;

interface Candidate {
  id: string;
  role: string;
  score: number;
  scoring?: boolean;
}
const TOP: Candidate[] = [
  { id: 'AC', role: 'Product Designer', score: 94 },
  { id: 'RK', role: 'Frontend Developer', score: 88 },
  { id: 'SP', role: 'Full Stack Engineer', score: 82 },
  { id: 'NM', role: 'Growth Marketer', score: 76 },
  { id: 'TS', role: 'Product Manager', score: 71 },
];
/** New applicants, in the order they arrive. Scores land them in the visible rows (ranks 2, 3, 1, 3). */
const APPLICANTS = [
  { id: 'PS', name: 'Priya S.', role: 'Frontend Developer', score: 91 },
  { id: 'DK', name: 'Daniel K.', role: 'Product Designer', score: 89 },
  { id: 'MR', name: 'Maya R.', role: 'Full Stack Engineer', score: 96 },
  { id: 'JL', name: 'Jonas L.', role: 'Growth Marketer', score: 92 },
];
type Applicant = (typeof APPLICANTS)[number];
/** Row pitch in Top Candidates. Four rows fit above the hero's cut; the fifth starts right at it. */
const ROW = 70;

const DAYS = [
  ['Mon', 13, 48],
  ['Tue', 14, 123],
  ['Wed', 15, 200],
  ['Thu', 16, 278],
  ['Fri', 17, 355],
] as const;
const EVENTS = [
  {
    time: '9:00 - 9:45 AM',
    title: 'Interview - Frontend Developer',
    detail: 'Round 1 - Video Call',
    people: ['AC', 'RK', 'SP'],
    more: '+2',
    where: 'On Zoom',
    accent: '#2e7eef',
  },
  {
    time: '11:00 - 11:45 AM',
    title: 'Interview - Product Designer',
    detail: 'Technical Round',
    people: ['NM', 'TS', 'AC'],
    more: '+1',
    where: 'Google Meet',
    accent: '#a869ee',
  },
  // Only this card's top edge shows above the cut: a hint that the day continues.
  {
    time: '2:00 - 2:30 PM',
    title: 'Hiring sync',
    detail: 'Design Team',
    people: ['RK', 'SP', 'NM'],
    more: '',
    where: 'Team Meeting',
    accent: '#ed6d52',
  },
];
const EVENT = { top: 242, height: 150, gap: 14 };

/* ------------------------------------------------------------ live state */

interface Live {
  total: number;
  weekly: number;
  funnel: number[];
  top: Candidate[];
  toast: Applicant | null;
  rings: number;
  move: { n: number; from: number } | null;
  soon: boolean;
}

type Action =
  | { type: 'arrive'; applicant: Applicant }
  | { type: 'applied' }
  | { type: 'insert'; applicant: Applicant; fresh: boolean }
  | { type: 'scored'; id: string }
  | { type: 'toast-off' }
  | { type: 'move'; from: number }
  | { type: 'advanced'; to: number }
  | { type: 'soon'; on: boolean };

const INITIAL: Live = { total: 214, weekly: 23, funnel: [214, 142, 48, 12, 3], top: TOP, toast: null, rings: 0, move: null, soon: false };

function reduce(s: Live, a: Action): Live {
  switch (a.type) {
    case 'arrive':
      return { ...s, toast: a.applicant, rings: s.rings + 1 };
    case 'applied':
      return { ...s, total: s.total + 1, weekly: s.weekly + 1, funnel: s.funnel.map((n, i) => (i === 0 ? n + 1 : n)) };
    case 'insert': {
      // Each run through the applicants starts from the original list, so every arrival lands in view.
      const base = (a.fresh ? TOP : s.top).filter((c) => c.id !== a.applicant.id);
      const row: Candidate = { id: a.applicant.id, role: a.applicant.role, score: a.applicant.score, scoring: true };
      const top = [...base, row].sort((x, y) => y.score - x.score).slice(0, 6);
      return { ...s, top };
    }
    case 'scored':
      return { ...s, top: s.top.map((c) => (c.id === a.id ? { ...c, scoring: false } : c)) };
    case 'toast-off':
      return { ...s, toast: null };
    case 'move':
      return { ...s, move: { n: (s.move?.n ?? 0) + 1, from: a.from } };
    case 'advanced':
      return { ...s, funnel: s.funnel.map((n, i) => (i === a.to ? n + 1 : n)) };
    case 'soon':
      return { ...s, soon: a.on };
  }
}

/** One beat every BEAT_MS: applicant, advance, applicant, interview, and round again. */
const BEAT_MS = 4600;
const SCRIPT = ['applicant', 'advance', 'applicant', 'interview'] as const;

function useLiveDashboard(v: VisualState) {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const ready = useAfter(v, LEAD + 2.4);
  const running = v.looping && ready;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setTick((t) => t + 1), tick === 0 ? 600 : BEAT_MS);
    return () => clearTimeout(id);
  }, [running, tick]);

  useEffect(() => {
    if (tick === 0) return;
    const n = tick - 1;
    const later = (ms: number, action: Action) => setTimeout(() => dispatch(action), ms);
    let timers: ReturnType<typeof setTimeout>[] = [];
    const kind = SCRIPT[n % SCRIPT.length];
    if (kind === 'applicant') {
      const k = n / 2;
      const applicant = APPLICANTS[k % APPLICANTS.length];
      dispatch({ type: 'arrive', applicant });
      timers = [
        later(450, { type: 'applied' }),
        later(900, { type: 'insert', applicant, fresh: k > 0 && k % APPLICANTS.length === 0 }),
        later(2100, { type: 'scored', id: applicant.id }),
        later(3200, { type: 'toast-off' }),
      ];
    } else if (kind === 'advance') {
      // Alternate: applied → screening, then screening → interview.
      const from = Math.floor(n / 4) % 2;
      dispatch({ type: 'move', from });
      timers = [later(1000, { type: 'advanced', to: from + 1 })];
    } else {
      dispatch({ type: 'soon', on: true });
      timers = [later(3400, { type: 'soon', on: false })];
    }
    return () => timers.forEach(clearTimeout);
  }, [tick]);

  return state;
}

/* ------------------------------------------------------------- component */

export function HeroDashboard() {
  const v = useVisual({ onMount: true });
  const live = useLiveDashboard(v);

  return (
    <Stage visual={v} width={1960} height={1208}>
      <div className="relative size-full bg-[#fcfcfd] font-sans" style={{ color: INK }}>
        <Sidebar />
        <Header v={v} live={live} />
        <Kpis v={v} live={live} />
        <Pipeline v={v} live={live} />
        <TopCandidates v={v} live={live} />
        <Schedule v={v} live={live} />
      </div>
    </Stage>
  );
}

function Sidebar() {
  return (
    <div className="absolute inset-y-0 left-0 w-[337px] border-r border-[#eceef2]">
      <svg className="absolute left-[34px] top-[32px]" width={25} height={38} viewBox="616 335 837 1296" aria-hidden>
        <path d={F_MARK} fill={BLUE} />
      </svg>
      <Txt x={85} cap={38} size={34} className="font-bold tracking-[-0.03em]" style={{ color: BLUE }}>
        Fluxberry
      </Txt>

      <span
        className="absolute left-[28px] top-[109px] flex size-[42px] items-center justify-center rounded-[10px] bg-[#e8eefc] text-[20px] font-semibold"
        style={{ color: BLUE }}
      >
        M
      </span>
      <div className="absolute left-[82px] top-[94px] h-[72px] w-[224px] rounded-[12px] border-[1.5px] border-[#e3e6ee] bg-white">
        <Txt x={11} cap={14} size={21} className="font-semibold">
          Maxeo
        </Txt>
        <Txt x={11} cap={43} size={17} style={{ color: MUTED }}>
          Hiring Workspace
        </Txt>
        <ChevronDown className="absolute right-[14px] top-[24px] size-[20px]" style={{ color: MUTED }} strokeWidth={2.25} />
      </div>

      <span className="absolute left-[20px] top-[189px] h-[54px] w-[295px] rounded-[12px] bg-[#eff3ff]" />
      {NAV.map(({ label, icon: Icon }, i) => {
        const cy = 216 + i * 60;
        const color = i === 0 ? BLUE : SLATE;
        return (
          <Fragment key={label}>
            <Icon className="absolute left-[37px] size-[24px]" style={{ top: cy - 12, color: i === 0 ? BLUE : MUTED }} strokeWidth={2} />
            <Txt x={87} cap={cy - 7} size={21} className="font-medium" style={{ color }}>
              {label}
            </Txt>
          </Fragment>
        );
      })}
    </div>
  );
}

function Header({ v, live }: { v: VisualState; live: Live }) {
  return (
    <>
      <Txt x={372} cap={37} size={44} className="font-bold tracking-[-0.03em]">
        Welcome to Fluxberry
      </Txt>
      <Txt x={372} cap={92} size={21} style={{ color: '#46507c' }}>
        Your AI-native hiring platform to attract, evaluate and hire top talent.
      </Txt>

      <div className="absolute left-[1190px] top-[22px] flex h-[62px] w-[434px] items-center gap-[14px] rounded-[14px] border-[1.5px] border-[#e3e6ee] bg-white pl-[20px] pr-[12px]">
        <Search className="size-[24px] shrink-0" style={{ color: MUTED }} strokeWidth={2} />
        <span className="flex-1 whitespace-nowrap text-[19px] text-[#6b7390]">Search jobs, candidates, or notes...</span>
        <span className="rounded-[8px] bg-[#eef0f5] px-[10px] py-[7px] text-[16px] font-semibold leading-none text-[#2a3050]">⌘K</span>
      </div>

      {/* The bell shakes when an applicant arrives. */}
      <motion.div
        key={live.rings}
        className="absolute left-[1661px] top-[33px] size-[36px] origin-top"
        initial={{ rotate: 0 }}
        animate={live.rings > 0 ? { rotate: [0, -16, 14, -10, 6, 0] } : { rotate: 0 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <Bell className="size-full" style={{ color: SLATE }} strokeWidth={1.9} />
      </motion.div>
      <motion.span
        className="absolute left-[1683px] top-[31px] size-[14px] rounded-full border-[2.5px] border-white bg-[#fb2421]"
        {...enter(v, { scale: 0 }, { scale: 1 }, { ...POP, delay: LEAD + 1.2 })}
      />

      <div
        className="absolute left-[1730px] top-[21px] flex h-[63px] w-[203px] items-center justify-center gap-[10px] rounded-[14px] text-[22px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(45,98,255,0.6)]"
        style={{ backgroundColor: BLUE }}
      >
        <Plus className="size-[24px]" strokeWidth={2.25} />
        Create job
      </div>

      {/* New-applicant toast, dropping from under the bell. */}
      <AnimatePresence>
        {live.toast ? (
          <motion.div
            key={live.toast.id + live.rings}
            className="absolute left-[1268px] top-[92px] z-10 flex h-[66px] w-[430px] items-center gap-[12px] whitespace-nowrap rounded-[16px] border-[1.5px] bg-white px-[14px] shadow-[0_18px_40px_-14px_rgba(15,23,42,0.28)]"
            style={{ borderColor: LINE }}
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#e8eefc] text-[15px] font-semibold" style={{ color: BLUE }}>
              {live.toast.id}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[6px] leading-none">
              <span className="text-[17px] font-semibold">{live.toast.name} applied</span>
              <span className="text-[15px]" style={{ color: MUTED }}>
                {live.toast.role} · just now
              </span>
            </span>
            <span className="flex items-center gap-[6px] rounded-full bg-[#eef3ff] px-[10px] py-[6px] text-[14px] font-medium leading-none" style={{ color: BLUE }}>
              <Sparkles className="size-[14px]" strokeWidth={2.25} />
              Scoring
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** KPI card width, where its text column starts, and the padding kept clear on its right. */
const KPI_WIDTH = 274;
const KPI_TEXT = 92;
const KPI_PAD = 18;

function Kpis({ v, live }: { v: VisualState; live: Live }) {
  const cards = [
    { label: 'Active Jobs', icon: Briefcase, value: 8, delta: '2', sub: '3 new this month' },
    { label: 'Total Candidates', icon: Users, value: live.total, delta: '12%', sub: `+${live.weekly} this week` },
    { label: 'Interviews', icon: CalendarDays, value: 18, delta: '6%', sub: '10 this week' },
    { label: 'Hired', icon: null, value: 3, delta: '200%', sub: 'vs last month' },
  ];
  return (
    <>
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="absolute top-[148px] h-[183px] rounded-[16px] border-[1.5px] bg-gradient-to-b from-[#f6f8fd] to-[#fbfcfe]"
            style={{ left: 365 + i * 293.5, width: KPI_WIDTH, borderColor: LINE }}
          >
            <span className="absolute left-[18px] top-[22px] flex size-[56px] items-center justify-center rounded-full bg-[#e8ecf8]" style={{ color: BLUE }}>
              {Icon ? (
                <Icon className="size-[26px]" strokeWidth={2} />
              ) : (
                <span className="flex size-[26px] items-center justify-center rounded-[7px]" style={{ backgroundColor: BLUE }}>
                  <Check className="size-[18px] text-white" strokeWidth={3} />
                </span>
              )}
            </span>
            <Txt x={KPI_TEXT} cap={36} size={19} className="font-semibold" style={{ color: '#21233a' }}>
              {card.label}
            </Txt>
            {/* Value and change share a row that stops KPI_PAD short of the card's right edge. */}
            <div
              className="absolute top-[75px] flex h-[40px] items-center gap-[12px]"
              style={{ left: KPI_TEXT, maxWidth: KPI_WIDTH - KPI_TEXT - KPI_PAD }}
            >
              <span className="text-[38px] font-bold leading-none tracking-[-0.03em]">
                <LiveNumber v={v} value={card.value} delay={LEAD + i * 0.08} />
              </span>
              <motion.span
                className="flex shrink-0 items-center gap-[4px] rounded-full bg-[#e6f6ee] py-[6px] pl-[8px] pr-[10px] text-[16px] font-semibold leading-none"
                style={{ color: '#0e8a5c' }}
                {...enter(v, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, { ...POP, delay: LEAD + 0.9 + i * 0.06 })}
              >
                <ArrowUp className="size-[15px]" strokeWidth={2.75} />
                {card.delta}
              </motion.span>
            </div>
            <Txt x={KPI_TEXT} cap={135} size={18} style={{ color: '#414a70' }}>
              {card.sub}
            </Txt>
          </div>
        );
      })}
    </>
  );
}

function Pipeline({ v, live }: { v: VisualState; live: Live }) {
  // The funnel fills left to right, like flow through a pipe: one clip sweeping across all five bars.
  const sweep = useMotionValue(0);
  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) return sweep.set(1);
    const controls = animate(sweep, 1, { delay: LEAD + 0.25, duration: 1.3, ease: EASE_IN_OUT });
    return () => controls.stop();
  }, [v.started, v.reduced, sweep]);
  const clipWidth = useTransform(sweep, [0, 1], [0, 700]);
  const applied = live.funnel[0];

  return (
    <div className="absolute left-[362px] top-[358px] h-[397px] w-[721px] rounded-[16px] border-[1.5px] bg-white" style={{ borderColor: LINE }}>
      <BarChart3 className="absolute left-[22px] top-[25px] size-[27px]" style={{ color: BLUE }} strokeWidth={2.25} />
      <Txt x={73} cap={29} size={24} className="font-bold tracking-[-0.01em]">
        Hiring Pipeline
      </Txt>
      {[
        { label: 'All jobs', x: 418, w: 118 },
        { label: 'Last 30 days', x: 550, w: 158 },
      ].map((f) => (
        <span
          key={f.label}
          className="absolute top-[19px] flex h-[42px] items-center justify-between rounded-[10px] border-[1.5px] bg-white pl-[16px] pr-[14px] text-[18px] text-[#2a3050]"
          style={{ left: f.x, width: f.w, borderColor: '#e3e6ee' }}
        >
          {f.label}
          <ChevronDown className="size-[17px]" strokeWidth={2.25} />
        </span>
      ))}

      <svg className="absolute inset-0 overflow-visible" width={721} height={397} viewBox="0 0 721 397" aria-hidden>
        <defs>
          <clipPath id="hero-funnel-clip">
            <motion.rect x={20} y={150} height={180} width={clipWidth} />
          </clipPath>
        </defs>
        <g clipPath="url(#hero-funnel-clip)">
          {BARS.map((bar, i) => (
            <path key={i} d={trapezoid(bar)} fill={BAR_COLORS[i]} stroke={BAR_COLORS[i]} strokeWidth={8} strokeLinejoin="round" />
          ))}
        </g>
      </svg>

      {STAGES.map((stage, i) => {
        const delay = LEAD + 0.3 + i * 0.2;
        return (
          <motion.div key={stage} {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay, duration: 0.5, ease: EASE_OUT })}>
            <Txt x={STAGE_X[i]} cap={STAGE_LABEL[i]} size={18} className="-translate-x-1/2" style={{ color: SLATE }}>
              {stage}
            </Txt>
            <Txt x={STAGE_X[i]} cap={STAGE_VALUE[i]} size={31} className="-translate-x-1/2 font-bold tracking-[-0.02em]">
              <LiveNumber v={v} value={live.funnel[i]} delay={delay} />
            </Txt>
            <Txt x={STAGE_X[i]} cap={341} size={19} className="-translate-x-1/2" style={{ color: '#3f4870' }}>
              <LiveNumber v={v} value={Math.round((live.funnel[i] / applied) * 100)} delay={delay} suffix="%" />
            </Txt>
          </motion.div>
        );
      })}

      {/* A candidate advancing: a glowing dot travels from one stage's bar to the next. */}
      {live.move ? (
        <motion.span
          key={live.move.n}
          className="absolute left-0 top-0 size-[16px] rounded-full border-[3px] border-white shadow-[0_0_0_6px_rgba(45,98,255,0.18),0_4px_12px_rgba(45,98,255,0.5)]"
          style={{ backgroundColor: BLUE }}
          initial={{ x: STAGE_X[live.move.from] - 8, y: 235, opacity: 0, scale: 0.5 }}
          animate={{
            x: [STAGE_X[live.move.from] - 8, STAGE_X[live.move.from + 1] - 8],
            y: [235, 237],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
          }}
          transition={{ duration: 1.1, ease: EASE_IN_OUT, times: [0, 0.15, 0.85, 1], opacity: { times: [0, 0.15, 0.85, 1], duration: 1.1 } }}
        />
      ) : null}
    </div>
  );
}

function TopCandidates({ v, live }: { v: VisualState; live: Live }) {
  // Rows that mount after the entrance (applicants, or a list reset) come in straight away.
  const settled = useAfter(v, LEAD + 1.5);
  return (
    <div className="absolute left-[1105px] top-[358px] h-[440px] w-[415px] rounded-[16px] border-[1.5px] bg-white" style={{ borderColor: LINE }}>
      <Sparkles className="absolute left-[20px] top-[25px] size-[27px]" style={{ color: BLUE }} strokeWidth={2} />
      <Txt x={68} cap={29} size={24} className="font-bold tracking-[-0.01em]">
        Top Candidates
      </Txt>
      <Txt x={322} cap={33} size={19} className="font-medium" style={{ color: BLUE }}>
        View all
      </Txt>

      <AnimatePresence>
        {live.top.map((c, rank) => (
          <CandidateRow key={c.id} v={v} candidate={c} rank={rank} settled={settled} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function CandidateRow({ v, candidate, rank, settled }: { v: VisualState; candidate: Candidate; rank: number; settled: boolean }) {
  const y = rank * ROW;
  const fresh = candidate.scoring !== undefined;
  const delay = settled ? 0 : LEAD + 0.3 + rank * 0.07;
  // After the entrance, a row's score (a new applicant's, once scored) counts up quickly.
  const late = settled || fresh;
  return (
    <motion.div
      className="group absolute inset-x-[4px] top-[77px] h-[70px] rounded-[12px]"
      initial={v.reduced ? false : fresh ? { opacity: 0, x: -16, y } : { opacity: 0, x: -10, y }}
      animate={{ opacity: v.started ? 1 : 0, x: 0, y }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{
        y: { type: 'spring', visualDuration: 0.55, bounce: 0.15 },
        x: { type: 'spring', stiffness: 300, damping: 30, delay },
        opacity: { duration: 0.4, delay },
      }}
    >
      {/* A newly scored row glows briefly. */}
      <motion.span
        className="absolute inset-0 rounded-[12px] bg-[#f1f5ff]"
        initial={{ opacity: fresh ? 1 : 0 }}
        animate={{ opacity: candidate.scoring ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <span className="absolute inset-0 rounded-[12px] transition-colors duration-200 group-hover:bg-[#f6f8fd]" />
      <span className="absolute left-[14px] top-[11px] flex size-[48px] items-center justify-center rounded-full bg-[#e9edf8] text-[18px] font-semibold">
        {candidate.id}
      </span>
      <Txt x={83} cap={29.5} size={17} style={{ color: SLATE }}>
        {candidate.role}
      </Txt>
      <span className="absolute left-[253px] top-[17px] flex h-[36px] w-[64px] items-center justify-center overflow-hidden rounded-full bg-[#e3edfd] text-[18px] font-semibold text-[#2c64cc]">
        <AnimatePresence initial={false} mode="popLayout">
          {candidate.scoring ? (
            <motion.span
              key="scoring"
              className="absolute inset-0 flex items-center justify-center"
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
            >
              <motion.span
                className="absolute inset-y-0 w-[60%] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                initial={{ x: '-120%' }}
                animate={{ x: '180%' }}
                transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity }}
              />
              <Sparkles className="relative size-[18px]" strokeWidth={2.25} />
            </motion.span>
          ) : (
            <motion.span
              key="score"
              initial={fresh ? { opacity: 0, scale: 0.7 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={POP}
            >
              <LiveNumber
                v={v}
                value={candidate.score}
                delay={late ? 0 : LEAD + 0.4 + rank * 0.07}
                duration={late ? 0.6 : 1.4}
                suffix="%"
              />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span
        className="absolute left-[335px] top-[16px] flex h-[38px] w-[64px] items-center justify-center rounded-[10px] border-[1.5px] bg-white text-[18px] font-medium transition-colors duration-200 group-hover:bg-[#f3f6ff]"
        style={{ borderColor: '#dfe4ee', color: BLUE }}
      >
        View
      </span>
    </motion.div>
  );
}

function Schedule({ v, live }: { v: VisualState; live: Live }) {
  // Today is found: the date pill glides over from Monday once the page loads.
  const found = useAfter(v, LEAD + 0.45);
  return (
    <div className="absolute left-[1542px] top-[148px] h-[720px] w-[397px] rounded-[16px] border-[1.5px] bg-white" style={{ borderColor: LINE }}>
      <CalendarDays className="absolute left-[19px] top-[23px] size-[27px]" style={{ color: BLUE }} strokeWidth={2} />
      <Txt x={66} cap={29} size={24} className="font-bold tracking-[-0.01em]">
        Schedule
      </Txt>
      <Txt x={311} cap={32} size={19} className="font-medium" style={{ color: BLUE }}>
        See all
      </Txt>

      <div className="absolute left-[19px] top-[74px] flex h-[47px] w-[359px] items-center justify-between rounded-[12px] border-[1.5px] border-[#e6e8ef] bg-[#f5f6f9] px-[14px] text-[#1b1d29]">
        <ChevronLeft className="size-[20px]" strokeWidth={2.5} />
        <span className="text-[20px] font-medium text-[#2e3257]">October 2025</span>
        <ChevronRight className="size-[20px]" strokeWidth={2.5} />
      </div>

      <motion.span
        className="absolute left-[166px] top-[137px] h-[83px] w-[70px] rounded-[14px] shadow-[0_10px_20px_-10px_rgba(45,98,255,0.7)]"
        style={{ backgroundColor: BLUE }}
        initial={v.reduced ? false : { x: DAYS[0][2] - DAYS[2][2], opacity: 0 }}
        animate={v.started ? { x: 0, opacity: 1 } : { x: DAYS[0][2] - DAYS[2][2], opacity: 0 }}
        transition={{ x: { type: 'spring', visualDuration: 0.7, bounce: 0.2, delay: LEAD + 0.45 }, opacity: { duration: 0.3, delay: LEAD + 0.3 } }}
      />
      {DAYS.map(([day, date, x]) => {
        const today = day === 'Wed';
        return (
          <motion.div
            key={day}
            initial={false}
            animate={{ color: today && found ? '#ffffff' : '#0b0d17' }}
            transition={{ duration: 0.25, delay: today ? 0.35 : 0 }}
          >
            <Txt x={x} cap={154} size={17} className="-translate-x-1/2" style={{ opacity: today && found ? 1 : 0.8 }}>
              {day}
            </Txt>
            <Txt x={x} cap={183} size={24} className="-translate-x-1/2 font-semibold">
              {date}
            </Txt>
          </motion.div>
        );
      })}

      {EVENTS.map((e, i) => (
        <motion.div
          key={e.time}
          className="absolute left-[19px] w-[359px] overflow-hidden rounded-[12px] bg-[#f7f8fa]"
          style={{ top: EVENT.top + i * (EVENT.height + EVENT.gap), height: EVENT.height }}
          {...enter(v, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.55 + i * 0.1, duration: 0.6, ease: EASE_OUT })}
        >
          <span className="absolute inset-y-0 left-0 w-[4px]" style={{ backgroundColor: e.accent }} />
          <Txt x={26} cap={13} size={19} style={{ color: '#4a5178' }}>
            {e.time}
          </Txt>
          <Txt x={26} cap={40} size={20} className="font-semibold">
            {e.title}
          </Txt>
          <Txt x={26} cap={66} size={19} style={{ color: '#48508a' }}>
            {e.detail}
          </Txt>
          <div className="absolute left-[24px] top-[96px] flex items-center gap-[4px]">
            {e.people.map((p) => (
              <span key={p} className="flex size-[36px] items-center justify-center rounded-full border-2 border-[#f7f8fa] bg-[#e9edf6] text-[15px] font-semibold">
                {p}
              </span>
            ))}
            {e.more ? (
              <span className="flex size-[36px] items-center justify-center text-[16px]" style={{ color: MUTED }}>
                {e.more}
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              'absolute right-[14px] top-[96px] flex h-[36px] items-center rounded-full px-[16px] text-[17px] leading-none',
              i === 2 ? 'bg-[#eceef3] text-[#3b4366]' : 'bg-[#dfeaf8] text-[#2c64cc]',
            )}
          >
            {e.where}
          </span>

          {/* The next interview flags that it's about to start. */}
          {i === 0 ? (
            <AnimatePresence>
              {live.soon ? (
                <motion.span
                  className="absolute right-[14px] top-[10px] flex items-center gap-[8px] rounded-full bg-[#e7f7ef] px-[12px] py-[7px] text-[15px] font-medium leading-none text-[#0f7a52]"
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  <span className="relative size-[8px]">
                    <motion.span
                      className="absolute inset-0 rounded-full bg-[#10a673]"
                      animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
                      transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity }}
                    />
                    <span className="absolute inset-0 rounded-full bg-[#10a673]" />
                  </span>
                  Starts in 5 min
                </motion.span>
              ) : null}
            </AnimatePresence>
          ) : null}
          {i === 0 ? (
            <motion.span
              className="absolute inset-y-0 left-0 w-[4px]"
              style={{ backgroundColor: e.accent, boxShadow: `0 0 12px 2px ${e.accent}` }}
              initial={false}
              animate={{ opacity: live.soon ? [0.4, 1, 0.4] : 0 }}
              transition={live.soon ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
            />
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
