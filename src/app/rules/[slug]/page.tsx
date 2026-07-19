import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAPTERS, chapterIndex, getChapter } from "@/lib/rules-content";
import { SectionView } from "@/components/rules/SectionView";
import { RuleQuiz } from "@/components/rules/RuleQuiz";

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  const idx = chapterIndex(slug);
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/rules"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <div className="flex-1">
          <div className="text-[11px] font-bold text-muted">
            第{chapter.no}章 / 全{CHAPTERS.length}章
          </div>
          <h1 className="text-lg font-extrabold">{chapter.title}</h1>
        </div>
      </div>

      <article className="card p-4">
        {chapter.sections.map((s, i) => (
          <SectionView key={i} section={s} />
        ))}
      </article>

      <RuleQuiz
        slug={chapter.slug}
        questions={chapter.quiz}
        nextSlug={next ? next.slug : null}
      />

      {/* 章ナビ */}
      <div className="mt-6 flex gap-2">
        {prev ? (
          <Link
            href={`/rules/${prev.slug}`}
            className="btn-pill flex-1 border border-line bg-surface py-3 text-center text-sm font-bold text-muted"
          >
            ‹ {prev.no}. {prev.title}
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next && (
          <Link
            href={`/rules/${next.slug}`}
            className="btn-pill flex-1 border border-line bg-surface py-3 text-center text-sm font-bold text-primary"
          >
            {next.no}. {next.title} ›
          </Link>
        )}
      </div>
    </div>
  );
}
