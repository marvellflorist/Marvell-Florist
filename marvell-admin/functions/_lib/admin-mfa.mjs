const FACTOR_NAME = "Marvell Admin";

export function classifyTotpFactors(data) {
  const all = Array.isArray(data?.all) ? data.all : [];
  const verified = Array.isArray(data?.totp)
    ? data.totp
    : all.filter((factor) => factor?.factor_type === "totp" && factor?.status === "verified");
  const unverified = all.filter((factor) =>
    factor?.factor_type === "totp" && factor?.status === "unverified");
  return { verified, unverified };
}

export async function beginTotpEnrollment(auth) {
  const listed = await auth.auth.mfa.listFactors();
  if (listed.error) throw listed.error;
  const factors = classifyTotpFactors(listed.data);
  if (factors.verified.length) return { alreadyVerified: true };

  // listFactors().totp excludes unfinished enrollments. Their secret cannot be
  // recovered after a reload, so remove them before issuing a fresh QR code.
  for (const factor of factors.unverified) {
    const removed = await auth.auth.mfa.unenroll({ factorId: factor.id });
    if (removed.error && removed.error.code !== "mfa_factor_not_found") throw removed.error;
  }

  const enrolled = await auth.auth.mfa.enroll({ factorType: "totp", friendlyName: FACTOR_NAME });
  if (enrolled.error) throw enrolled.error;
  if (!enrolled.data?.id || !enrolled.data?.totp?.qr_code || !enrolled.data?.totp?.secret) {
    const error = new Error("mfa_enrollment_incomplete");
    error.code = "mfa_enrollment_incomplete";
    throw error;
  }
  return {
    alreadyVerified: false,
    factorId: enrolled.data.id,
    qrCode: enrolled.data.totp.qr_code,
    secret: enrolled.data.totp.secret
  };
}

export function mfaFailure(error, stage = "verify") {
  const code = error?.code || "";
  if (code === "mfa_verification_failed") {
    return { code: "kode_salah", message: "Kode autentikator tidak valid. Periksa waktunya lalu coba lagi.", status: 401 };
  }
  if (code === "mfa_challenge_expired") {
    return { code: "tantangan_kedaluwarsa", message: "Kode sudah kedaluwarsa. Masukkan kode terbaru.", status: 401 };
  }
  if (code === "mfa_factor_not_found") {
    return { code: "faktor_tidak_ditemukan", message: "Pengaturan autentikator tidak ditemukan. Mulai pengaturan kembali.", status: 409 };
  }
  if (code === "mfa_ip_address_mismatch") {
    return { code: "jaringan_berubah", message: "Selesaikan pengaturan dari perangkat dan jaringan yang sama, lalu mulai kembali.", status: 409 };
  }
  if (code === "mfa_factor_name_conflict" || code === "conflict") {
    return { code: "pendaftaran_berlangsung", message: "Pengaturan sebelumnya masih diproses. Tunggu sebentar lalu coba lagi.", status: 409 };
  }
  if (code === "over_request_rate_limit") {
    return { code: "terlalu_sering", message: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.", status: 429 };
  }
  if (code === "mfa_totp_enroll_not_enabled" || code === "mfa_totp_verify_not_enabled") {
    return { code: "mfa_belum_aktif", message: "Verifikasi autentikator belum diaktifkan pada Supabase. Hubungi pengelola sistem.", status: 503 };
  }
  if (code === "mfa_enrollment_incomplete") {
    return { code: "pendaftaran_tidak_lengkap", message: "Kode QR belum berhasil dibuat. Coba mulai pengaturan kembali.", status: 503 };
  }
  return stage === "enroll"
    ? { code: "pendaftaran_gagal", message: "Verifikasi dua langkah belum dapat disiapkan. Coba lagi sebentar.", status: 503 }
    : { code: "verifikasi_gagal", message: "Kode belum dapat diverifikasi. Coba lagi sebentar.", status: 503 };
}

export const __testing = { FACTOR_NAME };
