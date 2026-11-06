import type { CSSProperties, ReactNode } from 'react';
import { BarChart3, Briefcase, Gift, Home, Plus, UserSearch, Users } from 'lucide-react';

/*
 * The hero's product shot: a simple, static HR dashboard that mirrors the real
 * app (same sidebar, stat cards, pipeline and top candidates). It is drawn on
 * the hero image's 1960×1208 pixel grid; every size below is in those pixels
 * and `px()` turns it into a container-width unit so the whole thing scales.
 * The hero card shows only the top 60% (SHOT_VISIBLE in ./hero), so the
 * content is laid out to be cut cleanly there.
 */

const GRID = 1960;
const px = (n: number) => `${((n / GRID) * 100).toFixed(4)}cqw`;

const BLUE = '#2d81ff';
const INK = '#0b0d17';
const MUTED = '#6b7390';
const LINE = '#e6e9f0';

const NAV = [
  { label: 'Home', icon: Home, active: true },
  { label: 'Jobs', icon: Briefcase },
  { label: 'Candidates', icon: Users },
  { label: 'Talent Sourcing', icon: UserSearch },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Referrals', icon: Gift },
];

const STATS = [
  { label: 'Open jobs', value: '6', note: '2 new this week' },
  { label: 'Candidates', value: '148', note: '+23 this week' },
  { label: 'Interviews', value: '12', note: 'Next 7 days' },
  { label: 'Offers out', value: '3', note: '1 awaiting reply' },
];

const FUNNEL = [
  { stage: 'Applied', count: 148, color: '#2f7cfc' },
  { stage: 'Screening', count: 64, color: '#78acff' },
  { stage: 'Interview', count: 24, color: '#a3c6fe' },
  { stage: 'Offer', count: 8, color: '#bdd5fb' },
  { stage: 'Hired', count: 5, color: '#d6e4ff' },
];

const TOP = [
  { initials: 'AC', name: 'Alex Carter', role: 'Product Designer', score: 94 },
  { initials: 'RK', name: 'Riya Kapoor', role: 'Frontend Developer', score: 88 },
  { initials: 'SP', name: 'Sam Patel', role: 'Full Stack Engineer', score: 82 },
  { initials: 'NM', name: 'Nina Mehta', role: 'Growth Marketer', score: 76 },
];

const JOBS = [
  { title: 'Senior Designer', where: 'Bengaluru, On-site', applicants: 48 },
  { title: 'Frontend Engineer', where: 'Remote', applicants: 32 },
  { title: 'Growth Marketer', where: 'Remote', applicants: 18 },
];

function Card({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div
      className="absolute bg-white"
      style={{ border: `${px(2)} solid ${LINE}`, borderRadius: px(26), ...style }}
    >
      {children}
    </div>
  );
}

