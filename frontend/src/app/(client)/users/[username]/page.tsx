import { PublicUserPage } from "@/features/public-user/ui";

interface PublicUserProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function PublicUserProfilePage({ params }: PublicUserProfilePageProps) {
  const { username } = await params;

  return <PublicUserPage username={username} />;
}
