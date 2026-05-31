import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { AssetImage } from "../components/AssetImage";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { SITE_URL, absoluteUrl } from "../lib/seo";
import { getPublishedArticle, articleAuthor, readingMinutes } from "../data/journal";

/**
 * /journal/:slug — a single article. Real long-form prose with per-article
 * <title>, meta description, OG tags and Article + BreadcrumbList JSON-LD
 * (mirrors PaintingDetail's structured-data approach). Drafts and unknown
 * slugs render a gentle not-found that links back to the journal.
 */

export const JournalArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getPublishedArticle(slug) : undefined;

  if (!article) {
    return (
      <div className="relative min-h-screen flex flex-col">
        <AmbientBackdrop opacity={0.4} />
        <Seo title="Not found" description="This writing could not be found." url="/journal" />
        <Nav />
        <main className="relative z-10 flex-1 mx-auto w-full max-w-[680px] px-4 sm:px-6 md:px-8 lg:px-12 py-32 md:py-40">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Journal</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,5vw,52px)] leading-[1.08] text-ink m-0">
            We couldn't find that writing.
          </h1>
          <p className="font-sans font-normal text-[16px] leading-[1.75] text-ink/75 mt-6 m-0">
            It may have moved, or not be published yet.
          </p>
          <Link
            to="/journal"
            className="inline-flex items-center min-h-[44px] mt-8 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink/70 hover:text-accent transition-colors"
          >
            <span aria-hidden="true" className="mr-2">←</span>
            Back to the journal
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const author = articleAuthor(article);
  const byline = [author, article.date, `${readingMinutes(article)} min read`]
    .filter(Boolean)
    .join("  ·  ");
  const url = `${SITE_URL}/journal/${article.slug}`;
  const ogImage = article.coverImage ? absoluteUrl(article.coverImage) : undefined;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      author: { "@type": "Person", name: author },
      ...(article.isoDate ? { datePublished: article.isoDate } : {}),
      ...(ogImage ? { image: ogImage } : {}),
      publisher: { "@type": "Organization", name: "The Mandala Company" },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Journal", item: `${SITE_URL}/journal` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];

  // Place the optional pull-quote after the second paragraph (or last, if fewer).
  const quoteAfter = article.pullQuote
    ? Math.min(1, article.body.length - 1)
    : -1;

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title={article.title}
        description={article.excerpt}
        url={`/journal/${article.slug}`}
        type="article"
        image={article.coverImage}
        jsonLd={jsonLd}
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[680px] px-4 sm:px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <Reveal as="header" className="mb-10">
          <Link
            to="/journal"
            className="inline-flex items-center min-h-[44px] mb-6 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink/55 hover:text-accent transition-colors"
          >
            <span aria-hidden="true" className="mr-2">←</span>
            Journal
          </Link>
          {article.kind && <p className={cn(EYEBROW, "m-0 mb-5")}>{article.kind}</p>}
          <h1 className="font-display font-bold tracking-[-0.035em] text-[clamp(34px,5.2vw,58px)] leading-[1.06] text-ink m-0">
            {article.title}
          </h1>
          <p className={cn(EYEBROW_MUTED, "mt-8 m-0")}>{byline}</p>
        </Reveal>

        {article.coverImage && (
          <Reveal className="mb-12 -mx-1">
            <AssetImage
              src={article.coverImage}
              alt={article.title}
              className="w-full h-auto rounded-sm"
            />
          </Reveal>
        )}

        <Reveal as="article">
          {article.body.map((p, i) => (
            <Fragment key={i}>
              <p
                className={cn(
                  "font-sans font-normal text-ink/85 m-0",
                  i === 0
                    ? "text-[18px] sm:text-[19px] leading-[1.7]"
                    : "text-[16px] sm:text-[17px] leading-[1.8] mt-6",
                )}
              >
                {p}
              </p>
              {i === quoteAfter && article.pullQuote && (
                <figure className="my-10 border-l-2 border-accent/60 pl-6">
                  <blockquote className="m-0">
                    <p className="font-display italic text-[clamp(22px,3vw,30px)] leading-[1.35] text-ink m-0">
                      {article.pullQuote.text}
                    </p>
                  </blockquote>
                  {article.pullQuote.attribution && (
                    <figcaption className={cn(EYEBROW_MUTED, "mt-4")}>
                      — {article.pullQuote.attribution}
                    </figcaption>
                  )}
                </figure>
              )}
            </Fragment>
          ))}
        </Reveal>

        <Reveal className="mt-14">
          <Link
            to="/journal"
            className="inline-flex items-center min-h-[44px] font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink/70 hover:text-accent transition-colors"
          >
            <span aria-hidden="true" className="mr-2">←</span>
            More from the journal
          </Link>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
