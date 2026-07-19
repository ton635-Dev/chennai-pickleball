import type { Section } from "@/lib/rules-content";
import { Diagram } from "./diagrams";

export function SectionView({ section }: { section: Section }) {
  switch (section.type) {
    case "h":
      return <h2 className="mt-5 text-[17px] font-extrabold">{section.text}</h2>;
    case "p":
      return (
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{section.text}</p>
      );
    case "list":
      return (
        <ul className="mt-2 space-y-1.5">
          {section.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div
          className={`mt-3 rounded-xl border-l-4 p-3 text-[14px] leading-relaxed ${
            section.tone === "warn"
              ? "border-amber bg-[#FBF0DC] text-[#7a5410]"
              : "border-primary bg-[#E2F3EE] text-primary-dark"
          }`}
        >
          {section.text}
        </div>
      );
    case "diagram":
      return (
        <figure className="mt-4 overflow-hidden rounded-xl border border-line bg-surface p-2">
          <Diagram kind={section.kind} />
          {section.caption && (
            <figcaption className="px-1 pb-1 pt-2 text-center text-xs text-muted">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}
