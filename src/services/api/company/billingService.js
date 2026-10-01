/**
 * Billing & Subscription service — dedicated import surface for the merged
 * Billing & Subscription view. Delegates to the existing adminService so
 * endpoints stay in one place.
 */
import adminService from './adminService';

const billingService = {
  getSubscription:    ()       => adminService.getSubscription(),
  updateSubscription: (data)   => adminService.updateSubscription(data),
  getBillingHistory:  (params) => adminService.getBillingHistory(params),
};

export default billingService;