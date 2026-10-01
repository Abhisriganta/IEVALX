import axiosInstance from "../axiosInstance";

const profileService = {
  // GET own profile
  getProfile: async () => {
    const response = await axiosInstance.get("/employer/profile");
    return response.data;
  },

  // PATCH editable fields
  updateProfile: async (data) => {
    const response = await axiosInstance.patch(
      "/employer/profile/update",
      data
    );
    return response.data;
  },

  // POST avatar (multipart)
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("profile_image", file);
    const response = await axiosInstance.post(
      "/employer/profile/avatar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  },
  // DELETE avatar
  removeAvatar: async () => {
    const response = await axiosInstance.delete("/employer/profile/avatar/remove");
    return response.data;
  },

  // POST regular change password (from profile page)
  changePassword: async ({ current_password, new_password }) => {
    const response = await axiosInstance.post(
      "/employer/profile/change-password",
      { current_password, new_password }
    );
    return response.data;
  },

  // POST first-login forced password change
  changeFirstLoginPassword: async ({ new_password }) => {
    const response = await axiosInstance.post(
      "/employers/change-password-first-login",
      { new_password }
    );
    return response.data;
  },
};

export default profileService;