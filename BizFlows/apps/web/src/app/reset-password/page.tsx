import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  const tokenValue = params.token;

  const token = Array.isArray(tokenValue)
    ? (tokenValue[0] ?? "")
    : (tokenValue ?? "");

  return <ResetPasswordForm token={token} />;
}
