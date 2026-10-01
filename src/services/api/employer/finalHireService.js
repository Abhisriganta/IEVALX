
import axiosInstance from '../axiosInstance'; // adjust if your path differs
import jobseekerService from '../jobseeker/jobseekerService';
const OFFER_STATUS_MAP = {
  pending:   'extended',
  sent:      'extended',
  accepted:  'accepted',
  declined:  'declined',
  cancelled: 'declined',
  failed:    'extended',
};

const _fullName = (c = {}) => {
  const composed = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return composed || c.full_name || c.email || 'Unknown';
};

const _mapRecord = (r) => {
  const c = r.hired_candidate || {};
  const rounds = (r.rounds_breakdown || []).map(rb => ({
    round_number:   rb.round_number,
    name:           rb.round_name,
    interview_type: rb.round_type,
    cgps_score:     rb.cgps_score,
  }));

  const hired_date = r.hired_at || null;
  const daysSinceHired = hired_date
    ? Math.floor((Date.now() - new Date(hired_date).getTime()) / 86400000)
    : 0;

  return {
    record_id:        r.id,
    candidate_id:     c.id,
    full_name:        _fullName(c),
    email:            c.email || '',
    photo_url:        jobseekerService.photoUrlFor(c.id),
    phone:            r.phone || c.phone || '',
    location:         r.location || c.location || '',
    experience_years: r.experience_years ?? c.experience_years ?? null,
    skills:           c.skills || [],
    job_id:           r.job_id,
    job_title:        r.job_title,
    process_id:       r.process,
    total_rounds:     r.total_rounds,
    hired_date,
    joining_date:     null,   
    application_date: null,   
    offered_salary:   null,   
    salary_min_month: r.salary_min ?? null, 
    salary_max_month: r.salary_max ?? null,   
    currency:         'INR',
    offer_status:     OFFER_STATUS_MAP[r.offer_status] || 'extended',
    offer_type:       r.offer_type,
    offer_sent_at:    r.offer_sent_at,
    rounds,
    overall_cps:      r.overall_cgps,
    daysSinceHired,
    timeToHireDays:   null,   // no application_date → cannot compute
    notes:            r.notes || '',
  };
};

const finalHireService = {
  getHires: async (params = {}) => {
    const query = {};
    if (params.process_id) query.process_id = params.process_id;
    const res = await axiosInstance.get('/employer/interviews/hiring-records/', { params: query });
    let list = (res.data || []).map(_mapRecord);
    if (params.job_id && params.job_id !== 'all') {
      list = list.filter(c => String(c.job_id) === String(params.job_id));
    }
    if (params.offer_status && params.offer_status !== 'all') {
      list = list.filter(c => c.offer_status === params.offer_status);
    }
    return { data: list };
  },

  getHireDetail: async (candidateId) => {
    const res = await axiosInstance.get('/employer/interviews/hiring-records/');
    const c = (res.data || []).map(_mapRecord)
      .find(x => String(x.candidate_id) === String(candidateId));
    if (!c) throw new Error('Hired candidate not found');
    return { data: c };
  },

  getJobOptions: async () => {
    const res = await axiosInstance.get('/employer/interviews/hiring-records/');
    const seen = new Set();
    const jobs = [];
    (res.data || []).forEach(r => {
      if (r.job_id && !seen.has(r.job_id)) {
        seen.add(r.job_id);
        jobs.push({ id: r.job_id, title: r.job_title });
      }
    });
    return { data: jobs };
  },

  hideHires: async (record_ids) => {
    return axiosInstance.post('/employer/interviews/hiring-records/hide/', { record_ids });
  },

  unhideHires: async (record_ids) => {
    return axiosInstance.post('/employer/interviews/hiring-records/unhide/', { record_ids });
  },
};

export default finalHireService;