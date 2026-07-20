import { Engage } from "@/components/metronic/engage";
import { Faq } from "@/components/metronic/faq";
import { PAGE_GUIDES, type PageGuideId } from "@/lib/page-guides";
import { media, toAbsoluteUrl } from "@/lib/media";

/** FAQ + 2 cartes Engage — bas de page technique (pattern e-reporting / Metronic). */
export function PageGuide({ page }: { page: PageGuideId }) {
  const guide = PAGE_GUIDES[page];
  const engages = guide.engages;

  return (
    <div className="space-y-5">
      <Faq items={guide.faq} />
      {engages ? (
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-7">
          <EngageCard {...engages[0]} />
          <EngageCard {...engages[1]} />
        </div>
      ) : null}
    </div>
  );
}

function EngageCard({
  title,
  description,
  moreTitle,
  moreUrl,
  illustration,
}: {
  title: string;
  description: string;
  moreTitle: string;
  moreUrl: string;
  illustration: number;
}) {
  return (
    <Engage
      title={title}
      description={description}
      image={
        <>
          <img
            src={toAbsoluteUrl(media.illustration(illustration))}
            className="max-h-[130px] dark:hidden"
            alt=""
          />
          <img
            src={toAbsoluteUrl(media.illustration(illustration, true))}
            className="hidden max-h-[130px] dark:block"
            alt=""
          />
        </>
      }
      more={{ title: moreTitle, url: moreUrl }}
    />
  );
}
