import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const metadata = { title: "Biblioteca" };

export default function MediaPage() {
  return (
    <>
      <div className="a-page-head">
        <div>
          <p className="a-meta a-muted">Imágenes, videos y PDF</p>
          <h1 className="a-display">Biblioteca</h1>
        </div>
      </div>
      <MediaLibrary mode="manage" />
    </>
  );
}
