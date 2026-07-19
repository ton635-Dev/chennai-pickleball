"use client";

import { useState } from "react";
import Link from "next/link";
import { markChapter } from "@/lib/rules-progress";
import type { QuizQuestion } from "@/lib/rules-content";

interface Props {
  slug: string;
  questions: QuizQuestion[];
  nextSlug: string | null;
}

export function RuleQuiz({ slug, questions, nextSlug }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    questions.map(() => null)
  );
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === questions[i].answer).length;
  const perfect = score === questions.length;

  const submit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    markChapter(slug, perfect);
  };

  const retry = () => {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  };

  return (
    <div className="mt-6">
      <h2 className="mb-1 text-[17px] font-extrabold">理解度クイズ</h2>
      <p className="mb-3 text-xs text-muted">
        全{questions.length}問。全問正解でバッジがもらえます。
      </p>

      <div className="space-y-3">
        {questions.map((qq, qi) => {
          const chosen = answers[qi];
          return (
            <div key={qi} className="card p-4">
              <div className="mb-2.5 text-[15px] font-bold">
                Q{qi + 1}. {qq.q}
              </div>
              <div className="space-y-2">
                {qq.choices.map((c, ci) => {
                  const isChosen = chosen === ci;
                  const isCorrect = ci === qq.answer;
                  let cls =
                    "w-full rounded-xl border-2 px-3.5 py-2.5 text-left text-[14px] font-bold transition ";
                  if (submitted) {
                    if (isCorrect)
                      cls += "border-primary bg-[#E2F3EE] text-primary-dark";
                    else if (isChosen)
                      cls += "border-red-400 bg-red-50 text-red-600";
                    else cls += "border-line bg-surface text-muted";
                  } else {
                    cls += isChosen
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-surface text-ink";
                  }
                  return (
                    <button
                      key={ci}
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((a) =>
                          a.map((v, i) => (i === qi ? ci : v))
                        )
                      }
                      className={cls}
                    >
                      {c}
                      {submitted && isCorrect && " ✓"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!allAnswered}
          className="btn-pill mt-4 w-full bg-primary py-3.5 text-[15px] text-white disabled:opacity-50"
        >
          {allAnswered ? "採点する" : "すべて回答してください"}
        </button>
      ) : (
        <div className="mt-4 rounded-card border border-line bg-surface p-5 text-center">
          {perfect ? (
            <>
              <div className="text-3xl">🏅</div>
              <div className="mt-1 text-lg font-extrabold text-primary-dark">
                全問正解! バッジ獲得
              </div>
            </>
          ) : (
            <div className="text-lg font-extrabold">
              {questions.length}問中 {score}問 正解
            </div>
          )}
          <p className="mt-1 text-sm text-muted">
            {perfect ? "この章はマスターしました。" : "もう一度挑戦して満点を目指しましょう。"}
          </p>
          <div className="mt-4 flex gap-2">
            {!perfect && (
              <button
                onClick={retry}
                className="btn-pill flex-1 border-2 border-line bg-surface py-3 text-sm font-bold"
              >
                もう一度
              </button>
            )}
            {nextSlug ? (
              <Link
                href={`/rules/${nextSlug}`}
                className="btn-pill flex-1 bg-primary py-3 text-center text-sm font-bold text-white"
              >
                次の章へ
              </Link>
            ) : (
              <Link
                href="/rules"
                className="btn-pill flex-1 bg-primary py-3 text-center text-sm font-bold text-white"
              >
                一覧に戻る
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
