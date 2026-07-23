import { Container, Section } from "@/components/ui/container";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

export default function CategoryLoading() {
  return (
    <Section>
      <Container>
        <div className="mb-6 space-y-3">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-sunken" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-sunken" />
        </div>
        <ProductGridSkeleton count={15} />
      </Container>
    </Section>
  );
}
