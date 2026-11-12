import { DirectionPage, directionMetadata, type DirectionSearch } from "@/components/product/direction-page";

export const dynamic = "force-dynamic";
export const generateMetadata = () => directionMetadata("sunna");

export default function Page({ searchParams }: { searchParams: Promise<DirectionSearch> }) {
  return <DirectionPage id="sunna" searchParams={searchParams} />;
}
