// BUILD: 2026-08-25-iaem-pipeline-bridge-v1
// Slot dashboard is now integrated into IAEMScheduling.jsx
// This component redirects to the main scheduling view.
import React from 'react';
import { Navigate } from 'react-router-dom';

const SlotDashboard = () => {
  return <Navigate to="/employer/iaem-scheduling" replace />;
};

export default SlotDashboard;