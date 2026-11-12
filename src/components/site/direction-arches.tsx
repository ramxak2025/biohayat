import { CATALOG_DIRECTIONS } from "../../../shared/catalog-directions";
import { ListLink as Link } from "@/components/ui/list-link";
import { Container } from "@/components/ui/container";
import { VysotaPhoto } from "./vysota-photo";

export function DirectionArches() {
  return (
    <section className="vysota-dark vysota-section direction-section" aria-labelledby="direction-heading">
      <Container>
        <div className="vysota-section-heading">
          <h2 id="direction-heading" className="vysota-heading">
            <span className="sm:hidden">Направления</span>
            <span className="max-sm:hidden">Четыре направления</span>
          </h2>
          <Link href="/catalog" className="vysota-button vysota-button-outline">Весь каталог</Link>
        </div>
        <div className="direction-arches">
          {CATALOG_DIRECTIONS.map((direction) => (
            <Link key={direction.id} href={direction.path} className="direction-arch" data-direction={direction.id}>
              <VysotaPhoto scene={direction.id} />
              <div className="direction-arch-label glass-dark">
                <span className="direction-dot" aria-hidden="true" />
                <span className="direction-arch-name">{direction.label}</span>
                <span className="direction-arch-summary">{direction.summary}</span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
