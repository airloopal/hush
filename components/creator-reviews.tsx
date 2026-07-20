import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DemoDataBadge } from "@/components/demo-data-badge";

const DEMO_REVIEWS = [
  { author: "J.", rating: 5, quote: "Really thoughtful replies — always felt worth the 24 hours." },
  { author: "R.", rating: 5, quote: "Great communicator, quick with live photos when I asked." },
  { author: "M.", rating: 4, quote: "Appreciated how transparent the pricing was up front." },
];

export function CreatorReviews() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Reviews</h2>
        <DemoDataBadge />
      </div>
      <div className="flex flex-col gap-2">
        {DEMO_REVIEWS.map((review) => (
          <Card key={review.author}>
            <CardContent className="flex flex-col gap-1.5 p-3.5">
              <div className="flex items-center gap-2">
                <div className="flex" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < review.rating
                          ? "h-3.5 w-3.5 fill-amber text-amber"
                          : "h-3.5 w-3.5 text-border"
                      }
                    />
                  ))}
                </div>
                <span className="sr-only">{review.rating} out of 5 stars</span>
                <span className="text-xs font-medium text-text-muted">{review.author}</span>
              </div>
              <p className="text-sm text-text-secondary">{review.quote}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
