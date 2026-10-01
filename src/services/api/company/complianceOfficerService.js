
import api from '../axiosInstance';

const getCompanyId = () => {
  try {
    const raw = localStorage.getItem('ievalx_user');
    if (!raw) {
      console.warn('[complianceOfficerService] Not logged in — ievalx_user missing.');
      return null;
    }
    const user = JSON.parse(raw);
    if (!user) return null;

    const explicit = user.company_id ?? user.companyId ?? user.Company_Id;
    if (explicit !== undefined && explicit !== null) return String(explicit);

    const role = String(user.role || '').toLowerCase();
    if (role === 'company' && user.id !== undefined && user.id !== null) {
      return String(user.id);
    }
    if (user.id !== undefined && user.id !== null) return String(user.id);

    return null;
  } catch (e) {
    console.warn('[complianceOfficerService] Failed to parse ievalx_user:', e);
    return null;
  }
};

const complianceOfficerService = {
  // ── List — GET /companies/<company_id>/compliance-officers ──────────────
  getOfficers: () => {
    const companyId = getCompanyId();
    return api.get(`/companies/${companyId}/compliance-officers`);
  },

  // ── Add — POST /compliance-officers/add ─────────────────────────────────
  // company_id is injected from the logged-in admin, never trusted from a form.
  addOfficer: (data) => {
    const companyId = getCompanyId();
    return api.post('/compliance-officers/add', {
      ...data,
      company_id: Number(companyId),
    });
  },

  // ── Toggle active/inactive — POST /compliance-officers/<id>/toggle ──────
  toggleOfficerStatus: (id) => {
    return api.post(`/compliance-officers/${id}/toggle`);
  },

  // ── Edit — PUT /compliance-officers/<id>/edit ────────────────────────────
  editOfficer: (id, data) => {
    return api.post(`/compliance-officers/${id}/edit`, data);
  },

  // ── Delete — DELETE /compliance-officers/<id>/delete ────────────────────
  removeOfficer: (id) => {
    return api.delete(`/compliance-officers/${id}/delete`);
  },
};

export { complianceOfficerService };
export default complianceOfficerService;
