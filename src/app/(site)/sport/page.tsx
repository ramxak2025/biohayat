import { DirectionPage, directionMetadata, type DirectionSearch } from "@/components/product/direction-page";

export const dynamic = "force-dynamic";
export const generateMetadata = () => directionMetadata("sport");

export default function Page({ searchParams }: { searchParams: Promise<DirectionSearch> }) {
  return <DirectionPage id="sport" searchParams={searchParams} />;
}
