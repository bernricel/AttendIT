import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FormField";
import MessageBanner from "../components/MessageBanner";
import { ROUTES } from "../constants/routes";
import { completeProfile, getActiveDepartments, getActivePrograms } from "../services/authApi";
import { clearAuthSession, getStoredAuth, updateStoredUser } from "../services/authStorage";
import { getAccountType, isAdminUser } from "../utils/accountType";
import { getApiErrorMessage } from "../utils/apiError";
import common from "../styles/common.module.css";
import styles from "./CompleteProfilePage.module.css";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getStoredAuth();
  const isAdminAccount = isAdminUser(user);
  const isStudent = user?.role === "student";
  const accountType = getAccountType(user?.email);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const continueTo = location.state?.from || "";
  const [form, setForm] = useState({
    school_id: "",
    school_id_confirmation: "",
    department_id: "",
    program_id: "",
  });
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [programOptions, setProgramOptions] = useState([{ value: "", label: "Select a program" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true);
  const [isProgramsLoading, setIsProgramsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDepartments = async () => {
      if (isAdminAccount) {
        return;
      }
      setIsDepartmentsLoading(true);
      try {
        const data = await getActiveDepartments();
        setDepartmentOptions([
          { value: "", label: "Select a department" },
          ...(data.departments || []).map((department) => ({
            value: String(department.id),
            label: department.name,
          })),
        ]);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Could not load departments."));
      } finally {
        setIsDepartmentsLoading(false);
      }
    };
    loadDepartments();
  }, [isAdminAccount]);

  useEffect(() => {
    const loadPrograms = async () => {
      if (!isStudent || !form.department_id) {
        setProgramOptions([{ value: "", label: "Select a program" }]);
        return;
      }
      setIsProgramsLoading(true);
      try {
        const data = await getActivePrograms(form.department_id);
        setProgramOptions([
          { value: "", label: "Select a program" },
          ...(data.programs || []).map((program) => ({
            value: String(program.id),
            label: `${program.code} - ${program.name}`,
          })),
        ]);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Could not load programs."));
      } finally {
        setIsProgramsLoading(false);
      }
    };
    loadPrograms();
  }, [form.department_id, isStudent]);

  const isValid = useMemo(() => {
    if (!form.school_id.trim() || !form.school_id_confirmation.trim() || !form.department_id) {
      return false;
    }
    if (form.school_id.trim() !== form.school_id_confirmation.trim()) {
      return false;
    }
    if (isStudent && !form.program_id) {
      return false;
    }
    return true;
  }, [form, isStudent]);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "department_id" ? { program_id: "" } : null),
    }));
  };

  const handleBackToLogin = () => {
    clearAuthSession();
    navigate(ROUTES.LOGIN, { replace: true, state: null });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!isValid) {
      setError("Please complete the required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        school_id: form.school_id.trim(),
        school_id_confirmation: form.school_id_confirmation.trim(),
        department_id: Number(form.department_id),
      };
      if (isStudent) {
        payload.program_id = Number(form.program_id);
      }
      const data = await completeProfile(payload);
      updateStoredUser(data.user);
      navigate(
        continueTo.startsWith("/faculty") || continueTo.startsWith("/scan/")
          ? continueTo
          : ROUTES.FACULTY_DASHBOARD,
        { replace: true },
      );
    } catch (apiError) {
      if (apiError?.response?.status === 401) {
        clearAuthSession();
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }
      setError(getApiErrorMessage(apiError, "Could not complete profile."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAdminAccount) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  return (
    <AuthLayout
      title="Profile Completion"
      subtitle="Finish your verified university profile."
      sideNote={<p>Your name and account type come from your Google account and cannot be edited here.</p>}
    >
      <AuthCard title="Complete Your Profile">
        
        <form className={`${common.profileForm} ${styles.profileForm}`.trim()} onSubmit={handleSubmit}>
          <div className={styles.identityCard}>
            <span>Verified Google Account</span>
            <strong>{displayName || user?.email || "Unknown user"}</strong>
            <small>{user?.email || "No email available"}</small>
            <small>{accountType}</small>
          </div>

          <button
            className={common.ghostBtn}
            type="button"
            onClick={handleBackToLogin}
            disabled={isSubmitting}
          >
            Back to Login
          </button>

          <FormField
            id="google_name"
            label="Google Name"
            value={displayName || "Unknown user"}
            readOnly
            disabled
          />

          <FormField
            id="google_email"
            label="Google Email"
            value={user?.email || ""}
            readOnly
            disabled
          />

          <FormField
            id="school_id"
            label="School ID"
            value={form.school_id}
            onChange={updateField("school_id")}
            placeholder="Enter your school ID"
            disabled={isSubmitting}
          />

          <FormField
            id="school_id_confirmation"
            label="Confirm School ID"
            value={form.school_id_confirmation}
            onChange={updateField("school_id_confirmation")}
            placeholder="Re-enter your school ID"
            disabled={isSubmitting}
          />

          <FormField
            id="department_id"
            label="Department"
            value={form.department_id}
            onChange={updateField("department_id")}
            options={departmentOptions}
            disabled={isSubmitting || isDepartmentsLoading}
          />

          {isStudent ? (
            <FormField
              id="program_id"
              label="Program"
              value={form.program_id}
              onChange={updateField("program_id")}
              options={programOptions}
              disabled={isSubmitting || isProgramsLoading || !form.department_id}
            />
          ) : null}

          <MessageBanner type="error" message={error} />

          <button className={common.primaryBtn} type="submit" disabled={isSubmitting || !isValid}>
            {isSubmitting ? "Saving Profile..." : "Save and Continue"}
          </button>
          <button
          className={`${common.ghostBtn} ${common.compact} ${styles.backButton}`.trim()}
          type="button"
          onClick={handleBackToLogin}
          disabled={isSubmitting}
        >
          Back to Login
        </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