export function HeroDashboard() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#f6f8fc] font-sans"
      style={{ containerType: 'inline-size', color: INK }}
    >
      {/* Sidebar */}
      <aside
        className="absolute inset-y-0 left-0 bg-white"
        style={{ width: px(330), borderRight: `${px(2)} solid ${LINE}` }}
      >
        <div className="absolute flex items-center" style={{ left: px(44), top: px(48), gap: px(16) }}>
          <span
            className="flex items-center justify-center font-bold text-white"
            style={{ width: px(56), height: px(56), borderRadius: px(16), fontSize: px(36), backgroundColor: BLUE }}
          >
            Z
          </span>
          <span className="font-bold" style={{ fontSize: px(38), letterSpacing: '-0.04em', color: BLUE }}>
            Zliptal
          </span>
        </div>
        <nav className="absolute flex flex-col" style={{ left: px(28), right: px(28), top: px(176), gap: px(10) }}>
          {NAV.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className="flex items-center font-medium"
              style={{
                height: px(68),
                gap: px(18),
                paddingLeft: px(22),
                borderRadius: px(16),
                fontSize: px(27),
                color: active ? BLUE : '#4e5875',
                backgroundColor: active ? '#eaf2ff' : 'transparent',
              }}
            >
              <Icon style={{ width: px(30), height: px(30) }} strokeWidth={2} aria-hidden />
              {label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Header */}
      <div className="absolute" style={{ left: px(394), top: px(48) }}>
        <p className="font-semibold" style={{ fontSize: px(46), letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Good morning
        </p>
        <p style={{ marginTop: px(10), fontSize: px(26), color: MUTED }}>Here is your hiring at a glance.</p>
      </div>
      <div
        className="absolute flex items-center font-semibold text-white"
        style={{
          right: px(64),
          top: px(54),
          height: px(64),
          gap: px(10),
          padding: `0 ${px(28)}`,
          borderRadius: px(18),
          fontSize: px(25),
          backgroundColor: BLUE,
        }}
      >
        <Plus style={{ width: px(28), height: px(28) }} strokeWidth={2.5} aria-hidden />
        Post a job
      </div>

      {/* Stat cards */}
      {STATS.map((s, i) => (
        <Card
          key={s.label}
          style={{ left: px(394 + i * 384), top: px(170), width: px(356), height: px(170) }}
        >
          <p className="absolute" style={{ left: px(30), top: px(26), fontSize: px(24), color: MUTED }}>
            {s.label}
          </p>
          <p
            className="absolute font-semibold tabular-nums"
            style={{ left: px(30), top: px(60), fontSize: px(58), letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            {s.value}
          </p>
          <p className="absolute" style={{ left: px(30), top: px(128), fontSize: px(21), color: BLUE }}>
            {s.note}
          </p>
        </Card>
      ))}

      {/* Pipeline funnel */}
      <Card style={{ left: px(394), top: px(380), width: px(920), height: px(520) }}>
        <p className="absolute font-semibold" style={{ left: px(36), top: px(30), fontSize: px(31) }}>
          Hiring pipeline
        </p>
        {FUNNEL.map((f, i) => (
          <div
            key={f.stage}
            className="absolute flex items-center"
            style={{ left: px(36), right: px(36), top: px(106 + i * 66), height: px(44) }}
          >
            <span style={{ width: px(150), fontSize: px(24), color: '#4e5875' }}>{f.stage}</span>
            <span
              className="flex items-center justify-end font-semibold tabular-nums"
              style={{
                width: `${Math.max((f.count / 148) * 100, 6)}%`,
                maxWidth: px(640),
                height: px(44),
                borderRadius: px(12),
                paddingRight: px(16),
                fontSize: px(23),
                backgroundColor: f.color,
                color: i < 2 ? '#fff' : '#27407a',
              }}
            >
              {f.count}
            </span>
          </div>
        ))}
      </Card>

      {/* Active jobs: below the hero's cut, so only the static image (auth pages) shows it. */}
      <Card style={{ left: px(394), top: px(940), width: px(1502), height: px(400) }}>
        <p className="absolute font-semibold" style={{ left: px(36), top: px(30), fontSize: px(31) }}>
          Active jobs
        </p>
        {JOBS.map((j, i) => (
          <div
            key={j.title}
            className="absolute flex items-center"
            style={{
              left: px(36),
              right: px(36),
              top: px(104 + i * 78),
              height: px(60),
              borderTop: `${px(2)} solid ${LINE}`,
              fontSize: px(24),
            }}
          >
            <span className="font-semibold" style={{ width: px(520) }}>{j.title}</span>
            <span style={{ width: px(380), color: MUTED }}>{j.where}</span>
            <span className="tabular-nums" style={{ width: px(260), color: '#285ec8' }}>{j.applicants} applicants</span>
            <span
              className="rounded-full font-semibold"
              style={{ padding: `${px(6)} ${px(20)}`, fontSize: px(21), backgroundColor: '#e7f6ee', color: '#1f7a4d' }}
            >
              Published
            </span>
          </div>
        ))}
      </Card>

      {/* Top candidates */}
      <Card style={{ left: px(1338), top: px(380), width: px(558), height: px(520) }}>
        <p className="absolute font-semibold" style={{ left: px(34), top: px(30), fontSize: px(31) }}>
          Top candidates
        </p>
        {TOP.map((c, i) => (
          <div
            key={c.name}
            className="absolute flex items-center"
            style={{ left: px(34), right: px(34), top: px(104 + i * 96), height: px(72), gap: px(18) }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-full font-semibold"
              style={{ width: px(64), height: px(64), fontSize: px(22), backgroundColor: '#e8efff', color: '#315fc7' }}
            >
              {c.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold" style={{ fontSize: px(25), lineHeight: 1.15 }}>
                {c.name}
              </p>
              <p className="truncate" style={{ marginTop: px(4), fontSize: px(21), color: MUTED }}>
                {c.role}
              </p>
            </div>
            <span
              className="ml-auto shrink-0 rounded-full font-semibold tabular-nums"
              style={{ padding: `${px(8)} ${px(18)}`, fontSize: px(22), backgroundColor: '#edf4ff', color: '#285ec8' }}
            >
              {c.score}%
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
