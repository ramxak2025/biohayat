import {
  CatalogHubSkeleton,
  CatalogPageSkeleton,
} from "@/components/product/product-card-skeleton";

export default function Loading() {
  // Мобайл — скелетон хаба каталога, десктоп — сетка с боковым меню.
  return (
    <>
      <div className="lg:hidden">
        <CatalogHubSkeleton />
      </div>
      <div className="max-lg:hidden">
        <CatalogPageSkeleton />
      </div>
    </>
  );
}
