import { useAuth } from "../context/AuthContext";
import ApplicantDashboard from "./ApplicantDashboard";
import RecruiterDashboard from "./RecruiterDashboard";

// One /dashboard URL, different view per role.
export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "recruiter" ? <RecruiterDashboard /> : <ApplicantDashboard />;
}
