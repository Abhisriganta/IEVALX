import { useState, useEffect, useCallback } from "react";
import profileService from "@/services/api/employer/profileService";

export const useEmployerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await profileService.getProfile();
      setProfile(response.data);
    } catch (err) {
      setError(err?.response?.data?.Error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
        fetchProfile();
  }, [fetchProfile]);

  const _handle = async (action, refetchAfter = true) => {
    try {
      setSaving(true);
      setError(null);
      await action();
      if (refetchAfter) await fetchProfile();
      return { success: true };
    } catch (err) {
      const msg = err?.response?.data?.Error || "Operation failed";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (data) =>
    _handle(() => profileService.updateProfile(data));

  const uploadAvatar = async (file) => {
    try {
      setSaving(true);
      setError(null);
      const response = await profileService.uploadAvatar(file);
      await fetchProfile();
      return { success: true, profile_image_url: response?.profile_image_url };
    } catch (err) {
      const msg = err?.response?.data?.Error || "Failed to upload image";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  };

  const changePassword = (passwords) =>
    _handle(() => profileService.changePassword(passwords), false);

  const changeFirstLoginPassword = (newPassword) =>
    _handle(() =>
      profileService.changeFirstLoginPassword({ new_password: newPassword })
    );

  return {
    profile,
    loading,
    saving,
    error,
    refetch: fetchProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
    changeFirstLoginPassword,
  };
};

export default useEmployerProfile;