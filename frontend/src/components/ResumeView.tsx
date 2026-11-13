import { useState, type ReactNode } from 'react';
import { Award, Briefcase, Mail, MessageCircle, Phone, User } from 'lucide-react';
import {
  RESUME_HONORS,
  RESUME_PROFILE,
  RESUME_SECTIONS,
  RESUME_SKILLS,
  type ResumeEntry,
} from '../data/resume.ts';
import CopyButton from './CopyButton.tsx';
import ResumeAsk from './ResumeAsk.tsx';

const TABS = [
  { id: 'info', label: '基本信息', Icon: User },
  { id: 'work', label: '实习经历', Icon: Briefcase },
  { id: 'ask', label: '向我提问', Icon: MessageCircle },
];

function TagGroup({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      {items.map(t => (
        <span key={t} className={`rounded-md px-2 py-0.5 text-xs ${tone}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

function EntryCard({ entry }: { entry: ResumeEntry }) {
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold">{entry.title}</h3>
        <span className="text-xs text-muted-foreground">{entry.period}</span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{entry.org}</p>
      {entry.points.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
          {entry.points.map(p => (
            <li key={p} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="break-words">{p}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <TagGroup label="业务领域" items={entry.domains} tone="bg-secondary text-secondary-foreground" />
        <TagGroup label="角色职责" items={entry.roles} tone="bg-muted text-foreground" />
      </div>
    </article>
  );
}

function ContactRow({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2 text-sm">
      <a href={href} className="flex min-w-0 items-center gap-2 text-secondary-foreground hover:underline">
        {icon}
        <span className="truncate">{value}</span>
      </a>
      <CopyButton text={value} label={label} />
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <>
      {items.map(i => (
        <span key={i} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {i}
        </span>
      ))}
    </>
  );
}

function BasicInfo() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-secondary p-4 sm:p-5">
        <h3 className="text-xl font-semibold text-secondary-foreground">{RESUME_PROFILE.name}</h3>
        <p className="mt-1 text-sm text-secondary-foreground">{RESUME_PROFILE.school}</p>
        <div className="mt-3 space-y-2">
          <ContactRow
            icon={<Phone size={14} aria-hidden="true" />}
            label="电话"
            value={RESUME_PROFILE.phone}
            href={`tel:${RESUME_PROFILE.phone}`}
          />
          <ContactRow
            icon={<Mail size={14} aria-hidden="true" />}
            label="邮箱"
            value={RESUME_PROFILE.email}
            href={`mailto:${RESUME_PROFILE.email}`}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <h3 className="mb-3 font-semibold">技能</h3>
        <dl className="space-y-2.5 text-sm">
          {RESUME_SKILLS.map(s => (
            <div key={s.group} className="flex flex-wrap items-center gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">{s.group}</dt>
              <dd className="flex flex-wrap gap-1.5">
                <Chips items={s.items} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <h3 className="mb-3 flex items-center gap-1.5 font-semibold">
          <Award size={16} className="text-primary" aria-hidden="true" />
          竞赛荣誉
        </h3>
        <ul className="space-y-1.5 text-sm">
          {RESUME_HONORS.map(h => (
            <li key={h} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {h}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function ResumeView() {
  const [tab, setTab] = useState<string>(TABS[0].id);
  const work = RESUME_SECTIONS.find(s => s.id === 'work');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div role="tablist" aria-label="档案分栏" className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" key={tab} className="mt-4 space-y-3 animate-in fade-in duration-200">
        {tab === 'info' && <BasicInfo />}
        {tab === 'work' && work?.entries.map(e => <EntryCard key={e.title + e.period} entry={e} />)}
        {tab === 'ask' && <ResumeAsk />}
      </div>
    </div>
  );
}
