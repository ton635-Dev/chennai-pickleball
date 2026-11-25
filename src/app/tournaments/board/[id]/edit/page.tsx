import { notFound } from "next/navigation";
import { getBoardPost } from "@/lib/data";
import { BoardPostForm } from "@/components/BoardPostForm";

export const dynamic = "force-dynamic";

export default async function EditBoardPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getBoardPost(id);
  if (!post || post.archived) notFound();
  return <BoardPostForm post={post} />;
}
