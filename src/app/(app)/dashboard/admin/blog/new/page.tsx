import { requireSuperAdmin } from "@/lib/session";
import { BlogEditor } from "@/components/app/BlogEditor";

export default async function NewBlogPostPage() {
  await requireSuperAdmin();
  return <BlogEditor />;
}
