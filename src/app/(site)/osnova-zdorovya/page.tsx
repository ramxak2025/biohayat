import { DirectionPage, directionMetadata, type DirectionSearch } from "@/components/product/direction-page";

export const dynamic = "force-dynamic";
export const generateMetadata = () => directionMetadata("osnova");

export default function Page({ searchParams }: { searchParams: Promise<DirectionSearch> }) {
  return <DirectionPage id="osnova" searchParams={searchParams} />;
}
