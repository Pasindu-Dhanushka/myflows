"use client";

import { CheckCircle2, Circle, Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  roles: string[];
};

type ProfileResponse = {
  user: Profile;
};

type MessageResponse = {
  message: string;
};

type ApiError = {
  message?: string | string[];
};

function getErrorMessage(payload: ApiError, fallback: string) {
  if (Array.isArray(payload.message)) return payload.message.join(" ");
  return payload.message ?? fallback;
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={met ? "met" : ""}>
      {met ? <CheckCircle2 size={15} /> : <Circle size={15} />}
      {label}
    </li>
  );
}

function getStrengthLabel(score: number) {
  if (score <= 1) return "Weak password";
  if (score === 2) return "Fair password";
  if (score === 3) return "Good password";
  return "Strong password";
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileFormIsValid = useMemo(
    () => firstName.trim().length >= 2 && lastName.trim().length >= 2,
    [firstName, lastName],
  );

  const profileFormIsDirty = useMemo(
    () =>
      profile !== null &&
      (firstName.trim() !== profile.firstName ||
        lastName.trim() !== profile.lastName),
    [firstName, lastName, profile],
  );

  const passwordValidation = useMemo(() => {
    const hasLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const passwordsMatch =
      newPassword.length > 0 && newPassword === confirmPassword;
    const differsFromCurrent =
      currentPassword.length > 0 && newPassword !== currentPassword;
    const strengthScore = [
      hasLength,
      hasUppercase,
      hasSpecial,
      hasNumber,
    ].filter(Boolean).length;

    return {
      hasLength,
      hasUppercase,
      hasSpecial,
      hasNumber,
      passwordsMatch,
      differsFromCurrent,
      strengthScore,
      canSubmit:
        currentPassword.length > 0 &&
        hasLength &&
        hasUppercase &&
        hasSpecial &&
        hasNumber &&
        passwordsMatch &&
        differsFromCurrent,
    };
  }, [confirmPassword, currentPassword, newPassword]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/signin");
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as
          ProfileResponse | ApiError;

        if (!response.ok || !("user" in payload)) {
          if (!cancelled) {
            setProfileError(
              getErrorMessage(
                payload as ApiError,
                "Unable to load your profile.",
              ),
            );
          }
          return;
        }

        if (!cancelled) {
          setProfile(payload.user);
          setFirstName(payload.user.firstName);
          setLastName(payload.user.lastName);
          setEmail(payload.user.email);
        }
      } catch {
        if (!cancelled) {
          setProfileError("Unable to reach the profile service.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileFormIsValid || !profileFormIsDirty || isSaving) return;

    setProfileError("");
    setProfileSuccess("");
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        ProfileResponse | ApiError;

      if (response.status === 401) {
        router.replace("/signin");
        return;
      }

      if (!response.ok || !("user" in payload)) {
        setProfileError(
          getErrorMessage(
            payload as ApiError,
            "Unable to update your profile.",
          ),
        );
        return;
      }

      setProfile(payload.user);
      setFirstName(payload.user.firstName);
      setLastName(payload.user.lastName);
      setEmail(payload.user.email);
      setProfileSuccess("Profile updated successfully.");
    } catch {
      setProfileError("Unable to reach the profile service.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordValidation.canSubmit || isChangingPassword) return;

    setPasswordError("");
    setPasswordSuccess("");
    setIsChangingPassword(true);

    try {
      const response = await fetch(`${API_URL}/auth/password`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        MessageResponse | ApiError;

      if (response.status === 401) {
        router.replace("/signin");
        return;
      }

      if (!response.ok) {
        setPasswordError(
          getErrorMessage(
            payload as ApiError,
            "Unable to change your password.",
          ),
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "Password changed successfully.",
      );
    } catch {
      setPasswordError("Unable to reach the password service.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <main className="signin-page">
      <section
        className="signin-form-panel profile-form-panel"
        aria-label="Account management"
      >
        <div className="profile-sections">
          <div className="signin-card">
            <div className="signin-card-header">
              <h2>My Profile</h2>
              <p>Update the account information stored in BizFlows.</p>
            </div>

            {isLoading ? (
              <p>Loading profile...</p>
            ) : (
              <form
                className="signin-form"
                onSubmit={handleProfileSubmit}
                noValidate
              >
                <label>
                  First name
                  <span className="signin-input-wrap">
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      type="text"
                      autoComplete="given-name"
                    />
                  </span>
                </label>

                <label>
                  Last name
                  <span className="signin-input-wrap">
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      type="text"
                      autoComplete="family-name"
                    />
                  </span>
                </label>

                <label>
                  Email address
                  <span className="signin-input-wrap readonly-input">
                    <input
                      value={email}
                      type="email"
                      autoComplete="email"
                      readOnly
                      aria-readonly="true"
                    />
                  </span>
                </label>

                {profile && (
                  <div className="profile-meta">
                    <p className="signin-footer-note">
                      Email verified: {profile.isEmailVerified ? "Yes" : "No"}
                    </p>
                    <div className="profile-roles" aria-label="Your roles">
                      <span>Roles</span>
                      <div>{profile.roles.map((role) => <span className="role-badge" key={role}>{role[0] + role.slice(1).toLowerCase()}</span>)}</div>
                    </div>
                  </div>
                )}

                {profileError && (
                  <p className="field-message error" role="alert">
                    {profileError}
                  </p>
                )}
                {profileSuccess && (
                  <p className="field-message success" role="status">
                    {profileSuccess}
                  </p>
                )}

                <button
                  className="signin-main-button"
                  type="submit"
                  disabled={
                    !profileFormIsValid || !profileFormIsDirty || isSaving
                  }
                >
                  {isSaving ? "Saving..." : "Save profile"}
                </button>
              </form>
            )}
          </div>

          <div className="signin-card">
            <div className="signin-card-header">
              <h2>Change Password</h2>
              <p>
                Enter your current password and choose a new secure password.
              </p>
            </div>

            <form
              className="signin-form"
              onSubmit={handlePasswordSubmit}
              noValidate
            >
              <label>
                Current password
                <span className="signin-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    type={showCurrentPassword ? "text" : "password"}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                    aria-pressed={showCurrentPassword}
                    onClick={() =>
                      setShowCurrentPassword((isVisible) => !isVisible)
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </span>
              </label>

              <label>
                New password
                <span
                  className={`signin-input-wrap ${
                    newPassword
                      ? passwordValidation.hasLength &&
                        passwordValidation.hasUppercase &&
                        passwordValidation.hasSpecial &&
                        passwordValidation.hasNumber
                        ? "valid"
                        : "invalid"
                      : ""
                  }`}
                >
                  <LockKeyhole size={18} />
                  <input
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                    aria-pressed={showNewPassword}
                    onClick={() =>
                      setShowNewPassword((isVisible) => !isVisible)
                    }
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {newPassword && (
                <div
                  className={`password-meter score-${passwordValidation.strengthScore}`}
                >
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {newPassword && (
                <div className="password-feedback">
                  <strong
                    className={`strength-label score-${passwordValidation.strengthScore}`}
                  >
                    {getStrengthLabel(passwordValidation.strengthScore)}
                  </strong>
                  <ul>
                    <RequirementItem
                      met={passwordValidation.hasLength}
                      label="8+ characters"
                    />
                    <RequirementItem
                      met={passwordValidation.hasUppercase}
                      label="Uppercase letter"
                    />
                    <RequirementItem
                      met={passwordValidation.hasSpecial}
                      label="Special character"
                    />
                    <RequirementItem
                      met={passwordValidation.hasNumber}
                      label="Number"
                    />
                  </ul>
                </div>
              )}

              {newPassword && !passwordValidation.differsFromCurrent && (
                <span className="field-message error">
                  New password must be different from the current password.
                </span>
              )}

              <label>
                Confirm new password
                <span
                  className={`signin-input-wrap ${
                    confirmPassword
                      ? passwordValidation.passwordsMatch
                        ? "valid"
                        : "invalid"
                      : ""
                  }`}
                >
                  <LockKeyhole size={18} />
                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                    aria-pressed={showConfirmPassword}
                    onClick={() =>
                      setShowConfirmPassword((isVisible) => !isVisible)
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </span>
                {confirmPassword && (
                  <span
                    className={`field-message ${
                      passwordValidation.passwordsMatch ? "success" : "error"
                    }`}
                  >
                    {passwordValidation.passwordsMatch
                      ? "Passwords match."
                      : "Passwords do not match."}
                  </span>
                )}
              </label>

              {passwordError && (
                <p className="field-message error" role="alert">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="field-message success" role="status">
                  {passwordSuccess}
                </p>
              )}

              <button
                className="signin-main-button"
                type="submit"
                disabled={!passwordValidation.canSubmit || isChangingPassword}
              >
                {isChangingPassword ? "Changing..." : "Change password"}
              </button>
            </form>
          </div>

          <Link href="/login-success">Back</Link>
        </div>
      </section>
    </main>
  );
}
