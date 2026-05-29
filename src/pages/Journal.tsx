import { Link } from "react-router-dom";
import { IntroFilmHeader } from "../components/IntroFilmHeader";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { SITE_URL } from "../lib/seo";
import {
  publishedArticles,
  readingMinutes,
  articleAuthor,
  type JournalArticle,
} from "../data/journal";

/**
 * /journal — the writings archive index. A magazine-style list of articles
 * (Steve's writings + the estate's notes), each linking to /journal/:slug.
 *
 * This page exists as much for search engines as for readers: it's real,
 * indexable prose, plus a Blog JSON-LD block listing the articles. Register
 * matches the quieter routed pages (About / Contact / Memories).
 */

const ArticleRow = ({ article }: { article: JournalArticle }) => {
  const meta = [article.kind, article.date, `${readingMinutes(article)} min read`]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <article className="py-9 first:pt-2 border-b border-ink/12 last:border-0">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>{meta}</p>
      <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(24px,3.2vw,34px)] leading-[1.12] text-ink m-0">
        <Link to={`/journal/${article.slug}`} className="transition-colors hover:text-accent">
          {article.title}
        </Link>
      </h2>
      <p className="font-sans font-normal text-[15.5px] sm:text-[16px] leading-[1.7] text-ink/70 mt-4 m-0 max-w-[620px]">
        {article.excerpt}
      </p>
      <Link
        to={`/journal/${article.slug}`}
        className="inline-flex items-center min-h-[44px] mt-4 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink/70 hover:text-accent transition-colors"
      >
        Read this
        <span aria-hidden="true" className="ml-2">→</span>
      </Link>
    </article>
  );
};

export const Journal = () => {
  const articles = publishedArticles();

  // Blog JSON-LD — gives search engines a structured list of the writings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The Art of Stephen Meakin — Journal",
    description:
      "Writings from the archive of Stephen Meakin (SEM, 1966–2021) — on sacred geometry, the four traditions, and the practice of the mandala.",
    url: `${SITE_URL}/journal`,
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      description: a.excerpt,
      author: { "@type": "Person", name: articleAuthor(a) },
      ...(a.isoDate ? { datePublished: a.isoDate } : {}),
      url: `${SITE_URL}/journal/${a.slug}`,
    })),
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Journal"
        description="Writings from the archive of Stephen Meakin — on sacred geometry, the four traditions of his work, and the practice of the mandala."
        url="/journal"
        jsonLd={jsonLd}
      />
      <IntroFilmHeader />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[760px] px-4 sm:px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <Reveal as="header" className="mb-10">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Journal</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            Writings from the archive.
          </h1>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-7 m-0 max-w-[620px]">
            Steve thought on paper as much as he painted on it. These are pieces
            from his notebooks and interviews, alongside the estate's own notes
            on the work — gathered slowly, and added to as we go.
          </p>
          <Separator className="bg-ink/15 mt-10" />
        </Reveal>

        {articles.length > 0 ? (
          <Reveal as="section">
            {articles.map((article) => (
              <ArticleRow key={article.slug} article={article} />
            ))}
          </Reveal>
        ) : (
          <Reveal as="section" className="py-6">
            <p className="font-display italic text-[20px] sm:text-[22px] leading-[1.5] text-ink/70 m-0 max-w-[560px]">
              The archive is being gathered. Steve's writings will appear here
              soon.
            </p>
          </Reveal>
        )}
      </main>
      <Footer />
    </div>
  );
};
