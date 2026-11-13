import type { ReactNode } from 'react';
import { Lightbulb, ListChecks, Route } from 'lucide-react';
import { PROJECT_INTRO, type IntroBuildingId } from '../data/projectIntro.ts';

interface ProjectIntroProps {
  buildingId: IntroBuildingId;
}

function SectionTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-1.5 font-semibold">
      {icon}
      {text}
    </h3>
  );
}

export default function ProjectIntro({ buildingId }: ProjectIntroProps) {
  const data = PROJECT_INTRO[buildingId];
  if (!data) {
    return <p className="p-6 text-center text-sm text-muted-foreground">暂无介绍</p>;
  }
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      <section className="rounded-lg bg-secondary p-4 sm:p-5">
        <p className="text-base font-semibold text-secondary-foreground">{data.tagline}</p>
        <SectionTitle icon={<Lightbulb size={16} className="text-primary" aria-hidden="true" />} text="产品价值" />
        <ul className="space-y-1.5 text-sm leading-relaxed text-secondary-foreground">
          {data.value.map(v => (
            <li key={v} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="break-words">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <SectionTitle icon={<ListChecks size={16} className="text-primary" aria-hidden="true" />} text="主要功能" />
        <div className="grid gap-3 sm:grid-cols-2">
          {data.features.map(f => (
            <div key={f.title} className="rounded-md bg-card p-3">
              <p className="text-sm font-medium">{f.title}</p>
              <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <SectionTitle icon={<Route size={16} className="text-primary" aria-hidden="true" />} text="链路设计" />
        <ol className="space-y-3 sm:flex sm:gap-2 sm:space-y-0">
          {data.flow.map((s, i) => (
            <li key={s.title} className="flex gap-3 sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-2 sm:rounded-md sm:bg-card sm:p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="break-words text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
