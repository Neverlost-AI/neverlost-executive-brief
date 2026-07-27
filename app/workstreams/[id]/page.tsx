import { ExecutiveBriefApp } from "@/components/ExecutiveBriefApp";
export default async function WorkstreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExecutiveBriefApp view="workstream-detail" workstreamId={id} />;
}
