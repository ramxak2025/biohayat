import { DirectionPage, directionMetadata, type DirectionSearch } from "@/components/product/direction-page";

export const dynamic = "force-dynamic";
export const generateMetadata = () => directionMetadata("semya");

export default function Page({ searchParams }: { searchParams: Promise<DirectionSearch> }) {
  return <DirectionPage id="semya" searchParams={searchParams} />;
}
