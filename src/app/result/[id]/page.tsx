import { redirect } from "next/navigation";

export default function ResultPage({ params }: { params: { id: string } }) {
  redirect(`/r/${params.id}`);
}
