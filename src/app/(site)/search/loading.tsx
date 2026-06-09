import { Container } from "@/components/ui/container";
import { ProductGridSkeleton } from "@/components/product/product-card-skeleton";

export default function Loading() {
  return (
    <Container className="py-6 sm:py-8">
      <div className="animate-pulse">
        <div className="mb-4 h-8 w-40 rounded-full bg-surface-sunken sm:h-9" />
        <div className="mb-6 h-12 w-full rounded-full bg-surface-sunken" />
        <div className="mb-4 h-3.5 w-28 rounded-full bg-surface-sunken" />
      </div>
      <ProductGridSkeleton count={10} />
    </Container>
  );
}
